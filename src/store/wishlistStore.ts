import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "./authStore";

export interface WishlistItem {
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
  addedAt: string;
  priceHistory: { date: string; price: number }[];
}

interface WishlistStore {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  clearWishlist: () => void;
  isInWishlist: (productId: string) => boolean;
  clearError: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,

      fetchWishlist: async () => {
        set({ loading: true, error: null });
        try {
          const token = useAuthStore.getState().token;
          const response = await apiRequest("/api/wishlist", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          set({ items: response.data || [], loading: false });
        } catch (error: any) {
          console.error("Erro ao buscar wishlist:", error);
          set({
            items: [],
            loading: false,
            error: "Erro ao carregar lista de desejos",
          });
        }
      },

      addToWishlist: async (productId: string) => {
        set({ loading: true, error: null });
        try {
          const token = useAuthStore.getState().token;
          const response = await apiRequest("/api/wishlist", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ productId }),
          });

          const newItem = response.data;
          set((state) => ({
            items: [...state.items, newItem],
            loading: false,
          }));
        } catch (error: any) {
          console.error("Erro ao adicionar à wishlist:", error);
          set({
            error: "Erro ao adicionar produto à lista de desejos",
            loading: false,
          });
          throw error;
        }
      },

      removeFromWishlist: async (itemId: string) => {
        set({ loading: true, error: null });
        try {
          const token = useAuthStore.getState().token;
          await apiRequest(`/api/wishlist/${itemId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          set((state) => ({
            items: state.items.filter((item) => item.id !== itemId),
            loading: false,
          }));
        } catch (error: any) {
          console.error("Erro ao remover da wishlist:", error);
          set({
            error: "Erro ao remover produto da lista de desejos",
            loading: false,
          });
        }
      },

      clearWishlist: () => {
        set({ items: [], error: null });
      },

      isInWishlist: (productId: string) => {
        const { items } = get();
        return items.some((item) => item.productId === productId);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "wishlist-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
