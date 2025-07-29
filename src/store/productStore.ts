import { create } from 'zustand';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  brand: string;
  condition: 'new' | 'used' | 'refurbished';
  description: string;
  seller: string;
  store: string;
  location: string;
  rating: number;
  reviews: number;
  sold: number;
  stock: number;
  freeShipping: boolean;
  shipping: {
    free: boolean;
    price?: number;
    estimatedDays: number;
  };
  specifications?: { key: string; value: string }[];
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
  storeId: string;
  sellerId?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isFeatured?: boolean;
  tags?: string[];
  discount?: number;
}

export interface ProductFilters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  brands: string[];
  conditions: string[];
  freeShippingOnly: boolean;
  minRating: number;
  location: string;
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
}

interface ProductStore {
  products: Product[];
  filteredProducts: Product[];
  filters: ProductFilters;
  loading: boolean;
  error: string | null;
  
  // Actions
  setProducts: (products: Product[]) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getProductById: (id: string) => Product | undefined;
  getProductsByStore: (storeId: string) => Product[];
  getFeaturedProducts: () => Product[];
  getRelatedProducts: (productId: string, limit?: number) => Product[];
}

const defaultFilters: ProductFilters = {
  search: '',
  category: 'Todos',
  minPrice: 0,
  maxPrice: 10000,
  brands: [],
  conditions: [],
  freeShippingOnly: false,
  minRating: 0,
  location: '',
  sortBy: 'relevance'
};

// Mock data para desenvolvimento
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    description: 'Smartphone Samsung Galaxy S24 Ultra com 256GB de armazenamento, câmera de 200MP, tela Dynamic AMOLED 2X de 6.8 polegadas e S Pen integrada.',
    price: 4299.99,
    originalPrice: 4799.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung%20galaxy%20s24%20ultra%20product%20photography%20white%20background&image_size=square',
    images: [
      'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung%20galaxy%20s24%20ultra%20front%20view%20product%20photography&image_size=square',
      'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung%20galaxy%20s24%20ultra%20back%20view%20product%20photography&image_size=square'
    ],
    store: 'TechStore Premium',
    storeId: 'store_1',
    location: 'São Paulo, SP',
    rating: 4.8,
    reviews: 1247,
    category: 'Eletrônicos',
    brand: 'Samsung',
    condition: 'new',
    shipping: { free: true, estimatedDays: 4 },
    isFeatured: true,
    discount: 10,
    stock: 15,
    status: 'active',
    tags: ['smartphone', 'android', 'camera', 's-pen'],
    specifications: [
      { key: 'Tela', value: '6.8" Dynamic AMOLED 2X' },
      { key: 'Processador', value: 'Snapdragon 8 Gen 3' },
      { key: 'RAM', value: '12GB' },
      { key: 'Armazenamento', value: '256GB' },
      { key: 'Câmera', value: '200MP + 50MP + 12MP + 10MP' },
      { key: 'Bateria', value: '5000mAh' }
    ],
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-20T00:00:00.000Z',
    seller: 'TechStore Premium',
     sold: 150,
    freeShipping: true,
    sellerId: 'seller_1',
    weight: 0.233,
    dimensions: {
      length: 16.27,
      width: 7.91,
      height: 0.86
    }
  },
  {
    id: '2',
    name: 'iPhone 15 Pro Max 256GB',
    description: 'iPhone 15 Pro Max com chip A17 Pro, sistema de câmera Pro com zoom óptico 5x, Action Button e construção em titânio.',
    price: 5299.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=iphone%2015%20pro%20max%20titanium%20product%20photography%20white%20background&image_size=square',
    store: 'Apple Store Oficial',
    storeId: 'store_2',
    location: 'Rio de Janeiro, RJ',
    rating: 4.9,
    reviews: 892,
    category: 'Eletrônicos',
    brand: 'Apple',
    condition: 'new',
    shipping: { free: true, estimatedDays: 2 },
    isFeatured: true,
    stock: 8,
    status: 'active',
    tags: ['iphone', 'ios', 'titanium', 'pro'],
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-18T00:00:00.000Z',
    seller: 'Apple Store Oficial',
     sold: 320,
    freeShipping: true,
    sellerId: 'seller_2',
    weight: 0.221,
    dimensions: {
      length: 15.99,
      width: 7.69,
      height: 0.83
    }
  },
  {
    id: '3',
    name: 'Notebook Dell Inspiron 15 3000',
    description: 'Notebook Dell Inspiron 15 com processador Intel Core i5, 8GB RAM, SSD 256GB, tela Full HD de 15.6 polegadas.',
    price: 2199.99,
    originalPrice: 2599.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=dell%20inspiron%20laptop%20silver%20product%20photography%20white%20background&image_size=square',
    store: 'Dell Store',
    storeId: 'store_3',
    location: 'Belo Horizonte, MG',
    rating: 4.5,
    reviews: 543,
    category: 'Eletrônicos',
    brand: 'Dell',
    condition: 'new',
    shipping: { free: false, price: 49.99, estimatedDays: 7 },
    discount: 15,
    stock: 25,
    status: 'active',
    tags: ['notebook', 'intel', 'ssd', 'fullhd'],
    createdAt: '2024-01-12T00:00:00.000Z',
    updatedAt: '2024-01-19T00:00:00.000Z',
    seller: 'Dell Store',
     sold: 89,
    freeShipping: false,
    sellerId: 'seller_3',
    weight: 1.83,
    dimensions: {
      length: 35.8,
      width: 23.6,
      height: 1.99
    }
  },
  {
    id: '4',
    name: 'Smart TV LG 55" 4K UHD',
    description: 'Smart TV LG 55 polegadas com resolução 4K UHD, WebOS, HDR10 Pro, ThinQ AI e controle remoto Magic.',
    price: 1899.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=lg%20smart%20tv%2055%20inch%204k%20product%20photography%20white%20background&image_size=square',
    store: 'LG Electronics',
    storeId: 'store_4',
    location: 'São Paulo, SP',
    rating: 4.6,
    reviews: 321,
    category: 'Eletrônicos',
    brand: 'LG',
    condition: 'new',
    shipping: { free: true, estimatedDays: 5 },
    stock: 12,
    status: 'active',
    tags: ['tv', 'smart', '4k', 'webos'],
    createdAt: '2024-01-08T00:00:00.000Z',
    updatedAt: '2024-01-16T00:00:00.000Z',
    seller: 'LG Electronics',
     sold: 67,
    freeShipping: true,
    sellerId: 'seller_4',
    weight: 15.9,
    dimensions: {
      length: 123.9,
      width: 71.4,
      height: 8.29
    }
  },
  {
    id: '5',
    name: 'Tênis Nike Air Max 270',
    description: 'Tênis Nike Air Max 270 com tecnologia Air Max visível, cabedal em mesh respirável e design moderno.',
    price: 399.99,
    originalPrice: 499.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=nike%20air%20max%20270%20sneakers%20white%20product%20photography%20white%20background&image_size=square',
    store: 'Nike Store',
    storeId: 'store_5',
    location: 'Rio de Janeiro, RJ',
    rating: 4.7,
    reviews: 1156,
    category: 'Roupas',
    brand: 'Nike',
    condition: 'new',
    shipping: { free: true, estimatedDays: 3 },
    discount: 20,
    stock: 30,
    status: 'active',
    tags: ['tênis', 'nike', 'air-max', 'esporte'],
    createdAt: '2024-01-14T00:00:00.000Z',
    updatedAt: '2024-01-21T00:00:00.000Z',
    seller: 'Nike Store',
     sold: 245,
    freeShipping: true,
    sellerId: 'seller_5',
    weight: 0.35,
    dimensions: {
      length: 32.0,
      width: 21.0,
      height: 12.0
    }
  },
  {
    id: '6',
    name: 'Cafeteira Nespresso Essenza Mini',
    description: 'Cafeteira Nespresso Essenza Mini compacta, sistema de cápsulas, 19 bar de pressão e aquecimento rápido.',
    price: 299.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=nespresso%20essenza%20mini%20coffee%20machine%20black%20product%20photography%20white%20background&image_size=square',
    store: 'Nespresso Store',
    storeId: 'store_6',
    location: 'Brasília, DF',
    rating: 4.4,
    reviews: 789,
    category: 'Casa e Jardim',
    brand: 'Nespresso',
    condition: 'new',
    shipping: { free: false, price: 29.99, estimatedDays: 6 },
    stock: 18,
    status: 'active',
    tags: ['cafeteira', 'nespresso', 'cápsulas', 'compacta'],
    createdAt: '2024-01-11T00:00:00.000Z',
    updatedAt: '2024-01-17T00:00:00.000Z',
    seller: 'Nespresso Store',
     sold: 134,
    freeShipping: false,
    sellerId: 'seller_6',
    weight: 2.3,
    dimensions: {
      length: 8.4,
      width: 33.0,
      height: 20.4
    }
  }
];

export const useProductStore = create<ProductStore>((set, get) => ({
  products: mockProducts,
  filteredProducts: mockProducts,
  filters: defaultFilters,
  loading: false,
  error: null,

  setProducts: (products) => {
    set({ products });
    get().applyFilters();
  },

  addProduct: (productData) => {
    const newProduct: Product = {
      ...productData,
      id: `product_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    set((state) => ({ 
      products: [...state.products, newProduct] 
    }));
    get().applyFilters();
  },

  updateProduct: (id, updates) => {
    set((state) => ({
      products: state.products.map(product => 
        product.id === id 
          ? { ...product, ...updates, updatedAt: new Date().toISOString() }
          : product
      )
    }));
    get().applyFilters();
  },

  deleteProduct: (id) => {
    set((state) => ({
      products: state.products.filter(product => product.id !== id)
    }));
    get().applyFilters();
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }));
    get().applyFilters();
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().applyFilters();
  },

  applyFilters: () => {
    const { products, filters } = get();
    
    let filtered = products.filter(product => {
      // Filtro de busca
      const searchMatch = !filters.search || 
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.store.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.brand.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.description.toLowerCase().includes(filters.search.toLowerCase());
      
      // Filtro de categoria
      const categoryMatch = filters.category === 'Todos' || product.category === filters.category;
      
      // Filtro de preço
      const priceMatch = product.price >= filters.minPrice && product.price <= filters.maxPrice;
      
      // Filtro de marca
      const brandMatch = filters.brands.length === 0 || filters.brands.includes(product.brand);
      
      // Filtro de condição
      const conditionMatch = filters.conditions.length === 0 || filters.conditions.includes(product.condition);
      
      // Filtro de frete grátis
      const shippingMatch = !filters.freeShippingOnly || product.shipping.free;
      
      // Filtro de avaliação
      const ratingMatch = product.rating >= filters.minRating;
      
      // Filtro de localização
      const locationMatch = !filters.location || 
        product.location.toLowerCase().includes(filters.location.toLowerCase());
      
      return searchMatch && categoryMatch && priceMatch && brandMatch && 
             conditionMatch && shippingMatch && ratingMatch && locationMatch;
    });

    // Aplicar ordenação
    switch (filters.sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        filtered.sort((a, b) => b.reviews - a.reviews);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default: // relevance
        filtered.sort((a, b) => {
          // Produtos em destaque primeiro
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          // Depois por avaliação
          return b.rating - a.rating;
        });
    }

    set({ filteredProducts: filtered });
  },

  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  getProductById: (id) => {
    return get().products.find(product => product.id === id);
  },

  getProductsByStore: (storeId) => {
    return get().products.filter(product => product.storeId === storeId);
  },

  getFeaturedProducts: () => {
    return get().products.filter(product => product.isFeatured).slice(0, 8);
  },

  getRelatedProducts: (productId, limit = 4) => {
    const product = get().getProductById(productId);
    if (!product) return [];
    
    return get().products
      .filter(p => p.id !== productId && p.category === product.category)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }
}));

export default useProductStore;