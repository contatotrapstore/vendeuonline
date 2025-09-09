# 📡 REFERÊNCIA DA API - VENDEU ONLINE

## 🌐 **BASE URL**
- **Desenvolvimento:** `http://localhost:4002`
- **Produção:** `https://seu-projeto.vercel.app`

---

## 🔐 **AUTENTICAÇÃO**

### **Headers Obrigatórios**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

### **Endpoints de Auth**

#### `POST /api/auth/register`
**Registrar novo usuário**

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "MinhaSenh@123",
  "phone": "(11) 99999-9999",
  "userType": "buyer|seller|admin",
  "city": "São Paulo",
  "state": "SP"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "João Silva",
    "email": "joao@email.com",
    "userType": "buyer"
  },
  "token": "jwt_token"
}
```

#### `POST /api/auth/login`
**Login de usuário**

```json
{
  "email": "joao@email.com",
  "password": "MinhaSenh@123"
}
```

#### `GET /api/auth/profile`
**Perfil do usuário autenticado** (requer auth)

---

## 🛍️ **PRODUTOS**

#### `GET /api/products`
**Listar produtos**

**Query params:**
- `page` - Página (default: 1)
- `limit` - Itens por página (default: 10)
- `category` - Filtrar por categoria
- `search` - Buscar por nome
- `minPrice` - Preço mínimo
- `maxPrice` - Preço máximo

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "product_id",
      "name": "iPhone 14",
      "description": "Smartphone Apple",
      "price": 4999.99,
      "stock": 10,
      "images": ["url1", "url2"],
      "category": {
        "id": "cat_id",
        "name": "Eletrônicos"
      },
      "store": {
        "id": "store_id",
        "name": "Loja Tech"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

#### `GET /api/products/{id}`
**Detalhes do produto**

#### `POST /api/products`
**Criar produto** (requer auth - seller)

```json
{
  "name": "iPhone 14",
  "description": "Smartphone Apple último modelo",
  "price": 4999.99,
  "stock": 10,
  "categoryId": "category_id",
  "images": ["url1", "url2"],
  "specifications": [
    { "name": "Cor", "value": "Azul" },
    { "name": "Memória", "value": "128GB" }
  ]
}
```

#### `PUT /api/products/{id}`
**Atualizar produto** (requer auth - seller)

#### `DELETE /api/products/{id}`
**Deletar produto** (requer auth - seller)

---

## 🏪 **LOJAS**

#### `GET /api/stores`
**Listar lojas**

#### `GET /api/stores/{id}`
**Detalhes da loja**

#### `POST /api/stores`
**Criar loja** (requer auth - seller)

```json
{
  "name": "Minha Loja Tech",
  "description": "Loja especializada em eletrônicos",
  "email": "contato@minhaloja.com",
  "phone": "(11) 99999-9999",
  "city": "São Paulo",
  "state": "SP"
}
```

#### `PUT /api/stores/{id}`
**Atualizar loja** (requer auth - seller)

---

## 🛒 **PEDIDOS**

#### `GET /api/orders`
**Listar pedidos do usuário** (requer auth)

#### `GET /api/orders/{id}`
**Detalhes do pedido** (requer auth)

#### `POST /api/orders`
**Criar pedido** (requer auth)

```json
{
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "price": 4999.99
    }
  ],
  "shippingAddressId": "address_id",
  "billingAddressId": "address_id",
  "paymentMethod": "PIX|CREDIT_CARD|BOLETO"
}
```

#### `PUT /api/orders/{id}/status`
**Atualizar status do pedido** (requer auth - seller)

```json
{
  "status": "CONFIRMED|PROCESSING|SHIPPED|DELIVERED|CANCELLED"
}
```

---

## 💳 **PAGAMENTOS**

#### `POST /api/payments/create`
**Criar cobrança** (requer auth)

```json
{
  "orderId": "order_id",
  "paymentMethod": "PIX|CREDIT_CARD|BOLETO",
  "installments": 1
}
```

#### `POST /api/payments/webhook`
**Webhook ASAAS** (público)

#### `GET /api/payments/{id}/status`
**Status do pagamento** (requer auth)

---

## 📋 **PLANOS**

#### `GET /api/plans`
**Listar planos de assinatura**

```json
{
  "success": true,
  "plans": [
    {
      "id": "plan_id",
      "name": "Básico",
      "price": 19.90,
      "billingPeriod": "monthly",
      "maxProducts": 50,
      "maxImages": 5,
      "features": ["Suporte básico", "Dashboard"]
    }
  ]
}
```

#### `POST /api/subscriptions`
**Assinar plano** (requer auth - seller)

```json
{
  "planId": "plan_id",
  "paymentMethod": "CREDIT_CARD"
}
```

---

## 🎯 **CATEGORIAS**

#### `GET /api/categories`
**Listar categorias**

#### `GET /api/categories/{id}/products`
**Produtos da categoria**

---

## ❤️ **WISHLIST**

#### `GET /api/wishlist`
**Listar wishlist** (requer auth - buyer)

#### `POST /api/wishlist`
**Adicionar à wishlist** (requer auth - buyer)

```json
{
  "productId": "product_id"
}
```

#### `DELETE /api/wishlist/{productId}`
**Remover da wishlist** (requer auth - buyer)

---

## ⭐ **AVALIAÇÕES**

#### `GET /api/reviews`
**Listar avaliações**

**Query params:**
- `productId` - Filtrar por produto
- `storeId` - Filtrar por loja

#### `POST /api/reviews`
**Criar avaliação** (requer auth)

```json
{
  "productId": "product_id",
  "rating": 5,
  "title": "Excelente produto",
  "comment": "Superou expectativas",
  "images": ["url1", "url2"]
}
```

---

## 📤 **UPLOAD**

#### `POST /api/upload`
**Upload de arquivo** (requer auth)

**Content-Type:** `multipart/form-data`

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('bucket', 'products');
formData.append('folder', 'images');

fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Response:**
```json
{
  "success": true,
  "url": "https://storage.url/path/file.jpg",
  "path": "images/file.jpg"
}
```

---

## 📊 **ADMIN**

#### `GET /api/admin/users`
**Listar usuários** (requer auth - admin)

#### `GET /api/admin/stats`
**Estatísticas do sistema** (requer auth - admin)

#### `PUT /api/admin/users/{id}/status`
**Ativar/desativar usuário** (requer auth - admin)

---

## 🔍 **DIAGNÓSTICO**

#### `GET /api/health`
**Status da API**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 12345
}
```

#### `GET /api/diagnostics`
**Diagnóstico completo**

```json
{
  "success": true,
  "diagnostics": {
    "database": "connected",
    "supabase": "connected",
    "environment": "production"
  }
}
```

---

## 📝 **CÓDIGOS DE STATUS**

- `200` - Sucesso
- `201` - Criado
- `400` - Dados inválidos
- `401` - Não autenticado
- `403` - Sem permissão
- `404` - Não encontrado
- `409` - Conflito
- `422` - Dados inválidos
- `500` - Erro interno

---

## 🚨 **LIMITES E RATE LIMITING**

- **Rate Limit:** 100 requests por 15 minutos
- **Upload:** Máximo 10MB por arquivo
- **Produtos:** Varia por plano (10-1000)
- **Imagens:** Varia por plano (1-10 por produto)

---

## 📚 **EXEMPLOS DE USO**

### **Fluxo de Compra Completo**

```javascript
// 1. Login
const login = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// 2. Buscar produtos
const products = await fetch('/api/products?category=electronics');

// 3. Criar pedido
const order = await fetch('/api/orders', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ items, addresses })
});

// 4. Processar pagamento
const payment = await fetch('/api/payments/create', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ orderId, paymentMethod })
});
```

---

## 🔧 **WEBHOOKS**

### **ASAAS Payment Webhook**
**URL:** `/api/payments/webhook`
**Method:** `POST`
**Headers:** `asaas-signature`

**Eventos:**
- `PAYMENT_CREATED`
- `PAYMENT_RECEIVED`
- `PAYMENT_CONFIRMED`
- `PAYMENT_REFUNDED`

---

**Para mais detalhes, consulte o código fonte em `/server/routes/` e `/api/`** 🚀