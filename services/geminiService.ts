
import { GoogleGenAI } from "@google/genai";
import { AnalysisFile, AnalysisMode } from "../types";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Список форматов, которые Gemini гарантированно принимает как inlineData
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
  'video/quicktime', // Добавлено для корректной поддержки .MOV на Apple
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Подготовка файлов пациента
    const patientParts = patientFiles
      .filter(f => SUPPORTED_MIME_TYPES.includes(f.file.type))
      .map(f => ({
        inlineData: {
          mimeType: f.file.type,
          data: f.base64?.split(',')[1] || "",
        },
      }));

    // Подготовка файлов базы знаний
    // Если тип application/octet-stream (из облака), пробуем определить по расширению
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
      const detectedTypes = patientFiles.map(f => `${f.file.name} (${f.file.type})`).join(', ');
      throw new Error(`Нет подходящих файлов пациента. Gemini не поддерживает эти типы: ${detectedTypes}. Попробуйте конвертировать видео в стандартный MP4 или убедитесь, что это поддерживаемый MOV.`);
    }

    let systemInstruction = "";

    if (mode === AnalysisMode.DIAGNOSTIC) {
      systemInstruction = `
        ВЫ — ВЕДУЩИЙ ЭКСПЕРТ-НЕЙРОПСИХОЛОГ И ДИАГНОСТ.
        
        ОБЪЕКТ АНАЛИЗА: Видеоматериал пациента.
        КОНТЕКСТ: Загруженные справочные материалы (База знаний).
        
        ВАША ЗАДАЧА:
        1. Провести детальный посекундный анализ видео.
        2. ИСПОЛЬЗОВАНИЕ БАЗЫ ЗНАНИЙ: Обязательно ссылайтесь на конкретные протоколы из загруженных документов.
        
        СТРУКТУРА ОТЧЕТА: Резюме, Детальный разбор, Соответствие критериям, Рекомендации.
      `;
    } else {
      systemInstruction = "Вы ассистент по наблюдению. Подробно опишите действия на видео.";
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          ...knowledgeParts,
          ...patientParts,
          { text: systemInstruction },
          { text: "Проанализируй предоставленные материалы." }
        ]
      },
      config: {
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: mode === AnalysisMode.DIAGNOSTIC ? 4000 : 0 }
      }
    });

    return response.text || "Ошибка получения ответа.";
  } catch (error: any) {
    const errorStr = String(error);
    if ((errorStr.includes('429') || errorStr.includes('503')) && retryCount < 3) {
      await wait(3000 * (retryCount + 1));
      return performMultimodalAnalysis(patientFiles, knowledgeFiles, mode, retryCount + 1);
    }
    throw new Error(`Ошибка анализа: ${error.message || errorStr}`);
  }
};
