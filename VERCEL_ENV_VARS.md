# 🔧 VARIÁVEIS DE AMBIENTE PARA VERCEL

Este arquivo contém todas as variáveis de ambiente necessárias para o deploy no Vercel. **NÃO faça upload do arquivo .env** - use este arquivo para configurar manualmente no painel do Vercel.

## 📍 ONDE CONFIGURAR

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto **vendeu-online**
3. Vá em **Settings** → **Environment Variables**
4. Adicione cada variável abaixo uma por uma

---

## 🔑 VARIÁVEIS ESSENCIAIS (OBRIGATÓRIAS)

### Database & Backend

```
DATABASE_URL
```

```
postgresql://postgres.dycsfnbqgojhttnjbndp:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres
```

### JWT Secret (IMPORTANTE: Gere uma nova chave para produção)

```
JWT_SECRET
```

```
cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac
```

### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL
```

```
https://dycsfnbqgojhttnjbndp.supabase.co
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
```

```
SUPABASE_SERVICE_ROLE_KEY
```

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw
```

### App Configuration

```
APP_NAME
```

```
Vendeu Online
```

```
APP_URL
```

```
https://www.vendeu.online
```

```
APP_ENV
```

```
production
```

---

## 💳 PAGAMENTO - ASAAS (OBRIGATÓRIAS PARA COMPRAS)

```
ASAAS_API_KEY
```

```
$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojk3YmFiNGMyLTRjNDItNGNjNi1iNzhkLTYxMjQ3NzBmMmYxMTo6JGFhY2hfYTcxYmZlOGEtZGYwMS00MGNkLWE4NDYtYjk2YWU3MDdkZGI5
```

```
ASAAS_BASE_URL
```

```
https://api.asaas.com/v3
```

```
ASAAS_WEBHOOK_TOKEN
```

```
asaas-webhook-secret-2024
```

```
ASAAS_WEBHOOK_URL
```

```
https://www.vendeu.online/api/payments/webhook
```

---

## 📧 EMAIL (OPCIONAIS - Para notificações)

```
SMTP_HOST
```

```
smtp.gmail.com
```

```
SMTP_PORT
```

```
587
```

```
SMTP_USER
```

```
demo@vendeuonline.com
```

```
SMTP_PASS
```

```
demo-password
```

```
SMTP_FROM
```

```
noreply@vendeuonline.com
```

---

## ⚙️ CONFIGURAÇÕES ADICIONAIS (OPCIONAIS)

### Upload Configuration

```
UPLOAD_MAX_SIZE
```

```
10485760
```

```
UPLOAD_ALLOWED_TYPES
```

```
image/jpeg,image/png,image/webp
```

### Analytics

```
GOOGLE_ANALYTICS_ID
```

```
G-DEMO123
```

### Cloudinary (Backup de upload)

```
CLOUDINARY_CLOUD_NAME
```

```
demo-cloud
```

```
CLOUDINARY_API_KEY
```

```
demo-key
```

```
CLOUDINARY_API_SECRET
```

```
demo-secret
```

### Rate Limiting

```
RATE_LIMIT_MAX
```

```
100
```

```
RATE_LIMIT_WINDOW
```

```
900000
```

---

## ⚠️ IMPORTANTE

### Para Produção:

1. **JWT_SECRET**: Gere uma nova chave forte com:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **ASAAS_API_KEY**: Certifique-se de usar a chave de produção (prefixo `$aact_prod_`)

3. **Webhooks**: Configure o webhook no painel ASAAS apontando para:
   ```
   https://www.vendeu.online/api/payments/webhook
   ```

### Configuração no Vercel:

- Para **todas** as variáveis, selecione **Environment**: `Production`, `Preview`, `Development`
- **NÃO** marque como "sensitive" as variáveis PUBLIC (NEXT*PUBLIC*\*)
- **MARQUE** como "sensitive": JWT_SECRET, ASAAS_API_KEY, SMTP_PASS, DATABASE_URL

---

## ✅ CHECKLIST

- [ ] Todas as 20 variáveis configuradas no Vercel
- [ ] JWT_SECRET gerado especificamente para produção
- [ ] APP_URL apontando para domínio correto
- [ ] Webhook ASAAS configurado
- [ ] Deploy testado com todas as funcionalidades

---

**🚀 Após configurar todas as variáveis, faça um novo deploy no Vercel para aplicar as mudanças.**
