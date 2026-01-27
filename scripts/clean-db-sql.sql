-- 🗑️ LIMPEZA DO BANCO MANTENDO APENAS ADMIN
-- Execute este SQL no Supabase SQL Editor

-- 1. Encontrar o ID do admin
SELECT id, email, name, type FROM users WHERE type = 'ADMIN';

-- 2. Deletar dados relacionados (respeitando foreign keys)
DELETE FROM "OrderItem";
DELETE FROM "Order";
DELETE FROM carts;
DELETE FROM reviews;
DELETE FROM "Wishlist";
DELETE FROM addresses;
DELETE FROM notifications;
DELETE FROM payments;
DELETE FROM "ProductImage";
DELETE FROM "ProductSpecification";
DELETE FROM "Subscription";

-- 3. Deletar produtos
DELETE FROM "Product";

-- 4. Deletar lojas
DELETE FROM stores;

-- 5. Deletar sellers e buyers
DELETE FROM sellers;
DELETE FROM buyers;

-- 6. Deletar registros admin extras (manter apenas 1)
DELETE FROM admins WHERE userId NOT IN (
  SELECT id FROM users WHERE type = 'ADMIN' LIMIT 1
);

-- 7. Deletar usuários exceto admin
DELETE FROM users WHERE type != 'ADMIN';

-- 8. Verificação final
SELECT
  'users' as tabela,
  COUNT(*) as total,
  '(deve ser 1)' as esperado
FROM users
UNION ALL
SELECT 'sellers', COUNT(*), '(deve ser 0)' FROM sellers
UNION ALL
SELECT 'buyers', COUNT(*), '(deve ser 0)' FROM buyers
UNION ALL
SELECT 'Product', COUNT(*), '(deve ser 0)' FROM "Product"
UNION ALL
SELECT 'stores', COUNT(*), '(deve ser 0)' FROM stores
UNION ALL
SELECT 'Wishlist', COUNT(*), '(deve ser 0)' FROM "Wishlist"
UNION ALL
SELECT 'addresses', COUNT(*), '(deve ser 0)' FROM addresses;
