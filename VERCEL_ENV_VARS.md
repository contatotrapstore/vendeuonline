# 🌐 VERCEL - VARIÁVEIS DE AMBIENTE

> **Guia completo para configurar Environment Variables no dashboard do Vercel**

## 📋 **CONFIGURAÇÃO NO DASHBOARD VERCEL**

1. Acesse: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto **vendeu-online**
3. Vá em **Settings** > **Environment Variables**
4. Adicione cada variável abaixo com os valores correspondentes

---

## 🔑 **VARIÁVEIS OBRIGATÓRIAS**

### **Database & Authentication**

```bash
# Database PostgreSQL (Supabase)
DATABASE_URL = "postgresql://postgres.SEU_PROJETO_ID:SUA_SENHA@db.SEU_PROJETO_ID.supabase.co:5432/postgres"

# JWT Secret (gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET = "sua_chave_jwt_super_forte_de_128_caracteres_ou_mais_aqui"
```

### **Supabase Configuration**

```bash
# Backend Variables
SUPABASE_URL = "https://SEU_PROJETO_ID.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Frontend Variables (expostas publicamente)
NEXT_PUBLIC_SUPABASE_URL = "https://SEU_PROJETO_ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Vite Build Variables
VITE_PUBLIC_SUPABASE_URL = "https://SEU_PROJETO_ID.supabase.co"
VITE_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### **Application Settings**

```bash
APP_NAME = "Vendeu Online"
APP_URL = "https://www.vendeu.online"
APP_ENV = "production"
PORT = "3000"
```

---

## 💳 **PAGAMENTOS (ASAAS) - OBRIGATÓRIAS PARA PRODUÇÃO**

```bash
# ASAAS Payment Gateway
ASAAS_API_KEY = "$aact_prod_000SuaChaveRealAquiDoAsaas"
ASAAS_BASE_URL = "https://api.asaas.com/v3"
ASAAS_WEBHOOK_TOKEN = "asaas-webhook-secret-2024-producao"
ASAAS_WEBHOOK_URL = "https://www.vendeu.online/api/payments/webhook"
```

> **⚠️ IMPORTANTE**: Sem `ASAAS_API_KEY`, o sistema funcionará apenas com dados MOCK

---

## 🚀 **PERFORMANCE & CACHE (OPCIONAL)**

```bash
# Redis Cache (Recomendado para produção)
REDIS_URL = "redis://username:password@hostname:port"
```

> **💡 DICA**: Use [Upstash Redis](https://upstash.com) para cache gratuito no Vercel

---

## 📧 **EMAIL & NOTIFICAÇÕES (OPCIONAL)**

```bash
# SMTP Configuration
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = "587"
SMTP_USER = "seu-email@gmail.com"
SMTP_PASS = "sua-senha-app-gmail"
SMTP_FROM = "noreply@vendeu.online"

# Google Analytics
GOOGLE_ANALYTICS_ID = "G-SEU-ID-AQUI"

# Upload & Storage
UPLOAD_MAX_SIZE = "10485760"
UPLOAD_ALLOWED_TYPES = "image/jpeg,image/png,image/webp"

# Cloudinary (Fallback)
CLOUDINARY_CLOUD_NAME = "seu-cloud-name"
CLOUDINARY_API_KEY = "sua-api-key"
CLOUDINARY_API_SECRET = "sua-api-secret"
```

---

## 🔧 **SEGURANÇA & PERFORMANCE**

```bash
# Rate Limiting
RATE_LIMIT_MAX = "100"
RATE_LIMIT_WINDOW = "900000"
```

---

## ✅ **CHECKLIST DE CONFIGURAÇÃO**

### **Passo 1: Obter Credenciais Supabase**
- [ ] Acesse [supabase.com](https://supabase.com)
- [ ] Entre no seu projeto
- [ ] **Settings** > **API**
- [ ] Copie: Project URL, anon key, service_role key
- [ ] **Settings** > **Database** > Copie Connection String

### **Passo 2: Gerar JWT Secret**
```bash
# Execute no terminal:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **Passo 3: Configurar ASAAS**
- [ ] Acesse [asaas.com](https://asaas.com)
- [ ] Crie conta ou faça login
- [ ] **Configurações** > **Integração**
- [ ] Copie API Key de produção
- [ ] Configure webhook: `https://www.vendeu.online/api/payments/webhook`

### **Passo 4: Configurar no Vercel**
- [ ] Entre em [vercel.com/dashboard](https://vercel.com/dashboard)
- [ ] Selecione projeto **vendeu-online**
- [ ] **Settings** > **Environment Variables**
- [ ] Adicione uma por uma as variáveis acima
- [ ] **Environment**: Selecione **Production, Preview, Development**

### **Passo 5: Deploy & Teste**
- [ ] Faça novo deploy (automático após configurar vars)
- [ ] Teste endpoints: `/api/health`, `/api/products`
- [ ] Monitore logs em **Functions** tab

---

## 🚨 **VARIÁVEIS CRÍTICAS DE SEGURANÇA**

### **⚠️ NUNCA EXPOSTAS NO FRONTEND:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `ASAAS_API_KEY`
- `SMTP_PASS`
- `CLOUDINARY_API_SECRET`

### **✅ SEGURAS PARA FRONTEND:**
- `NEXT_PUBLIC_*` (Next.js)
- `VITE_PUBLIC_*` (Vite)
- URL públicas e chaves anônimas

---

## 🛠️ **TROUBLESHOOTING**

### **Problema: Build falha**
```bash
# Verifique se tem:
DATABASE_URL ✓
JWT_SECRET ✓
SUPABASE_* variables ✓
```

### **Problema: APIs 500 Error**
```bash
# Verifique logs em Vercel Functions tab
# Geralmente falta: SUPABASE_SERVICE_ROLE_KEY
```

### **Problema: Pagamentos não funcionam**
```bash
# Configure:
ASAAS_API_KEY (chave REAL, não sandbox)
ASAAS_WEBHOOK_URL (URL correta do seu domínio)
```

---

## 🔄 **COMANDOS ÚTEIS**

### **Testar localmente com env Vercel:**
```bash
# Baixar env vars do Vercel
npx vercel env pull .env.local

# Testar build
npm run build
npm run preview
```

### **Deploy manual:**
```bash
npx vercel --prod
```

---

## 📚 **LINKS ÚTEIS**

- [📖 Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- [🔑 Supabase Dashboard](https://app.supabase.com)
- [💳 ASAAS Dashboard](https://app.asaas.com)
- [⚡ Upstash Redis](https://console.upstash.com)

---

> **✅ STATUS**: Configuração completa para produção
>
> **🎯 RESULTADO**: Sistema 100% funcional no Vercel
>
> **📅 ATUALIZADO**: 24 de Setembro de 2025