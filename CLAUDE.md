# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack marketplace application called "Vendeu Online" built with React + TypeScript + Vite. It's a multi-vendor e-commerce platform where sellers can create stores and sell products, buyers can purchase items, and admins manage the platform.

## Common Development Commands

```bash
# Development
npm run dev          # Start development server (Vite)
npm run build        # Build for production (TypeScript + Vite)
npm run preview      # Preview production build
npm run check        # TypeScript type checking without emitting files
npm run lint         # ESLint code linting

# Database (Prisma)
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema changes to database
npx prisma studio        # Open Prisma Studio GUI
npx prisma migrate dev   # Create and apply new migration
```

## Architecture & Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Routing**: Next.js App Router pattern (in src/app/)
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persist middleware
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Radix UI primitives
- **Database**: Prisma + PostgreSQL (Supabase)
- **Authentication**: JWT with bcryptjs
- **Payments**: MercadoPago integration
- **File Upload**: Cloudinary
- **PWA**: Vite PWA plugin
- **Deployment**: Vercel

## Key Application Structure

### User Types & Roles
- **Buyer**: Can browse, purchase products, manage orders
- **Seller**: Can create stores, manage products, process orders, subscribe to plans
- **Admin**: Can manage users, moderate content, configure platform settings

### Core Models (Database)
- `User` - Base user model with polymorphic relations (includes `asaasCustomerId`)
- `Seller` - Seller profile with store management
- `Store` - Individual seller stores
- `Product` - Products with images, specifications, categories
- `Order` - Purchase orders with items and payment tracking
- `Plan` - Subscription plans for sellers
- `Subscription` - Active subscriptions linking users to plans

### Payment System (ASAAS)
- Brazilian payment gateway integration
- Supports PIX, Boleto, Credit Card
- Webhook-based status updates
- Automatic customer creation/management

### State Management (Zustand)
All stores are in `src/store/` and use Zustand with persistence:
- `authStore.ts` - User authentication and session
- `cartStore.ts` - Shopping cart functionality
- `productStore.ts` - Product data management
- `orderStore.ts` - Order management
- `planStore.ts` - Subscription plans

### API Routes Structure
API endpoints follow Next.js App Router pattern in `src/app/api/`:
- `/api/auth/` - Authentication endpoints
- `/api/products/` - Product CRUD operations
- `/api/stores/` - Store management
- `/api/orders/` - Order processing
- `/api/payments/` - Payment handling
- `/api/plans/` - Subscription plan management

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/components/ui/` - Reusable UI components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and configurations
- `src/store/` - Zustand state management
- `src/types/` - TypeScript type definitions
- `prisma/` - Database schema and migrations

## Development Notes

### Authentication Flow
- JWT tokens stored in localStorage via Zustand persist
- Protected routes use middleware checking in `src/lib/auth.ts`
- User roles determine access to different dashboard areas

### Payment Integration
- **ASAAS** configured in `src/lib/asaas.ts` (Brazilian payment gateway)
- Webhook handling for payment status updates in `/api/payments/webhook`
- Support for PIX, Boleto, Credit Card with installments
- Automatic customer creation and management
- **Legacy**: MercadoPago integration available in `src/lib/mercadopago.ts`

### File Uploads
- **Primary**: Supabase Storage (configured with buckets: products, stores, avatars)
- **Fallback**: Cloudinary integration for legacy support
- ImageUploader component handles file validation and upload
- Automatic image optimization and WebP conversion

### Subscription System
- Five subscription tiers for sellers (Gratuito to Empresa Plus)
- Plan limits enforced on ad count, photo limits, and features
- Automatic renewal and payment tracking

### PWA Features
- Service worker with caching strategies
- Offline functionality for core features
- App-like experience with manifest configuration

## Environment Variables
The application requires environment variables for:
- `DATABASE_URL` - PostgreSQL/Supabase connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `JWT_SECRET` - JWT token signing secret
- `ASAAS_API_KEY` - ASAAS payment gateway API key
- `ASAAS_BASE_URL` - ASAAS API base URL (prod/sandbox)
- `ASAAS_WEBHOOK_TOKEN` - Webhook validation token

## Quick Setup
🚀 **SERVIDOR RODANDO EM: http://localhost:5174**

**Para funcionamento 100%:**
1. **Configure Supabase**: Leia `SETUP_RAPIDO.md` (5 minutos)
2. **Automático**: Execute `node configure-supabase.js` 
3. **Manual**: Edite `.env` com credenciais do Supabase
4. **Criar tabelas**: `npx prisma db push`
5. **Storage**: Execute `supabase-storage-setup.sql` no Supabase

✅ **STATUS ATUAL:**
- ✅ Todas as funcionalidades implementadas
- ✅ Carrinho funcionando
- ✅ Wishlist implementada  
- ✅ Upload de imagens pronto
- ✅ APIs de reviews e categorias
- ✅ JWT_SECRET configurado com chave forte
- 🔴 Apenas faltam credenciais do Supabase

## Testing & Development
- MSW (Mock Service Worker) configured for API mocking
- TypeScript strict mode enabled
- ESLint with React and TypeScript rules
- Tailwind CSS for consistent styling