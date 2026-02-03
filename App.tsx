
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

      if (rawError.toLowerCase().includes('load failed') || rawError.toLowerCase().includes('fetch')) {
        errorMsg = "Ошибка передачи данных (Load Failed). Это часто происходит на iPhone при загрузке видео через медленный интернет или если файл слишком большой. Попробуйте использовать Wi-Fi или загрузить более короткий ролик.";
      } else if (rawError.includes('503') || rawError.includes('UNAVAILABLE') || rawError.includes('overloaded')) {
        errorMsg = "Сервер нейросети временно перегружен. На мобильных устройствах это происходит чаще. Пожалуйста, попробуйте еще раз через минуту.";
      } else if (rawError.includes('429') || rawError.includes('quota')) {
        errorMsg = "Превышена квота запросов. Пожалуйста, попробуйте через 2-3 минуты.";
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
          <p className="mt-2 text-sm sm:text-base text-gray-600 font-medium">
            Анализ развития ребенка (Gemini Flash)
          </p>
        </header>

        <main className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">1. Загрузка данных</h2>
              {files.length > 0 && (
                <button 
                  onClick={() => {
                    setFiles([]);
                    setReport(null);
                    setStatus(AnalysisStatus.IDLE);
                    setError(null);
                  }}
                  className="text-xs font-bold text-red-500 uppercase tracking-wider hover:bg-red-50 px-2 py-1 rounded"
                >
                  Очистить всё
                </button>
              )}
            </div>
            <FileUploader files={files} onFilesChange={setFiles} />
          </section>

          <section className="space-y-4">
            {status === AnalysisStatus.LOADING ? (
              <div className="flex flex-col items-center py-8 space-y-4 bg-white rounded-2xl shadow-sm border border-blue-50">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600"></div>
                </div>
                <div className="text-center">
                  <p className="text-blue-600 font-bold">Идет обработка видео...</p>
                  <p className="text-gray-400 text-[10px] mt-1 uppercase tracking-widest font-bold">Не закрывайте вкладку</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <button
                  onClick={() => startAnalysis(AnalysisMode.DIAGNOSTIC)}
                  disabled={files.length === 0}
                  className={`py-5 px-4 rounded-2xl font-black text-white transition-all shadow-lg active:scale-95 ${
                    files.length === 0 
                    ? 'bg-gray-300 shadow-none' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {status === AnalysisStatus.ERROR && currentMode === AnalysisMode.DIAGNOSTIC ? 'ПОВТОРИТЬ ЗАПРОС' : 'ЗАПУСТИТЬ ДИАГНОСТИКУ'}
                </button>

                <button
                  onClick={() => startAnalysis(AnalysisMode.OBSERVATION)}
                  disabled={files.length === 0}
                  className={`py-5 px-4 rounded-2xl font-black text-white transition-all shadow-lg active:scale-95 ${
                    files.length === 0 
                    ? 'bg-gray-300 shadow-none' 
                    : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  {status === AnalysisStatus.ERROR && currentMode === AnalysisMode.OBSERVATION ? 'ПОВТОРИТЬ ЗАПРОС' : 'ОТЧЕТ О НАБЛЮДЕНИЯХ'}
                </button>
              </div>
            )}
          </section>

          {error && (
            <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex">
                <div className="bg-red-500 rounded-full p-1 h-fit">
                  <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-xs font-black text-red-800 uppercase tracking-wider">Ошибка загрузки</h3>
                  <p className="text-sm text-red-700 mt-1 font-medium leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          {status === AnalysisStatus.SUCCESS && report && (
            <div className="pt-6 animate-in fade-in duration-500">
              <div className="mb-4 flex items-center space-x-2">
                 <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                   {currentMode === AnalysisMode.DIAGNOSTIC ? "Результат диагностики" : "Протокол наблюдения"}
                 </span>
              </div>
              <AnalysisDisplay report={report} />
            </div>
          )}
        </main>

        <footer className="mt-20 py-8 border-t border-gray-100 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-loose">
            Инструмент профессиональной оценки<br/>
            Не заменяет очную консультацию специалиста
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
