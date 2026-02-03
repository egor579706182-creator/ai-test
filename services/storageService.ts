
import { AnalysisFile } from "../types";

const DB_NAME = "DiagnosticAssistantDB";
const STORE_NAME = "knowledge_base";
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("Ошибка открытия базы данных");
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
  });
};

export const saveKnowledgeFile = async (file: AnalysisFile): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file);

    request.onsuccess = () => resolve();
    request.onerror = () => reject("Ошибка сохранения файла");
  });
};

export const getAllKnowledgeFiles = async (): Promise<AnalysisFile[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Ошибка получения файлов");
  });
};

export const deleteKnowledgeFile = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject("Ошибка удаления файла");
  });
};

export const clearKnowledgeBase = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject("Ошибка очистки базы");
  });
};

// Функция для создания файла резервной копии
export const exportLibrary = async () => {
  const files = await getAllKnowledgeFiles();
  const data = JSON.stringify(files);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `my_medical_library_${new Date().toISOString().split('T')[0]}.lib`;
  link.click();
};

// Функция для восстановления из файла
export const importLibrary = async (jsonString: string): Promise<AnalysisFile[]> => {
  const files: AnalysisFile[] = JSON.parse(jsonString);
  for (const file of files) {
    await saveKnowledgeFile(file);
  }
  return files;
};
