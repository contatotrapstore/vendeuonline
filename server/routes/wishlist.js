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

// GET /api/wishlist - Buscar wishlist do usuário
router.get("/", optionalAuth, async (req, res) => {
  try {
    // Se não está autenticado, retornar wishlist vazia
    if (!req.user) {
      return res.json({
        success: true,
        data: [],
        message: "Faça login para ver sua lista de desejos",
      });
    }

    logger.info("💝 Buscando wishlist para usuário:", req.user.id);

    // Buscar wishlist real do Supabase com dados dos produtos (sem relacionamento Store)
    const { data: wishlistItems, error } = await supabase
      .from("Wishlist")
      .select(
        `
        id,
        productId,
        createdAt,
        products:Product!inner (
          id,
          name,
          price,
          comparePrice,
          categoryId,
          isActive,
          images:ProductImage (
            id,
            url,
            position
          )
        )
      `
      )
      .eq("userId", req.user.id)
      .eq("products.isActive", true)
      .order("createdAt", { ascending: false });

    if (error) {
      logger.error("❌ Erro ao buscar wishlist:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Transformar dados para formato esperado pelo frontend (sem store)
    const transformedWishlist = (wishlistItems || []).map((item) => {
      const product = item.products;
      const mainImage = product.images?.find((img) => img.position === 0) || product.images?.[0];

      return {
        id: item.id,
        productId: item.productId,
        addedAt: item.createdAt,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          comparePrice: product.comparePrice,
          categoryId: product.categoryId,
          storeName: "Loja Vendeu Online", // Nome genérico temporário
          storeId: "store-placeholder",
          imageUrl: mainImage?.url || "/placeholder-product.jpg",
        },
      };
    });

    logger.info(`✅ ${transformedWishlist.length} itens na wishlist encontrados`);

    return res.json({
      success: true,
      data: transformedWishlist,
      count: transformedWishlist.length,
      items: transformedWishlist, // Add items field for compatibility
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar lista de desejos",
      details: error.message,
    });
  }
});

// POST /api/wishlist - Adicionar item à wishlist
router.post("/", authenticateUser, async (req, res) => {
  try {
    // Aceitar tanto 'productId' quanto 'id'
    const productId = req.body.productId || req.body.id;

    if (!productId && !req.body.id) {
      return res.status(400).json({
        success: false,
        error: "ID do produto é obrigatório",
      });
    }

    logger.info("💝 Adicionando produto à wishlist:", productId, "usuário:", req.user.id);

    // Verificar se o produto existe e está ativo
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

    // Verificar se já está na wishlist
    const { data: existingItem, error: existingError } = await supabase
      .from("Wishlist")
      .select("id")
      .eq("userId", req.user.id)
      .eq("productId", productId)
      .single();

    if (existingItem) {
      return res.status(409).json({
        success: false,
        error: "Produto já está na lista de desejos",
      });
    }

    // Adicionar à wishlist
    const { data: wishlistItem, error: insertError } = await supabase
      .from("Wishlist")
      .insert({
        userId: req.user.id,
        productId: productId,
      })
      .select()
      .single();

    if (insertError) {
      logger.error("❌ Erro ao adicionar à wishlist:", insertError);
      throw new Error(`Erro ao adicionar: ${insertError.message}`);
    }

    logger.info("✅ Produto adicionado à wishlist:", wishlistItem.id);

    return res.json({
      success: true,
      message: `${product.name} foi adicionado à sua lista de desejos`,
      data: wishlistItem,
    });
  } catch (error) {
    logger.error("❌ Erro ao adicionar à wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao adicionar produto à lista de desejos",
      details: error.message,
    });
  }
});

// DELETE /api/wishlist/:productId - Remover item da wishlist
router.delete("/:productId", authenticateUser, async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "ID do produto é obrigatório",
      });
    }

    logger.info("💔 Removendo produto da wishlist:", productId, "usuário:", req.user.id);

    // Remover da wishlist
    const { data: deletedItem, error } = await supabase
      .from("Wishlist")
      .delete()
      .eq("userId", req.user.id)
      .eq("productId", productId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Item não encontrado na lista de desejos",
        });
      }
      logger.error("❌ Erro ao remover da wishlist:", error);
      throw new Error(`Erro ao remover: ${error.message}`);
    }

    logger.info("✅ Produto removido da wishlist:", deletedItem.id);

    return res.json({
      success: true,
      message: "Produto removido da lista de desejos",
      data: deletedItem,
    });
  } catch (error) {
    logger.error("❌ Erro ao remover da wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover produto da lista de desejos",
      details: error.message,
    });
  }
});

// POST /api/wishlist/toggle - Alternar item na wishlist (adicionar/remover)
router.post("/toggle", authenticateUser, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "ID do produto é obrigatório",
      });
    }

    logger.info("🔄 Alternando produto na wishlist:", productId, "usuário:", req.user.id);

    // Verificar se já está na wishlist
    const { data: existingItem, error: checkError } = await supabase
      .from("Wishlist")
      .select("id")
      .eq("userId", req.user.id)
      .eq("productId", productId)
      .single();

    if (existingItem) {
      // Remover da wishlist
      const { error: deleteError } = await supabase.from("Wishlist").delete().eq("id", existingItem.id);

      if (deleteError) {
        throw new Error(`Erro ao remover: ${deleteError.message}`);
      }

      logger.info("💔 Produto removido da wishlist");

      return res.json({
        success: true,
        action: "removed",
        message: "Produto removido da lista de desejos",
        inWishlist: false,
      });
    } else {
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

      // Adicionar à wishlist
      const { data: newItem, error: insertError } = await supabase
        .from("Wishlist")
        .insert({
          userId: req.user.id,
          productId: productId,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Erro ao adicionar: ${insertError.message}`);
      }

      logger.info("💝 Produto adicionado à wishlist");

      return res.json({
        success: true,
        action: "added",
        message: `${product.name} foi adicionado à sua lista de desejos`,
        inWishlist: true,
        data: newItem,
      });
    }
  } catch (error) {
    logger.error("❌ Erro ao alternar wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao alterar lista de desejos",
      details: error.message,
    });
  }
});

// GET /api/wishlist/check/:productId - Verificar se produto está na wishlist
router.get("/check/:productId", optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    if (!req.user) {
      return res.json({
        success: true,
        inWishlist: false,
        message: "Usuário não autenticado",
      });
    }

    const { data: item, error } = await supabase
      .from("Wishlist")
      .select("id")
      .eq("userId", req.user.id)
      .eq("productId", productId)
      .single();

    return res.json({
      success: true,
      inWishlist: !!item,
      itemId: item?.id || null,
    });
  } catch (error) {
    logger.error("❌ Erro ao verificar wishlist:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao verificar lista de desejos",
      details: error.message,
    });
  }

  const { productId } = req.params;

  try {
    // Buscar o buyer atual
    const { data: buyer, error: buyerError } = await supabase
      .from("buyers")
      .select("id")
      .eq("userId", req.user.id)
      .single();

    if (buyerError || !buyer) {
      return res.status(404).json({
        success: false,
        error: "Buyer não encontrado",
      });
    }

    // Remover produto da wishlist
    const { error: deleteError } = await supabase
      .from("wishlists")
      .delete()
      .eq("buyerId", buyer.id)
      .eq("productId", productId);

    if (deleteError) {
      logger.error("❌ Erro ao remover da wishlist:", deleteError);
      return res.status(500).json({
        success: false,
        error: "Erro ao remover produto da wishlist",
      });
    }

    return res.json({
      success: true,
      message: "Produto removido da wishlist",
      productId,
    });
  } catch (error) {
    logger.error("❌ Erro ao remover da wishlist:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

export default router;
