# 🚀 Getting Started - Vendeu Online

Welcome to **Vendeu Online**, Brazil's premier multi-vendor e-commerce marketplace platform.

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL database (we use Supabase)
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/vendeu-online.git
cd vendeu-online
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment Setup**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Database Setup**

```bash
npx prisma generate
npx prisma db push
```

5. **Start Development**

```bash
npm run dev
```

Your application will be running at:

- 🌐 **Frontend**: http://localhost:5173
- ⚡ **API**: http://localhost:3001

## Environment Configuration

### Essential Variables

⚠️ **IMPORTANTE**: Nunca commitar credenciais reais. Use placeholders na documentação.

```env
# Database (Supabase)
DATABASE_URL="your-postgres-connection-string"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
VITE_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
VITE_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-key"
VITE_SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-key"

# Application
APP_NAME="Vendeu Online"
APP_URL="https://www.vendeu.online"
JWT_SECRET="your-jwt-secret"

# Payment Gateway (ASAAS - Brazilian)
ASAAS_API_KEY="your-asaas-api-key"
ASAAS_BASE_URL="https://api.asaas.com/v3"
ASAAS_WEBHOOK_URL="https://www.vendeu.online/api/payments/webhook"
```

## User Roles & Features

### 👤 **Buyer**

- Browse and search products
- Add items to cart and wishlist
- Secure checkout with PIX/Credit Card
- Order tracking and management
- Product reviews and ratings

### 🏪 **Seller**

- Create and manage store
- Product catalog management
- Order processing
- Sales analytics
- Subscription plans

### ⚙️ **Admin**

- Platform management
- User moderation
- Content management
- Analytics and reports

## Quick Commands

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:client       # Frontend only (Vite)
npm run api              # Backend only (Express)

# Production
npm run build            # Build for production
npm run preview          # Preview production build

# Database
npx prisma studio        # Database management GUI
npx prisma generate      # Generate Prisma client
npm run db:seed          # Seed database with demo data

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier
npm run check            # TypeScript check

# Testing
npm test                 # Unit tests (Vitest)
npm run test:e2e         # E2E tests (Playwright)
```

## Tech Stack

- ⚛️ **Frontend**: React 18 + TypeScript + Vite
- 🛣️ **Routing**: React Router v6
- 🎨 **Styling**: Tailwind CSS + Radix UI
- 🗃️ **Database**: PostgreSQL + Prisma ORM
- 🔐 **Auth**: JWT + bcryptjs
- 💳 **Payments**: ASAAS (Brazilian Gateway)
- 📱 **PWA**: Service Worker + Manifest
- 🚀 **Deploy**: Vercel

## Project Structure

```
vendeu-online/
├── src/
│   ├── app/                 # Pages and routes
│   ├── components/          # React components
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities
│   ├── store/              # Zustand state management
│   └── types/              # TypeScript definitions
├── server/                 # Express API backend
├── prisma/                 # Database schema
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Next Steps

1. 📖 Read [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development guide
2. 🏗️ Check [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) for system design
3. 🧪 Learn about [Testing](../testing/TESTING.md) setup
4. 🚀 Follow [Deployment Guide](../deployment/DEPLOY_GUIDE.md) for production

## Support

- 📧 **Email**: suporte@vendeu.online
- 🌐 **Website**: https://www.vendeu.online
- 📚 **Docs**: https://docs.vendeu.online

---

**Happy coding! 🎉**
