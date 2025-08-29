import { create } from 'zustand'
import { Product } from '@/types';
import { apiRequest, get, post, put, del } from '@/lib/api-client';
import { appCache } from '@/lib/cache';



export interface ProductFilters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  brands: string[];
  conditions: string[];
  freeShippingOnly: boolean;
  minRating: number;
  location: string;
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
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
    sortOrder?: 'asc' | 'desc';
  }) => Promise<void>;
  fetchProductById: (id: string) => Promise<Product | null>;
  createProduct: (product: {
    name: string;
    description: string;
    price: number;
    categoryId: string;
    brand: string;
    condition: 'new' | 'used' | 'refurbished';
    stock: number;
    minStock: number;
    weight?: number;
    dimensions?: { length: number; width: number; height: number; unit: 'cm' | 'm' };
    isFeatured?: boolean;
    images: { id: string; url: string; alt: string; isMain: boolean; order: number }[];
    specifications: { name: string; value: string }[];
  }) => Promise<void>;
  updateProduct: (id: string, updates: Partial<{
    name: string;
    description: string;
    price: number;
    categoryId: string;
    brand: string;
    condition: 'new' | 'used' | 'refurbished';
    stock: number;
    minStock: number;
    weight?: number;
    dimensions?: { length: number; width: number; height: number; unit: 'cm' | 'm' };
    isFeatured?: boolean;
    isActive?: boolean;
    images: { id: string; url: string; alt: string; isMain: boolean; order: number }[];
    specifications: { name: string; value: string }[];
  }>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
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
  search: '',
  category: '',
  minPrice: 0,
  maxPrice: 0,
  brands: [],
  conditions: [],
  freeShippingOnly: false,
  minRating: 0,
  location: '',
  sortBy: 'relevance'
};

export const useProductStore = create<ProductStore>((set, get) => ({
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
            hasPrev: false
          },
          loading: false 
        });
        return;
      }
      
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.category) searchParams.append('category', params.category);
      if (params.minPrice) searchParams.append('minPrice', params.minPrice.toString());
      if (params.maxPrice) searchParams.append('maxPrice', params.maxPrice.toString());
      if (params.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
      
      const response = await get(`/products?${searchParams.toString()}`);
      
      // Armazenar no cache
      appCache.setProducts(params, response, 3 * 60 * 1000); // 3 minutos para produtos
      
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
        loading: false 
      });
    } catch (error) {
      // Se for erro 404 ou similar, tratar como lista vazia em vez de erro
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar produtos';
      const isNotFoundError = errorMessage.includes('404') || errorMessage.includes('não encontrado');
      
      if (isNotFoundError) {
        set({ 
          products: [],
          filteredProducts: [],
          isEmpty: true,
          loading: false,
          error: null
        });
      } else {
        set({ 
          error: errorMessage,
          loading: false 
        });
      }
    }
  },
  
  fetchProductById: async (id) => {
    try {
      set({ loading: true, error: null });
      const product = await get(`/products/${id}`);
      set({ loading: false });
      return product;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao carregar produto',
        loading: false 
      });
      return null;
    }
  },
  
  createProduct: async (productData) => {
    try {
      set({ loading: true, error: null });
      
      await post('/products', productData);
      
      // Recarregar produtos após criação
      await get().fetchProducts();
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao criar produto',
        loading: false 
      });
      throw error;
    }
  },
  
  updateProduct: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      
      await put(`/products/${id}`, updates);
      
      // Atualizar produto na lista local
      const products = get().products.map(product => 
        product.id === id ? { ...product, ...updates } : product
      );
      set({ products, filteredProducts: products, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao atualizar produto',
        loading: false 
      });
      throw error;
    }
  },
  
  deleteProduct: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await del(`/products/${id}`);
      
      // Remover produto da lista local
      const products = get().products.filter(product => product.id !== id);
      set({ products, filteredProducts: products, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao deletar produto',
        loading: false 
      });
      throw error;
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
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
      sortBy: updatedFilters.sortBy !== 'relevance' ? updatedFilters.sortBy : undefined,
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
      sortBy: filters.sortBy !== 'relevance' ? filters.sortBy : undefined,
    });
  },

  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  getProductsByStore: async (storeId) => {
    try {
      const response = await get(`/products?storeId=${storeId}`);
      return response.products;
    } catch (error) {
      console.error('Erro ao carregar produtos da loja:', error);
      return [];
    }
  },

  getFeaturedProducts: async () => {
    try {
      const response = await get('/api/products?featured=true&limit=8');
      return response.products;
    } catch (error) {
      console.error('Erro ao carregar produtos em destaque:', error);
      return [];
    }
  },

  getRelatedProducts: async (productId, limit = 4) => {
    try {
      const response = await get(`/products/${productId}/related?limit=${limit}`);
      return response.products;
    } catch (error) {
      console.error('Erro ao carregar produtos relacionados:', error);
      return [];
    }
  }
}));

export default useProductStore;