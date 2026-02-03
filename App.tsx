
import React, { useState } from 'react';
import { AnalysisFile, AnalysisStatus, AnalysisMode } from './types';
import FileUploader from './components/FileUploader';
import AnalysisDisplay from './components/AnalysisDisplay';
import { performMultimodalAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<AnalysisFile[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<AnalysisMode | null>(null);

  const startAnalysis = async (mode: AnalysisMode) => {
    if (files.length === 0) {
      setError('Пожалуйста, загрузите хотя бы один файл.');
      return;
    }

    setStatus(AnalysisStatus.LOADING);
    setCurrentMode(mode);
    setError(null);

    try {
      const result = await performMultimodalAnalysis(files, mode);
      setReport(result);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      console.error("Full Error object:", err);
      
      let errorMsg = "Произошла ошибка при анализе.";
      const rawError = err.message || String(err);

      // Пытаемся распарсить JSON если пришла строка-объект
      if (rawError.includes('503') || rawError.includes('UNAVAILABLE') || rawError.includes('overloaded')) {
        errorMsg = "Сервер нейросети временно перегружен запросами (ошибка 503). На мобильных устройствах это происходит чаще из-за размера файлов. Пожалуйста, подождите немного и нажмите 'Попробовать снова'.";
      } else if (rawError.includes('429') || rawError.includes('quota')) {
        errorMsg = "Превышена квота бесплатных запросов. Пожалуйста, попробуйте через 1-2 минуты.";
      } else if (rawError.includes('400')) {
        errorMsg = "Ошибка в данных. Возможно, файл слишком большой или формат не поддерживается.";
      } else {
        errorMsg = rawError;
      }
      
      setError(errorMsg);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Диагностический помощник
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Мультимодальный анализ развития ребенка
          </p>
        </header>

        <main className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-700">1. Загрузка данных</h2>
              {files.length > 0 && (
                <button 
                  onClick={() => {
                    setFiles([]);
                    setReport(null);
                    setStatus(AnalysisStatus.IDLE);
                    setError(null);
                  }}
                  className="text-sm text-red-600 hover:underline"
                >
                  Очистить всё
                </button>
              )}
            </div>
            <FileUploader files={files} onFilesChange={setFiles} />
            <p className="mt-2 text-[10px] sm:text-xs text-gray-500 italic">
              * Мобильные видео могут быть очень тяжелыми. Если возникает ошибка 503, попробуйте загрузить более короткий фрагмент или использовать Wi-Fi.
            </p>
          </section>

          <section className="space-y-4">
            {status === AnalysisStatus.LOADING ? (
              <div className="flex flex-col items-center py-6 space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <div className="text-center">
                  <p className="text-blue-600 font-medium animate-pulse">
                    {currentMode === AnalysisMode.DIAGNOSTIC 
                      ? "Анализируем данные..." 
                      : "Описываем наблюдения..."}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">Это может занять до 30-60 секунд</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => startAnalysis(AnalysisMode.DIAGNOSTIC)}
                  disabled={files.length === 0}
                  className={`py-4 px-4 rounded-xl font-bold text-white transition shadow-md touch-manipulation ${
                    files.length === 0 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                  }`}
                >
                  {status === AnalysisStatus.ERROR && currentMode === AnalysisMode.DIAGNOSTIC ? 'Попробовать снова' : 'Запустить диагностику'}
                </button>

                <button
                  onClick={() => startAnalysis(AnalysisMode.OBSERVATION)}
                  disabled={files.length === 0}
                  className={`py-4 px-4 rounded-xl font-bold text-white transition shadow-md touch-manipulation ${
                    files.length === 0 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  }`}
                >
                  {status === AnalysisStatus.ERROR && currentMode === AnalysisMode.OBSERVATION ? 'Попробовать снова' : 'Отчет о наблюдениях'}
                </button>
              </div>
            )}
          </section>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-red-800 uppercase">Внимание</h3>
                  <p className="text-sm text-red-700 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          {status === AnalysisStatus.SUCCESS && report && (
            <div className="border-t-2 border-gray-100 pt-6 animate-in zoom-in-95 duration-300">
              <div className="mb-4 inline-block bg-gray-100 rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                {currentMode === AnalysisMode.DIAGNOSTIC ? "Клиническая диагностика" : "Подробное наблюдение"}
              </div>
              <AnalysisDisplay report={report} />
            </div>
          )}
        </main>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-400 text-[10px] sm:text-xs">
          <p>Инструмент для специалистов. Не является окончательным диагнозом.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
