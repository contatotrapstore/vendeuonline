#!/usr/bin/env node

/**
 * 🗑️ LIMPEZA DO BANCO MANTENDO APENAS ADMIN (VERSÃO FINAL)
 */

const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

// Ler .env manualmente
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");

// Parser simples de .env
const env = {};
envContent.split("\n").forEach((line) => {
  line = line.trim();
  if (line && !line.startsWith("#")) {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
    }
  }
});

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("\n🔧 Credenciais carregadas:");
console.log("   URL:", supabaseUrl);
console.log("   Key:", supabaseKey ? `${supabaseKey.substring(0, 30)}...` : "❌ NÃO ENCONTRADA");

if (!supabaseUrl || !supabaseKey) {
  console.error("\n❌ Erro: Variáveis SUPABASE não encontradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
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
      console.error("❌ Erro ao buscar admin:");
      console.error("   Mensagem:", adminError.message);
      console.error("   Detalhes:", JSON.stringify(adminError, null, 2));
      console.error("\n💡 Dica: Verifique se o SUPABASE_SERVICE_ROLE_KEY está correto no .env");
      process.exit(1);
    }

    if (!admins || admins.length === 0) {
      console.error("❌ Nenhum admin encontrado no banco!");
      console.error("   Execute antes: node scripts/create-admin.cjs");
      process.exit(1);
    }

    const admin = admins[0];
    console.log(`✅ Admin identificado: ${admin.email} (ID: ${admin.id})\n`);

    // 2. Tabelas relacionadas (ordem importa para foreign keys)
    const tablesToClean = [
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
      { name: "Subscription", key: "id" },
    ];

    console.log("🧹 Limpando dados relacionados...");
    for (const table of tablesToClean) {
      try {
        const { error } = await supabase.from(table.name).delete().neq(table.key, "");

        if (error) {
          console.log(`   ⚠️  ${table.name}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table.name}`);
        }
      } catch (err) {
        console.log(`   ⚠️  ${table.name}: ${err.message}`);
      }
    }

    // 3. Deletar produtos
    console.log("\n🗑️  Deletando produtos...");
    const { error: prodError } = await supabase.from("Product").delete().neq("id", "");
    if (prodError) {
      console.log(`   ⚠️  ${prodError.message}`);
    } else {
      console.log(`   ✅ Produtos deletados`);
    }

    // 4. Deletar lojas
    console.log("\n🗑️  Deletando lojas...");
    const { error: storeError } = await supabase.from("stores").delete().neq("id", "");
    if (storeError) {
      console.log(`   ⚠️  ${storeError.message}`);
    } else {
      console.log(`   ✅ Lojas deletadas`);
    }

    // 5. Deletar sellers
    console.log("\n🗑️  Deletando sellers...");
    const { error: sellerError } = await supabase.from("sellers").delete().neq("id", "");
    if (sellerError) {
      console.log(`   ⚠️  ${sellerError.message}`);
    } else {
      console.log(`   ✅ Sellers deletados`);
    }

    // 6. Deletar buyers
    console.log("\n🗑️  Deletando buyers...");
    const { error: buyerError } = await supabase.from("buyers").delete().neq("id", "");
    if (buyerError) {
      console.log(`   ⚠️  ${buyerError.message}`);
    } else {
      console.log(`   ✅ Buyers deletados`);
    }

    // 7. Deletar admins extras
    console.log("\n🗑️  Limpando tabela admins (mantendo principal)...");
    const { error: adminTableError } = await supabase.from("admins").delete().neq("userId", admin.id);
    if (adminTableError) {
      console.log(`   ⚠️  ${adminTableError.message}`);
    } else {
      console.log(`   ✅ Admins extras deletados`);
    }

    // 8. Deletar usuários exceto admin
    console.log("\n🗑️  Deletando usuários (mantendo admin)...");
    const { error: userError } = await supabase.from("users").delete().neq("id", admin.id);
    if (userError) {
      console.log(`   ⚠️  ${userError.message}`);
    } else {
      console.log(`   ✅ Usuários deletados (admin preservado)`);
    }

    // 9. Verificação final
    console.log("\n📊 VERIFICAÇÃO FINAL:");

    const checks = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("Product").select("*", { count: "exact", head: true }),
      supabase.from("stores").select("*", { count: "exact", head: true }),
      supabase.from("sellers").select("*", { count: "exact", head: true }),
      supabase.from("buyers").select("*", { count: "exact", head: true }),
      supabase.from("Wishlist").select("*", { count: "exact", head: true }),
      supabase.from("addresses").select("*", { count: "exact", head: true }),
    ]);

    const results = {
      users: checks[0].count || 0,
      products: checks[1].count || 0,
      stores: checks[2].count || 0,
      sellers: checks[3].count || 0,
      buyers: checks[4].count || 0,
      wishlist: checks[5].count || 0,
      addresses: checks[6].count || 0,
    };

    console.log(`   Usuários: ${results.users} (esperado: 1)`);
    console.log(`   Produtos: ${results.products} (esperado: 0)`);
    console.log(`   Lojas: ${results.stores} (esperado: 0)`);
    console.log(`   Sellers: ${results.sellers} (esperado: 0)`);
    console.log(`   Buyers: ${results.buyers} (esperado: 0)`);
    console.log(`   Wishlist: ${results.wishlist} (esperado: 0)`);
    console.log(`   Endereços: ${results.addresses} (esperado: 0)`);

    const isClean =
      results.users === 1 &&
      results.products === 0 &&
      results.stores === 0 &&
      results.sellers === 0 &&
      results.buyers === 0;

    if (isClean) {
      console.log("\n✅ LIMPEZA COMPLETA! Banco resetado com sucesso.");
      console.log(`\n📧 Admin preservado: ${admin.email}`);
      console.log(`🔐 Faça login com as credenciais de admin\n`);
    } else {
      console.log("\n⚠️  Limpeza parcial. Alguns registros permaneceram.");
      console.log("   Verifique os erros acima e execute novamente se necessário.\n");
    }
  } catch (error) {
    console.error("\n❌ Erro fatal:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
