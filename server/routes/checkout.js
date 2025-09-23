import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase-client.js";
import { createSubscriptionPayment } from "../lib/asaas.js";

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

// POST /api/checkout - Iniciar processo de checkout
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = "PIX" } = req.body;
    const userId = req.user.id;

    console.log("🛒 Iniciando checkout para usuário:", userId);

    // Validar endereço de entrega
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
      return res.status(400).json({
        success: false,
        error: "Endereço de entrega completo é obrigatório",
        required: ["street", "city", "zipCode", "state"],
      });
    }

    // Buscar itens do carrinho
    const { data: cartItems, error: cartError } = await supabase
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
          isActive,
          sellerId,
          stores:Store!inner (
            id,
            name,
            sellerId
          )
        )
      `
      )
      .eq("userId", userId);

    if (cartError) {
      console.error("❌ Erro ao buscar carrinho:", cartError);
      throw new Error(`Erro ao buscar carrinho: ${cartError.message}`);
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Carrinho está vazio",
      });
    }

    // Validar produtos ativos e estoque
    const invalidItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const product = item.products;

      if (!product.isActive) {
        invalidItems.push(`${product.name} não está mais disponível`);
        continue;
      }

      if (product.stock < item.quantity) {
        invalidItems.push(
          `${product.name} - estoque insuficiente (disponível: ${product.stock}, solicitado: ${item.quantity})`
        );
        continue;
      }

      subtotal += product.price * item.quantity;
    }

    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Alguns itens do carrinho não podem ser processados",
        details: invalidItems,
      });
    }

    // Calcular totais
    const shippingCost = subtotal > 100 ? 0 : 15; // Frete grátis acima de R$ 100
    const tax = 0; // Sem taxa por enquanto
    const total = subtotal + shippingCost + tax;

    // Agrupar itens por seller/loja para criar pedidos separados
    const ordersBySeller = {};

    cartItems.forEach((item) => {
      const sellerId = item.products.sellerId;
      const storeId = item.products.stores.id;

      if (!ordersBySeller[sellerId]) {
        ordersBySeller[sellerId] = {
          sellerId,
          storeId,
          storeName: item.products.stores.name,
          items: [],
          subtotal: 0,
        };
      }

      ordersBySeller[sellerId].items.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.products.price,
        productName: item.products.name,
      });

      ordersBySeller[sellerId].subtotal += item.products.price * item.quantity;
    });

    // Criar pedidos no banco de dados
    const createdOrders = [];

    for (const sellerOrder of Object.values(ordersBySeller)) {
      const orderShippingCost = sellerOrder.subtotal > 100 ? 0 : 15;
      const orderTotal = sellerOrder.subtotal + orderShippingCost;

      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from("Order")
        .insert({
          userId: userId,
          sellerId: sellerOrder.sellerId,
          storeId: sellerOrder.storeId,
          status: "pending",
          subtotal: sellerOrder.subtotal,
          shippingCost: orderShippingCost,
          tax: 0,
          total: orderTotal,
          paymentMethod: paymentMethod,
          paymentStatus: "pending",
          shippingAddress: JSON.stringify(shippingAddress),
        })
        .select()
        .single();

      if (orderError) {
        console.error("❌ Erro ao criar pedido:", orderError);
        throw new Error(`Erro ao criar pedido: ${orderError.message}`);
      }

      // Criar itens do pedido
      const orderItems = sellerOrder.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from("OrderItem").insert(orderItems);

      if (itemsError) {
        console.error("❌ Erro ao criar itens do pedido:", itemsError);
        throw new Error(`Erro ao criar itens: ${itemsError.message}`);
      }

      // Atualizar estoque dos produtos
      for (const item of sellerOrder.items) {
        const { error: stockError } = await supabase
          .from("Product")
          .update({
            stock: supabase.raw(`stock - ${item.quantity}`),
          })
          .eq("id", item.productId);

        if (stockError) {
          console.error("❌ Erro ao atualizar estoque:", stockError);
          // Não falhar o checkout por erro de estoque, apenas logar
        }
      }

      createdOrders.push({
        orderId: order.id,
        sellerId: sellerOrder.sellerId,
        storeName: sellerOrder.storeName,
        items: sellerOrder.items.length,
        total: orderTotal,
      });

      console.log("✅ Pedido criado:", order.id, "para loja:", sellerOrder.storeName);
    }

    // Limpar carrinho após checkout bem-sucedido
    const { error: clearCartError } = await supabase.from("Cart").delete().eq("userId", userId);

    if (clearCartError) {
      console.error("⚠️ Erro ao limpar carrinho (não crítico):", clearCartError);
    }

    console.log("✅ Checkout concluído com sucesso:", createdOrders.length, "pedidos criados");

    return res.status(201).json({
      success: true,
      message: `Checkout concluído! ${createdOrders.length} pedido(s) criado(s)`,
      data: {
        orders: createdOrders,
        summary: {
          totalOrders: createdOrders.length,
          totalAmount: total,
          paymentMethod: paymentMethod,
          shippingAddress: shippingAddress,
        },
        // Informações para redirecionamento de pagamento (integração ASAAS)
        payment: {
          method: paymentMethod,
          status: "pending",
          paymentUrl: null,
          instructions:
            paymentMethod === "PIX"
              ? "Aguarde as instruções de pagamento PIX que serão enviadas por email"
              : "Aguarde o processamento do pagamento",
        },
      },
    });
  } catch (error) {
    console.error("❌ Erro no checkout:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao processar checkout",
      details: error.message,
    });
  }
});

export default router;
