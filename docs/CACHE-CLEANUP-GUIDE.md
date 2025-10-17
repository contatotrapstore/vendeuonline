# Guia de Limpeza de Cache - Vendeu Online

## 🎯 Problema Identificado

Após remover dados de teste do banco (produtos e lojas), a homepage ainda mostrava os produtos mockados devido a **múltiplas camadas de cache**:

1. ✅ **Cache do Navegador** (localStorage) - LIMPO
2. ✅ **Service Worker Cache** (PWA) - LIMPO
3. ❌ **Cache do Servidor API** (Render.com) - AINDA ATIVO

## 📊 Status Atual

### Banco de Dados (Supabase): ✅ LIMPO
```sql
SELECT COUNT(*) FROM "Product";  -- Resultado: 0
SELECT COUNT(*) FROM stores;     -- Resultado: 0
```

### API Backend (Render): ❌ CACHE ATIVO
```
GET https://vendeuonline-uqkk.onrender.com/api/products
Retorna: 2 produtos (dados antigos em cache)
```

## 🔧 Como Limpar Cada Camada de Cache

### 1. Cache do Navegador (localStorage)

**Limpeza via Console (DevTools):**
```javascript
// Limpar cache do Zustand persist
localStorage.removeItem('product-storage');
localStorage.removeItem('app-cache');

// Recarregar página
location.reload();
```

**Limpeza Manual:**
- F12 → Application → Local Storage → Clear All

### 2. Service Worker Cache (PWA)

**Limpeza via Console (DevTools):**
```javascript
// Limpar todos os caches
const cacheNames = await caches.keys();
await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));

// Desregistrar Service Workers
const registrations = await navigator.serviceWorker.getRegistrations();
await Promise.all(registrations.map(reg => reg.unregister()));

// Recarregar página
location.reload();
```

**Limpeza Manual:**
- F12 → Application → Service Workers → Unregister
- F12 → Application → Cache Storage → Delete All

### 3. Cache do Servidor (Render.com) ⚠️

O servidor API tem cache em memória que persiste mesmo após DELETE no banco.

**Opções para Limpar:**

#### Opção A: Restart Manual do Serviço (RECOMENDADO)
1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Selecione o serviço `vendeuonline-uqkk`
3. Clique em **"Manual Deploy"** → **"Clear build cache & deploy"**
4. Aguarde rebuild (~2-3 minutos)

#### Opção B: Aguardar Expiração Natural
- Cache expira automaticamente
- Tempo: ~5-10 minutos (configurável no código)

#### Opção C: Implementar Endpoint de Clear Cache
```javascript
// server/routes/admin.js
router.post('/cache/clear', authenticateAdmin, (req, res) => {
  // Limpar cache do servidor
  appCache.clear(); // Se usando cache em memória
  res.json({ success: true, message: 'Cache limpo' });
});
```

## 🚀 Passo a Passo Completo (Após Limpeza do Banco)

### 1. Limpar Banco de Dados (Supabase)
```sql
-- Remover produtos de teste
DELETE FROM "Product" WHERE id IN ('id1', 'id2', 'id3');

-- Remover lojas de teste
DELETE FROM stores WHERE id = 'store-id';
```

### 2. Limpar Cache do Cliente (Browser)
```javascript
// Console do DevTools
localStorage.removeItem('product-storage');
localStorage.removeItem('app-cache');

const cacheNames = await caches.keys();
await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));

const registrations = await navigator.serviceWorker.getRegistrations();
await Promise.all(registrations.map(reg => reg.unregister()));

location.reload();
```

### 3. Restart do Servidor API (Render)
- Dashboard Render → Manual Deploy → Clear build cache & deploy

### 4. Validar Limpeza
```javascript
// Console do DevTools
const response = await fetch('https://vendeuonline-uqkk.onrender.com/api/products');
const data = await response.json();
console.log('Produtos na API:', data.products.length); // Deve ser 0
```

## 📝 Configuração de Cache no Código

### Frontend (productStore.ts)

**Linha 144-161:** Cache com TTL de 3 minutos
```typescript
const cachedData = appCache.getProducts(params);
if (cachedData) {
  // Usa cache se disponível
  return;
}

// Armazena no cache com TTL
appCache.setProducts(params, response, 3 * 60 * 1000); // 3 minutos
```

**Linha 403-412:** Zustand persist (localStorage)
```typescript
persist(
  (set, get) => ({ /* store */ }),
  {
    name: "product-storage",
    partialize: (state) => ({
      products: state.products,
      filteredProducts: state.filteredProducts,
      pagination: state.pagination,
      filters: state.filters,
    }),
  }
)
```

### Backend (server.js)

**Cache Headers:**
```javascript
res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
res.setHeader('Pragma', 'no-cache');
res.setHeader('Expires', '0');
```

## ⚠️ Problema Conhecido: Cache Render Persistente

**Situação:**
- Banco: 0 produtos ✅
- API: Retorna 2 produtos ❌
- Causa: Render está servindo resposta cacheada

**Solução Definitiva:**
Restart manual do serviço Render para forçar rebuild e limpar cache em memória.

## 🎯 Recomendações

### Para Desenvolvimento:
1. **Desabilitar cache em dev:**
   ```javascript
   if (process.env.NODE_ENV === 'development') {
     // Não usar cache
   }
   ```

2. **TTL menor para teste:**
   ```typescript
   appCache.setProducts(params, response, 30 * 1000); // 30 segundos
   ```

### Para Produção:
1. **Implementar endpoint de clear cache** para admins
2. **Cache bust automático** após mutations (POST/PUT/DELETE)
3. **Cache invalidation** baseado em timestamps

## ✅ Checklist de Validação

Após limpeza completa, verificar:

- [ ] Banco Supabase: 0 produtos, 0 lojas
- [ ] localStorage limpo (product-storage removido)
- [ ] Service Worker desregistrado
- [ ] API retorna lista vazia (`products: []`)
- [ ] Homepage não mostra produtos mockados
- [ ] Admin Lojas mostra "0 lojas"

## 📊 Status Final (17/10/2025)

- ✅ Banco de dados limpo (0 produtos, 0 lojas)
- ✅ localStorage limpo
- ✅ Service Worker cache limpo
- ⚠️ API Render com cache persistente (aguardando restart ou expiração)

**Próximo Deploy:** Cache será automaticamente limpo.

---

**Criado:** 17 Outubro 2025
**Autor:** Sistema Vendeu Online
**Status:** Documentado
