import { create } from "zustand";
import { logger } from "@/lib/logger";


export interface Subscription {
  id: string;
  userId: string;
  planId: number;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED" | "PENDING";
  startDate: string;
  endDate: string;
  renewalDate?: string;
  paymentStatus: "PAID" | "PENDING" | "FAILED";
  amount: number;
  createdAt: string;
  updatedAt: string;

  // Relations
  user?: {
    id: string;
    name: string;
    email: string;
  };
  plan?: {
    id: number;
    name: string;
    price: number;
    billingPeriod: string;
  };
}

interface SubscriptionFilters {
  search: string;
  status: string;
  planId: string;
  paymentStatus: string;
}

interface SubscriptionStore {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  filters: SubscriptionFilters;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
  };

  // Actions
  fetchSubscriptions: (page?: number) => Promise<void>;
  updateSubscriptionStatus: (subscriptionId: string, status: Subscription["status"]) => Promise<void>;
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  renewSubscription: (subscriptionId: string) => Promise<void>;
  setFilters: (filters: Partial<SubscriptionFilters>) => void;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  subscriptions: [],
  loading: false,
  error: null,
  filters: {
    search: "",
    status: "all",
    planId: "all",
    paymentStatus: "all",
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 20,
  },

  fetchSubscriptions: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
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
      if (filters.planId !== "all") params.append("planId", filters.planId);
      if (filters.paymentStatus !== "all") params.append("paymentStatus", filters.paymentStatus);

      const response = await fetch(`/api/admin/subscriptions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar assinaturas");
      }

      const data = await response.json();
      set({
        subscriptions: data.data || [],
        pagination: {
          currentPage: data.pagination?.page || 1,
          totalPages: data.pagination?.totalPages || 1,
          totalCount: data.pagination?.total || 0,
          pageSize: data.pagination?.limit || 20,
        },
        loading: false,
      });
    } catch (error: any) {
      logger.error("Erro ao buscar assinaturas:", error);
      set({
        subscriptions: [],
        error: error.message || "Erro ao carregar assinaturas",
        loading: false,
      });
    }
  },

  updateSubscriptionStatus: async (subscriptionId: string, status: Subscription["status"]) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar status");
      }

      // Atualizar localmente
      const { subscriptions } = get();
      const updatedSubscriptions = subscriptions.map((sub) => (sub.id === subscriptionId ? { ...sub, status } : sub));

      set({ subscriptions: updatedSubscriptions, loading: false });
    } catch (error: any) {
      logger.error("Erro ao atualizar status da assinatura:", error);
      set({
        error: error.message || "Erro ao atualizar status",
        loading: false,
      });
    }
  },

  cancelSubscription: async (subscriptionId: string) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao cancelar assinatura");
      }

      // Atualizar localmente
      const { subscriptions } = get();
      const updatedSubscriptions = subscriptions.map((sub) =>
        sub.id === subscriptionId ? { ...sub, status: "CANCELLED" as const } : sub
      );

      set({ subscriptions: updatedSubscriptions, loading: false });
    } catch (error: any) {
      logger.error("Erro ao cancelar assinatura:", error);
      set({
        error: error.message || "Erro ao cancelar assinatura",
        loading: false,
      });
    }
  },

  renewSubscription: async (subscriptionId: string) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/renew`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao renovar assinatura");
      }

      const data = await response.json();

      // Atualizar localmente
      const { subscriptions } = get();
      const updatedSubscriptions = subscriptions.map((sub) =>
        sub.id === subscriptionId ? { ...sub, ...data.data } : sub
      );

      set({ subscriptions: updatedSubscriptions, loading: false });
    } catch (error: any) {
      logger.error("Erro ao renovar assinatura:", error);
      set({
        error: error.message || "Erro ao renovar assinatura",
        loading: false,
      });
    }
  },

  setFilters: (newFilters: Partial<SubscriptionFilters>) => {
    const { filters } = get();
    set({ filters: { ...filters, ...newFilters } });

    // Recarregar dados com novos filtros
    get().fetchSubscriptions(1);
  },

  clearError: () => {
    set({ error: null });
  },
}));
