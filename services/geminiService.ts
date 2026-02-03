
import { GoogleGenAI } from "@google/genai";
import { AnalysisFile, AnalysisMode } from "../types";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/mpeg',
  'video/mov',
  'video/quicktime',
  'video/avi',
  'video/x-flv',
  'video/mpg',
  'video/webm',
  'video/wmv',
  'video/3gpp',
  'audio/wav',
  'audio/mp3',
  'audio/aiff',
  'audio/aac',
  'audio/ogg',
  'audio/flac'
];

export const performMultimodalAnalysis = async (
  patientFiles: AnalysisFile[], 
  knowledgeFiles: AnalysisFile[],
  mode: AnalysisMode = AnalysisMode.DIAGNOSTIC,
  retryCount = 0
): Promise<string> => {
  // Переходим на Flash для всех режимов, так как у Pro лимит "0" на бесплатном тарифе
  const modelName = 'gemini-3-flash-preview';
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API ключ не настроен в переменных окружения Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const patientParts = patientFiles
      .filter(f => SUPPORTED_MIME_TYPES.includes(f.file.type))
      .map(f => ({
        inlineData: {
          mimeType: f.file.type,
          data: f.base64?.split(',')[1] || "",
        },
      }));

    const knowledgeParts = knowledgeFiles
      .map(f => {
        let mimeType = f.file.type;
        if (mimeType === 'application/octet-stream' || !mimeType) {
          if (f.file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
          else if (f.file.name.toLowerCase().endsWith('.mov')) mimeType = 'video/quicktime';
          else if (f.file.name.toLowerCase().endsWith('.mp4')) mimeType = 'video/mp4';
        }
        return { ...f, detectedMime: mimeType };
      })
      .filter(f => SUPPORTED_MIME_TYPES.includes(f.detectedMime))
      .map(f => ({
        inlineData: {
          mimeType: f.detectedMime,
          data: f.base64?.split(',')[1] || "",
        },
      }));

    if (patientParts.length === 0) {
      throw new Error("Не удалось загрузить видео пациента. Проверьте формат файла.");
    }

    const systemInstruction = mode === AnalysisMode.DIAGNOSTIC 
      ? "Вы — ведущий нейропсихолог. Проанализируйте видео ребенка, опираясь на загруженные методические документы. Дайте экспертное заключение."
      : "Подробно опишите поведение и коммуникацию ребенка на видео для протокола наблюдения.";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          ...knowledgeParts,
          ...patientParts,
          { text: systemInstruction }
        ]
      },
      config: {
        temperature: 0.1,
        // Оставляем небольшой бюджет на "размышление" для Flash
        thinkingConfig: { thinkingBudget: mode === AnalysisMode.DIAGNOSTIC ? 2000 : 0 }
      }
    });

    return response.text || "Модель не вернула текст. Попробуйте еще раз.";
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    // Если всё равно получаем 429, пробуем повторить через паузу
    if ((errorMsg.includes('429') || errorMsg.includes('quota')) && retryCount < 2) {
      await wait(5000 * (retryCount + 1));
      return performMultimodalAnalysis(patientFiles, knowledgeFiles, mode, retryCount + 1);
    }
    
    if (errorMsg.includes('429')) {
      throw new Error("Превышен лимит запросов Google API. Пожалуйста, подождите 1 минуту или перейдите на платный тариф.");
    }
    
    throw error;
  }
};
