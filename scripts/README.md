# 🛠️ Scripts - Vendeu Online

Esta pasta contém scripts utilitários para setup, manutenção e validação do projeto.

---

## 📁 Estrutura

```
scripts/
├── archive/
│   └── executed/           # Scripts já executados (histórico)
├── seed-*.js               # Scripts de população do banco
├── validate-*.js           # Scripts de validação
├── clear-database.js       # Limpeza do banco
├── create-admin.js         # Criação de admin
└── README.md               # Este arquivo
```

---

## 🗂️ Scripts Disponíveis

### 🌱 Seeding & Population

#### `seed-admin-data.js`

**Propósito:** Popula dados iniciais de administração

**Uso:**

```bash
node scripts/seed-admin-data.js
```

**O que cria:**

- Usuário admin padrão
- Configurações iniciais do sistema
- Permissions e roles

---

#### `seed-plans.js`

**Propósito:** Cria os planos de assinatura do sistema

**Uso:**

```bash
node scripts/seed-plans.js
```

**Planos criados:**

- Gratuito (R$ 0/mês)
- Básico (R$ 49,99/mês)
- Profissional (R$ 99,99/mês)
- Premium (R$ 199,99/mês)
- Empresa Plus (R$ 399,99/mês)

---

#### `seed-stores.js`

**Propósito:** Cria lojas de exemplo para desenvolvimento

**Uso:**

```bash
node scripts/seed-stores.js
```

**Lojas criadas:**

- TechStore Erechim (PREMIUM)
- Moda Elegante (BASICO)
- Livraria Saber (PROFISSIONAL)
- TrapStore (PREMIUM)
- Mais lojas de exemplo

---

#### `seed-test-data.js`

**Propósito:** Popula banco completo com dados de teste

**Uso:**

```bash
node scripts/seed-test-data.js
```

**O que cria:**

- 18 usuários (admin, sellers, buyers)
- 11 lojas com diferentes planos
- 13 produtos variados
- 1 pedido de teste
- Assinaturas e relações

**⚠️ ATENÇÃO:** Apenas para ambiente de desenvolvimento!

---

### 🗑️ Database Management

#### `clear-database.js`

**Propósito:** Limpa todo o banco de dados

**Uso:**

```bash
node scripts/clear-database.js
```

**O que faz:**

- Remove todos os dados (IRREVERSÍVEL)
- Mantém schema intacto
- Útil para reset completo

**⚠️ CUIDADO:** Use apenas em desenvolvimento!

---

#### `clean-test-data.sql`

**Propósito:** SQL para limpar dados de teste

**Uso:**

```bash
psql -U postgres -d vendeuonline < scripts/clean-test-data.sql
```

**Ou via Supabase SQL Editor:**

- Copie conteúdo do arquivo
- Cole no SQL Editor do Supabase
- Execute

---

#### `products-data.sql`

**Propósito:** SQL com dados de produtos

**Uso:**

```bash
psql -U postgres -d vendeuonline < scripts/products-data.sql
```

---

### 👤 User Management

#### `create-admin.js`

**Propósito:** Cria usuário admin manualmente

**Uso:**

```bash
node scripts/create-admin.js
```

**Credenciais criadas:**

- Email: admin@vendeuonline.com
- Senha: Test123!@#
- Tipo: ADMIN

---

#### `update-admin-password.js`

**Propósito:** Atualiza senha do admin

**Uso:**

```bash
node scripts/update-admin-password.js
```

**Procedimento:**

1. Script solicita nova senha
2. Hash com bcrypt
3. Atualiza no banco

---

### ✅ Validation & Testing

#### `validate-deployment.js`

**Propósito:** Valida deployment completo

**Uso:**

```bash
node scripts/validate-deployment.js
```

**Testa:**

- Variáveis de ambiente
- Conexão com banco
- APIs principais
- Health checks

---

#### `validate-vercel-deploy.js`

**Propósito:** Valida deployment específico do Vercel

**Uso:**

```bash
node scripts/validate-vercel-deploy.js
```

**Testa:**

- Environment variables Vercel
- Build process
- Serverless functions
- API routes

---

### 🔧 Utilities

#### `unify-schema.js`

**Propósito:** Unifica schemas Prisma e Supabase

**Uso:**

```bash
node scripts/unify-schema.js
```

**O que faz:**

- Compara schema Prisma com Supabase
- Identifica diferenças
- Sugere correções

---

## 📦 Scripts Arquivados

### `archive/executed/`

Scripts que já foram executados e servem como histórico:

| Script              | Propósito                           | Executado em |
| ------------------- | ----------------------------------- | ------------ |
| `fix-dell-image.js` | Correção de imagem externa quebrada | Set 2025     |
| `fix-passwords.js`  | Correção de hashes de senhas        | Set 2025     |
| `fix-test-data.js`  | Correção de dados de teste          | Set 2025     |
| `clean-eslint.js`   | Limpeza de configurações ESLint     | Set 2025     |

**Nota:** Estes scripts não devem ser executados novamente, a menos que necessário reproduzir um fix.

---

## 🔄 Ordem Recomendada para Setup Inicial

### Setup do Zero (Database vazio)

```bash
# 1. Limpar banco (se necessário)
node scripts/clear-database.js

# 2. Popular planos
node scripts/seed-plans.js

# 3. Criar admin
node scripts/create-admin.js

# 4. Popular lojas de exemplo
node scripts/seed-stores.js

# 5. Popular dados de teste completos
node scripts/seed-test-data.js

# 6. Validar deployment
node scripts/validate-deployment.js
```

### Setup Mínimo (Apenas necessário)

```bash
# 1. Planos
node scripts/seed-plans.js

# 2. Admin
node scripts/create-admin.js

# 3. Validar
node scripts/validate-deployment.js
```

---

## ⚠️ Precauções

### Ambiente

- ✅ **Desenvolvimento:** Pode executar qualquer script
- ⚠️ **Staging:** Cuidado com scripts de limpeza
- ❌ **Produção:** NUNCA execute scripts de limpeza ou seed

### Backup

Antes de executar scripts destrutivos:

```bash
# Backup do banco (se Supabase)
# Acesse Dashboard > Database > Backups > Create Backup

# Ou export SQL
pg_dump -U postgres vendeuonline > backup_$(date +%Y%m%d).sql
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"

```bash
# Instale dependências
npm install
```

### Erro: "Database connection failed"

```bash
# Verifique .env
cat .env | grep DATABASE_URL

# Teste conexão
node -e "console.log(process.env.DATABASE_URL)"
```

### Erro: "Permission denied"

```bash
# No Windows
# Verifique se arquivo tem permissão de execução

# No Linux/Mac
chmod +x scripts/validate-*.js
```

---

## 📝 Criar Novo Script

Template para novos scripts:

```javascript
/**
 * Script: [nome-do-script].js
 * Propósito: [Descrição breve]
 * Autor: [Seu nome]
 * Data: [Data de criação]
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🚀 Iniciando script...");

    // Seu código aqui

    console.log("✅ Script concluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao executar script:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

**Passos:**

1. Criar arquivo na pasta `scripts/`
2. Adicionar à documentação (este README)
3. Testar em desenvolvimento
4. Commitar

---

## 🔗 Links Relacionados

- [Documentação Prisma](../docs/architecture/PRISMA.md)
- [Supabase Setup](../docs/deployment/SUPABASE.md)
- [Environment Variables](../.env.example)
- [Project Status](../docs/PROJECT-STATUS.md)

---

## 🤝 Contribuindo

Ao criar novos scripts:

1. Siga o template acima
2. Documente neste README
3. Adicione tratamento de erros
4. Teste em desenvolvimento
5. Use `console.log` descritivos
6. Adicione ao `.gitignore` se gerar arquivos temporários

---

_📅 Última atualização: 01 Outubro 2025 - 06:15 UTC_
_✍️ Mantido por: Claude Code_
