import express from "express";
import {
  authenticate,
  authenticateUser,
  authenticateSeller,
  authenticateAdmin,
  optionalAuth,
} from "../middleware/auth.js";
import { supabase } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

// Middleware de autenticação
// Middleware removido - usando middleware centralizado

// Middleware removido - usando middleware centralizado

// GET /api/reviews/:productId - Listar reviews de um produto específico
router.get("/:productId", optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId || productId === "undefined") {
      return res.status(400).json({
        success: false,
        error: "Product ID é obrigatório",
      });
    }

    logger.info("⭐ Buscando reviews do produto:", productId);

    // Buscar reviews do produto com dados do usuário
    const { data: reviews, error } = await supabase
      .from("Review")
      .select(
        `
        id,
        rating,
        comment,
        createdAt,
        updatedAt,
        userId,
        productId,
        users:User!inner (
          id,
          name,
          avatar
        )
      `
      )
      .eq("productId", productId)
      .order("createdAt", { ascending: false });

    if (error) {
      logger.error("❌ Erro ao buscar reviews:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Transformar dados para formato esperado
    const transformedReviews = (reviews || []).map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      productId: review.productId,
      user: {
        id: review.users.id,
        name: review.users.name,
        avatar: review.users.avatar,
      },
    }));

    // Calcular estatísticas
    const totalReviews = transformedReviews.length;
    const averageRating =
      totalReviews > 0 ? transformedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;

    logger.info(`✅ ${totalReviews} reviews encontradas (média: ${averageRating.toFixed(1)})`);

    return res.json({
      success: true,
      data: transformedReviews,
      stats: {
        total: totalReviews,
        average: parseFloat(averageRating.toFixed(2)),
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar reviews:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar avaliações",
      details: error.message,
    });
  }
});

// GET /api/reviews - Listar reviews (público com opções de filtro)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { productId, userId, rating, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    logger.info("⭐ Buscando reviews com filtros:", { productId, userId, rating });

    // Construir query base
    let query = supabase
      .from("Review")
      .select(
        `
        id,
        rating,
        comment,
        productId,
        userId,
        createdAt,
        updatedAt,
        users:User!inner (
          id,
          name,
          avatar
        ),
        products:Product!inner (
          id,
          name
        )
      `
      )
      .order("createdAt", { ascending: false });

    // Aplicar filtros
    if (productId) {
      query = query.eq("productId", productId);
    }

    if (userId) {
      query = query.eq("userId", userId);
    }

    if (rating) {
      query = query.eq("rating", parseInt(rating));
    }

    // Aplicar paginação
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: reviews, error } = await query;

    if (error) {
      logger.error("❌ Erro ao buscar reviews:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Transformar dados para formato esperado pelo frontend
    const transformedReviews = (reviews || []).map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      productId: review.productId,
      productName: review.products.name,
      userId: review.userId,
      userName: review.users.name,
      userAvatar: review.users.avatar,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      // Não expor se review está ou não aprovado para público
      canEdit: req.user && req.user.id === review.userId,
    }));

    // Calcular estatísticas se for para um produto específico
    let stats = null;
    if (productId) {
      const { data: allReviews } = await supabase.from("Review").select("rating").eq("productId", productId);

      if (allReviews && allReviews.length > 0) {
        const totalReviews = allReviews.length;
        const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

        // Distribuição por rating
        const distribution = {};
        for (let i = 1; i <= 5; i++) {
          distribution[i] = allReviews.filter((r) => r.rating === i).length;
        }

        stats = {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          distribution,
        };
      }
    }

    logger.info(`✅ ${transformedReviews.length} reviews encontrados`);

    return res.json({
      success: true,
      data: transformedReviews,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transformedReviews.length,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar reviews:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar reviews",
      details: error.message,
    });
  }
});

// POST /api/reviews - Criar novo review (requer autenticação)
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({
        success: false,
        error: "Product ID e rating são obrigatórios",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "Rating deve ser entre 1 e 5",
      });
    }

    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Comentário não pode ter mais de 1000 caracteres",
      });
    }

    logger.info("⭐ Criando review:", { productId, rating, userId: req.user.id });

    // Verificar se o produto existe
    const { data: product, error: productError } = await supabase
      .from("Product")
      .select("id, name, isActive")
      .eq("id", productId)
      .eq("isActive", true)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado ou não está ativo",
      });
    }

    // Verificar se usuário já fez review deste produto
    const { data: existingReview, error: existingError } = await supabase
      .from("Review")
      .select("id")
      .eq("userId", req.user.id)
      .eq("productId", productId)
      .single();

    if (existingReview) {
      return res.status(409).json({
        success: false,
        error: "Você já avaliou este produto",
      });
    }

    // Comentado temporariamente - verificação de compra prévia
    // const { data: orderItem } = await supabase
    //   .from("OrderItem")
    //   .select(
    //     `
    //     id,
    //     orders:Order!inner (
    //       id,
    //       userId,
    //       status
    //     )
    //   `
    //   )
    //   .eq("productId", productId)
    //   .eq("orders.userId", req.user.id)
    //   .eq("orders.status", "DELIVERED")
    //   .single();

    // if (!orderItem) {
    //   return res.status(403).json({
    //     success: false,
    //     error: "Você só pode avaliar produtos que já comprou e recebeu",
    //   });
    // }

    // Criar review
    const { data: review, error: insertError } = await supabase
      .from("Review")
      .insert({
        userId: req.user.id,
        productId: productId,
        rating: parseInt(rating),
        comment: comment || null,
      })
      .select()
      .single();

    if (insertError) {
      logger.error("❌ Erro ao criar review:", insertError);
      throw new Error(`Erro ao criar: ${insertError.message}`);
    }

    logger.info("✅ Review criado:", review.id);

    return res.status(201).json({
      success: true,
      message: `Review para ${product.name} criado com sucesso.`,
      data: review,
    });
  } catch (error) {
    logger.error("❌ Erro ao criar review:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar review",
      details: error.message,
    });
  }
});

// PUT /api/reviews/:id - Atualizar review (apenas próprio review)
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        error: "Rating deve ser entre 1 e 5",
      });
    }

    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Comentário não pode ter mais de 1000 caracteres",
      });
    }

    logger.info("📝 Atualizando review:", id, "usuário:", req.user.id);

    // Verificar se review existe e pertence ao usuário
    const { data: review, error: reviewError } = await supabase
      .from("Review")
      .select("id, userId, productId")
      .eq("id", id)
      .eq("userId", req.user.id)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({
        success: false,
        error: "Review não encontrado ou você não tem permissão para editá-lo",
      });
    }

    // Construir objeto de atualização
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (rating !== undefined) updateData.rating = parseInt(rating);
    if (comment !== undefined) updateData.comment = comment;

    // Atualizar review
    const { data: updatedReview, error: updateError } = await supabase
      .from("Review")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("❌ Erro ao atualizar review:", updateError);
      throw new Error(`Erro ao atualizar: ${updateError.message}`);
    }

    logger.info("✅ Review atualizado:", updatedReview.id);

    const message = "Review atualizado com sucesso";

    return res.json({
      success: true,
      message,
      data: updatedReview,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar review:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar review",
      details: error.message,
    });
  }
});

// DELETE /api/reviews/:id - Deletar review (apenas próprio review)
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("🗑️ Deletando review:", id, "usuário:", req.user.id);

    // Verificar se review existe e pertence ao usuário
    const { data: review, error: reviewError } = await supabase
      .from("Review")
      .select("id, userId")
      .eq("id", id)
      .eq("userId", req.user.id)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({
        success: false,
        error: "Review não encontrado ou você não tem permissão para deletá-lo",
      });
    }

    // Deletar review
    const { error: deleteError } = await supabase.from("Review").delete().eq("id", id).eq("userId", req.user.id);

    if (deleteError) {
      logger.error("❌ Erro ao deletar review:", deleteError);
      throw new Error(`Erro ao deletar: ${deleteError.message}`);
    }

    logger.info("✅ Review deletado:", id);

    return res.json({
      success: true,
      message: "Review deletado com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao deletar review:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao deletar review",
      details: error.message,
    });
  }
});

// GET /api/reviews/my - Buscar reviews do usuário logado
router.get("/my", authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    logger.info("👤 Buscando reviews do usuário:", req.user.id);

    const { data: reviews, error } = await supabase
      .from("Review")
      .select(
        `
        id,
        rating,
        comment,
        productId,
        createdAt,
        updatedAt,
        products:Product!inner (
          id,
          name,
          images:ProductImage (
            id,
            url,
            position
          )
        )
      `
      )
      .eq("userId", req.user.id)
      .order("createdAt", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      logger.error("❌ Erro ao buscar reviews do usuário:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Transformar dados
    const transformedReviews = (reviews || []).map((review) => {
      const product = review.products;
      const mainImage = product.images?.find((img) => img.position === 0) || product.images?.[0];

      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        productId: review.productId,
        productName: product.name,
        productImage: mainImage?.url || "/placeholder-product.jpg",
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      };
    });

    logger.info(`✅ ${transformedReviews.length} reviews do usuário encontrados`);

    return res.json({
      success: true,
      data: transformedReviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transformedReviews.length,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar reviews do usuário:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar seus reviews",
      details: error.message,
    });
  }
});

export default router;
