import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
  file?: File;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  folder?: string;
  className?: string;
}

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
  folder = 'products',
  className = '',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<UploadedImage | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro no upload');
      }

      return {
        url: result.data.url,
        publicId: result.data.publicId,
        width: result.data.width,
        height: result.data.height,
        format: result.data.format,
        size: result.data.size,
        file,
      };
    } catch (error) {
      console.error('Erro no upload:', error);
      alert(`Erro ao fazer upload de ${file.name}: ${error}`);
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
      filesToUpload.forEach(file => newUploadingFiles.add(file.name));
      setUploadingFiles(newUploadingFiles);

      // Upload dos arquivos
      const uploadPromises = filesToUpload.map(uploadFile);
      const uploadedImages = await Promise.all(uploadPromises);

      // Filtrar uploads bem-sucedidos
      const successfulUploads = uploadedImages.filter(
        (img): img is UploadedImage => img !== null
      );

      // Atualizar estado
      onImagesChange([...images, ...successfulUploads]);

      // Remover arquivos da lista de upload
      const updatedUploadingFiles = new Set(uploadingFiles);
      filesToUpload.forEach(file => updatedUploadingFiles.delete(file.name));
      setUploadingFiles(updatedUploadingFiles);
    },
    [images, maxImages, folder, onImagesChange, uploadingFiles]
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
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    
    // Remover do Cloudinary
    try {
      await fetch(`/api/upload?publicId=${imageToRemove.publicId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
    }

    // Remover da lista
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange(newImages);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Arraste e solte suas imagens aqui
          </p>
          <p className="text-sm text-gray-500 mb-4">
            ou clique para selecionar arquivos
          </p>
          <p className="text-xs text-gray-400">
            PNG, JPG, WebP ou GIF até 5MB • Máximo {maxImages} imagens
          </p>
        </div>
      )}

      {/* Uploaded Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.publicId}
              className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', index.toString());
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                reorderImages(fromIndex, index);
              }}
            >
              <img
                src={image.url}
                alt={`Upload ${index + 1}`}
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
              
              {/* Primary Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  Principal
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Uploading Files */}
      {uploadingFiles.size > 0 && (
        <div className="space-y-2">
          {Array.from(uploadingFiles).map((fileName) => (
            <div
              key={fileName}
              className="flex items-center space-x-2 p-2 bg-gray-50 rounded"
            >
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">Enviando {fileName}...</span>
            </div>
          ))}
        </div>
      )}

      {/* Images Counter */}
      <div className="text-sm text-gray-500 text-center">
        {images.length} de {maxImages} imagens
      </div>
    </div>
  );
}