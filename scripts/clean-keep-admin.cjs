#!/usr/bin/env node

/**
 * 🗑️ LIMPEZA DO BANCO MANTENDO APENAS ADMIN
 *
 * Remove todos produtos, lojas e usuários, mantendo apenas a conta admin.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: Variáveis SUPABASE não configuradas");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("🗑️  LIMPEZA DO BANCO - MANTENDO APENAS ADMIN");
  console.log("============================================\n");

  try {
    // 1. Identificar admin
    console.log("🔍 Identificando admin...");
    const { data: admins, error: adminError } = await supabase
      .from("users")
      .select("id, email, name, type")
      .eq("type", "ADMIN");

    if (adminError) {
      console.error("❌ Erro ao buscar admin:", adminError.message);
      process.exit(1);
    }

    if (!admins || admins.length === 0) {
      console.error("❌ Nenhum admin encontrado no banco!");
      process.exit(1);
    }

    const admin = admins[0];
    console.log(`✅ Admin identificado: ${admin.email} (ID: ${admin.id})\n`);

    // 2. Deletar dados relacionados primeiro (respeitando foreign keys)
    console.log("🧹 Limpando dados relacionados...");

    const relatedTables = [
      "OrderItem",
      "Order",
      "carts",
      "reviews",
      "wishlists",
      "addresses",
      "notifications",
      "payments",
      "ProductImage",
      "ProductSpecification",
      "Subscription"
    ];

    for (const table of relatedTables) {
      const { error } = await supabase.from(table).delete().neq("id", "");
      if (error && !error.message.includes("does not exist")) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table} limpo`);
      }
    }

    // 3. Deletar produtos
    console.log("\n🗑️  Deletando produtos...");
    const { data: products, error: prodError } = await supabase
      .from("Product")
      .delete()
      .neq("id", "");

    if (prodError) {
      console.log(`   ⚠️  Erro: ${prodError.message}`);
    } else {
      console.log(`   ✅ Produtos deletados`);
    }

    // 4. Deletar lojas
    console.log("\n🗑️  Deletando lojas...");
    const { data: stores, error: storeError } = await supabase
      .from("Store")
      .delete()
      .neq("id", "");

    if (storeError) {
      console.log(`   ⚠️  Erro: ${storeError.message}`);
    } else {
      console.log(`   ✅ Lojas deletadas`);
    }

    // 5. Deletar sellers e buyers
    console.log("\n🗑️  Deletando sellers e buyers...");

    const { error: sellerError } = await supabase
      .from("Seller")
      .delete()
      .neq("id", "");

    if (sellerError && !sellerError.message.includes("does not exist")) {
      console.log(`   ⚠️  Sellers: ${sellerError.message}`);
    } else {
      console.log(`   ✅ Sellers deletados`);
    }

    const { error: buyerError } = await supabase
      .from("Buyer")
      .delete()
      .neq("id", "");

    if (buyerError && !buyerError.message.includes("does not exist")) {
      console.log(`   ⚠️  Buyers: ${buyerError.message}`);
    } else {
      console.log(`   ✅ Buyers deletados`);
    }

    // 6. Deletar usuários EXCETO admin
    console.log("\n🗑️  Deletando usuários (mantendo admin)...");
    const { data: deletedUsers, error: userError } = await supabase
      .from("users")
      .delete()
      .neq("id", admin.id);

    if (userError) {
      console.log(`   ⚠️  Erro: ${userError.message}`);
    } else {
      console.log(`   ✅ Usuários deletados (admin preservado)`);
    }

    // 7. Verificação final
    console.log("\n📊 VERIFICAÇÃO FINAL:");

    const { count: userCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    const { count: productCount } = await supabase
      .from("Product")
      .select("*", { count: "exact", head: true });

    const { count: storeCount } = await supabase
      .from("Store")
      .select("*", { count: "exact", head: true });

    console.log(`   Usuários: ${userCount || 0} (deve ser 1 - apenas admin)`);
    console.log(`   Produtos: ${productCount || 0} (deve ser 0)`);
    console.log(`   Lojas: ${storeCount || 0} (deve ser 0)`);

    if (userCount === 1 && productCount === 0 && storeCount === 0) {
      console.log("\n✅ LIMPEZA COMPLETA! Apenas admin permanece no banco.");
    } else {
      console.log("\n⚠️  Limpeza parcial. Alguns registros podem ter permanecido.");
    }

  } catch (error) {
    console.error("❌ Erro fatal:", error.message);
    process.exit(1);
  }
}

main();
