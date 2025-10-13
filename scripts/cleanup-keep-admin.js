#!/usr/bin/env node

/**
 * 🧹 SCRIPT DE LIMPEZA - MANTENDO APENAS ADMIN
 *
 * Remove todos os dados de teste (sellers, buyers, produtos, lojas)
 * Mantém apenas o administrador principal
 *
 * Admin preservado: admin@vendeuonline.com.br
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: Variáveis SUPABASE não configuradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ID do admin que deve ser preservado
const ADMIN_ID = "de9592b5-edd2-4f2f-8f7d-3dcc1e0333b8";
const ADMIN_EMAIL = "admin@vendeuonline.com.br";

async function cleanup() {
  try {
    console.log("🧹 LIMPEZA DE DADOS DE TESTE");
    console.log("============================");
    console.log(`✅ Preservando admin: ${ADMIN_EMAIL} (ID: ${ADMIN_ID})`);
    console.log("");

    // 1. Buscar todos os sellers para deletar suas lojas e produtos
    console.log("🔍 Buscando sellers...");
    const { data: sellers, error: sellersError } = await supabase
      .from("Seller")
      .select("id, userId");

    if (sellersError) {
      console.error("❌ Erro ao buscar sellers:", sellersError.message);
    } else {
      console.log(`   Encontrados: ${sellers?.length || 0} sellers`);

      // 2. Para cada seller, deletar produtos e lojas
      for (const seller of sellers || []) {
        console.log(`\n   🔹 Processando seller: ${seller.id}`);

        // Deletar produtos do seller
        const { data: stores } = await supabase
          .from("Store")
          .select("id")
          .eq("sellerId", seller.id);

        for (const store of stores || []) {
          // Deletar especificações de produtos
          const { data: products } = await supabase
            .from("Product")
            .select("id")
            .eq("storeId", store.id);

          for (const product of products || []) {
            // Deletar ProductSpecification
            await supabase
              .from("ProductSpecification")
              .delete()
              .eq("productId", product.id);

            // Deletar ProductImage
            await supabase
              .from("ProductImage")
              .delete()
              .eq("productId", product.id);
          }

          // Deletar produtos da loja
          const { error: prodError } = await supabase
            .from("Product")
            .delete()
            .eq("storeId", store.id);

          if (!prodError) {
            console.log(`      ✅ Produtos da loja ${store.id} deletados`);
          }
        }

        // Deletar lojas do seller
        const { error: storeError } = await supabase
          .from("Store")
          .delete()
          .eq("sellerId", seller.id);

        if (!storeError) {
          console.log(`      ✅ Lojas do seller ${seller.id} deletadas`);
        }

        // Deletar o seller
        const { error: sellerError } = await supabase
          .from("Seller")
          .delete()
          .eq("id", seller.id);

        if (!sellerError) {
          console.log(`      ✅ Seller ${seller.id} deletado`);
        }
      }
    }

    // 3. Deletar buyers
    console.log("\n🔍 Deletando buyers...");
    const { data: buyers, error: buyersError } = await supabase
      .from("Buyer")
      .select("id");

    if (!buyersError) {
      console.log(`   Encontrados: ${buyers?.length || 0} buyers`);

      const { error: deleteBuyersError } = await supabase
        .from("Buyer")
        .delete()
        .neq("id", ""); // Deleta todos

      if (!deleteBuyersError) {
        console.log(`   ✅ Todos os buyers deletados`);
      }
    }

    // 4. Deletar usuários que não são o admin
    console.log("\n🔍 Deletando usuários de teste...");
    const { data: users, error: usersError } = await supabase
      .from("User")
      .select("id, email, type")
      .neq("id", ADMIN_ID); // Exclui o admin

    if (!usersError) {
      console.log(`   Encontrados: ${users?.length || 0} usuários para deletar`);

      for (const user of users || []) {
        const { error: deleteUserError } = await supabase
          .from("User")
          .delete()
          .eq("id", user.id);

        if (!deleteUserError) {
          console.log(`   ✅ Usuário deletado: ${user.email} (${user.type})`);
        }
      }
    }

    // 5. Deletar orders órfãos (se houver)
    console.log("\n🔍 Limpando orders órfãos...");
    const { data: orders } = await supabase
      .from("Order")
      .select("id");

    if (orders && orders.length > 0) {
      // Deletar order items primeiro
      for (const order of orders) {
        await supabase
          .from("OrderItem")
          .delete()
          .eq("orderId", order.id);
      }

      // Deletar orders
      await supabase
        .from("Order")
        .delete()
        .neq("id", "");

      console.log(`   ✅ ${orders.length} orders deletados`);
    } else {
      console.log(`   ℹ️  Nenhum order encontrado`);
    }

    // 6. Deletar carrinhos, wishlists, notificações
    console.log("\n🔍 Limpando dados auxiliares...");

    await supabase.from("Cart").delete().neq("id", "");
    console.log(`   ✅ Carrinhos limpos`);

    await supabase.from("Wishlist").delete().neq("id", "");
    console.log(`   ✅ Wishlists limpos`);

    await supabase.from("Notification").delete().neq("userId", ADMIN_ID);
    console.log(`   ✅ Notificações limpas (exceto admin)`);

    await supabase.from("Review").delete().neq("id", "");
    console.log(`   ✅ Reviews limpos`);

    // 7. Verificar resultado final
    console.log("\n📊 VERIFICAÇÃO FINAL:");

    const { count: userCount } = await supabase
      .from("User")
      .select("*", { count: "exact", head: true });

    const { count: sellerCount } = await supabase
      .from("Seller")
      .select("*", { count: "exact", head: true });

    const { count: buyerCount } = await supabase
      .from("Buyer")
      .select("*", { count: "exact", head: true });

    const { count: storeCount } = await supabase
      .from("Store")
      .select("*", { count: "exact", head: true });

    const { count: productCount } = await supabase
      .from("Product")
      .select("*", { count: "exact", head: true });

    console.log(`   Usuários restantes: ${userCount || 0} (deve ser 1 - apenas admin)`);
    console.log(`   Sellers restantes: ${sellerCount || 0} (deve ser 0)`);
    console.log(`   Buyers restantes: ${buyerCount || 0} (deve ser 0)`);
    console.log(`   Lojas restantes: ${storeCount || 0} (deve ser 0)`);
    console.log(`   Produtos restantes: ${productCount || 0} (deve ser 0)`);

    console.log("\n✅ LIMPEZA CONCLUÍDA!");
    console.log(`✅ Admin preservado: ${ADMIN_EMAIL}`);
    console.log("✅ Sistema limpo e pronto para testes do cliente");

  } catch (error) {
    console.error("❌ Erro durante limpeza:", error);
    process.exit(1);
  }
}

// Executar
cleanup();
