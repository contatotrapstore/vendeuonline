-- Migration: Create core commerce tables (orders, order items, payments, addresses)
-- Date: 2025-10-29
-- Purpose: Align Supabase schema com funcionalidades implementadas no backend

-- =========================
-- Orders
-- =========================
CREATE TABLE IF NOT EXISTS "Order" (
    id TEXT PRIMARY KEY,
    "number" TEXT,
    "userId" TEXT,
    "buyerId" TEXT,
    "sellerId" TEXT,
    "storeId" TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12,2),
    "shippingCost" NUMERIC(12,2),
    notes TEXT,
    "trackingCode" TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "deliveredAt" TIMESTAMP WITH TIME ZONE,
    "cancelledAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT order_user_fk FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT order_buyer_fk FOREIGN KEY ("buyerId") REFERENCES buyers(id) ON DELETE SET NULL,
    CONSTRAINT order_seller_fk FOREIGN KEY ("sellerId") REFERENCES sellers(id) ON DELETE SET NULL,
    CONSTRAINT order_store_fk FOREIGN KEY ("storeId") REFERENCES stores(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_user ON "Order"("userId");
CREATE INDEX IF NOT EXISTS idx_order_buyer ON "Order"("buyerId");
CREATE INDEX IF NOT EXISTS idx_order_seller ON "Order"("sellerId");
CREATE INDEX IF NOT EXISTS idx_order_store ON "Order"("storeId");
CREATE INDEX IF NOT EXISTS idx_order_status ON "Order"(status);

-- =========================
-- Order Items
-- =========================
CREATE TABLE IF NOT EXISTS "OrderItem" (
    id TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "sellerId" TEXT,
    "storeId" TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    metadata JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT order_item_order_fk FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE CASCADE,
    CONSTRAINT order_item_product_fk FOREIGN KEY ("productId") REFERENCES "Product"(id) ON DELETE SET NULL,
    CONSTRAINT order_item_seller_fk FOREIGN KEY ("sellerId") REFERENCES sellers(id) ON DELETE SET NULL,
    CONSTRAINT order_item_store_fk FOREIGN KEY ("storeId") REFERENCES stores(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_item_order ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS idx_order_item_product ON "OrderItem"("productId");
CREATE INDEX IF NOT EXISTS idx_order_item_seller ON "OrderItem"("sellerId");

-- =========================
-- Addresses
-- =========================
CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    label TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT addresses_user_fk FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses("userId");

-- =========================
-- Payments
-- =========================
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    "userId" TEXT,
    "sellerId" TEXT,
    "orderId" TEXT,
    "subscriptionId" TEXT,
    "asaasPaymentId" TEXT,
    "externalReference" TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    method TEXT,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    "paidAt" TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT payments_user_fk FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT payments_seller_fk FOREIGN KEY ("sellerId") REFERENCES sellers(id) ON DELETE SET NULL,
    CONSTRAINT payments_order_fk FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE SET NULL,
    CONSTRAINT payments_subscription_fk FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments("userId");
CREATE INDEX IF NOT EXISTS idx_payments_seller ON payments("sellerId");
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments("orderId");
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments("subscriptionId");
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- =========================
-- Subscription adjustments
-- =========================
ALTER TABLE "Subscription"
    ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

-- =========================
-- Defaults
-- =========================
ALTER TABLE "Order" ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE "OrderItem" ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE payments ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
