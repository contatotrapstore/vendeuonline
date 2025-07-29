# 🛠️ Roadmap Técnico - Implementação MVP

## 📋 Visão Geral Técnica

Este documento fornece especificações técnicas detalhadas para implementar as próximas funcionalidades do marketplace, seguindo as melhores práticas de desenvolvimento e arquitetura modular.

---

## 🏗️ Arquitetura Atual

### Stack Tecnológico
- **Frontend**: Next.js 14+ com TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Notifications**: Sonner

### Estrutura de Pastas
```
src/
├── app/                 # App Router (Next.js 14)
├── components/          # Componentes reutilizáveis
├── hooks/              # Custom hooks
├── store/              # Zustand stores
├── types/              # TypeScript types
└── utils/              # Funções utilitárias
```

---

## 🔥 FASE 1: SISTEMA DE PAGAMENTOS

### 1.1 Payment Store (Zustand)

**Arquivo**: `src/store/paymentStore.ts`

```typescript
interface PaymentMethod {
  id: string;
  type: 'pix' | 'credit_card' | 'debit_card';
  name: string;
  icon: string;
}

interface PaymentData {
  method: PaymentMethod;
  amount: number;
  orderId: string;
  pixCode?: string;
  qrCode?: string;
}

interface PaymentState {
  // Estado
  currentPayment: PaymentData | null;
  paymentStatus: 'idle' | 'processing' | 'completed' | 'failed';
  paymentMethods: PaymentMethod[];
  
  // Ações
  initializePayment: (data: PaymentData) => void;
  processPixPayment: (orderId: string) => Promise<void>;
  checkPaymentStatus: (paymentId: string) => Promise<void>;
  resetPayment: () => void;
}
```

### 1.2 Páginas de Pagamento

#### Página: `/checkout`
**Arquivo**: `src/app/checkout/page.tsx`

**Funcionalidades**:
- Resumo do pedido
- Seleção de método de pagamento
- Formulário de dados de entrega
- Cálculo de frete (simulado)
- Aplicação de cupons de desconto

**Componentes necessários**:
- `OrderSummary`: Resumo dos produtos
- `PaymentMethodSelector`: Seleção de pagamento
- `ShippingForm`: Dados de entrega
- `CouponInput`: Campo de cupom

#### Página: `/payment/success`
**Arquivo**: `src/app/payment/success/page.tsx`

**Funcionalidades**:
- Confirmação de pagamento
- Detalhes do pedido
- Informações de entrega
- Botão para acompanhar pedido

#### Página: `/payment/pix`
**Arquivo**: `src/app/payment/pix/page.tsx`

**Funcionalidades**:
- QR Code para pagamento PIX
- Código PIX copiável
- Timer de expiração
- Verificação automática de pagamento
- Instruções de pagamento

### 1.3 Componentes de Pagamento

#### `PaymentForm`
**Arquivo**: `src/components/payment/PaymentForm.tsx`

```typescript
interface PaymentFormProps {
  totalAmount: number;
  onPaymentSubmit: (data: PaymentData) => void;
  loading?: boolean;
}
```

#### `PixPayment`
**Arquivo**: `src/components/payment/PixPayment.tsx`

```typescript
interface PixPaymentProps {
  pixCode: string;
  qrCode: string;
  amount: number;
  expiresAt: Date;
  onPaymentConfirmed: () => void;
}
```

---

## 📦 FASE 2: GESTÃO DE PRODUTOS

### 2.1 Product Store Expandido

**Arquivo**: `src/store/productStore.ts` (expandir existente)

```typescript
interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  images: File[];
  stock: number;
  sku?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

interface ProductState {
  // Estado existente...
  
  // Novos estados
  userProducts: Product[];
  productForm: ProductFormData | null;
  uploadProgress: number;
  
  // Novas ações
  createProduct: (data: ProductFormData) => Promise<void>;
  updateProduct: (id: string, data: Partial<ProductFormData>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  uploadImages: (files: File[]) => Promise<string[]>;
  getUserProducts: (userId: string) => Promise<void>;
}
```

### 2.2 Páginas de Gestão de Produtos

#### Página: `/seller/products`
**Arquivo**: `src/app/seller/products/page.tsx`

**Funcionalidades**:
- Lista de produtos do vendedor
- Filtros: status, categoria, estoque
- Busca por nome/SKU
- Ações em massa: ativar/desativar
- Paginação
- Estatísticas: total produtos, em estoque, esgotados

**Componentes**:
- `ProductTable`: Tabela de produtos
- `ProductFilters`: Filtros e busca
- `ProductStats`: Estatísticas
- `BulkActions`: Ações em massa

#### Página: `/seller/products/new`
**Arquivo**: `src/app/seller/products/new/page.tsx`

**Funcionalidades**:
- Formulário completo de produto
- Upload múltiplo de imagens
- Preview do produto
- Validação em tempo real
- Salvamento como rascunho

#### Página: `/seller/products/[id]/edit`
**Arquivo**: `src/app/seller/products/[id]/edit/page.tsx`

**Funcionalidades**:
- Edição de produto existente
- Histórico de alterações
- Comparação antes/depois
- Controle de versões

### 2.3 Componentes de Produto

#### `ProductForm`
**Arquivo**: `src/components/product/ProductForm.tsx`

```typescript
interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  loading?: boolean;
  mode: 'create' | 'edit';
}
```

#### `ImageUpload`
**Arquivo**: `src/components/product/ImageUpload.tsx`

```typescript
interface ImageUploadProps {
  maxFiles?: number;
  maxSize?: number; // em MB
  acceptedTypes?: string[];
  onUpload: (files: File[]) => void;
  existingImages?: string[];
}
```

#### `StockManager`
**Arquivo**: `src/components/product/StockManager.tsx`

```typescript
interface StockManagerProps {
  currentStock: number;
  onStockUpdate: (newStock: number) => void;
  lowStockThreshold?: number;
}
```

---

## 🛒 FASE 3: SISTEMA DE PEDIDOS

### 3.1 Order Store

**Arquivo**: `src/store/orderStore.ts`

```typescript
interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

interface Order {
  id: string;
  userId: string;
  storeId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: Address;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

type OrderStatus = 
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  orderHistory: Order[];
  
  createOrder: (items: OrderItem[], shippingData: Address) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrderHistory: (userId: string) => Promise<void>;
  getSellerOrders: (storeId: string) => Promise<void>;
}
```

### 3.2 Cart Store

**Arquivo**: `src/store/cartStore.ts`

```typescript
interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}
```

### 3.3 Páginas de Pedidos

#### Página: `/cart`
**Arquivo**: `src/app/cart/page.tsx`

**Funcionalidades**:
- Lista de produtos no carrinho
- Atualização de quantidades
- Remoção de itens
- Cálculo de totais
- Aplicação de cupons
- Botão finalizar compra

#### Página: `/buyer/orders`
**Arquivo**: `src/app/buyer/orders/page.tsx`

**Funcionalidades**:
- Histórico de pedidos
- Filtros por status e data
- Detalhes de cada pedido
- Rastreamento de entrega
- Avaliação de produtos

#### Página: `/seller/orders`
**Arquivo**: `src/app/seller/orders/page.tsx`

**Funcionalidades**:
- Pedidos recebidos
- Atualização de status
- Informações de entrega
- Comunicação com comprador
- Relatórios de vendas

---

## 🎨 FASE 4: COMPONENTES UI

### 4.1 Componentes de Feedback

#### `Modal`
**Arquivo**: `src/components/ui/Modal.tsx`

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

#### `Loading`
**Arquivo**: `src/components/ui/Loading.tsx`

```typescript
interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  overlay?: boolean;
}
```

#### `Skeleton`
**Arquivo**: `src/components/ui/Skeleton.tsx`

```typescript
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}
```

### 4.2 Navegação Aprimorada

#### `Breadcrumbs`
**Arquivo**: `src/components/navigation/Breadcrumbs.tsx`

```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}
```

#### `SearchWithAutocomplete`
**Arquivo**: `src/components/search/SearchWithAutocomplete.tsx`

```typescript
interface SearchResult {
  id: string;
  title: string;
  type: 'product' | 'store' | 'category';
  image?: string;
}

interface SearchProps {
  onSearch: (query: string) => void;
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
}
```

---

## 👥 FASE 5: GESTÃO ADMINISTRATIVA

### 5.1 User Management Store

**Arquivo**: `src/store/userManagementStore.ts`

```typescript
interface UserManagementState {
  users: User[];
  pendingApprovals: User[];
  
  getAllUsers: () => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  banUser: (userId: string) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;
}
```

### 5.2 Banner Store

**Arquivo**: `src/store/bannerStore.ts`

```typescript
interface Banner {
  id: string;
  title: string;
  image: string;
  link?: string;
  position: 'hero' | 'sidebar' | 'footer';
  startDate: Date;
  endDate: Date;
  active: boolean;
}

interface BannerState {
  banners: Banner[];
  activeBanners: Banner[];
  
  createBanner: (data: Omit<Banner, 'id'>) => Promise<void>;
  updateBanner: (id: string, data: Partial<Banner>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  getActiveBanners: (position?: string) => Promise<void>;
}
```

---

## 🚀 Cronograma de Implementação

### Semana 1-2: Sistema de Pagamentos
- [ ] Criar paymentStore
- [ ] Implementar páginas de checkout
- [ ] Componentes de pagamento PIX
- [ ] Testes de fluxo

### Semana 3-5: Gestão de Produtos
- [ ] Expandir productStore
- [ ] Páginas CRUD de produtos
- [ ] Sistema de upload de imagens
- [ ] Validações e formulários

### Semana 6-7: Sistema de Pedidos
- [ ] Criar orderStore e cartStore
- [ ] Implementar carrinho de compras
- [ ] Páginas de histórico de pedidos
- [ ] Gestão de status

### Semana 8: Componentes UI
- [ ] Modal, Loading, Skeleton
- [ ] Breadcrumbs e navegação
- [ ] Busca com autocomplete

### Semana 9: Gestão Admin
- [ ] Páginas de gestão de usuários
- [ ] Sistema de banners
- [ ] Relatórios básicos

---

## 📋 Checklist de Qualidade

### Para cada funcionalidade:
- [ ] TypeScript sem erros
- [ ] Componentes responsivos
- [ ] Validação de formulários
- [ ] Estados de loading
- [ ] Tratamento de erros
- [ ] Feedback visual adequado
- [ ] Testes básicos

### Performance:
- [ ] Lazy loading de componentes
- [ ] Otimização de imagens
- [ ] Memoização quando necessário
- [ ] Bundle size otimizado

---

*Este roadmap será atualizado conforme o progresso da implementação. Priorize sempre a funcionalidade core e a experiência do usuário.*