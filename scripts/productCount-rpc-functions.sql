-- ============================================
-- RPC FUNCTIONS PARA SYNC DE productCount
-- ============================================
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nnfpzmftzwdgmvbfrsjp/sql
--
-- Estas funções mantêm o campo productCount sincronizado
-- automaticamente quando produtos são criados/deletados
-- ============================================

-- Função para incrementar productCount (+1)
CREATE OR REPLACE FUNCTION increment_product_count(store_id text)
RETURNS void AS $$
BEGIN
  UPDATE stores
  SET "productCount" = "productCount" + 1,
      "updatedAt" = NOW()
  WHERE id = store_id;
END;
$$ LANGUAGE plpgsql;

-- Função para decrementar productCount (-1)
CREATE OR REPLACE FUNCTION decrement_product_count(store_id text)
RETURNS void AS $$
BEGIN
  UPDATE stores
  SET "productCount" = GREATEST(0, "productCount" - 1),
      "updatedAt" = NOW()
  WHERE id = store_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TESTE DAS FUNÇÕES (opcional)
-- ============================================
-- Após criar as funções, você pode testá-las:
--
-- 1. Criar uma loja teste:
-- INSERT INTO stores (id, name, slug, "productCount")
-- VALUES ('test-store-id', 'Test Store', 'test-store', 0);
--
-- 2. Incrementar productCount:
-- SELECT increment_product_count('test-store-id');
--
-- 3. Verificar resultado (deve ser 1):
-- SELECT "productCount" FROM stores WHERE id = 'test-store-id';
--
-- 4. Decrementar productCount:
-- SELECT decrement_product_count('test-store-id');
--
-- 5. Verificar resultado (deve ser 0):
-- SELECT "productCount" FROM stores WHERE id = 'test-store-id';
--
-- 6. Limpar teste:
-- DELETE FROM stores WHERE id = 'test-store-id';
-- ============================================
