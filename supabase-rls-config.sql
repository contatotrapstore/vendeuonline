-- CONFIGURAÇÃO RLS PARA ACESSO PÚBLICO
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Permitir SELECT público na tabela Plan (já funciona)
DROP POLICY IF EXISTS "Enable public select access for plans" ON "Plan";
CREATE POLICY "Enable public select access for plans" ON "Plan"
FOR SELECT USING (true);

-- 2. Permitir SELECT público na tabela Product
DROP POLICY IF EXISTS "Enable public select access for products" ON "Product";
CREATE POLICY "Enable public select access for products" ON "Product"
FOR SELECT USING (true);

-- 3. Permitir SELECT público na tabela Store
DROP POLICY IF EXISTS "Enable public select access for stores" ON "Store";
CREATE POLICY "Enable public select access for stores" ON "Store"
FOR SELECT USING (true);

-- 4. Permitir SELECT público na tabela Category
DROP POLICY IF EXISTS "Enable public select access for categories" ON "Category";
CREATE POLICY "Enable public select access for categories" ON "Category"
FOR SELECT USING (true);

-- 5. Permitir SELECT público na tabela SystemConfig para tracking
DROP POLICY IF EXISTS "Enable public select access for system_config" ON "SystemConfig";
CREATE POLICY "Enable public select access for system_config" ON "SystemConfig"
FOR SELECT USING (true);

-- 6. Permitir SELECT público na tabela ProductImage
DROP POLICY IF EXISTS "Enable public select access for product_images" ON "ProductImage";
CREATE POLICY "Enable public select access for product_images" ON "ProductImage"
FOR SELECT USING (true);

-- 7. Permitir SELECT público na tabela Seller (para relacionamentos)
DROP POLICY IF EXISTS "Enable public select access for sellers" ON "Seller";
CREATE POLICY "Enable public select access for sellers" ON "Seller"
FOR SELECT USING (true);

-- 8. Permitir SELECT público na tabela User (dados básicos para relacionamentos)
DROP POLICY IF EXISTS "Enable public select access for users" ON "User";
CREATE POLICY "Enable public select access for users" ON "User"
FOR SELECT USING (true);

-- 9. Permitir SELECT público na tabela ProductSpecification
DROP POLICY IF EXISTS "Enable public select access for product_specifications" ON "ProductSpecification";
CREATE POLICY "Enable public select access for product_specifications" ON "ProductSpecification"
FOR SELECT USING (true);

-- VERIFICAR STATUS DAS POLICIES
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('Plan', 'Product', 'Store', 'Category', 'SystemConfig', 'ProductImage', 'Seller', 'User')
ORDER BY tablename, policyname;