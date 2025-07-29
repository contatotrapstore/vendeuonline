import { create } from 'zustand';

export interface PaymentMethod {
  id: string;
  type: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
  name: string;
  icon: string;
  enabled: boolean;
  processingTime: string;
  fee?: number;
}

export interface PaymentData {
  method: PaymentMethod;
  amount: number;
  installments?: number;
  cardData?: {
    number: string;
    holderName: string;
    expiryDate: string;
    cvv: string;
    cpf: string;
  };
  pixData?: {
    cpf: string;
    email: string;
  };
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled';
  pixCode?: string;
  pixQrCode?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface PaymentStore {
  payments: Payment[];
  currentPayment: Payment | null;
  isProcessing: boolean;
  error: string | null;
  
  // Payment methods
  paymentMethods: PaymentMethod[];
  
  // Actions
  createPayment: (orderId: string, paymentData: PaymentData) => Promise<Payment>;
  processPayment: (paymentId: string) => Promise<boolean>;
  getPayment: (paymentId: string) => Payment | null;
  getPaymentsByOrder: (orderId: string) => Payment[];
  updatePaymentStatus: (paymentId: string, status: Payment['status']) => void;
  generatePixCode: (amount: number) => string;
  generatePixQrCode: (pixCode: string) => string;
  clearError: () => void;
  setCurrentPayment: (payment: Payment | null) => void;
}

// Mock payment methods
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pix',
    type: 'pix',
    name: 'PIX',
    icon: '🔄',
    enabled: true,
    processingTime: 'Instantâneo',
    fee: 0
  },
  {
    id: 'credit_card',
    type: 'credit_card',
    name: 'Cartão de Crédito',
    icon: '💳',
    enabled: true,
    processingTime: '1-2 dias úteis',
    fee: 3.99
  },
  {
    id: 'debit_card',
    type: 'debit_card',
    name: 'Cartão de Débito',
    icon: '💳',
    enabled: true,
    processingTime: 'Instantâneo',
    fee: 2.99
  },
  {
    id: 'boleto',
    type: 'boleto',
    name: 'Boleto Bancário',
    icon: '📄',
    enabled: true,
    processingTime: '1-3 dias úteis',
    fee: 0
  }
];

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  payments: [],
  currentPayment: null,
  isProcessing: false,
  error: null,
  paymentMethods: mockPaymentMethods,

  createPayment: async (orderId: string, paymentData: PaymentData) => {
    set({ isProcessing: true, error: null });
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const payment: Payment = {
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderId,
        amount: paymentData.amount,
        method: paymentData.method,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        transactionId: `txn_${Date.now()}`
      };

      // Generate PIX code and QR code for PIX payments
      if (paymentData.method.type === 'pix') {
        payment.pixCode = get().generatePixCode(paymentData.amount);
        payment.pixQrCode = get().generatePixQrCode(payment.pixCode);
        payment.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      set(state => ({
        payments: [...state.payments, payment],
        currentPayment: payment,
        isProcessing: false
      }));

      return payment;
    } catch (error) {
      set({ 
        error: 'Erro ao criar pagamento. Tente novamente.',
        isProcessing: false 
      });
      throw error;
    }
  },

  processPayment: async (paymentId: string) => {
    set({ isProcessing: true, error: null });
    
    try {
      const payment = get().getPayment(paymentId);
      if (!payment) {
        throw new Error('Pagamento não encontrado');
      }

      // Update status to processing
      get().updatePaymentStatus(paymentId, 'processing');

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success/failure (90% success rate)
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        get().updatePaymentStatus(paymentId, 'approved');
        set({ isProcessing: false });
        return true;
      } else {
        get().updatePaymentStatus(paymentId, 'rejected');
        set({ 
          error: 'Pagamento rejeitado. Verifique os dados e tente novamente.',
          isProcessing: false 
        });
        return false;
      }
    } catch (error) {
      set({ 
        error: 'Erro ao processar pagamento. Tente novamente.',
        isProcessing: false 
      });
      return false;
    }
  },

  getPayment: (paymentId: string) => {
    return get().payments.find(p => p.id === paymentId) || null;
  },

  getPaymentsByOrder: (orderId: string) => {
    return get().payments.filter(p => p.orderId === orderId);
  },

  updatePaymentStatus: (paymentId: string, status: Payment['status']) => {
    set(state => ({
      payments: state.payments.map(payment => 
        payment.id === paymentId 
          ? { ...payment, status, updatedAt: new Date() }
          : payment
      ),
      currentPayment: state.currentPayment?.id === paymentId 
        ? { ...state.currentPayment, status, updatedAt: new Date() }
        : state.currentPayment
    }));
  },

  generatePixCode: (amount: number) => {
    // Generate a mock PIX code
    const timestamp = Date.now().toString();
    const randomPart = Math.random().toString(36).substr(2, 10).toUpperCase();
    return `00020126580014BR.GOV.BCB.PIX0136${timestamp}${randomPart}5204000053039865802BR5925MARKETPLACE MULTIVENDEDOR6009SAO PAULO62070503***6304${amount.toFixed(2).replace('.', '')}`;
  },

  generatePixQrCode: (pixCode: string) => {
    // In a real implementation, this would generate an actual QR code
    // For now, we'll return a placeholder URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;
  },

  clearError: () => {
    set({ error: null });
  },

  setCurrentPayment: (payment: Payment | null) => {
    set({ currentPayment: payment });
  }
}));

// Hook for easier usage
export const usePayment = () => {
  const store = usePaymentStore();
  
  return {
    ...store,
    isPixPayment: store.currentPayment?.method.type === 'pix',
    isCardPayment: ['credit_card', 'debit_card'].includes(store.currentPayment?.method.type || ''),
    isPending: store.currentPayment?.status === 'pending',
    isProcessing: store.currentPayment?.status === 'processing',
    isApproved: store.currentPayment?.status === 'approved',
    isRejected: store.currentPayment?.status === 'rejected'
  };
};