# 🚨 CORREÇÃO CRÍTICA: DATABASE_URL Incorreta no Vercel

**Data**: 30 de Setembro de 2025
**Problema**: Erro 500 nas APIs - "Banco de dados não disponível"
**Causa Raiz**: DATABASE_URL usando JWT token ao invés da senha PostgreSQL

## ❌ Problema Identificado

A `DATABASE_URL` configurada está **INCORRETA**:

```bash
# ❌ ERRADO - Usando JWT token como senha
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres
```

**Por que está errado?**

- A senha do PostgreSQL é uma string simples (ex: `MinH@S3nhaS3gur@123`)
- O JWT token (`eyJhbGciOiJIUzI1NiI...`) é usado para autenticação da **API REST do Supabase**
- São duas credenciais diferentes para fins diferentes!

## ✅ Formato Correto

```bash
# ✅ CORRETO - Usando senha real do PostgreSQL
DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[SENHA_POSTGRES]@db.[PROJECT_ID].supabase.co:5432/postgres
```

**Exemplo**:

```bash
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:MinH@S3nhaS3gur@123@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres
```

## 📋 Como Obter a Senha Correta

### Método 1: Painel Supabase (Recomendado)

1. **Acesse**: https://app.supabase.com
2. **Selecione seu projeto**: `grupomaboon@gmail.com's Project` (ID: dycsfnbqgojhttnjbndp)
3. **Navegue**: Settings > Database
4. **Encontre**: Seção "Connection string" ou "Database password"
5. **Copie a senha**: Será uma string como `MinH@S3nhaS3gur@123`

### Método 2: Reset de Senha (Se não souber a senha)

1. **Acesse**: Settings > Database
2. **Clique em**: "Reset database password"
3. **Gere uma nova senha forte**
4. **Copie a nova senha** (você precisará dela!)

## 🔐 Diferença Entre as Credenciais

| Credencial              | Uso                                         | Formato        |
| ----------------------- | ------------------------------------------- | -------------- |
| **PostgreSQL Password** | Conexão direta ao banco (Prisma, psql)      | String simples |
| **SERVICE_ROLE_KEY**    | API REST do Supabase (com permissões admin) | JWT token      |
| **ANON_KEY**            | API REST do Supabase (acesso público)       | JWT token      |

## 🚀 Passos para Corrigir no Vercel

### 1. Obter a Senha PostgreSQL

- Siga os passos da seção "Como Obter a Senha Correta"

### 2. Atualizar no Vercel Dashboard

1. **Acesse**: https://vercel.com/dashboard
2. **Selecione seu projeto**: vendeuonline-main
3. **Navegue**: Settings > Environment Variables
4. **Encontre**: `DATABASE_URL`
5. **Edite o valor** para:
   ```
   postgresql://postgres.dycsfnbqgojhttnjbndp:[SUA_SENHA_REAL]@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres
   ```
6. **Salve as mudanças**

### 3. Redeploy

```bash
# Opção 1: Push no GitHub (trigger automático)
git push origin main

# Opção 2: Redeploy manual no Vercel Dashboard
# Clique em "Deployments" > "..." > "Redeploy"
```

### 4. Validar

Após o deploy, teste:

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
  },
  "configuration": {
    "DATABASE_URL": "✅ CONFIGURADA",
    "JWT_SECRET": "✅ CONFIGURADA"
  }
}
```

## 📝 Outras Variáveis Necessárias no Vercel

Além da DATABASE_URL correta, verifique se estas variáveis estão configuradas:

### Backend (Obrigatórias)

```bash
DATABASE_URL=postgresql://postgres.dycsfnbqgojhttnjbndp:[SENHA_POSTGRES]@db.dycsfnbqgojhttnjbndp.supabase.co:5432/postgres
JWT_SECRET=7824dc4b9456dd55b73eb7236560b0121cfcb5c96d3dc6dc27c9a2841356ac6762bc9b933477313ff1e56cd022d8284e550ceb8e2778c0403e644ddec35bf653
SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw
```

### Frontend (Vite requer prefixo VITE\_)

```bash
VITE_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
```

### Compatibilidade (Next.js - se necessário)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://dycsfnbqgojhttnjbndp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ
```

## ⚠️ Segurança

**NUNCA** commite arquivos com credenciais reais:

- ✅ `.env` está no `.gitignore`
- ✅ `.env.vercel` está no `.gitignore`
- ❌ Nunca faça `git add .env*`

## 🐛 Troubleshooting

### Erro: "relation does not exist"

- Execute `npx prisma db push` localmente para sincronizar o schema
- Ou crie as tabelas manualmente no Supabase SQL Editor

### Erro: "password authentication failed"

- Verifique se a senha PostgreSQL está correta
- Não use o JWT token como senha!

### Erro: "timeout"

- Verifique se o IP do Vercel está permitido no Supabase (geralmente auto-permitido)
- Confirme que o database está ativo (não pausado)

## 📚 Referências

- [Supabase Database Settings](https://supabase.com/dashboard/project/_/settings/database)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Prisma Connection URLs](https://www.prisma.io/docs/reference/database-reference/connection-urls)

---

**Última atualização**: 30/09/2025
**Autor**: Claude Code
