# 🚀 INSTRUÇÕES COMPLETAS DE DEPLOY NO VERCEL

Este guia fornece um passo a passo completo para fazer deploy da aplicação **Vendeu Online** no Vercel.

---

## 📋 PRÉ-REQUISITOS

✅ Conta no [Vercel](https://vercel.com)
✅ Projeto conectado ao GitHub
✅ Banco PostgreSQL (Supabase) configurado
✅ Variáveis de ambiente preparadas (veja `VERCEL_ENV_VARS.md`)

---

## 🔄 PROCESSO DE DEPLOY

### 1. **Configurar Variáveis de Ambiente**

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione o projeto **vendeu-online**
3. Vá em **Settings** → **Environment Variables**
4. Configure todas as 20 variáveis do arquivo `VERCEL_ENV_VARS.md`

#### ⚠️ IMPORTANTE:

- Para variáveis `NEXT_PUBLIC_*`: **NÃO** marque como "Sensitive"
- Para variáveis sensíveis: **MARQUE** como "Sensitive"
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ASAAS_API_KEY`
  - `SMTP_PASS`

### 2. **Verificar Configurações do Projeto**

#### Domain Configuration

```
Primary Domain: www.vendeu.online
Alias: vendeu.online
```

#### Build Settings

```
Framework Preset: Vite
Build Command: npm run vercel-build
Output Directory: dist
Install Command: npm install && npx prisma generate
```

### 3. **Deploy Automático**

O deploy acontece automaticamente quando você faz push para a branch `main`:

```bash
git add -A
git commit -m "feat: Deploy para produção no Vercel"
git push origin main
```

### 4. **Deploy Manual (se necessário)**

```bash
npx vercel --prod
```

---

## 🔍 VERIFICAÇÕES APÓS DEPLOY

### 1. **Health Check da API**

```bash
curl https://www.vendeu.online/api/health
```

**Resposta esperada:**

```json
{
  "status": "OK",
  "message": "API funcionando!",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ",
  "prismaStatus": "CONECTADO"
}
```

### 2. **Teste de Autenticação**

```bash
curl -X POST https://www.vendeu.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vendeuonline.com",
    "password": "Test123!@#"
  }'
```

### 3. **Teste de CORS**

Verifique se o frontend consegue acessar a API sem erros de CORS.

### 4. **Verificar Console do Vercel**

- Acesse **Functions** → **Logs**
- Verifique se não há erros críticos
- Confirme conexão com banco de dados

---

## 🐛 TROUBLESHOOTING

### ❌ Erro: "prismaStatus": "NÃO CONECTADO"

**Causa:** Variável `DATABASE_URL` incorreta ou banco inacessível

**Solução:**

1. Verifique se `DATABASE_URL` está configurada corretamente
2. Teste conexão local:
   ```bash
   npx prisma db push --preview-feature
   ```
3. Verifique se Supabase está online

### ❌ Erro: CORS blocked

**Causa:** Headers CORS não configurados

**Solução:**

1. Verifique se `vercel.json` tem headers CORS configurados
2. Confirme que API está retornando headers corretos
3. Force novo deploy:
   ```bash
   npx vercel --prod --force
   ```

### ❌ Erro: "Token inválido" ou JWT errors

**Causa:** `JWT_SECRET` incorreto ou não configurado

**Solução:**

1. Gere novo JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Configure no Vercel Environment Variables
3. Redeploy a aplicação

### ❌ Erro: Timeout na API

**Causa:** Funções serverless com timeout muito baixo

**Solução:**

- Verifique se `vercel.json` tem `"maxDuration": 30`
- Para operações mais pesadas, considere aumentar para 60s

### ❌ Erro: Build failed

**Causa:** Dependências ou TypeScript errors

**Solução:**

1. Teste build local:
   ```bash
   npm run check
   npm run build
   ```
2. Corrija erros TypeScript
3. Verifique dependencies no `package.json`

---

## ✅ CHECKLIST FINAL

### Antes do Deploy:

- [ ] Todas as variáveis de ambiente configuradas
- [ ] `npm run check` passa sem erros
- [ ] `npm run build` executa com sucesso
- [ ] Arquivo `.env` NÃO está no repositório
- [ ] `vercel.json` configurado corretamente

### Após Deploy:

- [ ] Health check da API funcionando
- [ ] Login de teste funcionando
- [ ] Frontend carrega sem erros
- [ ] CORS configurado corretamente
- [ ] Banco de dados conectado
- [ ] SSL/HTTPS funcionando
- [ ] Domínio personalizado funcionando

---

## 🎯 COMANDOS ÚTEIS

### Para desenvolvimento local:

```bash
npm run dev          # Frontend + API local
npm run check        # TypeScript checking
npm run build        # Build de produção
```

### Para deploy:

```bash
npx vercel --prod    # Deploy manual
npx vercel logs      # Ver logs do deploy
npx vercel domains   # Gerenciar domínios
```

### Para monitoramento:

```bash
curl https://www.vendeu.online/api/health   # Health check
curl https://www.vendeu.online/api/plans    # Teste API
```

---

## 📞 SUPORTE

Em caso de problemas:

1. **Verifique logs do Vercel:** Dashboard → Functions → Logs
2. **Teste localmente:** `npm run dev` deve funcionar perfeitamente
3. **Verifique status Supabase:** [Supabase Status](https://status.supabase.com/)
4. **Regenere variáveis:** Se necessário, regenere JWT_SECRET e chaves de API

---

## 🎉 DEPLOY CONCLUÍDO!

Após seguir todos os passos, sua aplicação estará rodando em:

**🌐 Produção:** https://www.vendeu.online
**📊 Admin:** https://www.vendeu.online/admin
**🛒 Seller:** https://www.vendeu.online/seller

**Credenciais de teste:**

- Admin: `admin@vendeuonline.com` / `Test123!@#`
- Seller: `seller@vendeuonline.com` / `Test123!@#`
- Buyer: `buyer@vendeuonline.com` / `Test123!@#`

---

**🚀 Parabéns! Sua aplicação está agora 100% funcional em produção!**
