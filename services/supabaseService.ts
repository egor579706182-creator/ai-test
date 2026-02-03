
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AnalysisFile } from '../types';

let supabase: SupabaseClient | null = null;

export const initSupabase = (url: string, key: string) => {
  if (!url || !key) return null;
  
  try {
    supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    return supabase;
  } catch (e) {
    console.error("Failed to init Supabase client", e);
    throw new Error("Ошибка инициализации. Проверьте правильность URL.");
  }
};

export const testConnection = async (): Promise<void> => {
  if (!supabase) throw new Error("Клиент не инициализирован");
  const { error } = await supabase.from('knowledge_base').select('id').limit(1);
  if (error && error.code !== '42P01') {
    throw new Error(`Ошибка подключения: ${error.message}`);
  }
};

export const getSupabaseConfig = () => {
  const url = localStorage.getItem('supabase_url');
  const key = localStorage.getItem('supabase_key');
  return { url, key };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_key');
  supabase = null;
};

export const uploadFileToCloud = async (file: AnalysisFile) => {
  if (!supabase) throw new Error("Облако не настроено");

  const { error } = await supabase
    .from('knowledge_base')
    .upsert({
      id: file.id,
      name: file.file.name,
      type: file.type,
      size: file.file.size,
      base64: file.base64,
      // Сохраняем MIME-тип в поле name или расширяем объект, если таблица позволяет. 
      // Для совместимости со старыми таблицами можно хранить в существующем поле, 
      // но лучше предположить наличие или использовать расширение метаданных.
      created_at: new Date().toISOString()
    });

  if (error) throw new Error(`Ошибка загрузки: ${error.message}`);
};

export const downloadLibraryFromCloud = async (): Promise<AnalysisFile[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  return (data || []).map(item => {
    // Пытаемся восстановить MIME тип по расширению, если он не сохранен явно
    let mimeType = 'application/octet-stream';
    const name = item.name.toLowerCase();
    if (name.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (name.endsWith('.mov')) mimeType = 'video/quicktime';
    else if (name.endsWith('.mp4')) mimeType = 'video/mp4';
    else if (name.endsWith('.png')) mimeType = 'image/png';
    else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (name.endsWith('.txt')) mimeType = 'text/plain';

    return {
      id: item.id,
      type: item.type,
      base64: item.base64,
      file: new File([], item.name, { type: mimeType })
    };
  }) as AnalysisFile[];
};

export const deleteFileFromCloud = async (id: string) => {
  if (!supabase) return;
  await supabase.from('knowledge_base').delete().eq('id', id);
};
