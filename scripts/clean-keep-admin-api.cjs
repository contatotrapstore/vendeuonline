#!/usr/bin/env node

/**
 * 🗑️ LIMPEZA DO BANCO MANTENDO APENAS ADMIN (via API Backend)
 *
 * Remove todos produtos, lojas e usuários, mantendo apenas a conta admin.
 */

const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: Variáveis SUPABASE não configuradas");
  console.log("SUPABASE_URL:", supabaseUrl ? "✅ Definida" : "❌ Não definida");
  console.log("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✅ Definida" : "❌ Não definida");
  process.exit(1);
}

console.log("🔧 Usando credenciais:");
console.log("   URL:", supabaseUrl);
console.log("   Key:", supabaseKey.substring(0, 20) + "...");

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log("\n🗑️  LIMPEZA DO BANCO - MANTENDO APENAS ADMIN");
  console.log("============================================\n");

  try {
    // 1. Identificar admin
    console.log("🔍 Identificando admin...");
    const { data: admins, error: adminError } = await supabase
      .from("users")
      .select("id, email, name, type")
      .eq("type", "ADMIN");

    if (adminError) {
      console.error("❌ Erro ao buscar admin:", adminError);
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
      { name: "OrderItem", key: "id" },
      { name: "Order", key: "id" },
      { name: "carts", key: "id" },
      { name: "reviews", key: "id" },
      { name: "Wishlist", key: "id" },
      { name: "addresses", key: "id" },
      { name: "notifications", key: "id" },
      { name: "payments", key: "id" },
      { name: "ProductImage", key: "id" },
      { name: "ProductSpecification", key: "id" },
      { name: "Subscription", key: "id" }
    ];

    for (const table of relatedTables) {
      try {
        const { error, count } = await supabase
          .from(table.name)
          .delete()
          .neq(table.key, "");

        if (error) {
          console.log(`   ⚠️  ${table.name}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table.name} limpo`);
        }
      } catch (err) {
        console.log(`   ⚠️  ${table.name}: ${err.message}`);
      }
    }

    // 3. Deletar produtos
    console.log("\n🗑️  Deletando produtos...");
    const { error: prodError } = await supabase
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
    const { error: storeError } = await supabase
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

    if (sellerError) {
      console.log(`   ⚠️  Sellers: ${sellerError.message}`);
    } else {
      console.log(`   ✅ Sellers deletados`);
    }

    const { error: buyerError } = await supabase
      .from("Buyer")
      .delete()
      .neq("id", "");

    if (buyerError) {
      console.log(`   ⚠️  Buyers: ${buyerError.message}`);
    } else {
      console.log(`   ✅ Buyers deletados`);
    }

    // 6. Deletar tabela Admin (exceto o admin principal)
    console.log("\n🗑️  Limpando tabela Admin...");
    const { data: adminRecords } = await supabase
      .from("Admin")
      .select("id, userId")
      .neq("userId", admin.id);

    if (adminRecords && adminRecords.length > 0) {
      const { error: adminTableError } = await supabase
        .from("Admin")
        .delete()
        .neq("userId", admin.id);

      if (adminTableError) {
        console.log(`   ⚠️  Erro: ${adminTableError.message}`);
      } else {
        console.log(`   ✅ Registros Admin extras deletados`);
      }
    } else {
      console.log(`   ✅ Nenhum registro Admin extra encontrado`);
    }

    // 7. Deletar usuários EXCETO admin
    console.log("\n🗑️  Deletando usuários (mantendo admin)...");
    const { error: userError } = await supabase
      .from("users")
      .delete()
      .neq("id", admin.id);

    if (userError) {
      console.log(`   ⚠️  Erro: ${userError.message}`);
    } else {
      console.log(`   ✅ Usuários deletados (admin preservado)`);
    }

    // 8. Verificação final
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

    const { count: sellerCount } = await supabase
      .from("Seller")
      .select("*", { count: "exact", head: true });

    const { count: buyerCount } = await supabase
      .from("Buyer")
      .select("*", { count: "exact", head: true });

    console.log(`   Usuários: ${userCount || 0} (deve ser 1 - apenas admin)`);
    console.log(`   Produtos: ${productCount || 0} (deve ser 0)`);
    console.log(`   Lojas: ${storeCount || 0} (deve ser 0)`);
    console.log(`   Sellers: ${sellerCount || 0} (deve ser 0)`);
    console.log(`   Buyers: ${buyerCount || 0} (deve ser 0)`);

    if (userCount === 1 && productCount === 0 && storeCount === 0) {
      console.log("\n✅ LIMPEZA COMPLETA! Apenas admin permanece no banco.");
      console.log(`\n📧 Admin preservado: ${admin.email}`);
    } else {
      console.log("\n⚠️  Limpeza parcial. Alguns registros podem ter permanecido.");
    }

  } catch (error) {
    console.error("❌ Erro fatal:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
