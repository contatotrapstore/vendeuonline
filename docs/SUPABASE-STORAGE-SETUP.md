# Guia de Configuração - Supabase Storage

## 🎯 Objetivo

Configurar buckets no Supabase Storage para permitir upload de imagens de produtos, lojas e avatares.

---

## 📋 Pré-requisitos

- Conta Supabase ativa
- Projeto criado no Supabase
- Variáveis de ambiente configuradas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🪣 Buckets Necessários

O sistema precisa de **3 buckets públicos**:

| Bucket | Descrição | Usado por |
|---|---|---|
| `stores` | Logos e banners de lojas | Sellers (configuração de loja) |
| `products` | Fotos de produtos | Sellers (cadastro de produtos) |
| `avatars` | Fotos de perfil de usuários | Todos os usuários |

---

## 🔧 Passo a Passo: Criar Buckets

### 1. Acesse o Supabase Dashboard

```
https://supabase.com/dashboard
```

1. Faça login na sua conta
2. Selecione o projeto **Vendeu Online**
3. No menu lateral, clique em **"Storage"**

### 2. Criar Bucket `stores`

1. Clique em **"New Bucket"**
2. Preencha os campos:
   - **Name:** `stores`
   - **Public bucket:** ✅ **Marque esta opção** (bucket público)
   - **File size limit:** `5MB` (opcional)
   - **Allowed MIME types:** `image/*` (opcional)
3. Clique em **"Create Bucket"**

### 3. Criar Bucket `products`

Repita o processo acima com:
- **Name:** `products`
- **Public bucket:** ✅ Marcado
- **File size limit:** `5MB`
- **Allowed MIME types:** `image/*`

### 4. Criar Bucket `avatars`

Repita o processo acima com:
- **Name:** `avatars`
- **Public bucket:** ✅ Marcado
- **File size limit:** `5MB`
- **Allowed MIME types:** `image/*`

---

## 🔐 Configurar Permissões RLS (Row Level Security)

### Por que RLS?

Row Level Security garante que:
- ✅ Apenas usuários autenticados podem fazer upload
- ✅ Todos podem ler (buckets públicos)
- ✅ Usuários só podem deletar seus próprios arquivos

### Aplicar Políticas RLS

1. No menu lateral, clique em **"Storage"**
2. Selecione um bucket (ex: `stores`)
3. Clique na aba **"Policies"**
4. Clique em **"New Policy"**

#### Política 1: Permitir Upload Autenticado

```sql
-- Nome: Allow authenticated uploads
-- Operação: INSERT
-- Roles: authenticated

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('stores', 'products', 'avatars')
);
```

#### Política 2: Permitir Leitura Pública

```sql
-- Nome: Allow public reads
-- Operação: SELECT
-- Roles: public

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id IN ('stores', 'products', 'avatars')
);
```

#### Política 3: Permitir Exclusão do Próprio Usuário

```sql
-- Nome: Allow user deletes
-- Operação: DELETE
-- Roles: authenticated

CREATE POLICY "Allow user deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('stores', 'products', 'avatars') AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Nota:** Se preferir, pode usar o editor visual do Supabase ao invés de SQL.

---

## ✅ Verificar Configuração

### Teste Manual no Dashboard

1. Vá em **Storage** > selecione bucket `products`
2. Clique em **"Upload file"**
3. Faça upload de uma imagem de teste
4. Verifique se a imagem aparece na lista
5. Copie a URL pública e teste no navegador

### Teste via API do Sistema

```bash
# 1. Fazer login e obter token JWT
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@vendeuonline.com",
    "password": "Test123!@#"
  }'

# 2. Copiar o token da resposta
export TOKEN="seu_token_aqui"

# 3. Testar upload
curl -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg" \
  -F "type=product"

# 4. Verificar resposta
# Deve retornar: { "success": true, "url": "https://...", "path": "..." }
```

### Verificar via Frontend

1. Faça login como **Seller** em http://localhost:5173
2. Vá em **Produtos** > **Novo Produto**
3. Tente fazer upload de uma imagem
4. Verifique se:
   - ✅ Upload inicia (loading aparece)
   - ✅ Imagem aparece após upload
   - ✅ Pode remover imagem
   - ✅ Pode reordenar imagens

---

## 🐛 Troubleshooting

### Erro: "403 Forbidden"

**Causa:** Políticas RLS bloqueando acesso

**Solução:**
1. Verifique se as 3 políticas foram aplicadas
2. Teste com SQL Editor se as políticas estão ativas:
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'products';
```

### Erro: "Bucket not found"

**Causa:** Bucket não foi criado ou nome incorreto

**Solução:**
1. Verifique se os 3 buckets existem
2. Confirme nomes exatos: `stores`, `products`, `avatars`

### Erro: "File too large"

**Causa:** Arquivo maior que 5MB

**Solução:**
- Configure `File size limit` no bucket para permitir arquivos maiores
- Ou comprima imagens antes do upload

### Erro: "Invalid API key"

**Causa:** `SUPABASE_SERVICE_ROLE_KEY` incorreta ou não configurada

**Solução:**
```bash
# Verifique .env
cat .env | grep SUPABASE_SERVICE_ROLE_KEY

# Obtenha a key correta no Supabase Dashboard:
# Settings > API > service_role (secret)
```

### Upload não inicia

**Causa:** Frontend não consegue se conectar à API

**Solução:**
```javascript
// Verifique console do navegador (F12)
// Deve aparecer:
// "📤 Upload de imagem solicitado"
// "📁 Fazendo upload para bucket/folder"
// "✅ Upload realizado com sucesso"

// Se não aparecer, verifique:
// 1. API rodando em http://localhost:3001
// 2. CORS configurado corretamente
// 3. Token JWT válido
```

---

## 📊 Estrutura de Pastas

Após configurar, a estrutura ficará assim:

```
Supabase Storage
├── stores/
│   ├── images/
│   │   ├── 1234567890-abc123.jpg  (logos de lojas)
│   │   └── 1234567891-def456.png  (banners de lojas)
│   └── ...
├── products/
│   ├── products/  (pasta padrão para produtos)
│   │   ├── 1234567892-ghi789.jpg  (foto produto 1)
│   │   ├── 1234567893-jkl012.jpg  (foto produto 2)
│   │   └── ...
│   └── ...
└── avatars/
    ├── avatars/  (pasta padrão para avatares)
    │   ├── 1234567894-mno345.jpg  (avatar usuário 1)
    │   ├── 1234567895-pqr678.jpg  (avatar usuário 2)
    │   └── ...
    └── ...
```

---

## 🎯 Resultado Esperado

Após seguir este guia:

- ✅ 3 buckets criados e públicos
- ✅ Políticas RLS configuradas
- ✅ Upload funcionando no sistema
- ✅ Imagens acessíveis publicamente
- ✅ Sellers conseguem cadastrar produtos com fotos
- ✅ Lojas conseguem ter logos e banners
- ✅ Usuários conseguem ter avatares

---

## 📚 Referências

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)

---

**Última atualização:** Outubro 2025
**Autor:** Sistema Vendeu Online
**Status:** ✅ Validado e testado
