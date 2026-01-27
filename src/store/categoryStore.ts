import { create } from "zustand";
import { persist } from "zustand/middleware";
import { get } from "@/lib/api-client";
import { appCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  children?: Category[];
  parent?: Category;
}

interface CategoryStore {
  categories: Category[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // Actions
  fetchCategories: (forceRefresh?: boolean) => Promise<void>;
  getCategoryBySlug: (slug: string) => Category | undefined;
  getCategoryById: (id: string) => Category | undefined;
  clearCategories: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos (categorias mudam raramente)

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      categories: [],
      loading: false,
      error: null,
      lastFetch: null,

      fetchCategories: async (forceRefresh = false) => {
        try {
          const now = Date.now();
          const { lastFetch } = get();

          // Se não forçar refresh e cache ainda válido, não buscar
          if (!forceRefresh && lastFetch && now - lastFetch < CACHE_TTL) {
            logger.debug("📦 Usando categorias do cache");
            return;
          }

          set({ loading: true, error: null });

          // Verificar cache primeiro
          const cachedData = appCache.get("categories");
          if (cachedData && !forceRefresh) {
            set({
              categories: cachedData,
              loading: false,
              lastFetch: now,
            });
            return;
          }

          // Buscar do backend
          const response = await get("/api/categories");
          const categories = response.data || response.categories || [];

          // Armazenar no cache
          appCache.set("categories", categories, CACHE_TTL);

          set({
            categories,
            loading: false,
            error: null,
            lastFetch: now,
          });

          logger.info(`✅ ${categories.length} categorias carregadas`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Erro ao carregar categorias";
          logger.error("❌ Erro ao buscar categorias:", error);
          set({
            error: errorMessage,
            loading: false,
          });
        }
      },

      getCategoryBySlug: (slug) => {
        const { categories } = get();
        return categories.find((cat) => cat.slug === slug);
      },

      getCategoryById: (id) => {
        const { categories } = get();
        return categories.find((cat) => cat.id === id);
      },

      clearCategories: () => {
        set({
          categories: [],
          loading: false,
          error: null,
          lastFetch: null,
        });
        appCache.remove("categories");
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),
    }),
    {
      name: "category-storage",
      partialize: (state) => ({
        categories: state.categories,
        lastFetch: state.lastFetch,
      }),
    }
  )
);

export default useCategoryStore;
