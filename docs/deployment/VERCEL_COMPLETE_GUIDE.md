# 🚀 GUIA COMPLETO DE DEPLOY NO VERCEL - VENDEU ONLINE

Este documento unifica todas as instruções e configurações necessárias para fazer deploy da aplicação **Vendeu Online** no Vercel.

---

## 📋 PRÉ-REQUISITOS

✅ Conta no [Vercel](https://vercel.com)
✅ Projeto conectado ao GitHub
✅ Banco PostgreSQL (Supabase) configurado
✅ Variáveis de ambiente preparadas (seção abaixo)

---

## 🔄 PROCESSO DE DEPLOY

### 1. **Configurar Variáveis de Ambiente**

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione o projeto **vendeu-online**
3. Vá em **Settings** → **Environment Variables**
4. Configure todas as variáveis listadas na seção abaixo

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

## 🔑 VARIÁVEIS DE AMBIENTE

### Essenciais (OBRIGATÓRIAS)

#### Database & Backend

| Variável       | Valor                                                                                                                              | Sensível? |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `DATABASE_URL` | `postgresql://postgres.dycsfnbqgojhttnjbndp:...`                                                                                   | ✅        |
| `JWT_SECRET`   | `cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac` | ✅        |

#### Supabase Configuration

| Variável                        | Valor                                      | Sensível? |
| ------------------------------- | ------------------------------------------ | --------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://dycsfnbqgojhttnjbndp.supabase.co` | ❌        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`  | ❌        |
| `SUPABASE_SERVICE_ROLE_KEY`     | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`  | ✅        |

#### App Configuration

| Variável   | Valor                       | Sensível? |
| ---------- | --------------------------- | --------- |
| `APP_NAME` | `Vendeu Online`             | ❌        |
| `APP_URL`  | `https://www.vendeu.online` | ❌        |
| `APP_ENV`  | `production`                | ❌        |

### Pagamentos - ASAAS (OBRIGATÓRIAS para compras)

| Variável              | Valor                                                          | Sensível? |
| --------------------- | -------------------------------------------------------------- | --------- |
| `ASAAS_API_KEY`       | `$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY...` | ✅        |
| `ASAAS_BASE_URL`      | `https://api.asaas.com/v3`                                     | ❌        |
| `ASAAS_WEBHOOK_TOKEN` | `asaas-webhook-secret-2024`                                    | ✅        |
| `ASAAS_WEBHOOK_URL`   | `https://www.vendeu.online/api/payments/webhook`               | ❌        |

### Email (OPCIONAIS - Para notificações)

| Variável    | Valor                      | Sensível? |
| ----------- | -------------------------- | --------- |
| `SMTP_HOST` | `smtp.gmail.com`           | ❌        |
| `SMTP_PORT` | `587`                      | ❌        |
| `SMTP_USER` | `demo@vendeuonline.com`    | ❌        |
| `SMTP_PASS` | `demo-password`            | ✅        |
| `SMTP_FROM` | `noreply@vendeuonline.com` | ❌        |

### Configurações Adicionais (OPCIONAIS)

| Variável               | Valor                             | Descrição                       |
| ---------------------- | --------------------------------- | ------------------------------- |
| `UPLOAD_MAX_SIZE`      | `10485760`                        | Tamanho máximo de upload (10MB) |
| `UPLOAD_ALLOWED_TYPES` | `image/jpeg,image/png,image/webp` | Tipos de arquivo permitidos     |
| `GOOGLE_ANALYTICS_ID`  | `G-DEMO123`                       | ID do Google Analytics          |
| `RATE_LIMIT_MAX`       | `100`                             | Limite de requests por janela   |
| `RATE_LIMIT_WINDOW`    | `900000`                          | Janela de rate limit (15min)    |

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

## ⚠️ CONFIGURAÇÃO IMPORTANTE

### Para Produção:

1. **JWT_SECRET**: Gere uma nova chave forte com:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **ASAAS_API_KEY**: Certifique-se de usar a chave de produção (prefixo `$aact_prod_`)

3. **Webhooks**: Configure o webhook no painel ASAAS apontando para:
   ```
   https://www.vendeu.online/api/payments/webhook
   ```

### Configuração no Vercel:

- Para **todas** as variáveis, selecione **Environment**: `Production`, `Preview`, `Development`
- **NÃO** marque como "sensitive" as variáveis PUBLIC (`NEXT_PUBLIC_*`)
- **MARQUE** como "sensitive": `JWT_SECRET`, `ASAAS_API_KEY`, `SMTP_PASS`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

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
