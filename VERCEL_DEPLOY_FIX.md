# 🚀 CORREÇÃO DEPLOY VERCEL

## ✅ PROBLEMAS CORRIGIDOS

### 1. APIs retornando dados mockados
- ✅ `/api/plans` - Agora busca do Prisma: `prisma.plan.findMany()`
- ✅ `/api/products` - Agora busca com filtros e paginação
- ✅ `/api/stores` - Agora busca dados reais das lojas
- ✅ `/api/admin/stats` - Agora calcula estatísticas reais do banco

### 2. Configuração do Vercel
- ✅ `vercel.json` atualizado com runtime Node.js 18
- ✅ Função serverless configurada corretamente

### 3. Estrutura de API
- ✅ `api/index.js` export corrigido para Vercel
- ✅ Todas as rotas migrando de mocks para dados reais

## 🔑 VARIÁVEIS DE AMBIENTE NO VERCEL

### OBRIGATÓRIAS para funcionamento:
```env
DATABASE_URL=postgresql://postgres.ABC:senha@db.ABC.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://ABC.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=sua_chave_forte_64_chars_aqui
```

### OPCIONAL (pagamentos):
```env
ASAAS_API_KEY=sua_chave_asaas
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=webhook_token
```

## 🛠️ COMO APLICAR NO VERCEL

### 1. Configure Environment Variables
1. Acesse: [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em: **Settings > Environment Variables**
4. Adicione TODAS as variáveis acima

### 2. Re-deploy
```bash
# Fazer um novo commit para forçar redeploy
git add .
git commit -m "fix: corrigir APIs mockadas e configuração Vercel"
git push
```

### 3. Verificar se funcionou
- ✅ `/api/plans` deve retornar planos reais do banco
- ✅ `/api/products` deve retornar produtos reais
- ✅ `/api/admin/stats` deve retornar estatísticas calculadas
- ❌ Se ainda retornar erro HTML, verificar logs do Vercel

## 🔍 DEBUGGING

### Se ainda der erro "Unexpected token '<'":

1. **Verificar logs no Vercel:**
   - Functions > Ver logs da função
   - Procurar erros de conexão com banco

2. **Testar DATABASE_URL:**
   ```bash
   # No terminal local:
   npx prisma db pull
   ```

3. **Verificar se tabelas existem:**
   ```sql
   -- No Supabase SQL Editor:
   SELECT * FROM "Plan" LIMIT 1;
   SELECT * FROM "Product" LIMIT 1;
   ```

## 🎯 RESULTADO ESPERADO

Depois das correções:
- ✅ `/api/plans` retorna planos reais (não mais 2 mocks)
- ✅ `/api/products` retorna produtos do banco  
- ✅ `/api/admin/stats` retorna estatísticas calculadas
- ✅ Fim dos erros "Unexpected token '<'"
- ✅ Dashboard admin funciona corretamente

## ⚠️ IMPORTANTE

Se o banco estiver vazio:
1. Rode as migrations: `npx prisma db push`
2. Crie dados de teste via dashboard ou SQL
3. Certifique-se que há pelo menos 1 plano ativo

---
*Correções aplicadas em: `api/index.js` e `vercel.json`*