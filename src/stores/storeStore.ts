import { create } from 'zustand';
import { Store } from '@/types';

// Utilitário para gerenciar token no localStorage
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

// Utilitário para requisições HTTP autenticadas
async function apiRequest(url: string, options: RequestInit = {}) {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...Object.fromEntries(new Headers(options.headers || {}).entries())
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

interface StoreFilters {
  search?: string;
  category?: string;
  city?: string;
  isVerified?: boolean;
  isActive?: boolean;
  plan?: string;
}

interface StorePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface CreateStoreData {
  name: string;
  slug: string;
  description: string;
  category: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  logo?: string;
  banner?: string;
}

interface StoreState {
  stores: Store[];
  currentStore: Store | null;
  loading: boolean;
  error: string | null;
  filters: StoreFilters;
  pagination: StorePagination;
  
  // API functions
  fetchStores: (filters?: StoreFilters, page?: number, limit?: number) => Promise<void>;
  fetchStoreById: (id: string) => Promise<Store | null>;
  fetchStoreBySlug: (slug: string) => Promise<Store | null>;
  createStore: (data: CreateStoreData) => Promise<Store>;
  updateStore: (id: string, data: Partial<CreateStoreData>) => Promise<Store>;
  deleteStore: (id: string) => Promise<void>;
  
  // Local state management
  setCurrentStore: (store: Store | null) => void;
  setFilters: (filters: Partial<StoreFilters>) => void;
  resetFilters: () => void;
  clearError: () => void;
  
  // Convenience methods
  getStoresByCategory: (category: string) => Store[];
  getVerifiedStores: () => Store[];
  getFeaturedStores: () => Store[];
}

const defaultFilters: StoreFilters = {
  search: '',
  category: '',
  city: '',
  isVerified: undefined,
  isActive: undefined,
  plan: ''
};

export const useStoreStore = create<StoreState>((set, get) => ({
  stores: [],
  currentStore: null,
  loading: false,
  error: null,
  filters: defaultFilters,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  },

  fetchStores: async (filters = {}, page = 1, limit = 10) => {
    try {
      set({ loading: true, error: null });
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });
      
      const response = await apiRequest(`/api/stores?${queryParams}`);
      
      set({
        stores: response.stores,
        pagination: {
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
          hasNext: response.pagination.hasNext,
          hasPrev: response.pagination.hasPrev
        },
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao carregar lojas',
        loading: false
      });
      throw error;
    }
  },

  fetchStoreById: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const store = await apiRequest(`/api/stores/${id}`);
      
      set({ currentStore: store, loading: false });
      return store;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao carregar loja',
        loading: false
      });
      throw error;
    }
  },

  fetchStoreBySlug: async (slug: string) => {
    try {
      set({ loading: true, error: null });
      
      const store = await apiRequest(`/api/stores/slug/${slug}`);
      
      set({ currentStore: store, loading: false });
      return store;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao carregar loja',
        loading: false
      });
      throw error;
    }
  },

  createStore: async (data: CreateStoreData) => {
    try {
      set({ loading: true, error: null });
      
      const newStore = await apiRequest('/api/stores', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      set(state => ({
        stores: [...state.stores, newStore],
        loading: false
      }));
      
      return newStore;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao criar loja',
        loading: false
      });
      throw error;
    }
  },

  updateStore: async (id: string, data: Partial<CreateStoreData>) => {
    try {
      set({ loading: true, error: null });
      
      const updatedStore = await apiRequest(`/api/stores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      set(state => ({
        stores: state.stores.map(store => 
          store.id === id ? updatedStore : store
        ),
        currentStore: state.currentStore?.id === id ? updatedStore : state.currentStore,
        loading: false
      }));
      
      return updatedStore;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao atualizar loja',
        loading: false
      });
      throw error;
    }
  },

  deleteStore: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      await apiRequest(`/api/stores/${id}`, {
        method: 'DELETE',
      });
      
      set(state => ({
        stores: state.stores.filter(store => store.id !== id),
        currentStore: state.currentStore?.id === id ? null : state.currentStore,
        loading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao deletar loja',
        loading: false
      });
      throw error;
    }
  },

  setCurrentStore: (store: Store | null) => {
    set({ currentStore: store });
  },

  setFilters: (newFilters: Partial<StoreFilters>) => {
    const updatedFilters = { ...get().filters, ...newFilters };
    set({ filters: updatedFilters });
    get().fetchStores(updatedFilters, 1);
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().fetchStores(defaultFilters, 1);
  },

  clearError: () => {
    set({ error: null });
  },

  getStoresByCategory: (category: string) => {
    return get().stores.filter(store => store.category === category);
  },

  getVerifiedStores: () => {
    return get().stores.filter(store => store.isVerified);
  },

  getFeaturedStores: () => {
    return get().stores.filter(store => store.isVerified && store.rating >= 4.5).slice(0, 6);
  }
}));