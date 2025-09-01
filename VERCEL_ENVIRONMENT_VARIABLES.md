# 🔑 VARIÁVEIS DE AMBIENTE - VERCEL

## 📋 COPIE E COLE EXATAMENTE NO VERCEL

Vá em: **Project Settings > Environment Variables** e adicione TODAS essas variáveis:

---

### 🔥 **ESSENCIAIS - SEM ESSAS O APP NÃO FUNCIONA**

**Name:** `DATABASE_URL`  
**Value:** `postgresql://postgres.dycsfnbqgojhttnjbndp:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres`

**Name:** `NEXT_PUBLIC_SUPABASE_URL`  
**Value:** `https://dycsfnbqgojhttnjbndp.supabase.co`

**Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ`

**Name:** `SUPABASE_SERVICE_ROLE_KEY`  
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw`

**Name:** `JWT_SECRET`  
**Value:** `cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac`

---

### 🏪 **APLICAÇÃO**

**Name:** `APP_NAME`  
**Value:** `Vendeu Online`

**Name:** `APP_URL`  
**Value:** `https://SEU-PROJETO.vercel.app` *(substitua pelo seu domínio real)*

**Name:** `APP_ENV`  
**Value:** `production`

---

### 💳 **PAGAMENTOS (ASAAS) - FUNCIONAIS**

**Name:** `ASAAS_API_KEY`  
**Value:** `$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojk3YmFiNGMyLTRjNDItNGNjNi1iNzhkLTYxMjQ3NzBmMmYxMTo6JGFhY2hfYTcxYmZlOGEtZGYwMS00MGNkLWE4NDYtYjk2YWU3MDdkZGI5`

**Name:** `ASAAS_BASE_URL`  
**Value:** `https://api.asaas.com/v3`

**Name:** `ASAAS_WEBHOOK_TOKEN`  
**Value:** `asaas-webhook-secret-2024`

**Name:** `ASAAS_WEBHOOK_URL`  
**Value:** `https://SEU-PROJETO.vercel.app/api/payments/webhook` *(substitua pelo seu domínio)*

---

### 📧 **EMAIL (OPCIONAL MAS RECOMENDADO)**

**Name:** `SMTP_HOST`  
**Value:** `smtp.gmail.com`

**Name:** `SMTP_PORT`  
**Value:** `587`

**Name:** `SMTP_USER`  
**Value:** `demo@vendeuonline.com` *(substitua pelo seu email)*

**Name:** `SMTP_PASS`  
**Value:** `demo-password` *(substitua pela sua senha de app)*

**Name:** `SMTP_FROM`  
**Value:** `noreply@vendeuonline.com` *(substitua pelo seu domínio)*

---

### 📤 **UPLOAD DE ARQUIVOS**

**Name:** `UPLOAD_MAX_SIZE`  
**Value:** `10485760`

**Name:** `UPLOAD_ALLOWED_TYPES`  
**Value:** `image/jpeg,image/png,image/webp`

---

### 📊 **ANALYTICS (OPCIONAL)**

**Name:** `GOOGLE_ANALYTICS_ID`  
**Value:** `G-DEMO123` *(substitua pelo seu ID real)*

---

### 🛡️ **RATE LIMITING**

**Name:** `RATE_LIMIT_MAX`  
**Value:** `100`

**Name:** `RATE_LIMIT_WINDOW`  
**Value:** `900000`

---

## 🚨 **IMPORTANTE - SUBSTITUA:**

1. **`SEU-PROJETO.vercel.app`** → Seu domínio real do Vercel
2. **Email SMTP** → Suas credenciais reais de email
3. **Google Analytics** → Seu ID real (se usar)

## ✅ **DEPOIS DE CONFIGURAR:**

1. **Salve** todas as variáveis no Vercel
2. **Force um redeploy:**
   ```bash
   git add .
   git commit -m "fix: configurar variáveis ambiente"
   git push
   ```
3. **Teste:** Acesse `/api/plans` - deve retornar JSON válido

---

## 🔍 **VERIFICAÇÃO:**

- ✅ Supabase deve estar conectado
- ✅ `/api/plans` retorna planos reais (não mocks)
- ✅ `/api/products` funciona
- ✅ Dashboard admin carrega
- ❌ Se ainda der erro HTML, verifique logs do Vercel

---

**Total de variáveis:** 18  
**Essenciais:** 5  
**Recomendadas:** 13