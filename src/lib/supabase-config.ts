/**
 * Configuração Supabase - SEMPRE usa valores hardcoded em produção
 *
 * IMPORTANTE: Este arquivo resolve o problema de variáveis VITE_* serem undefined
 * no build do Vercel, causando erro "supabaseUrl is required"
 */

// Valores hardcoded para garantir que SEMPRE funcionem em produção
const SUPABASE_URL_PROD = 'https://dycsfnbqgojhttnjbndp.supabase.co';
const SUPABASE_ANON_KEY_PROD = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ';

/**
 * Obtém URL do Supabase com fallback garantido
 */
export function getSupabaseUrl(): string {
  // Em desenvolvimento, tenta usar variável de ambiente
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_PROD;
  }

  // Em produção, SEMPRE usa hardcoded (resolve problema do Vercel)
  return SUPABASE_URL_PROD;
}

/**
 * Obtém Anon Key do Supabase com fallback garantido
 */
export function getSupabaseAnonKey(): string {
  // Em desenvolvimento, tenta usar variável de ambiente
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_PROD;
  }

  // Em produção, SEMPRE usa hardcoded (resolve problema do Vercel)
  return SUPABASE_ANON_KEY_PROD;
}

/**
 * Validação: Garante que configuração está correta
 */
export function validateSupabaseConfig(): void {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || url === 'undefined') {
    throw new Error('[SUPABASE CONFIG] URL is undefined! This should never happen.');
  }

  if (!key || key === 'undefined') {
    throw new Error('[SUPABASE CONFIG] Anon Key is undefined! This should never happen.');
  }

  console.log('[SUPABASE CONFIG] ✅ Configuration validated');
  console.log('[SUPABASE CONFIG] URL:', url);
  console.log('[SUPABASE CONFIG] Key present:', !!key);
  console.log('[SUPABASE CONFIG] Environment:', import.meta.env.DEV ? 'development' : 'production');
}
