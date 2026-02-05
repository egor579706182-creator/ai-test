
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
  const modelName = mode === AnalysisMode.DIAGNOSTIC ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API ключ не настроен.");
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
      throw new Error("Не удалось загрузить данные пациента. Проверьте формат файлов.");
    }

    // Усиленные инструкции для глубокого анализа
    const systemInstruction = mode === AnalysisMode.DIAGNOSTIC 
      ? `ИНСТРУКЦИЯ ДЛЯ ГЛУБОКОГО КЛИНИЧЕСКОГО АНАЛИЗА:
         1. НАЧИНАЙ СРАЗУ С ОТЧЕТА. Без вступлений, приветствий и представления себя.
         2. ГЛУБИНА И ФАКТЫ: Для каждого наблюдения ОБЯЗАТЕЛЬНО указывай тайм-код видео (например, [02:15]).
         3. ДОКАЗАТЕЛЬСТВА: Обосновывай суждения конкретными фактами из видео (мимика, жесты, вокализации) и сопоставляй их с нормами из предоставленной базы знаний.
         4. СТРУКТУРА: Используй четкие заголовки (Развитие речи, Моторика, Коммуникация и т.д.).
         5. ТЕРМИНОЛОГИЯ: Используй профессиональный язык нейропсихолога. 
         6. ФОРМАТ: Не используй лишние знаки разметки, кроме стандартных заголовков и списков.`
      : `ИНСТРУКЦИЯ ДЛЯ СКРИНИНГА:
         Начинай сразу с описания. Обязательно фиксируй ключевые моменты с тайм-кодами. Опиши поведение, мимику и коммуникацию ребенка максимально детально, но без воды. Без вступительных фраз.`;

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
        thinkingConfig: { 
          thinkingBudget: mode === AnalysisMode.DIAGNOSTIC ? 32768 : 0 
        }
      }
    });

    return response.text || "Ошибка получения данных от модели.";
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    if ((errorMsg.includes('429') || errorMsg.includes('quota')) && retryCount < 2) {
      const waitTime = mode === AnalysisMode.DIAGNOSTIC ? 30000 : 10000; 
      await wait(waitTime * (retryCount + 1));
      return performMultimodalAnalysis(patientFiles, knowledgeFiles, mode, retryCount + 1);
    }
    throw error;
  }
};
