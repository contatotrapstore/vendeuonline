/**
 * Script de Correção - Sincronizar isActive com approval_status
 *
 * Propósito: Corrigir dados existentes onde lojas/produtos aprovados
 *            não têm isActive = true
 * Data: 19/12/2025
 *
 * Execução: node scripts/fix-isActive-data.cjs
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixIsActiveData() {
  console.log("🔧 CORREÇÃO: Sincronizar isActive com approval_status\n");
  console.log("=".repeat(70));

  try {
    // 1. Corrigir LOJAS aprovadas sem isActive = true
    console.log("\n📍 LOJAS:");

    const { data: storesBefore, error: storesError } = await supabase
      .from("stores")
      .select("id, name, approval_status, isActive");

    if (storesError) {
      console.error("❌ Erro ao buscar lojas:", storesError);
      return;
    }

    console.log(`   Total de lojas: ${storesBefore.length}`);

    const approvedStoresNeedFix = storesBefore.filter(
      s => s.approval_status === 'approved' && s.isActive !== true
    );
    console.log(`   Lojas aprovadas sem isActive=true: ${approvedStoresNeedFix.length}`);

    if (approvedStoresNeedFix.length > 0) {
      console.log("   Corrigindo...");
      for (const store of approvedStoresNeedFix) {
        const { error } = await supabase
          .from("stores")
          .update({ isActive: true, updatedAt: new Date().toISOString() })
          .eq("id", store.id);

        if (error) {
          console.error(`   ❌ Erro ao corrigir loja ${store.name}:`, error);
        } else {
          console.log(`   ✅ Loja "${store.name}" corrigida: isActive = true`);
        }
      }
    }

    const suspendedStoresNeedFix = storesBefore.filter(
      s => s.approval_status === 'suspended' && s.isActive !== false
    );
    console.log(`   Lojas suspensas sem isActive=false: ${suspendedStoresNeedFix.length}`);

    if (suspendedStoresNeedFix.length > 0) {
      console.log("   Corrigindo...");
      for (const store of suspendedStoresNeedFix) {
        const { error } = await supabase
          .from("stores")
          .update({ isActive: false, updatedAt: new Date().toISOString() })
          .eq("id", store.id);

        if (error) {
          console.error(`   ❌ Erro ao corrigir loja ${store.name}:`, error);
        } else {
          console.log(`   ✅ Loja "${store.name}" corrigida: isActive = false`);
        }
      }
    }

    // 2. Corrigir PRODUTOS aprovados sem isActive = true
    console.log("\n📦 PRODUTOS:");

    const { data: productsBefore, error: productsError } = await supabase
      .from("Product")
      .select("id, name, approval_status, isActive");

    if (productsError) {
      console.error("❌ Erro ao buscar produtos:", productsError);
      return;
    }

    console.log(`   Total de produtos: ${productsBefore.length}`);

    const approvedProductsNeedFix = productsBefore.filter(
      p => p.approval_status === 'APPROVED' && p.isActive !== true
    );
    console.log(`   Produtos aprovados sem isActive=true: ${approvedProductsNeedFix.length}`);

    if (approvedProductsNeedFix.length > 0) {
      console.log("   Corrigindo...");
      for (const product of approvedProductsNeedFix) {
        const { error } = await supabase
          .from("Product")
          .update({ isActive: true, updatedAt: new Date().toISOString() })
          .eq("id", product.id);

        if (error) {
          console.error(`   ❌ Erro ao corrigir produto ${product.name}:`, error);
        } else {
          console.log(`   ✅ Produto "${product.name}" corrigido: isActive = true`);
        }
      }
    }

    const rejectedProductsNeedFix = productsBefore.filter(
      p => p.approval_status === 'REJECTED' && p.isActive !== false
    );
    console.log(`   Produtos rejeitados sem isActive=false: ${rejectedProductsNeedFix.length}`);

    if (rejectedProductsNeedFix.length > 0) {
      console.log("   Corrigindo...");
      for (const product of rejectedProductsNeedFix) {
        const { error } = await supabase
          .from("Product")
          .update({ isActive: false, updatedAt: new Date().toISOString() })
          .eq("id", product.id);

        if (error) {
          console.error(`   ❌ Erro ao corrigir produto ${product.name}:`, error);
        } else {
          console.log(`   ✅ Produto "${product.name}" corrigido: isActive = false`);
        }
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ CORREÇÃO CONCLUÍDA!");
    console.log("=".repeat(70));

  } catch (error) {
    console.error("❌ Erro geral:", error);
  }
}

fixIsActiveData();
