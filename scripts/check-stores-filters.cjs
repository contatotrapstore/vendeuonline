/**
 * Script de Diagnóstico - Verificar Por Que Stores Não Aparecem
 *
 * Propósito: Investigar filtros aplicados em GET /api/stores
 * Data: 03/11/2025
 *
 * Execução: node scripts/check-stores-filters.cjs
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStoresFilters() {
  console.log("🔍 DIAGNÓSTICO: Por Que Stores Não Aparecem na Home\n");
  console.log("=".repeat(70));

  try {
    // Query 1: Total de stores
    console.log("\n📊 QUERY 1: Total de Stores no Banco");
    const { count: totalStores, error: error1 } = await supabase
      .from("stores")
      .select("*", { count: "exact", head: true });

    if (error1) {
      console.error("❌ Erro:", error1);
      return;
    }

    console.log(`   Total de stores: ${totalStores}`);

    if (totalStores === 0) {
      console.log("\n⚠️  PROBLEMA IDENTIFICADO: Não há stores no banco!");
      console.log("   Solução: Criar stores primeiro antes de testar filtros.");
      return;
    }

    // Query 2: Stores por approval_status
    console.log("\n📊 QUERY 2: Stores por Approval Status");
    const { data: storesByStatus, error: error2 } = await supabase
      .from("stores")
      .select("approval_status");

    if (error2) {
      console.error("❌ Erro:", error2);
      return;
    }

    const statusCounts = storesByStatus.reduce((acc, store) => {
      acc[store.approval_status] = (acc[store.approval_status] || 0) + 1;
      return acc;
    }, {});

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Query 3: Stores com isActive = true
    console.log("\n📊 QUERY 3: Stores Ativas");
    const { count: activeStores, error: error3 } = await supabase
      .from("stores")
      .select("*", { count: "exact", head: true })
      .eq("isActive", true);

    if (error3) {
      console.error("❌ Erro:", error3);
      return;
    }

    console.log(`   isActive = true: ${activeStores}`);
    console.log(`   isActive = false: ${totalStores - activeStores}`);

    // Query 4: Stores com productCount > 0
    console.log("\n📊 QUERY 4: Stores com Produtos");
    const { count: storesWithProducts, error: error4 } = await supabase
      .from("stores")
      .select("*", { count: "exact", head: true })
      .gt("productCount", 0);

    if (error4) {
      console.error("❌ Erro:", error4);
      return;
    }

    console.log(`   productCount > 0: ${storesWithProducts}`);
    console.log(`   productCount = 0: ${totalStores - storesWithProducts}`);

    // Query 5: Stores que PASSAM em TODOS os filtros (aparecem na home)
    console.log("\n📊 QUERY 5: Stores que APARECEM na Home (filtros backend)");
    console.log("   Filtros aplicados:");
    console.log("   1. isActive = true");
    console.log("   2. approval_status = 'approved'");
    console.log("   3. productCount > 0");

    const { count: visibleStores, error: error5 } = await supabase
      .from("stores")
      .select("*", { count: "exact", head: true })
      .eq("isActive", true)
      .eq("approval_status", "approved")
      .gt("productCount", 0);

    if (error5) {
      console.error("❌ Erro:", error5);
      return;
    }

    console.log(`\n   ✅ Stores VISÍVEIS (passam nos 3 filtros): ${visibleStores}`);

    // Query 6: Stores que FALHAM apenas por productCount = 0
    console.log("\n📊 QUERY 6: Stores BLOQUEADAS por productCount = 0");
    const { data: blockedStores, error: error6 } = await supabase
      .from("stores")
      .select("id, name, approval_status, isActive, productCount")
      .eq("isActive", true)
      .eq("approval_status", "approved")
      .eq("productCount", 0);

    if (error6) {
      console.error("❌ Erro:", error6);
      return;
    }

    console.log(`   Stores bloqueadas APENAS por productCount=0: ${blockedStores.length}`);

    if (blockedStores.length > 0) {
      console.log("\n   📋 Detalhes das stores bloqueadas:");
      blockedStores.forEach((store, index) => {
        console.log(`   ${index + 1}. ${store.name}`);
        console.log(`      ID: ${store.id}`);
        console.log(`      approval_status: ${store.approval_status} ✅`);
        console.log(`      isActive: ${store.isActive} ✅`);
        console.log(`      productCount: ${store.productCount} ❌ BLOQUEADO`);
        console.log("");
      });
    }

    // Query 7: Listar TODAS as stores (detalhes completos)
    console.log("\n" + "=".repeat(70));
    console.log("\n📋 QUERY 7: Todas as Stores (Detalhes Completos)\n");

    const { data: allStores, error: error7 } = await supabase
      .from("stores")
      .select("id, name, slug, approval_status, isActive, productCount, createdAt")
      .order("createdAt", { ascending: false })
      .limit(10);

    if (error7) {
      console.error("❌ Erro:", error7);
      return;
    }

    allStores.forEach((store, index) => {
      console.log(`${index + 1}. ${store.name}`);
      console.log(`   ID: ${store.id}`);
      console.log(`   Slug: ${store.slug || "❌ SEM SLUG"}`);
      console.log(`   Approval Status: ${store.approval_status}`);
      console.log(`   isActive: ${store.isActive}`);
      console.log(`   Product Count: ${store.productCount}`);
      console.log(`   Criada em: ${new Date(store.createdAt).toLocaleString("pt-BR")}`);

      // Indicador de visibilidade
      const visible =
        store.isActive &&
        store.approval_status === "approved" &&
        store.productCount > 0;

      console.log(`   Visível na Home: ${visible ? "✅ SIM" : "❌ NÃO"}`);

      if (!visible) {
        const reasons = [];
        if (!store.isActive) reasons.push("isActive=false");
        if (store.approval_status !== "approved")
          reasons.push(`status=${store.approval_status}`);
        if (store.productCount === 0) reasons.push("productCount=0 ⚠️ BLOQUEADO");
        console.log(`   Razão: ${reasons.join(", ")}`);
      }

      console.log("");
    });

    // Diagnóstico final
    console.log("=".repeat(70));
    console.log("\n🎯 DIAGNÓSTICO FINAL:\n");

    if (visibleStores === 0 && blockedStores.length > 0) {
      console.log("❌ PROBLEMA CONFIRMADO:");
      console.log(`   - ${blockedStores.length} store(s) aprovada(s) e ativa(s)`);
      console.log("   - MAS bloqueada(s) por productCount = 0");
      console.log("   - Filtro .gt('productCount', 0) impede stores vazias");
      console.log("\n✅ SOLUÇÃO RECOMENDADA:");
      console.log("   1. REMOVER filtro productCount > 0 de GET /api/stores");
      console.log("   2. Permitir stores aparecerem mesmo sem produtos");
      console.log("   3. Melhor UX: vendedor cria loja → é aprovada → aparece na home");
      console.log("\n📝 ARQUIVO A MODIFICAR:");
      console.log("   server/routes/stores.js - linha 130");
      console.log("   REMOVER: .gt('productCount', 0);");
    } else if (visibleStores > 0) {
      console.log(`✅ ${visibleStores} store(s) VISÍVEL(EIS) na home`);
      console.log("   Problema pode ser cache frontend ou deploy não aplicado");
      console.log("\n📝 VERIFICAR:");
      console.log("   1. Deploy aplicado? (commit 58ad724)");
      console.log("   2. Cache frontend expirou? (aguardar 30s)");
      console.log("   3. Hard refresh no browser? (Ctrl+Shift+R)");
    } else {
      console.log("⚠️  Nenhuma store atende aos critérios:");
      console.log("   - isActive = true");
      console.log("   - approval_status = 'approved'");
      console.log("   - productCount > 0");
      console.log("\n📝 AÇÕES POSSÍVEIS:");
      console.log("   1. Admin aprovar stores pendentes");
      console.log("   2. Ativar stores inativas");
      console.log("   3. Adicionar produtos às stores vazias");
      console.log("   4. OU remover filtro productCount (recomendado)");
    }

    console.log("\n" + "=".repeat(70));
    console.log("\n✅ Diagnóstico concluído!\n");
  } catch (error) {
    console.error("❌ Erro no diagnóstico:", error);
  }
}

checkStoresFilters();
