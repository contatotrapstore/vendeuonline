import React, { useState, useCallback, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
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

interface StoreImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  imageType?: "logo" | "banner";
  className?: string;
}

export default function StoreImageUploader({
  images,
  onImagesChange,
  maxImages = 1,
  imageType = "logo",
  className = "",
}: StoreImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
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

    // Usar Supabase Storage com bucket "stores" para logo/banner da loja
    const { supabaseStorage } = await import("@/lib/supabase");

    try {
      logger.info(`📤 Iniciando upload de ${imageType}: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);

      // Upload para bucket "stores" com folder baseado no tipo (logo ou banner)
      const folder = imageType === "logo" ? "logos" : "banners";
      const uploadResult = await supabaseStorage.uploadImage(file, "stores", folder);

      logger.info(`✅ Upload de ${imageType} concluído: ${uploadResult.publicUrl}`);

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
        height: 600, // Default height
        format: file.type.split("/")[1] || "jpeg",
        size: file.size,
        file,
      };
    } catch (error: any) {
      logger.error(`❌ Erro no upload de ${imageType}:`, error);

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
      const fileArray = Array.from(files);
      const remainingSlots = maxImages - images.length;
      const filesToUpload = fileArray.slice(0, remainingSlots);

      if (fileArray.length > remainingSlots) {
        alert(`Você pode adicionar apenas ${remainingSlots} imagem(ns) a mais.`);
      }

      // Adicionar arquivos à lista de upload
      const newUploadingFiles = new Set(uploadingFiles);
      filesToUpload.forEach((file) => newUploadingFiles.add(file.name));
      setUploadingFiles(newUploadingFiles);

      // Upload dos arquivos
      const uploadPromises = filesToUpload.map(uploadFile);
      const uploadedImages = await Promise.all(uploadPromises);

      // Filtrar uploads bem-sucedidos
      const successfulUploads = uploadedImages.filter((img): img is UploadedImage => img !== null);

      // Atualizar estado
      onImagesChange([...images, ...successfulUploads]);

      // Remover arquivos da lista de upload
      const updatedUploadingFiles = new Set(uploadingFiles);
      filesToUpload.forEach((file) => updatedUploadingFiles.delete(file.name));
      setUploadingFiles(updatedUploadingFiles);
    },
    [images, maxImages, imageType, onImagesChange, uploadingFiles]
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

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];

    // Remover do Supabase Storage via API
    try {
      await fetch(`/api/upload?publicId=${imageToRemove.publicId}`, {
        method: "DELETE",
      });
    } catch (error) {
      logger.error("Erro ao deletar imagem:", error);
    }

    // Remover da lista
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const imagePlaceholderText = imageType === "logo" ? "Logo da Loja" : "Banner da Loja";
  const imageDescriptionText = imageType === "logo"
    ? "PNG, JPG ou WebP até 5MB • Recomendado: 400x400px"
    : "PNG, JPG ou WebP até 5MB • Recomendado: 1200x300px";

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Arraste e solte {imagePlaceholderText.toLowerCase()} aqui</p>
          <p className="text-sm text-gray-500 mb-4">ou clique para selecionar arquivo</p>
          <p className="text-xs text-gray-400">{imageDescriptionText}</p>
        </div>
      )}

      {/* Uploaded Image Preview */}
      {images.length > 0 && (
        <div className="relative">
          {images.map((image, index) => (
            <div
              key={image.publicId}
              className="relative group bg-gray-100 rounded-lg overflow-hidden"
              style={{ aspectRatio: imageType === "logo" ? "1/1" : "4/1" }}
            >
              <img
                src={image.url}
                alt={imagePlaceholderText}
                className="w-full h-full object-cover"
              />

              {/* Remove Button */}
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Image Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs truncate">
                  {image.format?.toUpperCase()} • {Math.round(image.size / 1024)}KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploading Files */}
      {uploadingFiles.size > 0 && (
        <div className="space-y-2">
          {Array.from(uploadingFiles).map((fileName) => (
            <div key={fileName} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">Enviando {fileName}...</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
