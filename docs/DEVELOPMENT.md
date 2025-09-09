# 💻 GUIA DE DESENVOLVIMENTO - VENDEU ONLINE

## 🚀 **SETUP INICIAL**

### **Pré-requisitos**
- Node.js 18+ 
- npm ou yarn
- Git
- PostgreSQL (ou Supabase)

### **Instalação**

```bash
# Clonar repositório
git clone [sua-url-repo]
cd vendeuonline-main

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Gerar cliente Prisma
npx prisma generate

# Aplicar schema ao banco
npx prisma db push

# Popular banco com dados de teste
npm run db:seed
```

---

## ⚙️ **COMANDOS DE DESENVOLVIMENTO**

### **Desenvolvimento**
```bash
# Rodar aplicação completa (frontend + backend)
npm run dev

# Apenas frontend (porta 4173)
npm run dev:client

# Apenas backend/API (porta 4002)
npm run api

# Preview de produção
npm run preview
```

### **Banco de Dados**
```bash
# Gerar cliente Prisma
npx prisma generate

# Aplicar mudanças no schema
npx prisma db push

# Criar migration
npx prisma migrate dev

# Visualizar banco
npx prisma studio

# Popular com dados de teste
npm run db:seed

# Reset completo do banco
npm run db:reset
```

### **Build e Deploy**
```bash
# Verificar tipos TypeScript
npm run check

# Lint do código
npm run lint

# Build para produção
npm run build

# Build para Vercel
npm run vercel-build
```

---

## 📁 **ESTRUTURA DO PROJETO**

```
vendeuonline-main/
├── api/                    # APIs serverless Vercel
├── docs/                   # Documentação do projeto
├── prisma/                 # Schema e migrations
├── public/                 # Assets públicos
├── scripts/                # Scripts de automação
├── server/                 # Backend Express
│   └── routes/            # Rotas da API
├── src/
│   ├── app/               # Páginas (padrão Next.js)
│   ├── components/        # Componentes React
│   │   └── ui/           # Componentes UI reutilizáveis
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities e configurações
│   ├── store/            # Zustand state management
│   └── types/            # TypeScript types
└── supabase/              # Configurações Supabase
```

---

## 🔧 **CONFIGURAÇÕES PRINCIPAIS**

### **Vite (vite.config.ts)**
- Proxy para API (localhost:4002)
- PWA configurado
- TypeScript paths
- React plugin

### **Prisma (prisma/schema.prisma)**
- PostgreSQL como datasource
- Modelos principais: User, Product, Store, Order
- Relações polimórficas

### **Tailwind (tailwind.config.js)**
- Design system configurado
- Cores e temas customizados
- Componentes Radix UI

---

## 🎨 **PADRÕES DE CÓDIGO**

### **Componentes React**
```typescript
// Exemplo de componente tipado
interface ProductCardProps {
  product: Product;
  onAddToCart: (id: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="border rounded-lg p-4">
      {/* Componente aqui */}
    </div>
  );
}
```

### **Zustand Stores**
```typescript
// Exemplo de store tipado
interface CartState {
  items: CartItem[];
  total: number;
}

interface CartActions {
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
}

export const useCartStore = create<CartState & CartActions>()(
  persist((set) => ({
    // implementação
  }), { name: 'cart-store' })
);
```

### **API Routes**
```typescript
// Exemplo de rota tipada
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // validação e lógica
    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

---

## 🔒 **AUTENTICAÇÃO E SEGURANÇA**

### **JWT**
- Tokens armazenados no localStorage
- Middleware de autenticação em todas rotas protegidas
- Refresh automático de tokens

### **Roles e Permissões**
- `BUYER` - Comprar produtos, wishlist
- `SELLER` - Gerenciar loja, produtos, pedidos
- `ADMIN` - Moderar conteúdo, gerenciar sistema

### **Validação**
- Zod para validação de schemas
- Sanitização de inputs
- Rate limiting

---

## 💳 **INTEGRAÇÃO DE PAGAMENTOS**

### **ASAAS (Principal)**
```typescript
// Criar cobrança
const charge = await asaas.createCharge({
  customer: customerId,
  billingType: 'PIX',
  value: 100.00,
  dueDate: '2024-12-31'
});
```

### **Webhooks**
- Endpoint: `/api/payments/webhook`
- Validação de assinatura
- Atualização automática de status

---

## 📱 **PWA e Performance**

### **Service Worker**
- Cache de assets estáticos
- Offline functionality
- Background sync

### **Otimizações**
- Lazy loading de imagens
- Code splitting
- Bundle optimization

---

## 🧪 **TESTES E DEBUG**

### **Endpoints de Teste**
- `/api/health` - Status da API
- `/api/diagnostics` - Diagnóstico completo
- `/api/test` - Teste simples

### **Logs**
```bash
# Ver logs do Vercel
vercel logs

# Debug local
DEBUG=* npm run dev
```

---

## 🚀 **DEPLOY LOCAL**

### **Variáveis de Ambiente (.env)**
```bash
# Copiar do .env.example
cp .env.example .env

# Configurar credenciais do Supabase
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Gerar JWT secret forte
JWT_SECRET="sua-chave-forte-64-chars"
```

### **Rodar em Modo de Produção**
```bash
# Build
npm run build

# Rodar preview
npm run preview
```

---

## 📚 **RECURSOS ÚTEIS**

- **Prisma Studio:** Interface visual do banco
- **Supabase Dashboard:** Gerenciar banco e storage
- **Vercel Analytics:** Métricas de performance
- **Sentry:** Monitoramento de erros (opcional)

---

## ❓ **FAQ**

**Q: Como adicionar uma nova página?**
A: Criar arquivo em `src/app/` seguindo convenção Next.js

**Q: Como criar uma nova API?**
A: Adicionar rota em `server/routes/` ou `api/`

**Q: Como adicionar nova dependência?**
A: `npm install pacote` e importar onde necessário

**Q: Como atualizar o schema do banco?**
A: Editar `prisma/schema.prisma` e rodar `npx prisma db push`

---

## 🆘 **SUPORTE**

- **Issues:** GitHub Issues
- **Documentação:** `/docs/`
- **API Reference:** `/docs/API_REFERENCE.md`

**Happy coding! 🚀**