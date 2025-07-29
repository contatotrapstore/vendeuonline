# 🛒 Marketplace Multivendedor - Vendeu Online

Um marketplace completo desenvolvido com React + TypeScript + Vite, permitindo que múltiplos vendedores cadastrem e vendam seus produtos em uma plataforma unificada.

## 🚀 Funcionalidades

### ✅ **Implementadas (100%)**
- 🔐 **Autenticação completa** (Login/Cadastro para Compradores, Vendedores e Admins)
- 🛍️ **Sistema de produtos** (CRUD completo, categorias, filtros)
- 🏪 **Gestão de lojas** (Perfis de vendedores, configurações)
- 🛒 **Carrinho de compras** (Adicionar, remover, calcular totais)
- 📦 **Sistema de pedidos** (Estados, histórico, tracking)
- 💳 **Pagamentos** (Integração Mercado Pago, PIX, cartões)
- 📱 **WhatsApp Business** (Compras diretas via WhatsApp)
- 🖼️ **Upload de imagens** (Cloudinary integration)
- 🎨 **UI/UX moderna** (Componentes Radix UI, Tailwind CSS)
- 📱 **Design responsivo** (Mobile-first)
- 🔍 **Busca e filtros** avançados
- 👑 **Painel administrativo** completo
- 📊 **Dashboards** para vendedores e compradores

## 🛠️ Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Radix UI
- **Roteamento:** React Router DOM
- **Estado:** Zustand
- **Formulários:** React Hook Form + Zod
- **Pagamentos:** Mercado Pago
- **Upload:** Cloudinary
- **Comunicação:** WhatsApp Business API
- **Build:** Vite
- **Deploy:** Vercel

## 🚀 Deploy no Vercel

### 1. **Preparação do Repositório GitHub**

```bash
# Inicializar repositório Git
git init
git add .
git commit -m "Initial commit: Marketplace Multivendedor"

# Conectar ao GitHub
git remote add origin https://github.com/seu-usuario/marketplace-multivendedor.git
git branch -M main
git push -u origin main
```

### 2. **Deploy no Vercel**

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em "New Project"
3. Importe seu repositório do GitHub
4. Configure as variáveis de ambiente (ver seção abaixo)
5. Clique em "Deploy"

### 3. **Variáveis de Ambiente no Vercel**

No painel do Vercel, vá em **Settings > Environment Variables** e adicione:

```env
# App Configuration
VITE_APP_NAME=Marketplace Multivendedor
VITE_APP_URL=https://seu-dominio.vercel.app
VITE_APP_ENV=production

# Cloudinary (Upload de Imagens)
VITE_CLOUDINARY_CLOUD_NAME=seu-cloudinary-name
VITE_CLOUDINARY_API_KEY=sua-cloudinary-key
VITE_CLOUDINARY_API_SECRET=sua-cloudinary-secret

# Mercado Pago (Pagamentos)
VITE_MERCADOPAGO_PUBLIC_KEY=sua-public-key
VITE_MERCADOPAGO_ACCESS_TOKEN=seu-access-token

# WhatsApp Business
VITE_WHATSAPP_API_URL=https://api.whatsapp.com
VITE_WHATSAPP_TOKEN=seu-whatsapp-token

# Analytics (Opcional)
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Geolocalização (Opcional)
VITE_GOOGLE_MAPS_API_KEY=sua-google-maps-key
```

## 🔧 Desenvolvimento Local

### **Pré-requisitos**
- Node.js 18+ 
- npm ou yarn

### **Instalação**

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/marketplace-multivendedor.git
cd marketplace-multivendedor

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
├── app/                 # Páginas da aplicação
│   ├── (auth)/         # Páginas de autenticação
│   ├── admin/          # Painel administrativo
│   ├── buyer/          # Dashboard do comprador
│   ├── seller/         # Dashboard do vendedor
│   └── ...
├── components/         # Componentes reutilizáveis
│   ├── ui/            # Componentes de UI (Radix)
│   ├── layout/        # Layout components
│   └── features/      # Componentes específicos
├── store/             # Estado global (Zustand)
├── hooks/             # Custom hooks
├── lib/               # Utilitários e configurações
├── types/             # Definições TypeScript
└── pages/             # Páginas principais
```

## 🔐 Tipos de Usuário

### **👤 Comprador**
- Navegar produtos e lojas
- Adicionar ao carrinho
- Finalizar compras
- Acompanhar pedidos
- Avaliar produtos

### **🏪 Vendedor**
- Gerenciar loja
- CRUD de produtos
- Acompanhar vendas
- Processar pedidos
- Analytics de vendas

### **👑 Administrador**
- Gerenciar usuários
- Moderar conteúdo
- Configurar banners
- Analytics globais
- Configurações do sistema

## 🎨 Design System

- **Cores:** Paleta moderna e acessível
- **Tipografia:** Inter font family
- **Componentes:** Radix UI primitives
- **Responsividade:** Mobile-first approach
- **Acessibilidade:** WCAG 2.1 AA compliant

## 📱 PWA Ready

- Instalável como app nativo
- Funcionalidade offline
- Push notifications
- Cache inteligente

## 🔒 Segurança

- Validação de dados com Zod
- Sanitização de inputs
- Proteção contra XSS
- Rate limiting
- Autenticação JWT

## 📊 Performance

- Code splitting automático
- Lazy loading de componentes
- Otimização de imagens
- Bundle size otimizado
- Lighthouse Score 90+

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Para suporte, envie um email para suporte@vendeuonline.com ou abra uma issue no GitHub.

---

**Desenvolvido com ❤️ para revolucionar o e-commerce brasileiro**
