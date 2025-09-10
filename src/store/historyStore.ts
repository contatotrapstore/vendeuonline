import { create } from "zustand";
import { apiRequest } from "@/lib/api";

export interface ViewHistoryItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  seller: string;
  rating: number;
  reviews: number;
  category: string;
  inStock: boolean;
  viewedAt: string;
  viewCount: number;
  lastViewDuration: number; // em segundos
}

interface HistoryState {
  items: ViewHistoryItem[];
  loading: boolean;
  error: string | null;
}

interface HistoryActions {
  fetchHistory: () => Promise<void>;
  addToHistory: (productId: string, duration: number) => Promise<void>;
  removeFromHistory: (itemId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  clearError: () => void;
}

export const useHistoryStore = create<HistoryState & HistoryActions>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchHistory: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiRequest("/api/buyer/history");
      set({ items: response.data || [], loading: false });
    } catch (error: any) {
      console.error("Erro ao buscar histórico:", error);
      set({
        items: [],
        loading: false,
        error: "Erro ao carregar histórico",
      });
    }
  },

  addToHistory: async (productId: string, duration: number) => {
    try {
      await apiRequest("/api/buyer/history", {
        method: "POST",
        body: JSON.stringify({ productId, duration }),
      });
      // Recarregar histórico após adicionar
      get().fetchHistory();
    } catch (error: any) {
      console.error("Erro ao adicionar ao histórico:", error);
    }
  },

  removeFromHistory: async (itemId: string) => {
    set({ loading: true, error: null });
    try {
      await apiRequest(`/api/buyer/history/${itemId}`, {
        method: "DELETE",
      });
      set({
        items: get().items.filter((item) => item.id !== itemId),
        loading: false,
      });
    } catch (error: any) {
      console.error("Erro ao remover do histórico:", error);
      set({
        error: "Erro ao remover do histórico",
        loading: false,
      });
    }
  },

  clearHistory: async () => {
    set({ loading: true, error: null });
    try {
      await apiRequest("/api/buyer/history", {
        method: "DELETE",
      });
      set({ items: [], loading: false });
    } catch (error: any) {
      console.error("Erro ao limpar histórico:", error);
      set({
        error: "Erro ao limpar histórico",
        loading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
