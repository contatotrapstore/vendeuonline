import { create } from "zustand";

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingPeriod: "MONTHLY" | "YEARLY";
  maxAds: number;
  maxPhotos: number;
  features: string[];
  popular?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subscriptions: number;
  };
}

interface PlanStore {
  plans: Plan[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchPlans: () => Promise<void>;
  createPlan: (planData: Omit<Plan, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updatePlan: (id: number, planData: Partial<Plan>) => Promise<void>;
  deletePlan: (id: number) => Promise<void>;
  clearError: () => void;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plans: [],
  loading: false,
  error: null,

  fetchPlans: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch("/api/admin/plans", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar planos");
      }

      const data = await response.json();
      set({ plans: data.data || [], loading: false });
    } catch (error: any) {
      console.error("Erro ao buscar planos:", error);
      set({
        plans: [],
        error: error.message || "Erro ao carregar planos",
        loading: false,
      });
    }
  },

  createPlan: async (planData: Omit<Plan, "id" | "createdAt" | "updatedAt">) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch("/api/admin/plans", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar plano");
      }

      const data = await response.json();
      const { plans } = get();
      set({
        plans: [...plans, data.data],
        loading: false,
      });
    } catch (error: any) {
      console.error("Erro ao criar plano:", error);
      set({
        error: error.message || "Erro ao criar plano",
        loading: false,
      });
    }
  },

  updatePlan: async (id: number, planData: Partial<Plan>) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/plans/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar plano");
      }

      const data = await response.json();
      const { plans } = get();
      const updatedPlans = plans.map((plan) => (plan.id === id ? { ...plan, ...data.data } : plan));

      set({
        plans: updatedPlans,
        loading: false,
      });
    } catch (error: any) {
      console.error("Erro ao atualizar plano:", error);
      set({
        error: error.message || "Erro ao atualizar plano",
        loading: false,
      });
    }
  },

  deletePlan: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/plans/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir plano");
      }

      const { plans } = get();
      const updatedPlans = plans.filter((plan) => plan.id !== id);

      set({
        plans: updatedPlans,
        loading: false,
      });
    } catch (error: any) {
      console.error("Erro ao excluir plano:", error);
      set({
        error: error.message || "Erro ao excluir plano",
        loading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
