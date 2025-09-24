import { logger } from "@/lib/logger";

"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Star,
  Heart,
  Share2,
  ShoppingCart,
  Truck,
  Shield,
  ArrowLeft,
  Plus,
  Minus,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { useProductStore } from "@/store/productStore";
import { Product } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { Link } from "react-router-dom";

export default function ProductDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { products } = useProductStore();
  const { user } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    if (params.id) {
      const foundProduct = products.find((p) => p.id === params.id);
      setProduct(foundProduct || null);
    }
  }, [params.id, products]);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Produto não encontrado</h2>
          <p className="text-gray-600 mb-6">O produto que você está procurando não existe ou foi removido.</p>
          <Link to="/products">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Ver Todos os Produtos
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const calculateDiscount = () => {
    if (product.comparePrice && product.comparePrice > product.price) {
      return Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
    }
    return 0;
  };

  const handleAddToCart = () => {
    // In a real app, this would add to cart store
    logger.info("Added to cart:", { productId: product.id, quantity });
    // Show success message or redirect to cart
  };

  const handleBuyNow = () => {
    // In a real app, this would redirect to checkout
    logger.info("Buy now:", { productId: product.id, quantity });
    navigate("/checkout");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (error) {
        logger.info("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // Show success message
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
      />
    ));
  };

  const getStockStatus = () => {
    if (product.stock === 0) {
      return { label: "Produto esgotado", className: "text-red-600", available: false };
    } else if (product.stock <= 5) {
      return { label: `Últimas ${product.stock} unidades!`, className: "text-yellow-600", available: true };
    }
    return { label: "Em estoque", className: "text-green-600", available: true };
  };

  const stockStatus = getStockStatus();
  const discount = calculateDiscount();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:text-blue-600">
            Início
          </Link>
          <span>/</span>
          <Link to="/products" className="hover:text-blue-600">
            Produtos
          </Link>
          <span>/</span>
          <Link to={`/products?category=${typeof product.category === 'object' ? product.category.slug || product.category.name : product.category}`} className="hover:text-blue-600">
            {typeof product.category === 'object' ? product.category.name : product.category}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-white rounded-lg border overflow-hidden">
              <img
                src={product.images[selectedImage]?.url || product.images[0]?.url}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMjUwQzIzMC45MjggMjUwIDI1NiAyMjQuOTI4IDI1NiAxOTRDMjU2IDE2My4wNzIgMjMwLjkyOCAxMzggMjAwIDEzOEMxNjkuMDcyIDEzOCAxNDQgMTYzLjA3MiAxNDQgMTk0QzE0NCAyMjQuOTI4IDE2OS4wNzIgMjUwIDIwMCAyNTBaIiBmaWxsPSIjOUI5QjlCIi8+CjxwYXRoIGQ9Ik0xMDAgMzYyTDE2MCAzMDJMMjAwIDM0MkwyODAgMjYyTDM2MCAzNDJWMzYySDE0MFoiIGZpbGw9IiM5QjlCOUIiLz4KPC9zdmc+Cg==";
                }}
              />
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden ${
                      selectedImage === index ? "border-blue-500" : "border-gray-200"
                    }`}
                  >
                    <img src={image.url} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {renderStars(product.rating)}
                  <span className="text-sm text-gray-600 ml-1">({product.rating})</span>
                </div>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-600">{product.reviewCount} avaliações</span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-600">{product.salesCount} vendidos</span>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
                {product.comparePrice && (
                  <>
                    <span className="text-lg text-gray-500 line-through">{formatPrice(product.comparePrice)}</span>
                    <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded">-{discount}%</span>
                  </>
                )}
              </div>
              {product.specifications?.find((spec) => spec.name === "Frete Grátis")?.value === "Sim" && (
                <div className="flex items-center gap-2 text-green-600">
                  <Truck className="h-4 w-4" />
                  <span className="text-sm font-medium">Frete grátis</span>
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className={`text-sm font-medium ${stockStatus.className}`}>{stockStatus.label}</div>

            {/* Seller Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Vendido por</p>
                  <p className="font-medium text-gray-900">Vendedor ID: {product.sellerId}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {renderStars(4.5)}
                    <span className="text-xs text-gray-600 ml-1">(4.5)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">
                    {product.specifications?.find((spec) => spec.name === "Localização")?.value || "Não informado"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quantity and Actions */}
            {stockStatus.available && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Quantidade:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-50 transition-colors"
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 border-x border-gray-300 min-w-[60px] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="p-2 hover:bg-gray-50 transition-colors"
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">({product.stock} disponíveis)</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Adicionar ao Carrinho
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    Comprar Agora
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  isWishlisted
                    ? "border-red-500 text-red-600 bg-red-50"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
                {isWishlisted ? "Favoritado" : "Favoritar"}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </button>

              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <MessageCircle className="h-4 w-4" />
                Perguntar
              </button>
            </div>

            {/* Guarantees */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Garantia do vendedor: 12 meses</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Truck className="h-4 w-4 text-blue-600" />
                <span>Entrega rápida e segura</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Tab Headers */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "description", label: "Descrição" },
                { id: "specifications", label: "Especificações" },
                { id: "reviews", label: "Avaliações" },
                { id: "shipping", label: "Entrega" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "description" && (
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="space-y-4">
                {product.specifications &&
                Array.isArray(product.specifications) &&
                product.specifications.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.specifications.map((spec, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="font-medium text-gray-700">{spec.name}:</span>
                        <span className="text-gray-600">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Nenhuma especificação disponível.</p>
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Sistema de avaliações em desenvolvimento.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Em breve você poderá ver e deixar avaliações dos produtos.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "shipping" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Informações de Entrega</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Entrega via Correios ou transportadora</p>
                      <p>• Prazo: 3-7 dias úteis</p>
                      <p>• Rastreamento incluído</p>
                      {product.specifications?.find((spec) => spec.name === "Frete Grátis")?.value === "Sim" && (
                        <p>• Frete grátis para todo o Brasil</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Política de Devolução</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• 7 dias para devolução</p>
                      <p>• Produto deve estar em perfeitas condições</p>
                      <p>• Embalagem original preservada</p>
                      <p>• Frete de devolução por conta do comprador</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
