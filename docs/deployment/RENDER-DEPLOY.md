# 🚀 Guia de Deploy - Backend no Render.com

**Data:** 22 Outubro 2025
**Contexto:** Correção crítica do sistema de upload - Backend separado do Frontend

---

## 📋 Problema Identificado

### ❌ Situação Anterior (QUEBRADA):

- **Vercel configurado como SPA** (`framework: null`, apenas servindo arquivos estáticos de `/dist`)
- **server.js NÃO executa no Vercel** - apenas frontend é servido
- **Todas APIs retornam 404** em produção
- **Upload completamente quebrado**: `POST /api/upload 404 (Not Found)`

### ✅ Solução Implementada:

- **Frontend no Vercel** - Serve React SPA otimizado
- **Backend no Render.com** - Executa Express.js com todas APIs
- **Comunicação CORS** - Frontend acessa backend via `VITE_API_URL`

---

## 🎯 Arquitetura Final

```
┌─────────────────────────────────────────┐
│   FRONTEND (Vercel)                     │
│   https://www.vendeu.online             │
│                                          │
│   - React + Vite Build                  │
│   - Arquivos estáticos (/dist)          │
│   - Roteamento SPA                      │
└──────────────┬──────────────────────────┘
               │
               │ VITE_API_URL
               │
               ▼
┌─────────────────────────────────────────┐
│   BACKEND (Render.com)                  │
│   https://vendeuonline-api.onrender.com │
│                                          │
│   - Express.js API Server               │
│   - Todas rotas /api/*                  │
│   - Upload de imagens                   │
│   - Autenticação JWT                    │
│   - Conexão Supabase                    │
└─────────────────────────────────────────┘
```

---

## 🛠️ PASSO 1: Deploy do Backend no Render.com

### 1.1. Criar Conta no Render.com

1. Acesse: https://render.com
2. Faça login com GitHub
3. Autorize acesso ao repositório `vendeuonline`

### 1.2. Criar Web Service

1. No dashboard do Render, clique em **"New +"** → **"Web Service"**
2. Conecte o repositório GitHub: `vendeuonline`
3. Configure o serviço:

**Configurações Básicas:**
- **Name:** `vendeuonline-api`
- **Region:** `Oregon (US West)` (mais próximo do Brasil)
- **Branch:** `main`
- **Runtime:** `Node`
- **Build Command:** `npm install && npx prisma generate`
- **Start Command:** `node server.js`

**Plano:**
- **Plan:** `Free` (para testes) ou `Starter` ($7/mês para produção)

### 1.3. Configurar Variáveis de Ambiente

No dashboard do Render, vá em **"Environment"** e adicione:

```bash
# Essenciais
NODE_ENV=production
PORT=10000

# Database (Supabase)
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[SUA_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SUA_SERVICE_ROLE_KEY]

# JWT
JWT_SECRET=[GERE UMA CHAVE FORTE]

# Pagamentos ASAAS
ASAAS_API_KEY=[SUA_ASAAS_KEY]
ASAAS_BASE_URL=https://www.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN=[SEU_WEBHOOK_TOKEN]

# Email (Opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=[SEU_EMAIL]
SMTP_PASS=[SUA_SENHA_APP]
SMTP_FROM=[SEU_EMAIL]

# CORS (Vercel domains)
ALLOWED_ORIGINS=https://www.vendeu.online,https://vendeu.online,https://vendeuonline.vercel.app
```

⚠️ **IMPORTANTE:** Substitua os valores entre `[...]` pelos valores reais do seu `.env`

### 1.4. Verificar Health Check

Render.com automaticamente checa `/health` (configurado em `render.yaml`).

### 1.5. Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o build (3-5 minutos)
3. Verifique os logs para confirmar que iniciou com sucesso
4. Anote a URL gerada (ex: `https://vendeuonline-api.onrender.com`)

---

## 🎯 PASSO 2: Configurar Frontend (Vercel)

### 2.1. Adicionar Variável de Ambiente

1. Acesse: https://vercel.com
2. Vá em **Settings** → **Environment Variables**
3. Adicione a variável:

```bash
VITE_API_URL=https://vendeuonline-api.onrender.com
```

⚠️ **Substituir pela URL real do Render.com** anotada no passo 1.5

### 2.2. Forçar Redeploy

1. Vá em **Deployments**
2. Clique nos **"..."** do deployment mais recente
3. Selecione **"Redeploy"**
4. Aguarde conclusão (~2 minutos)

---

## ✅ PASSO 3: Validação

### 3.1. Testar Backend (Render.com)

**Health Check:**
```bash
curl https://vendeuonline-api.onrender.com/health
```

**Resposta Esperada:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-22T23:45:00.000Z"
}
```

### 3.2. Testar CORS

```bash
curl -X OPTIONS https://vendeuonline-api.onrender.com/api/auth/login \
  -H "Origin: https://www.vendeu.online" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Resposta Esperada:**
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://www.vendeu.online
< Access-Control-Allow-Credentials: true
```

### 3.3. Testar Upload (Frontend)

1. Acesse: https://www.vendeu.online/login
2. Faça login com `newseller@vendeuonline.com` / `Test123!@#`
3. Vá em `/seller/store`
4. Tente fazer upload de logo ou banner
5. Verifique no console se upload funciona

---

## 🔧 Troubleshooting

### Problema 1: Backend retorna 503 Service Unavailable

**Causa:** Render.com free tier entra em sleep após 15 minutos de inatividade

**Solução Temporária:**
1. Acesse a URL do backend no navegador para "acordá-lo"
2. Aguarde 30-60 segundos
3. Tente novamente

**Solução Permanente:**
- Upgrade para plano Starter ($7/mês) - não entra em sleep

### Problema 2: CORS Blocked

**Erro:**
```
Access blocked by CORS policy
```

**Solução:**
1. Verifique `ALLOWED_ORIGINS` no Render.com inclui domínio correto
2. Redeploy backend

### Problema 3: Upload retorna 404

**Diagnóstico:**
```bash
curl https://vendeuonline-api.onrender.com/api/upload -X POST -v
```

**Possíveis Causas:**
1. Backend não iniciou corretamente - verificar logs no Render
2. Rota não registrada - verificar server.js
3. Middleware bloqueando - verificar logs de autenticação

### Problema 4: JWT Token Invalid

**Solução:**
1. Confirme `JWT_SECRET` no Render.com é EXATAMENTE o mesmo do Vercel
2. Faça logout + login novamente no frontend
3. Verifique que token está sendo enviado no header Authorization

---

## 📊 Monitoramento

### Render.com Logs

1. Acesse dashboard do Render
2. Clique no serviço `vendeuonline-api`
3. Vá na aba **"Logs"**
4. Monitore em tempo real

**Logs Importantes:**
```bash
✅ Servidor rodando em http://0.0.0.0:10000
✅ Conectado ao PostgreSQL
✅ Prisma Client gerado
```

---

## 🚀 Deploy Futuro (CI/CD)

### Automação de Deploy

**Backend (Render.com):**
- Render já faz autodeploy no push para `main` branch
- Configurado via integração GitHub

**Frontend (Vercel):**
- Vercel já faz autodeploy automático
- Toda alteração em `main` dispara novo build

### Workflow Recomendado:

1. **Desenvolvimento Local:**
   ```bash
   npm run dev       # Frontend: localhost:5173
   npm run api       # Backend: localhost:3000
   ```

2. **Commit & Push:**
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin main
   ```

3. **Deploy Automático:**
   - Render.com detecta push → faz deploy backend
   - Vercel detecta push → faz deploy frontend
   - Aguardar 2-5 minutos

4. **Validação:**
   - Testar em https://www.vendeu.online
   - Verificar logs no Render + Vercel

---

## ✅ Checklist Final

Antes de considerar deploy concluído:

- [ ] Backend no Render.com respondendo em `/health`
- [ ] Variável `VITE_API_URL` configurada no Vercel
- [ ] CORS permitindo domínios Vercel
- [ ] Login funcionando (JWT válido)
- [ ] Upload de imagens funcionando (logo + banner)
- [ ] APIs retornando dados reais do Supabase
- [ ] Logs limpos (sem erros críticos)
- [ ] Performance aceitável (<2s response time)

---

**Última Atualização:** 22 Outubro 2025
**Autor:** Claude Code
**Status:** ✅ Pronto para Produção
