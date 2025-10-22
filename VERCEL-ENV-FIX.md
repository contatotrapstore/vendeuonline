# 🔧 Correção Urgente: Configurar Variáveis de Ambiente no Vercel

## ❌ Problema Identificado

O upload de imagens está falhando com erro:
```
supabaseUrl is required.
```

**Root Cause:** Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não estão definidas no **Vercel Dashboard**, então o Vite substitui por `undefined` durante o build.

---

## ✅ Solução: Configurar Variáveis no Vercel

### Passo 1: Acessar Vercel Dashboard

1. Vá para: https://vercel.com/dashboard
2. Selecione o projeto **vendeuonline**
3. Clique em **Settings** (no topo)
4. No menu lateral, clique em **Environment Variables**

### Passo 2: Adicionar Variáveis de Ambiente

Adicione as seguintes variáveis (uma por vez):

#### **Variável 1: VITE_SUPABASE_URL**
- **Name:** `VITE_SUPABASE_URL`
- **Value:** `https://dycsfnbqgojhttnjbndp.supabase.co`
- **Environments:** Marque todas (Production, Preview, Development)
- Clique em **Save**

#### **Variável 2: VITE_SUPABASE_ANON_KEY**
- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ`
- **Environments:** Marque todas (Production, Preview, Development)
- Clique em **Save**

#### **Variável 3: VITE_PUBLIC_SUPABASE_URL** (fallback)
- **Name:** `VITE_PUBLIC_SUPABASE_URL`
- **Value:** `https://dycsfnbqgojhttnjbndp.supabase.co`
- **Environments:** Marque todas
- Clique em **Save**

#### **Variável 4: VITE_PUBLIC_SUPABASE_ANON_KEY** (fallback)
- **Name:** `VITE_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ`
- **Environments:** Marque todas
- Clique em **Save**

### Passo 3: Forçar Rebuild

Após adicionar as variáveis, o Vercel **NÃO faz rebuild automático**. Você precisa forçar:

**Opção A: Via Dashboard**
1. Vá para **Deployments** (no topo)
2. Clique no deployment mais recente (primeiro da lista)
3. Clique nos **três pontinhos** (⋯) no canto superior direito
4. Selecione **Redeploy**
5. Marque **Use existing Build Cache** (desmarcar para rebuild completo)
6. Clique em **Redeploy**

**Opção B: Via Git (mais rápido)**
```bash
# Fazer commit vazio para trigger rebuild
git commit --allow-empty -m "chore: trigger Vercel rebuild with env vars"
git push
```

### Passo 4: Aguardar Deploy

- Aguarde 2-3 minutos para o build completar
- Verifique em **Deployments** que o status está **Ready**
- URL: https://www.vendeu.online

### Passo 5: Validar Correção

1. Abra https://www.vendeu.online/seller/products/new
2. Abra **DevTools** (F12)
3. Vá na aba **Console**
4. ✅ **NÃO deve haver erro "supabaseUrl is required"**
5. Tente fazer upload de uma imagem
6. ✅ **Upload deve completar sem travar**

---

## 📊 Como Verificar se Funcionou

### No Console do Navegador:

**ANTES (ERRADO):**
```
❌ supabaseUrl is required.
```

**DEPOIS (CORRETO):**
```
✅ [UPLOAD] Tentativa 1/2
✅ [UPLOAD] Bucket: products Folder: products
✅ [UPLOAD] Arquivo: teste.jpg Tamanho: 234.56 KB
✅ [UPLOAD] Token presente: true
✅ [UPLOAD] Iniciando requisição POST /api/upload...
✅ [UPLOAD] Resposta recebida: 200 OK
```

---

## 🆘 Troubleshooting

### Erro persiste após configurar variáveis?

1. **Verifique se variáveis estão corretas:**
   - Nome EXATO: `VITE_SUPABASE_URL` (case-sensitive)
   - Valor SEM espaços no início/fim
   - Environments marcadas (Production checked)

2. **Limpe cache do Vercel:**
   - Vá em Deployments
   - Redeploy → **DESMARQUE** "Use existing Build Cache"
   - Isso força rebuild completo

3. **Verifique logs do build:**
   - Clique no deployment
   - Vá na aba **Build Logs**
   - Procure por "VITE_SUPABASE_URL"
   - Deve aparecer que foi encontrado

4. **Última tentativa - Hardcode temporário:**
   Se mesmo assim não funcionar, podemos usar o fallback hardcoded que já está no código:
   ```typescript
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ||
                        'https://dycsfnbqgojhttnjbndp.supabase.co'; // ← Este é usado se VITE_* não existe
   ```
   Mas isso SÓ funciona se o Vercel não substituir por `undefined` no build.

---

## 📝 Notas Importantes

⚠️ **Segurança:** As variáveis `VITE_*` são **públicas** (expostas no frontend). NUNCA use `SUPABASE_SERVICE_ROLE_KEY` com prefixo `VITE_` ou `NEXT_PUBLIC_`.

✅ **Anon Key é segura:** A `SUPABASE_ANON_KEY` é projetada para ser pública e tem RLS (Row Level Security) para proteger dados.

---

## 🚀 Após Configurar

Quando as variáveis estiverem configuradas e o deploy completo:

1. Claude vai executar testes E2E com Chrome DevTools
2. Validar que upload funciona em:
   - ✅ Produtos (imagens de produtos)
   - ✅ Loja (logo e banner)
   - ✅ Usuário (avatar)
3. Verificar que arquivos são salvos no Supabase Storage
4. Gerar relatório final de validação

---

**Tempo estimado:** 5 minutos (configuração) + 3 minutos (deploy) = **8 minutos total**

Por favor, execute os passos acima e me avise quando o deploy estiver pronto para que eu possa validar! 🚀
