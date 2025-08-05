import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Utilitário para gerenciar token no localStorage
const getStoredToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth-token');
  }
  return null;
};

// Utilitário para fazer requisições autenticadas
const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = getStoredToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...Object.fromEntries(new Headers(options.headers || {}).entries())
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  return response.json();
};

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  productId: string;
}

export interface ShippingAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  storeId: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product: {
      name: string;
      images: { url: string; alt: string; isMain: boolean }[];
    };
  }[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  store: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
  };
  buyer: {
    user: {
      name: string;
      email: string;
    };
  };
  trackingCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
}

export interface CreateOrderData {
  items: {
    productId: string;
    quantity: number;
  }[];
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentMethod: string;
  notes?: string;
}

interface OrderStore {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  // Actions
  fetchOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    storeId?: string;
  }) => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<Order | null>;
  createOrder: (orderData: CreateOrderData) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  addTrackingCode: (orderId: string, trackingCode: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  setCurrentOrder: (order: Order | null) => void;
  clearError: () => void;
  // Métodos de conveniência para filtros locais
  getOrdersByStatus: (status: Order['status']) => Order[];
  getOrdersByStore: (storeId: string) => Order[];
}

// Estado inicial da paginação
const initialPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: [],
      currentOrder: null,
      isLoading: false,
      error: null,
      pagination: initialPagination,

      fetchOrders: async (params = {}) => {
        try {
          set({ isLoading: true, error: null });
          
          const searchParams = new URLSearchParams();
          if (params.page) searchParams.append('page', params.page.toString());
          if (params.limit) searchParams.append('limit', params.limit.toString());
          if (params.status) searchParams.append('status', params.status);
          if (params.storeId) searchParams.append('storeId', params.storeId);
          
          const response = await apiRequest(`/api/orders?${searchParams.toString()}`);
          
          set({ 
            orders: response.orders,
            pagination: {
              page: response.pagination.page,
              limit: response.pagination.limit,
              total: response.pagination.total,
              totalPages: response.pagination.totalPages,
              hasNext: response.pagination.hasNext,
              hasPrev: response.pagination.hasPrev,
            },
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao carregar pedidos',
            isLoading: false 
          });
        }
      },

      fetchOrderById: async (orderId: string) => {
        try {
          set({ isLoading: true, error: null });
          const order = await apiRequest(`/api/orders/${orderId}`);
          set({ currentOrder: order, isLoading: false });
          return order;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao carregar pedido',
            isLoading: false 
          });
          return null;
        }
      },

      createOrder: async (orderData: CreateOrderData) => {
        try {
          set({ isLoading: true, error: null });
          
          const newOrder = await apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
          });
          
          set(state => ({
            orders: [newOrder, ...state.orders],
            currentOrder: newOrder,
            isLoading: false
          }));
          
          return newOrder;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao criar pedido',
            isLoading: false 
          });
          throw error;
        }
      },

      updateOrderStatus: async (orderId: string, status: Order['status']) => {
        try {
          set({ isLoading: true, error: null });
          
          const updatedOrder = await apiRequest(`/api/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
          });
          
          set(state => ({
            orders: state.orders.map(order => 
              order.id === orderId ? updatedOrder : order
            ),
            currentOrder: state.currentOrder?.id === orderId ? updatedOrder : state.currentOrder,
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao atualizar status',
            isLoading: false 
          });
          throw error;
        }
      },

      addTrackingCode: async (orderId: string, trackingCode: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const updatedOrder = await apiRequest(`/api/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ trackingCode, status: 'shipped' }),
          });
          
          set(state => ({
            orders: state.orders.map(order => 
              order.id === orderId ? updatedOrder : order
            ),
            currentOrder: state.currentOrder?.id === orderId ? updatedOrder : state.currentOrder,
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao adicionar código de rastreamento',
            isLoading: false 
          });
          throw error;
        }
      },

      getOrdersByStatus: (status: Order['status']) => {
        return get().orders.filter(order => order.status === status);
      },

      getOrdersByStore: (storeId: string) => {
        return get().orders.filter(order => order.storeId === storeId);
      },

      cancelOrder: async (orderId: string, reason?: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const updatedOrder = await apiRequest(`/api/orders/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify({ 
              status: 'cancelled',
              notes: reason 
            }),
          });
          
          set(state => ({
            orders: state.orders.map(order => 
              order.id === orderId ? updatedOrder : order
            ),
            currentOrder: state.currentOrder?.id === orderId ? updatedOrder : state.currentOrder,
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao cancelar pedido',
            isLoading: false 
          });
          throw error;
        }
      },

      setCurrentOrder: (order: Order | null) => {
        set({ currentOrder: order });
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'order-store',
      partialize: (state) => ({ 
        orders: state.orders,
        currentOrder: state.currentOrder 
      })
    }
  )
);