
import React from 'react';
import { AnalysisFile } from '../types';

interface FileUploaderProps {
  files: AnalysisFile[];
  onFilesChange: (files: AnalysisFile[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ files, onFilesChange }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    // Explicitly typing the map callback parameter to fix 'unknown' type errors
    const newFiles: AnalysisFile[] = await Promise.all(
      Array.from(e.target.files).map(async (file: File): Promise<AnalysisFile> => {
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
          // file is now correctly typed as File (Blob)
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
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
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
        className="cursor-pointer flex flex-col items-center justify-center space-y-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-gray-600 font-medium">Загрузить файлы (видео, аудио, фото, документы)</span>
        <span className="text-gray-400 text-sm">Можно выбрать несколько файлов</span>
      </label>

      {files.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((f) => (
            <div key={f.id} className="relative p-3 border rounded bg-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <span className="text-xs font-bold uppercase text-blue-600 shrink-0">{f.type}</span>
                <span className="text-sm truncate text-gray-700">{f.file.name}</span>
              </div>
              <button
                onClick={() => removeFile(f.id)}
                className="text-red-500 hover:text-red-700 ml-2"
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
