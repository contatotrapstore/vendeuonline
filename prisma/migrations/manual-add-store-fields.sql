-- ===================================================================
-- Migration: Add Missing Fields to Stores Table
-- Date: 2025-11-10
-- Purpose: Fix Bugs #1-5 (WhatsApp, CEP, Category, etc.)
-- CRITICAL: Run this SQL in Supabase Dashboard BEFORE deploying code
-- ===================================================================

-- Add missing columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS "zipCode" text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0.0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_category ON stores(category);
CREATE INDEX IF NOT EXISTS idx_stores_rating ON stores(rating);
CREATE INDEX IF NOT EXISTS idx_stores_zipcode ON stores("zipCode");

-- Migrate data from sellers table to stores (if sellers table has these fields)
-- This ensures existing data is preserved
UPDATE stores s
SET
  whatsapp = COALESCE(s.whatsapp, sel.phone),  -- Fallback to phone if no whatsapp
  "zipCode" = COALESCE(s."zipCode", sel."zipCode", '00000-000'),
  category = COALESCE(s.category, sel.category, 'geral'),
  website = COALESCE(s.website, ''),
  address = COALESCE(s.address, CONCAT(s.city, ', ', s.state))
FROM sellers sel
WHERE s."sellerId" = sel.id;

-- Verify migration results
SELECT
  id,
  name,
  whatsapp,
  "zipCode",
  category,
  phone,
  city,
  state,
  "createdAt"
FROM stores
ORDER BY "createdAt" DESC
LIMIT 10;

-- Expected Results:
-- ✅ All stores now have whatsapp, zipCode, category columns
-- ✅ whatsapp may be NULL or have phone number
-- ✅ zipCode may be NULL or '00000-000'
-- ✅ category defaults to 'geral'
-- ✅ website may be NULL or empty string
-- ✅ address may be NULL or 'city, state'
-- ✅ rating defaults to 0.0

-- IMPORTANT NOTES:
-- 1. This migration is IDEMPOTENT (safe to run multiple times)
-- 2. Uses IF NOT EXISTS to avoid errors if columns already exist
-- 3. Preserves existing data with COALESCE
-- 4. Creates indexes for better query performance
-- 5. Run in Supabase SQL Editor: https://supabase.com/dashboard/project/[PROJECT_ID]/sql
