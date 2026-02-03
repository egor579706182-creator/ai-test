
import React, { useState } from 'react';
import { AnalysisFile } from '../types';

interface FileUploaderProps {
  files: AnalysisFile[];
  onFilesChange: (files: AnalysisFile[]) => void;
  isCloudActive?: boolean;
}

const SUPPORTED_MIME_TYPES = [
  'application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/webp',
  'video/mp4', 'video/mpeg', 'video/mov', 'video/quicktime', 'video/avi', 'video/webm',
  'audio/wav', 'audio/mp3'
];

const FileUploader: React.FC<FileUploaderProps> = ({ files, onFilesChange, isCloudActive }) => {
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setError(null);

    const rawFiles: File[] = Array.from(e.target.files);
    
    // Проверка на неподдерживаемые форматы (Word, Excel и т.д.)
    const unsupported = rawFiles.filter(f => f.name.endsWith('.doc') || f.name.endsWith('.docx') || f.name.endsWith('.xls') || f.name.endsWith('.xlsx'));
    if (unsupported.length > 0) {
      setError(`Файлы Word/Excel (${unsupported.map(f => f.name).join(', ')}) пока не поддерживаются. Пожалуйста, сохраните их как PDF.`);
      return;
    }

    const newFiles: AnalysisFile[] = await Promise.all(
      rawFiles.map(async (file: File): Promise<AnalysisFile> => {
        const type: 'image' | 'video' | 'audio' | 'document' = file.type.startsWith('image/') 
          ? 'image' 
          : file.type.startsWith('video/') 
          ? 'video' 
          : file.type.startsWith('audio/') 
          ? 'audio' 
          : 'document';

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        return {
          file,
          id: Math.random().toString(36).substr(2, 9),
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
      case 'video': return '🎥';
      case 'image': return '🖼️';
      case 'audio': return '🔊';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 bg-slate-50/50 transition-all hover:border-indigo-300 hover:bg-indigo-50/30 group">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${Math.random()}`}
          accept="image/*,video/*,audio/*,.pdf,.txt"
        />
        <label
          htmlFor={document.querySelector('input[type="file"]')?.id || "file-upload"}
          className="cursor-pointer flex flex-col items-center justify-center space-y-4"
          onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            input?.click();
          }}
        >
          <div className="bg-white p-4 rounded-3xl shadow-sm group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-center">
            <span className="text-slate-700 font-bold block text-sm">Добавить материалы</span>
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">PDF, Видео (MP4, MOV), фото или аудио</span>
          </div>
        </label>
      </div>

      {error && (
        <div className="text-[11px] text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-100 font-bold leading-relaxed">
          ⚠️ {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {files.map((f) => (
            <div key={f.id} className="group relative p-4 bg-white border border-slate-100 rounded-[1.5rem] flex items-center justify-between shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center space-x-4 overflow-hidden">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                  {getIcon(f.type)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold truncate text-slate-700">{f.file.name}</span>
                    {isCloudActive && (
                      <span className="text-[10px] opacity-60" title="Синхронизировано">☁️</span>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-slate-300 uppercase">{(f.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>
              <button
                onClick={() => removeFile(f.id)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
