import express from "express";
import { supabase } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

/**
 * GET /api/stats/platform
 * Retorna estatísticas da plataforma em tempo real
 * - Total de vendedores ativos
 * - Total de anúncios/produtos ativos
 * - Avaliação média da plataforma
 */
router.get("/platform", async (req, res) => {
  try {
    // 1. Buscar total de sellers ativos
    const { count: sellersCount, error: sellersError } = await supabase
      .from("sellers")
      .select("id", { count: "exact", head: true })
      .eq("isActive", true);

    if (sellersError) {
      logger.error("Erro ao contar sellers:", sellersError);
    }

    // 2. Buscar total de produtos APPROVED e ativos
    const { count: productsCount, error: productsError } = await supabase
      .from("Product")
      .select("id", { count: "exact", head: true })
      .eq("isActive", true)
      .eq("approval_status", "APPROVED");

    if (productsError) {
      logger.error("Erro ao contar produtos:", productsError);
    }

    // 3. Calcular avaliação média dos produtos
    const { data: avgRatingData, error: avgRatingError } = await supabase
      .from("Product")
      .select("rating")
      .eq("isActive", true)
      .eq("approval_status", "APPROVED")
      .gt("rating", 0); // Apenas produtos com rating > 0

    if (avgRatingError) {
      logger.error("Erro ao calcular rating médio:", avgRatingError);
    }

    // Calcular média
    let avgRating = 0;
    if (avgRatingData && avgRatingData.length > 0) {
      const sum = avgRatingData.reduce((acc, prod) => acc + (prod.rating || 0), 0);
      avgRating = sum / avgRatingData.length;
    }

    // 4. Retornar estatísticas
    const stats = {
      sellers: sellersCount || 0,
      products: productsCount || 0,
      avgRating: avgRating ? parseFloat(avgRating.toFixed(1)) : 0,
    };

    logger.info("📊 Stats da plataforma:", stats);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar stats da plataforma:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar estatísticas",
    });
  }
});

export default router;
