import React, { useState, useRef, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  fallback?: string;
  lazy?: boolean;
  quality?: number;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder,
  fallback,
  lazy = true,
  quality = 75,
  sizes,
  priority = false,
  onLoad,
  onError,
  onClick,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Carregar 50px antes de entrar na viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, priority, isInView]);

  // Gerar URL otimizada (simulação - em produção usaria um serviço como Cloudinary)
  const getOptimizedUrl = (originalSrc: string) => {
    // Se for uma URL externa ou já otimizada, retorna como está
    if (originalSrc.startsWith('http') || originalSrc.includes('cloudinary') || originalSrc.includes('unsplash')) {
      return originalSrc;
    }

    // Para imagens locais, adiciona parâmetros de otimização
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    if (quality) params.append('q', quality.toString());

    const queryString = params.toString();
    return queryString ? `${originalSrc}?${queryString}` : originalSrc;
  };

  // Gerar srcSet para diferentes densidades de tela
  const generateSrcSet = (originalSrc: string) => {
    if (!width || originalSrc.startsWith('http')) return undefined;

    const srcSet = [];
    const densities = [1, 1.5, 2, 3];

    densities.forEach((density) => {
      const scaledWidth = Math.round(width * density);
      const url = getOptimizedUrl(originalSrc).replace(
        /w=\d+/,
        `w=${scaledWidth}`
      );
      srcSet.push(`${url} ${density}x`);
    });

    return srcSet.join(', ');
  };

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const optimizedSrc = getOptimizedUrl(src);
  const srcSet = generateSrcSet(src);

  // Placeholder enquanto carrega
  const renderPlaceholder = () => {
    if (placeholder) {
      return (
        <img
          src={placeholder}
          alt=""
          className={`${className} filter blur-sm transition-opacity duration-300 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
          style={{ width, height }}
        />
      );
    }

    return (
      <div
        className={`${className} bg-gray-200 animate-pulse flex items-center justify-center transition-opacity duration-300 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
        style={{ width, height }}
      >
        <ImageOff className="w-8 h-8 text-gray-400" />
      </div>
    );
  };

  // Fallback em caso de erro
  const renderFallback = () => {
    if (fallback) {
      return (
        <img
          src={fallback}
          alt={alt}
          className={className}
          style={{ width, height }}
        />
      );
    }

    return (
      <div
        className={`${className} bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <ImageOff className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Imagem não encontrada</p>
        </div>
      </div>
    );
  };

  if (hasError) {
    return renderFallback();
  }

  return (
    <div className="relative" ref={imgRef}>
      {/* Placeholder */}
      {!isLoaded && renderPlaceholder()}

      {/* Imagem principal */}
      {isInView && (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ width, height }}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          onClick={onClick}
        />
      )}
    </div>
  );
};

export default OptimizedImage;

// Componente específico para avatares
interface AvatarImageProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;
  className?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt,
  size = 'md',
  fallbackText,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl',
  };

  const fallback = (
    <div className={`${sizeClasses[size]} ${className} bg-gray-300 rounded-full flex items-center justify-center`}>
      <span className={`${textSizes[size]} font-medium text-gray-600`}>
        {fallbackText || alt.charAt(0).toUpperCase()}
      </span>
    </div>
  );

  if (!src) {
    return fallback;
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`${sizeClasses[size]} ${className} rounded-full object-cover`}
      fallback={fallback.props.children}
      priority
    />
  );
};

// Componente para imagens de produtos
interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | '4/3' | '16/9' | '3/4';
  showZoom?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = 'square',
  showZoom = false,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const aspectClasses = {
    square: 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '3/4': 'aspect-[3/4]',
  };

  const handleZoom = () => {
    if (showZoom) {
      setIsZoomed(!isZoomed);
    }
  };

  return (
    <div className={`${aspectClasses[aspectRatio]} ${className} relative overflow-hidden`}>
      <OptimizedImage
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-300 ${
          showZoom ? 'cursor-zoom-in hover:scale-105' : ''
        } ${isZoomed ? 'scale-150' : ''}`}
        onClick={handleZoom}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      
      {showZoom && isZoomed && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <span className="text-white text-sm">Clique para fechar</span>
        </div>
      )}
    </div>
  );
};