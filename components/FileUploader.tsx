
import React, { useState } from 'react';
import { AnalysisFile } from '../types';

interface FileUploaderProps {
  files: AnalysisFile[];
  onFilesChange: (files: AnalysisFile[]) => void;
  isCloudActive?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ files, onFilesChange, isCloudActive }) => {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setError(null);

    const rawFiles: File[] = Array.from(e.target.files);
    const unsupported = rawFiles.filter(f => f.name.endsWith('.doc') || f.name.endsWith('.docx'));
    
    if (unsupported.length > 0) {
      setError("Файлы Word временно не поддерживаются. Пожалуйста, сохраните их в PDF.");
      return;
    }

    const newFiles: AnalysisFile[] = await Promise.all(
      rawFiles.map(async (file: File): Promise<AnalysisFile> => {
        const type: any = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('video/') ? 'video' : 
                         file.type.startsWith('audio/') ? 'audio' : 'document';

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        return {
          file,
          id: Math.random().toString(36).substring(7),
          type,
          base64
        };
      })
    );

    onFilesChange([...files, ...newFiles]);
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'video': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>;
      case 'image': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      default: return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    }
  };

  return (
    <div className="p-2 space-y-2">
      <div className="relative group">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          accept="image/*,video/*,audio/*,.pdf,.txt"
        />
        <div className="border border-slate-100 bg-slate-50/50 rounded-2xl py-8 px-6 flex flex-col items-center justify-center transition-all group-hover:bg-slate-50 group-hover:border-indigo-100">
           <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 text-indigo-500 group-hover:scale-110 transition-transform">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
           </div>
           <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Добавить файлы</p>
        </div>
      </div>

      {error && <p className="text-[10px] font-bold text-rose-500 px-4 py-2 uppercase tracking-wide">{error}</p>}

      {files.length > 0 && (
        <div className="grid gap-1 pt-2">
          {files.map((f) => (
            <div key={f.id} className="group flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="shrink-0 w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                  {getIcon(f.type)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-700 truncate">{f.file.name}</p>
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                    {(f.file.size / (1024 * 1024)).toFixed(2)} MB {isCloudActive && '• Cloud Sync'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => removeFile(f.id)}
                className="p-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
