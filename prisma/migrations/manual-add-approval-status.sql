-- Migration: Add approval_status and rejection_reason to stores table
-- Date: 2025-10-29
-- Purpose: Fix store approval persistence bug
-- Run this SQL manually in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Step 1: Add new columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stores_approval_status ON stores(approval_status);

-- Step 3: Migrate existing data from isVerified to approval_status
-- Stores that are verified → APPROVED
-- Stores that are not verified → Keep as PENDING (default)
UPDATE stores
SET approval_status = 'APPROVED'
WHERE "isVerified" = true AND approval_status = 'PENDING';

-- Step 4: Verify migration (optional - for checking results)
-- SELECT id, name, "isVerified", "isActive", approval_status, rejection_reason
-- FROM stores;

-- Expected results:
-- - All stores now have approval_status column (PENDING, APPROVED, REJECTED, or SUSPENDED)
-- - All stores now have rejection_reason column (nullable)
-- - Previously verified stores are now marked as APPROVED
-- - Index created for fast filtering by approval_status

-- Rollback instructions (if needed):
-- ALTER TABLE stores DROP COLUMN IF EXISTS approval_status;
-- ALTER TABLE stores DROP COLUMN IF EXISTS rejection_reason;
-- DROP INDEX IF EXISTS idx_stores_approval_status;
