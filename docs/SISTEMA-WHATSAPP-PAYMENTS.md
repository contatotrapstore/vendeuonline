# Sistema de Vendas e Pagamentos - Vendeu Online

## 📋 Arquitetura do Sistema

### 🛒 **PRODUTOS (Vendas WhatsApp-Only)**

O sistema **NÃO** possui carrinho de compras ou checkout para produtos. Todas as vendas de produtos são realizadas via WhatsApp.

#### Como Funciona:
1. **Buyer** navega pelos produtos na plataforma
2. **Clica no botão WhatsApp** no ProductCard
3. **É redirecionado** para WhatsApp do vendedor com mensagem pré-formatada
4. **Negocia diretamente** com o vendedor (preço, frete, pagamento)
5. **Vendedor e comprador** combinam pagamento e entrega externamente

#### Componentes Envolvidos:
- `src/components/ui/ProductCard.tsx` - Exibe botão WhatsApp (linha 9, 156-160, 243-251)
- `src/components/ui/WhatsAppButton.tsx` - Componente do botão WhatsApp
- **NÃO EXISTEM:**
  - ❌ Carrinho de compras
  - ❌ Checkout de produtos
  - ❌ Páginas de pagamento de produtos
  - ❌ CartStore

#### Configuração:
```typescript
// src/config/app.ts
features: {
  enableCheckout: false,
  enableCart: false,
  enablePayments: false, // Apenas para produtos
  forceWhatsApp: true,
}
```

---

### 💳 **PLANOS DE ASSINATURA (Sellers)**

O sistema **SIM** possui pagamentos online, mas APENAS para **assinaturas de planos de sellers**.

#### Como Funciona:
1. **Seller** escolhe um plano (Gratuito, Micro, Pequena, Simples, Plus)
2. **Clica em "Assinar"** na página `/seller/plans` ou `/pricing`
3. **Sistema gera pagamento** via ASAAS (PIX, Boleto, Cartão)
4. **Seller paga** e sistema ativa assinatura automaticamente
5. **Webhooks ASAAS** atualizam status do pagamento

#### Formas de Pagamento (ASAAS):
- **PIX** - Instantâneo, 5% desconto
- **Boleto Bancário** - Vencimento em 3 dias
- **Cartão de Crédito** - Até 12x sem juros
- **Débito Automático** - Renovação automática

#### Rotas de Pagamento:
```javascript
// server/routes/payments.js
POST /api/payments/create    - Criar pagamento de plano
GET  /api/payments/:id       - Consultar pagamento
POST /api/payments/webhook   - Webhook ASAAS (atualização status)
```

#### Componentes Envolvidos:
- `src/app/seller/plans/page.tsx` - Página de seleção de planos
- `src/app/pricing/page.tsx` - Página informativa de planos
- `src/components/PlanSelector.tsx` - Seletor de planos
- `server/routes/payments.js` - API de pagamentos
- `server/lib/asaas.js` - Integração ASAAS

---

## 🔧 Configuração Necessária

### 1. **Variáveis de Ambiente (ASAAS)**

```env
# ASAAS (Pagamento de Planos)
ASAAS_API_KEY=seu_api_key_aqui
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=seu_webhook_token_aqui
```

### 2. **Supabase Storage (Upload de Imagens)**

#### Buckets Necessários:
- `stores` - Logos e banners de lojas
- `products` - Imagens de produtos
- `avatars` - Fotos de perfil de usuários

#### Como Criar Buckets:
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Storage** no menu lateral
3. Clique em **"New Bucket"**
4. Crie os 3 buckets acima com configuração **Public**

#### Permissões RLS (Row Level Security):
```sql
-- Permitir upload autenticado
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('stores', 'products', 'avatars'));

-- Permitir leitura pública
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('stores', 'products', 'avatars'));

-- Permitir exclusão do próprio usuário
CREATE POLICY "Allow user deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. **WhatsApp Business**

Sellers devem configurar número de WhatsApp em:
- **Settings da Loja** (`/seller/settings`)
- Campo `whatsapp` na tabela `stores`

Formato: `5511999999999` (código país + DDD + número)

---

## 🐛 Troubleshooting

### Problema: "Upload de imagem não funciona"

**Possíveis Causas:**
1. ❌ Buckets não criados no Supabase Storage
2. ❌ Permissões RLS bloqueando upload
3. ❌ `SUPABASE_SERVICE_ROLE_KEY` não configurada
4. ❌ Arquivo maior que 5MB

**Solução:**
```bash
# Verificar se buckets existem
# Acesse: https://supabase.com/dashboard > Storage

# Testar upload manualmente
curl -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -F "file=@test-image.jpg" \
  -F "type=product"
```

**Logs para Debug:**
```javascript
// server/routes/upload.js
logger.info("📤 Upload solicitado");
logger.info("📁 Fazendo upload para bucket/folder");
logger.info("✅ Upload realizado com sucesso");
```

### Problema: "Erro ao criar pagamento de plano"

**Possíveis Causas:**
1. ❌ `ASAAS_API_KEY` não configurada
2. ❌ API ASAAS fora do ar
3. ❌ Dados de usuário incompletos (CPF, telefone)

**Solução:**
```bash
# Verificar variáveis de ambiente
echo $ASAAS_API_KEY
echo $ASAAS_BASE_URL

# Testar API ASAAS diretamente
curl https://api.asaas.com/v3/customers \
  -H "access_token: $ASAAS_API_KEY"
```

### Problema: "Botão WhatsApp não funciona"

**Possíveis Causas:**
1. ❌ Seller não configurou número de WhatsApp
2. ❌ Formato de número incorreto
3. ❌ Componente `WhatsAppButton` com props erradas

**Solução:**
```typescript
// Verificar se store tem whatsapp configurado
const store = {
  id: "abc123",
  name: "Minha Loja",
  whatsapp: "5511999999999", // OBRIGATÓRIO
};

// Uso correto do WhatsAppButton
<WhatsAppProductButton
  product={product}
  store={store}
  className="w-full py-3"
/>
```

---

## 📊 Resumo das Funcionalidades

| Funcionalidade | Status | Método | Observações |
|---|---|---|---|
| **Compra de Produtos** | ✅ Ativo | WhatsApp | Via botão WhatsApp no ProductCard |
| **Carrinho de Produtos** | ❌ Desabilitado | N/A | Sistema não possui carrinho |
| **Checkout de Produtos** | ❌ Desabilitado | N/A | Sistema não possui checkout |
| **Assinatura de Planos** | ✅ Ativo | ASAAS | PIX, Boleto, Cartão |
| **Upload de Imagens** | ✅ Ativo | Supabase Storage | Requer buckets configurados |
| **Pagamentos Online** | ✅ Ativo | ASAAS (apenas planos) | Webhooks configurados |

---

## 🎯 Decisões de Design

### Por que WhatsApp para produtos?

1. **Mercado Local** - Erechim-RS prefere negociação direta
2. **Flexibilidade** - Seller pode negociar preço, frete, formas de pagamento
3. **Confiança** - Contato direto aumenta confiança do comprador
4. **Simplicidade** - Evita complexidade de sistema de pagamentos para produtos
5. **Custos** - Sem taxas de gateway de pagamento para produtos

### Por que ASAAS para planos?

1. **Recorrência** - Planos são mensais/anuais (precisa de cobrança automática)
2. **Controle** - Sistema precisa ativar/desativar funcionalidades baseado em plano
3. **Profissionalismo** - Sellers esperam pagamento online para assinaturas
4. **Gateway Brasileiro** - ASAAS é adequado para mercado brasileiro (PIX, Boleto)

---

## ✅ Status Atual do Sistema

**Tudo funcionando corretamente:**
- ✅ Sistema já é WhatsApp-only para produtos
- ✅ Pagamentos online APENAS para planos (ASAAS)
- ✅ Upload de imagens implementado (precisa configurar buckets)
- ✅ Configurações corretas em `APP_CONFIG`
- ✅ Arquitetura clara e bem definida

**Nenhuma mudança necessária** - O sistema está exatamente como deveria estar!
