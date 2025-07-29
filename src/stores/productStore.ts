import { create } from 'zustand';
import { Product } from '@/types';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
}

// Mock data para demonstração
const mockProducts: Product[] = [
  {
    id: '1',
    sellerId: 'seller1',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    description: 'Smartphone Samsung Galaxy S24 Ultra com 256GB de armazenamento, câmera de 200MP e tela de 6.8 polegadas.',
    price: 4299.99,
    category: 'electronics',
    images: [{
      id: '1',
      url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung%20galaxy%20s24%20ultra%20smartphone&image_size=square',
      alt: 'Samsung Galaxy S24 Ultra',
      order: 1,
      isMain: true
    }],
    specifications: [
      { name: 'Armazenamento', value: '256GB' },
      { name: 'Câmera', value: '200MP' },
      { name: 'Tela', value: '6.8 polegadas' }
    ],
    stock: 15,
    minStock: 5,
    isActive: true,
    isFeatured: true,
    tags: ['smartphone', 'samsung', 'android'],
    rating: 4.8,
    reviewCount: 45,
    salesCount: 23,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    sellerId: 'seller2',
    name: 'iPhone 15 Pro Max 512GB',
    description: 'Apple iPhone 15 Pro Max com 512GB, chip A17 Pro, câmera tripla e tela Super Retina XDR de 6.7 polegadas.',
    price: 5299.99,
    category: 'electronics',
    images: [{
      id: '2',
      url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=iphone%2015%20pro%20max%20smartphone&image_size=square',
      alt: 'iPhone 15 Pro Max',
      order: 1,
      isMain: true
    }],
    specifications: [
      { name: 'Armazenamento', value: '512GB' },
      { name: 'Chip', value: 'A17 Pro' },
      { name: 'Tela', value: '6.7 polegadas Super Retina XDR' }
    ],
    stock: 8,
    minStock: 3,
    isActive: true,
    isFeatured: true,
    tags: ['smartphone', 'iphone', 'apple', 'ios'],
    rating: 4.9,
    reviewCount: 67,
    salesCount: 34,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    sellerId: 'seller1',
    name: 'Notebook Dell Inspiron 15',
    description: 'Notebook Dell Inspiron 15 com processador Intel Core i7, 16GB RAM, SSD 512GB e tela Full HD.',
    price: 2899.99,
    category: 'electronics',
    images: [{
      id: '3',
      url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=dell%20inspiron%20laptop%20notebook&image_size=square',
      alt: 'Notebook Dell Inspiron 15',
      order: 1,
      isMain: true
    }],
    specifications: [
      { name: 'Processador', value: 'Intel Core i7' },
      { name: 'Memória RAM', value: '16GB' },
      { name: 'Armazenamento', value: 'SSD 512GB' },
      { name: 'Tela', value: '15.6" Full HD' }
    ],
    stock: 12,
    minStock: 5,
    isActive: true,
    isFeatured: false,
    tags: ['notebook', 'dell', 'laptop', 'computador'],
    rating: 4.6,
    reviewCount: 28,
    salesCount: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    sellerId: 'seller3',
    name: 'Camiseta Polo Masculina',
    description: 'Camiseta polo masculina 100% algodão, disponível em várias cores e tamanhos.',
    price: 89.99,
    category: 'clothing',
    images: [{
      id: '4',
      url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=mens%20polo%20shirt%20clothing&image_size=square',
      alt: 'Camiseta Polo Masculina',
      order: 1,
      isMain: true
    }],
    specifications: [
      { name: 'Material', value: '100% Algodão' },
      { name: 'Tamanhos', value: 'P, M, G, GG' },
      { name: 'Cores', value: 'Azul, Branco, Preto, Cinza' }
    ],
    stock: 25,
    minStock: 10,
    isActive: true,
    isFeatured: false,
    tags: ['camiseta', 'polo', 'masculina', 'algodão'],
    rating: 4.3,
    reviewCount: 12,
    salesCount: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      set({ products: mockProducts, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar produtos', loading: false });
    }
  },

  addProduct: (productData) => {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set(state => ({ products: [...state.products, newProduct] }));
  },

  updateProduct: (id, productData) => {
    set(state => ({
      products: state.products.map(product =>
        product.id === id
          ? { ...product, ...productData, updatedAt: new Date().toISOString() }
          : product
      )
    }));
  },

  deleteProduct: (id) => {
    set(state => ({
      products: state.products.filter(product => product.id !== id)
    }));
  }
}));