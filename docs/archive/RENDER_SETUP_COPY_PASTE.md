# 🚀 Setup Rápido no Render (Copy & Paste)

## Passo 1: Criar Web Service

1. Acesse: https://dashboard.render.com/
2. Clique em **"New +"** → **"Web Service"**
3. Conecte o repositório: `https://github.com/GouveiaZx/vendeuonline.git`

## Passo 2: Configurações Básicas

Copie e cole estas configurações:

```
Name: vendeuonline-api
Region: Oregon (US West)
Branch: main
Runtime: Node
Build Command: npm install && npx prisma generate
Start Command: node server.js
```

## Passo 3: Instance Type

Selecione:

- **Free** (ou **Starter** se quiser sempre ativo - $7/mês)

## Passo 4: Variáveis de Ambiente

Clique em **"Advanced"** e adicione estas variáveis (copie e cole uma por vez):

### Core Configuration

```
NODE_ENV=production
PORT=3000
```

### Database

```
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:Q1XVu4DgLQRsup5E@db.dycsfnbqgojhttnjbndp.supabase.co:6543/postgres
```

### Supabase

```
NEXT_PUBLIC_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw
```

### JWT Secret

```
JWT_SECRET=7824dc4b9456dd55b73eb7236560b0121cfcb5c96d3dc6dc27c9a2841356ac6762bc9b933477313ff1e56cd022d8284e550ceb8e2778c0403e644ddec35bf653
```

### App Configuration

```
APP_NAME=Vendeu Online
APP_URL=https://www.vendeu.online
APP_ENV=production
FRONTEND_URL=https://www.vendeu.online
```

### ASAAS Payment Gateway

```
ASAAS_API_KEY=$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojk3YmFiNGMyLTRjNDItNGNjNi1iNzhkLTYxMjQ3NzBmMmYxMTo6JGFhY2hfYTcxYmZlOGEtZGYwMS00MGNkLWE4NDYtYjk2YWU3MDdkZGI5
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=asaas-webhook-secret-2024
```

### Email Configuration

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=demo@vendeuonline.com
SMTP_PASS=demo-password
SMTP_FROM=noreply@vendeuonline.com
```

### Upload & Misc

```
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp
GOOGLE_ANALYTICS_ID=G-DEMO123
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

## Passo 5: Health Check

Em **"Advanced"** → **"Health Check"**:

```
Health Check Path: /api/health
```

## Passo 6: Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o build (~3-5 minutos)
3. Quando aparecer ✅ **Live**, copie a URL

## Passo 7: Testar API

Substitua `SUA-URL-AQUI` pela URL que o Render gerou:

```bash
curl https://SUA-URL-AQUI.onrender.com/api/health
```

Deve retornar:

```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...
}
```

## Passo 8: Atualizar Vercel

Depois que o Render estiver rodando:

1. Vá em: https://vercel.com/dashboard
2. Selecione projeto `vendeuonline`
3. **Settings** → **Environment Variables**
4. Adicione:
   ```
   VITE_API_URL=https://SUA-URL-AQUI.onrender.com
   ```
5. Marque: Production, Preview, Development
6. Clique **Save**
7. Vá em **Deployments** → Último deploy → **Redeploy**

## ✅ Conclusão

Após o redeploy do Vercel, teste:

```bash
# Abra o site
https://www.vendeu.online

# Faça login com:
Email: admin@vendeuonline.com
Senha: Test123!@#
```

## 🎉 Pronto!

Seu sistema agora está rodando com arquitetura separada:

- ✅ Frontend: Vercel
- ✅ Backend: Render
- ✅ Database: Supabase

---

**Nota**: Se você escolheu o plano **Free**, o serviço vai "dormir" após 15 minutos de inatividade. A primeira requisição após o sleep leva ~30s para "acordar". Para eliminar isso, faça upgrade para **Starter** ($7/mês).
