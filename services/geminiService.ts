
import { GoogleGenAI } from "@google/genai";
import { AnalysisFile, AnalysisMode } from "../types";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const performMultimodalAnalysis = async (
  patientFiles: AnalysisFile[], 
  knowledgeFiles: AnalysisFile[],
  mode: AnalysisMode = AnalysisMode.DIAGNOSTIC,
  retryCount = 0
): Promise<string> => {
  // Используем Gemini 3 Pro для сложных диагностических задач
  const modelName = mode === AnalysisMode.DIAGNOSTIC ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Подготовка файлов пациента
    const patientParts = patientFiles.map(f => ({
      inlineData: {
        mimeType: f.file.type || "video/mp4",
        data: f.base64?.split(',')[1] || "",
      },
    }));

    // Подготовка файлов базы знаний
    const knowledgeParts = knowledgeFiles.map(f => ({
      inlineData: {
        mimeType: f.file.type || "application/pdf",
        data: f.base64?.split(',')[1] || "",
      },
    }));

    let systemInstruction = "";

    if (mode === AnalysisMode.DIAGNOSTIC) {
      systemInstruction = `
        ВЫ — ВЕДУЩИЙ ЭКСПЕРТ-НЕЙРОПСИХОЛОГ И ДИАГНОСТ.
        
        ОБЪЕКТ АНАЛИЗА: Видеоматериал пациента.
        КОНТЕКСТ: Загруженные справочные материалы (База знаний).
        
        ВАША ЗАДАЧА:
        1. Провести детальный посекундный анализ видео. Обращайте внимание на:
           - Зрительный контакт и социальную улыбку.
           - Реакцию на имя и разделенное внимание.
           - Наличие стереотипий или необычных моторных реакций.
           - Речевое развитие и вокализации.
        
        2. ИСПОЛЬЗОВАНИЕ БАЗЫ ЗНАНИЙ:
           - Обязательно ссылайтесь на конкретные протоколы или критерии из загруженных вами документов.
           - Сравнивайте наблюдаемое поведение с нормами, описанными в этих документах.
        
        СТРУКТУРА ОТЧЕТА:
        - Краткое резюме наблюдений.
        - Детальный разбор по категориям (Коммуникация, Моторика, Социальное взаимодействие).
        - Соответствие критериям из Базы Знаний.
        - Рекомендации для специалиста.
        
        Стиль: Строгий, медицинский, доказательный.
      `;
    } else {
      systemInstruction = `
        Вы ассистент по наблюдению. 
        Опишите действия ребенка на видео, классифицируя их согласно структуре из ваших загруженных методических материалов.
        Сфокусируйтесь на фактах: что ребенок делает, как долго, в какой последовательности.
      `;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          ...knowledgeParts,
          ...patientParts,
          { text: systemInstruction },
          { text: "Пожалуйста, проанализируй прикрепленное видео пациента, опираясь на предоставленные научные материалы." }
        ]
      },
      config: {
        temperature: 0.1, // Низкая температура для точности и отсутствия фантазий
        thinkingConfig: { thinkingBudget: mode === AnalysisMode.DIAGNOSTIC ? 4000 : 0 } // Включаем "размышление" для диагностики
      }
    });

    return response.text || "Ошибка получения ответа от модели.";
  } catch (error: any) {
    const errorStr = String(error);
    console.error("Gemini Analysis Error:", error);
    
    const isRetryable = errorStr.includes('429') || errorStr.includes('503') || errorStr.includes('500');

    if (isRetryable && retryCount < 3) {
      const delay = 3000 * (retryCount + 1);
      await wait(delay);
      return performMultimodalAnalysis(patientFiles, knowledgeFiles, mode, retryCount + 1);
    }
    
    if (errorStr.includes('413')) {
      throw new Error("Файлы слишком большие для анализа. Попробуйте загрузить видео меньшей длительности или в более низком разрешении.");
    }
    
    throw new Error(`Ошибка анализа: ${error.message || errorStr}`);
  }
};
