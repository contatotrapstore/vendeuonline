import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number; // Threshold para Intersection Observer
  sizes?: string;
  srcSet?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  fallback = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Imagem+Indispon%C3%ADvel',
  placeholder,
  onLoad,
  onError,
  threshold = 0.1,
  sizes,
  srcSet
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Configurar Intersection Observer
  useEffect(() => {
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setIsLoading(true);
          observerRef.current?.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: '50px' // Começar a carregar 50px antes da imagem aparecer
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    onError?.();
  };

  const defaultPlaceholder = (
    <div className={`flex flex-col items-center justify-center bg-gray-100 ${className}`}>
      {isLoading ? (
        <>
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-2" />
          <span className="text-xs text-gray-500">Carregando...</span>
        </>
      ) : (
        <>
          <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-xs text-gray-500">Imagem</span>
        </>
      )}
    </div>
  );

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder enquanto não carregou */}
      {!isLoaded && (placeholder || defaultPlaceholder)}
      
      {/* Imagem real */}
      <img
        ref={imgRef}
        src={isInView ? (error ? fallback : src) : undefined}
        alt={alt}
        className={`
          transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}
          ${className}
        `}
        onLoad={handleLoad}
        onError={handleError}
        sizes={sizes}
        srcSet={srcSet}
        loading="lazy" // Adicionar suporte nativo também
        decoding="async"
      />
      
      {/* Loading overlay */}
      {isLoading && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />
        </div>
      )}
    </div>
  );
};

// Hook para preload de imagens
export const useImagePreloader = () => {
  const preloadedImages = useRef<Set<string>>(new Set());

  const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (preloadedImages.current.has(src)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        preloadedImages.current.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const preloadImages = async (srcs: string[]): Promise<void> => {
    try {
      await Promise.all(srcs.map(src => preloadImage(src)));
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    }
  };

  return {
    preloadImage,
    preloadImages,
    isPreloaded: (src: string) => preloadedImages.current.has(src)
  };
};

// Componente especializado para imagens de produtos
interface ProductImageProps extends Omit<LazyImageProps, 'sizes' | 'srcSet'> {
  product?: {
    name: string;
    category?: string;
  };
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  product,
  className = 'w-full h-48 object-cover',
  ...props
}) => {
  // Gerar srcSet para diferentes resoluções
  const generateSrcSet = (originalSrc: string) => {
    if (originalSrc.includes('placeholder')) {
      return undefined;
    }
    
    // Se usar Cloudinary ou similar, pode gerar diferentes tamanhos
    // Por enquanto, retornar apenas a imagem original
    return undefined;
  };

  // Sizes responsivos para produtos
  const productSizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";

  // Alt text mais descritivo
  const productAlt = product 
    ? `${product.name}${product.category ? ` - ${product.category}` : ''}`
    : alt;

  return (
    <LazyImage
      src={src}
      alt={productAlt}
      className={className}
      sizes={productSizes}
      srcSet={generateSrcSet(src)}
      {...props}
    />
  );
};

export default LazyImage;