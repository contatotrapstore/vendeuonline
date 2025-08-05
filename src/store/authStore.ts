import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  userType: 'admin' | 'seller' | 'buyer';
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
  login: (email: string, password: string) => Promise<void>;
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
  userType: 'seller' | 'buyer';
  city: string;
  state: string;
}

type AuthStore = AuthState & AuthActions;

// Utilitário para gerenciar token no localStorage
const getStoredToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth-token');
  }
  return null;
};

const setStoredToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth-token', token);
  }
};

const removeStoredToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth-token');
  }
};

// Utilitário para fazer requisições autenticadas
const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = getStoredToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...Object.fromEntries(new Headers(options.headers || {}).entries())
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  return response.json();
};

export const useAuthStore = create<AuthStore>()(persist(
  (set, get) => ({
    // Estado inicial
    user: null,
    isAuthenticated: false,
    isLoading: false,
    token: getStoredToken(),
    error: null,

    // Ações
    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        
        const { user, token } = response;
        
        // Armazenar token
        setStoredToken(token);
        
        set({
          user,
          isAuthenticated: true,
          token,
          isLoading: false,
          error: null
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
        set({ 
          isLoading: false, 
          error: errorMessage,
          user: null,
          isAuthenticated: false,
          token: null
        });
        removeStoredToken();
        throw error;
      }
    },

    register: async (userData: RegisterData) => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(userData),
        });
        
        const { user, token } = response;
        
        // Armazenar token
        setStoredToken(token);
        
        set({
          user,
          isAuthenticated: true,
          token,
          isLoading: false,
          error: null
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar conta';
        set({ 
          isLoading: false, 
          error: errorMessage,
          user: null,
          isAuthenticated: false,
          token: null
        });
        removeStoredToken();
        throw error;
      }
    },

    logout: () => {
      removeStoredToken();
      set({
        user: null,
        isAuthenticated: false,
        token: null,
        isLoading: false,
        error: null
      });
    },

    updateUser: (userData: Partial<User>) => {
      const { user } = get();
      if (user) {
        set({
          user: { ...user, ...userData }
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
      const token = getStoredToken();
      
      if (!token) {
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          isLoading: false
        });
        return;
      }
      
      set({ isLoading: true, error: null });
      
      try {
        const response = await apiRequest('/api/auth/me');
        
        set({
          user: response.user,
          isAuthenticated: true,
          token,
          isLoading: false,
          error: null
        });
        
      } catch (error) {
        // Token inválido, fazer logout
        removeStoredToken();
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          isLoading: false,
          error: null
        });
      }
    }
  }),
  {
    name: 'auth-storage',
    partialize: (state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated
      // token é gerenciado separadamente no localStorage
    })
  }
));

// Hook para verificar permissões (útil para admin)
export const usePermissions = () => {
  const user = useAuthStore(state => state.user);
  
  const hasPermission = (permission: string) => {
    if (!user || user.userType !== 'admin' || !user.admin) return false;
    return user.admin.permissions.includes(permission);
  };
  
  const isAdmin = user?.userType === 'admin';
  const isSeller = user?.userType === 'seller';
  const isBuyer = user?.userType === 'buyer';
  
  return {
    hasPermission,
    isAdmin,
    isSeller,
    isBuyer,
    permissions: user?.admin?.permissions || []
  };
};

// Hook para dados da loja (útil para vendedores)
export const useStoreData = () => {
  const user = useAuthStore(state => state.user);
  
  return {
    sellerId: user?.seller?.id,
    storeName: user?.seller?.storeName,
    rating: user?.seller?.rating || 0,
    totalSales: user?.seller?.totalSales || 0,
    plan: user?.seller?.plan,
    isVerified: user?.seller?.isVerified || false,
    hasSeller: !!(user?.seller)
  };
};

// Hook para dados do comprador
export const useBuyerData = () => {
  const user = useAuthStore(state => state.user);
  
  return {
    buyerId: user?.buyer?.id,
    wishlistCount: user?.buyer?.wishlistCount || 0,
    orderCount: user?.buyer?.orderCount || 0,
    hasBuyer: !!(user?.buyer)
  };
};

// Hook para inicialização automática da autenticação
export const useAuthInit = () => {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const isLoading = useAuthStore(state => state.isLoading);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  // Verificar autenticação na inicialização
  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  return {
    isLoading,
    isAuthenticated,
    isInitialized: !isLoading
  };
};