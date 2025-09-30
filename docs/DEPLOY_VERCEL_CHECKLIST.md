# ✅ Checklist Completo de Deploy no Vercel

**Data**: 30 de Setembro de 2025
**Projeto**: Vendeu Online
**Status**: Correções aplicadas - Pronto para deploy

## 🚨 Problema Identificado e Corrigido

### Erro Original

```
POST https://www.vendeu.online/api/auth/register 500 (Internal Server Error)
"Banco de dados não disponível. Verifique variáveis de ambiente."
```

### Causas Raiz

1. **DATABASE_URL incorreta** - Usando JWT token ao invés da senha PostgreSQL
2. **Imports quebrados** - `/api/index.js` importando de `./lib/` ao invés de `../server/lib/`
3. **Funções faltando** - `getPlansAnon()`, `getProductsAnon()`, `getStoresAnon()` não existiam

### Correções Aplicadas ✅

- ✅ Corrigidos todos os imports em `/api/index.js`
- ✅ Adicionadas funções em `server/lib/supabase-client.js`
- ✅ Adicionadas funções em `server/lib/supabase-direct.js`
- ✅ Atualizado `.env.vercel` com formato correto
- ✅ Adicionadas variáveis `NEXT_PUBLIC_*` para compatibilidade

---

## 📋 Checklist de Deploy

### 1. ☑️ Código Pronto

- [x] Imports corrigidos em `/api/index.js`
- [x] Funções Supabase adicionadas
- [x] TypeScript compilando sem erros
- [x] Teste de imports bem-sucedido
- [x] Commit criado

### 2. ⚠️ Obter Senha PostgreSQL

**CRÍTICO**: Você precisa da senha REAL do PostgreSQL, não do JWT token!

**Como obter**:

1. Acesse: https://app.supabase.com
2. Projeto: `dycsfnbqgojhttnjbndp`
3. Vá em: **Settings > Database**
4. Encontre: **"Connection string"** ou **"Database password"**
5. Copie a senha (será algo como: `MinH@S3nhaS3gur@123`)

**Se não souber a senha**:

- Clique em **"Reset database password"**
- Gere uma nova senha forte
- **IMPORTANTE**: Anote a senha, você precisará dela!

### 3. ☑️ Configurar Variáveis no Vercel

Acesse: https://vercel.com/dashboard

- Selecione: **vendeuonline-main**
- Vá em: **Settings > Environment Variables**

#### Variáveis Obrigatórias (Backend)

```bash
DATABASE_URL
postgresql://postgres.dycsfnbqgojhttnjbndp:[SUA_SENHA_POSTGRES]@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres
```

```bash
JWT_SECRET
7824dc4b9456dd55b73eb7236560b0121cfcb5c96d3dc6dc27c9a2841356ac6762bc9b933477313ff1e56cd022d8284e550ceb8e2778c0403e644ddec35bf653
```

```bash
SUPABASE_URL
https://dycsfnbqgojhttnjbndp.supabase.co
```

```bash
SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
```

```bash
SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw
```

#### Variáveis Frontend (Vite)

```bash
VITE_SUPABASE_URL
https://dycsfnbqgojhttnjbndp.supabase.co
```

```bash
VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
```

#### Variáveis Compatibilidade (Next.js)

```bash
NEXT_PUBLIC_SUPABASE_URL
https://dycsfnbqgojhttnjbndp.supabase.co
```

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
```

#### Variáveis Opcionais

```bash
NODE_ENV
production
```

```bash
APP_ENV
production
```

### 4. ☑️ Push do Código

```bash
# Verificar mudanças
git status

# Se necessário, adicionar correções
git add .
git commit -m "fix: Correções finais para deploy no Vercel"

# Push para main (trigger automático no Vercel)
git push origin main
```

### 5. ☑️ Aguardar Build no Vercel

- Acesse: https://vercel.com/dashboard
- Clique em: **Deployments**
- Aguarde o build completar (2-5 minutos)
- Verifique os logs para erros

### 6. ☑️ Validar Deploy

#### Teste 1: Health Check

```bash
curl https://www.vendeu.online/api/health/check
```

**Resposta esperada**:

```json
{
  "status": "READY",
  "message": "Sistema pronto para produção",
  "database": {
    "prisma": "✅ CONECTADO",
    "safeQuery": "✅ DISPONÍVEL"
  }
}
```

#### Teste 2: API de Produtos

```bash
curl https://www.vendeu.online/api/products
```

**Resposta esperada**:

```json
{
  "success": true,
  "products": [...]
}
```

#### Teste 3: Frontend

- Acesse: https://www.vendeu.online
- Teste navegação
- Teste listagem de produtos
- Teste login/registro

### 7. ☑️ Testar Funcionalidades Principais

- [ ] **Página inicial** carrega
- [ ] **Produtos** são listados
- [ ] **Detalhes do produto** abrem
- [ ] **Login** funciona
- [ ] **Registro** funciona
- [ ] **Carrinho** funciona (se houver)
- [ ] **Checkout** funciona
- [ ] **Dashboard seller** funciona (se houver)

---

## 🐛 Troubleshooting

### Erro: "Banco de dados não disponível"

**Solução**: Verifique se a DATABASE_URL está correta com a senha PostgreSQL real

### Erro: "Invalid API key"

**Solução**: Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada corretamente

### Erro: "CORS"

**Solução**: O vercel.json já tem CORS configurado. Verifique se não há conflitos

### Erro: "Module not found"

**Solução**: Os imports já foram corrigidos. Faça redeploy após push

### Build falha

**Solução**:

1. Verifique logs no Vercel Dashboard
2. Confirme que todas as dependências estão em `dependencies` (não em `devDependencies`)
3. Verifique se `prisma generate` está rodando

---

## 📊 Arquitetura do Deploy

```
Vercel Deploy
├── Frontend (Static)
│   ├── dist/ (arquivos compilados)
│   ├── index.html
│   └── assets/
│
└── Backend (Serverless)
    ├── api/index.js (handler principal)
    ├── api/tracking/configs.js
    └── server/
        ├── lib/
        │   ├── prisma.js (conexão banco)
        │   ├── supabase-client.js (client Supabase)
        │   └── supabase-direct.js (service role)
        └── routes/ (não usado em serverless)
```

**Fluxo de Requisições**:

1. Request: `https://www.vendeu.online/api/auth/login`
2. Vercel Rewrite: `/api/*` → `/api/index`
3. Handler: `api/index.js` processa a requisição
4. Response: JSON com resultado

---

## 📚 Documentação Adicional

- **Problema DATABASE_URL**: `docs/VERCEL_DATABASE_FIX.md`
- **Guide completo Vercel**: `docs/deployment/VERCEL_COMPLETE_GUIDE.md`
- **Variáveis de ambiente**: `.env.vercel` (template)

---

## ✅ Checklist Final

Antes de marcar como concluído:

- [ ] Código commitado e pushed
- [ ] Variáveis configuradas no Vercel (especialmente DATABASE_URL com senha correta)
- [ ] Build completado sem erros
- [ ] `/api/health/check` retorna "READY"
- [ ] APIs funcionam (produtos, auth, etc)
- [ ] Frontend carrega corretamente
- [ ] Login/registro funcionam
- [ ] Sem erros no console do navegador

---

**Última atualização**: 30/09/2025
**Autor**: Claude Code
**Status**: ✅ Pronto para deploy após configurar DATABASE_URL correta
