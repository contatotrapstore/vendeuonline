"use client";

import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Star, Heart, Share2, Shield, Plus, Minus, MapPin } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useProductStore } from "@/store/productStore";
import { Product, DeliveryOption } from "@/types";
import { useAuthStore } from "@/store/authStore";
import ImageGalleryModal from "@/components/ui/ImageGalleryModal";
import { useWishlistStore } from "@/store/wishlistStore";
import { toast } from "sonner";
import apiRequest from "@/lib/api-client";
import { EmptyReviews } from "@/components/ui/feedback/EmptyState";

interface ProductReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

interface ReviewStats {
  total: number;
  average: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { products, fetchProductById } = useProductStore();
  const { user, token, isAuthenticated } = useAuthStore();
  const isInWishlist = useWishlistStore((state) => state.isInWishlist);
  const addToWishlist = useWishlistStore((state) => state.addToWishlist);
  const removeFromWishlist = useWishlistStore((state) => state.removeFromWishlist);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ total: 0, average: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOption | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      if (params.id) {
        const cachedProduct = products.find((p) => p.id === params.id);

        if (cachedProduct) {
          setProduct(cachedProduct);
        }

        try {
          const fetchedProduct = await fetchProductById(params.id);
          if (fetchedProduct) {
            setProduct(fetchedProduct);
          } else if (!cachedProduct) {
            setProduct(null);
          }
        } catch (error) {
          logger.error("Erro ao carregar produto:", error);
          if (!cachedProduct) {
            setProduct(null);
          }
        }
      }
    };

    loadProduct();
  }, [params.id, products, fetchProductById]);

  useEffect(() => {
    if (user?.userType === "buyer") {
      fetchWishlist().catch((error) => logger.warn("Não foi possível atualizar wishlist:", error));
    }
  }, [user, fetchWishlist]);

  const fetchProductReviews = async (productId: string) => {
    try {
      setReviewsLoading(true);
      const response = await apiRequest<{ data?: ProductReview[]; stats?: ReviewStats }>(
        `/api/reviews/${productId}`
      );
      setReviews(response.data || []);
      setReviewStats(response.stats || { total: 0, average: 0 });
    } catch (error) {
      logger.warn("Erro ao carregar avaliações:", error);
      setReviews([]);
      setReviewStats({ total: 0, average: 0 });
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (product?.id) {
      fetchProductReviews(product.id);
    }
  }, [product?.id]);


  const handleToggleWishlist = async () => {
    if (!product) return;

    // Verificar autenticação antes de tentar favoritar
    if (!isAuthenticated || !user) {
      toast.error("Faça login para adicionar produtos à lista de desejos", {
        action: {
          label: "Fazer Login",
          onClick: () => navigate("/auth/login"),
        },
      });
      return;
    }

    const alreadySaved = isInWishlist(product.id);

    try {
      if (alreadySaved) {
        await removeFromWishlist(product.id);
        toast.success("Produto removido da sua lista de desejos");
      } else {
        await addToWishlist(product.id);
        toast.success(`${product.name} adicionado à sua lista de desejos`);
      }
    } catch (error) {
      // Melhorar mensagens de erro baseadas no erro
      let message = "Erro ao atualizar lista de desejos";

      if (error instanceof Error) {
        // Verificar mensagens específicas
        if (error.message.includes("login") || error.message.includes("autenticação")) {
          message = "Faça login para adicionar produtos à lista de desejos";
          toast.error(message, {
            action: {
              label: "Fazer Login",
              onClick: () => navigate("/auth/login"),
            },
          });
          return;
        } else if (error.message.includes("não encontrado") || error.message.includes("404")) {
          message = "Produto não encontrado";
        } else if (error.message.includes("já está")) {
          message = "Produto já está na lista de desejos";
        } else {
          message = error.message;
        }
      }

      toast.error(message);
      logger.error("Erro ao atualizar wishlist:", error);
    }
  };

  const wishlisted = product ? isInWishlist(product.id) : false;

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Produto não encontrado</h2>
          <p className="text-gray-600 mb-6">O produto que você está procurando não existe ou foi removido.</p>
          <Link to="/produtos">
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

  const handleWhatsAppContact = () => {
    // Usar WhatsApp da loja (campo whatsapp ou phone)
    const storeWhatsApp = product.store?.whatsapp || product.store?.phone;

    if (!storeWhatsApp) {
      alert("Loja sem WhatsApp cadastrado. Entre em contato pelo telefone ou email da loja.");
      return;
    }

    // Verificar se há opções de entrega customizadas e se uma foi selecionada
    const hasDeliveryOptions = (product as any).deliveryOptions && (product as any).deliveryOptions.length > 0;
    if (hasDeliveryOptions && !selectedDelivery) {
      toast.error("Por favor, selecione uma forma de entrega antes de continuar");
      return;
    }

    // Limpar formatação do número (remover espaços, parênteses, traços)
    const cleanPhone = storeWhatsApp.replace(/[^\d]/g, "");

    // Garantir que tem código do país (55 para Brasil)
    const phone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    const productUrl = window.location.href;
    const storeName = product.store?.name || "a loja";

    // Montar mensagem com ou sem informações de entrega
    let message = `Olá, ${storeName}! Tenho interesse no produto:\n\n*${product.name}*\nPreço: ${formatPrice(product.price)}\nQuantidade desejada: ${quantity}`;

    // Adicionar informações de entrega se selecionada
    if (selectedDelivery) {
      message += `\n\n🚚 *Entrega:* ${selectedDelivery.name}`;
      if (selectedDelivery.prazo) {
        message += `\n📅 *Prazo:* ${selectedDelivery.prazo}`;
      }
      if (selectedDelivery.valor !== undefined && selectedDelivery.valor !== null) {
        message += `\n💵 *Frete:* ${selectedDelivery.valor === 0 ? "Grátis" : formatPrice(selectedDelivery.valor)}`;
      }
    }

    message += `\n\nLink do produto: ${productUrl}`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    logger.info("WhatsApp contact initiated:", {
      productId: product.id,
      quantity,
      storePhone: phone,
      storeName: product.store?.name,
      selectedDelivery: selectedDelivery?.name
    });
    window.open(whatsappUrl, "_blank");
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

  const handleReviewSubmit = async () => {
    if (!product) return;

    if (!user || user.userType !== "buyer") {
      toast.info("Faça login como comprador para avaliar produtos");
      navigate("/login");
      return;
    }

    if (!token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    // Validação dos campos obrigatórios
    if (!reviewForm.title.trim()) {
      toast.error("Por favor, adicione um título para sua avaliação");
      return;
    }

    if (!reviewForm.comment.trim()) {
      toast.error("Por favor, escreva um comentário sobre o produto");
      return;
    }

    try {
      setIsReviewSubmitting(true);
      await apiRequest("/api/reviews", {
        method: "POST",
        token,
        body: JSON.stringify({
          productId: product.id,
          rating: reviewForm.rating,
          title: reviewForm.title.trim(),
          comment: reviewForm.comment.trim(),
        }),
      });
      toast.success("Obrigado pela avaliação!");
      setReviewForm({ rating: 5, title: "", comment: "" });
      fetchProductReviews(product.id);
    } catch (error) {
      logger.error("Erro ao enviar avaliação:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar avaliação");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const getStockStatus = () => {
    // Garantir que stock é tratado corretamente como número
    const rawStock = product.stock;
    const stock = typeof rawStock === 'number' ? rawStock : parseInt(String(rawStock), 10);

    // Log para debug
    if (stock <= 5) {
      logger.info(`📦 Stock status: raw=${rawStock}, parsed=${stock}, type=${typeof rawStock}`);
    }

    if (!Number.isFinite(stock) || stock < 1) {
      return { label: "Produto esgotado", className: "text-red-600", available: false };
    }
    const threshold = Math.max(1, Number(product.minStock ?? 5));
    if (stock <= threshold) {
      return { label: `Últimas ${stock} unidades!`, className: "text-yellow-600", available: true };
    }
    return { label: "Em estoque", className: "text-green-600", available: true };
  };

  const stockStatus = getStockStatus();
  const discount = calculateDiscount();

  const shippingLabels: Record<string, string> = {
    retirada: "Retirada em mãos",
    correios: "Correios",
    transportadora: "Transportadora",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:text-blue-600">
            Início
          </Link>
          <span>/</span>
          <Link to="/produtos" className="hover:text-blue-600">
            Produtos
          </Link>
          <span>/</span>
          <Link
            to={`/produtos?category=${typeof product.category === "object" ? product.category.slug || product.category.name : product.category}`}
            className="hover:text-blue-600"
          >
            {typeof product.category === "object" ? product.category.name : product.category}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div
              className="aspect-square bg-white rounded-lg border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setGalleryOpen(true)}
            >
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
                {/* 🔒 FIX (Bug #9): Mostrar rating correto ou "Sem avaliações" */}
                <div className="flex items-center gap-1">
                  {product.rating && product.rating > 0 ? (
                    <>
                      {renderStars(product.rating)}
                      <span className="text-sm text-gray-600 ml-1">({product.rating.toFixed(1)})</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">Sem avaliações</span>
                  )}
                </div>
                {(product.reviewCount && product.reviewCount > 0) && (
                  <>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-600">{product.reviewCount} avaliações</span>
                  </>
                )}
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-600">{product.salesCount || 0} vendidos</span>
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
            </div>

            {/* Opções de entrega customizadas (novas) */}
            {(product as any).deliveryOptions && (product as any).deliveryOptions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Escolha a forma de entrega *</p>
                <div className="grid gap-2">
                  {((product as any).deliveryOptions as DeliveryOption[]).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedDelivery(option)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedDelivery?.id === option.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{option.name}</span>
                          {option.prazo && (
                            <span className="ml-2 text-sm text-gray-500">({option.prazo})</span>
                          )}
                        </div>
                        <span className={`text-sm font-semibold ${
                          option.valor === 0 || option.valor === undefined
                            ? "text-green-600"
                            : "text-gray-900"
                        }`}>
                          {option.valor === 0 || option.valor === undefined
                            ? "Grátis"
                            : formatPrice(option.valor)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {!selectedDelivery && (
                  <p className="text-xs text-orange-600 mt-2">
                    Selecione uma opção de entrega para continuar
                  </p>
                )}
              </div>
            )}

            {/* Opções de entrega predefinidas (checkboxes legados) */}
            {product.shippingOptions && product.shippingOptions.length > 0 && !((product as any).deliveryOptions?.length > 0) && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Formas de entrega</p>
                <div className="flex flex-wrap gap-2">
                  {product.shippingOptions.map((option) => (
                    <span
                      key={option}
                      className="px-3 py-1 text-sm rounded-full border border-gray-200 bg-gray-50 text-gray-700"
                    >
                      {shippingLabels[option] || option}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status - 🔒 FIX (Bug #8): Melhor visibilidade para estoque baixo */}
            <div className="flex items-center gap-2">
              {product.stock <= (product.minStock ?? 5) && product.stock > 0 ? (
                // Estoque baixo - Badge laranja destacado com ícone
                <div className="inline-flex items-center gap-2 bg-orange-100 border-2 border-orange-400 text-orange-800 px-4 py-2 rounded-lg font-bold text-sm animate-pulse">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {stockStatus.label}
                </div>
              ) : (
                // Estoque normal ou esgotado
                <div className={`text-sm font-medium ${stockStatus.className}`}>{stockStatus.label}</div>
              )}
            </div>

            {/* Seller Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Vendido por</p>
                  {product.store?.slug ? (
                    <Link
                      to={`/stores/${product.store.slug}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {product.store.name || "Loja"}
                    </Link>
                  ) : (
                    <p className="font-medium text-gray-900">{product.store?.name || "Loja"}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">
                    {[product.store?.city, product.store?.state].filter(Boolean).join(", ") || "Não informado"}
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

                <button
                  onClick={handleWhatsAppContact}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <FaWhatsapp className="h-6 w-6" />
                  Comprar via WhatsApp
                </button>

                <p className="text-sm text-gray-600 text-center">Negocie diretamente com o vendedor via WhatsApp</p>
              </div>
            )}

            {/* Out of stock message */}
            {!stockStatus.available && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-700 font-medium mb-2">Produto Indisponível</p>
                <p className="text-gray-600">Este produto está temporariamente fora de estoque.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleToggleWishlist}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  wishlisted
                    ? "border-red-500 text-red-600 bg-red-50"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
                {wishlisted ? "Favoritado" : "Favoritar"}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </button>

              {/* Bot\u00e3o "Perguntar" removido: Sistema WhatsApp-only (contato direto via bot\u00e3o WhatsApp abaixo) */}
            </div>

            {/* Guarantees */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Garantia do vendedor: 12 meses</span>
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
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {reviewStats.average ? reviewStats.average.toFixed(1).replace('.', ',') : "0,0"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Média com {reviewStats.total}{" "}
                      {reviewStats.total === 1 ? "avaliação registrada" : "avaliações registradas"}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Atualizado em {new Date().toLocaleDateString("pt-BR")}
                  </div>
                </div>

                {reviewsLoading ? (
                  <div className="text-center text-gray-500 py-8">Carregando avaliações...</div>
                ) : reviews.length === 0 ? (
                  <EmptyReviews
                    onWriteReview={
                      user && user.userType === "buyer"
                        ? () => document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth" })
                        : undefined
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{review.user.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <Star
                                key={`${review.id}-${value}`}
                                className={`h-4 w-4 ${
                                  value <= review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && <p className="text-gray-700">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <div id="review-form" className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Deixe sua avaliação</h4>
                  {user && user.userType === "buyer" ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-6 w-6 ${
                                value <= reviewForm.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-sm text-gray-600 ml-2">{reviewForm.rating} de 5</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Título da avaliação <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={reviewForm.title}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: Ótimo produto!"
                          maxLength={100}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Seu comentário <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={4}
                          placeholder="Conte para outros compradores como foi sua experiência..."
                          required
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleReviewSubmit}
                          disabled={isReviewSubmitting}
                          className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isReviewSubmitting ? "Enviando..." : "Enviar avaliação"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Faça login como comprador para compartilhar sua experiência.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={product.images.map((img) => img.url)}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={selectedImage}
        productName={product.name}
      />
    </div>
  );
}
