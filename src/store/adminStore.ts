import { create } from 'zustand';

export interface DashboardStats {
  totalUsers: number;
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
  monthlyRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
  conversionRate: number;
  buyersCount: number;
  sellersCount: number;
  adminsCount: number;
  activeStores: number;
  pendingStores: number;
  suspendedStores: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
}

interface AdminStore {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchDashboardStats: () => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  stats: null,
  loading: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Token não encontrado. Faça login como administrador.');
      }

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || 'Erro ao buscar estatísticas';
        } catch {
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      set({ 
        stats: data.data,
        loading: false 
      });
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      set({
        stats: null,
        error: error.message || 'Erro ao carregar estatísticas',
        loading: false
      });
    }
  },

  clearError: () => {
    set({ error: null });
  }
}));