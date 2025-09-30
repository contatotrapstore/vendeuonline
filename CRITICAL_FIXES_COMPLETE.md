# 🚨 CORREÇÕES CRÍTICAS COMPLETAS - 30/09/2025

## ✅ **PROBLEMAS RESOLVIDOS**

### 🔥 **PROBLEMA #1: api/lib/supabase-client.js AUSENTE** ✅ RESOLVIDO

**Causa**: Arquivo importado 5x mas não existia em `api/lib/`
**Solução**: Criado `api/lib/supabase-client.js` adaptado para serverless
**Mudanças**:

- ✅ Sem `process.exit(1)` (não mata serverless)
- ✅ Sem `dotenv` (desnecessário no Vercel)
- ✅ Suporte a NEXT*PUBLIC*, VITE\_ e padrão
- ✅ Funções: `getPlansAnon()`, `getProductsAnon()`, `getStoresAnon()`, `getAdminStatsSupabase()`

### 🔥 **PROBLEMA #2: getEnvVar() Incompleto** ✅ RESOLVIDO

**Causa**: Só tentava NEXT*PUBLIC*, não tentava VITE\_
**Solução**: Atualizado para tentar 3 formatos

```javascript
// ANTES
const getEnvVar = (varName) => {
  return process.env[`NEXT_PUBLIC_${varName}`] || process.env[varName];
};

// DEPOIS
const getEnvVar = (varName) => {
  return process.env[`NEXT_PUBLIC_${varName}`] || process.env[`VITE_${varName}`] || process.env[varName];
};
```

### 🔥 **PROBLEMA #3: vercel.json Quebrando Rotas** ✅ RESOLVIDO

**Causa**: Wildcard `/api/(.*)` capturava todas as rotas antes das específicas
**Solução**: Adicionadas rotas específicas ANTES do wildcard

```json
"rewrites": [
  { "source": "/api/vercel-check", "destination": "/api/vercel-check" },
  { "source": "/api/diagnostics", "destination": "/api/diagnostics" },
  { "source": "/api/tracking/configs", "destination": "/api/tracking/configs" },
  { "source": "/api/(.*)", "destination": "/api/index" }
]
```

---

## 📊 **RESUMO DAS MUDANÇAS**

### Arquivos Criados:

- ✅ `api/lib/supabase-client.js` (198 linhas)

### Arquivos Modificados:

- ✅ `api/index.js` (getEnvVar corrigido)
- ✅ `vercel.json` (rewrites corrigidos)

### Total de Correções:

- **3 problemas críticos resolvidos**
- **1 arquivo novo criado**
- **2 arquivos modificados**

---

## 🧪 **COMO TESTAR**

### 1. Verificação Local (Desenvolvimento)

```bash
# Instalar dependências
npm install

# Rodar localmente
npm run dev

# Testar endpoint de diagnóstico
curl http://localhost:5173/api/vercel-check
```

### 2. Deploy no Vercel

```bash
# Fazer commit
git add .
git commit -m "fix: Resolver 3 problemas críticos para Vercel

- Criar api/lib/supabase-client.js adaptado para serverless
- Corrigir getEnvVar() para suportar VITE_ + NEXT_PUBLIC_ + padrão
- Corrigir vercel.json rewrites para permitir rotas específicas"

# Push para Vercel
git push origin main
```

### 3. Validação Pós-Deploy

```bash
# 1. Health check geral
curl https://www.vendeu.online/api/health/check

# 2. Diagnóstico completo
curl https://www.vendeu.online/api/vercel-check

# 3. Testar APIs principais
curl https://www.vendeu.online/api/plans
curl https://www.vendeu.online/api/products
curl https://www.vendeu.online/api/stores
```

---

## ⚙️ **VARIÁVEIS DE AMBIENTE NECESSÁRIAS**

Configure no **Vercel Dashboard → Settings → Environment Variables**:

### Backend (obrigatórias)

```
DATABASE_URL=postgresql://postgres.xxx:[SENHA_REAL]@db.xxx.supabase.co:5432/postgres
JWT_SECRET=7824dc4b9456dd55b73eb7236560b0121cfcb5c96d3dc6dc27c9a2841356ac6762bc9b933477313ff1e56cd022d8284e550ceb8e2778c0403e644ddec35bf653
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend/Backend (3 formatos para máxima compatibilidade)

```
# Formato Next.js
NEXT_PUBLIC_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Formato Vite
VITE_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Formato padrão (fallback)
SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Ambiente

```
NODE_ENV=production
APP_ENV=production
```

---

## 🎯 **PONTOS DE ATENÇÃO**

### ⚠️ Senha do PostgreSQL

- **CRÍTICO**: DATABASE_URL deve ter a senha REAL do PostgreSQL
- Não use `[SUA_SENHA_POSTGRES]` - substitua pela senha do Supabase Dashboard
- Para resetar senha: Supabase → Settings → Database → Reset password

### ⚠️ Variáveis em 3 Formatos

- Configure SEMPRE em 3 formatos (NEXT*PUBLIC*, VITE\_, padrão)
- Isso garante que funciona no build E no runtime
- Vercel pode usar formatos diferentes dependendo do contexto

### ⚠️ Ordem dos Rewrites

- Rotas específicas devem vir ANTES do wildcard
- Se adicionar novas rotas específicas, coloque antes de `/api/(.*)`

---

## 📋 **CHECKLIST DE DEPLOY**

- [ ] Arquivo `api/lib/supabase-client.js` existe
- [ ] `getEnvVar()` tenta 3 formatos
- [ ] `vercel.json` tem rotas específicas antes do wildcard
- [ ] Todas as variáveis configuradas no Vercel (3 formatos)
- [ ] DATABASE_URL com senha real do PostgreSQL
- [ ] Código commitado e pushed
- [ ] Deploy concluído sem erros
- [ ] `/api/vercel-check` retorna status ✅ READY
- [ ] `/api/health/check` retorna status READY
- [ ] APIs principais funcionando

---

## 🆘 **TROUBLESHOOTING**

### Erro: "Cannot find module './lib/supabase-client.js'"

**Causa**: Arquivo não foi commitado
**Solução**: Verificar se `api/lib/supabase-client.js` foi incluído no git add

### Erro: "SUPABASE_URL não definido"

**Causa**: Variáveis não configuradas em todos os formatos
**Solução**: Adicionar NEXT_PUBLIC_SUPABASE_URL + VITE_SUPABASE_URL + SUPABASE_URL

### Erro: "/api/vercel-check retorna 404"

**Causa**: vercel.json não atualizado ou rewrites na ordem errada
**Solução**: Verificar se route específica está ANTES do wildcard

### Erro: "Prisma falhou mas Supabase também"

**Causa**: Possível problema com DATABASE_URL ou RLS policies
**Solução**:

1. Verificar se DATABASE_URL tem senha real
2. Testar conexão com `/api/diagnostics`
3. Verificar RLS policies no Supabase Dashboard

---

**Status**: ✅ Todas as correções críticas aplicadas
**Próximo Passo**: Commit + Push + Deploy + Teste
**Autor**: Claude Code
**Data**: 30/09/2025
