import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { logger } from "../lib/logger.js";

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error("❌ Variáveis de ambiente necessárias não encontradas");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findProblematicImages() {
  logger.info("🔍 Procurando por imagens problemáticas...");

  try {
    // Buscar produtos que podem ter URLs problemáticas
    const { data: products, error } = await supabase.from("Product").select("id, name, images").limit(50);

    if (error) {
      throw error;
    }

    logger.info(`📦 Analisando ${products.length} produtos...`);

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
              logger.info(`⚠️ Produto problemático encontrado:`, {
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
    logger.error("❌ Erro ao buscar produtos:", error.message);
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

    logger.info(`✅ Imagem corrigida para produto ${productId}`);
    return true;
  } catch (error) {
    logger.error(`❌ Erro ao corrigir produto ${productId}:`, error.message);
    return false;
  }
}

async function main() {
  logger.info("🚀 Iniciando correção de imagens problemáticas...\n");

  const problematicProducts = await findProblematicImages();

  if (problematicProducts.length === 0) {
    logger.info("✅ Nenhuma imagem problemática encontrada!");
    return;
  }

  logger.info(`\n🔧 Corrigindo ${problematicProducts.length} imagens problemáticas...\n`);

  // URL placeholder para substituir imagens problemáticas
  const placeholderUrl = "https://via.placeholder.com/400x300/f3f4f6/6b7280?text=Imagem+Produto";

  let corrected = 0;

  for (const item of problematicProducts) {
    const success = await fixProblematicImage(item.id, item.imageIndex, placeholderUrl);
    if (success) {
      corrected++;
    }
  }

  logger.info(`\n📊 Resumo:`);
  logger.info(`- Produtos problemáticos encontrados: ${problematicProducts.length}`);
  logger.info(`- Imagens corrigidas: ${corrected}`);
  logger.info(`- Falhas: ${problematicProducts.length - corrected}`);

  if (corrected === problematicProducts.length) {
    logger.info("\n✅ Todas as imagens problemáticas foram corrigidas!");
  } else {
    logger.info("\n⚠️ Algumas correções falharam. Verifique os logs acima.");
  }
}

main().catch(console.error);
