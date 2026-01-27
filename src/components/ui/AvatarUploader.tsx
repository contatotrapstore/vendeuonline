import React, { useState, useCallback, useRef } from "react";
import { Upload, X, User, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";


export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
  file?: File;
}

interface AvatarUploaderProps {
  image: UploadedImage | null;
  onImageChange: (image: UploadedImage | null) => void;
  className?: string;
}

export default function AvatarUploader({
  image,
  onImageChange,
  className = "",
}: AvatarUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<UploadedImage | null> => {
    // Validar tamanho do arquivo (5MB máximo)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      logger.error("Arquivo muito grande:", file.size);
      alert(`Arquivo ${file.name} muito grande. Máximo 5MB permitido.`);
      return null;
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      logger.error("Tipo de arquivo inválido:", file.type);
      alert(`Arquivo ${file.name} não é uma imagem válida.`);
      return null;
    }

    // Usar Supabase Storage com bucket "avatars" para avatar de usuário
    const { supabaseStorage } = await import("@/lib/supabase");

    try {
      logger.info(`📤 Iniciando upload de avatar: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);

      // Upload para bucket "avatars" com folder "avatars"
      const uploadResult = await supabaseStorage.uploadImage(file, "avatars", "avatars");

      logger.info(`✅ Upload de avatar concluído: ${uploadResult.publicUrl}`);

      // Criar objeto compatível com UploadedImage
      const result = {
        url: uploadResult.publicUrl,
        publicId: uploadResult.path,
        secure_url: uploadResult.publicUrl,
      };

      return {
        url: result.url,
        publicId: result.publicId,
        width: 800, // Default width
        height: 800, // Default height (square)
        format: file.type.split("/")[1] || "jpeg",
        size: file.size,
        file,
      };
    } catch (error: any) {
      logger.error("❌ Erro no upload de avatar:", error);

      let errorMessage = `Erro ao fazer upload de ${file.name}`;

      // Mensagens de erro mais específicas por tipo
      if (error.name === 'AbortError') {
        errorMessage = `Upload de ${file.name} cancelado por timeout (120s). Verifique sua conexão ou tente uma imagem menor.`;
      } else if (error.message) {
        if (error.message.includes('timeout')) {
          errorMessage = `Timeout no upload de ${file.name}. Verifique sua conexão.`;
        } else if (error.message.includes('JWT') || error.message.includes('Token') || error.message.includes('401')) {
          errorMessage = `Sessão expirada. Faça login novamente.`;
        } else if (error.message.includes('bucket')) {
          errorMessage = `Erro de configuração do servidor (bucket não encontrado). Contate o suporte.`;
        } else if (error.message.includes('too large') || error.message.includes('5MB')) {
          const fileSize = (file.size / 1024 / 1024).toFixed(2);
          errorMessage = `${file.name} muito grande. Máximo: 5MB. Tamanho atual: ${fileSize}MB`;
        } else if (error.message.includes('network') || error.message.includes('failed to fetch')) {
          errorMessage = `Erro de conexão ao fazer upload de ${file.name}. Verifique sua internet.`;
        } else {
          errorMessage = `${errorMessage}: ${error.message}`;
        }
      } else if (typeof error === "string") {
        errorMessage = `${errorMessage}: ${error}`;
      }

      alert(errorMessage);
      return null;
    }
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return;

      const file = files[0]; // Apenas 1 avatar por vez
      setIsUploading(true);

      const uploadedImage = await uploadFile(file);

      if (uploadedImage) {
        onImageChange(uploadedImage);
      }

      setIsUploading(false);
    },
    [onImageChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFiles]
  );

  const removeImage = async () => {
    if (!image) return;

    // Remover do Supabase Storage via API
    try {
      await fetch(`/api/upload?publicId=${image.publicId}`, {
        method: "DELETE",
      });
    } catch (error) {
      logger.error("Erro ao deletar avatar:", error);
    }

    onImageChange(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area / Preview */}
      <div className="flex justify-center">
        <div
          className={`relative w-32 h-32 rounded-full overflow-hidden border-2 transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : image
              ? "border-gray-300"
              : "border-dashed border-gray-300 hover:border-gray-400 cursor-pointer"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !image && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          {!image && !isUploading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <User className="h-12 w-12 mb-2" />
              <p className="text-xs text-center px-2">Foto de perfil</p>
            </div>
          )}

          {isUploading && (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}

          {image && !isUploading && (
            <>
              <img
                src={image.url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage();
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>

              {/* Change Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 transition-colors"
                type="button"
              >
                <Upload className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-400 text-center">
        PNG, JPG ou WebP até 5MB • Recomendado: 400x400px
      </p>
    </div>
  );
}
