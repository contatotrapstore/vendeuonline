import express from "express";
import { authenticate } from "../middleware/auth.js";
import { supabase } from "../lib/supabase-client.js";
import logger from "../lib/logger.js";

const router = express.Router();

/**
 * GET /api/cart
 * Obter carrinho do usuário autenticado
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`🛒 GET /api/cart - Buscando carrinho do usuário ${userId}`);

    // Por enquanto, retornar carrinho vazio estruturado
    // TODO: Em produção, implementar persistência no banco de dados
    res.json({
      success: true,
      items: [],
      subtotal: 0,
      shipping: 0,
      total: 0,
      count: 0,
      message: "Carrinho vazio",
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar carrinho:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar carrinho",
      ...(process.env.NODE_ENV === "development" && { debug: error.message }),
    });
  }
});

/**
 * POST /api/cart
 * Adicionar item ao carrinho
 */
router.post("/", authenticate, async (req, res) => {
  try {
    // Aceitar tanto 'productId' quanto 'id'
    const productId = req.body.productId || req.body.id;
    const { quantity = 1, variantId } = req.body;
    const userId = req.user.id;

    logger.info(`🛒 POST /api/cart - Adicionando produto ${productId} ao carrinho`);

    // Validação básica - aceita tanto 'productId' quanto 'id'
    if (!productId && !req.body.id) {
      return res.status(400).json({
        success: false,
        error: "ID do produto é obrigatório",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Quantidade deve ser maior que zero",
      });
    }

    // Verificar se produto existe
    const { data: product, error: productError } = await supabase
      .from("Product")
      .select("id, name, price, stock")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    // Verificar estoque
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: `Estoque insuficiente. Disponível: ${product.stock}`,
      });
    }

    // TODO: Salvar no banco de dados
    // Por enquanto, apenas retornar sucesso
    logger.info(`✅ Item adicionado ao carrinho: ${product.name}`);

    res.status(201).json({
      success: true,
      message: "Item adicionado ao carrinho com sucesso",
      item: {
        productId,
        quantity,
        variantId,
        product: {
          name: product.name,
          price: product.price,
        },
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao adicionar ao carrinho:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao adicionar ao carrinho",
      ...(process.env.NODE_ENV === "development" && { debug: error.message }),
    });
  }
});

/**
 * PUT /api/cart/:productId
 * Atualizar quantidade de item no carrinho
 */
router.put("/:productId", authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    logger.info(`🛒 PUT /api/cart/${productId} - Atualizando quantidade para ${quantity}`);

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Quantidade deve ser maior que zero",
      });
    }

    // TODO: Atualizar no banco de dados
    res.json({
      success: true,
      message: "Quantidade atualizada com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar carrinho:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar carrinho",
      ...(process.env.NODE_ENV === "development" && { debug: error.message }),
    });
  }
});

/**
 * DELETE /api/cart/:productId
 * Remover item do carrinho
 */
router.delete("/:productId", authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    logger.info(`🛒 DELETE /api/cart/${productId} - Removendo item`);

    // TODO: Remover do banco de dados
    res.json({
      success: true,
      message: "Item removido do carrinho com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao remover do carrinho:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover do carrinho",
      ...(process.env.NODE_ENV === "development" && { debug: error.message }),
    });
  }
});

/**
 * DELETE /api/cart
 * Limpar carrinho
 */
router.delete("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`🛒 DELETE /api/cart - Limpando carrinho do usuário ${userId}`);

    // TODO: Limpar do banco de dados
    res.json({
      success: true,
      message: "Carrinho limpo com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao limpar carrinho:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao limpar carrinho",
      ...(process.env.NODE_ENV === "development" && { debug: error.message }),
    });
  }
});

export default router;
