
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

    const added = newFiles.filter(f => !oldIds.has(f.id));
    for (const f of added) {
      try {
        if (isCloudActive) await cloud.uploadFileToCloud(f);
        await saveKnowledgeFile(f);
      } catch (e: any) {
        setError(`Ошибка синхронизации: ${e.message}`);
      }
    }

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
    if (!window.confirm("Очистить все методические материалы?")) return;
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
      setError("Загрузите видео пациента для начала анализа.");
      return;
    }

    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setReport(null);

    try {
      const result = await performMultimodalAnalysis(patientFiles, knowledgeFiles, mode);
      setReport(result);
      setStatus(AnalysisStatus.SUCCESS);
      // Авто-скролл к результатам
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setStatus(AnalysisStatus.ERROR);
      setError(err.message || "Ошибка анализа данных.");
    }
  };

  return (
    <div className="min-h-screen text-slate-900 pb-48 md:pb-56">
      {/* Header */}
      <nav className="sticky top-0 z-[60] glass border-b border-slate-100/50 px-4 md:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-9 h-9 md:w-11 md:h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold shadow-xl shadow-slate-200">
              D
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-slate-900 leading-none">Diagnostic Pro</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isCloudActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {isSyncing ? 'Syncing' : isCloudActive ? 'Cloud Active' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-500 active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-16 space-y-12 md:space-y-20">
        {/* Knowledge Section */}
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between mb-6 md:mb-10 px-1">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">База знаний</h2>
              <p className="text-[11px] md:text-xs text-slate-400 mt-1 uppercase tracking-wide font-medium">Библиотека методичек</p>
            </div>
            {knowledgeFiles.length > 0 && (
              <button onClick={clearLibrary} className="text-[10px] font-bold text-rose-400 hover:text-rose-600 transition-colors uppercase tracking-widest active:scale-95">
                Сброс
              </button>
            )}
          </div>
          <div className="bg-white rounded-[2rem] p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/60">
            <FileUploader files={knowledgeFiles} onFilesChange={handleKnowledgeChange} isCloudActive={isCloudActive} />
          </div>
        </section>

        {/* Patient Section */}
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="mb-6 md:mb-10 px-1">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">Данные пациента</h2>
            <p className="text-[11px] md:text-xs text-slate-400 mt-1 uppercase tracking-wide font-medium">Записи обследования</p>
          </div>
          <div className="bg-white rounded-[2rem] p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/60">
            <FileUploader files={patientFiles} onFilesChange={setPatientFiles} />
          </div>
        </section>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 p-6 md:p-8 rounded-3xl text-xs md:text-sm font-semibold text-center animate-in zoom-in-95 duration-300">
            <svg className="w-6 h-6 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}

        {status === AnalysisStatus.SUCCESS && report && (
          <AnalysisDisplay report={report} />
        )}
      </main>

      {/* Mobile-First Control Bar */}
      <div className="fixed bottom-6 md:bottom-10 left-0 right-0 z-50 px-4 md:px-6">
        <div className="max-w-md mx-auto glass p-2.5 md:p-3 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-white/60 flex flex-col md:flex-row gap-2">
          <button 
            disabled={status === AnalysisStatus.LOADING}
            onClick={() => startAnalysis(AnalysisMode.DIAGNOSTIC)}
            className="flex-1 bg-slate-900 text-white py-4 md:py-5 px-6 rounded-[2rem] font-bold text-[11px] md:text-xs uppercase tracking-[0.2em] hover:bg-slate-800 disabled:opacity-40 transition-all active:scale-95 shadow-xl shadow-slate-200 flex items-center justify-center gap-3 overflow-hidden"
          >
            {status === AnalysisStatus.LOADING ? (
               <div className="flex items-center gap-3">
                 <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                 <span>Анализ...</span>
               </div>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Диагностика</span>
              </>
            )}
          </button>
          <button 
            disabled={status === AnalysisStatus.LOADING}
            onClick={() => startAnalysis(AnalysisMode.OBSERVATION)}
            className="bg-slate-100 text-slate-900 py-4 md:py-5 px-8 rounded-[2rem] font-bold text-[11px] md:text-xs uppercase tracking-[0.2em] hover:bg-slate-200 disabled:opacity-40 transition-all active:scale-95 border border-slate-200/50"
          >
            Скрининг
          </button>
        </div>
      </div>

      {/* Settings Modal (Mobile Fullscreen Support) */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/10 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 md:p-10 shadow-2xl border border-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <button onClick={() => setShowSettings(false)} className="text-slate-300 hover:text-slate-900 transition-colors p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-10 mt-4">
              <h3 className="text-xl font-black text-slate-900 mb-2">Cloud Engine</h3>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest leading-relaxed">Безопасная синхронизация данных</p>
            </div>

            <form onSubmit={saveCloudSettings} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Supabase Endpoint</label>
                <input name="url" defaultValue={cloud.getSupabaseConfig().url || ''} placeholder="https://..." required className="w-full bg-slate-50 border border-slate-100/80 p-5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Private Key</label>
                <input name="key" type="password" defaultValue={cloud.getSupabaseConfig().key || ''} placeholder="••••••••••••" required className="w-full bg-slate-50 border border-slate-100/80 p-5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300" />
              </div>
              
              <div className="pt-4 space-y-3">
                <button type="submit" disabled={isSavingSettings} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-slate-800 disabled:bg-slate-200 transition-all active:scale-95">
                  {isSavingSettings ? 'Connecting' : 'Подключить'}
                </button>
                <button 
                  type="button"
                  onClick={async () => { 
                    cloud.clearSupabaseConfig(); 
                    await refreshCloudConnection();
                    setShowSettings(false);
                  }}
                  className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-rose-500 py-4 transition-colors text-center"
                >
                  Отключить облако
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
