
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
      console.error(err);
      let errorMsg = err.message || 'Неизвестная ошибка';
      
      if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429')) {
        errorMsg = 'Квота API временно исчерпана. Нейросеть перегружена из-за объема данных. Пожалуйста, подождите 60 секунд и нажмите кнопку снова. Не нужно перезагружать страницу.';
      }
      
      setError(errorMsg);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Диагностический помощник развития ребенка
          </h1>
          <p className="mt-2 text-gray-600">
            Мультимодальный анализ (видео, аудио, документы) для выявления особенностей развития.
          </p>
        </header>

        <main className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-700">1. Загрузка данных</h2>
              {files.length > 0 && (
                <button 
                  onClick={() => {
                    setFiles([]);
                    setReport(null);
                    setStatus(AnalysisStatus.IDLE);
                  }}
                  className="text-sm text-red-600 hover:underline"
                >
                  Очистить всё
                </button>
              )}
            </div>
            <FileUploader files={files} onFilesChange={setFiles} />
            <p className="mt-2 text-xs text-gray-500 italic">
              * При загрузке тяжелых видео (более 50-100 МБ) вероятность превышения квот выше. 
              Старайтесь использовать короткие, информативные фрагменты.
            </p>
          </section>

          <section className="space-y-4">
            {status === AnalysisStatus.LOADING ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <div className="text-center">
                  <p className="text-blue-600 font-medium animate-pulse">
                    {currentMode === AnalysisMode.DIAGNOSTIC 
                      ? "Идет глубокий диагностический анализ..." 
                      : "Идет детальное описание наблюдений..."}
                  </p>
                  <p className="text-gray-400 text-sm">Обработка видео и аудио может занять некоторое время.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => startAnalysis(AnalysisMode.DIAGNOSTIC)}
                  disabled={files.length === 0}
                  className={`py-4 px-6 rounded-lg font-bold text-white transition shadow-lg ${
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
                  className={`py-4 px-6 rounded-lg font-bold text-white transition shadow-lg ${
                    files.length === 0 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  }`}
                >
                  {status === AnalysisStatus.ERROR && currentMode === AnalysisMode.OBSERVATION ? 'Попробовать снова' : 'Отчет о наблюдениях'}
                </button>
              </div>
            )}
            
            {!status || status === AnalysisStatus.IDLE || status === AnalysisStatus.SUCCESS ? (
              <p className="text-center text-xs text-gray-400">
                Выберите тип анализа: диагностический отчет или чистое описание поведения.
              </p>
            ) : null}
          </section>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-red-800 uppercase">Ошибка</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {status === AnalysisStatus.SUCCESS && report && (
            <div className="border-t-2 border-gray-100 pt-4">
              <div className="mb-4 inline-block bg-gray-100 rounded px-3 py-1 text-xs font-semibold text-gray-600">
                Режим: {currentMode === AnalysisMode.DIAGNOSTIC ? "Клиническая диагностика" : "Подробное наблюдение"}
              </div>
              <AnalysisDisplay report={report} />
            </div>
          )}
        </main>

        <footer className="mt-20 pt-10 border-t border-gray-200 text-center text-gray-400 text-xs">
          <p>Инструмент для профессиональной оценки. Не заменяет очного обследования врача.</p>
          <p className="mt-1">Используется оптимизированная модель: Gemini 3 Flash Preview</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
