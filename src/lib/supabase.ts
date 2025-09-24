import { createClient } from "@supabase/supabase-js";
import { createClientComponentClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";

// Configurações do Supabase - APENAS credenciais públicas no frontend
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY!;

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

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const result = await response.json();
    return {
      publicUrl: result.url,
      path: result.path,
      fullPath: result.fullPath || result.path,
    };
  },
};

export default supabase;
