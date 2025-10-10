import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProductStatus() {
  console.log("🔍 Verificando status de aprovação dos produtos...\n");

  const productIds = [
    "product_1759972587148_h7t8m9qan", // Teclado Mecânico RGB
    "product_1759968539277_gsmen7hzu", // Mouse Gamer RGB
    "2ea6b5ff-32f0-4026-b268-bf0ccd012fc4", // Notebook Dell
  ];

  const { data: products, error } = await supabase
    .from("Product")
    .select("id, name, approval_status, isActive, approved_at, rejection_reason")
    .in("id", productIds)
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("❌ Erro ao buscar produtos:", error);
    process.exit(1);
  }

  console.log("📊 Produtos encontrados:\n");
  console.table(
    products.map((p) => ({
      ID: p.id.substring(0, 30) + "...",
      Nome: p.name,
      Status: p.approval_status,
      Ativo: p.isActive ? "Sim" : "Não",
      "Aprovado em": p.approved_at
        ? new Date(p.approved_at).toLocaleString("pt-BR")
        : "N/A",
    }))
  );

  // Identificar produtos que precisam ser aprovados
  const pendingProducts = products.filter(
    (p) => p.approval_status !== "APPROVED"
  );

  if (pendingProducts.length > 0) {
    console.log(
      `\n⚠️  ${pendingProducts.length} produto(s) NÃO aprovado(s):\n`
    );
    pendingProducts.forEach((p) => {
      console.log(`   - ${p.name} (${p.id})`);
      console.log(`     Status: ${p.approval_status}`);
      if (p.rejection_reason) {
        console.log(`     Motivo rejeição: ${p.rejection_reason}`);
      }
    });

    console.log(
      '\n💡 Execute "node scripts/approve-products.js" para aprovar estes produtos.\n'
    );
  } else {
    console.log("\n✅ Todos os produtos estão aprovados!\n");
  }
}

checkProductStatus().catch(console.error);
