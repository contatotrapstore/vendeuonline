import { create } from "zustand";
import { logger } from "@/lib/logger";
import { buildApiUrl } from "@/config/api";
import { getAuthToken } from "@/config/storage-keys";


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
  createUser: (userData: Partial<User> & { password: string }) => Promise<void>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<void>;
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
      const token = getAuthToken();
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
      // API retorna { users: [], total, pagination }
      const mappedUsers = (data.users || []).map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType?.toLowerCase() || "buyer", // Já vem em lowercase
        status: user.status || "active",
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || null,
        storeCount: user.storeCount || 0,
        orderCount: user.orderCount || 0,
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

  createUser: async (userData) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(buildApiUrl("/api/admin/users"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar usuário");
      }

      const responseData = await response.json();

      // Adicionar novo usuário à lista local
      const { users } = get();
      const newUser: User = {
        id: responseData.data.id,
        name: responseData.data.name,
        email: responseData.data.email,
        userType: responseData.data.type?.toLowerCase() || "buyer",
        status: (responseData.data.isVerified ? "active" : "pending") as "active" | "pending" | "inactive",
        createdAt: responseData.data.createdAt,
        lastLogin: null,
        storeCount: 0,
        orderCount: 0,
      };

      set({ users: [...users, newUser], loading: false });
    } catch (error: any) {
      logger.error("Erro ao criar usuário:", error);
      set({
        error: error.message || "Erro ao criar usuário",
        loading: false,
      });
      throw error;
    }
  },

  updateUser: async (userId, userData) => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(buildApiUrl(`/api/admin/users/${userId}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar usuário");
      }

      const responseData = await response.json();

      // Atualizar usuário localmente
      const { users } = get();
      const updatedUsers = users.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            name: responseData.data.name || user.name,
            email: responseData.data.email || user.email,
            userType: responseData.data.type?.toLowerCase() || user.userType,
            status: (responseData.data.isVerified ? "active" : "pending") as "active" | "pending" | "inactive",
          };
        }
        return user;
      });

      set({ users: updatedUsers, loading: false });
    } catch (error: any) {
      logger.error("Erro ao atualizar usuário:", error);
      set({
        error: error.message || "Erro ao atualizar usuário",
        loading: false,
      });
      throw error;
    }
  },

  updateUserStatus: async (userId: string, status: "active" | "inactive") => {
    set({ loading: true, error: null });
    try {
      const token = getAuthToken();
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
      const token = getAuthToken();
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
