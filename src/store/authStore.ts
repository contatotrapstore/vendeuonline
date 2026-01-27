import React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiRequest, post, get as apiGet } from "@/lib/api-client";
import { logger } from "@/lib/logger";

// Helper para decodificar JWT e verificar expiração
const decodeJWT = (token: string): { exp: number } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('Erro ao decodificar token:', error);
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;

  const now = Date.now() / 1000; // Convert to seconds
  return decoded.exp < now;
};

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  userType: "admin" | "seller" | "buyer";
  type?: "admin" | "seller" | "buyer";
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  // Campos específicos para vendedores
  seller?: {
    id: string;
    storeName: string;
    rating: number;
    totalSales: number;
    plan: string;
    isVerified: boolean;
    store?: {
      id: string;
      slug: string;
      name: string;
    };
  };
  // Campos específicos para compradores
  buyer?: {
    id: string;
    wishlistCount: number;
    orderCount: number;
  };
  // Campos específicos para admin
  admin?: {
    id: string;
    permissions: string[];
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string, userType?: string) => Promise<{ user: User; token: string }>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  userType: "seller" | "buyer";
  city: string;
  state: string;
}

type AuthStore = AuthState & AuthActions;

// ✅ REMOVIDO: Funções legadas substituídas por Zustand persist
// Token agora é persistido automaticamente pelo Zustand junto com o estado
// Ver config/storage-keys.ts para helpers centralizados

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      error: null,

      // Ações
      login: async (email: string, password: string, userType?: string) => {
        set({ isLoading: true, error: null });

        try {
          // O backend já identifica o tipo de usuário automaticamente
          // Não precisamos tentar múltiplos tipos
          const response = await post("/api/auth/login", { email, password });
          const { user, token } = response;

          logger.info("Login successful - User data:", user);
          logger.info("Login successful - Token:", token);
          logger.info("User type:", user?.userType);

          // Normalizar user object: garantir que type e userType existem e são lowercase
          const userTypeRaw = (user.userType || user.type || '').toLowerCase();
          const normalizedUserType = userTypeRaw as "admin" | "seller" | "buyer";

          const normalizedUser = {
            ...user,
            type: normalizedUserType,
            userType: normalizedUserType,
          };

          // ✅ Token agora é persistido automaticamente pelo Zustand
          set({
            user: normalizedUser,
            isAuthenticated: true,
            token, // Token incluído no state persistido
            isLoading: false,
            error: null,
          });

          // Retornar o user normalizado para uso no componente
          return { user: normalizedUser, token };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Erro ao fazer login";
          set({
            isLoading: false,
            error: errorMessage,
            user: null,
            isAuthenticated: false,
            token: null,
          });
          throw error;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await post("/api/auth/register", userData);

          const { user, token } = response;

          // Normalizar user object: garantir que type e userType existem e são lowercase
          const userTypeRaw = (user.userType || user.type || '').toLowerCase();
          const normalizedUserType = userTypeRaw as "admin" | "seller" | "buyer";

          const normalizedUser = {
            ...user,
            type: normalizedUserType,
            userType: normalizedUserType,
          };

          // ✅ Token agora é persistido automaticamente pelo Zustand
          set({
            user: normalizedUser,
            isAuthenticated: true,
            token, // Token incluído no state persistido
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Erro ao criar conta";
          set({
            isLoading: false,
            error: errorMessage,
            user: null,
            isAuthenticated: false,
            token: null,
          });
          throw error;
        }
      },

      logout: () => {
        const { user } = get();
        const sellerId = user?.seller?.id || user?.id;

        // 🔒 SECURITY FIX (Bug #6): Clear seller-specific cache before logout
        if (sellerId) {
          import("@/lib/cache").then(({ appCache }) => {
            appCache.clearSellerCache(sellerId);
          });
        }

        // 🔒 SECURITY FIX (Bug #6): Clear all product state
        import("./productStore").then(({ useProductStore }) => {
          useProductStore.getState().clearProducts();
        });

        // ✅ Zustand persist limpa automaticamente ao fazer set com null
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          isLoading: false,
          error: null,
        });
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...userData },
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        // ✅ Obter token do state persistido (Zustand)
        const { token } = get();

        if (!token) {
          set({
            user: null,
            isAuthenticated: false,
            token: null,
            isLoading: false,
          });
          return;
        }

        // Verificar se token expirou ANTES de fazer requisição
        if (isTokenExpired(token)) {
          logger.warn('⚠️ Token expirado detectado. Fazendo logout automático.');
          set({
            user: null,
            isAuthenticated: false,
            token: null,
            isLoading: false,
            error: 'Sua sessão expirou. Por favor, faça login novamente.',
          });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await apiGet("/api/auth/me");

          // Normalizar user retornado do /api/auth/me - garantir lowercase
          const userTypeRaw = response.user
            ? (response.user.userType || response.user.type || '').toLowerCase()
            : '';
          const normalizedUserType = userTypeRaw as "admin" | "seller" | "buyer";

          const normalizedUser = response.user
            ? {
                ...response.user,
                type: normalizedUserType,
                userType: normalizedUserType,
              }
            : null;

          set({
            user: normalizedUser,
            isAuthenticated: true,
            token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Token inválido ou erro de rede, fazer logout
          const errorMsg = error instanceof Error ? error.message : 'Erro ao verificar autenticação';
          logger.error('❌ Erro no checkAuth:', errorMsg);

          set({
            user: null,
            isAuthenticated: false,
            token: null,
            isLoading: false,
            error: errorMsg.includes('401') || errorMsg.includes('Token')
              ? 'Sua sessão expirou. Por favor, faça login novamente.'
              : null,
          });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token, // ✅ Token agora é persistido junto com o state
      }),
    }
  )
);

// Hook para verificar permissões (útil para admin)
export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);

  const hasPermission = (permission: string) => {
    if (!user || user.userType !== "admin" || !user.admin) return false;

    try {
      const permissions =
        typeof user.admin.permissions === "string" ? JSON.parse(user.admin.permissions) : user.admin.permissions;

      return Array.isArray(permissions) && (permissions.includes(permission) || permissions.includes("all"));
    } catch {
      return false;
    }
  };

  const isAdmin = user?.userType === "admin";
  const isSeller = user?.userType === "seller";
  const isBuyer = user?.userType === "buyer";

  const getPermissions = () => {
    if (!user?.admin?.permissions) return [];
    try {
      return typeof user.admin.permissions === "string" ? JSON.parse(user.admin.permissions) : user.admin.permissions;
    } catch {
      return [];
    }
  };

  return {
    hasPermission,
    isAdmin,
    isSeller,
    isBuyer,
    permissions: getPermissions(),
  };
};

// Hook para dados da loja (útil para vendedores)
export const useStoreData = () => {
  const user = useAuthStore((state) => state.user);

  return {
    sellerId: user?.seller?.id,
    storeName: user?.seller?.storeName,
    storeId: user?.seller?.store?.id,
    storeSlug: user?.seller?.store?.slug,
    rating: user?.seller?.rating || 0,
    totalSales: user?.seller?.totalSales || 0,
    plan: user?.seller?.plan,
    isVerified: user?.seller?.isVerified || false,
    hasSeller: !!user?.seller,
  };
};

// Hook para dados do comprador
export const useBuyerData = () => {
  const user = useAuthStore((state) => state.user);

  return {
    buyerId: user?.buyer?.id,
    wishlistCount: user?.buyer?.wishlistCount || 0,
    orderCount: user?.buyer?.orderCount || 0,
    hasBuyer: !!user?.buyer,
  };
};

// Hook para inicialização automática da autenticação
export const useAuthInit = () => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Verificar autenticação na inicialização
  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    isLoading,
    isAuthenticated,
    isInitialized: !isLoading,
  };
};
