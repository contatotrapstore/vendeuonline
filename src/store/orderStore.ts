import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  userId: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: ShippingAddress;
  store: {
    id: string;
    name: string;
    email?: string;
  };
  trackingCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
}

export interface CreateOrderData {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  notes?: string;
}

interface OrderStore {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createOrder: (orderData: CreateOrderData) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: Order['paymentStatus']) => Promise<void>;
  addTrackingCode: (orderId: string, trackingCode: string) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByUser: (userId: string) => Order[];
  getOrdersByStore: (storeId: string) => Order[];
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  refundOrder: (orderId: string, reason?: string) => Promise<void>;
  setCurrentOrder: (order: Order | null) => void;
  clearError: () => void;
  loadOrders: () => Promise<void>;
}

// Mock data for development
const mockOrders: Order[] = [
  {
    id: 'ORD001',
    userId: 'user1',
    status: 'delivered',
    items: [
      {
        id: 'item1',
        productId: 'prod1',
        name: 'Samsung Galaxy S24 Ultra 256GB',
        price: 4299.99,
        quantity: 1,
        image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung%20galaxy%20s24%20ultra&image_size=square'
      }
    ],
    subtotal: 4299.99,
    shipping: 0,
    tax: 0,
    total: 4299.99,
    paymentMethod: 'PIX',
    paymentStatus: 'paid',
    shippingAddress: {
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 45',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      country: 'Brasil'
    },
    store: {
      id: 'store1',
      name: 'TechStore Premium',
      email: 'contato@techstore.com'
    },
    trackingCode: 'BR123456789',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    estimatedDelivery: new Date('2024-01-20'),
    deliveredAt: new Date('2024-01-20')
  },
  {
    id: 'ORD002',
    userId: 'user1',
    status: 'shipped',
    items: [
      {
        id: 'item2',
        productId: 'prod4',
        name: 'Smart TV LG 55" 4K UHD',
        price: 1899.99,
        quantity: 1,
        image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=lg%20smart%20tv%2055%20inch&image_size=square'
      }
    ],
    subtotal: 1899.99,
    shipping: 50.00,
    tax: 0,
    total: 1949.99,
    paymentMethod: 'Cartão de Crédito',
    paymentStatus: 'paid',
    shippingAddress: {
      street: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      country: 'Brasil'
    },
    store: {
      id: 'store2',
      name: 'LG Electronics',
      email: 'vendas@lg.com.br'
    },
    trackingCode: 'BR987654321',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-25'),
    estimatedDelivery: new Date('2024-01-27')
  },
  {
    id: 'ORD003',
    userId: 'user1',
    status: 'confirmed',
    items: [
      {
        id: 'item3',
        productId: 'prod5',
        name: 'Tênis Nike Air Max 270',
        price: 399.99,
        quantity: 1,
        image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=nike%20air%20max%20270%20sneakers&image_size=square'
      },
      {
        id: 'item4',
        productId: 'prod6',
        name: 'Cafeteira Nespresso Essenza Mini',
        price: 299.99,
        quantity: 1,
        image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=nespresso%20essenza%20mini%20coffee%20machine&image_size=square'
      }
    ],
    subtotal: 699.98,
    shipping: 25.00,
    tax: 0,
    total: 724.98,
    paymentMethod: 'PIX',
    paymentStatus: 'paid',
    shippingAddress: {
      street: 'Rua Augusta',
      number: '500',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01305-000',
      country: 'Brasil'
    },
    store: {
      id: 'store3',
      name: 'Nike Store',
      email: 'atendimento@nike.com.br'
    },
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22'),
    estimatedDelivery: new Date('2024-01-29')
  }
];

const generateOrderId = (): string => {
  return 'ORD' + Date.now().toString().slice(-6);
};

const calculateOrderTotals = (items: OrderItem[], shipping: number = 0, tax: number = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + shipping + tax;
  return { subtotal, total };
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: [],
      currentOrder: null,
      isLoading: false,
      error: null,

      createOrder: async (orderData: CreateOrderData) => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { subtotal, total } = calculateOrderTotals(orderData.items, 25.00); // Default shipping
          
          const newOrder: Order = {
            id: generateOrderId(),
            userId: 'current-user', // In real app, get from auth
            status: 'pending',
            items: orderData.items,
            subtotal,
            shipping: 25.00,
            tax: 0,
            total,
            paymentMethod: orderData.paymentMethod,
            paymentStatus: 'pending',
            shippingAddress: orderData.shippingAddress,
            store: {
              id: 'default-store',
              name: 'Marketplace Store'
            },
            notes: orderData.notes,
            createdAt: new Date(),
            updatedAt: new Date(),
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          };
          
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
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            orders: state.orders.map(order => 
              order.id === orderId 
                ? { 
                    ...order, 
                    status, 
                    updatedAt: new Date(),
                    deliveredAt: status === 'delivered' ? new Date() : order.deliveredAt
                  }
                : order
            ),
            currentOrder: state.currentOrder?.id === orderId 
              ? { 
                  ...state.currentOrder, 
                  status, 
                  updatedAt: new Date(),
                  deliveredAt: status === 'delivered' ? new Date() : state.currentOrder.deliveredAt
                }
              : state.currentOrder,
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

      updatePaymentStatus: async (orderId: string, status: Order['paymentStatus']) => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            orders: state.orders.map(order => 
              order.id === orderId 
                ? { ...order, paymentStatus: status, updatedAt: new Date() }
                : order
            ),
            currentOrder: state.currentOrder?.id === orderId 
              ? { ...state.currentOrder, paymentStatus: status, updatedAt: new Date() }
              : state.currentOrder,
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao atualizar pagamento',
            isLoading: false 
          });
          throw error;
        }
      },

      addTrackingCode: async (orderId: string, trackingCode: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            orders: state.orders.map(order => 
              order.id === orderId 
                ? { ...order, trackingCode, status: 'shipped', updatedAt: new Date() }
                : order
            ),
            currentOrder: state.currentOrder?.id === orderId 
              ? { ...state.currentOrder, trackingCode, status: 'shipped', updatedAt: new Date() }
              : state.currentOrder,
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

      getOrderById: (orderId: string) => {
        return get().orders.find(order => order.id === orderId);
      },

      getOrdersByUser: (userId: string) => {
        return get().orders.filter(order => order.userId === userId);
      },

      getOrdersByStore: (storeId: string) => {
        return get().orders.filter(order => order.store.id === storeId);
      },

      cancelOrder: async (orderId: string, reason?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set(state => ({
            orders: state.orders.map(order => 
              order.id === orderId 
                ? { 
                    ...order, 
                    status: 'cancelled', 
                    notes: reason ? `${order.notes || ''} Cancelado: ${reason}`.trim() : order.notes,
                    updatedAt: new Date() 
                  }
                : order
            ),
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

      refundOrder: async (orderId: string, reason?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          set(state => ({
            orders: state.orders.map(order => 
              order.id === orderId 
                ? { 
                    ...order, 
                    status: 'refunded',
                    paymentStatus: 'refunded',
                    notes: reason ? `${order.notes || ''} Reembolsado: ${reason}`.trim() : order.notes,
                    updatedAt: new Date() 
                  }
                : order
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao processar reembolso',
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
      },

      loadOrders: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // In development, load mock data
          set({ 
            orders: mockOrders,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao carregar pedidos',
            isLoading: false 
          });
          throw error;
        }
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