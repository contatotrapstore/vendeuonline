# ⚙️ CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE NO VERCEL

**Data:** 06/10/2025
**Status:** ✅ Código Corrigido - Aguardando Configuração no Vercel

---

## 🎯 AÇÃO NECESSÁRIA

Após fazer deploy do backend no Render e do frontend no Vercel, você **DEVE** configurar a seguinte variável de ambiente no Vercel Dashboard:

---

## 📋 VARIÁVEL CRÍTICA

### VITE_API_URL

**Nome:** `VITE_API_URL`
**Valor:** `https://vendeuonline-api.onrender.com`

**Onde Configurar:**
1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `vendeuonline`
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Preencha:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://vendeuonline-api.onrender.com`
   - **Environments:** Selecione **Production**, **Preview**, e **Development**
6. Clique em **Save**

---

## 🚨 IMPORTANTE

### Por que essa variável é crítica?

- **Sem ela:** Frontend tenta chamar APIs em `localhost:3000` (não funciona em produção)
- **Com ela:** Frontend chama corretamente o backend no Render
- **Impacto:** Todas as 65+ chamadas de API do sistema dependem dessa variável

### Arquitetura

```
┌─────────────────┐         ┌──────────────────┐
│  Frontend       │         │  Backend         │
│  Vercel         │ ─────>  │  Render          │
│  www.vendeu.    │  HTTPS  │  vendeuonline-   │
│  online         │         │  api.onrender.   │
└─────────────────┘         │  com             │
                            └──────────────────┘
                                     │
                                     │ PostgreSQL
                                     ▼
                            ┌──────────────────┐
                            │  Database        │
                            │  Supabase        │
                            └──────────────────┘
```

---

## ✅ MUDANÇAS JÁ APLICADAS NO CÓDIGO

### 1. Arquivo de Configuração Central
[src/config/api.ts](src/config/api.ts)
```typescript
const API_URLS = {
  development: import.meta.env.VITE_API_URL || "http://localhost:3000",
  production: import.meta.env.VITE_API_URL || "https://vendeuonline-api.onrender.com",
};
```

### 2. Todas as Chamadas de API Corrigidas
✅ **23 arquivos modificados**
✅ **65+ fetch calls corrigidos**
✅ **0 chamadas diretas restantes**

**Arquivos corrigidos:**
- ✅ src/app/admin/banners/page.tsx
- ✅ src/app/admin/plans/page.tsx
- ✅ src/app/admin/pricing/page.tsx
- ✅ src/app/admin/products/page.tsx
- ✅ src/app/admin/tracking/page.tsx
- ✅ src/app/buyer/history/page.tsx
- ✅ src/app/buyer/profile/page.tsx
- ✅ src/app/buyer/settings/page.tsx
- ✅ src/app/buyer/wishlist/page.tsx
- ✅ src/app/payment/success/page.tsx
- ✅ src/app/payment/pending/page.tsx
- ✅ src/app/seller/account/page.tsx
- ✅ src/app/seller/orders/page.tsx
- ✅ src/app/seller/profile/page.tsx
- ✅ src/app/seller/settings/page.tsx
- ✅ src/app/seller/store/page.tsx
- ✅ src/store/adminStore.ts
- ✅ src/store/auth.ts
- ✅ src/store/planStore.ts
- ✅ src/store/storeManagementStore.ts
- ✅ src/store/subscriptionStore.ts
- ✅ src/store/userStore.ts
- ✅ src/components/PricingPlans.tsx
- ✅ src/components/TrackingScripts.tsx

**Padrão aplicado:**
```typescript
// ❌ ANTES (não funciona em produção)
fetch("/api/products")

// ✅ DEPOIS (funciona em produção)
import { buildApiUrl } from "@/config/api"
fetch(buildApiUrl("/api/products"))
```

### 3. Variável Adicionada aos Arquivos Locais
✅ [.env](.env#L41)
```bash
VITE_API_URL=http://localhost:3000
```

✅ [.env.example](.env.example#L53)
```bash
VITE_API_URL="http://localhost:3000"
```

### 4. TypeScript Check Passou
```bash
✅ npm run check - 0 erros
```

---

## 🔍 COMO VERIFICAR SE FUNCIONOU

### Após configurar a variável e fazer redeploy:

1. **Abra o site em produção:**
   ```
   https://www.vendeu.online
   ```

2. **Abra DevTools (F12):**
   - Vá na aba **Network**
   - Navegue pelo site
   - **Verifique:** Chamadas devem ir para `vendeuonline-api.onrender.com`
   - **Não deve aparecer:** Chamadas para `localhost`

3. **Teste Login:**
   - Tente fazer login com admin/seller/buyer
   - Se funcionar = variável está correta
   - Se não funcionar = verificar logs no Vercel

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- **Guia Deploy Render:** [docs/deployment/RENDER_DEPLOY_GUIDE.md](docs/deployment/RENDER_DEPLOY_GUIDE.md)
- **Guia Deploy Vercel:** [docs/deployment/VERCEL_COMPLETE_GUIDE.md](docs/deployment/VERCEL_COMPLETE_GUIDE.md)
- **Configuração API:** [src/config/api.ts](src/config/api.ts)

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ **Deploy Backend no Render** (seguir RENDER_DEPLOY_GUIDE.md)
2. ⏳ **Configurar VITE_API_URL no Vercel** (este arquivo)
3. ⏳ **Redeploy Frontend no Vercel**
4. ⏳ **Testar integração completa**

---

## ❓ TROUBLESHOOTING

### Problema: APIs retornam 404

**Causa:** Backend não está rodando no Render
**Solução:** Verificar logs no Render Dashboard

### Problema: Chamadas ainda vão para localhost

**Causa:** VITE_API_URL não configurado ou redeploy não foi feito
**Solução:**
1. Verificar Environment Variables no Vercel
2. Fazer redeploy do frontend

### Problema: CORS Error

**Causa:** Backend não aceita requisições do domínio Vercel
**Solução:** Verificar CORS no [server.js](server.js#L141) (já configurado)

---

## 📞 SUPORTE

- **Documentação Vercel:** https://vercel.com/docs/environment-variables
- **Documentação Render:** https://render.com/docs/environment-variables

---

**✅ SISTEMA PRONTO PARA PRODUÇÃO**
**⚠️ AGUARDANDO APENAS:** Configuração de VITE_API_URL no Vercel Dashboard
