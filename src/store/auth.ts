import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "buyer" | "seller" | "admin";
  city: string;
  state: string;
  avatar?: string;
  // Campos específicos para vendedor
  storeName?: string;
  storeDescription?: string;
  cnpj?: string;
  address?: string;
  zipCode?: string;
  category?: string;
  storeSlug?: string;
  isVerified?: boolean;
  plan?: "basic" | "premium" | "enterprise";
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string, userType: "buyer" | "seller" | "admin") => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  userType: "buyer" | "seller";
  city: string;
  state: string;
  // Campos específicos para vendedor
  storeName?: string;
  storeDescription?: string;
  cnpj?: string;
  address?: string;
  zipCode?: string;
  category?: string;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Ações
      login: async (email: string, password: string, userType: "buyer" | "seller" | "admin") => {
        set({ isLoading: true, error: null });

        try {
          // Usar cliente de API centralizado
          const { post } = await import("@/lib/api-client");

          const data = await post("/api/auth/login", {
            email,
            password,
            userType,
          });

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erro ao fazer login",
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true, error: null });

        try {
          // Simulação de API call - substituir pela API real
          const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Erro ao criar conta");
          }

          const data = await response.json();

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erro ao criar conta",
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });

        // Limpar localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth-token");
          localStorage.removeItem("user-data");
        }
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              ...userData,
              updatedAt: new Date().toISOString(),
            },
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Hook para verificar permissões
export const usePermissions = () => {
  const { user } = useAuthStore();

  return {
    isAdmin: user?.type === "admin",
    isSeller: user?.type === "seller",
    isBuyer: user?.type === "buyer",
    canManageProducts: user?.type === "seller" || user?.type === "admin",
    canManageUsers: user?.type === "admin",
    canManageStore: user?.type === "seller" || user?.type === "admin",
    canViewAnalytics: user?.type === "seller" || user?.type === "admin",
  };
};

// Hook para verificar se o usuário está autenticado
export const useAuth = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    isGuest: !isAuthenticated,
  };
};
