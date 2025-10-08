import { create } from "zustand";
import { buildApiUrl, getHeaders } from "@/config/api";
import { logger } from "@/lib/logger";
import { getAuthToken } from "@/config/storage-keys";


// Função para mapear approval_status do backend para status do frontend
const mapApprovalStatusToFrontend = (approvalStatus: string) => {
  const mapping: Record<string, "ACTIVE" | "PENDING" | "SUSPENDED" | "REJECTED"> = {
    approved: "ACTIVE",
    pending: "PENDING", 
    suspended: "SUSPENDED",
    rejected: "REJECTED",
  };
  return mapping[approvalStatus] || "PENDING";
};

export interface StoreInfo {
  id: string;
  name: string;
  description: string;
  logo?: string;
  banner?: string;
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "REJECTED";
  category?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  user?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    products: number;
    orders: number;
  };
}

interface StoreFilters {
  search: string;
  status: string;
  category: string;
}

interface StoreManagementStore {
  stores: StoreInfo[];
  loading: boolean;
  error: string | null;
  filters: StoreFilters;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
  };

  // Actions
  fetchStores: (page?: number) => Promise<void>;
  approveStore: (storeId: string) => Promise<void>;
  rejectStore: (storeId: string, reason?: string) => Promise<void>;
  suspendStore: (storeId: string, reason?: string) => Promise<void>;
  activateStore: (storeId: string) => Promise<void>;
  updateStore: (storeId: string, data: Partial<StoreInfo>) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  setFilters: (filters: Partial<StoreFilters>) => void;
  clearError: () => void;
}

export const useStoreManagementStore = create<StoreManagementStore>((set, get) => ({
  stores: [],
  loading: false,
  error: null,
  filters: {
    search: "",
    status: "all",
    category: "all",
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 20,
  },

  fetchStores: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const authHeaders = getHeaders();
      if (!authHeaders.Authorization) {
        throw new Error("Token não encontrado");
      }

      const { filters } = get();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      // Adicionar filtros se especificados
      if (filters.search) params.append("search", filters.search);
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.category !== "all") params.append("category", filters.category);

      const response = await fetch(buildApiUrl(`/api/admin/stores?${params.toString()}`), {
        headers: getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar lojas");
      }

      const data = await response.json();
      
      // Mapear dados para o formato esperado pelo frontend
      const mappedStores = (data.data || []).map((store: any) => ({
        ...store,
        status: mapApprovalStatusToFrontend(store.approval_status),
        _count: {
          products: store.productCount || 0,
          orders: 0
        },
        user: null // Não temos relação user nas stores
      }));
      
      set({
        stores: mappedStores,
        pagination: {
          currentPage: data.pagination?.page || 1,
          totalPages: data.pagination?.totalPages || 1,
          totalCount: data.pagination?.total || 0,
          pageSize: data.pagination?.limit || 20,
        },
        loading: false,
      });
    } catch (error: any) {
      logger.error("Erro ao buscar lojas:", error);
      set({
        stores: [],
        error: error.message || "Erro ao carregar lojas",
        loading: false,
      });
    }
  },

  approveStore: async (storeId: string) => {
    set({ loading: true, error: null });
    try {
      const authHeaders = getHeaders();
      if (!authHeaders.Authorization) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(buildApiUrl(`/api/admin/stores/${storeId}/approve`), {
        method: "POST",
        headers: authHeaders,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao aprovar loja");
      }

      // Atualizar localmente
      const { stores } = get();
      const updatedStores = stores.map((store) =>
        store.id === storeId ? { ...store, status: "ACTIVE" as const } : store
      );

      set({ stores: updatedStores, loading: false });
    } catch (error: any) {
      logger.error("Erro ao aprovar loja:", error);
      set({
        error: error.message || "Erro ao aprovar loja",
        loading: false,
      });
    }
  },

  rejectStore: async (storeId: string, reason?: string) => {
    set({ loading: true, error: null });
    try {
      const authHeaders = getHeaders();
      if (!authHeaders.Authorization) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(buildApiUrl(`/api/admin/stores/${storeId}/reject`), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao rejeitar loja");
      }

      // Atualizar localmente
      const { stores } = get();
      const updatedStores = stores.map((store) =>
        store.id === storeId ? { ...store, status: "REJECTED" as const } : store
      );

      set({ stores: updatedStores, loading: false });
    } catch (error: any) {
      logger.error("Erro ao rejeitar loja:", error);
      set({
        error: error.message || "Erro ao rejeitar loja",
        loading: false,
      });
    }
  },

  suspendStore: async (storeId: string, reason?: string) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/stores/${storeId}/suspend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao suspender loja");
      }

      // Atualizar localmente
      const { stores } = get();
      const updatedStores = stores.map((store) =>
        store.id === storeId ? { ...store, status: "SUSPENDED" as const } : store
      );

      set({ stores: updatedStores, loading: false });
    } catch (error: any) {
      logger.error("Erro ao suspender loja:", error);
      set({
        error: error.message || "Erro ao suspender loja",
        loading: false,
      });
    }
  },

  activateStore: async (storeId: string) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/stores/${storeId}/activate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao ativar loja");
      }

      // Atualizar localmente
      const { stores } = get();
      const updatedStores = stores.map((store) =>
        store.id === storeId ? { ...store, status: "ACTIVE" as const } : store
      );

      set({ stores: updatedStores, loading: false });
    } catch (error: any) {
      logger.error("Erro ao ativar loja:", error);
      set({
        error: error.message || "Erro ao ativar loja",
        loading: false,
      });
    }
  },

  updateStore: async (storeId: string, data: Partial<StoreInfo>) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar loja");
      }

      const responseData = await response.json();

      // Atualizar localmente
      const { stores } = get();
      const updatedStores = stores.map((store) => (store.id === storeId ? { ...store, ...responseData.data } : store));

      set({ stores: updatedStores, loading: false });
    } catch (error: any) {
      logger.error("Erro ao atualizar loja:", error);
      set({
        error: error.message || "Erro ao atualizar loja",
        loading: false,
      });
    }
  },

  deleteStore: async (storeId: string) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir loja");
      }

      // Remover localmente
      const { stores } = get();
      const updatedStores = stores.filter((store) => store.id !== storeId);

      set({ stores: updatedStores, loading: false });
    } catch (error: any) {
      logger.error("Erro ao excluir loja:", error);
      set({
        error: error.message || "Erro ao excluir loja",
        loading: false,
      });
    }
  },

  setFilters: (newFilters: Partial<StoreFilters>) => {
    const { filters } = get();
    set({ filters: { ...filters, ...newFilters } });

    // Recarregar dados com novos filtros
    get().fetchStores(1);
  },

  clearError: () => {
    set({ error: null });
  },
}));
