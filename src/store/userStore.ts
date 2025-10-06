import { create } from "zustand";
import { logger } from "@/lib/logger";
import { buildApiUrl } from "@/config/api";


export interface User {
  id: string;
  name: string;
  email: string;
  userType: "buyer" | "seller" | "admin";
  status: "active" | "inactive" | "pending";
  createdAt: string;
  lastLogin?: string;
  storeCount?: number;
  orderCount?: number;
}

interface UserFilters {
  search: string;
  status: string;
  userType: string;
}

interface UserStore {
  users: User[];
  loading: boolean;
  error: string | null;
  filters: UserFilters;

  // Actions
  fetchUsers: () => Promise<void>;
  updateUserStatus: (userId: string, status: "active" | "inactive") => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  setFilters: (filters: Partial<UserFilters>) => void;
  clearError: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  loading: false,
  error: null,
  filters: {
    search: "",
    status: "all",
    userType: "all",
  },

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(buildApiUrl("/api/admin/users"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar usuários");
      }

      const data = await response.json();
      
      // Mapear dados para o formato esperado pelo frontend
      const mappedUsers = (data.data || []).map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.type?.toLowerCase() || "buyer", // Mapear BUYER -> buyer
        status: "active", // Assumir ativo por padrão, pode ajustar conforme o schema
        createdAt: user.createdAt,
        lastLogin: null, // Campo não existe no backend atual
        storeCount: 0, // Pode ser calculado se necessário
        orderCount: 0, // Pode ser calculado se necessário
      }));
      
      set({ users: mappedUsers, loading: false });
    } catch (error: any) {
      logger.error("Erro ao buscar usuários:", error);
      set({
        users: [],
        error: error.message || "Erro ao carregar usuários",
        loading: false,
      });
    }
  },

  updateUserStatus: async (userId: string, status: "active" | "inactive") => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(buildApiUrl(`/api/admin/users/${userId}/status`), {
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
      const { users } = get();
      const updatedUsers = users.map((user) => (user.id === userId ? { ...user, status } : user));

      set({ users: updatedUsers, loading: false });
    } catch (error: any) {
      logger.error("Erro ao atualizar status do usuário:", error);
      set({
        error: error.message || "Erro ao atualizar status do usuário",
        loading: false,
      });
    }
  },

  deleteUser: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(buildApiUrl(`/api/admin/users/${userId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir usuário");
      }

      // Remover localmente
      const { users } = get();
      const updatedUsers = users.filter((user) => user.id !== userId);

      set({ users: updatedUsers, loading: false });
    } catch (error: any) {
      logger.error("Erro ao excluir usuário:", error);
      set({
        error: error.message || "Erro ao excluir usuário",
        loading: false,
      });
    }
  },

  setFilters: (newFilters: Partial<UserFilters>) => {
    const { filters } = get();
    set({ filters: { ...filters, ...newFilters } });
  },

  clearError: () => {
    set({ error: null });
  },
}));
