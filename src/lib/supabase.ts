import { createClient } from "@supabase/supabase-js";
import { createClientComponentClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseUrl, getSupabaseAnonKey, validateSupabaseConfig } from "./supabase-config";

// Configurações do Supabase - SEMPRE usa valores garantidos (resolve problema Vercel)
const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// Validar configuração na inicialização
validateSupabaseConfig();

// 🚨 IMPORTANTE: Service Role Key NÃO deve ser exposto no frontend!
// Todos os métodos admin foram movidos para o backend

// Cliente público (para uso no frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ❌ REMOVIDO: supabaseAdmin não deve existir no frontend
// Cliente admin deve ficar apenas no backend por segurança

// Cliente para componentes do lado do cliente
export const createSupabaseClient = () => createClientComponentClient();

// Cliente para componentes do lado do servidor
export const createSupabaseServerClient = (request: Request) =>
  createServerComponentClient({
    cookies: () => new Headers(request.headers),
  });

// Tipos de upload
export interface SupabaseUploadResult {
  publicUrl: string;
  path: string;
  fullPath: string;
}

export interface UploadOptions {
  bucket: string;
  folder?: string;
  fileName?: string;
  upsert?: boolean;
  contentType?: string;
}

// ❌ TODAS AS FUNCIONALIDADES ADMIN REMOVIDAS DO FRONTEND
// Para operações admin (upload, criação de usuário, etc), use as APIs do backend:
// - Upload: POST /api/upload
// - Gerenciar usuários: APIs em /api/admin/*
// - Storage: APIs em /api/upload/* ou /api/admin/*

// Helper functions que podem ficar no frontend (apenas leitura pública)
export const getPublicUrl = (bucket: string, path: string) => {
  return supabase.storage.from(bucket).getPublicUrl(path);
};

// Objeto supabaseStorage com métodos de upload
export const supabaseStorage = {
  // Upload de imagem usando API do backend
  uploadImage: async (file: File, bucket: string = 'products', folder?: string): Promise<SupabaseUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    if (folder) formData.append('folder', folder);

    // Criar timeout de 120 segundos (aumentado para uploads maiores)
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.error('[UPLOAD] Timeout atingido após 120 segundos');
      controller.abort();
    }, 120000);

    // Retry logic - tentar até 2 vezes
    let lastError: Error | null = null;
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[UPLOAD] Tentativa ${attempt}/${maxRetries}`);
        console.log('[UPLOAD] Bucket:', bucket, 'Folder:', folder);
        console.log('[UPLOAD] Arquivo:', file.name, 'Tamanho:', (file.size / 1024).toFixed(2), 'KB');

        // Obter token de autenticação do Zustand persist storage
        const authStorage = localStorage.getItem('auth-storage');
        const token = authStorage ? JSON.parse(authStorage).state?.token : null;

        if (!token) {
          console.error('[UPLOAD] Token não encontrado no Zustand storage');
          console.error('[UPLOAD] Auth storage:', authStorage ? 'exists' : 'null');
          throw new Error('Token de autenticação não encontrado. Faça login novamente.');
        }

        console.log('[UPLOAD] Token presente:', !!token);
        console.log('[UPLOAD] Iniciando requisição POST /api/upload...');

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        });

        console.log('[UPLOAD] Resposta recebida:', response.status, response.statusText);

        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          throw new Error(errorData.error || `Erro no upload: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success || !result.url) {
          throw new Error(result.error || 'Upload falhou - URL não retornada');
        }

        return {
          publicUrl: result.url,
          path: result.path || result.fileName,
          fullPath: result.fullPath || result.path || result.fileName,
        };
      } catch (error: any) {
        clearTimeout(timeout);

        if (error.name === 'AbortError') {
          lastError = new Error('Upload cancelado por timeout (60s). Tente novamente com uma imagem menor.');
          break; // Não tentar novamente em caso de timeout
        }

        lastError = error;

        // Se não for a última tentativa, aguardar 1 segundo antes de tentar novamente
        if (attempt < maxRetries) {
          console.log(`Tentativa ${attempt} falhou. Tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error('Erro desconhecido no upload');
  },
};

export default supabase;
