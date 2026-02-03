
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

/**
 * Проверяет реальную работоспособность ключа и URL
 */
export const testConnection = async (): Promise<void> => {
  if (!supabase) throw new Error("Клиент не инициализирован");
  
  // Пробуем прочитать метаданные или пустой запрос к таблице
  const { error } = await supabase.from('knowledge_base').select('id').limit(1);
  
  if (error) {
    if (error.message.includes("Invalid API key") || error.message.includes("JWN") || error.code === '401' || error.code === 'PGRST301') {
      throw new Error("Сервер Supabase отклонил этот ключ. Пожалуйста, используйте 'anon public' ключ (длинная строка на eyJ...)");
    }
    if (error.code === '42P01') {
      // Таблица не найдена — это значит ключ ВЕРНЫЙ, просто базы еще нет
      return;
    }
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
    if (error.code === '42P01') return []; // Таблицы нет — считаем библиотеку пустой
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    type: item.type,
    base64: item.base64,
    file: new File([], item.name, { type: 'application/octet-stream' })
  })) as AnalysisFile[];
};

export const deleteFileFromCloud = async (id: string) => {
  if (!supabase) return;
  await supabase.from('knowledge_base').delete().eq('id', id);
};
