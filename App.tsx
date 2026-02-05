
import React, { useState, useEffect, useCallback } from 'react';
import { AnalysisFile, AnalysisStatus, AnalysisMode } from './types';
import FileUploader from './components/FileUploader';
import AnalysisDisplay from './components/AnalysisDisplay';
import { performMultimodalAnalysis } from './services/geminiService';
import { getAllKnowledgeFiles, saveKnowledgeFile, deleteKnowledgeFile, clearKnowledgeBase } from './services/storageService';
import * as cloud from './services/supabaseService';

const App: React.FC = () => {
  const [patientFiles, setPatientFiles] = useState<AnalysisFile[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<AnalysisFile[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(false);

  const refreshCloudConnection = useCallback(async (test = false) => {
    const { url, key } = cloud.getSupabaseConfig();
    
    if (url && key) {
      try {
        cloud.initSupabase(url, key);
        if (test) {
          await cloud.testConnection();
        }
        setIsSyncing(true);
        const cloudFiles = await cloud.downloadLibraryFromCloud();
        setKnowledgeFiles(cloudFiles);
        setIsCloudActive(true);
        setSettingsError(null);
        return true;
      } catch (err: any) {
        setIsCloudActive(false);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    } else {
      const localFiles = await getAllKnowledgeFiles();
      setKnowledgeFiles(localFiles);
      setIsCloudActive(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsDbLoading(true);
      try { await refreshCloudConnection(); } catch (e) {}
      setIsDbLoading(false);
    };
    init();
  }, [refreshCloudConnection]);

  const saveCloudSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);

    const formData = new FormData(e.currentTarget);
    const url = (formData.get('url') as string).trim();
    const key = (formData.get('key') as string).trim();
    
    try {
      cloud.saveSupabaseConfig(url, key);
      await refreshCloudConnection(true);
      setShowSettings(false);
    } catch (err: any) {
      setSettingsError(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleKnowledgeChange = async (newFiles: AnalysisFile[]) => {
    setError(null);
    const oldIds = new Set(knowledgeFiles.map(f => f.id));
    const newIds = new Set(newFiles.map(f => f.id));

    // Добавленные
    const added = newFiles.filter(f => !oldIds.has(f.id));
    for (const f of added) {
      try {
        if (isCloudActive) await cloud.uploadFileToCloud(f);
        await saveKnowledgeFile(f);
      } catch (e: any) {
        setError(`Ошибка синхронизации: ${e.message}`);
      }
    }

    // Удаленные
    const removed = knowledgeFiles.filter(f => !newIds.has(f.id));
    for (const f of removed) {
      try {
        if (isCloudActive) await cloud.deleteFileFromCloud(f.id);
        await deleteKnowledgeFile(f.id);
      } catch (e) {}
    }

    setKnowledgeFiles(newFiles);
  };

  const clearLibrary = async () => {
    if (!window.confirm("Удалить ВСЕ методические материалы из библиотеки?")) return;
    try {
      if (isCloudActive) {
        for (const f of knowledgeFiles) {
          await cloud.deleteFileFromCloud(f.id);
        }
      }
      await clearKnowledgeBase();
      setKnowledgeFiles([]);
    } catch (e: any) {
      setError(`Ошибка при очистке: ${e.message}`);
    }
  };

  const startAnalysis = async (mode: AnalysisMode) => {
    if (patientFiles.length === 0) {
      setError("Пожалуйста, загрузите видео пациента для анализа.");
      return;
    }

    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setReport(null);

    try {
      const result = await performMultimodalAnalysis(patientFiles, knowledgeFiles, mode);
      setReport(result);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      setStatus(AnalysisStatus.ERROR);
      setError(err.message || "Произошла ошибка при анализе.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 pb-32 font-sans selection:bg-indigo-100">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex flex-col ml-2">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">PRO Диагностика</h1>
            <div className="flex items-center gap-2 mt-1">
               <span className={`w-2 h-2 rounded-full ${isCloudActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
               <span className={`text-[9px] font-black uppercase tracking-widest ${isCloudActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                 {isSyncing ? 'Синхронизация...' : isCloudActive ? 'Облако активно' : 'Локальный режим'}
               </span>
            </div>
          </div>
          <button onClick={() => { setSettingsError(null); setShowSettings(true); }} className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-[1.2rem] hover:bg-slate-100 transition-all border border-slate-100 shadow-inner active:scale-90">
            <span className="text-xl">⚙️</span>
          </button>
        </header>

        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowSettings(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 font-bold text-2xl">✕</button>
              
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2 flex items-center gap-3">
                <span>☁️</span> Настройка Облака
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 tracking-wide leading-relaxed">
                Синхронизация позволяет хранить ваши методические материалы в безопасности и открывать их на любом устройстве.
              </p>

              <form onSubmit={saveCloudSettings} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Project URL</label>
                  <input name="url" defaultValue={cloud.getSupabaseConfig().url || ''} placeholder="https://...supabase.co" required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">API Key (anon public)</label>
                  <input name="key" type="password" defaultValue={cloud.getSupabaseConfig().key || ''} placeholder="eyJ..." required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium" />
                </div>
                {settingsError && <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-[10px] font-bold animate-pulse">❌ {settingsError}</div>}
                
                <div className="pt-2">
                  <button type="submit" disabled={isSavingSettings} className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:bg-slate-300">
                    {isSavingSettings ? '⌛ Проверка связи...' : '💾 Подключить и синхронизировать'}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
                <button 
                  onClick={async () => { 
                    cloud.clearSupabaseConfig(); 
                    await refreshCloudConnection();
                    setShowSettings(false);
                  }}
                  className="text-[10px] text-slate-400 font-bold uppercase hover:text-rose-500 transition-colors"
                >
                  Вернуться в локальный режим
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="space-y-8">
          <section className={`p-8 rounded-[3rem] border-2 border-dashed transition-all duration-500 ${isCloudActive ? 'bg-emerald-50/20 border-emerald-100' : 'bg-slate-100/50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xs font-black uppercase tracking-widest ${isCloudActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isCloudActive ? '☁️ Облачная библиотека' : '📚 Локальная библиотека'}
              </h2>
              <div className="flex items-center gap-4">
                {knowledgeFiles.length > 0 && (
                  <button 
                    onClick={clearLibrary}
                    className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    Очистить всё
                  </button>
                )}
                {isCloudActive && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">Синхронизировано</span>}
              </div>
            </div>
            
            {isDbLoading ? (
              <div className="h-32 flex items-center justify-center text-[10px] font-black text-slate-300 uppercase animate-pulse">Загрузка базы данных...</div>
            ) : (
              <FileUploader files={knowledgeFiles} onFilesChange={handleKnowledgeChange} isCloudActive={isCloudActive} />
            )}
          </section>

          <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
               <span className="text-lg">👤</span> Данные пациента
            </h2>
            <FileUploader files={patientFiles} onFilesChange={setPatientFiles} />
          </section>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-6 rounded-[2rem] text-xs font-bold shadow-sm animate-in slide-in-from-bottom-2">
              ⚠️ {error}
            </div>
          )}

          {status === AnalysisStatus.SUCCESS && report && (
            <AnalysisDisplay report={report} />
          )}
        </main>

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50">
          <div className="grid grid-cols-2 gap-4 bg-slate-900/90 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-2xl border border-white/10">
            <button 
              disabled={status === AnalysisStatus.LOADING} 
              onClick={() => startAnalysis(AnalysisMode.DIAGNOSTIC)} 
              className="bg-white text-slate-900 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === AnalysisStatus.LOADING ? (
                <>
                  <span className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                  <span>Анализ...</span>
                </>
              ) : 'Диагностика'}
            </button>
            <button 
              disabled={status === AnalysisStatus.LOADING} 
              onClick={() => startAnalysis(AnalysisMode.OBSERVATION)} 
              className="bg-indigo-600 text-white py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-90 transition-all disabled:opacity-50"
            >
              {status === AnalysisStatus.LOADING ? '⏳ Ожидание...' : 'Наблюдение'}
            </button>
          </div>
          
          {status === AnalysisStatus.LOADING && (
            <div className="absolute -top-12 left-0 right-0 text-center">
              <span className="text-[10px] font-black text-slate-900 uppercase bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-100">
                {knowledgeFiles.length > 5 ? 'Обработка большого объема данных (10+ файлов)...' : 'Сопоставление видео с методичками...'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
