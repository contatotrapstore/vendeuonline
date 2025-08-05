import { create } from 'zustand';
import { apiRequest } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  userType: 'buyer' | 'seller' | 'admin';
  status: 'active' | 'inactive' | 'pending';
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
  updateUserStatus: (userId: string, status: 'active' | 'inactive') => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  setFilters: (filters: Partial<UserFilters>) => void;
  clearError: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    status: 'all',
    userType: 'all'
  },

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiRequest('/api/admin/users');
      set({ users: response.data || [], loading: false });
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      set({
        users: [],
        error: 'Erro ao carregar usuários',
        loading: false
      });
    }
  },

  updateUserStatus: async (userId: string, status: 'active' | 'inactive') => {
    set({ loading: true, error: null });
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      
      // Atualizar localmente
      const { users } = get();
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, status } : user
      );
      
      set({ users: updatedUsers, loading: false });
    } catch (error: any) {
      console.error('Erro ao atualizar status do usuário:', error);
      set({
        error: 'Erro ao atualizar status do usuário',
        loading: false
      });
    }
  },

  deleteUser: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      
      // Remover localmente
      const { users } = get();
      const updatedUsers = users.filter(user => user.id !== userId);
      
      set({ users: updatedUsers, loading: false });
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      set({
        error: 'Erro ao excluir usuário',
        loading: false
      });
    }
  },

  setFilters: (newFilters: Partial<UserFilters>) => {
    const { filters } = get();
    set({ filters: { ...filters, ...newFilters } });
  },

  clearError: () => {
    set({ error: null });
  }
}));