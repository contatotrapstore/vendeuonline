/**
 * 🧹 LIMPEZA MANUAL DO BANCO - SQL DIRETO
 *
 * INSTRUÇÕES:
 * 1. Acesse: https://supabase.com/dashboard/project/dycsfnbqgojhttnjbndp/sql/new
 * 2. Copie e cole este SQL
 * 3. Execute query por query (selecione cada bloco e clique RUN)
 * 4. Verifique resultado final
 *
 * ⚠️ ATENÇÃO: Este script remove TODOS os dados exceto o admin!
 */

-- ==================================================
-- PASSO 1: Buscar ID do admin (EXECUTE PRIMEIRO)
-- ==================================================

SELECT
  id as admin_id,
  email,
  type
FROM users
WHERE email = 'admin@vendeuonline.com';

-- ✅ Copie o "admin_id" retornado e substitua em todas as queries abaixo onde aparece 'ADMIN_ID_AQUI'


-- ==================================================
-- PASSO 2: Deletar dados (EXECUTE EM ORDEM)
-- ==================================================

-- 2.1. ProductSpecification (depende de Product)
DELETE FROM "ProductSpecification";

-- 2.2. ProductImage (depende de Product)
DELETE FROM "ProductImage";

-- 2.3. Product (depende de stores)
DELETE FROM "Product";

-- 2.4. seller_settings (depende de sellers)
DELETE FROM seller_settings;

-- 2.5. stores (depende de sellers)
DELETE FROM stores;

-- 2.6. sellers (depende de users)
DELETE FROM sellers;

-- 2.7. buyers (depende de users)
DELETE FROM buyers;

-- 2.8. admins extras (NÃO deletar admin principal!)
-- ⚠️ SUBSTITUA 'ADMIN_ID_AQUI' pelo ID copiado no PASSO 1
DELETE FROM admins
WHERE "userId" != 'ADMIN_ID_AQUI';

-- 2.9. users não-admin (NÃO deletar admin principal!)
-- ⚠️ SUBSTITUA 'ADMIN_ID_AQUI' pelo ID copiado no PASSO 1
DELETE FROM users
WHERE id != 'ADMIN_ID_AQUI';


-- ==================================================
-- PASSO 3: Verificar estado final (EXECUTE POR ÚLTIMO)
-- ==================================================

SELECT
  'users' as tabela,
  count(*)::int as registros,
  'Esperado: 1 (apenas admin)' as status
FROM users
UNION ALL
SELECT
  'sellers',
  count(*)::int,
  'Esperado: 0' as status
FROM sellers
UNION ALL
SELECT
  'buyers',
  count(*)::int,
  'Esperado: 0' as status
FROM buyers
UNION ALL
SELECT
  'stores',
  count(*)::int,
  'Esperado: 0' as status
FROM stores
UNION ALL
SELECT
  'Product',
  count(*)::int,
  'Esperado: 0' as status
FROM "Product"
UNION ALL
SELECT
  'ProductImage',
  count(*)::int,
  'Esperado: 0' as status
FROM "ProductImage"
UNION ALL
SELECT
  'ProductSpecification',
  count(*)::int,
  'Esperado: 0' as status
FROM "ProductSpecification"
ORDER BY tabela;


-- ==================================================
-- VERIFICAÇÃO ADICIONAL: Dados preservados
-- ==================================================

-- Verificar se admin foi preservado
SELECT
  id,
  email,
  type,
  name,
  "createdAt"
FROM users;

-- Verificar categorias (devem estar preservadas)
SELECT
  id,
  name,
  slug,
  "isActive"
FROM categories
ORDER BY "order";

-- Verificar planos (devem estar preservados)
SELECT
  id,
  name,
  price,
  "maxProducts",
  "isActive"
FROM "Plan"
ORDER BY "order";


-- ==================================================
-- ✅ RESULTADO ESPERADO
-- ==================================================

-- Após execução completa:
-- ✅ 1 usuário (admin@vendeuonline.com)
-- ✅ 0 sellers
-- ✅ 0 buyers
-- ✅ 0 stores
-- ✅ 0 produtos
-- ✅ Categorias preservadas
-- ✅ Planos preservados
-- ✅ Sistema limpo e pronto para novos testes
