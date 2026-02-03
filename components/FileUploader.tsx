
import React, { useState } from 'react';
import { AnalysisFile } from '../types';

interface FileUploaderProps {
  files: AnalysisFile[];
  onFilesChange: (files: AnalysisFile[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ files, onFilesChange }) => {
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setSizeWarning(null);

    // FIX: Explicitly type rawFiles as File[] to resolve 'unknown' property access errors
    const rawFiles: File[] = Array.from(e.target.files);
    
    // Проверка суммарного или индивидуального размера для мобильных устройств
    // FIX: Provide explicit type for reduce accumulator and current value to avoid operator '+' on 'unknown'
    const totalSize = rawFiles.reduce((acc: number, f: File) => acc + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) { // 50MB лимит для стабильности
      setSizeWarning("Внимание: Общий размер файлов более 50МБ. На мобильных устройствах это может вызвать ошибку загрузки.");
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

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-white shadow-inner transition-colors hover:border-blue-400">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <div className="bg-blue-50 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-center">
            <span className="text-gray-700 font-semibold block">Добавить материалы</span>
            <span className="text-gray-400 text-xs">Видео, фото или документы</span>
          </div>
        </label>
      </div>

      {sizeWarning && (
        <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          ⚠️ {sizeWarning}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {files.map((f) => (
            <div key={f.id} className="relative p-3 border rounded-lg bg-white flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="bg-gray-100 p-1.5 rounded text-[10px] font-bold text-gray-500 uppercase">
                  {f.type === 'video' ? '🎥' : f.type === 'image' ? '🖼️' : '📄'}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate text-gray-800">{f.file.name}</span>
                  <span className="text-[10px] text-gray-400">{(f.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
              </div>
              <button
                onClick={() => removeFile(f.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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
