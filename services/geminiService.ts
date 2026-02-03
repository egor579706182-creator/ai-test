
import { GoogleGenAI } from "@google/genai";
import { AnalysisFile, AnalysisMode } from "../types";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const performMultimodalAnalysis = async (
  files: AnalysisFile[], 
  mode: AnalysisMode = AnalysisMode.DIAGNOSTIC,
  retryCount = 0
): Promise<string> => {
  // Создаем экземпляр прямо перед вызовом для актуальности ключа
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const parts = await Promise.all(
      files.map(async (f) => {
        if (!f.base64) return null;
        return {
          inlineData: {
            mimeType: f.file.type,
            data: f.base64.split(',')[1],
          },
        };
      })
    );

    const filteredParts = parts.filter((p): p is { inlineData: { mimeType: string; data: string } } => p !== null);

    let prompt = "";

    if (mode === AnalysisMode.DIAGNOSTIC) {
      prompt = `
        Вы — высококвалифицированный клинический специалист по детскому нейроразвитию и диагностике. 
        Проанализируйте предоставленные данные для выявления отклонений развития.
        
        СТРУКТУРА ОТЧЕТА:
        1. Анализ речи и коммуникации (Критично!)
        2. Общий анализ развития (Моторика, Когнитивная сфера, Сенсорика)
        3. Лог доказательств со ссылками на время в видео
        4. Заключение и список литературы (DSM-5, МКБ-11)
      `;
    } else {
      prompt = `
        Вы — профессиональный ассистент-наблюдатель. Опишите портрет поведения ребенка до мельчайших деталей БЕЗ диагностики.
        
        ИНСТРУКЦИИ:
        - Описывайте только факты: мимика, жесты, направление взгляда, звуки.
        - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: Ставить диагнозы или использовать мед. термины (аутизм и т.д.).
        - Цель: дать специалисту "сырой" материал для анализа.
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...filteredParts,
          { text: prompt }
        ]
      },
      config: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
      }
    });

    return response.text || "Не удалось получить текст ответа.";
  } catch (error: any) {
    const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
    const isRetryable = 
      errorStr.includes('503') || 
      errorStr.includes('504') || 
      errorStr.includes('429') || 
      errorStr.includes('overloaded') ||
      errorStr.includes('UNAVAILABLE');

    if (isRetryable && retryCount < 3) {
      // Экспоненциальная задержка: 5с, 10с, 15с
      const delay = 5000 * (retryCount + 1);
      console.log(`Попытка ${retryCount + 1} через ${delay}мс...`);
      await wait(delay);
      return performMultimodalAnalysis(files, mode, retryCount + 1);
    }

    // Если это не ошибка перегрузки или попытки исчерпаны
    if (errorStr.includes('503') || errorStr.includes('UNAVAILABLE')) {
      throw new Error("Сервер Gemini временно перегружен. Это часто случается при загрузке видео с мобильных устройств. Пожалуйста, попробуйте еще раз через минуту.");
    }
    
    throw error;
  }
};
