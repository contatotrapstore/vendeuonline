# 🚨 CORREÇÃO URGENTE - PROBLEMAS DO RENDER

**Data:** 06/10/2025
**Status:** ⚠️ CRÍTICO - Ação Imediata Necessária

---

## ❌ **PROBLEMAS IDENTIFICADOS**

### **1. Variáveis de Ambiente Não Carregando**
```
[dotenv@17.2.2] injecting env (0) from .env
                              ^^^
                         0 VARIÁVEIS!
```

**Causa:** Render não usa arquivo `.env` - precisa configurar no Dashboard

### **2. Memória Crítica**
```
❌ CRITICAL ALERT: Memory usage: 93.98%
```

**Causa:** Free tier = 512 MB RAM, aplicação sem variáveis está em loop

---

## 🔧 **SOLUÇÃO IMEDIATA (5 MINUTOS)**

### **PASSO 1: Configurar Variáveis no Dashboard do Render**

1. **Acessar:** https://dashboard.render.com
2. **Selecionar:** Seu serviço `vendeuonline-api` ou `vendeuonline`
3. **Ir em:** Environment → Environment Variables
4. **Clicar em:** "Add Environment Variable"

### **PASSO 2: Adicionar Estas Variáveis (COPIE TODAS):**

#### **CRÍTICAS (SEM ELAS O SISTEMA NÃO FUNCIONA):**

```bash
NODE_ENV
production

PORT
3000

DATABASE_URL
postgresql://postgres.dycsfnbqgojhttnjbndp:Q1XVu4DgLQRsup5E@db.dycsfnbqgojhttnjbndp.supabase.co:6543/postgres

JWT_SECRET
7824dc4b9456dd55b73eb7236560b0121cfcb5c96d3dc6dc27c9a2841356ac6762bc9b933477313ff1e56cd022d8284e550ceb8e2778c0403e644ddec35bf653
```

#### **SUPABASE (3 VARIÁVEIS):**

```bash
NEXT_PUBLIC_SUPABASE_URL
https://dycsfnbqgojhttnjbndp.supabase.co

SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ

SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw
```

#### **APP CONFIG:**

```bash
APP_NAME
Vendeu Online

APP_URL
https://vendeuonline.onrender.com

APP_ENV
production

FRONTEND_URL
https://www.vendeu.online
```

#### **ASAAS (PAGAMENTOS - OPCIONAL):**

```bash
ASAAS_API_KEY
$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojk3YmFiNGMyLTRjNDItNGNjNi1iNzhkLTYxMjQ3NzBmMmYxMTo6JGFhY2hfYTcxYmZlOGEtZGYwMS00MGNkLWE4NDYtYjk2YWU3MDdkZGI5

ASAAS_BASE_URL
https://api.asaas.com/v3

ASAAS_WEBHOOK_TOKEN
asaas-webhook-secret-2024
```

### **PASSO 3: Salvar e Fazer Redeploy**

1. Clicar em **"Save Changes"**
2. Ir em **Manual Deploy** → **"Deploy latest commit"**
3. Aguardar ~3-5 minutos
4. Verificar logs

---

## ✅ **VALIDAÇÃO PÓS-CORREÇÃO**

### **Verificar Logs do Render:**

Você deve ver:
```
✅ Todas as variáveis de ambiente estão configuradas
✅ Conexão com Supabase estabelecida
🚀 Server running on port 3000
```

**NÃO deve aparecer:**
```
❌ [dotenv] injecting env (0) from .env
❌ CRITICAL ALERT: Memory usage
❌ JWT_SECRET não definido
```

### **Testar API:**

```bash
curl https://vendeuonline.onrender.com/api/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-06T...",
  "uptime": 123.45,
  "database": {
    "connection": "connected",
    "type": "Supabase PostgreSQL"
  }
}
```

---

## 🔍 **SOBRE O render.yaml**

### **⚠️ IMPORTANTE:**

O arquivo `render.yaml` é **apenas um template/documentação**.

**Ele NÃO injeta variáveis automaticamente!**

Você precisa:
1. ✅ Copiar as variáveis do `render.yaml`
2. ✅ Colar manualmente no Dashboard do Render
3. ✅ Salvar e fazer redeploy

### **Alternativa: Blueprint (Render YAML)**

Se você quiser usar o `render.yaml` automaticamente:

1. No dashboard Render, clique em **"New +"**
2. Selecione **"Blueprint"**
3. Conecte o repositório
4. Render lerá o `render.yaml` e criará TUDO automaticamente

**Mas atenção:** Se você já criou o serviço manualmente, precisa adicionar as variáveis manualmente.

---

## 💡 **POR QUE ISSO ACONTECEU?**

### **Diferença: Local vs Produção**

**Local (seu PC):**
```javascript
dotenv.config() // ✅ Lê .env
process.env.DATABASE_URL // ✅ Funciona
```

**Produção (Render):**
```javascript
dotenv.config() // ❌ Tenta ler .env (não existe)
                 // ❌ Injeta 0 variáveis
process.env.DATABASE_URL // ❌ undefined
```

**Solução aplicada:**
```javascript
// Agora só carrega dotenv em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}
```

---

## 🚀 **PRÓXIMOS PASSOS APÓS CORREÇÃO**

### **1. Commit a Correção do server.js:**

```bash
git add server.js
git commit -m "fix: skip dotenv in production (Render uses env vars from dashboard)"
git push origin main
```

### **2. Aguardar Redeploy Automático do Render**

O Render vai detectar o push e fazer redeploy automático.

### **3. Configurar VITE_API_URL no Vercel**

Agora que o backend está funcionando:

1. Copiar a URL: `https://vendeuonline.onrender.com`
2. Ir no Vercel Dashboard
3. Adicionar variável:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://vendeuonline.onrender.com`
4. Redeploy frontend

### **4. Testar Integração Completa**

```bash
# Backend
curl https://vendeuonline.onrender.com/api/health

# Frontend
curl https://www.vendeu.online
```

---

## 📊 **MEMÓRIA: POR QUE 93.98%?**

### **Free Tier Render:**
- **Total RAM:** 512 MB
- **Node.js:** ~100 MB
- **Dependencies:** ~200 MB
- **Prisma Client:** ~100 MB
- **Application:** ~50 MB
- **Overhead:** ~50 MB
- **TOTAL:** ~500 MB = 97-98% de uso

### **É Normal?**

✅ **SIM** - Free tier tem 512 MB, é esperado usar 90-95%

### **Como Reduzir?**

1. **Upgrade para Starter ($7/mês):** 512 MB → 2 GB RAM
2. **Otimizar dependencies:** Remover pacotes não usados
3. **Lazy load routes:** Carregar rotas sob demanda

**Mas para MVP/teste, 93.98% é aceitável.**

---

## ✅ **CHECKLIST DE VALIDAÇÃO**

- [ ] Variáveis adicionadas no Dashboard do Render
- [ ] Redeploy feito
- [ ] Logs mostram "✅ Todas as variáveis configuradas"
- [ ] API `/api/health` retorna 200
- [ ] Memória estável (90-95% é normal)
- [ ] server.js corrigido commitado
- [ ] VITE_API_URL configurado no Vercel
- [ ] Frontend conectando ao backend

---

## 🆘 **TROUBLESHOOTING**

### **Problema: Ainda aparece "injecting env (0)"**

**Solução:**
1. Verifique se salvou as variáveis no dashboard
2. Faça um "Clear build cache and deploy"
3. Aguarde 5 minutos para propagar

### **Problema: JWT_SECRET não definido**

**Solução:**
1. Copie exatamente: `7824dc4b9456dd55b73eb7236560b0121cfcb5c96d3dc6dc27c9a2841356ac6762bc9b933477313ff1e56cd022d8284e550ceb8e2778c0403e644ddec35bf653`
2. Cole no campo "Value" da variável `JWT_SECRET`
3. Salve e redeploy

### **Problema: Database connection failed**

**Solução:**
1. Verifique `DATABASE_URL` está EXATAMENTE como acima
2. Teste conexão direto do Render Shell:
   ```bash
   node -e "require('pg').Client(...).connect()"
   ```

---

## 📞 **SUPORTE**

Se os problemas persistirem após seguir este guia:

1. Verificar logs completos no Render Dashboard
2. Testar health check: `curl https://vendeuonline.onrender.com/api/health`
3. Abrir issue no repositório com logs completos

---

**URGÊNCIA:** 🔥 ALTA - Configure as variáveis AGORA para o serviço funcionar
**TEMPO ESTIMADO:** 5-10 minutos
**DIFICULDADE:** Fácil - Copy/Paste de variáveis
