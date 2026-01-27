// Tipos de usuário
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "buyer" | "seller" | "admin";
  city: string;
  state: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  // Campos específicos para vendedores
  plan?: SellerPlan;
  planExpiresAt?: string;
  maxAds?: number;
  currentAds?: number;
}

// Tipos de planos para vendedores
export type SellerPlan = "basico" | "profissional" | "premium" | "empresarial";

// Interface para informações do plano
export interface PlanInfo {
  id: SellerPlan;
  name: string;
  price: number;
  period: string;
  maxAds: number;
  validity: number;
  support: string;
  features: string[];
}

export interface Buyer extends User {
  type: "buyer";
  wishlist: string[]; // IDs dos produtos
}

export interface Seller extends User {
  type: "seller";
  storeName: string;
  storeDescription: string;
  storeSlug: string;
  cnpj?: string;
  address: string;
  zipCode: string;
  category: string;
  plan: SellerPlan;
  isActive: boolean;
  rating: number;
  totalSales: number;
  commission: number; // Porcentagem de comissão
}

export interface Admin extends User {
  type: "admin";
  permissions: string[];
  lastLogin: string;
}

// Tipos de produto
export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number; // Preço "de" para mostrar desconto
  category: string | { id: string; name: string; slug: string };
  subcategory?: string;
  images: ProductImage[];
  specifications: ProductSpecification[];
  stock: number;
  minStock: number;
  sku?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  brand?: string;
  model?: string;
  condition?: string;
  isActive: boolean;
  isFeatured: boolean;
  shippingOptions?: string[];
  deliveryOptions?: DeliveryOption[]; // Opções de entrega customizadas
  seoTitle?: string;
  seoDescription?: string;
  rating: number;
  reviewCount: number;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
  // Relação opcional com store (pode ser incluída via join)
  store?: Store;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  order: number;
}

export interface ProductSpecification {
  name: string;
  value: string;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: "cm" | "m";
}

// Opções de entrega customizadas pelo vendedor
export interface DeliveryOption {
  id: string;           // ID único (nanoid)
  name: string;         // Nome da opção (obrigatório) - ex: "Motoboy Erechim"
  prazo?: string;       // Prazo estimado (opcional) - ex: "Mesmo dia"
  valor?: number;       // Valor aproximado (opcional) - ex: 10.00
}

// Tipos de categoria
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  isActive: boolean;
  order: number;
  productCount: number;
  createdAt: string;
}

// Tipos de loja
export interface Store {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  banner?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  whatsapp?: string;
  website?: string;
  socialMedia: StoreSocialMedia;
  category: string;
  policies?: {
    returnPolicy?: string;
    terms?: string;
    privacyPolicy?: string;
  };
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  productCount: number;
  salesCount: number;
  plan: SellerPlan;
  features: StoreFeatures;
  theme: StoreTheme;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
  // Campos opcionais retornados pela API com includes
  seller?: {
    id: string;
    storeName: string;
    rating: number;
    totalSales: number;
    plan?: SellerPlan;
  };
  _count?: {
    products: number;
    reviews: number;
  };
  products?: Product[];
}

export interface StoreSocialMedia {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  whatsapp?: string;
}

export interface StoreFeatures {
  customDomain: boolean;
  analytics: boolean;
  promotions: boolean;
  multiplePayments: boolean;
  inventory: boolean;
  reports: boolean;
}

export interface StoreTheme {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  layout: "grid" | "list" | "masonry";
}

// Tipos de avaliação
export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  productId?: string;
  storeId?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

// Tipos de notificação
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  | "product_sold"
  | "review_received"
  | "stock_low"
  | "promotion_started"
  | "system_update";

// Tipos de analytics
export interface Analytics {
  period: "day" | "week" | "month" | "year";
  startDate: string;
  endDate: string;
  metrics: AnalyticsMetrics;
}

export interface AnalyticsMetrics {
  sales: {
    total: number;
    count: number;
    average: number;
    growth: number;
  };
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
  };
  visitors: {
    total: number;
    unique: number;
    returning: number;
    conversionRate: number;
  };
  topProducts: {
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  topCategories: {
    name: string;
    sales: number;
    revenue: number;
  }[];
}

// Tipos de filtros
export interface ProductFilters {
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  state?: string;
  rating?: number;
  inStock?: boolean;
  featured?: boolean;
  sortBy?: "price_asc" | "price_desc" | "name_asc" | "name_desc" | "rating" | "newest" | "popular";
  page?: number;
  limit?: number;
  search?: string;
}

export interface StoreFilters {
  category?: string;
  city?: string;
  state?: string;
  rating?: number;
  verified?: boolean;
  plan?: "basic" | "premium" | "enterprise";
  sortBy?: "name_asc" | "name_desc" | "rating" | "newest" | "popular";
  page?: number;
  limit?: number;
  search?: string;
}

// Tipos de resposta da API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos de formulários
export interface LoginForm {
  email: string;
  password: string;
  userType: "buyer" | "seller" | "admin";
}

export interface RegisterBuyerForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  city: string;
  state: string;
}

export interface RegisterSellerForm extends RegisterBuyerForm {
  storeName: string;
  storeDescription: string;
  cnpj?: string;
  address: string;
  zipCode: string;
  category: string;
}

export interface ProductForm {
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  condition?: string;
  stock: number;
  minStock: number;
  sku?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  specifications: ProductSpecification[];
  shippingOptions?: string[];
  deliveryOptions?: DeliveryOption[]; // Opções de entrega customizadas
  seoTitle?: string;
  seoDescription?: string;
}

// Tipos de configuração
export interface AppConfig {
  name: string;
  description: string;
  version: string;
  api: {
    baseUrl: string;
    timeout: number;
  };
  features: {
    pwa: boolean;
    analytics: boolean;
    notifications: boolean;
    geolocation: boolean;
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    keywords: string[];
  };
}

// Tipos de erro
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Tipos de eventos
export interface AppEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: string;
}

// Tipos utilitários
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
