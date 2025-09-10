import { create } from "zustand";

// Utilitário para gerenciar token no localStorage
const getStoredToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth-token");
  }
  return null;
};

// Utilitário para fazer requisições autenticadas
const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = getStoredToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...Object.fromEntries(new Headers(options.headers || {}).entries()),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Erro na requisição" }));
    throw new Error(errorData.message || `Erro ${response.status}`);
  }

  return response.json();
};

export interface AnalyticsData {
  period: string;
  views: number;
  sales: number;
  revenue: number;
  orders: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  views: number;
  sales: number;
  revenue: number;
  conversion: number;
  stock: number;
  price: number;
  images?: { url: string }[];
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export interface StoreStats {
  period: string;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalItems: number;
    avgOrderValue: number;
    avgRating: number;
    totalProducts: number;
    lowStockCount: number;
  };
  ordersByStatus: Record<string, number>;
  salesByDay: {
    date: string;
    orders: number;
    revenue: number;
  }[];
  topProducts: ProductPerformance[];
  lowStockProducts: ProductPerformance[];
  recentReviews: any[];
}

interface AnalyticsState {
  stats: StoreStats | null;
  isLoading: boolean;
  error: string | null;
  period: "7d" | "30d" | "90d" | "1y";

  // Actions
  fetchStoreStats: (storeId: string, period?: "7d" | "30d" | "90d" | "1y") => Promise<void>;
  setPeriod: (period: "7d" | "30d" | "90d" | "1y") => void;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  stats: null,
  isLoading: false,
  error: null,
  period: "30d",

  fetchStoreStats: async (storeId: string, period?: "7d" | "30d" | "90d" | "1y") => {
    try {
      set({ isLoading: true, error: null });

      const currentPeriod = period || get().period;
      const response = await apiRequest(`/api/stores/${storeId}/stats?period=${currentPeriod}`);

      set({
        stats: response,
        isLoading: false,
        period: currentPeriod,
      });
    } catch (error: any) {
      console.error("Erro ao carregar estatísticas:", error);
      set({
        error: error.message || "Erro ao carregar estatísticas",
        isLoading: false,
      });
    }
  },

  setPeriod: (period: "7d" | "30d" | "90d" | "1y") => {
    set({ period });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Helper functions para transformar dados da API em formato dos gráficos
export const transformStatsToAnalyticsData = (stats: StoreStats): AnalyticsData[] => {
  if (!stats.salesByDay) return [];

  return stats.salesByDay.map((day) => ({
    period: new Date(day.date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    }),
    views: 0, // API não retorna views por dia ainda
    sales: day.orders,
    revenue: day.revenue,
    orders: day.orders,
  }));
};

export const transformProductsToPerformance = (products: any[]): ProductPerformance[] => {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    views: product.viewCount || 0,
    sales: product.salesCount || 0,
    revenue: (product.salesCount || 0) * product.price,
    conversion: product.viewCount > 0 ? ((product.salesCount || 0) / product.viewCount) * 100 : 0,
    stock: product.stock,
    price: product.price,
    images: product.images,
  }));
};

// Função para gerar dados de categoria (placeholder até ter dados reais)
export const generateCategoryData = (): CategoryData[] => {
  return [
    { name: "Eletrônicos", value: 35, color: "#3B82F6" },
    { name: "Roupas", value: 25, color: "#10B981" },
    { name: "Casa", value: 20, color: "#F59E0B" },
    { name: "Esportes", value: 12, color: "#EF4444" },
    { name: "Outros", value: 8, color: "#8B5CF6" },
  ];
};
