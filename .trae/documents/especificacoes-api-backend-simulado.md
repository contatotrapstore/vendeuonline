# 🔌 Especificações API - Backend Simulado

## 📋 Visão Geral

Este documento define as especificações da API que será simulada usando Zustand stores, fornecendo uma base sólida para futura migração para um backend real (NestJS + PostgreSQL).

---

## 🏗️ Arquitetura da Simulação

### Princípios
- **Stores como Serviços**: Cada Zustand store simula um módulo de backend
- **Async/Await**: Simular latência de rede com delays
- **Estado Persistente**: LocalStorage para simular banco de dados
- **Validação**: Zod schemas para validar dados
- **Tipos TypeScript**: Interfaces consistentes com futuro backend

### Estrutura de Resposta Padrão
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
```

---

## 🔐 AUTENTICAÇÃO

### Auth Store
**Arquivo**: `src/store/authStore.ts`

#### Endpoints Simulados

##### POST /auth/login
```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Implementação
const login = async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  await simulateDelay(1000);
  
  // Validar credenciais mock
  const user = mockUsers.find(u => u.email === credentials.email);
  if (!user || user.password !== credentials.password) {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou senha inválidos'
      }
    };
  }
  
  const token = generateMockToken(user);
  return {
    success: true,
    data: { user, token, refreshToken: token }
  };
};
```

##### POST /auth/register
```typescript
interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  userType: 'buyer' | 'seller' | 'admin';
  phone?: string;
}

interface RegisterResponse {
  user: User;
  token: string;
}
```

##### POST /auth/refresh
```typescript
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  token: string;
  refreshToken: string;
}
```

---

## 👥 USUÁRIOS

### User Store
**Arquivo**: `src/store/userStore.ts`

#### Endpoints Simulados

##### GET /users
```typescript
interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  userType?: 'buyer' | 'seller' | 'admin';
  status?: 'active' | 'inactive' | 'pending';
}

interface GetUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}
```

##### GET /users/:id
```typescript
interface GetUserResponse {
  user: User;
}
```

##### PUT /users/:id
```typescript
interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

interface UpdateUserResponse {
  user: User;
}
```

##### DELETE /users/:id
```typescript
interface DeleteUserResponse {
  success: boolean;
}
```

---

## 🏪 LOJAS

### Store Store
**Arquivo**: `src/store/storeStore.ts`

#### Endpoints Simulados

##### GET /stores
```typescript
interface GetStoresQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  region?: string;
}

interface GetStoresResponse {
  stores: Store[];
  total: number;
}
```

##### POST /stores
```typescript
interface CreateStoreRequest {
  name: string;
  description: string;
  subdomain: string;
  category: string;
  address: Address;
  phone: string;
  email: string;
}

interface CreateStoreResponse {
  store: Store;
}
```

##### PUT /stores/:id
```typescript
interface UpdateStoreRequest {
  name?: string;
  description?: string;
  logo?: string;
  banner?: string;
  settings?: StoreSettings;
}
```

---

## 📦 PRODUTOS

### Product Store
**Arquivo**: `src/store/productStore.ts`

#### Endpoints Simulados

##### GET /products
```typescript
interface GetProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  storeId?: string;
  region?: string;
  inStock?: boolean;
}

interface GetProductsResponse {
  products: Product[];
  total: number;
  filters: {
    categories: string[];
    priceRange: { min: number; max: number };
    regions: string[];
  };
}
```

##### GET /products/:id
```typescript
interface GetProductResponse {
  product: Product;
  relatedProducts: Product[];
  store: Store;
}
```

##### POST /products
```typescript
interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  sku?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  specifications?: Record<string, any>;
}

interface CreateProductResponse {
  product: Product;
}
```

##### PUT /products/:id
```typescript
interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  status?: 'active' | 'inactive' | 'draft';
}
```

##### DELETE /products/:id
```typescript
interface DeleteProductResponse {
  success: boolean;
}
```

##### POST /products/:id/images
```typescript
interface UploadImagesRequest {
  images: File[];
}

interface UploadImagesResponse {
  imageUrls: string[];
}
```

---

## 🛒 PEDIDOS

### Order Store
**Arquivo**: `src/store/orderStore.ts`

#### Endpoints Simulados

##### GET /orders
```typescript
interface GetOrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  userId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
}

interface GetOrdersResponse {
  orders: Order[];
  total: number;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  };
}
```

##### GET /orders/:id
```typescript
interface GetOrderResponse {
  order: Order;
  timeline: OrderTimeline[];
}

interface OrderTimeline {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}
```

##### POST /orders
```typescript
interface CreateOrderRequest {
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  couponCode?: string;
}

interface CreateOrderResponse {
  order: Order;
  paymentData?: {
    pixCode?: string;
    qrCode?: string;
    expiresAt?: Date;
  };
}
```

##### PUT /orders/:id/status
```typescript
interface UpdateOrderStatusRequest {
  status: OrderStatus;
  note?: string;
  trackingCode?: string;
}

interface UpdateOrderStatusResponse {
  order: Order;
}
```

---

## 💳 PAGAMENTOS

### Payment Store
**Arquivo**: `src/store/paymentStore.ts`

#### Endpoints Simulados

##### POST /payments/pix
```typescript
interface CreatePixPaymentRequest {
  orderId: string;
  amount: number;
}

interface CreatePixPaymentResponse {
  paymentId: string;
  pixCode: string;
  qrCode: string;
  expiresAt: Date;
}
```

##### GET /payments/:id/status
```typescript
interface GetPaymentStatusResponse {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  paidAt?: Date;
  amount: number;
}
```

##### POST /payments/webhook
```typescript
interface PaymentWebhookData {
  paymentId: string;
  status: string;
  paidAt?: Date;
  amount: number;
}
```

---

## 📊 ANALYTICS

### Analytics Store
**Arquivo**: `src/store/analyticsStore.ts`

#### Endpoints Simulados

##### GET /analytics/dashboard
```typescript
interface DashboardAnalyticsQuery {
  period: '7d' | '30d' | '90d' | '1y';
  storeId?: string;
}

interface DashboardAnalyticsResponse {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
  };
  charts: {
    revenue: ChartData[];
    orders: ChartData[];
    topProducts: ProductAnalytics[];
    topCategories: CategoryAnalytics[];
  };
}

interface ChartData {
  date: string;
  value: number;
}
```

##### GET /analytics/products
```typescript
interface ProductAnalyticsResponse {
  topSelling: ProductAnalytics[];
  lowStock: Product[];
  recentlyAdded: Product[];
  performance: {
    views: number;
    conversions: number;
    conversionRate: number;
  };
}
```

---

## 🎨 BANNERS

### Banner Store
**Arquivo**: `src/store/bannerStore.ts`

#### Endpoints Simulados

##### GET /banners
```typescript
interface GetBannersQuery {
  position?: 'hero' | 'sidebar' | 'footer';
  active?: boolean;
}

interface GetBannersResponse {
  banners: Banner[];
}
```

##### POST /banners
```typescript
interface CreateBannerRequest {
  title: string;
  image: string;
  link?: string;
  position: 'hero' | 'sidebar' | 'footer';
  startDate: Date;
  endDate: Date;
}
```

---

## 🛠️ Utilitários de Simulação

### Arquivo: `src/utils/apiSimulation.ts`

```typescript
// Simular delay de rede
export const simulateDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Gerar ID único
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Simular erro de rede
export const simulateNetworkError = (probability: number = 0.1): boolean => {
  return Math.random() < probability;
};

// Paginar resultados
export const paginateResults = <T>(
  items: T[],
  page: number = 1,
  limit: number = 10
): { items: T[]; total: number; page: number; limit: number } => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    items: items.slice(startIndex, endIndex),
    total: items.length,
    page,
    limit
  };
};

// Filtrar e buscar
export const filterAndSearch = <T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] => {
  if (!searchTerm) return items;
  
  const term = searchTerm.toLowerCase();
  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      return typeof value === 'string' && value.toLowerCase().includes(term);
    })
  );
};
```

### Arquivo: `src/utils/mockData.ts`

```typescript
// Dados mock para desenvolvimento
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin Sistema',
    email: 'admin@marketplace.com',
    password: 'admin123',
    userType: 'admin',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  // ... mais usuários mock
];

export const mockProducts: Product[] = [
  // ... produtos mock
];

export const mockStores: Store[] = [
  // ... lojas mock
];
```

---

## 📋 Checklist de Implementação

### Para cada Store:
- [ ] Definir interfaces TypeScript
- [ ] Implementar métodos CRUD
- [ ] Adicionar validação com Zod
- [ ] Simular delays realistas
- [ ] Implementar tratamento de erros
- [ ] Adicionar persistência localStorage
- [ ] Criar dados mock para testes

### Validações:
- [ ] Schemas Zod para cada endpoint
- [ ] Validação de permissões
- [ ] Sanitização de dados
- [ ] Tratamento de casos edge

### Performance:
- [ ] Memoização de dados
- [ ] Lazy loading quando possível
- [ ] Otimização de re-renders
- [ ] Cache inteligente

---

*Esta especificação serve como base para implementação do backend simulado e futura migração para API real. Mantenha consistência entre os tipos e interfaces.*