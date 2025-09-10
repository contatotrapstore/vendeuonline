import { createClient } from "@supabase/supabase-js";
import { createClientComponentClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";

// Configurações do Supabase
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

// Cliente público (para uso no frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente de serviço (para uso no backend com privilégios administrativos)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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

// Storage helpers
export class SupabaseStorage {
  private client = supabaseAdmin;

  async uploadFile(file: Buffer | File, options: UploadOptions): Promise<SupabaseUploadResult> {
    const { bucket, folder = "", fileName, upsert = false, contentType } = options;

    // Gerar nome do arquivo se não fornecido
    const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const filePath = folder ? `${folder}/${finalFileName}` : finalFileName;

    // Upload do arquivo
    const { data, error } = await this.client.storage.from(bucket).upload(filePath, file, {
      upsert,
      contentType,
    });

    if (error) {
      console.error("Erro no upload Supabase:", error);
      throw new Error(`Falha no upload: ${error.message}`);
    }

    // Obter URL pública
    const { data: urlData } = this.client.storage.from(bucket).getPublicUrl(data.path);

    return {
      publicUrl: urlData.publicUrl,
      path: data.path,
      fullPath: data.fullPath || data.path,
    };
  }

  async uploadImage(
    file: Buffer | File,
    bucket: string = "images",
    folder: string = "products"
  ): Promise<SupabaseUploadResult> {
    // Detectar tipo de arquivo
    let contentType = "image/jpeg";
    if (file instanceof File) {
      contentType = file.type;
    }

    // Gerar nome único para a imagem
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = contentType.split("/")[1] || "jpg";
    const fileName = `${timestamp}-${random}.${extension}`;

    return this.uploadFile(file, {
      bucket,
      folder,
      fileName,
      contentType,
      upsert: false,
    });
  }

  async deleteFile(bucket: string, filePath: string): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error("Erro ao deletar arquivo:", error);
      throw new Error(`Falha ao deletar: ${error.message}`);
    }
  }

  async createBucket(
    bucketName: string,
    options: {
      public?: boolean;
      allowedMimeTypes?: string[];
      fileSizeLimit?: number;
    } = {}
  ): Promise<void> {
    const { public: isPublic = true, allowedMimeTypes, fileSizeLimit } = options;

    const { error } = await this.client.storage.createBucket(bucketName, {
      public: isPublic,
      allowedMimeTypes,
      fileSizeLimit,
    });

    if (error && error.message !== "Bucket already exists") {
      console.error("Erro ao criar bucket:", error);
      throw new Error(`Falha ao criar bucket: ${error.message}`);
    }
  }

  async setupBuckets(): Promise<void> {
    // Bucket para imagens de produtos
    await this.createBucket("products", {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });

    // Bucket para logos de lojas
    await this.createBucket("stores", {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });

    // Bucket para avatares de usuários
    await this.createBucket("avatars", {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: 2 * 1024 * 1024, // 2MB
    });

    console.log("Buckets do Supabase configurados com sucesso");
  }
}

// Instância global do storage
export const supabaseStorage = new SupabaseStorage();

// Funções de conveniência
export const uploadProductImage = (file: Buffer | File) => supabaseStorage.uploadImage(file, "products", "images");

export const uploadStoreLogo = (file: Buffer | File) => supabaseStorage.uploadImage(file, "stores", "logos");

export const uploadAvatar = (file: Buffer | File) => supabaseStorage.uploadImage(file, "avatars", "profiles");

export const deleteProductImage = (filePath: string) => supabaseStorage.deleteFile("products", filePath);

export const deleteStoreLogo = (filePath: string) => supabaseStorage.deleteFile("stores", filePath);

// Database helpers
export const createSupabaseUser = async (email: string, password: string) => {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Erro ao criar usuário: ${error.message}`);
  }

  return data.user;
};

export const deleteSupabaseUser = async (userId: string) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Erro ao deletar usuário: ${error.message}`);
  }
};

export default supabase;
