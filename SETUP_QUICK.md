# ⚡ Setup Rápido - 5 minutos

## 🎯 Objetivo
Deploy da aplicação **Vendeu Online** no Vercel em 5 minutos.

## ✅ Checklist Express

### 1. **Preparar Banco de Dados** (2 min)
```bash
# 1. Crie projeto Supabase: https://supabase.com/dashboard/new
# 2. Anote as credenciais:
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJ0eXAi...
SUPABASE_SERVICE_KEY=eyJ0eXAi...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# 3. Execute no SQL Editor do Supabase:
npx prisma db push
```

### 2. **Deploy no Vercel** (1 min)
```bash
# Opção A: Clique no botão
```
[![Deploy](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fseu-usuario%2Fvendeu-online)

```bash
# Opção B: Via CLI
npm i -g vercel
vercel --prod
```

### 3. **Configurar Variáveis** (1 min)
No **Vercel Dashboard** → **Settings** → **Environment Variables**:

```env
DATABASE_URL=postgresql://postgres:[SUA-SENHA]@db.[SEU-REF].supabase.co:5432/postgres
JWT_SECRET=cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac
NEXT_PUBLIC_SUPABASE_URL=https://[SEU-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAi... [SUA-CHAVE-ANON]
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAi... [SUA-CHAVE-SERVICE]
NODE_ENV=production
```

### 4. **Testar Aplicação** (1 min)
- ✅ **URL**: https://seu-projeto.vercel.app
- ✅ **API**: https://seu-projeto.vercel.app/api/health
- ✅ **Login Admin**: admin@test.com / 123456

## 🚨 Problemas Comuns

### Build falha?
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
vercel --prod
```

### API não funciona?
1. Verifique se `JWT_SECRET` está definido
2. Confirme se `DATABASE_URL` está correto
3. Teste: `curl https://seu-app.vercel.app/api/health`

### Banco não conecta?
```sql
-- Teste no Supabase SQL Editor:
SELECT current_database();
```

## ⚡ Deploy Automático
Configure **deploy automático** no Vercel:
- **Git Integration**: ✅ Enabled
- **Auto Deploy**: ✅ main branch
- **Preview Deploy**: ✅ All branches

## 🎉 Pronto!
Sua aplicação está no ar em: **https://seu-projeto.vercel.app**

---
📞 **Problemas?** Veja [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) ou abra uma issue.