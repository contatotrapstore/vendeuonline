-- Manual migration: create commerce tables for local dev (orders, order items, payments, addresses)
-- Execute with: npx prisma db execute --file prisma/migrations/manual-create-commerce-tables.sql

\i ../../supabase/migrations/003_create_orders_addresses_payments.sql
