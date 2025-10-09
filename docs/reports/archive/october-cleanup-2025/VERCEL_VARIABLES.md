# 🔐 Variáveis de Ambiente para Vercel

⚠️ **IMPORTANTE**: Nunca commitar credenciais reais. Use placeholders na documentação.

Para o deploy em produção no Vercel, você precisa configurar as seguintes variáveis secretas no painel do Vercel:

## 📋 Variáveis Obrigatórias

### 🗄️ Banco de Dados

```bash
DATABASE_URL=postgresql://postgres:senha@db.projeto.supabase.co:5432/postgres
```

### 🛡️ Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL=https://projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 🔑 JWT

```bash
JWT_SECRET=sua-chave-jwt-muito-forte-aqui-64-caracteres-ou-mais
```

## 💳 Pagamentos (ASAAS) - Obrigatório para Produção

### 🏦 ASAAS Production

```bash
ASAAS_API_KEY=$aact_prod_YOUR_ASAAS_KEY_HERE
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=asaas-webhook-secret-2024
ASAAS_WEBHOOK_URL=https://seu-dominio.vercel.app/api/payments/webhook
```

### 🧪 ASAAS Sandbox (Desenvolvimento)

```bash
ASAAS_API_KEY=$aact_YOUR_SANDBOX_KEY_HERE
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
```

## 📧 Email (Opcional)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app-gmail
```

## 🌐 Aplicação

```bash
APP_URL=https://seu-dominio.vercel.app
APP_ENV=production
```

## 📝 Como Configurar no Vercel

1. **Acesse seu projeto no Vercel Dashboard**
2. **Vá em Settings > Environment Variables**
3. **Adicione cada variável acima com os valores corretos**
4. **Use o formato `@nome_da_variavel` para referenciar no vercel.json**

### Exemplo de Configuração:

- **Key**: `database_url`
- **Value**: `postgresql://postgres:...`
- **Environment**: Production, Preview, Development

## ⚠️ Importantes

### 🔐 Segurança

- **NUNCA** exponha `SUPABASE_SERVICE_ROLE_KEY` em variáveis públicas
- **JWT_SECRET** deve ter pelo menos 64 caracteres
- **ASAAS_API_KEY** para produção começa com `$aact_prod_`

### 🎯 Verificação

- Todas as variáveis do `vercel.json` devem ter correspondentes no dashboard
- Use `@nome` no vercel.json para referenciar as variáveis secretas
- Teste primeiro no Preview antes de fazer deploy para Production

## 🚀 Deploy Final

Após configurar todas as variáveis:

1. **Fazer commit** das mudanças
2. **Push para o GitHub**
3. **Verificar se o deploy no Vercel foi bem-sucedido**
4. **Testar as APIs em produção**

## 🔍 Debugging

Se houver problemas:

1. Verificar logs do Vercel
2. Verificar se todas as variáveis estão configuradas
3. Testar conexão com Supabase
4. Verificar se o ASAAS está respondendo

## 📊 Status Atual

✅ **Migração Completa**: APIs de sellers migradas de Prisma para Supabase
✅ **Banco**: Tabela `payments` criada, `seller_settings` populada
✅ **Testes**: GET seller/settings ✅, GET seller/categories ✅
⚠️ **PUT seller/settings**: Pequeno problema de validação Zod (não crítico)
