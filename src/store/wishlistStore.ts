import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiRequest } from "@/lib/api-client";
import { useAuthStore } from "./authStore";
import { logger } from "@/lib/logger";
import { PRODUCT_PLACEHOLDER } from "@/lib/constants";

// Dados da loja para WhatsApp
export interface WishlistItemStore {
  id: string;
  name: string;
  whatsapp?: string | null;
  phone?: string | null;
}

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
  discount?: number;
  // Dados da loja para botão WhatsApp
  store?: WishlistItemStore | null;
}

interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => void;
  isInWishlist: (productId: string) => boolean;
  clearError: () => void;
}

const normalizeWishlistItem = (item: any): WishlistItem => {
  const product = item.product || {};
  const store = item.store || null;
  const price = product.price ?? item.price ?? 0;
  const originalPrice = product.comparePrice ?? item.originalPrice;
  const discount =
    originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined;

  return {
    id: item.id,
    productId: product.id || item.productId,
    name: product.name || item.name || "Produto",
    price,
    originalPrice: originalPrice || undefined,
    image: product.imageUrl || product.images?.[0]?.url || PRODUCT_PLACEHOLDER,
    seller: product.storeName || store?.name || item.seller || "Loja",
    rating: product.rating || product.averageRating || 0,
    reviews: product.reviewCount || 0,
    category: product.category?.name || product.categoryId || item.category || "Geral",
    inStock: product.isActive ?? item.inStock ?? true,
    addedAt: item.addedAt || item.createdAt || new Date().toISOString(),
    discount,
    // Dados da loja para botão WhatsApp
    store: store ? {
      id: store.id,
      name: store.name,
      whatsapp: store.whatsapp,
      phone: store.phone,
    } : null,
  };
};

const ensureAuthToken = () => {
  const { token, isAuthenticated } = useAuthStore.getState();
  if (!token || !isAuthenticated) {
    throw new Error("Faça login para usar a lista de desejos");
  }
  return token;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,

      fetchWishlist: async () => {
        try {
          const { token, isAuthenticated } = useAuthStore.getState();
          if (!token || !isAuthenticated) {
            set({ items: [], loading: false, error: null });
            return;
          }

          set({ loading: true, error: null });
          const response = await apiRequest("/api/wishlist", { token });
          const rawItems = response.items || response.data || [];
          set({
            items: (rawItems as any[]).map(normalizeWishlistItem),
            loading: false,
            error: null,
          });
        } catch (error) {
          logger.error("Erro ao buscar wishlist:", error);
          set({
            items: [],
            loading: false,
            error: "Erro ao carregar lista de desejos",
          });
          throw error;
        }
      },

      addToWishlist: async (productId: string) => {
        try {
          const token = ensureAuthToken();
          set({ loading: true, error: null });
          await apiRequest("/api/wishlist", {
            method: "POST",
            token,
            body: JSON.stringify({ productId }),
          });

          await get().fetchWishlist();
        } catch (error) {
          set({ loading: false, error: error instanceof Error ? error.message : "Erro ao favoritar" });
          throw error;
        }
      },

      removeFromWishlist: async (productId: string) => {
        try {
          const token = ensureAuthToken();
          set({ loading: true, error: null });
          await apiRequest(`/api/wishlist/${productId}`, {
            method: "DELETE",
            token,
          });

          await get().fetchWishlist();
        } catch (error) {
          logger.error("Erro ao remover da wishlist:", error);
          set({
            loading: false,
            error: "Erro ao remover produto da lista de desejos",
          });
          throw error;
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
