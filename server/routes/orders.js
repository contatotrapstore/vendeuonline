import express from "express";
import { supabase } from "../lib/supabase-client.js";
import { protectRoute } from "../middleware/security.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware de autenticação
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar dados do usuário
    const { data: user, error } = await supabase
      .from("users")
      .select(
        `
        *,
        sellers(id, storeName, storeSlug, plan, isActive),
        buyers(id, preferences)
      `
      )
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      return res.status(403).json({ error: "Usuário não encontrado" });
    }

    req.user = user;
    req.seller = user.sellers?.[0] || null;
    req.buyer = user.buyers?.[0] || null;

    // Se for seller, adicionar sellerId ao req.user
    if (user.type === "SELLER" && req.seller) {
      req.user.sellerId = req.seller.id;
      // Debug: Seller autenticado
    }

    next();
  } catch (error) {
    console.error("Erro na autenticação:", error);
    res.status(401).json({ error: "Token inválido" });
  }
};

// GET /api/orders - Listar pedidos
router.get("/", authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, storeId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const user = req.user;

    let query = supabase
      .from("Order")
      .select(
        `
        *,
        buyers!inner(
          users!inner(name, email)
        ),
        OrderItem(
          quantity,
          price,
          Product!inner(
            id,
            name,
            images:product_images(url, alt, isMain)
          )
        )
      `
      )
      .order("createdAt", { ascending: false });

    // Filtrar por vendedor se usuário for seller
    if (user.type === "SELLER" && req.seller) {
      query = query.eq("sellerId", req.seller.id);
    }

    // Filtrar por comprador se usuário for buyer
    if (user.type === "BUYER" && req.buyer) {
      query = query.eq("buyerId", req.buyer.id);
    }

    // Filtrar por status se especificado
    if (status && status !== "all") {
      query = query.eq("status", status.toUpperCase());
    }

    // Paginação
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      throw error;
    }

    // Formatar dados para o frontend
    const formattedOrders =
      orders?.map((order) => {
        const items =
          order.OrderItem?.map((item) => ({
            id: item.id || `item-${Math.random()}`,
            productId: item.Product.id,
            quantity: item.quantity,
            price: parseFloat(item.price),
            product: {
              name: item.Product.name,
              images:
                item.Product.images?.map((img) => ({
                  url: img.url,
                  alt: img.alt,
                  isMain: img.isMain,
                })) || [],
            },
          })) || [];

        return {
          id: order.id,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          storeId: order.storeId,
          status: order.status.toLowerCase(),
          items,
          subtotal: parseFloat(order.subtotal || 0),
          shipping: parseFloat(order.shippingCost || 0),
          tax: parseFloat(order.tax || 0),
          discount: parseFloat(order.discount || 0),
          shippingCost: parseFloat(order.shippingCost || 0),
          total: parseFloat(order.total),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          trackingCode: order.trackingCode,
          estimatedDelivery: order.estimatedDelivery,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          buyerName: order.buyers?.users?.name || "Cliente",
          buyerEmail: order.buyers?.users?.email || "",
        };
      }) || [];

    // Calcular total de itens para paginação
    const { count: totalCount } = await supabase.from("Order").select("*", { count: "exact", head: true });

    const totalPages = Math.ceil((totalCount || 0) / parseInt(limit));

    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// PUT /api/orders/:id/status - Atualizar status do pedido
router.put("/:id/status", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório" });
    }

    console.log("🔄 Atualizando status do pedido:", id, "para:", status);

    // Verificar se o pedido existe e se o usuário tem permissão
    const { data: existingOrder, error: fetchError } = await supabase
      .from("Order")
      .select("sellerId, userId, status as currentStatus")
      .eq("id", id)
      .single();

    if (fetchError || !existingOrder) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    // Verificar permissão: seller pode alterar seus pedidos, buyer pode cancelar
    const canUpdate =
      req.user.type === "ADMIN" ||
      (req.user.type === "SELLER" && existingOrder.sellerId === req.user.sellerId) ||
      (req.user.type === "BUYER" && existingOrder.userId === req.user.id && status.toLowerCase() === "cancelled");

    if (!canUpdate) {
      return res.status(403).json({
        error: "Sem permissão para alterar este pedido",
      });
    }

    // Validar transições de status válidas
    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        error: "Status inválido. Valores aceitos: " + validStatuses.join(", "),
      });
    }

    const { data: order, error } = await supabase
      .from("Order")
      .update({
        status: status.toLowerCase(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar status:", error);
      throw error;
    }

    console.log("✅ Status do pedido atualizado:", id, existingOrder.currentStatus, "→", status);

    res.json({
      success: true,
      message: `Status do pedido atualizado para ${status}`,
      data: order,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar status do pedido:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// PUT /api/orders/:id/tracking - Adicionar código de rastreamento
router.put("/:id/tracking", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { trackingCode } = req.body;

    if (!trackingCode) {
      return res.status(400).json({ error: "Código de rastreamento é obrigatório" });
    }

    const { data: order, error } = await supabase
      .from("Order")
      .update({
        trackingCode,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Erro ao adicionar código de rastreamento:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

export default router;
