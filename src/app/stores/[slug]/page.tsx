"use client";

import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Star,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Package,
  Users,
  Calendar,
  Shield,
  Filter,
  Grid,
  List,
  Heart,
  Loader2,
  AlertCircle,
  Copy,
} from "lucide-react";
import { useStoreStore } from "@/stores/storeStore";
import { useProductStore } from "@/store/productStore";
import { useParams, Link } from "react-router-dom";
import ImageGalleryModal from "@/components/ui/ImageGalleryModal";
import { PRODUCT_PLACEHOLDER, STORE_PLACEHOLDER } from "@/lib/constants";
import { API_BASE_URL } from "@/config/api";

export default function StorePage() {
  const params = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState("products");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("popular");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedProductImages, setSelectedProductImages] = useState<string[]>([]);
  const [selectedProductName, setSelectedProductName] = useState("");

  // Reviews state
  const [storeReviews, setStoreReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewsStats, setReviewsStats] = useState<{ total: number; average: number }>({ total: 0, average: 0 });

  // Store hooks
  const {
    currentStore,
    loading: storeLoading,
    error: storeError,
    fetchStoreBySlug,
    clearError: clearStoreError,
  } = useStoreStore();

  const { getProductsByStore } = useProductStore();

  // Carregar dados básicos da loja sempre que o slug mudar
  useEffect(() => {
    if (!params.slug) return;
    setStoreProducts([]);
    setProductsError(null);

    fetchStoreBySlug(params.slug).catch((error) => {
      logger.error("Erro ao carregar loja:", error);
    });
  }, [params.slug, fetchStoreBySlug]);

  // Carregar produtos quando a loja atual for encontrada
  useEffect(() => {
    let cancelled = false;

    const loadStoreProducts = async () => {
      if (!currentStore?.id) {
        return;
      }

      try {
        setProductsLoading(true);
        setProductsError(null);
        const products = await getProductsByStore(currentStore.id);
        if (!cancelled) {
          setStoreProducts(products);
        }
      } catch (error) {
        if (!cancelled) {
          setProductsError(error instanceof Error ? error.message : "Erro ao carregar produtos");
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    };

    loadStoreProducts();

    return () => {
      cancelled = true;
    };
  }, [currentStore?.id, getProductsByStore]);

  // Carregar reviews quando aba "reviews" for selecionada
  useEffect(() => {
    let cancelled = false;

    const loadReviews = async () => {
      if (activeTab !== "reviews" || !params.slug) return;
      if (storeReviews.length > 0) return; // Já carregado

      try {
        setReviewsLoading(true);
        setReviewsError(null);

        const response = await fetch(`${API_BASE_URL}/api/stores/${encodeURIComponent(params.slug)}/reviews`);
        const data = await response.json();

        if (!cancelled) {
          if (data.success) {
            setStoreReviews(data.data || []);
            setReviewsStats(data.stats || { total: 0, average: 0 });
          } else {
            setReviewsError(data.error || "Erro ao carregar avaliações");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setReviewsError(error instanceof Error ? error.message : "Erro ao carregar avaliações");
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [activeTab, params.slug, storeReviews.length]);

  // Filtrar e ordenar produtos
  const filteredProducts = storeProducts
    .filter((product) => categoryFilter === "all" || product.category?.name === categoryFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return (b.averageRating || 0) - (a.averageRating || 0);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
    });

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "Básico":
        return "bg-gray-100 text-gray-700";
      case "Profissional":
        return "bg-blue-100 text-blue-700";
      case "Premium":
        return "bg-purple-100 text-purple-700";
      case "Empresarial":
        return "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Estados de carregamento e erro
  if (storeLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando loja...</p>
        </div>
      </div>
    );
  }

  if (storeError || !currentStore) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar loja</h2>
          <p className="text-gray-600 mb-4">{storeError || "Loja não encontrada"}</p>
          <button
            onClick={() => {
              clearStoreError();
              window.location.reload();
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <div className="relative">
        <div className="h-64 bg-gradient-to-br from-blue-600 to-purple-600">
          {currentStore.banner && (
            <img src={currentStore.banner} alt={currentStore.name} className="w-full h-full object-cover opacity-30" />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
              <div className="w-24 h-24 bg-white rounded-2xl p-2 shadow-lg">
                <img
                  src={currentStore.logo || STORE_PLACEHOLDER}
                  alt={currentStore.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>

              <div className="flex-1 text-white">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold">{currentStore.name}</h1>
                  {currentStore.isVerified && (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanBadgeColor(
                      currentStore.plan || "Básico"
                    )}`}
                  >
                    {currentStore.plan || "Básico"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{currentStore.rating?.toFixed(1) || "0.0"}</span>
                    <span className="text-gray-300">({currentStore.reviewCount || 0} avaliações)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Package className="h-4 w-4" />
                    <span>{storeProducts.length || currentStore.productCount || 0} produtos</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {currentStore.city}, {currentStore.state}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Loja</h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                    <p className="text-gray-600 text-sm">
                      {currentStore.description || "Nenhuma descrição disponível."}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Contato</h4>
                    <div className="space-y-2 text-sm">
                      {currentStore.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{currentStore.phone}</span>
                        </div>
                      )}
                      {currentStore.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{currentStore.email}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          {currentStore.address || `${currentStore.city}, ${currentStore.state}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Membro desde</h4>
                    <p className="text-gray-600 text-sm">
                      {new Date(currentStore.createdAt).toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Contact Buttons */}
                <div className="mt-6 space-y-3">
                  {/* WhatsApp - prioridade 1: whatsapp dedicado, fallback: phone */}
                  {(currentStore.whatsapp || currentStore.phone) && (
                    <a
                      href={`https://wa.me/${(currentStore.whatsapp || currentStore.phone).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {currentStore.email && (
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(currentStore.email!);
                          toast.success("E-mail copiado!", {
                            description: currentStore.email,
                            action: {
                              label: "Abrir",
                              onClick: () => window.location.href = `mailto:${currentStore.email}`,
                            },
                          });
                        } catch {
                          // Fallback: abre mailto diretamente
                          window.location.href = `mailto:${currentStore.email}`;
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Mail className="h-5 w-5" />
                      <span>Enviar E-mail</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="bg-white rounded-2xl shadow-lg mb-8">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: "products", name: "Produtos", count: storeProducts.length || currentStore.productCount || 0 },
                      { id: "about", name: "Sobre" },
                      { id: "reviews", name: "Avaliações", count: currentStore.reviewCount || 0 },
                      { id: "policies", name: "Políticas" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === tab.id
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {tab.name}{" "}
                        {tab.count !== undefined && (
                          <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {/* Products Tab */}
                  {activeTab === "products" && (
                    <div>
                      {/* Filters */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
                        <div className="flex items-center space-x-4">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={productsLoading}
                          >
                            <option value="popular">Mais Popular</option>
                            <option value="price-low">Menor Preço</option>
                            <option value="price-high">Maior Preço</option>
                            <option value="rating">Melhor Avaliação</option>
                            <option value="name">Nome A-Z</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-lg transition-colors ${
                              viewMode === "grid" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"
                            }`}
                            disabled={productsLoading}
                          >
                            <Grid className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-lg transition-colors ${
                              viewMode === "list" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"
                            }`}
                            disabled={productsLoading}
                          >
                            <List className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Products Loading State */}
                      {productsLoading && (
                        <div className="flex justify-center items-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          <span className="ml-3 text-gray-600">Carregando produtos...</span>
                        </div>
                      )}

                      {/* Products Error State */}
                      {productsError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                          <div className="flex items-center space-x-3">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                            <div>
                              <h3 className="text-red-800 font-medium">Erro ao carregar produtos</h3>
                              <p className="text-red-600 text-sm mt-1">{productsError}</p>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  setProductsLoading(true);
                                  setProductsError(null);
                                  // 🔒 SECURITY FIX (Bug #9): Usar currentStore.id ao invés de params.id (que não existe)
                                  const products = await getProductsByStore(currentStore?.id);
                                  setStoreProducts(products);
                                } catch (error) {
                                  setProductsError(
                                    error instanceof Error ? error.message : "Erro ao carregar produtos"
                                  );
                                } finally {
                                  setProductsLoading(false);
                                }
                              }}
                              className="ml-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Tentar novamente
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Products Grid */}
                      {!productsLoading && !productsError && (
                        <>
                          <div
                            className={
                              viewMode === "grid"
                                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                : "space-y-4"
                            }
                          >
                            {filteredProducts.map((product) => (
                              <div
                                key={product.id}
                                className={`bg-gray-50 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 ${
                                  viewMode === "list" ? "flex" : ""
                                }`}
                              >
                                <div
                                  className={`${viewMode === "list" ? "w-32 flex-shrink-0" : ""} cursor-pointer`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    // ✅ FIX: Mapear ProductImage objects para URLs strings
                                    const images = product.images?.map(img => img.url) || [];
                                    if (images.length > 0) {
                                      setSelectedProductImages(images);
                                      setSelectedProductName(product.name);
                                      setGalleryOpen(true);
                                    }
                                  }}
                                  title="Clique para ver imagens"
                                >
                                  <img
                                    src={product.images?.[0]?.url || PRODUCT_PLACEHOLDER}
                                    alt={product.images?.[0]?.alt || product.name}
                                    className={`w-full object-cover ${viewMode === "list" ? "h-full" : "h-48"}`}
                                  />
                                </div>

                                <Link to={`/produto/${product.id}`} className="p-4 flex-1 block">
                                  <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h4>

                                    <div className="flex items-center space-x-2 mb-2">
                                      <div className="flex items-center space-x-1">
                                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                        <span className="text-sm font-medium">
                                          {product.averageRating?.toFixed(1) || "0.0"}
                                        </span>
                                        <span className="text-sm text-gray-500">({product.reviewCount || 0})</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="text-lg font-bold text-blue-600">
                                            R$ {product.price.toFixed(2)}
                                          </span>
                                          {product.originalPrice && product.originalPrice > product.price && (
                                            <span className="text-sm text-gray-500 line-through">
                                              R$ {product.originalPrice.toFixed(2)}
                                            </span>
                                          )}
                                        </div>
                                        <span
                                          className={`text-xs ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}
                                        >
                                          {product.stock > 0 ? `${product.stock} em estoque` : "Fora de estoque"}
                                        </span>
                                      </div>

                                      <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                        <Heart className="h-5 w-5" />
                                      </button>
                                    </div>
                                </Link>
                              </div>
                            ))}
                          </div>

                          {filteredProducts.length === 0 && storeProducts.length > 0 && (
                            <div className="text-center py-12">
                              <p className="text-gray-500">Nenhum produto encontrado com os filtros aplicados.</p>
                            </div>
                          )}

                          {storeProducts.length === 0 && (
                            <div className="text-center py-12">
                              <p className="text-gray-500">Esta loja ainda não possui produtos cadastrados.</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* About Tab */}
                  {activeTab === "about" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sobre a Loja</h3>
                        <p className="text-gray-700 leading-relaxed">
                          {currentStore.description || "Nenhuma descrição disponível para esta loja."}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Informações da Loja</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <MapPin className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="font-medium text-gray-900">Localização</p>
                                <p className="text-gray-600">
                                  {currentStore.city && currentStore.state
                                    ? `${currentStore.city}, ${currentStore.state}`
                                    : "Localização não informada"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Calendar className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="font-medium text-gray-900">Membro desde</p>
                                <p className="text-gray-600">
                                  {currentStore.createdAt
                                    ? new Date(currentStore.createdAt).toLocaleDateString("pt-BR", {
                                        year: "numeric",
                                        month: "long",
                                      })
                                    : "Data não disponível"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Package className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="font-medium text-gray-900">Total de Produtos</p>
                                <p className="text-gray-600">
                                  {storeProducts.length || currentStore.productCount || 0} produtos
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Star className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="font-medium text-gray-900">Avaliação</p>
                                <p className="text-gray-600">
                                  {currentStore.rating?.toFixed(1) || "0.0"} ({currentStore.reviewCount || 0}{" "}
                                  avaliações)
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reviews Tab */}
                  {activeTab === "reviews" && (
                    <div>
                      {/* Reviews Loading */}
                      {reviewsLoading && (
                        <div className="flex justify-center items-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          <span className="ml-3 text-gray-600">Carregando avaliações...</span>
                        </div>
                      )}

                      {/* Reviews Error */}
                      {reviewsError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                          <div className="flex items-center space-x-3">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                            <div>
                              <h3 className="text-red-800 font-medium">Erro ao carregar avaliações</h3>
                              <p className="text-red-600 text-sm mt-1">{reviewsError}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reviews Stats Summary */}
                      {!reviewsLoading && !reviewsError && storeReviews.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-6 mb-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="text-center">
                                <div className="text-4xl font-bold text-blue-600">{reviewsStats.average.toFixed(1)}</div>
                                <div className="flex items-center justify-center mt-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= Math.round(reviewsStats.average)
                                          ? "text-yellow-400 fill-current"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="border-l border-blue-200 pl-4">
                                <div className="text-sm text-gray-600">Total de avaliações</div>
                                <div className="text-2xl font-semibold text-gray-900">{reviewsStats.total}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reviews List */}
                      {!reviewsLoading && !reviewsError && storeReviews.length > 0 && (
                        <div className="space-y-4">
                          {storeReviews.map((review) => (
                            <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                    {review.userAvatar ? (
                                      <img src={review.userAvatar} alt={review.userName} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      review.userName?.charAt(0)?.toUpperCase() || "U"
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{review.userName}</div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(review.createdAt).toLocaleDateString("pt-BR", {
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                      })}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>

                              {/* Product Reference */}
                              <Link
                                to={`/produto/${review.productId}`}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-2"
                              >
                                <Package className="h-3 w-3" />
                                {review.productName}
                              </Link>

                              {review.title && (
                                <h4 className="font-semibold text-gray-900 mb-1">{review.title}</h4>
                              )}
                              {review.comment && (
                                <p className="text-gray-600 text-sm">{review.comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Empty State */}
                      {!reviewsLoading && !reviewsError && storeReviews.length === 0 && (
                        <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
                          <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma avaliação ainda</h3>
                          <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Esta loja ainda não possui avaliações. Seja o primeiro a avaliar um produto!
                          </p>
                          <button
                            onClick={() => setActiveTab("products")}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Package className="h-5 w-5" />
                            Ver Produtos
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Policies Tab */}
                  {activeTab === "policies" && (
                    <div className="space-y-6">
                      {/* Política de Devolução */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Política de Devolução</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {currentStore.policies?.returnPolicy ||
                            "Política de devolução não informada. Entre em contato com a loja para mais informações."}
                        </p>
                      </div>

                      {/* Termos de Uso */}
                      {currentStore.policies?.terms && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Termos de Uso</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{currentStore.policies.terms}</p>
                        </div>
                      )}

                      {/* Política de Privacidade */}
                      {currentStore.policies?.privacyPolicy && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Política de Privacidade</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{currentStore.policies.privacyPolicy}</p>
                        </div>
                      )}

                      {/* Mensagem se nenhuma política foi configurada */}
                      {!currentStore.policies?.returnPolicy &&
                        !currentStore.policies?.terms &&
                        !currentStore.policies?.privacyPolicy && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">
                              Esta loja ainda não configurou suas políticas. Entre em contato diretamente com o
                              vendedor para mais informações.
                            </p>
                          </div>
                        )}

                      {/* Seção "Entrega" removida: Sistema WhatsApp-only (entrega acordada via WhatsApp) */}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={selectedProductImages}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        productName={selectedProductName}
      />
    </div>
  );
}
