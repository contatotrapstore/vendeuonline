# 🛒 Marketplace Vendeu Online

Um marketplace completo desenvolvido com React + TypeScript + Vite, permitindo que múltiplos vendedores cadastrem e vendam seus produtos em uma plataforma unificada.

## 🚀 Funcionalidades Principais

- 🔐 **Autenticação completa** (Login/Cadastro para Compradores, Vendedores e Admins)
- 🛍️ **Sistema de produtos** (CRUD completo, categorias, filtros)
- 🏪 **Gestão de lojas** (Perfis de vendedores, configurações)
- 🛒 **Carrinho de compras** (Adicionar, remover, calcular totais)
- 📦 **Sistema de pedidos** (Estados, histórico, tracking)
- 💳 **Sistema de planos** (Gratuito, Micro-Empresa, Pequena Empresa, Empresa Simples, Empresa Plus)
- 📱 **Design responsivo** (Mobile-first)
- 🔍 **Busca e filtros** avançados
- 👑 **Painel administrativo** completo

## 🛠️ Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Roteamento:** Next.js App Router
- **Estado:** Zustand
- **Formulários:** React Hook Form + Zod
- **Banco de Dados:** Prisma + Supabase
- **Build:** Vite
- **Deploy:** Vercel

## 🔧 Desenvolvimento Local

### **Pré-requisitos**
- Node.js 18+ 
- npm ou pnpm

### **Instalação**

```bash
# Clonar repositório
git clone <repository-url>
cd vendeu-online

# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Configurar variáveis no .env
# Edite o arquivo .env com suas credenciais

# Iniciar servidor de desenvolvimento
npm run dev
```

### **Scripts Disponíveis**

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
npm run check    # Verificação TypeScript
npm run lint     # Linting do código
```

## 📁 Estrutura do Projeto

```
src/
├── app/                 # Páginas da aplicação (Next.js App Router)
│   ├── (auth)/         # Páginas de autenticação
│   ├── admin/          # Painel administrativo
│   ├── buyer/          # Dashboard do comprador
│   ├── seller/         # Dashboard do vendedor
│   ├── api/            # API Routes
│   └── ...
├── components/         # Componentes reutilizáveis
│   ├── ui/            # Componentes de UI
│   └── ...
├── store/             # Estado global (Zustand)
├── hooks/             # Custom hooks
├── lib/               # Utilitários e configurações
├── types/             # Definições TypeScript
└── utils/             # Funções utilitárias
```

## 💳 Sistema de Planos

### **Planos Disponíveis**

1. **Gratuito** - Para usuários iniciantes
   - 1 anúncio simultâneo
   - Duração de 30 dias
   - Suporte por email

2. **Micro-Empresa** - R$ 24,90/mês
   - 2 anúncios simultâneos
   - Duração de 30 dias
   - Até 6 fotos por anúncio

3. **Pequena Empresa** - R$ 49,90/mês
   - 5 anúncios simultâneos
   - Duração de 30 dias
   - Até 10 fotos por anúncio

4. **Empresa Simples** - R$ 99,90/mês
   - 10 anúncios simultâneos
   - Duração de 30 dias
   - Até 15 fotos por anúncio

5. **Empresa Plus** - R$ 149,90/mês
   - 20 anúncios simultâneos
   - Duração de 30 dias
   - Até 20 fotos por anúncio

## 🔐 Tipos de Usuário

### **👤 Comprador**
- Navegar produtos e lojas
- Adicionar ao carrinho
- Finalizar compras
- Acompanhar pedidos

### **🏪 Vendedor**
- Gerenciar loja
- CRUD de produtos
- Acompanhar vendas
- Processar pedidos
- Gerenciar planos de assinatura

### **👑 Administrador**
- Gerenciar usuários
- Moderar conteúdo
- Configurar planos
- Analytics globais

## 🚀 Deploy

### **Deploy Rápido no Vercel**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fseu-usuario%2Fvendeu-online&env=DATABASE_URL,JWT_SECRET,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&project-name=vendeu-online&repository-name=vendeu-online)

### **Configuração Manual**

1. **Fork este repositório**
2. **Conecte ao Vercel**
3. **Configure as variáveis de ambiente**:

```env
# Obrigatórias
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
JWT_SECRET=cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Opcionais (Pagamentos)
ASAAS_API_KEY=sua-chave-asaas
MERCADOPAGO_ACCESS_TOKEN=seu-token-mercadopago
```

### **Configurações do Vercel**
- **Framework**: Vite
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x

### **📖 Guia Completo**
Para instruções detalhadas, consulte: **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)**

### **URLs Pós-Deploy**
- **Frontend**: `https://seu-app.vercel.app`
- **API Health**: `https://seu-app.vercel.app/api/health`
- **Admin**: `https://seu-app.vercel.app/admin` (admin@test.com / 123456)

## 📄 Licença

Este projeto é propriedade privada. Todos os direitos reservados.
