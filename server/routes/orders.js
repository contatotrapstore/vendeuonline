import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { supabase } from "../lib/supabase-client.js";
import { protectRoute } from "../middleware/security.js";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger.js";
import { normalizePagination, createPaginatedResponse, applyPagination, applySorting } from "../lib/pagination.js";

const router = express.Router();

// Middleware de autenticação
// Middleware removido - usando middleware centralizado

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
            images:ProductImage(url, alt, position)
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
    if (user.type === "BUYER") {
      // Buscar o buyerId a partir do userId
      let { data: buyer, error: buyerError } = await supabase
        .from("buyers")
        .select("id")
        .eq("userId", user.id)
        .single();

      // Se buyer não existir, criar automaticamente
      if (buyerError || !buyer) {
        logger.info(`📝 Buyer não encontrado, criando automaticamente para userId: ${user.id}`);

        const { data: newBuyer, error: createError } = await supabase
          .from("buyers")
          .insert({
            userId: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createError || !newBuyer) {
          logger.error("❌ Erro ao criar buyer:", createError);
          logger.error("🔍 Detalhes:", { userId: user.id, error: createError?.message });

          // Retornar array vazio com mensagem de erro clara
          return res.status(500).json({
            success: false,
            error: "Erro ao criar perfil de comprador. Por favor, contate o suporte.",
            details: createError?.message,
            orders: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          });
        }

        buyer = newBuyer;
        logger.info(`✅ Buyer criado com sucesso: ${buyer.id}`);
      }

      query = query.eq("buyerId", buyer.id);
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
                  alt: img.alt || "",
                  position: img.position || 0,
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
    logger.error("Erro ao buscar pedidos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar pedidos",
      details: error.message,
      code: "DATABASE_ERROR",
    });
  }
});

// GET /api/orders/:id - Buscar detalhes de um pedido específico
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    logger.info("🔍 Buscando pedido:", id, "usuário:", user.id);

    let query = supabase
      .from("Order")
      .select(
        `
        *,
        buyers!inner(
          users!inner(name, email)
        ),
        stores!inner(name, slug),
        OrderItem(
          id,
          quantity,
          price,
          Product!inner(
            id,
            name,
            images:ProductImage(url, alt, position)
          )
        )
      `
      )
      .eq("id", id)
      .single();

    // Verificar permissão: sellers veem seus pedidos, buyers veem os seus
    if (user.type === "SELLER" && req.seller) {
      query = query.eq("sellerId", req.seller.id);
    } else if (user.type === "BUYER") {
      // Buscar o buyerId a partir do userId
      let { data: buyer, error: buyerError } = await supabase
        .from("buyers")
        .select("id")
        .eq("userId", user.id)
        .single();

      // Se buyer não existir, criar automaticamente
      if (buyerError || !buyer) {
        logger.info(`Criando registro de buyer automaticamente para userId: ${user.id}`);

        const { data: newBuyer, error: createError } = await supabase
          .from("buyers")
          .insert({
            userId: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createError || !newBuyer) {
          logger.error("Erro ao criar buyer:", createError);
          return res.status(404).json({
            success: false,
            error: "Erro ao criar perfil de comprador. Por favor, contate o suporte.",
          });
        }

        buyer = newBuyer;
        logger.info(`Buyer criado com sucesso: ${buyer.id}`);
      }

      query = query.eq("buyerId", buyer.id);
    } else if (user.type !== "ADMIN") {
      return res.status(403).json({
        success: false,
        error: "Sem permissão para acessar este pedido",
      });
    }

    const { data: order, error } = await query;

    if (error || !order) {
      logger.error("❌ Erro ao buscar pedido ou pedido não encontrado:", error);
      return res.status(404).json({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    // Formatar dados para o frontend
    const items =
      order.OrderItem?.map((item) => ({
        id: item.id || `item-${Math.random()}`,
        productId: item.Product.id,
        quantity: item.quantity,
        price: parseFloat(item.price),
        subtotal: parseFloat(item.price) * item.quantity,
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

    const formattedOrder = {
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
      total: parseFloat(order.total),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      trackingCode: order.trackingCode,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Informações do comprador
      buyerName: order.buyers?.users?.name || "Cliente",
      buyerEmail: order.buyers?.users?.email || "",
      // Informações da loja
      storeName: order.stores?.name || "Loja",
      storeSlug: order.stores?.slug || "",
      // Endereço de entrega (se disponível)
      shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : null,
    };

    logger.info("✅ Pedido encontrado:", order.id);

    res.json({
      success: true,
      order: formattedOrder,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar pedido:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error.message,
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

    logger.info("🔄 Atualizando status do pedido:", id, "para:", status);

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
      logger.error("❌ Erro ao atualizar status:", error);
      throw error;
    }

    logger.info("✅ Status do pedido atualizado:", id, existingOrder.currentStatus, "→", status);

    res.json({
      success: true,
      message: `Status do pedido atualizado para ${status}`,
      data: order,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar status do pedido:", error);
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
    logger.error("Erro ao adicionar código de rastreamento:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

export default router;
