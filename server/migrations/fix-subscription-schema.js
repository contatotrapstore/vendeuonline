/**
 * Migration: Remove userId column from Subscription table
 * This migration fixes the schema discrepancy where Prisma schema
 * was updated to use sellerId only, but database still has userId.
 *
 * Run this ONCE via: node server/migrations/fix-subscription-schema.js
 */

import { supabaseAdmin } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";

async function migrateSubscriptionSchema() {
  try {
    logger.info("🔧 Starting Subscription schema migration...");

    // Step 1: Check current table structure
    logger.info("Step 1: Checking current Subscription table structure...");

    const { data: columns, error: checkError } = await supabaseAdmin
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "Subscription")
      .eq("table_schema", "public");

    if (checkError) {
      logger.error("❌ Failed to check table structure:", checkError);
      throw checkError;
    }

    const columnNames = columns?.map(c => c.column_name) || [];
    logger.info("Current columns:", columnNames);

    const hasUserId = columnNames.includes("userId");
    const hasSellerId = columnNames.includes("sellerId");

    logger.info(`Has userId: ${hasUserId}, Has sellerId: ${hasSellerId}`);

    // Step 2: If userId exists, we need to migrate
    if (hasUserId) {
      logger.warn("⚠️  userId column found - migration needed");

      // First, check if there's any data
      const { count, error: countError } = await supabaseAdmin
        .from("Subscription")
        .select("*", { count: "exact", head: true });

      if (countError) {
        logger.error("❌ Failed to count subscriptions:", countError);
        throw countError;
      }

      logger.info(`Found ${count} existing subscriptions`);

      if (count > 0) {
        logger.info("Step 2: Migrating existing subscription data...");

        // Get all subscriptions with their userId
        const { data: subscriptions, error: fetchError } = await supabaseAdmin
          .from("Subscription")
          .select("id, userId");

        if (fetchError) {
          logger.error("❌ Failed to fetch subscriptions:", fetchError);
          throw fetchError;
        }

        logger.info(`Fetched ${subscriptions.length} subscriptions to migrate`);

        // For each subscription, find the seller by userId and update sellerId
        for (const sub of subscriptions) {
          if (!sub.userId) {
            logger.warn(`⚠️  Subscription ${sub.id} has no userId - skipping`);
            continue;
          }

          // Find seller by userId
          const { data: seller, error: sellerError } = await supabaseAdmin
            .from("sellers")
            .select("id")
            .eq("userId", sub.userId)
            .maybeSingle();

          if (sellerError) {
            logger.error(`❌ Error finding seller for userId ${sub.userId}:`, sellerError);
            continue;
          }

          if (!seller) {
            logger.warn(`⚠️  No seller found for userId ${sub.userId} - subscription ${sub.id} will be orphaned`);
            continue;
          }

          // Update subscription with sellerId
          const { error: updateError } = await supabaseAdmin
            .from("Subscription")
            .update({ sellerId: seller.id })
            .eq("id", sub.id);

          if (updateError) {
            logger.error(`❌ Failed to update subscription ${sub.id}:`, updateError);
          } else {
            logger.info(`✅ Updated subscription ${sub.id} with sellerId ${seller.id}`);
          }
        }
      }

      logger.info("Step 3: Altering table schema - removing userId column...");

      // Note: We can't use Supabase REST API to alter table structure
      // This needs to be done via SQL or Supabase Dashboard
      logger.warn("⚠️  MANUAL ACTION REQUIRED:");
      logger.warn("   Go to Supabase Dashboard > SQL Editor");
      logger.warn("   Run the following SQL:");
      logger.warn("");
      logger.warn("   -- Drop userId column");
      logger.warn("   ALTER TABLE \"Subscription\" DROP COLUMN IF EXISTS \"userId\";");
      logger.warn("");
      logger.warn("   -- Make sellerId NOT NULL (if not already)");
      logger.warn("   ALTER TABLE \"Subscription\" ALTER COLUMN \"sellerId\" SET NOT NULL;");
      logger.warn("");
      logger.info("✅ Data migration completed successfully!");
      logger.info("   Please run the SQL commands above to complete the schema migration.");

    } else if (!hasSellerId) {
      logger.error("❌ CRITICAL: Table has neither userId nor sellerId!");
      throw new Error("Invalid Subscription table structure");
    } else {
      logger.info("✅ Schema is already correct - no userId column found");
      logger.info("   sellerId column exists and is being used");
    }

  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
migrateSubscriptionSchema()
  .then(() => {
    logger.info("🎉 Migration process completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("💥 Migration failed:", error);
    process.exit(1);
  });
