"use client";

import { useState } from "react";
import { Heart, Star, MapPin, Truck, MessageCircle } from "lucide-react";
import { Product } from "@/types";
import { Link } from "react-router-dom";
import { ProductImage } from "@/components/ui/LazyImage";
import { useTracking } from "@/components/TrackingScripts";
import { WhatsAppProductButton } from "@/components/ui/WhatsAppButton";

interface Store {
  id: string;
  name: string;
  whatsapp?: string | null;
  phone?: string | null;
}

interface ProductCardProps {
  product: Product;
  store: Store;
  viewMode?: "grid" | "list";
  showWhatsAppButton?: boolean;
  onToggleWishlist?: (product: Product) => void;
  isInWishlist?: boolean;
}

export function ProductCard({
  product,
  store,
  viewMode = "grid",
  showWhatsAppButton = true,
  onToggleWishlist,
  isInWishlist = false,
}: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { trackViewContent } = useTracking();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
      />
    ));
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(product);
    }
  };

  const handleProductClick = () => {
    // Track product view event
    trackViewContent(product.id, product.name, product.price);
  };

  if (viewMode === "list") {
    return (
      <Link to={`/produto/${product.id}`} onClick={handleProductClick}>
        <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 p-4">
          <div className="flex gap-4">
            {/* Image */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <ProductImage
                src={product.images?.[0]?.url || "/placeholder-image.jpg"}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg"
                product={{
                  name: product.name,
                  category:
                    typeof product.category === "string" ? product.category : product.category?.name || "Produto",
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />

              {/* Discount Badge */}
              {product.comparePrice && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                  -{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
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
                      ? "text-red-500 bg-red-50 hover:bg-red-100"
                      : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isInWishlist ? "fill-current" : ""}`} />
                </button>
              </div>

              <p className="text-gray-600 text-sm line-clamp-2 mb-3">{product.description}</p>

              {/* Store Info */}
              <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
                <span className="font-medium">{store.name}</span>
              </div>

              {/* Rating and Reviews */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1">{renderStars(product.rating)}</div>
                <span className="text-sm text-gray-600">
                  {product.rating} ({product.reviewCount} avaliações)
                </span>
              </div>

              {/* Price and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">{formatPrice(product.price)}</span>
                    {product.comparePrice && (
                      <span className="text-lg text-gray-500 line-through">{formatPrice(product.comparePrice)}</span>
                    )}
                  </div>

                  {/* Shipping */}
                  <div className="flex items-center gap-1 text-sm">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Frete negociado direto com vendedor</span>
                  </div>
                </div>

                {/* WhatsApp Button */}
                {showWhatsAppButton && (
                  <div onClick={(e) => e.preventDefault()}>
                    <WhatsAppProductButton product={product} store={store} className="px-6 py-2" />
                  </div>
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
    <Link to={`/produto/${product.id}`} onClick={handleProductClick}>
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all duration-300 overflow-hidden group transform hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <ProductImage
            src={product.images?.[0]?.url || "/placeholder-image.jpg"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            product={{
              name: product.name,
              category: typeof product.category === "string" ? product.category : product.category?.name || "Produto",
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.comparePrice && (
              <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                -{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
              </div>
            )}
            {product.isFeatured && (
              <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">Destaque</div>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            className={`absolute top-3 right-3 p-2.5 rounded-full transition-all duration-300 backdrop-blur-sm ${
              isInWishlist
                ? "text-red-500 bg-white/95 shadow-lg scale-110"
                : "text-gray-400 bg-white/80 hover:bg-white/95 hover:text-red-500 hover:scale-110 shadow-md"
            }`}
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Store */}
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{store.name}</div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-0.5">{renderStars(product.rating)}</div>
            <span className="text-xs text-gray-500 font-medium">({product.reviewCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.comparePrice && (
              <span className="text-sm text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>

          {/* Shipping */}
          <div className="flex items-center gap-1.5 text-sm mb-4">
            <MessageCircle className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-semibold">Frete negociado direto</span>
          </div>

          {/* WhatsApp Button */}
          {showWhatsAppButton && (
            <div onClick={(e) => e.preventDefault()}>
              <WhatsAppProductButton
                product={product}
                store={store}
                className="w-full py-3 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
