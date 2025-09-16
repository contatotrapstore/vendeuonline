import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variáveis de ambiente necessárias não encontradas");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findProblematicImages() {
  console.log("🔍 Procurando por imagens problemáticas...");

  try {
    // Buscar produtos que podem ter URLs problemáticas
    const { data: products, error } = await supabase.from("Product").select("id, name, images").limit(50);

    if (error) {
      throw error;
    }

    console.log(`📦 Analisando ${products.length} produtos...`);

    const problematicProducts = [];

    for (const product of products) {
      if (product.images && Array.isArray(product.images)) {
        for (let i = 0; i < product.images.length; i++) {
          const imageUrl = product.images[i]?.url || product.images[i];

          // Verificar se é uma URL problemática
          if (typeof imageUrl === "string") {
            if (imageUrl.includes("dell.com") || imageUrl.includes(".psd") || imageUrl.includes("DellContent")) {
              problematicProducts.push({
                id: product.id,
                name: product.name,
                imageIndex: i,
                problematicUrl: imageUrl,
              });
              console.log(`⚠️ Produto problemático encontrado:`, {
                id: product.id,
                name: product.name,
                url: imageUrl,
              });
            }
          }
        }
      }
    }

    return problematicProducts;
  } catch (error) {
    console.error("❌ Erro ao buscar produtos:", error.message);
    return [];
  }
}

async function fixProblematicImage(productId, imageIndex, newImageUrl) {
  try {
    // Buscar o produto atual
    const { data: product, error: fetchError } = await supabase
      .from("Product")
      .select("images")
      .eq("id", productId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Atualizar a imagem problemática
    const updatedImages = [...product.images];
    updatedImages[imageIndex] = {
      url: newImageUrl,
      alt: "Imagem do produto",
      isMain: imageIndex === 0,
    };

    const { error: updateError } = await supabase.from("Product").update({ images: updatedImages }).eq("id", productId);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Imagem corrigida para produto ${productId}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao corrigir produto ${productId}:`, error.message);
    return false;
  }
}

async function main() {
  console.log("🚀 Iniciando correção de imagens problemáticas...\n");

  const problematicProducts = await findProblematicImages();

  if (problematicProducts.length === 0) {
    console.log("✅ Nenhuma imagem problemática encontrada!");
    return;
  }

  console.log(`\n🔧 Corrigindo ${problematicProducts.length} imagens problemáticas...\n`);

  // URL placeholder para substituir imagens problemáticas
  const placeholderUrl = "https://via.placeholder.com/400x300/f3f4f6/6b7280?text=Imagem+Produto";

  let corrected = 0;

  for (const item of problematicProducts) {
    const success = await fixProblematicImage(item.id, item.imageIndex, placeholderUrl);
    if (success) {
      corrected++;
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`- Produtos problemáticos encontrados: ${problematicProducts.length}`);
  console.log(`- Imagens corrigidas: ${corrected}`);
  console.log(`- Falhas: ${problematicProducts.length - corrected}`);

  if (corrected === problematicProducts.length) {
    console.log("\n✅ Todas as imagens problemáticas foram corrigidas!");
  } else {
    console.log("\n⚠️ Algumas correções falharam. Verifique os logs acima.");
  }
}

main().catch(console.error);
