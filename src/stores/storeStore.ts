import { create } from 'zustand';
import { Store } from '@/types';

interface StoreState {
  stores: Store[];
  loading: boolean;
  error: string | null;
  fetchStores: () => Promise<void>;
  addStore: (store: Omit<Store, 'id'>) => void;
  updateStore: (id: string, store: Partial<Store>) => void;
  deleteStore: (id: string) => void;
}

// Mock data para demonstração
const mockStores: Store[] = [
  {
    id: '1',
    sellerId: 'seller1',
    name: 'TechStore Erechim',
    slug: 'techstore-erechim',
    description: 'Especializada em eletrônicos e tecnologia de ponta. Oferecemos os melhores produtos com garantia e suporte técnico.',
    logo: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=tech%20store%20logo%20electronics&image_size=square',
    banner: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=electronics%20store%20banner&image_size=landscape_16_9',
    address: 'Rua Sete de Setembro, 123 - Centro',
    city: 'Erechim',
    state: 'RS',
    zipCode: '99700-000',
    phone: '(54) 3321-1234',
    email: 'contato@techstore.com.br',
    website: 'https://techstore.com.br',
    socialMedia: {
      instagram: '@techstore_erechim',
      facebook: 'techstore.erechim'
    },
    category: 'electronics',
    isActive: true,
    isVerified: true,
    rating: 4.8,
    reviewCount: 156,
    productCount: 89,
    salesCount: 234,
    plan: 'profissional',
    features: {
      customDomain: true,
      analytics: true,
      promotions: true,
      multiplePayments: true,
      inventory: true,
      reports: true
    },
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      fontFamily: 'Inter',
      layout: 'grid'
    },
    createdAt: new Date('2023-01-15').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    sellerId: 'seller2',
    name: 'Moda & Estilo',
    slug: 'moda-estilo',
    description: 'Roupas e acessórios da moda para toda a família. Qualidade e estilo em um só lugar.',
    logo: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=fashion%20clothing%20store%20logo&image_size=square',
    banner: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=fashion%20clothing%20store%20banner&image_size=landscape_16_9',
    address: 'Av. Maurício Cardoso, 456 - Centro',
    city: 'Erechim',
    state: 'RS',
    zipCode: '99700-001',
    phone: '(54) 3322-5678',
    email: 'vendas@modaestilo.com.br',
    website: 'https://modaestilo.com.br',
    socialMedia: {
      instagram: '@modaestilo_erechim',
      facebook: 'moda.estilo.erechim'
    },
    category: 'clothing',
    isActive: true,
    isVerified: true,
    rating: 4.6,
    reviewCount: 89,
    productCount: 234,
    salesCount: 156,
    plan: 'premium',
    features: {
      customDomain: true,
      analytics: true,
      promotions: true,
      multiplePayments: true,
      inventory: true,
      reports: true
    },
    theme: {
      primaryColor: '#EC4899',
      secondaryColor: '#BE185D',
      fontFamily: 'Poppins',
      layout: 'grid'
    },
    createdAt: new Date('2023-03-20').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    sellerId: 'seller3',
    name: 'Casa & Decoração',
    slug: 'casa-decoracao',
    description: 'Móveis, decoração e utensílios para deixar sua casa ainda mais bonita e funcional.',
    logo: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=home%20decoration%20furniture%20store%20logo&image_size=square',
    banner: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=home%20furniture%20store%20banner&image_size=landscape_16_9',
    address: 'Rua Protásio Alves, 789 - Bairro Fátima',
    city: 'Erechim',
    state: 'RS',
    zipCode: '99700-002',
    phone: '(54) 3323-9012',
    email: 'info@casadecoração.com.br',
    website: 'https://casadecoração.com.br',
    socialMedia: {
      instagram: '@casadecoração_erechim'
    },
    category: 'home',
    isActive: true,
    isVerified: false,
    rating: 4.4,
    reviewCount: 67,
    productCount: 145,
    salesCount: 89,
    plan: 'basico',
    features: {
      customDomain: false,
      analytics: true,
      promotions: false,
      multiplePayments: true,
      inventory: true,
      reports: false
    },
    theme: {
      primaryColor: '#10B981',
      secondaryColor: '#047857',
      fontFamily: 'Roboto',
      layout: 'list'
    },
    createdAt: new Date('2023-06-10').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const useStoreStore = create<StoreState>((set, get) => ({
  stores: [],
  loading: false,
  error: null,

  fetchStores: async () => {
    set({ loading: true, error: null });
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      set({ stores: mockStores, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar lojas', loading: false });
    }
  },

  addStore: (storeData) => {
    const newStore: Store = {
      ...storeData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set(state => ({ stores: [...state.stores, newStore] }));
  },

  updateStore: (id, storeData) => {
    set(state => ({
      stores: state.stores.map(store =>
        store.id === id
          ? { ...store, ...storeData, updatedAt: new Date().toISOString() }
          : store
      )
    }));
  },

  deleteStore: (id) => {
    set(state => ({
      stores: state.stores.filter(store => store.id !== id)
    }));
  }
}));