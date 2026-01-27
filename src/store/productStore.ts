import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/types";
import { apiRequest, get as apiGet, post, put, del } from "@/lib/api-client";
import { appCache } from "@/lib/cache";
import { logger } from "@/lib/logger";


export interface ProductFilters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  brands: string[];
  conditions: string[];
  minRating: number;
  location: string;
  sortBy: "relevance" | "price_asc" | "price_desc" | "rating" | "newest" | "popular";
}

interface ProductStore {
  products: Product[];
  filteredProducts: Product[];
  filters: ProductFilters;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // Actions
  fetchProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    sellerId?: string;
  }) => Promise<void>;
  fetchSellerProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    forceRefresh?: boolean;
  }) => Promise<void>;
  fetchProductById: (id: string) => Promise<Product | null>;
  createProduct: (product: {
    name: string;
    description: string;
    price: number;
    categoryId: string;
    brand: string;
    model?: string;
    condition: "new" | "used" | "refurbished";
    stock: number;
    minStock: number;
    weight?: number;
    dimensions?: { length: number; width: number; height: number; unit: "cm" | "m" };
    isFeatured?: boolean;
    shippingOptions?: string[];
    images: { id: string; url: string; alt: string; isMain: boolean; order: number }[];
    specifications: { name: string; value: string }[];
  }) => Promise<void>;
  updateProduct: (
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      price: number;
      categoryId: string;
      brand: string;
      model?: string;
      condition: "new" | "used" | "refurbished";
      stock: number;
      minStock: number;
      weight?: number;
      dimensions?: { length: number; width: number; height: number; unit: "cm" | "m" };
      isFeatured?: boolean;
      isActive?: boolean;
      shippingOptions?: string[];
      images: { id: string; url: string; alt: string; isMain: boolean; order: number }[];
      specifications: { name: string; value: string }[];
    }>
  ) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  clearProducts: () => void; // 🔒 SECURITY FIX (Bug #6): Clear all products on logout
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  getProductsByStore: (storeId: string) => Promise<Product[]>;
  getFeaturedProducts: () => Promise<Product[]>;
  getRelatedProducts: (productId: string, limit?: number) => Promise<Product[]>;
}

// Estado inicial da paginação
const initialPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

// Filtros padrão
const defaultFilters: ProductFilters = {
  search: "",
  category: "",
  minPrice: 0,
  maxPrice: 0,
  brands: [],
  conditions: [],
  minRating: 0,
  location: "",
  sortBy: "relevance",
};

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [],
      filteredProducts: [],
      filters: defaultFilters,
      loading: false,
      error: null,
      isEmpty: false,
      pagination: initialPagination,

  fetchProducts: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      // Verificar cache primeiro
      const cachedData = appCache.getProducts(params);
      if (cachedData) {
        set({
          products: cachedData.products || [],
          filteredProducts: cachedData.products || [],
          isEmpty: !cachedData.products || cachedData.products.length === 0,
          pagination: cachedData.pagination || {
            page: params.page || 1,
            limit: params.limit || 20,
            total: cachedData.products?.length || 0,
            totalPages: Math.ceil((cachedData.products?.length || 0) / (params.limit || 20)),
            hasNext: false,
            hasPrev: false,
          },
          loading: false,
        });
        return;
      }

      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.search) searchParams.append("search", params.search);
      if (params.category) searchParams.append("category", params.category);
      if (params.minPrice) searchParams.append("minPrice", params.minPrice.toString());
      if (params.maxPrice) searchParams.append("maxPrice", params.maxPrice.toString());
      if (params.sortBy) searchParams.append("sortBy", params.sortBy);
      if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);
      if (params.sellerId) searchParams.append("sellerId", params.sellerId);

      const response = await apiGet(`/api/products?${searchParams.toString()}`);

      // Armazenar no cache
      appCache.setProducts(params, response, 30 * 1000); // 30 segundos (reduzido de 3 min para ver produtos aprovados rapidamente)

      set({
        products: response.products || [],
        filteredProducts: response.products || [],
        isEmpty: !response.products || response.products.length === 0,
        pagination: {
          page: response.pagination?.page || 1,
          limit: response.pagination?.limit || 20,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0,
          hasNext: response.pagination?.hasNext || false,
          hasPrev: response.pagination?.hasPrev || false,
        },
        loading: false,
      });
    } catch (error) {
      // Se for erro 404 ou similar, tratar como lista vazia em vez de erro
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar produtos";
      const isNotFoundError = errorMessage.includes("404") || errorMessage.includes("não encontrado");

      if (isNotFoundError) {
        set({
          products: [],
          filteredProducts: [],
          isEmpty: true,
          loading: false,
          error: null,
        });
      } else {
        set({
          error: errorMessage,
          loading: false,
        });
      }
    }
  },

  fetchSellerProducts: async (params = {}) => {
    try {
      // 🔒 SECURITY FIX (Bug #10): Clear products array BEFORE loading to prevent showing other sellers' products during loading
      set({ products: [], filteredProducts: [], loading: true, error: null, isEmpty: false });

      // 🔒 SECURITY FIX (Bug #6): Get current seller ID for cache isolation
      const { user } = (await import("./authStore")).useAuthStore.getState();
      const sellerId = user?.seller?.id || user?.id; // Fallback to userId if no seller relation

      // 🔒 SECURITY FIX (Bug #6): Check seller-specific cache first
      const { forceRefresh, ...restParams } = params as typeof params & { forceRefresh?: boolean };
      const cachedData = appCache.getSellerProducts(sellerId, restParams);
      if (cachedData && !forceRefresh) {
        set({
          products: cachedData.data || [],
          filteredProducts: cachedData.data || [],
          isEmpty: !cachedData.data || cachedData.data.length === 0,
          pagination: cachedData.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          loading: false,
        });
        return;
      }

      const searchParams = new URLSearchParams();
      if (restParams.page) searchParams.append("page", restParams.page.toString());
      if (restParams.limit) searchParams.append("limit", restParams.limit.toString());
      if (restParams.search) searchParams.append("search", restParams.search);
      if (restParams.category) searchParams.append("category", restParams.category);
      if (restParams.status) searchParams.append("status", restParams.status);

      const response = await apiGet(`/api/seller/products?${searchParams.toString()}`);

      // 🔒 SECURITY FIX (Bug #6): Cache with seller-specific key
      appCache.setSellerProducts(sellerId, restParams, response, 30 * 1000);

      set({
        products: response.data || [],
        filteredProducts: response.data || [],
        isEmpty: !response.data || response.data.length === 0,
        pagination: {
          page: response.pagination?.page || 1,
          limit: response.pagination?.limit || 10,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0,
          hasNext: response.pagination?.hasNext || false,
          hasPrev: response.pagination?.hasPrev || false,
        },
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar produtos do seller";
      const isNotFoundError = errorMessage.includes("404") || errorMessage.includes("não encontrado");

      if (isNotFoundError) {
        set({
          products: [],
          filteredProducts: [],
          isEmpty: true,
          loading: false,
          error: null,
        });
      } else {
        set({
          error: errorMessage,
          loading: false,
        });
      }
    }
  },

  fetchProductById: async (id) => {
    try {
      set({ loading: true, error: null });
      const product = await apiGet(`/api/products/${id}`);
      set({ loading: false });
      return product;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro ao carregar produto",
        loading: false,
      });
      return null;
    }
  },

  createProduct: async (productData) => {
    try {
      set({ loading: true, error: null });

      await post("/api/products", productData);

      // Recarregar produtos após criação
      const { fetchProducts } = get();
      await fetchProducts();
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro ao criar produto",
        loading: false,
      });
      throw error;
    }
  },

  updateProduct: async (id, updates) => {
    try {
      set({ loading: true, error: null });

      await put(`/api/products/${id}`, updates);

      // ✅ FIX: Refetch do servidor ao invés de atualizar localmente
      // Garante sincronização com banco (especialmente para images/specifications)
      appCache.invalidateProduct(id);
      await Promise.allSettled([
        get().fetchSellerProducts({ forceRefresh: true }),
        get().fetchProducts(),
      ]);
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro ao atualizar produto",
        loading: false,
      });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    try {
      set({ loading: true, error: null });

      await del(`/api/products/${id}`);

      // Invalidar cache para forçar refetch em todas as páginas (homepage, etc)
      appCache.invalidateProduct(id);

      // Refetch produtos do servidor após DELETE (backend faz soft delete, não remoção)
      await get().fetchSellerProducts();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erro ao deletar produto",
        loading: false,
      });
      throw error;
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    // Com APIs reais, os filtros são aplicados no servidor
    // Podemos chamar fetchProducts com os novos filtros
    const { filters } = get();
    const updatedFilters = { ...filters, ...newFilters };
    get().fetchProducts({
      search: updatedFilters.search,
      category: updatedFilters.category,
      minPrice: updatedFilters.minPrice > 0 ? updatedFilters.minPrice : undefined,
      maxPrice: updatedFilters.maxPrice > 0 ? updatedFilters.maxPrice : undefined,
      sortBy: updatedFilters.sortBy !== "relevance" ? updatedFilters.sortBy : undefined,
    });
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().fetchProducts(); // Recarregar produtos sem filtros
  },

  applyFilters: () => {
    // Com APIs reais, os filtros são aplicados no servidor
    // Esta função agora apenas chama fetchProducts com os filtros atuais
    const { filters } = get();
    get().fetchProducts({
      search: filters.search,
      category: filters.category,
      minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
      maxPrice: filters.maxPrice > 0 ? filters.maxPrice : undefined,
      sortBy: filters.sortBy !== "relevance" ? filters.sortBy : undefined,
    });
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // 🔒 SECURITY FIX (Bug #6): Clear all products on logout
  clearProducts: () => {
    set({
      products: [],
      filteredProducts: [],
      selectedProduct: null,
      loading: false,
      error: null,
      isEmpty: true,
      pagination: initialPagination,
    });
  },

  getProductsByStore: async (storeId) => {
    try {
      // 🔒 SECURITY FIX (Bug #9): Usar rota específica de store para evitar vazamento de dados
      // A rota /api/stores/:id/products filtra corretamente por storeId no backend
      const response = await apiGet(`/api/stores/${storeId}/products`);
      return response.products || response.data || [];
    } catch (error) {
      logger.error("Erro ao carregar produtos da loja:", error);
      return [];
    }
  },

  getFeaturedProducts: async () => {
    try {
      const response = await apiGet("/api/products?featured=true&limit=8");
      return response.products;
    } catch (error) {
      logger.error("Erro ao carregar produtos em destaque:", error);
      return [];
    }
  },

  getRelatedProducts: async (productId, limit = 4) => {
    try {
      const response = await apiGet(`/api/products/${productId}/related?limit=${limit}`);
      return response.products;
    } catch (error) {
      logger.error("Erro ao carregar produtos relacionados:", error);
      return [];
    }
  },
    }),
    {
      name: "product-storage",
      partialize: (state) => ({
        products: state.products,
        filteredProducts: state.filteredProducts,
        pagination: state.pagination,
        filters: state.filters,
      }),
    }
  )
);

export default useProductStore;
