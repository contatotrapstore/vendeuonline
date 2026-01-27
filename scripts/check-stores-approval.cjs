/**
 * Script de Diagnóstico - Verificar Estado de Stores no Banco
 *
 * Propósito: Investigar bug de stores aprovadas não aparecendo na home
 * Data: 03/11/2025
 *
 * Execução: node scripts/check-stores-approval.cjs
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStoresApproval() {
  console.log("🔍 DIAGNÓSTICO: Estado das Stores no Banco\n");
  console.log("=" .repeat(70));

  try {
    // Query todas as stores
    const { data: stores, error } = await supabase
      .from("stores")
      .select("id, name, slug, approval_status, isActive, productCount, createdAt")
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("❌ Erro ao buscar stores:", error);
      return;
    }

    // Estatísticas gerais
    console.log("\n📊 ESTATÍSTICAS GERAIS:");
    console.log(`   Total de stores: ${stores.length}`);

    // Agrupar por approval_status
    const byStatus = stores.reduce((acc, store) => {
      acc[store.approval_status] = (acc[store.approval_status] || 0) + 1;
      return acc;
    }, {});

    console.log("\n📋 POR STATUS DE APROVAÇÃO:");
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Stores ativas vs inativas
    const active = stores.filter((s) => s.isActive).length;
    const inactive = stores.filter((s) => !s.isActive).length;
    console.log("\n🔌 POR ESTADO ATIVO:");
    console.log(`   isActive=true: ${active}`);
    console.log(`   isActive=false: ${inactive}`);

    // Stores com/sem produtos
    const withProducts = stores.filter((s) => s.productCount > 0).length;
    const withoutProducts = stores.filter((s) => s.productCount === 0).length;
    console.log("\n📦 POR CONTAGEM DE PRODUTOS:");
    console.log(`   productCount > 0: ${withProducts}`);
    console.log(`   productCount = 0: ${withoutProducts}`);

    // Stores sem slug
    const withoutSlug = stores.filter((s) => !s.slug).length;
    console.log("\n🔗 SLUGS:");
    console.log(`   Com slug: ${stores.length - withoutSlug}`);
    console.log(`   Sem slug: ${withoutSlug}`);

    // Stores que DEVERIAM aparecer na home
    const shouldAppear = stores.filter(
      (s) =>
        s.isActive &&
        s.approval_status === "approved" &&
        s.productCount > 0
    ).length;

    console.log("\n✅ STORES QUE APARECEM NA HOME (filtros backend):");
    console.log(`   isActive=true AND approval_status='approved' AND productCount>0: ${shouldAppear}`);

    // Stores aprovadas MAS não aparecem (por causa de productCount=0)
    const approvedButHidden = stores.filter(
      (s) =>
        s.isActive &&
        s.approval_status === "approved" &&
        s.productCount === 0
    );

    if (approvedButHidden.length > 0) {
      console.log("\n⚠️  STORES APROVADAS MAS OCULTAS (productCount=0):");
      approvedButHidden.forEach((store) => {
        console.log(`   - ${store.name} (ID: ${store.id.substring(0, 8)}...)`);
      });
    }

    // Detalhes de cada store
    console.log("\n" + "=".repeat(70));
    console.log("\n📋 DETALHES DE CADA STORE:\n");

    stores.forEach((store, index) => {
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
        if (store.productCount === 0) reasons.push("productCount=0");
        console.log(`   Razão: ${reasons.join(", ")}`);
      }

      console.log("");
    });

    // Validação de schema (uppercase vs lowercase)
    console.log("=".repeat(70));
    console.log("\n🔍 VALIDAÇÃO DE SCHEMA:\n");

    const uniqueStatuses = [...new Set(stores.map((s) => s.approval_status))];
    console.log(`   Valores únicos de approval_status: ${uniqueStatuses.join(", ")}`);

    // Verificar se é uppercase ou lowercase
    const hasUppercase = uniqueStatuses.some((s) => s === s.toUpperCase());
    const hasLowercase = uniqueStatuses.some((s) => s === s.toLowerCase());

    if (hasUppercase && !hasLowercase) {
      console.log("   ✅ Schema usa UPPERCASE (ex: APPROVED)");
    } else if (hasLowercase && !hasUppercase) {
      console.log("   ✅ Schema usa lowercase (ex: approved)");
    } else {
      console.log("   ⚠️  Schema MISTO (uppercase + lowercase)");
    }

    console.log("\n" + "=".repeat(70));
    console.log("\n✅ Diagnóstico concluído!\n");
  } catch (error) {
    console.error("❌ Erro no diagnóstico:", error);
  }
}

checkStoresApproval();
