# 🚀 GUIA DE DEPLOY - VENDEU ONLINE

## 📋 **RESUMO DO PROJETO**

**Vendeu Online** é uma plataforma de marketplace multi-vendor completa para o mercado brasileiro, desenvolvida com React + TypeScript + Vite, backend Node.js + Express + Prisma, e PostgreSQL via Supabase.

---

## 🔧 **PRÉ-REQUISITOS**

1. **Conta no Vercel** (deploy)
2. **Projeto no Supabase** (banco de dados)
3. **Conta ASAAS** (pagamentos - opcional)
4. **Repository no GitHub** conectado ao Vercel

---

## ⚡ **CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE**

### **PASSO 1: Configurar Supabase**

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote as credenciais geradas:
   - Project URL
   - Anon key
   - Service role key
   - Database password

### **PASSO 2: Configurar Variáveis no Vercel**

Vá em **Project Settings > Environment Variables** e adicione **TODAS** estas variáveis:

#### 🔥 **ESSENCIAIS - SEM ESSAS O APP NÃO FUNCIONA**

```bash
# Database PostgreSQL (Supabase)
DATABASE_URL=postgresql://postgres.SEU_PROJETO_ID:SUA_SENHA@db.SEU_PROJETO_ID.supabase.co:5432/postgres

# JWT Secret (gere uma chave forte)
JWT_SECRET=sua_chave_jwt_super_forte_de_64_caracteres_minimo

# Supabase Backend (sem prefixo VITE_)
SUPABASE_URL=https://SEU_PROJETO_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Frontend (com prefixo VITE_)
VITE_PUBLIC_SUPABASE_URL=https://SEU_PROJETO_ID.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 🏪 **CONFIGURAÇÃO DA APLICAÇÃO**

```bash
APP_NAME=Vendeu Online
APP_URL=https://SEU-PROJETO.vercel.app
APP_ENV=production
```

#### 💳 **PAGAMENTOS ASAAS (OPCIONAL)**

```bash
ASAAS_API_KEY=$aact_prod_000SuaChaveAquiDoAsaas
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=asaas-webhook-secret-2024
ASAAS_WEBHOOK_URL=https://SEU-PROJETO.vercel.app/api/payments/webhook
```

#### 📧 **EMAIL SMTP (OPCIONAL)**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app-gmail
SMTP_FROM=noreply@seu-dominio.com
```

#### 📤 **CONFIGURAÇÕES DE UPLOAD**

```bash
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

---

## 🚀 **PROCESSO DE DEPLOY**

### **PASSO 1: Gerar JWT Secret**

```bash
# Execute este comando e use o resultado como JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **PASSO 2: Preparar o Banco de Dados**

1. **Aplicar schema no Supabase:**

   ```bash
   npx prisma db push
   ```

2. **Popular banco com dados iniciais:**
   ```bash
   npm run db:seed
   ```

### **PASSO 3: Deploy no Vercel**

1. **Commit das mudanças:**

   ```bash
   git add .
   git commit -m "feat: projeto organizado e pronto para deploy"
   git push
   ```

2. **Aguardar build** (2-3 minutos)

3. **Testar endpoints:**
   - `https://seu-projeto.vercel.app/api/health`
   - `https://seu-projeto.vercel.app/api/plans`
   - `https://seu-projeto.vercel.app/api/products`

---

## 🧪 **VALIDAÇÃO DO DEPLOY**

### **Credenciais de Teste**

Após executar o seed, use estas credenciais:

- **Admin:** `admin@vendeuonline.com` / `Admin123!@#`
- **Seller:** `seller@vendeuonline.com` / `Seller123!@#`
- **Buyer:** `buyer@vendeuonline.com` / `Buyer123!@#`

### **Checklist de Validação**

- [ ] `/api/health` retorna status OK
- [ ] `/api/plans` retorna 4 planos
- [ ] Login admin funciona
- [ ] Dashboard carrega sem erros
- [ ] Upload de imagens funciona
- [ ] Criação de produtos funciona

---

## 🐞 **TROUBLESHOOTING**

### **❌ Erro: "Banco de dados não disponível"**

- **Causa:** `DATABASE_URL` incorreta
- **Solução:** Verificar formato PostgreSQL do Supabase

### **❌ Erro: "Prisma não disponível"**

- **Causa:** Client Prisma não gerado no build
- **Solução:** Verificar `vercel.json` tem `npx prisma generate`

### **❌ Erro: "Token inválido"**

- **Causa:** `JWT_SECRET` não definido ou muito fraco
- **Solução:** Gerar chave de 64+ caracteres

### **❌ Frontend não carrega dados**

- **Causa:** Variáveis `VITE_*` não definidas
- **Solução:** Confirmar variáveis com prefixo correto

### **❌ Erro 500 nas APIs**

- **Causa:** Variáveis de ambiente faltando
- **Solução:** Verificar todas as variáveis essenciais

---

## 🎯 **RESULTADO ESPERADO**

Após seguir todos os passos:

✅ **API totalmente funcional** - conectada ao Supabase real  
✅ **Sistema de login funcionando** - 3 tipos de usuário  
✅ **4 planos de assinatura** - exibidos corretamente  
✅ **Upload de imagens** - via Supabase Storage  
✅ **Pagamentos ASAAS** - gateway brasileiro configurado  
✅ **PWA configurado** - instalável como app

---

## 📚 **DOCUMENTAÇÃO ADICIONAL**

- **Desenvolvimento Local:** `/docs/DEVELOPMENT.md`
- **Referência da API:** `/docs/API_REFERENCE.md`
- **Comandos Úteis:** `COMMANDS.md`

---

## 🚨 **IMPORTANTE**

- **NUNCA** commite o arquivo `.env` com credenciais reais
- **SEMPRE** use o `.env.example` como template
- **TESTE** em ambiente de desenvolvimento antes do deploy
- **MANTENHA** as variáveis do Vercel atualizadas

**✅ O sistema agora está 100% em modo produção real!**
