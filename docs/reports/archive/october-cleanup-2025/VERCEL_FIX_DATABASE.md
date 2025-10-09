# 🔧 Guia de Correção - Erro 500 nas APIs do Vercel

## 🚨 Problema Identificado

O site https://www.vendeu.online/ está retornando **Erro 500** nas seguintes APIs:

- `/api/products` - Produtos não aparecem
- `/api/stores` - Lojas não aparecem

### Causa Raiz

O arquivo `.env.vercel` contém um **placeholder** ao invés da senha real do PostgreSQL:

```env
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:[SUA_SENHA_POSTGRES]@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres
```

❌ **`[SUA_SENHA_POSTGRES]`** é um placeholder e não uma senha válida!

---

## ✅ Solução - Passo a Passo

### 1️⃣ Obter a Senha Real do PostgreSQL

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto: `dycsfnbqgojhttnjbndp`
3. Vá em **Settings** (⚙️) → **Database**
4. Procure por **"Connection string"** ou **"Database Password"**
5. Copie a **senha do PostgreSQL** (NÃO é o JWT token!)

⚠️ **IMPORTANTE**: A senha do PostgreSQL é diferente dos JWT tokens (ANON_KEY e SERVICE_ROLE_KEY)!

---

### 2️⃣ Atualizar a Variável no Vercel

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione o projeto **vendeu-online**
3. Vá em **Settings** → **Environment Variables**
4. Encontre a variável `DATABASE_URL`
5. Clique em **Edit** (✏️)
6. Substitua `[SUA_SENHA_POSTGRES]` pela senha real copiada do Supabase
7. Certifique-se que está configurada para **Production**
8. Clique em **Save**

**Formato correto:**

```env
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:SUA_SENHA_REAL_AQUI@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres
```

---

### 3️⃣ Fazer Redeploy no Vercel

1. No Vercel Dashboard, vá em **Deployments**
2. Clique nos três pontos (**...**) do último deployment
3. Selecione **Redeploy**
4. Aguarde o build e deploy finalizar (~2-3 minutos)

---

### 4️⃣ Verificar se o Problema Foi Resolvido

#### Opção A: Health Check Endpoint (Recomendado)

Acesse o novo endpoint de health check:

```
https://www.vendeu.online/api/health/db
```

✅ **Resposta esperada (Status 200):**

```json
{
  "status": "healthy",
  "timestamp": "2025-09-30T...",
  "responseTime": "45ms",
  "database": {
    "connection": "connected",
    "type": "Supabase PostgreSQL"
  },
  "environment": {
    "configured": true,
    "missing": []
  },
  "nodeEnv": "production"
}
```

❌ **Se retornar 503:**

- `database.connection: "disconnected"` → Senha incorreta
- `environment.missing: ["databaseUrl"]` → Variável não configurada

#### Opção B: Testar APIs Diretas

1. **Produtos:**

   ```
   https://www.vendeu.online/api/products
   ```

   ✅ Deve retornar uma lista de produtos (mesmo que vazia)

2. **Lojas:**
   ```
   https://www.vendeu.online/api/stores
   ```
   ✅ Deve retornar uma lista de lojas (mesmo que vazia)

#### Opção C: Verificar Console do Site

1. Abra https://www.vendeu.online/
2. Pressione **F12** para abrir DevTools
3. Vá na aba **Console**
4. Recarregue a página (**Ctrl+F5**)
5. Não deve aparecer erros de "Erro 500" ou "Serviço temporariamente indisponível"

---

## 📊 Logs Detalhados

As APIs agora incluem logs mais detalhados para facilitar o diagnóstico:

```javascript
// Exemplo de log de erro detalhado
{
  "message": "Connection error",
  "code": "ECONNREFUSED",
  "details": "...",
  "hint": "Check DATABASE_URL configuration"
}
```

**Mensagens de erro específicas implementadas:**

- ❌ **"Configuração do banco de dados ausente"** → SUPABASE_URL não configurada
- ❌ **"Erro de conexão com o banco de dados"** → Senha incorreta ou banco offline
- ❌ **"Token de acesso inválido ou expirado"** → JWT token inválido
- ❌ **"A tabela ou relacionamento solicitado não existe"** → Erro de schema (PGRST116)

---

## 🔍 Como Diagnosticar Outros Problemas

### Verificar Logs do Vercel

1. Acesse **Vercel Dashboard** → **Deployments**
2. Clique no último deployment
3. Vá em **Functions** → Selecione `/api/products` ou `/api/stores`
4. Clique em **Logs** para ver erros detalhados

### Variáveis de Ambiente Necessárias

Certifique-se que TODAS as variáveis abaixo estão configuradas no Vercel:

```env
# Banco de Dados (CRÍTICO)
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:SENHA_REAL@db...

# Supabase - Backend
SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase - Frontend (VITE_)
VITE_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase - Frontend (NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret (CRÍTICO)
JWT_SECRET=7824dc4b9456dd55b73eb7236560b0121cfcb5c96d3dc6dc...

# Configuração
NODE_ENV=production
APP_ENV=production
```

---

## 🎯 Resultado Esperado

Após seguir todos os passos:

✅ Site carrega produtos e lojas normalmente
✅ Health check `/api/health/db` retorna status 200
✅ Console do navegador sem erros 500
✅ APIs respondem em < 500ms
✅ Performance mantém LCP < 200ms

---

## 📞 Suporte

Se o problema persistir após seguir todos os passos:

1. Verifique os logs do Vercel Functions
2. Teste o health check endpoint: `/api/health/db`
3. Confirme que a senha do PostgreSQL está correta no Supabase Dashboard
4. Verifique se o projeto Supabase não está pausado

---

**Última atualização:** 30 de Setembro de 2025
**Autor:** Análise de Performance - DevTools Chrome
