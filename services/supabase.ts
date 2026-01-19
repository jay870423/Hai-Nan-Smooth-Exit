import { createClient } from '@supabase/supabase-js';

// Helper to get env vars from either Vite's import.meta.env or standard process.env
const getEnv = (key: string, viteKey: string) => {
  // Try Vite (import.meta.env)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
    // @ts-ignore
    return import.meta.env[viteKey];
  }
  
  // Try Node/Vercel (process.env)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[viteKey] || process.env[key];
  }
  
  return '';
};

const envUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const envKey = getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

// Fallback to the provided real credentials if env vars fail to load
const supabaseUrl = envUrl || 'https://jituyssrmqhylcbdcuqr.supabase.co';
const supabaseAnonKey = envKey || 'sb_publishable_B1pbS6lefnlZEjpazjTNsg_RvIpC3Ti';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && supabaseUrl.includes('supabase.co');
};