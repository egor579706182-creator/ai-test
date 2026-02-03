
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
  // Возвращаем Pro для диагностики для максимальной глубины анализа
  const modelName = mode === AnalysisMode.DIAGNOSTIC ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
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
      ? "ВЫ — ВЕДУЩИЙ ЭКСПЕРТ-НЕЙРОПСИХОЛОГ. Проведите глубокий мультимодальный анализ видео ребенка. Используйте предоставленную базу знаний как эталон. Ваш отчет должен быть максимально детальным, структурированным и профессиональным. Сравнивайте поведение на видео с клиническими нормами из документов."
      : "Подробно опишите поведение, мимику, жесты и коммуникативные акты ребенка на видео для протокола наблюдения.";

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
        // Для Pro-модели используем максимальный бюджет на размышление для глубокой аналитики
        thinkingConfig: { 
          thinkingBudget: mode === AnalysisMode.DIAGNOSTIC ? 32768 : 0 
        }
      }
    });

    return response.text || "Модель не вернула текст. Попробуйте еще раз.";
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    // Обработка лимитов (429) с ожиданием
    if ((errorMsg.includes('429') || errorMsg.includes('quota')) && retryCount < 2) {
      // Увеличиваем время ожидания при повторах (экспоненциальный бэк-офф)
      const waitTime = mode === AnalysisMode.DIAGNOSTIC ? 30000 : 10000; 
      await wait(waitTime * (retryCount + 1));
      return performMultimodalAnalysis(patientFiles, knowledgeFiles, mode, retryCount + 1);
    }
    
    if (errorMsg.includes('429')) {
      throw new Error("Превышена квота на использование Pro-модели. Пожалуйста, подождите несколько минут или попробуйте режим 'Наблюдение'.");
    }
    
    throw error;
  }
};
