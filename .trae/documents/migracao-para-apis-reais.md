# 📋 Migração para APIs Reais - Marketplace Multivendedor

## 1. Visão Geral da Migração

Este documento detalha o processo completo para migrar o projeto de dados mockados (Zustand) para um sistema real com APIs, banco de dados PostgreSQL e autenticação JWT.

### Estado Atual
- ✅ Frontend React/Next.js funcional
- ✅ Stores Zustand com dados mockados
- ✅ Estrutura de pastas API criada (vazia)
- ✅ Configurações de ambiente preparadas

### Estado Final Desejado
- 🎯 APIs REST completas
- 🎯 Banco PostgreSQL com Prisma ORM
- 🎯 Autenticação JWT real
- 🎯 Upload de arquivos funcional
- 🎯 Integração com pagamentos reais
- 🎯 Deploy em produção

## 2. Estrutura do Banco de Dados PostgreSQL

### 2.1 Schema Principal

```sql
-- Usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'seller', 'buyer')),
  city VARCHAR(100),
  state VARCHAR(2),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  permissions TEXT[], -- Para admins
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lojas
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  website TEXT,
  social_media JSONB,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  plan VARCHAR(20) DEFAULT 'basico',
  features JSONB,
  theme JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category VARCHAR(50) NOT NULL,
  brand VARCHAR(100),
  condition VARCHAR(20) DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished')),
  stock INTEGER DEFAULT 0,
  weight DECIMAL(8,3),
  dimensions JSONB,
  images JSONB,
  specifications JSONB,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  subtotal DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_id TEXT,
  shipping_address JSONB NOT NULL,
  tracking_code VARCHAR(100),
  notes TEXT,
  estimated_delivery DATE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens do Pedido
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Avaliações
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[],
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banners Administrativos
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  position VARCHAR(50) DEFAULT 'home',
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Índices para Performance

```sql
-- Índices para usuários
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_active ON users(is_active);

-- Índices para lojas
CREATE INDEX idx_stores_seller ON stores(seller_id);
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_category ON stores(category);
CREATE INDEX idx_stores_active ON stores(is_active);

-- Índices para produtos
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_created ON products(created_at DESC);

-- Índices para pedidos
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Índices para itens do pedido
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Índices para avaliações
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

## 3. Configuração do Prisma ORM

### 3.1 Instalação e Configuração

```bash
npm install prisma @prisma/client
npm install -D prisma
```

### 3.2 Schema Prisma (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String
  email        String   @unique
  phone        String?
  passwordHash String   @map("password_hash")
  userType     UserType @map("user_type")
  city         String?
  state        String?
  avatarUrl    String?  @map("avatar_url")
  isVerified   Boolean  @default(false) @map("is_verified")
  isActive     Boolean  @default(true) @map("is_active")
  permissions  String[]
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relacionamentos
  stores       Store[]
  products     Product[]
  orders       Order[]
  reviews      Review[]

  @@map("users")
}

model Store {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sellerId     String   @map("seller_id") @db.Uuid
  name         String
  slug         String   @unique
  description  String?
  logoUrl      String?  @map("logo_url")
  bannerUrl    String?  @map("banner_url")
  address      String?
  city         String?
  state        String?
  zipCode      String?  @map("zip_code")
  phone        String?
  email        String?
  website      String?
  socialMedia  Json?    @map("social_media")
  category     String?
  isActive     Boolean  @default(true) @map("is_active")
  isVerified   Boolean  @default(false) @map("is_verified")
  rating       Decimal  @default(0) @db.Decimal(3, 2)
  reviewCount  Int      @default(0) @map("review_count")
  productCount Int      @default(0) @map("product_count")
  salesCount   Int      @default(0) @map("sales_count")
  plan         String   @default("basico")
  features     Json?
  theme        Json?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relacionamentos
  seller   User      @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  products Product[]
  orders   Order[]

  @@map("stores")
}

model Product {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sellerId      String      @map("seller_id") @db.Uuid
  storeId       String      @map("store_id") @db.Uuid
  name          String
  description   String?
  price         Decimal     @db.Decimal(10, 2)
  originalPrice Decimal?    @map("original_price") @db.Decimal(10, 2)
  category      String
  brand         String?
  condition     Condition   @default(NEW)
  stock         Int         @default(0)
  weight        Decimal?    @db.Decimal(8, 3)
  dimensions    Json?
  images        Json?
  specifications Json?
  tags          String[]
  isFeatured    Boolean     @default(false) @map("is_featured")
  isActive      Boolean     @default(true) @map("is_active")
  rating        Decimal     @default(0) @db.Decimal(3, 2)
  reviewCount   Int         @default(0) @map("review_count")
  soldCount     Int         @default(0) @map("sold_count")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  // Relacionamentos
  seller     User        @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  store      Store       @relation(fields: [storeId], references: [id], onDelete: Cascade)
  orderItems OrderItem[]
  reviews    Review[]

  @@map("products")
}

model Order {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId            String        @map("user_id") @db.Uuid
  storeId           String        @map("store_id") @db.Uuid
  status            OrderStatus   @default(PENDING)
  subtotal          Decimal       @db.Decimal(10, 2)
  shipping          Decimal       @default(0) @db.Decimal(10, 2)
  tax               Decimal       @default(0) @db.Decimal(10, 2)
  total             Decimal       @db.Decimal(10, 2)
  paymentMethod     String?       @map("payment_method")
  paymentStatus     PaymentStatus @default(PENDING) @map("payment_status")
  paymentId         String?       @map("payment_id")
  shippingAddress   Json          @map("shipping_address")
  trackingCode      String?       @map("tracking_code")
  notes             String?
  estimatedDelivery DateTime?     @map("estimated_delivery") @db.Date
  deliveredAt       DateTime?     @map("delivered_at")
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  // Relacionamentos
  user  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  store Store       @relation(fields: [storeId], references: [id], onDelete: Cascade)
  items OrderItem[]

  @@map("orders")
}

model OrderItem {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId   String   @map("order_id") @db.Uuid
  productId String   @map("product_id") @db.Uuid
  name      String
  price     Decimal  @db.Decimal(10, 2)
  quantity  Int
  imageUrl  String?  @map("image_url")
  createdAt DateTime @default(now()) @map("created_at")

  // Relacionamentos
  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("order_items")
}

model Review {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  productId  String   @map("product_id") @db.Uuid
  orderId    String?  @map("order_id") @db.Uuid
  rating     Int
  comment    String?
  images     String[]
  isVerified Boolean  @default(false) @map("is_verified")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relacionamentos
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("reviews")
}

model Banner {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title       String
  description String?
  imageUrl    String    @map("image_url")
  linkUrl     String?   @map("link_url")
  position    String    @default("home")
  isActive    Boolean   @default(true) @map("is_active")
  startDate   DateTime? @map("start_date")
  endDate     DateTime? @map("end_date")
  clickCount  Int       @default(0) @map("click_count")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@map("banners")
}

enum UserType {
  ADMIN  @map("admin")
  SELLER @map("seller")
  BUYER  @map("buyer")
}

enum Condition {
  NEW          @map("new")
  USED         @map("used")
  REFURBISHED  @map("refurbished")
}

enum OrderStatus {
  PENDING    @map("pending")
  CONFIRMED  @map("confirmed")
  PROCESSING @map("processing")
  SHIPPED    @map("shipped")
  DELIVERED  @map("delivered")
  CANCELLED  @map("cancelled")
  REFUNDED   @map("refunded")
}

enum PaymentStatus {
  PENDING  @map("pending")
  PAID     @map("paid")
  FAILED   @map("failed")
  REFUNDED @map("refunded")
}
```

## 4. Implementação das API Routes

### 4.1 Estrutura de Pastas

```
src/app/api/
├── auth/
│   ├── login/route.ts
│   ├── register/route.ts
│   ├── refresh/route.ts
│   └── logout/route.ts
├── users/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── profile/route.ts
├── stores/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── [slug]/route.ts
├── products/
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── search/route.ts
│   └── featured/route.ts
├── orders/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── status/route.ts
├── reviews/
│   ├── route.ts
│   └── [id]/route.ts
├── banners/
│   ├── route.ts
│   └── [id]/route.ts
├── upload/
│   └── route.ts
├── payments/
│   ├── create/route.ts
│   ├── status/route.ts
│   └── webhook/route.ts
└── analytics/
    ├── route.ts
    ├── sales/route.ts
    └── products/route.ts
```

### 4.2 Utilitários Base

#### lib/prisma.ts
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### lib/auth.ts
```typescript
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET!

export interface JWTPayload {
  userId: string
  email: string
  userType: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export async function getAuthUser(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        isActive: true,
        isVerified: true
      }
    })

    return user
  } catch (error) {
    return null
  }
}

export function requireAuth(userTypes?: string[]) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request)
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (userTypes && !userTypes.includes(user.userType)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return user
  }
}
```

#### lib/api-response.ts
```typescript
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function successResponse<T>(data: T, message?: string): Response {
  return Response.json({
    success: true,
    data,
    message
  } as ApiResponse<T>)
}

export function errorResponse(error: string, status: number = 400): Response {
  return Response.json({
    success: false,
    error
  } as ApiResponse, { status })
}

export function handleApiError(error: any): Response {
  console.error('API Error:', error)
  
  if (error.code === 'P2002') {
    return errorResponse('Dados duplicados', 409)
  }
  
  if (error.code === 'P2025') {
    return errorResponse('Registro não encontrado', 404)
  }
  
  return errorResponse('Erro interno do servidor', 500)
}
```

### 4.3 APIs de Autenticação

#### src/app/api/auth/login/route.ts
```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return errorResponse('Email e senha são obrigatórios')
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    if (!user || !await verifyPassword(password, user.passwordHash)) {
      return errorResponse('Credenciais inválidas', 401)
    }

    if (!user.isActive) {
      return errorResponse('Conta desativada', 401)
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      userType: user.userType
    })

    const { passwordHash, ...userWithoutPassword } = user

    return successResponse({
      user: userWithoutPassword,
      token
    })
  } catch (error) {
    return errorResponse('Erro interno do servidor', 500)
  }
}
```

#### src/app/api/auth/register/route.ts
```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, userType, city, state } = await request.json()

    if (!name || !email || !password || !userType) {
      return errorResponse('Dados obrigatórios não fornecidos')
    }

    if (password.length < 6) {
      return errorResponse('Senha deve ter pelo menos 6 caracteres')
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return errorResponse('Email já cadastrado', 409)
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        userType,
        city,
        state
      }
    })

    // Se for vendedor, criar loja automaticamente
    let store = null
    if (userType === 'SELLER') {
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50)

      store = await prisma.store.create({
        data: {
          sellerId: user.id,
          name: `Loja de ${name.split(' ')[0]}`,
          slug: `${slug}-${Date.now()}`,
          description: `Loja oficial de ${name}`,
          city,
          state
        }
      })
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      userType: user.userType
    })

    const { passwordHash: _, ...userWithoutPassword } = user

    return successResponse({
      user: {
        ...userWithoutPassword,
        store
      },
      token
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 4.4 APIs de Produtos

#### src/app/api/products/route.ts
```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    const where: any = {
      isActive: true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category && category !== 'Todos') {
      where.category = category
    }

    if (minPrice) {
      where.price = { ...where.price, gte: parseFloat(minPrice) }
    }

    if (maxPrice) {
      where.price = { ...where.price, lte: parseFloat(maxPrice) }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              rating: true,
              isVerified: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ])

    return successResponse({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user || user.userType !== 'SELLER') {
      return errorResponse('Acesso negado', 403)
    }

    const data = await request.json()
    
    // Buscar loja do vendedor
    const store = await prisma.store.findFirst({
      where: { sellerId: user.id }
    })

    if (!store) {
      return errorResponse('Loja não encontrada', 404)
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        sellerId: user.id,
        storeId: store.id
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    // Atualizar contador de produtos da loja
    await prisma.store.update({
      where: { id: store.id },
      data: {
        productCount: {
          increment: 1
        }
      }
    })

    return successResponse(product)
  } catch (error) {
    return handleApiError(error)
  }
}
```

## 5. Migração dos Stores Zustand

### 5.1 Novo AuthStore com APIs

#### src/store/authStore.ts
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  city?: string
  state?: string
  userType: 'ADMIN' | 'SELLER' | 'BUYER'
  avatarUrl?: string
  isVerified: boolean
  isActive: boolean
  createdAt: string
  stores?: Array<{
    id: string
    name: string
    slug: string
  }>
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  setLoading: (loading: boolean) => void
  checkAuth: () => Promise<void>
  refreshToken: () => Promise<void>
}

export interface RegisterData {
  name: string
  email: string
  phone?: string
  password: string
  userType: 'SELLER' | 'BUYER'
  city?: string
  state?: string
}

type AuthStore = AuthState & AuthActions

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export const useAuthStore = create<AuthStore>()(persist(
  (set, get) => ({
    // Estado inicial
    user: null,
    isAuthenticated: false,
    isLoading: false,
    token: null,

    // Ações
    login: async (email: string, password: string) => {
      set({ isLoading: true })
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao fazer login')
        }

        set({
          user: result.data.user,
          isAuthenticated: true,
          token: result.data.token,
          isLoading: false
        })
        
      } catch (error) {
        set({ isLoading: false })
        throw error
      }
    },

    register: async (userData: RegisterData) => {
      set({ isLoading: true })
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao criar conta')
        }

        set({
          user: result.data.user,
          isAuthenticated: true,
          token: result.data.token,
          isLoading: false
        })
        
      } catch (error) {
        set({ isLoading: false })
        throw error
      }
    },

    logout: () => {
      set({
        user: null,
        isAuthenticated: false,
        token: null,
        isLoading: false
      })
    },

    updateUser: (userData: Partial<User>) => {
      const { user } = get()
      if (user) {
        set({
          user: { ...user, ...userData }
        })
      }
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    },

    checkAuth: async () => {
      const { token } = get()
      
      if (!token) {
        return
      }
      
      set({ isLoading: true })
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Token inválido')
        }

        const result = await response.json()
        
        set({
          user: result.data,
          isAuthenticated: true,
          isLoading: false
        })
        
      } catch (error) {
        // Token inválido, fazer logout
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          isLoading: false
        })
      }
    },

    refreshToken: async () => {
      const { token } = get()
      
      if (!token) {
        return
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const result = await response.json()
          set({ token: result.data.token })
        }
      } catch (error) {
        console.error('Erro ao renovar token:', error)
      }
    }
  }),
  {
    name: 'auth-storage',
    partialize: (state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      token: state.token
    })
  }
))

// Utilitário para requisições autenticadas
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const { token } = useAuthStore.getState()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  })
  
  if (response.status === 401) {
    // Token expirado, fazer logout
    useAuthStore.getState().logout()
    throw new Error('Sessão expirada')
  }
  
  return response
}
```

### 5.2 Novo ProductStore com APIs

#### src/store/productStore.ts
```typescript
import { create } from 'zustand'
import { apiRequest } from './authStore'

export interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number
  images?: Array<{
    id: string
    url: string
    alt?: string
    order: number
    isMain: boolean
  }>
  category: string
  brand?: string
  condition: 'NEW' | 'USED' | 'REFURBISHED'
  description: string
  stock: number
  rating: number
  reviewCount: number
  soldCount: number
  isFeatured: boolean
  isActive: boolean
  specifications?: Array<{ key: string; value: string }>
  tags: string[]
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  store: {
    id: string
    name: string
    slug: string
    rating: number
    isVerified: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  search: string
  category: string
  minPrice: number
  maxPrice: number
  brands: string[]
  conditions: string[]
  freeShippingOnly: boolean
  minRating: number
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular'
}

interface ProductStore {
  products: Product[]
  filteredProducts: Product[]
  filters: ProductFilters
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  
  // Actions
  fetchProducts: (filters?: Partial<ProductFilters>, page?: number) => Promise<void>
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'store'>) => Promise<Product>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  setFilters: (filters: Partial<ProductFilters>) => void
  resetFilters: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  getProductById: (id: string) => Promise<Product | null>
  getFeaturedProducts: () => Promise<Product[]>
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
  sortBy: 'relevance'
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  filteredProducts: [],
  filters: defaultFilters,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  },

  fetchProducts: async (filters = {}, page = 1) => {
    set({ loading: true, error: null })
    
    try {
      const currentFilters = { ...get().filters, ...filters }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.entries(currentFilters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '' && value !== 0) {
            if (Array.isArray(value)) {
              if (value.length > 0) {
                acc[key] = value.join(',')
              }
            } else {
              acc[key] = value.toString()
            }
          }
          return acc
        }, {} as Record<string, string>)
      })

      const response = await apiRequest(`/api/products?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos')
      }

      const result = await response.json()
      
      set({
        products: result.data.products,
        filteredProducts: result.data.products,
        pagination: result.data.pagination,
        loading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao carregar produtos',
        loading: false
      })
    }
  },

  addProduct: async (productData) => {
    set({ loading: true, error: null })
    
    try {
      const response = await apiRequest('/api/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar produto')
      }

      const result = await response.json()
      const newProduct = result.data
      
      set(state => ({
        products: [newProduct, ...state.products],
        filteredProducts: [newProduct, ...state.filteredProducts],
        loading: false
      }))
      
      return newProduct
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao criar produto',
        loading: false
      })
      throw error
    }
  },

  updateProduct: async (id, updates) => {
    set({ loading: true, error: null })
    
    try {
      const response = await apiRequest(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar produto')
      }

      const result = await response.json()
      const updatedProduct = result.data
      
      set(state => ({
        products: state.products.map(p => p.id === id ? updatedProduct : p),
        filteredProducts: state.filteredProducts.map(p => p.id === id ? updatedProduct : p),
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao atualizar produto',
        loading: false
      })
      throw error
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null })
    
    try {
      const response = await apiRequest(`/api/products/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao deletar produto')
      }
      
      set(state => ({
        products: state.products.filter(p => p.id !== id),
        filteredProducts: state.filteredProducts.filter(p => p.id !== id),
        loading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao deletar produto',
        loading: false
      })
      throw error
    }
  },

  getProductById: async (id) => {
    set({ loading: true, error: null })
    
    try {
      const response = await apiRequest(`/api/products/${id}`)
      
      if (!response.ok) {
        throw new Error('Produto não encontrado')
      }

      const result = await response.json()
      set({ loading: false })
      
      return result.data
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao carregar produto',
        loading: false
      })
      return null
    }
  },

  getFeaturedProducts: async () => {
    try {
      const response = await apiRequest('/api/products/featured')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos em destaque')
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Erro ao carregar produtos em destaque:', error)
      return []
    }
  },

  setFilters: (filters) => {
    set(state => ({
      filters: { ...state.filters, ...filters }
    }))
  },

  resetFilters: () => {
    set({ filters: defaultFilters })
  },

  setLoading: (loading) => {
    set({ loading })
  },

  setError: (error) => {
    set({ error })
  }
}))
```

## 6. Sistema de Upload de Arquivos

### 6.1 API de Upload

#### src/app/api/upload/route.ts
```typescript
import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getAuthUser } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

const UPLOAD_DIR = join(process.cwd(), 'public/uploads')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return errorResponse('Não autorizado', 401)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return errorResponse('Nenhum arquivo enviado')
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('Arquivo muito grande. Máximo 10MB')
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse('Tipo de arquivo não permitido')
    }

    // Criar diretório se não existir
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Gerar nome único
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${user.id}-${timestamp}.${extension}`
    const filepath = join(UPLOAD_DIR, filename)

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/${filename}`

    return successResponse({
      url: fileUrl,
      filename,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Erro no upload:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}
```

### 6.2 Hook de Upload

#### src/hooks/useUpload.ts
```typescript
import { useState } from 'react'
import { apiRequest } from '@/store/authStore'

interface UploadResult {
  url: string
  filename: string
  size: number
  type: string
}

export function useUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const uploadFile = async (file: File): Promise<UploadResult> => {
    setUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiRequest('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {} // Remove Content-Type para FormData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro no upload')
      }

      const result = await response.json()
      setProgress(100)
      
      return result.data
    } catch (error) {
      throw error
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const uploadMultiple = async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = []
    
    for (let i = 0; i < files.length; i++) {
      const result = await uploadFile(files[i])
      results.push(result)
      setProgress(((i + 1) / files.length) * 100)
    }
    
    return results
  }

  return {
    uploadFile,
    uploadMultiple,
    uploading,
    progress
  }
}
```

## 7. Configuração de Ambiente

### 7.1 Variáveis de Ambiente

#### .env.local
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/marketplace_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Upload
UPLOAD_MAX_SIZE="10485760"
UPLOAD_ALLOWED_TYPES="image/jpeg,image/png,image/webp"

# Cloudinary (opcional)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Pagamentos
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
MERCADOPAGO_ACCESS_TOKEN="your-mp-token"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 7.2 Scripts de Desenvolvimento

#### package.json (adicionar scripts)
```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset"
  }
}
```

### 7.3 Seed do Banco

#### prisma/seed.ts
```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar usuário admin
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@marketplace.com' },
    update: {},
    create: {
      name: 'Admin Sistema',
      email: 'admin@marketplace.com',
      passwordHash: adminPassword,
      userType: 'ADMIN',
      city: 'Erechim',
      state: 'RS',
      isVerified: true,
      permissions: ['users', 'stores', 'products', 'orders', 'analytics']
    }
  })

  // Criar vendedor de exemplo
  const sellerPassword = await bcrypt.hash('seller123', 12)
  const seller = await prisma.user.upsert({
    where: { email: 'vendedor@loja.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'vendedor@loja.com',
      phone: '(54) 99999-0001',
      passwordHash: sellerPassword,
      userType: 'SELLER',
      city: 'Erechim',
      state: 'RS',
      isVerified: true
    }
  })

  // Criar loja do vendedor
  const store = await prisma.store.upsert({
    where: { slug: 'techstore-erechim' },
    update: {},
    create: {
      sellerId: seller.id,
      name: 'TechStore Erechim',
      slug: 'techstore-erechim',
      description: 'Especializada em eletrônicos e tecnologia de ponta.',
      address: 'Rua Sete de Setembro, 123 - Centro',
      city: 'Erechim',
      state: 'RS',
      zipCode: '99700-000',
      phone: '(54) 3321-1234',
      email: 'contato@techstore.com.br',
      category: 'electronics',
      isVerified: true,
      rating: 4.8,
      plan: 'premium'
    }
  })

  // Criar produtos de exemplo
  const products = [
    {
      name: 'Samsung Galaxy S24 Ultra 256GB',
      description: 'Smartphone Samsung Galaxy S24 Ultra com 256GB de armazenamento.',
      price: 4299.99,
      originalPrice: 4799.99,
      category: 'Eletrônicos',
      brand: 'Samsung',
      condition: 'NEW' as const,
      stock: 15,
      isFeatured: true,
      tags: ['smartphone', 'android', 'camera', 's-pen'],
      sellerId: seller.id,
      storeId: store.id
    },
    {
      name: 'iPhone 15 Pro Max 256GB',
      description: 'iPhone 15 Pro Max com chip A17 Pro e sistema de câmera Pro.',
      price: 5299.99,
      category: 'Eletrônicos',
      brand: 'Apple',
      condition: 'NEW' as const,
      stock: 8,
      isFeatured: true,
      tags: ['iphone', 'ios', 'titanium', 'pro'],
      sellerId: seller.id,
      storeId: store.id
    }
  ]

  for (const productData of products) {
    await prisma.product.upsert({
      where: { 
        name_storeId: {
          name: productData.name,
          storeId: store.id
        }
      },
      update: {},
      create: productData
    })
  }

  console.log('✅ Seed concluído com sucesso!')
  console.log(`👤 Admin: admin@marketplace.com / admin123`)
  console.log(`🏪 Vendedor: vendedor@loja.com / seller123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

## 8. Integração com Pagamentos Reais

### 8.1 Mercado Pago

#### lib/mercadopago.ts
```typescript
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000
  }
})

const preference = new Preference(client)

export interface PaymentItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  currency_id?: string
}

export interface CreatePaymentData {
  items: PaymentItem[]
  payer: {
    name: string
    email: string
    phone?: string
  }
  back_urls: {
    success: string
    failure: string
    pending: string
  }
  auto_return: 'approved' | 'all'
  external_reference: string
  notification_url: string
}

export async function createPayment(data: CreatePaymentData) {
  try {
    const response = await preference.create({
      body: {
        items: data.items,
        payer: data.payer,
        back_urls: data.back_urls,
        auto_return: data.auto_return,
        external_reference: data.external_reference,
        notification_url: data.notification_url,
        statement_descriptor: 'MARKETPLACE',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
      }
    })

    return {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point
    }
  } catch (error) {
    console.error('Erro ao criar pagamento:', error)
    throw new Error('Erro ao processar pagamento')
  }
}

export async function getPaymentStatus(paymentId: string) {
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error('Erro ao consultar pagamento')
    }

    return await response.json()
  } catch (error) {
    console.error('Erro ao consultar status:', error)
    throw error
  }
}
```

### 8.2 API de Pagamentos

#### src/app/api/payments/create/route.ts
```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { createPayment } from '@/lib/mercadopago'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return errorResponse('Não autorizado', 401)
    }

    const { orderId, paymentMethod } = await request.json()

    if (!orderId) {
      return errorResponse('ID do pedido é obrigatório')
    }

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: true,
        store: true
      }
    })

    if (!order) {
      return errorResponse('Pedido não encontrado', 404)
    }

    if (order.userId !== user.id) {
      return errorResponse('Acesso negado', 403)
    }

    if (order.paymentStatus === 'PAID') {
      return errorResponse('Pedido já foi pago', 400)
    }

    let paymentData

    if (paymentMethod === 'mercadopago') {
      // Criar pagamento no Mercado Pago
      const items = order.items.map(item => ({
        id: item.id,
        title: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price),
        currency_id: 'BRL'
      }))

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      
      paymentData = await createPayment({
        items,
        payer: {
          name: order.user.name,
          email: order.user.email,
          phone: order.user.phone
        },
        back_urls: {
          success: `${baseUrl}/checkout/success?order=${order.id}`,
          failure: `${baseUrl}/checkout/failure?order=${order.id}`,
          pending: `${baseUrl}/checkout/pending?order=${order.id}`
        },
        auto_return: 'approved',
        external_reference: order.id,
        notification_url: `${baseUrl}/api/payments/webhook`
      })

      // Atualizar pedido com dados do pagamento
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentId: paymentData.id,
          paymentMethod: 'mercadopago'
        }
      })
    }

    return successResponse({
      paymentId: paymentData?.id,
      paymentUrl: paymentData?.init_point || paymentData?.sandbox_init_point
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

## 9. Deploy em Produção

### 9.1 Configuração Vercel

#### vercel.json
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret",
    "MERCADOPAGO_ACCESS_TOKEN": "@mercadopago_token",
    "CLOUDINARY_CLOUD_NAME": "@cloudinary_name",
    "CLOUDINARY_API_KEY": "@cloudinary_key",
    "CLOUDINARY_API_SECRET": "@cloudinary_secret"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 9.2 Scripts de Deploy

#### scripts/deploy.sh
```bash
#!/bin/bash

echo "🚀 Iniciando deploy..."

# Verificar se todas as variáveis estão configuradas
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não configurada"
  exit 1
fi

# Executar migrações
echo "📊 Executando migrações do banco..."
npx prisma migrate deploy

# Gerar cliente Prisma
echo "🔧 Gerando cliente Prisma..."
npx prisma generate

# Build da aplicação
echo "🏗️ Fazendo build da aplicação..."
npm run build

echo "✅ Deploy concluído!"
```

### 9.3 Configuração de Banco em Produção

#### Supabase (Recomendado)
1. Criar projeto no Supabase
2. Copiar URL de conexão
3. Configurar variáveis no Vercel
4. Executar migrações

#### Railway (Alternativa)
1. Criar projeto no Railway
2. Adicionar PostgreSQL
3. Copiar URL de conexão
4. Configurar no Vercel

## 10. Checklist de Migração

### 10.1 Preparação
- [ ] Instalar dependências do Prisma
- [ ] Configurar banco PostgreSQL
- [ ] Criar schema Prisma
- [ ] Executar migrações
- [ ] Executar seed inicial

### 10.2 Backend APIs
- [ ] Implementar APIs de autenticação
- [ ] Implementar APIs de usuários
- [ ] Implementar APIs de produtos
- [ ] Implementar APIs de pedidos
- [ ] Implementar APIs de lojas
- [ ] Implementar API de upload
- [ ] Implementar APIs de pagamentos
- [ ] Implementar webhooks

### 10.3 Frontend
- [ ] Migrar authStore para APIs
- [ ] Migrar productStore para APIs
- [ ] Migrar orderStore para APIs
- [ ] Migrar storeStore para APIs
- [ ] Atualizar componentes de upload
- [ ] Atualizar fluxo de pagamentos
- [ ] Implementar tratamento de erros
- [ ] Adicionar loading states

### 10.4 Testes
- [ ] Testar autenticação completa
- [ ] Testar CRUD de produtos
- [ ] Testar fluxo de pedidos
- [ ] Testar upload de arquivos
- [ ] Testar integração de pagamentos
- [ ] Testar responsividade
- [ ] Testar performance

### 10.5 Deploy
- [ ] Configurar variáveis de ambiente
- [ ] Configurar banco em produção
- [ ] Executar migrações em produção
- [ ] Configurar domínio
- [ ] Configurar SSL
- [ ] Configurar monitoramento
- [ ] Testar em produção

## 11. Comandos de Execução

### 11.1 Desenvolvimento
```bash
# Instalar dependências
npm install prisma @prisma/client bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken tsx

# Configurar Prisma
npx prisma init
npx prisma generate
npx prisma db push
npx prisma db seed

# Desenvolvimento
npm run dev
npx prisma studio  # Para visualizar dados
```

### 11.2 Produção
```bash
# Deploy
npx prisma migrate deploy
npx prisma generate
npm run build
npm start
```

## 12. Próximos Passos

1. **Fase 1 - Configuração Base** (1-2 dias)
   - Configurar Prisma e banco
   - Implementar APIs básicas de auth
   - Migrar authStore

2. **Fase 2 - APIs Principais** (3-4 dias)
   - Implementar todas as APIs
   - Migrar todos os stores
   - Implementar upload

3. **Fase 3 - Integrações** (2-3 dias)
   - Integrar pagamentos reais
   - Implementar webhooks
   - Testes completos

4. **Fase 4 - Deploy** (1 dia)
   - Configurar produção
   - Deploy e testes finais
   - Monitoramento

**Total estimado: 7-10 dias de desenvolvimento**

---

*Este documento serve como guia completo para migração do projeto de dados mockados para um sistema real com APIs, banco de dados e integrações funcionais.*