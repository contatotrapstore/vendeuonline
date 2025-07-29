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
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  // Campos específicos para admin
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
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

// Simulação de dados de usuários para desenvolvimento
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin Sistema',
    email: 'admin@marketplace.com',
    phone: '(11) 99999-0001',
    city: 'São Paulo',
    state: 'SP',
    userType: 'admin',
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    permissions: ['users', 'stores', 'products', 'orders', 'analytics']
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'joao@loja.com',
    phone: '(11) 99999-0002',
    city: 'São Paulo',
    state: 'SP',
    userType: 'seller',
    isVerified: true,
    createdAt: '2024-01-15T00:00:00Z',
    storeId: 'store-1',
    storeName: 'Loja do João',
    storeSlug: 'loja-do-joao'
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'maria@email.com',
    phone: '(11) 99999-0003',
    city: 'Rio de Janeiro',
    state: 'RJ',
    userType: 'buyer',
    isVerified: true,
    createdAt: '2024-02-01T00:00:00Z'
  }
];

export const useAuthStore = create<AuthStore>()(persist(
  (set, get) => ({
    // Estado inicial
    user: null,
    isAuthenticated: false,
    isLoading: false,
    token: null,

    // Ações
    login: async (email: string, password: string) => {
      set({ isLoading: true });
      
      try {
        // Simular chamada de API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Buscar usuário mock
        const user = mockUsers.find(u => u.email === email);
        
        if (!user) {
          throw new Error('Usuário não encontrado');
        }
        
        // Simular validação de senha (em produção seria validada no backend)
        if (password.length < 6) {
          throw new Error('Senha inválida');
        }
        
        // Gerar token mock
        const token = `mock-token-${user.id}-${Date.now()}`;
        
        set({
          user,
          isAuthenticated: true,
          token,
          isLoading: false
        });
        
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    register: async (userData: RegisterData) => {
      set({ isLoading: true });
      
      try {
        // Simular chamada de API
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se email já existe
        const existingUser = mockUsers.find(u => u.email === userData.email);
        if (existingUser) {
          throw new Error('E-mail já cadastrado');
        }
        
        // Criar novo usuário
        const newUser: User = {
          id: `user-${Date.now()}`,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          city: userData.city,
          state: userData.state,
          userType: userData.userType,
          isVerified: false,
          createdAt: new Date().toISOString()
        };
        
        // Se for vendedor, criar dados da loja
        if (userData.userType === 'seller') {
          newUser.storeId = `store-${Date.now()}`;
          newUser.storeName = `Loja de ${userData.name.split(' ')[0]}`;
          newUser.storeSlug = `loja-${userData.name.toLowerCase().replace(/\s+/g, '-')}`;
        }
        
        // Adicionar à lista mock (em produção seria salvo no backend)
        mockUsers.push(newUser);
        
        // Gerar token
        const token = `mock-token-${newUser.id}-${Date.now()}`;
        
        set({
          user: newUser,
          isAuthenticated: true,
          token,
          isLoading: false
        });
        
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: () => {
      set({
        user: null,
        isAuthenticated: false,
        token: null,
        isLoading: false
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

    checkAuth: async () => {
      const { token } = get();
      
      if (!token) {
        return;
      }
      
      set({ isLoading: true });
      
      try {
        // Simular verificação de token
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Em produção, verificaria o token no backend
        // Por enquanto, apenas mantém o usuário logado se o token existir
        
        set({ isLoading: false });
        
      } catch (error) {
        // Token inválido, fazer logout
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          isLoading: false
        });
      }
    }
  }),
  {
    name: 'auth-storage',
    partialize: (state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      token: state.token
    })
  }
));

// Hook para verificar permissões (útil para admin)
export const usePermissions = () => {
  const user = useAuthStore(state => state.user);
  
  const hasPermission = (permission: string) => {
    if (!user || user.userType !== 'admin') return false;
    return user.permissions?.includes(permission) || false;
  };
  
  const isAdmin = user?.userType === 'admin';
  const isSeller = user?.userType === 'seller';
  const isBuyer = user?.userType === 'buyer';
  
  return {
    hasPermission,
    isAdmin,
    isSeller,
    isBuyer,
    permissions: user?.permissions || []
  };
};

// Hook para dados da loja (útil para vendedores)
export const useStoreData = () => {
  const user = useAuthStore(state => state.user);
  
  return {
    storeId: user?.storeId,
    storeName: user?.storeName,
    storeSlug: user?.storeSlug,
    hasStore: !!(user?.storeId)
  };
};