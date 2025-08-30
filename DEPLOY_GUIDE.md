# 🚀 Guia de Deploy no Vercel - Vendeu Online

Este guia completo te ensina como fazer o deploy da aplicação **Vendeu Online** no Vercel em poucos passos.

## 📋 Pré-requisitos

- [ ] Conta no [Vercel](https://vercel.com)
- [ ] Conta no [GitHub](https://github.com) (recomendado)
- [ ] Conta no [Supabase](https://supabase.com) (banco de dados)
- [ ] Node.js 18+ instalado localmente

## 🛠️ Preparação do Projeto

### 1. Clone e Configure o Repositório

```bash
# Clone o projeto
git clone https://github.com/seu-usuario/vendeu-online
cd vendeu-online

# Instale as dependências
npm install

# Configure o banco de dados
npx prisma generate
```

### 2. Configure o Banco de Dados (Supabase)

1. **Crie um projeto no Supabase**:
   - Acesse [supabase.com](https://supabase.com)
   - Clique em "New project"
   - Escolha sua organização e configure:
     - **Name**: vendeu-online
     - **Database Password**: Sua senha segura
     - **Region**: South America (São Paulo)

2. **Obtenha as credenciais**:
   - Vá em **Settings** → **API**
   - Copie:
     - `Project URL`
     - `anon/public` key
     - `service_role` key (Settings → API → service_role)

3. **Configure o banco**:
```bash
# Execute as migrações
npx prisma db push

# Opcional: visualize no Prisma Studio
npx prisma studio
```

## 🚀 Deploy no Vercel

### Opção 1: Deploy via Git (Recomendado)

1. **Push para o GitHub**:
```bash
git add .
git commit -m "feat: prepare for Vercel deployment"
git push origin main
```

2. **Conecte ao Vercel**:
   - Acesse [vercel.com](https://vercel.com)
   - Clique em **"New Project"**
   - Selecione seu repositório GitHub
   - Configure o projeto:
     - **Framework Preset**: Vite
     - **Root Directory**: `./`
     - **Build Command**: `npm run vercel-build`
     - **Output Directory**: `dist`

### Opção 2: Deploy via CLI

```bash
# Instale a CLI do Vercel
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel --prod
```

## ⚙️ Configuração de Variáveis de Ambiente

No **Dashboard do Vercel**, vá em **Settings** → **Environment Variables** e adicione:

### Obrigatórias
```
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# JWT
JWT_SECRET=cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac

# Environment
NODE_ENV=production
```

### Opcionais (Pagamentos)
```
# ASAAS (Recomendado - Gateway Brasileiro)
ASAAS_API_KEY=sua-chave-asaas
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=seu-token-webhook

# MercadoPago (Alternativo)
MERCADOPAGO_ACCESS_TOKEN=seu-token-mercadopago
```

### Upload de Imagens
```
# Cloudinary
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

## 🔧 Configuração Pós-Deploy

### 1. Configure Domínio Personalizado (Opcional)

No Vercel Dashboard:
1. Vá em **Settings** → **Domains**
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções

### 2. Configure Webhooks (Para Pagamentos)

Se usando ASAAS:
```
URL: https://seu-dominio.vercel.app/api/payments/webhook
Eventos: PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_DELETED
```

### 3. Teste a Aplicação

1. **Acesse sua URL do Vercel**
2. **Teste o login admin**:
   - Email: `admin@test.com`
   - Senha: `123456`
3. **Verifique funcionalidades**:
   - [ ] Cadastro de usuários
   - [ ] Login/Logout
   - [ ] Criação de produtos
   - [ ] Carrinho de compras
   - [ ] Dashboard admin

## 📊 Monitoramento

### Analytics do Vercel
- **Performance**: Monitor Core Web Vitals
- **Functions**: Veja execução das APIs
- **Logs**: Debug problemas em tempo real

### Logs Úteis
```bash
# Ver logs em tempo real
vercel logs seu-projeto --follow

# Ver logs de função específica
vercel logs seu-projeto --limit=100
```

## 🐛 Solução de Problemas

### Erro: "Module not found"
```bash
# Reinstale dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Prisma Client not generated"
```bash
# Regenere o cliente Prisma
npx prisma generate
vercel --prod
```

### Erro: "JWT Secret missing"
- Verifique se `JWT_SECRET` está configurado nas variáveis de ambiente do Vercel

### Erro 500 nas APIs
1. Verifique logs no Vercel Dashboard
2. Confirme se `DATABASE_URL` está correto
3. Teste conexão com Supabase

### Banco não conecta
```sql
-- No Supabase SQL Editor, teste:
SELECT current_database();
```

## 📱 URLs de Teste

Após o deploy, teste estas URLs:

- **Homepage**: `https://seu-app.vercel.app`
- **API Health**: `https://seu-app.vercel.app/api/health`
- **Admin Panel**: `https://seu-app.vercel.app/admin`
- **Login**: `https://seu-app.vercel.app/login`

## 🔐 Configurações de Segurança

### Headers de Segurança
O arquivo `vercel.json` já inclui:
- CORS configurado
- Rate limiting nas APIs
- Timeouts apropriados

### Variáveis Sensíveis
- ✅ Use sempre **Environment Variables** no Vercel
- ❌ Nunca commite tokens no código
- 🔒 Use `service_role` key apenas no backend

## 🎯 Otimizações de Performance

### 1. Caching
```javascript
// As APIs já incluem headers de cache apropriados
res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
```

### 2. Bundle Analysis
```bash
# Analise o tamanho do bundle
npm run build -- --analyze
```

### 3. Image Optimization
- Use Supabase Storage ou Cloudinary
- Imagens são automaticamente otimizadas

## 📞 Suporte

### Recursos Úteis
- [Documentação Vercel](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Issues do Projeto](https://github.com/seu-usuario/vendeu-online/issues)

### Contato
- **Email**: seu-email@exemplo.com
- **Discord**: Seu servidor
- **GitHub**: [Abra uma issue](https://github.com/seu-usuario/vendeu-online/issues)

---

## ✅ Checklist Final

Antes de considerar o deploy completo:

- [ ] ✅ Aplicação carrega sem erros
- [ ] ✅ APIs respondem corretamente
- [ ] ✅ Login/cadastro funcionando
- [ ] ✅ Banco de dados conectado
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ SSL ativo (https://)
- [ ] ✅ Performance satisfatória
- [ ] ✅ Mobile responsivo
- [ ] ✅ Logs sem erros críticos
- [ ] ✅ Domínio personalizado (se aplicável)

**🎉 Parabéns! Sua aplicação está no ar!**

---

*Última atualização: ${new Date().toLocaleDateString('pt-BR')}*