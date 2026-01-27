-- ============================================
-- MANUAL DATABASE CLEANUP - Execute no Supabase Dashboard
-- ============================================
-- Dashboard URL: https://supabase.com/dashboard/project/kkcxdbpxixkkuajtaxgf/editor
-- SQL Editor: Clique em "SQL Editor" no menu lateral
--
-- ATENÇÃO: Este script deleta TODOS os dados exceto o admin!
-- Execute com cuidado!
-- ============================================

-- Step 1: Delete all product-related data (em ordem devido a foreign keys)
DELETE FROM "ProductSpecification";
DELETE FROM "ProductImage";
DELETE FROM "Product";

-- Step 2: Delete store-related data
DELETE FROM "seller_settings";
DELETE FROM "stores";

-- Step 3: Delete user-type records (manter apenas admin)
DELETE FROM "buyers";
DELETE FROM "sellers";

-- Step 4: Delete users except admin (preserva admin@vendeuonline.com)
DELETE FROM "users"
WHERE email != 'admin@vendeuonline.com';

-- Step 5: VERIFICAÇÃO - Executar para confirmar limpeza
SELECT
  'users' as table_name, COUNT(*) as count FROM "users"
UNION ALL
SELECT 'admins', COUNT(*) FROM "admins"
UNION ALL
SELECT 'sellers', COUNT(*) FROM "sellers"
UNION ALL
SELECT 'buyers', COUNT(*) FROM "buyers"
UNION ALL
SELECT 'stores', COUNT(*) FROM "stores"
UNION ALL
SELECT 'Product', COUNT(*) FROM "Product"
UNION ALL
SELECT 'ProductImage', COUNT(*) FROM "ProductImage"
UNION ALL
SELECT 'ProductSpecification', COUNT(*) FROM "ProductSpecification"
ORDER BY table_name;

-- ============================================
-- RESULTADO ESPERADO:
-- - users: 1 (apenas admin@vendeuonline.com)
-- - admins: 1 (admin)
-- - sellers: 0
-- - buyers: 0
-- - stores: 0
-- - Product: 0
-- - ProductImage: 0
-- - ProductSpecification: 0
-- ============================================
