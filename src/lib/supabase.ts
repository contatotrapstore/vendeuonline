import { createClient } from "@supabase/supabase-js";
import { createClientComponentClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseUrl, getSupabaseAnonKey, validateSupabaseConfig } from "./supabase-config";
import { buildApiUrl } from "../config/api";

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

// 🆕 Upload DIRETO ao Supabase Storage (sem passar pelo backend)
const uploadDirectToSupabase = async (
  file: File,
  bucket: string = 'products',
  folder?: string
): Promise<SupabaseUploadResult> => {
  console.log('🚀 [UPLOAD DIRETO] Iniciando upload direto ao Supabase Storage');
  console.log('📁 [UPLOAD DIRETO] Bucket:', bucket, 'Folder:', folder);
  console.log('📄 [UPLOAD DIRETO] Arquivo:', file.name, 'Tamanho:', (file.size / 1024).toFixed(2), 'KB');

  // Gerar nome único para o arquivo
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${timestamp}-${random}.${extension}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  console.log('🔑 [UPLOAD DIRETO] Caminho final:', filePath);

  try {
    // Upload direto usando cliente Supabase do frontend (usa anon key + RLS)
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      contentType: file.type,
      upsert: true,
      cacheControl: '3600',
    });

    if (error) {
      console.error('❌ [UPLOAD DIRETO] Erro no upload:', error);
      throw new Error(`Falha no upload direto: ${error.message}`);
    }

    console.log('✅ [UPLOAD DIRETO] Upload realizado com sucesso:', data.path);

    // Obter URL pública
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    console.log('🔗 [UPLOAD DIRETO] URL pública gerada:', urlData.publicUrl);

    return {
      publicUrl: urlData.publicUrl,
      path: data.path,
      fullPath: data.fullPath || data.path,
    };
  } catch (error: any) {
    console.error('❌ [UPLOAD DIRETO] Erro fatal:', error);
    throw error;
  }
};

// Objeto supabaseStorage com métodos de upload
export const supabaseStorage = {
  // Upload de imagem - HÍBRIDO: tenta backend primeiro, depois direto
  uploadImage: async (file: File, bucket: string = 'products', folder?: string): Promise<SupabaseUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    if (folder) formData.append('folder', folder);

    // Criar timeout de 120 segundos (aumentado para uploads maiores)
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.error('[UPLOAD BACKEND] Timeout atingido após 120 segundos');
      controller.abort();
    }, 120000);

    // Retry logic - tentar até 2 vezes
    let lastError: Error | null = null;
    const maxRetries = 2;
    let backendFailed = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[UPLOAD BACKEND] Tentativa ${attempt}/${maxRetries}`);
        console.log('[UPLOAD BACKEND] Bucket:', bucket, 'Folder:', folder);
        console.log('[UPLOAD BACKEND] Arquivo:', file.name, 'Tamanho:', (file.size / 1024).toFixed(2), 'KB');

        // Obter token de autenticação do Zustand persist storage
        const authStorage = localStorage.getItem('auth-storage');
        const token = authStorage ? JSON.parse(authStorage).state?.token : null;

        if (!token) {
          console.error('[UPLOAD BACKEND] Token não encontrado no Zustand storage');
          console.error('[UPLOAD BACKEND] Auth storage:', authStorage ? 'exists' : 'null');
          throw new Error('Token de autenticação não encontrado. Faça login novamente.');
        }

        console.log('[UPLOAD BACKEND] Token presente:', !!token);
        console.log('[UPLOAD BACKEND] Iniciando requisição POST /api/upload...');

        const uploadUrl = buildApiUrl('/upload');
        console.log('[UPLOAD BACKEND] URL completa:', uploadUrl);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        });

        console.log('[UPLOAD BACKEND] Resposta recebida:', response.status, response.statusText);

        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));

          // Se for erro 500, marcar que backend falhou para tentar upload direto
          if (response.status === 500) {
            console.warn('⚠️ [UPLOAD BACKEND] Backend retornou 500, vou tentar upload direto ao Supabase');
            backendFailed = true;
            throw new Error(errorData.error || `Erro no upload: ${response.status} ${response.statusText}`);
          }

          throw new Error(errorData.error || `Erro no upload: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success || !result.url) {
          throw new Error(result.error || 'Upload falhou - URL não retornada');
        }

        console.log('✅ [UPLOAD BACKEND] Upload via backend bem-sucedido!');
        return {
          publicUrl: result.url,
          path: result.path || result.fileName,
          fullPath: result.fullPath || result.path || result.fileName,
        };
      } catch (error: any) {
        clearTimeout(timeout);

        if (error.name === 'AbortError') {
          lastError = new Error('Upload cancelado por timeout (120s). Tente novamente com uma imagem menor.');
          break; // Não tentar novamente em caso de timeout
        }

        lastError = error;

        // Se não for a última tentativa, aguardar 1 segundo antes de tentar novamente
        if (attempt < maxRetries) {
          console.log(`[UPLOAD BACKEND] Tentativa ${attempt} falhou. Tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    // Se backend falhou com 500, tentar upload direto como fallback
    if (backendFailed) {
      console.log('🔄 [UPLOAD] Backend falhou, tentando upload DIRETO ao Supabase como fallback...');
      try {
        const result = await uploadDirectToSupabase(file, bucket, folder);
        console.log('✅ [UPLOAD] Fallback bem-sucedido! Usado upload direto.');
        return result;
      } catch (directError: any) {
        console.error('❌ [UPLOAD] Fallback também falhou:', directError);
        throw new Error(`Backend e upload direto falharam. Backend: ${lastError?.message}. Direto: ${directError.message}`);
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error('Erro desconhecido no upload');
  },
};

export default supabase;
