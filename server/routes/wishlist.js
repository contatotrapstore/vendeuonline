import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase-client.js";

const router = express.Router();

// JWT Secret (deve ser o mesmo usado em auth.js)
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac";

// Middleware de autenticação
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de autenticação necessário" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuário real do Supabase
    const { data: user, error } = await supabase.from("users").select("*").eq("id", decoded.userId).single();

    if (error || !user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    return res.status(401).json({ error: "Token inválido" });
  }
};

// Middleware de autenticação opcional
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuário real do Supabase
    const { data: user, error } = await supabase.from("users").select("*").eq("id", decoded.userId).single();

    if (error || !user) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

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

    console.log("💝 Buscando wishlist para usuário:", req.user.id);

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
          category,
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
      console.error("❌ Erro ao buscar wishlist:", error);
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
          category: product.category,
          storeName: "Loja Vendeu Online", // Nome genérico temporário
          storeId: "store-placeholder",
          imageUrl: mainImage?.url || "/placeholder-product.jpg",
        },
      };
    });

    console.log(`✅ ${transformedWishlist.length} itens na wishlist encontrados`);

    return res.json({
      success: true,
      data: transformedWishlist,
      count: transformedWishlist.length,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar wishlist:", error);
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
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "ID do produto é obrigatório",
      });
    }

    console.log("💝 Adicionando produto à wishlist:", productId, "usuário:", req.user.id);

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
      console.error("❌ Erro ao adicionar à wishlist:", insertError);
      throw new Error(`Erro ao adicionar: ${insertError.message}`);
    }

    console.log("✅ Produto adicionado à wishlist:", wishlistItem.id);

    return res.json({
      success: true,
      message: `${product.name} foi adicionado à sua lista de desejos`,
      data: wishlistItem,
    });
  } catch (error) {
    console.error("❌ Erro ao adicionar à wishlist:", error);
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

    console.log("💔 Removendo produto da wishlist:", productId, "usuário:", req.user.id);

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
      console.error("❌ Erro ao remover da wishlist:", error);
      throw new Error(`Erro ao remover: ${error.message}`);
    }

    console.log("✅ Produto removido da wishlist:", deletedItem.id);

    return res.json({
      success: true,
      message: "Produto removido da lista de desejos",
      data: deletedItem,
    });
  } catch (error) {
    console.error("❌ Erro ao remover da wishlist:", error);
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

    console.log("🔄 Alternando produto na wishlist:", productId, "usuário:", req.user.id);

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

      console.log("💔 Produto removido da wishlist");

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

      console.log("💝 Produto adicionado à wishlist");

      return res.json({
        success: true,
        action: "added",
        message: `${product.name} foi adicionado à sua lista de desejos`,
        inWishlist: true,
        data: newItem,
      });
    }
  } catch (error) {
    console.error("❌ Erro ao alternar wishlist:", error);
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
    console.error("❌ Erro ao verificar wishlist:", error);
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
      console.error("❌ Erro ao remover da wishlist:", deleteError);
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
    console.error("❌ Erro ao remover da wishlist:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

export default router;
