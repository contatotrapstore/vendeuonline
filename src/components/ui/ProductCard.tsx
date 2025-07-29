'use client';

import { useState } from 'react';
import { Heart, Star, MapPin, Truck, ShoppingCart, Eye } from 'lucide-react';
import { Product } from '@/store/productStore';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
  showAddToCart?: boolean;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  isInWishlist?: boolean;
}

export function ProductCard({ 
  product, 
  viewMode = 'grid',
  showAddToCart = true,
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false
}: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(product);
    }
  };

  if (viewMode === 'list') {
    return (
      <Link to={`/produto/${product.id}`}>
        <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 p-4">
          <div className="flex gap-4">
            {/* Image */}
            <div className="relative w-32 h-32 flex-shrink-0">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
              )}
              {imageError ? (
                <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-gray-400 text-center">
                    <Eye className="h-8 w-8 mx-auto mb-1" />
                    <span className="text-xs">Imagem não disponível</span>
                  </div>
                </div>
              ) : (
                <img
                  src={product.image}
                  alt={product.name}
                  className={`w-full h-full object-cover rounded-lg transition-opacity duration-200 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              )}
              
              {/* Discount Badge */}
              {product.discount && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                  -{product.discount}%
                </div>
              )}
              
              {/* Featured Badge */}
              {product.isFeatured && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                  Destaque
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
                  {product.name}
                </h3>
                
                {/* Wishlist Button */}
                <button
                  onClick={handleToggleWishlist}
                  className={`p-2 rounded-full transition-colors ${
                    isInWishlist
                      ? 'text-red-500 bg-red-50 hover:bg-red-100'
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current' : ''}`} />
                </button>
              </div>

              <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                {product.description}
              </p>

              {/* Store and Location */}
              <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
                <span className="font-medium">{product.store}</span>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{product.location}</span>
                </div>
              </div>

              {/* Rating and Reviews */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1">
                  {renderStars(product.rating)}
                </div>
                <span className="text-sm text-gray-600">
                  {product.rating} ({product.reviews} avaliações)
                </span>
              </div>

              {/* Price and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-lg text-gray-500 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>
                  
                  {/* Shipping */}
                  <div className="flex items-center gap-1 text-sm">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span className={product.shipping.free ? 'text-green-600 font-medium' : 'text-gray-600'}>
                      {product.shipping.free ? 'Frete grátis' : `Frete: ${formatPrice(product.shipping.price || 0)}`}
                    </span>
                    <span className="text-gray-500">• {product.shipping.estimatedDays} dias úteis</span>
                  </div>
                </div>

                {/* Add to Cart Button */}
                {showAddToCart && (
                  <button
                    onClick={handleAddToCart}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Adicionar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Grid view
  return (
    <Link to={`/produto/${product.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all duration-300 overflow-hidden group transform hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          {imageError ? (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <Eye className="h-12 w-12 mx-auto mb-2" />
                <span className="text-sm">Imagem não disponível</span>
              </div>
            </div>
          ) : (
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.discount && (
              <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                -{product.discount}%
              </div>
            )}
            {product.isFeatured && (
              <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                Destaque
              </div>
            )}
          </div>
          
          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            className={`absolute top-3 right-3 p-2.5 rounded-full transition-all duration-300 backdrop-blur-sm ${
              isInWishlist
                ? 'text-red-500 bg-white/95 shadow-lg scale-110'
                : 'text-gray-400 bg-white/80 hover:bg-white/95 hover:text-red-500 hover:scale-110 shadow-md'
            }`}
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Store */}
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{product.store}</div>
          
          {/* Title */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
            {product.name}
          </h3>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-0.5">
              {renderStars(product.rating)}
            </div>
            <span className="text-xs text-gray-500 font-medium">({product.reviews})</span>
          </div>
          
          {/* Price */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          
          {/* Shipping */}
          <div className="flex items-center gap-1.5 text-sm mb-3">
            <Truck className="h-4 w-4 text-green-600" />
            <span className={product.shipping.free ? 'text-green-600 font-semibold' : 'text-gray-600'}>
              {product.shipping.free ? 'Frete grátis' : 'Frete pago'}
            </span>
          </div>
          
          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
            <MapPin className="h-3.5 w-3.5" />
            <span>{product.location}</span>
          </div>
          
          {/* Add to Cart Button */}
          {showAddToCart && (
            <button
              onClick={handleAddToCart}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingCart className="h-4 w-4" />
              Adicionar ao Carrinho
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;