# 🔐 Status da Autenticação - Vendeu Online

**Última Atualização**: 30 de Setembro de 2025
**Status**: ⚠️ Em Migração (Prisma → Supabase)

---

## 📊 Status Atual

### Sistema Original (Prisma + JWT)

**Arquivo**: `server/lib/prisma.js` + lógica em `api/index.js`

**Status**: ❌ Não funciona no Vercel

**Problema**:

- Prisma Client falha ao inicializar no ambiente serverless
- Erro: "prisma": "FAILED", "safeQuery": "FAILED"
- Causa: Incompatibilidade entre ambiente serverless e conexão Prisma

### Sistema Novo (Supabase Auth + JWT)

**Arquivo**: `api/lib/supabase-auth.js`

**Status**: ✅ Implementado e testado localmente

**Implementação**:

```javascript
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function registerUser({ name, email, password, ... }) {
  // Usa tabela public.users (compatível com Prisma schema)
  // Hash bcrypt da senha
  // Retorna user sem senha
}

export async function loginUser({ email, password }) {
  // Busca user em public.users
  // Verifica senha com bcrypt
  // Retorna user sem senha
}
```

---

## 🔄 Estratégia de Migração

### Fase 1: Fallback ✅ Completo

**Implementação**: Código de fallback em `api/index.js`

```javascript
// Route: POST /api/auth/register
if (!prisma || !safeQuery) {
  const supabaseAuth = await import("./lib/supabase-auth.js");
  const result = await supabaseAuth.registerUser({...});

  const token = generateToken({
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    userType: result.user.type,
  });

  return res.json({
    success: true,
    user: result.user,
    token,
    method: "supabase-direct"
  });
}
```

**Comportamento**:

1. Tenta usar Prisma primeiro
2. Se Prisma falhar, usa Supabase Auth automaticamente
3. JWT token gerado é idêntico em ambos os casos
4. Frontend não nota diferença

### Fase 2: Migração Completa (Opcional)

**Quando**: Depois de validar Supabase Auth em produção

**Mudanças**:

1. Remover código Prisma de autenticação
2. Usar apenas Supabase Auth
3. Simplificar código
4. Melhor performance

---

## 🗄️ Estrutura de Dados

### Tabela: public.users

**Schema Prisma**:

```prisma
model User {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique
  password    String   // bcrypt hash
  phone       String
  type        UserType
  city        String
  state       String
  avatar      String?
  isVerified  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Compatibilidade**:

- ✅ Supabase Auth usa exatamente os mesmos campos
- ✅ IDs gerados com formato compatível: `u_timestamp_random`
- ✅ Passwords com bcrypt (rounds=12)

---

## 🔑 Fluxo de Autenticação

### Registro

```mermaid
Frontend → POST /api/auth/register
          ↓
    api/index.js (verifica Prisma)
          ↓
    Prisma falhou? → Sim
          ↓
    Supabase Auth (fallback)
          ↓
    1. Verifica email duplicado
    2. Hash senha (bcrypt, 12 rounds)
    3. Insere em public.users
    4. Gera JWT token
    5. Retorna {user, token}
```

### Login

```mermaid
Frontend → POST /api/auth/login
          ↓
    api/index.js (verifica Prisma)
          ↓
    Prisma falhou? → Sim
          ↓
    Supabase Auth (fallback)
          ↓
    1. Busca user por email
    2. Compara senha (bcrypt.compare)
    3. Atualiza updatedAt
    4. Gera JWT token
    5. Retorna {user, token}
```

### Token JWT

**Payload**:

```json
{
  "id": "u_1727678400_abc123",
  "email": "user@example.com",
  "name": "Nome do Usuário",
  "userType": "BUYER",
  "iat": 1727678400,
  "exp": 1728283200
}
```

**Secret**: 64 bytes hex (configurado em JWT_SECRET)

**Expiration**: 7 dias

---

## 🧪 Testes

### Teste Local (Development)

```bash
# Registro
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Local",
    "email": "teste@local.com",
    "password": "Test123!@#",
    "phone": "11999999999",
    "type": "BUYER",
    "city": "São Paulo",
    "state": "SP"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@local.com",
    "password": "Test123!@#"
  }'
```

### Teste Produção (Vercel)

```bash
# Registro
curl -X POST https://www.vendeu.online/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Vercel",
    "email": "teste@vendeu.online",
    "password": "Test123!@#",
    "phone": "11999999999",
    "type": "BUYER"
  }'

# Resposta esperada:
{
  "success": true,
  "message": "Usuário cadastrado com sucesso",
  "user": {
    "id": "u_...",
    "name": "Teste Vercel",
    "email": "teste@vendeu.online",
    "type": "BUYER",
    ...
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "method": "supabase-direct"
}
```

---

## ⚠️ Problemas Conhecidos

### 1. Conflito de Schemas

**Descrição**: Existem duas tabelas "users" no Supabase:

- `auth.users` - Tabela nativa do Supabase Auth
- `public.users` - Tabela criada pelo Prisma

**Impacto**: Query em `information_schema.columns` retorna colunas misturadas

**Solução**: Especificar schema explicitamente:

```sql
SELECT * FROM public.users WHERE email = $1
```

### 2. Prisma não funciona no Vercel

**Descrição**: `@prisma/client` falha ao inicializar no serverless

**Tentativas de correção**:

- ✅ Adicionado `safeQuery()` function
- ✅ Verificado `prisma generate` no build
- ❌ Problema persiste

**Solução definitiva**: Usar Supabase SDK

---

## 📚 Referências

### Documentação

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [bcryptjs Documentation](https://www.npmjs.com/package/bcryptjs)
- [JWT.io - JSON Web Tokens](https://jwt.io/)

### Código Relacionado

- `api/lib/supabase-auth.js` - Implementação Supabase Auth
- `api/index.js` - Endpoints de autenticação
- `server/lib/prisma.js` - Implementação Prisma (legacy)

### Issues Relacionados

- #1: Prisma não funciona no Vercel
- #2: Conflito entre auth.users e public.users

---

## 🎯 Próximos Passos

### Imediato (Prioridade Alta)

1. ✅ Validar Supabase Auth em produção
2. ⏳ Monitorar logs do Vercel para erros
3. ⏳ Testar registro e login completos

### Curto Prazo

1. Migrar todas APIs de auth para Supabase
2. Remover dependência do Prisma para auth
3. Adicionar testes automatizados

### Longo Prazo

1. Considerar migração completa para Supabase Auth nativo
2. Implementar OAuth (Google, Facebook)
3. Adicionar 2FA

---

**Mantido por**: Claude Code
**Status**: Aguardando validação em produção
