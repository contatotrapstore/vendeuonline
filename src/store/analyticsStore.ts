import { create } from "zustand";
import { logger } from "@/lib/logger";


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
    totalVisits: number;
    conversionRate: number;
  };
  comparison: {
    orders: number;
    revenue: number;
    visits: number;
    conversion: number;
    revenueChange: number;
    ordersChange: number;
    visitsChange: number;
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
      const response = await apiRequest(`/api/seller/analytics?period=${currentPeriod.replace("d", "")}`);

      // A API retorna { success: true, data: {...} }
      const statsData = response?.data || response;

      // Estruturar dados corretamente para o frontend
      const formattedStats: StoreStats = {
        period: currentPeriod,
        summary: {
          totalRevenue: statsData?.revenue || 0,
          totalOrders: statsData?.orders || 0,
          totalItems: statsData?.totalItems || 0,
          avgOrderValue: statsData?.averageOrderValue || 0,
          avgRating: statsData?.avgRating || 0,
          totalProducts: statsData?.totalProducts || 0,
          lowStockCount: statsData?.lowStockCount || 0,
          totalVisits: statsData?.visits || 0,
          conversionRate: statsData?.conversionRate || 0,
        },
        comparison: statsData?.comparison || {
          orders: 0,
          revenue: 0,
          visits: 0,
          conversion: 0,
          revenueChange: 0,
          ordersChange: 0,
          visitsChange: 0,
        },
        ordersByStatus: statsData?.ordersByStatus || {},
        topProducts: statsData?.topProducts || [],
        salesByDay: statsData?.salesByDay || [],
        lowStockProducts: statsData?.lowStockProducts || [],
        recentReviews: statsData?.recentReviews || [],
      };

      set({
        stats: formattedStats,
        isLoading: false,
        period: currentPeriod,
      });
    } catch (error: any) {
      logger.error("Erro ao carregar estatísticas:", error);
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
  if (!products || !Array.isArray(products)) {
    return [];
  }

  return products.map((product) => ({
    id: product?.id || "",
    name: product?.name || "Produto sem nome",
    views: product?.viewCount || 0,
    sales: product?.salesCount || 0,
    revenue: (product?.salesCount || 0) * (product?.price || 0),
    conversion: product?.viewCount > 0 ? ((product?.salesCount || 0) / product.viewCount) * 100 : 0,
    stock: product?.stock || 0,
    price: product?.price || 0,
    images: product?.images || [],
  }));
};

// Função para calcular distribuição real de categorias
export const calculateCategoryData = async (): Promise<CategoryData[]> => {
  try {
    const token = getStoredToken();
    if (!token) return [];

    // Buscar distribuição real de categorias via API
    const response = await apiRequest("/api/seller/categories");

    // Se a API retornar dados, usar eles
    if (response?.success && response?.data && Array.isArray(response.data)) {
      const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#9333EA", "#EC4899"];

      // Calcular total para percentuais
      const total = response.data.reduce((sum: number, cat: any) => sum + (cat.count || 0), 0);

      if (total === 0) return [];

      return response.data
        .filter((cat: any) => cat.count > 0)
        .map((cat: any, index: number) => ({
          name: cat.category || "Sem categoria",
          value: Math.round((cat.count / total) * 100),
          color: colors[index % colors.length],
        }));
    }

    // Fallback: retornar array vazio se não houver dados
    return [];
  } catch (error) {
    // Silenciar erros 404, 401 e retornar array vazio
    if (error?.message?.includes("404") || error?.message?.includes("401")) {
      return [];
    }
    logger.warn("Distribuição de categorias não disponível");
    return [];
  }
};
