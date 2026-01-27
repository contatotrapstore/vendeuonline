-- Migration: Create seller_settings table
-- Date: 2025-10-28
-- Purpose: Fix PGRST204 error - table was missing from Supabase database

-- Criar tabela seller_settings se não existir
CREATE TABLE IF NOT EXISTS "seller_settings" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sellerId" TEXT NOT NULL UNIQUE,

    -- Configurações de pagamento (colunas camelCase)
    "acceptsCreditCard" BOOLEAN NOT NULL DEFAULT true,
    "acceptsDebitCard" BOOLEAN NOT NULL DEFAULT true,
    "acceptsPix" BOOLEAN NOT NULL DEFAULT true,
    "acceptsBoleto" BOOLEAN NOT NULL DEFAULT false,
    "acceptsWhatsapp" BOOLEAN NOT NULL DEFAULT true,

    -- Configurações de entrega
    "freeShippingMin" DECIMAL(10,2),
    "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 10.0,
    "deliveryDays" INTEGER NOT NULL DEFAULT 7,
    "pickupAvailable" BOOLEAN NOT NULL DEFAULT false,

    -- Configurações da loja
    "workingDays" TEXT NOT NULL DEFAULT '[]',
    "workingHours" TEXT NOT NULL DEFAULT '{"start": "08:00", "end": "18:00"}',
    "autoApproveOrders" BOOLEAN NOT NULL DEFAULT false,

    -- Políticas
    "returnPolicy" TEXT,
    "privacyPolicy" TEXT,
    terms TEXT,

    -- Notificações
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Foreign key constraint
    CONSTRAINT "seller_settings_sellerId_fkey" FOREIGN KEY ("sellerId")
        REFERENCES "sellers"(id) ON DELETE CASCADE
);

-- Create index on sellerId for faster lookups
CREATE INDEX IF NOT EXISTS "seller_settings_sellerId_idx" ON "seller_settings"("sellerId");

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "seller_settings" TO authenticated;
GRANT SELECT ON "seller_settings" TO anon;

-- Add comment to table
COMMENT ON TABLE "seller_settings" IS 'Configurações específicas de cada vendedor (pagamento, entrega, políticas)';
