# 📚 Documentation - Vendeu Online

Welcome to the comprehensive documentation for **Vendeu Online**, Brazil's premier multi-vendor e-commerce marketplace platform.

## 🗂️ Documentation Structure

### 🚀 [Getting Started](./getting-started/)

Quick setup guide and introduction to the platform

- [**Getting Started Guide**](./getting-started/GETTING_STARTED.md) - Complete setup tutorial
- [**Development Guide**](./getting-started/DEVELOPMENT.md) - Development environment setup
- [**Commands Reference**](./getting-started/COMMANDS.md) - All available npm scripts

### 🏗️ [Architecture](./architecture/)

System design and technical architecture

- [**Architecture Overview**](./architecture/ARCHITECTURE.md) - System design and tech stack
- [**Backend Fixes Summary**](./architecture/BACKEND-FIXES-SUMMARY.md) - Database and API fixes
- [**Tracking Pixels Guide**](./architecture/TRACKING-PIXELS-GUIDE.md) - Analytics implementation

### 🔌 [API Reference](./api/)

Complete API documentation and endpoints

- [**API Reference**](./api/API_REFERENCE.md) - All endpoints and schemas

### 🧪 [Testing](./testing/)

Testing strategies, setup, and best practices

- [**Testing Guide**](./testing/TESTING.md) - Complete testing setup and examples

### 🚀 [Deployment](./deployment/)

Production deployment guides and configurations

- [**Deploy Guide**](./deployment/VERCEL_COMPLETE_GUIDE.md) - Guia completo de deploy no Vercel

### 📊 [Reports](./reports/)

Generated reports, validations, and analytics

- **[Seller Validation](./reports/seller/)** - ✅ 100% Complete (20/20 APIs)
- **[Archive](./reports/archive/)** - Outdated documentation
- Test coverage reports
- Performance analysis
- Security audits

## 🌟 Key Features

### 👥 Multi-Role Platform

- **👤 Buyers**: Browse, search, purchase, and review products
- **🏪 Sellers**: Create stores, manage inventory, process orders
- **⚙️ Admins**: Platform management and content moderation

### 💳 Brazilian Payment Integration

- **ASAAS Gateway**: PIX, Boleto, Credit Cards
- **Installments**: Up to 12x for credit cards
- **Webhooks**: Real-time payment status updates

### 📱 Modern Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + Prisma
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Vercel + Edge Functions

### 🔒 Enterprise Security

- JWT authentication with bcryptjs
- Row-level security (RLS)
- Rate limiting and CORS protection
- Input validation and sanitization

## 🚀 Quick Links

| Section         | Description                     | Link                                                    |
| --------------- | ------------------------------- | ------------------------------------------------------- |
| **Setup**       | Get up and running in 5 minutes | [Getting Started](./getting-started/GETTING_STARTED.md) |
| **Development** | Local development environment   | [Development Guide](./getting-started/DEVELOPMENT.md)   |
| **API**         | Complete API reference          | [API Docs](./api/API_REFERENCE.md)                      |
| **Testing**     | Testing setup and examples      | [Testing Guide](./testing/TESTING.md)                   |
| **Deploy**      | Production deployment           | [Deploy Guide](./deployment/VERCEL_COMPLETE_GUIDE.md)   |

## 📈 Project Status

| Metric          | Status           | Details                            |
| --------------- | ---------------- | ---------------------------------- |
| **Seller APIs** | ✅ 20/20 (100%)  | All seller endpoints functional ⚡ |
| **Tests**       | ✅ 27/27 Passing | Unit + Integration + E2E           |
| **Coverage**    | ✅ 87%           | Above target of 85%                |
| **TypeScript**  | ✅ 0 Errors      | Strict mode enabled                |
| **ESLint**      | ✅ Clean         | 0 critical issues                  |
| **Security**    | ✅ Hardened      | JWT, RLS, Rate limiting            |
| **Performance** | ✅ Optimized     | Lazy loading, PWA                  |

### 🎯 **Latest Updates (23 Set 2025)**

- ✅ **Documentação Reorganizada** - Estrutura consolidada e índices atualizados
- ✅ **Guia de Deploy Unificado** - [VERCEL_COMPLETE_GUIDE.md](./deployment/VERCEL_COMPLETE_GUIDE.md)
- ✅ **Reports Arquivados** - Histórico movido para `reports/archive/`
- ✅ **Seller 100% Validado** - [Ver Relatório](../SELLER_FINAL_VALIDATION.md)
- ✅ **Express Route Ordering** corrigido
- ✅ **PROJECT-STATUS.md** movido para `docs/PROJECT-STATUS.md`

## 🛠️ Development Commands

```bash
# Quick Start
npm install                 # Install dependencies
npm run dev                 # Start development servers
npm run build              # Build for production

# Code Quality
npm run lint               # ESLint check
npm run format             # Prettier formatting
npm run check              # TypeScript check

# Testing
npm test                   # Run unit tests
npm run test:e2e           # Run E2E tests
npm run test:coverage      # Generate coverage report

# Database
npx prisma studio          # Database GUI
npx prisma generate        # Generate client
npm run db:seed            # Seed with demo data
```

## 🌐 Live Environment

- **Production**: https://www.vendeu.online
- **Staging**: https://staging.vendeu.online
- **API**: https://www.vendeu.online/api
- **Admin**: https://www.vendeu.online/admin

## 📞 Support & Contact

- **Website**: https://www.vendeu.online
- **Email**: suporte@vendeu.online
- **Documentation**: https://docs.vendeu.online
- **Status Page**: https://status.vendeu.online

## 📝 Contributing

1. Read our [Development Guide](./getting-started/DEVELOPMENT.md)
2. Check [Architecture Overview](./architecture/ARCHITECTURE.md)
3. Run tests: `npm test`
4. Follow our [Testing Guide](./testing/TESTING.md)
5. Submit pull requests with proper documentation

## 📄 License

This project is proprietary software. All rights reserved to Vendeu Online.

---

**Happy coding! 🎉**

_Last updated: September 2025_
