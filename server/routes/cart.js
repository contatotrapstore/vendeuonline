import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase-client.js";

const router = express.Router();

// JWT Secret
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

// GET /api/cart - Buscar carrinho do usuário
router.get("/", authenticateUser, async (req, res) => {
  try {
    console.log("🛒 Buscando carrinho para usuário:", req.user.id);

    // Buscar itens do carrinho no Supabase
    const { data: cartItems, error } = await supabase
      .from("Cart")
      .select(
        `
        id,
        productId,
        quantity,
        createdAt,
        updatedAt,
        products:Product!inner (
          id,
          name,
          price,
          comparePrice,
          category,
          isActive,
          stock,
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
      console.error("❌ Erro ao buscar carrinho:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Transformar dados para formato esperado pelo frontend
    const transformedCart = (cartItems || []).map((item) => {
      const product = item.products;
      const mainImage = product.images?.find((img) => img.position === 0) || product.images?.[0];

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        addedAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          comparePrice: product.comparePrice,
          category: product.category,
          stock: product.stock,
          storeName: "Loja Vendeu Online", // Nome genérico temporário
          storeId: "store-placeholder",
          imageUrl: mainImage?.url || "/placeholder-product.jpg",
        },
      };
    });

    // Calcular totais
    const subtotal = transformedCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const shipping = subtotal > 100 ? 0 : 15; // Frete grátis acima de R$ 100
    const total = subtotal + shipping;

    console.log(`✅ ${transformedCart.length} itens no carrinho encontrados`);

    return res.json({
      success: true,
      data: {
        items: transformedCart,
        summary: {
          itemsCount: transformedCart.length,
          totalQuantity: transformedCart.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: subtotal,
          shipping: shipping,
          total: total,
        },
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar carrinho:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar carrinho",
      details: error.message,
    });
  }
});

// POST /api/cart - Adicionar item ao carrinho
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "ID do produto é obrigatório",
      });
    }

    if (quantity <= 0 || quantity > 10) {
      return res.status(400).json({
        success: false,
        error: "Quantidade deve ser entre 1 e 10",
      });
    }

    console.log("🛒 Adicionando produto ao carrinho:", productId, "quantidade:", quantity, "usuário:", req.user.id);

    // Verificar se o produto existe e está ativo
    const { data: product, error: productError } = await supabase
      .from("Product")
      .select("id, name, price, stock, isActive")
      .eq("id", productId)
      .eq("isActive", true)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado ou não está ativo",
      });
    }

    // Verificar estoque disponível
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: `Estoque insuficiente. Disponível: ${product.stock}`,
      });
    }

    // Verificar se já está no carrinho
    const { data: existingItem, error: existingError } = await supabase
      .from("Cart")
      .select("id, quantity")
      .eq("userId", req.user.id)
      .eq("productId", productId)
      .single();

    if (existingItem) {
      // Atualizar quantidade se já existe
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > 10) {
        return res.status(400).json({
          success: false,
          error: "Quantidade máxima de 10 unidades por produto",
        });
      }

      if (product.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          error: `Estoque insuficiente. Disponível: ${product.stock}, no carrinho: ${existingItem.quantity}`,
        });
      }

      const { data: updatedItem, error: updateError } = await supabase
        .from("Cart")
        .update({
          quantity: newQuantity,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Erro ao atualizar carrinho:", updateError);
        throw new Error(`Erro ao atualizar: ${updateError.message}`);
      }

      console.log("✅ Quantidade atualizada no carrinho:", updatedItem.id);

      return res.json({
        success: true,
        message: `Quantidade de ${product.name} atualizada para ${newQuantity}`,
        data: updatedItem,
      });
    } else {
      // Adicionar novo item ao carrinho
      const { data: cartItem, error: insertError } = await supabase
        .from("Cart")
        .insert({
          userId: req.user.id,
          productId: productId,
          quantity: quantity,
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Erro ao adicionar ao carrinho:", insertError);
        throw new Error(`Erro ao adicionar: ${insertError.message}`);
      }

      console.log("✅ Produto adicionado ao carrinho:", cartItem.id);

      return res.json({
        success: true,
        message: `${product.name} foi adicionado ao carrinho`,
        data: cartItem,
      });
    }
  } catch (error) {
    console.error("❌ Erro ao adicionar ao carrinho:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao adicionar produto ao carrinho",
      details: error.message,
    });
  }
});

// PUT /api/cart/:id - Atualizar quantidade de item no carrinho
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0 || quantity > 10) {
      return res.status(400).json({
        success: false,
        error: "Quantidade deve ser entre 1 e 10",
      });
    }

    console.log("🔄 Atualizando quantidade no carrinho:", id, "nova quantidade:", quantity);

    // Verificar se o item existe e pertence ao usuário
    const { data: cartItem, error: cartError } = await supabase
      .from("Cart")
      .select(
        `
        id,
        productId,
        quantity,
        products:Product!inner (
          id,
          name,
          price,
          stock,
          isActive
        )
      `
      )
      .eq("id", id)
      .eq("userId", req.user.id)
      .single();

    if (cartError || !cartItem) {
      return res.status(404).json({
        success: false,
        error: "Item não encontrado no carrinho",
      });
    }

    const product = cartItem.products;

    // Verificar se produto ainda está ativo
    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        error: "Produto não está mais disponível",
      });
    }

    // Verificar estoque disponível
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: `Estoque insuficiente. Disponível: ${product.stock}`,
      });
    }

    // Atualizar quantidade
    const { data: updatedItem, error: updateError } = await supabase
      .from("Cart")
      .update({
        quantity: quantity,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar quantidade:", updateError);
      throw new Error(`Erro ao atualizar: ${updateError.message}`);
    }

    console.log("✅ Quantidade atualizada:", updatedItem.id);

    return res.json({
      success: true,
      message: `Quantidade de ${product.name} atualizada para ${quantity}`,
      data: updatedItem,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar quantidade:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar quantidade no carrinho",
      details: error.message,
    });
  }
});

// DELETE /api/cart/:id - Remover item do carrinho
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🗑️ Removendo item do carrinho:", id, "usuário:", req.user.id);

    // Verificar se o item existe e pertence ao usuário
    const { data: cartItem, error: checkError } = await supabase
      .from("Cart")
      .select(
        `
        id,
        products:Product!inner (name)
      `
      )
      .eq("id", id)
      .eq("userId", req.user.id)
      .single();

    if (checkError || !cartItem) {
      return res.status(404).json({
        success: false,
        error: "Item não encontrado no carrinho",
      });
    }

    // Remover do carrinho
    const { error: deleteError } = await supabase.from("Cart").delete().eq("id", id).eq("userId", req.user.id);

    if (deleteError) {
      console.error("❌ Erro ao remover do carrinho:", deleteError);
      throw new Error(`Erro ao remover: ${deleteError.message}`);
    }

    console.log("✅ Item removido do carrinho:", id);

    return res.json({
      success: true,
      message: `${cartItem.products.name} removido do carrinho`,
    });
  } catch (error) {
    console.error("❌ Erro ao remover do carrinho:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover produto do carrinho",
      details: error.message,
    });
  }
});

// DELETE /api/cart - Limpar carrinho completo
router.delete("/", authenticateUser, async (req, res) => {
  try {
    console.log("🧹 Limpando carrinho para usuário:", req.user.id);

    // Remover todos os itens do carrinho do usuário
    const { error } = await supabase.from("Cart").delete().eq("userId", req.user.id);

    if (error) {
      console.error("❌ Erro ao limpar carrinho:", error);
      throw new Error(`Erro ao limpar: ${error.message}`);
    }

    console.log("✅ Carrinho limpo com sucesso");

    return res.json({
      success: true,
      message: "Carrinho limpo com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao limpar carrinho:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao limpar carrinho",
      details: error.message,
    });
  }
});

export default router;
