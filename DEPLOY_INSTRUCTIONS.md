# 🚀 Instruções Rápidas de Deploy

## Arquitetura

Este projeto usa uma arquitetura **separada** para melhor performance:

- **Frontend**: Vercel → `https://www.vendeu.online`
- **Backend**: Render → `https://vendeuonline-api.onrender.com`
- **Database**: Supabase → PostgreSQL gerenciado

## Deploy Rápido (10 minutos)

### 1️⃣ Backend no Render

1. Acesse [render.com](https://render.com) e crie conta
2. Clique em **New +** → **Web Service**
3. Conecte este repositório GitHub
4. Use estas configurações:
   - **Build Command**: `npm ci && npx prisma generate`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. Adicione as variáveis de ambiente (copie de `render.yaml`)
6. Clique em **Create Web Service**
7. Aguarde deploy (~3-5 min)

### 2️⃣ Frontend no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. **Settings** → **Environment Variables**
3. Adicione:
   ```
   VITE_API_URL=https://vendeuonline-api.onrender.com
   ```
4. Faça commit vazio para triggar redeploy:
   ```bash
   git commit --allow-empty -m "chore: update API URL"
   git push
   ```

### 3️⃣ Testar

```bash
# Test API
curl https://vendeuonline-api.onrender.com/api/health

# Test Frontend
curl https://www.vendeu.online
```

## Documentação Completa

Para guia detalhado com troubleshooting, veja:
📖 **[docs/deployment/RENDER_DEPLOY_GUIDE.md](docs/deployment/RENDER_DEPLOY_GUIDE.md)**

## Credenciais de Teste

Após deploy, teste login com:

```
Admin:
Email: admin@vendeuonline.com
Senha: Test123!@#

Seller:
Email: seller@vendeuonline.com
Senha: Test123!@#

Buyer:
Email: buyer@vendeuonline.com
Senha: Test123!@#
```

## Arquivos Importantes

- `render.yaml` - Configuração do Render
- `.env.production` - Variáveis de produção
- `src/config/api.ts` - Configuração de URL da API
- `server.js` - Backend Express (linhas 132-150: CORS)

## Custos

- **Desenvolvimento**: $0/mês (tudo free tier)
- **Produção**: $7/mês (Render Starter para eliminar cold starts)

## Suporte

- 📖 [Documentação Completa](docs/deployment/RENDER_DEPLOY_GUIDE.md)
- 🐛 [GitHub Issues](https://github.com/seu-usuario/vendeuonline/issues)
- 📧 Email: suporte@vendeuonline.com

---

**Última atualização**: 02/10/2025
