import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  store: string;
  quantity: number;
  maxQuantity?: number;
}

export interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  // Computed values
  total: number;
  itemCount: number;

  // Actions
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      get total() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      get itemCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      addItem: (newItem) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === newItem.id);

          if (existingItem) {
            // Update quantity if item already exists
            const newQuantity = existingItem.quantity + 1;
            const maxQuantity = existingItem.maxQuantity || 99;

            if (newQuantity <= maxQuantity) {
              return {
                items: state.items.map((item) => (item.id === newItem.id ? { ...item, quantity: newQuantity } : item)),
              };
            }
            return state; // Don't add if max quantity reached
          } else {
            // Add new item
            return {
              items: [...state.items, { ...newItem, quantity: 1 }],
            };
          }
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === itemId) {
              const maxQuantity = item.maxQuantity || 99;
              return {
                ...item,
                quantity: Math.min(quantity, maxQuantity),
              };
            }
            return item;
          }),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      openCart: () => {
        set({ isOpen: true });
      },

      closeCart: () => {
        set({ isOpen: false });
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Hook for easier usage
export const useCart = () => {
  const store = useCartStore();

  return {
    ...store,
    isEmpty: store.items.length === 0,
    hasItems: store.items.length > 0,
  };
};
