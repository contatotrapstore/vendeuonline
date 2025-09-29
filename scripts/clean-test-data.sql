-- ========================================
-- SCRIPT DE LIMPEZA COMPLETA DOS DADOS DE TESTE
-- ========================================
-- Este script remove TODOS os dados de teste/mockados do banco
-- ATENÇÃO: Execute apenas se tem certeza que quer limpar TUDO

BEGIN;

-- Desabilitar verificação de foreign keys temporariamente para PostgreSQL
SET session_replication_role = replica;

-- Limpar dados relacionados a pedidos primeiro
DELETE FROM commission_transactions;
DELETE FROM commission_payouts;
DELETE FROM "OrderItem";
DELETE FROM "Order";
DELETE FROM "StockMovement";

-- Limpar dados de produtos
DELETE FROM "ProductImage";
DELETE FROM "ProductSpecification";
DELETE FROM "Wishlist";
DELETE FROM "Product";

-- Limpar reviews e reports
DELETE FROM review_votes;
DELETE FROM review_reports;
DELETE FROM reviews;

-- Limpar notificações
DELETE FROM store_status_notifications;
DELETE FROM "Notification";
DELETE FROM notifications;

-- Limpar dados de lojas
DELETE FROM store_approval_history;
DELETE FROM stores;

-- Limpar dados de pagamentos e assinaturas
DELETE FROM payments;
DELETE FROM "Subscription";

-- Limpar dados de configurações
DELETE FROM "SellerSettings";
DELETE FROM seller_settings;
DELETE FROM user_settings;
DELETE FROM addresses;

-- Limpar dados de usuários (por último devido às FKs)
DELETE FROM admins;
DELETE FROM sellers;
DELETE FROM buyers;
DELETE FROM users;

-- Limpar categorias
DELETE FROM categories;

-- Limpar banners
DELETE FROM banners;

-- Limpar eventos de analytics
DELETE FROM analytics_events;

-- Limpar filtros de moderação
DELETE FROM moderation_filters;

-- Reabilitar verificação de foreign keys
SET session_replication_role = DEFAULT;

-- Resetar sequências se necessário (opcional)
-- SELECT setval('users_id_seq', 1, false);

COMMIT;

-- Verificar limpeza
SELECT
    'users' as tabela, COUNT(*) as registros FROM users
UNION ALL
SELECT
    'Product' as tabela, COUNT(*) as registros FROM "Product"
UNION ALL
SELECT
    'stores' as tabela, COUNT(*) as registros FROM stores
UNION ALL
SELECT
    'Order' as tabela, COUNT(*) as registros FROM "Order"
UNION ALL
SELECT
    'categories' as tabela, COUNT(*) as registros FROM categories
ORDER BY tabela;

-- Resultado esperado: Todas as tabelas devem ter 0 registros