# 🚀 Guia Completo de Deploy no Render

## 📋 Visão Geral da Arquitetura

Esta aplicação usa uma arquitetura **separada** para melhor performance e confiabilidade:

- **Frontend**: Vercel (React + Vite) - `https://www.vendeu.online`
- **Backend**: Render (Express.js + Node.js) - `https://vendeuonline-api.onrender.com`
- **Database**: Supabase (PostgreSQL) - `dycsfnbqgojhttnjbndp.supabase.co`

### Por que Separar Frontend e Backend?

✅ **Vantagens**:

1. Express.js roda nativamente no Render (sem conversão para serverless)
2. Logs e debugging muito mais claros
3. Sem limites de timeout (Vercel tem 10s)
4. Sem cold starts para requisições de API
5. Zero mudanças no código backend existente
6. Custo zero (Render free tier: 750h/mês)

❌ **Desvantagens da Abordagem Anterior** (tudo no Vercel):

1. Express.js não funciona nativamente em serverless
2. Precisaria reescrever 21 rotas complexas
3. Cold starts lentos
4. Debugging difícil
5. Limites de timeout e memória

---

## 🎯 Passo 1: Preparação do Código

Todos os arquivos já foram configurados:

### ✅ Arquivos Criados/Modificados:

1. **`render.yaml`** - Configuração do serviço Render
2. **`package.json`** - Scripts `render:build` e `render:start`
3. **`server.js`** - CORS atualizado para aceitar Vercel
4. **`src/config/api.ts`** - URL da API dinâmica
5. **`.env.production`** - Variáveis de produção para Vercel

---

## 🔧 Passo 2: Deploy do Backend no Render

### 2.1. Criar Conta no Render

1. Acesse: https://render.com/
2. Crie conta gratuita (pode usar GitHub OAuth)
3. Confirme email

### 2.2. Conectar Repositório GitHub

1. No dashboard Render, clique em **"New +"** → **"Web Service"**
2. Conecte sua conta GitHub
3. Selecione o repositório `vendeuonline`
4. Autorize o Render

### 2.3. Configurar Web Service

Preencha os campos:

- **Name**: `vendeuonline-api`
- **Region**: `Oregon (US West)` ou `Frankfurt (EU Central)`
- **Branch**: `main`
- **Root Directory**: (deixe vazio)
- **Runtime**: `Node`
- **Build Command**: `npm ci && npx prisma generate`
- **Start Command**: `node server.js`

### 2.4. Configurar Plano

- **Instance Type**: `Free` (750 horas/mês gratuitas)
- **Auto-Deploy**: `Yes` (deploy automático no push)

### 2.5. Adicionar Variáveis de Ambiente

Clique em **"Advanced"** e adicione estas variáveis:

```bash
NODE_ENV=production
PORT=3000

# Database - Supabase
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:Q1XVu4DgLQRsup5E@db.dycsfnbqgojhttnjbndp.supabase.co:6543/postgres

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw

# JWT Secret (64 bytes hex)
JWT_SECRET=7824dc4b9456dd55b73eb7236560b0121cfcb5c96d3dc6dc27c9a2841356ac6762bc9b933477313ff1e56cd022d8284e550ceb8e2778c0403e644ddec35bf653

# App Configuration
APP_NAME=Vendeu Online
APP_URL=https://www.vendeu.online
APP_ENV=production
FRONTEND_URL=https://www.vendeu.online

# ASAAS Payment Gateway (Production)
ASAAS_API_KEY=$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojk3YmFiNGMyLTRjNDItNGNjNi1iNzhkLTYxMjQ3NzBmMmYxMTo6JGFhY2hfYTcxYmZlOGEtZGYwMS00MGNkLWE4NDYtYjk2YWU3MDdkZGI5
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=asaas-webhook-secret-2024

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=demo@vendeuonline.com
SMTP_PASS=demo-password
SMTP_FROM=noreply@vendeuonline.com

# Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp

# Analytics
GOOGLE_ANALYTICS_ID=G-DEMO123

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

### 2.6. Configurar Health Check

Em **"Advanced"** → **"Health Check Path**:

- Health Check Path: `/api/health`

### 2.7. Deploy!

1. Clique em **"Create Web Service"**
2. Aguarde o build (~3-5 minutos)
3. Quando concluído, você verá: ✅ **Live**

### 2.8. Verificar URL

Sua API estará disponível em:

```
https://vendeuonline-api.onrender.com
```

Teste o health check:

```bash
curl https://vendeuonline-api.onrender.com/api/health
```

Resposta esperada:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T...",
  "uptime": 123.45
}
```

---

## 🌐 Passo 3: Atualizar Frontend no Vercel

### 3.1. Adicionar Variável de Ambiente no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `vendeuonline`
3. Vá em **Settings** → **Environment Variables**
4. Adicione:

```bash
VITE_API_URL=https://vendeuonline-api.onrender.com
```

5. Selecione **Production**, **Preview**, e **Development**
6. Clique em **"Save"**

### 3.2. Redeploy Frontend

Faça um commit vazio para triggerar redeploy:

```bash
git commit --allow-empty -m "chore: trigger redeploy with new API URL"
git push origin main
```

Ou no dashboard Vercel:

1. Vá em **Deployments**
2. Clique nos 3 pontos do último deployment
3. Clique em **"Redeploy"**

---

## ✅ Passo 4: Testar Integração Completa

### 4.1. Testar APIs no Render

```bash
# Health Check
curl https://vendeuonline-api.onrender.com/api/health

# Login (deve retornar 401 com credenciais inválidas)
curl -X POST https://vendeuonline-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

# Lista de produtos públicos
curl https://vendeuonline-api.onrender.com/api/products
```

### 4.2. Testar Frontend no Vercel

1. Acesse: https://www.vendeu.online
2. Abra DevTools (F12) → **Network**
3. Navegue pelo site
4. Verifique se as requisições vão para `vendeuonline-api.onrender.com`

### 4.3. Testar Login Completo

1. Acesse: https://www.vendeu.online/login
2. Login admin:
   - Email: `admin@vendeuonline.com`
   - Senha: `Test123!@#`
3. Deve redirecionar para `/painel/admin`

---

## 🔍 Passo 5: Monitoramento e Logs

### 5.1. Ver Logs no Render

1. Dashboard Render → Seu serviço `vendeuonline-api`
2. Clique em **"Logs"**
3. Logs em tempo real aparecem aqui

### 5.2. Ver Métricas

1. Dashboard Render → Seu serviço
2. Clique em **"Metrics"**
3. Veja CPU, memória, requisições

### 5.3. Alertas por Email

Render envia emails automaticamente se:

- Deploy falhar
- Serviço ficar offline
- Health check falhar

---

## 🚨 Troubleshooting

### Problema: Build falha no Render

**Solução**:

1. Verifique logs do build
2. Certifique-se que `package.json` tem `"type": "module"`
3. Verifique se todas as dependências estão no `package.json`

### Problema: API retorna 500 Internal Server Error

**Solução**:

1. Veja logs no Render Dashboard
2. Verifique se variáveis de ambiente estão corretas
3. Teste conexão com Supabase:
   ```bash
   curl https://dycsfnbqgojhttnjbndp.supabase.co/rest/v1/
   ```

### Problema: Frontend não conecta com API

**Solução**:

1. Verifique se `VITE_API_URL` está correto no Vercel
2. Abra DevTools → Network e veja se requisições usam a URL correta
3. Verifique CORS no `server.js` (linha 132-150)

### Problema: CORS Error

**Solução**:

1. Verifique se `https://www.vendeu.online` está na lista de CORS (server.js linha 142)
2. Certifique-se que `FRONTEND_URL` está definido no Render

### Problema: Cold Start Lento (Free Tier)

**Explicação**:

- Render free tier "dorme" após 15 minutos de inatividade
- Primeira requisição após sleep leva ~30s para "acordar"

**Soluções**:

1. **Upgrade para plano pago** ($7/mês) - serviço sempre ativo
2. **Ping Service** - usar cron job para fazer requisição a cada 10 minutos
3. **Aceitar cold starts** - normal para plano gratuito

---

## 📊 Custos

### Render (Backend)

- **Free Tier**: 750 horas/mês (suficiente para 1 serviço 24/7)
  - Limitações:
    - Sleep após 15min de inatividade
    - 512 MB RAM
    - Shared CPU
  - **Custo**: $0/mês

- **Starter**: $7/mês
  - Sempre ativo (sem sleep)
  - 512 MB RAM garantidos
  - **Recomendado para produção**

### Vercel (Frontend)

- **Hobby**: Gratuito
  - 100 GB bandwidth
  - Deploy ilimitados
  - **Custo**: $0/mês

### Supabase (Database)

- **Free Tier**: Atual
  - 500 MB database
  - 1 GB bandwidth
  - **Custo**: $0/mês

### Total Mensal

- **Desenvolvimento/Teste**: $0/mês (tudo free tier)
- **Produção (recomendado)**: $7/mês (apenas Render Starter)

---

## 🎉 Conclusão

Parabéns! Seu sistema agora está rodando com:

✅ **Frontend otimizado** no Vercel (CDN global)
✅ **Backend Express nativo** no Render (logs claros, sem cold starts críticos)
✅ **Database PostgreSQL** no Supabase (managed, backups automáticos)
✅ **Arquitetura escalável** e fácil de debugar

### Próximos Passos Opcionais:

1. Configurar **domínio customizado** no Render (ex: `api.vendeu.online`)
2. Adicionar **monitoring** (Sentry, LogRocket)
3. Configurar **backups automatizados** do Supabase
4. Implementar **CI/CD avançado** com testes antes do deploy
5. Upgrade Render para **Starter** ($7/mês) para eliminar cold starts

---

## 📞 Suporte

- **Documentação Render**: https://render.com/docs
- **Documentação Vercel**: https://vercel.com/docs
- **Documentação Supabase**: https://supabase.com/docs

---

**Data**: 02/10/2025
**Versão**: 1.0.0
**Arquitetura**: Frontend (Vercel) + Backend (Render) + DB (Supabase)
