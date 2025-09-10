import { create } from "zustand";
import { apiRequest } from "@/lib/api";

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  position: "HERO" | "SIDEBAR" | "FOOTER" | "CATEGORY";
  isActive: boolean;
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
  createdAt: string;
  updatedAt: string;
}

interface BannerStore {
  banners: Banner[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchBanners: () => Promise<void>;
  createBanner: (banner: Omit<Banner, "id" | "createdAt" | "updatedAt" | "clicks" | "impressions">) => Promise<void>;
  updateBanner: (id: string, updates: Partial<Banner>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useBannerStore = create<BannerStore>((set, get) => ({
  banners: [],
  loading: false,
  error: null,

  fetchBanners: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiRequest("/api/admin/banners");
      set({ banners: response.data || [], loading: false });
    } catch (error: any) {
      console.error("Erro ao buscar banners:", error);
      set({
        banners: [],
        loading: false,
        error: "Erro ao carregar banners",
      });
    }
  },

  createBanner: async (bannerData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiRequest("/api/admin/banners", {
        method: "POST",
        body: JSON.stringify(bannerData),
      });

      const newBanner = response.data;
      set((state) => ({
        banners: [...state.banners, newBanner],
        loading: false,
      }));
    } catch (error: any) {
      console.error("Erro ao criar banner:", error);
      set({
        error: error.message || "Erro ao criar banner",
        loading: false,
      });
      throw error;
    }
  },

  updateBanner: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await apiRequest(`/api/admin/banners/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      const updatedBanner = response.data;
      set((state) => ({
        banners: state.banners.map((banner) => (banner.id === id ? updatedBanner : banner)),
        loading: false,
      }));
    } catch (error: any) {
      console.error("Erro ao atualizar banner:", error);
      set({
        error: "Erro ao atualizar banner",
        loading: false,
      });
    }
  },

  deleteBanner: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiRequest(`/api/admin/banners/${id}`, {
        method: "DELETE",
      });

      set((state) => ({
        banners: state.banners.filter((banner) => banner.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      console.error("Erro ao deletar banner:", error);
      set({
        error: "Erro ao deletar banner",
        loading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
