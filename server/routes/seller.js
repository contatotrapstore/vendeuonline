import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { z } from "zod";
import { supabase } from "../lib/supabase-client.js";
import { protectRoute, validateInput, commonValidations } from "../middleware/security.js";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger.js";
import { parseProductMetadata } from "../lib/product-metadata.js";

const router = express.Router();

// Função para gerar slug limpo a partir do nome
function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-") // Espaços para hífens
    .replace(/-+/g, "-") // Remove hífens duplicados
    .replace(/^-+|-+$/g, ""); // Remove hífens no início/fim
}

// Função para gerar slug único verificando no banco
async function generateUniqueSlug(name, currentStoreId = null) {
  const baseSlug = slugify(name);
  if (!baseSlug) return `store-${Date.now().toString(36)}`;

  // Verificar se já existe esse slug (exceto a própria loja)
  let query = supabase.from("stores").select("slug").like("slug", `${baseSlug}%`);

  if (currentStoreId) {
    query = query.neq("id", currentStoreId);
  }

  const { data: existing } = await query;

  if (!existing || existing.length === 0) {
    return baseSlug; // Slug limpo disponível
  }

  // Se existe, verificar se o slug exato está em uso
  const slugs = existing.map((s) => s.slug);
  if (!slugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Adicionar número sequencial
  let counter = 2;
  while (slugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

const getDefaultStoreName = (user) => {
  const baseName =
    typeof user?.name === "string" && user.name.trim().length > 0
      ? user.name.trim()
      : "Vendedor";
  return `Loja de ${baseName}`;
};
const buildSellerDefaults = (user) => {
  const storeName = getDefaultStoreName(user);
  const slugBase =
    typeof user?.name === "string" && user.name.trim().length > 0
      ? user.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : "loja";

  const sellerDefaults = {
    rating: 0,
    totalSales: 0,
    commission: 5,
    isVerified: false,
  };

  const storeDefaults = {
    name: storeName,
    description: `Bem-vindo à ${storeName}`,
    slug: `${slugBase}-${Date.now().toString(36)}`,
    city: typeof user?.city === "string" ? user.city.trim() : "",
    state: typeof user?.state === "string" ? user.state.trim() : "",
    email: user?.email || "",
    phone: user?.phone || "",
    isActive: true,
    isVerified: false,
  };

  return { seller: sellerDefaults, store: storeDefaults };
};

// Middleware de autenticação específico para vendedores (com funcionalidades extras)
const authenticateSellerWithExtras = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET é obrigatório para rotas seller");
    }

    const decoded = jwt.verify(token, jwtSecret);
    logger.info("🔐 Autenticando vendedor NOVO:", decoded.userId);

    // Buscar usuário primeiro (apenas campos básicos)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .eq("type", "SELLER")
      .single();

    if (userError || !user) {
      logger.info("❌ Usuário não encontrado ou não é seller:", userError);
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Buscar dados do seller separadamente
    let { data: sellers, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", user.id)
      .single();

    // Se seller não existe, criar automaticamente
    if (sellerError || !sellers) {
      logger.info("📝 Seller não encontrado, criando automaticamente para userId:", user.id);

      const defaults = buildSellerDefaults(user);

      const { data: newSeller, error: createError } = await supabase
        .from("sellers")
        .insert({
          id: randomUUID(), // Gerar ID manualmente (Prisma @default(cuid()) não funciona com Supabase client)
          userId: user.id,
          ...defaults.seller,
          // Campos com defaults preenchidos automaticamente:
          // rating: 0.0, totalSales: 0, commission: 5.0, isVerified: false
          // planId é nullable, Store será criada separadamente
        })
        .select("id")
        .single();

      if (createError || !newSeller) {
        logger.error("❌ Erro ao criar seller automaticamente");
        logger.error("❌ Detalhes completos do erro:", {
          message: createError?.message,
          code: createError?.code,
          details: createError?.details,
          hint: createError?.hint,
          userId: user.id,
          storeName: defaults.store.name,
          storeDescription: defaults.store.description,
          userName: user.name,
        });

        // Mensagem de erro mais específica baseada no código do Supabase
        let userMessage = "Erro ao criar vendedor. Por favor, contate o suporte.";
        let errorCode = "CREATE_SELLER_ERROR";

        if (createError?.code === '23505') {
          // Unique violation
          userMessage = "Já existe um vendedor cadastrado para este usuário. Tente fazer logout e login novamente.";
          errorCode = "DUPLICATE_SELLER";
        } else if (createError?.code === '23503') {
          // Foreign key violation
          userMessage = "Erro de integridade de dados. Por favor, contate o suporte técnico.";
          errorCode = "FK_VIOLATION";
        } else if (createError?.message?.includes('permission') || createError?.message?.includes('RLS')) {
          userMessage = "Erro de permissão no banco de dados. Configure as políticas RLS da tabela sellers.";
          errorCode = "RLS_ERROR";
        }

        return res.status(500).json({
          error: userMessage,
          code: errorCode,
          details: createError?.message,
          hint: createError?.hint,
        });
      }

      sellers = newSeller;
      logger.info("✅ Seller criado com sucesso:", sellers.id);
    }

    // Buscar dados da store separadamente
    const { data: stores } = await supabase.from("stores").select("id, name, slug").eq("sellerId", sellers.id).single();

    // Montar objetos de resposta
    req.user = user;
    req.seller = sellers;
    req.store = stores || null;

    // Compatibilidade com código existente
    req.user.sellerId = sellers.id;
    req.user.storeId = stores?.id || null;
    req.user.storeSlug = stores?.slug || null;
    req.user.storeName = stores?.name || null;

    logger.info("✅ Vendedor autenticado (NOVO):", stores?.name || sellers.id);
    next();
  } catch (error) {
    logger.error("❌ Erro na autenticação do vendedor (NOVO):", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido" });
    }

    res.status(401).json({ error: "Falha na autenticação" });
  }
};

// GET /api/seller/categories - Distribuição de categorias (rota simplificada)
router.get("/categories", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    logger.info("📊 Buscando categorias para vendedor:", sellerId);

    // Buscar categorias reais baseado nos produtos do vendedor
    // Nota: Product usa tabela "Product", Category usa tabela "categories" (@@map no Prisma)
    const { data: categoryStats, error } = await supabase
      .from("Product")
      .select(
        `
        categoryId,
        categories (
          id,
          name
        )
      `
      )
      .eq("sellerId", sellerId)
      .eq("isActive", true);

    if (error) {
      logger.error("❌ Erro ao buscar categorias:", error);
      throw new Error(`Erro no banco de dados: ${error.message}`);
    }

    // Contar produtos por categoria
    const categoryCount = {};
    if (categoryStats && Array.isArray(categoryStats)) {
      categoryStats.forEach((product) => {
        if (product.categories) {
          const categoryName = product.categories.name;
          categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
        }
      });
    }

    // Converter para o formato esperado
    const categoriesData = Object.entries(categoryCount).map(([name, count]) => ({
      name,
      count,
    }));

    logger.info("✅ Categorias encontradas (reais):", categoriesData.length);

    res.json({
      success: true,
      data: categoriesData,
      total: categoriesData.length,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar categorias:", error);
    res.status(500).json({
      error: "Erro interno",
      details: error.message,
    });
  }
});

// GET /api/seller/stats - Estatísticas do vendedor
router.get("/stats", authenticateSellerWithExtras, async (req, res) => {
  try {
    // Forçar no-cache para garantir dados frescos
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const sellerId = req.seller.id;
    logger.info("📊 Buscando stats para vendedor:", sellerId);

    // Buscar estatísticas dos produtos com tratamento de erro
    const { data: productStats, error: productError } = await supabase
      .from("Product")
      .select("id, stock, viewCount, salesCount, rating")
      .eq("sellerId", sellerId);

    if (productError) {
      logger.error("❌ Erro ao buscar produtos:", productError);
    }

    // Buscar estatísticas dos pedidos com tratamento de erro
    const { data: orderStats, error: orderError } = await supabase
      .from("Order")
      .select("id, total, status, createdAt")
      .eq("sellerId", sellerId);

    if (orderError) {
      logger.error("❌ Erro ao buscar pedidos:", orderError);
    }

    // Garantir arrays vazios se não houver dados
    const products = productStats || [];
    const orders = orderStats || [];

    // Buscar reviews apenas se houver produtos
    let reviewStats = [];
    if (products.length > 0) {
      const productIds = products.map((p) => p.id);
      const { data: reviews, error: reviewError } = await supabase
        .from("reviews")
        .select("rating")
        .in("productId", productIds);

      if (reviewError) {
        logger.error("❌ Erro ao buscar reviews:", reviewError);
      } else {
        reviewStats = reviews || [];
      }
    }

    // Calcular receita do mês atual
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const currentMonthOrders = orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= currentMonth && (order.status === "DELIVERED" || order.status === "COMPLETED");
    });

    const monthlyRevenue = currentMonthOrders.reduce((sum, order) => {
      const total = parseFloat(order.total) || 0;
      return sum + total;
    }, 0);

    // Contar produtos com estoque baixo (menos de 5)
    const lowStockProducts = products.filter((p) => (p.stock || 0) <= 5).length;

    // Contar pedidos pendentes
    const pendingOrders = orders.filter((order) => order.status === "PENDING" || order.status === "CONFIRMED").length;

    // Calcular avaliação média
    const averageRating =
      reviewStats.length > 0
        ? reviewStats.reduce((sum, review) => sum + (review.rating || 0), 0) / reviewStats.length
        : 0;

    // Total de visualizações da loja
    const storeViews = products.reduce((sum, product) => sum + (product.viewCount || 0), 0);

    const stats = {
      totalProducts: products.length,
      totalOrders: orders.length,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      storeViews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviewStats.length,
      pendingOrders,
      lowStockProducts,
    };

    logger.info("✅ Stats calculadas:", stats);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar estatísticas do vendedor:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/recent-orders - Pedidos recentes
router.get("/recent-orders", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const limit = parseInt(req.query.limit) || 10;
    logger.info("📦 Buscando pedidos recentes para vendedor:", sellerId, "limit:", limit);

    // Buscar pedidos com dados básicos primeiro
    const { data: orders, error } = await supabase
      .from("Order")
      .select("id, total, status, createdAt, buyerId")
      .eq("sellerId", sellerId)
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("❌ Erro ao buscar pedidos:", error);
      // Retornar array vazio em caso de erro ao invés de falhar
      return res.json({
        success: true,
        data: [],
      });
    }

    // Se não há pedidos, retornar array vazio
    if (!orders || orders.length === 0) {
      logger.info("ℹ️ Nenhum pedido encontrado para o vendedor");
      return res.json({
        success: true,
        data: [],
      });
    }

    // Buscar dados dos compradores
    const buyerIds = [...new Set(orders.map((order) => order.buyerId).filter(Boolean))];
    let buyerData = [];

    if (buyerIds.length > 0) {
      const { data: buyers, error: buyerError } = await supabase
        .from("buyers")
        .select(
          `
          id,
          users!inner(name, email)
        `
        )
        .in("id", buyerIds);

      if (buyerError) {
        logger.error("❌ Erro ao buscar compradores:", buyerError);
      } else {
        buyerData = buyers || [];
      }
    }

    // Buscar itens dos pedidos
    const orderIds = orders.map((order) => order.id);
    let orderItems = [];

    if (orderIds.length > 0) {
      const { data: items, error: itemError } = await supabase
        .from("OrderItem")
        .select(
          `
          orderId,
          quantity,
          productId,
          product:Product!inner(name, price)
        `
        )
        .in("orderId", orderIds);

      if (itemError) {
        logger.error("❌ Erro ao buscar itens dos pedidos:", itemError);
      } else {
        orderItems = items || [];
      }
    }

    // Formatar dados para o frontend
    const formattedOrders = orders.map((order) => {
      const buyer = buyerData.find((b) => b.id === order.buyerId);
      const items = orderItems.filter((item) => item.orderId === order.id);
      const mainProduct = items[0]?.product;
      const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

      return {
        id: `#${order.id.toString().slice(-4)}`,
        customer: buyer?.users?.name || "Cliente",
        product: mainProduct?.name || "Produto",
        value: parseFloat(order.total) || 0,
        status: order.status?.toLowerCase() || "pending",
        time: getTimeAgo(order.createdAt),
        totalItems,
      };
    });

    logger.info("✅ Pedidos formatados:", formattedOrders.length);

    res.json({
      success: true,
      data: formattedOrders,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar pedidos recentes:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/top-products - Produtos mais vendidos
router.get("/top-products", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const limit = parseInt(req.query.limit) || 5;
    logger.info("🏆 Buscando produtos mais vendidos para vendedor:", sellerId, "limit:", limit);

    const { data: products, error } = await supabase
      .from("Product")
      .select("id, name, salesCount, stock, price")
      .eq("sellerId", sellerId)
      .order("salesCount", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("❌ Erro ao buscar produtos:", error);
      return res.json({
        success: true,
        data: [],
      });
    }

    // Se não há produtos, retornar array vazio
    if (!products || products.length === 0) {
      logger.info("ℹ️ Nenhum produto encontrado para o vendedor");
      return res.json({
        success: true,
        data: [],
      });
    }

    const formattedProducts = products.map((product) => {
      const salesCount = product.salesCount || 0;
      const price = parseFloat(product.price) || 0;
      const revenue = salesCount * price;

      return {
        id: product.id,
        name: product.name || "Produto sem nome",
        sales: salesCount,
        revenue: Math.round(revenue * 100) / 100,
        stock: product.stock || 0,
      };
    });

    logger.info("✅ Produtos formatados:", formattedProducts.length);

    res.json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar produtos mais vendidos:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/analytics - Análise detalhada com comparações
router.get("/analytics", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const period = req.query.period || "30"; // dias
    logger.info("📈 Buscando analytics para vendedor:", sellerId, "período:", period, "dias");

    // Return basic analytics structure immediately
    if (!sellerId) {
      return res.json({
        success: true,
        data: {
          period: parseInt(period),
          revenue: 0,
          orders: 0,
          visits: 0,
          conversionRate: 0,
          averageOrderValue: 0,
          comparison: {
            revenueChange: 0,
            ordersChange: 0,
            visitsChange: 0,
            previousRevenue: 0,
            previousOrders: 0,
            previousVisits: 0,
          },
        },
      });
    }

    const periodDays = parseInt(period);
    const currentStartDate = new Date();
    currentStartDate.setDate(currentStartDate.getDate() - periodDays);

    // Data de início do período anterior para comparação
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - periodDays * 2);
    const previousEndDate = new Date(currentStartDate);

    // Buscar dados de analytics com tratamento robusto
    let analyticsData = [];
    let previousAnalyticsData = [];

    try {
      // Período atual
      const { data: currentData, error: analyticsError } = await supabase
        .from("Order")
        .select("total, createdAt, status")
        .eq("sellerId", sellerId)
        .gte("createdAt", currentStartDate.toISOString());

      // Período anterior
      const { data: previousData } = await supabase
        .from("Order")
        .select("total, createdAt, status")
        .eq("sellerId", sellerId)
        .gte("createdAt", previousStartDate.toISOString())
        .lt("createdAt", previousEndDate.toISOString());

      if (analyticsError) {
        logger.error("❌ Erro ao buscar analytics:", analyticsError);
        analyticsData = [];
      } else {
        // Dados já filtrados por sellerId na query
        analyticsData = currentData || [];
        previousAnalyticsData = previousData || [];
      }
    } catch (error) {
      logger.error("❌ Erro ao processar analytics:", error);
      analyticsData = [];
      previousAnalyticsData = [];
    }

    // Buscar pedidos do período atual
    const { data: periodOrders, error: ordersError } = await supabase
      .from("Order")
      .select("total, status, createdAt")
      .eq("sellerId", sellerId)
      .gte("createdAt", currentStartDate.toISOString());

    // Buscar pedidos do período anterior
    const { data: previousPeriodOrders } = await supabase
      .from("Order")
      .select("total, status, createdAt")
      .eq("sellerId", sellerId)
      .gte("createdAt", previousStartDate.toISOString())
      .lt("createdAt", previousEndDate.toISOString());

    if (ordersError) {
      logger.error("❌ Erro ao buscar pedidos do período:", ordersError);
    }

    // Garantir arrays vazios se não houver dados
    const analytics = analyticsData;
    const orders = periodOrders || [];
    const previousOrders = previousPeriodOrders || [];
    const previousAnalytics = previousAnalyticsData;

    // Calcular métricas do período atual
    const completedOrders = orders.filter((o) => o.status === "DELIVERED" || o.status === "COMPLETED");
    const totalRevenue = completedOrders.reduce((sum, order) => {
      const total = parseFloat(order.total) || 0;
      return sum + total;
    }, 0);
    const totalVisits = analytics.filter((event) => event.type === "page_view" || event.type === "view_item").length;
    const conversionRate = totalVisits > 0 ? (orders.length / totalVisits) * 100 : 0;
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Calcular métricas do período anterior
    const previousCompletedOrders = previousOrders.filter((o) => o.status === "DELIVERED" || o.status === "COMPLETED");
    const previousRevenue = previousCompletedOrders.reduce((sum, order) => {
      const total = parseFloat(order.total) || 0;
      return sum + total;
    }, 0);
    const previousVisits = previousAnalytics.filter(
      (event) => event.type === "page_view" || event.type === "view_item"
    ).length;

    // Calcular mudanças percentuais
    const revenueChange =
      previousRevenue > 0 ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 10000) / 100 : 0;

    const ordersChange =
      previousOrders.length > 0
        ? Math.round(((orders.length - previousOrders.length) / previousOrders.length) * 10000) / 100
        : 0;

    const visitsChange =
      previousVisits > 0 ? Math.round(((totalVisits - previousVisits) / previousVisits) * 10000) / 100 : 0;

    const analyticsResult = {
      period: periodDays,
      revenue: Math.round(totalRevenue * 100) / 100,
      orders: orders.length,
      visits: totalVisits,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      // Adicionar comparações
      comparison: {
        revenueChange,
        ordersChange,
        visitsChange,
        previousRevenue: Math.round(previousRevenue * 100) / 100,
        previousOrders: previousOrders.length,
        previousVisits,
      },
    };

    logger.info("✅ Analytics calculadas com comparações:", analyticsResult);

    res.json({
      success: true,
      data: analyticsResult,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar analytics:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// Função auxiliar para calcular tempo decorrido
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seg atrás`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas atrás`;
  return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
}

/**
 * Parsejar address string em objeto estruturado
 * @param {string} addressString - Ex: "Rua X, 123, Bairro Y" ou "Rua X"
 * @returns {Object} - { street: "Rua X", number: "123", neighborhood: "Bairro Y" }
 */
function parseAddress(addressString) {
  if (!addressString) {
    return { street: "", number: "", neighborhood: "" };
  }

  const parts = addressString.split(",").map((s) => s.trim());
  return {
    street: parts[0] || "",
    number: parts[1] || "",
    neighborhood: parts[2] || "",
  };
}

/**
 * Formatar objeto address em string concatenada para salvar no banco
 * @param {Object} addressObj - { street: "Rua X", number: "123", neighborhood: "Bairro Y" }
 * @returns {string} - "Rua X, 123, Bairro Y"
 */
function formatAddress(addressObj) {
  if (!addressObj) return "";

  const { street = "", number = "", neighborhood = "" } = addressObj;
  const parts = [street, number, neighborhood].filter(Boolean);
  return parts.join(", ");
}

// GET /api/seller/store - Buscar dados da loja do vendedor autenticado
router.get("/store", authenticateSellerWithExtras, async (req, res) => {
  try {
    const user = req.user;
    logger.info("🔍 Debug API Store - user:", {
      sellerId: user.sellerId,
      storeId: user.storeId,
      storeName: user.storeName,
      name: user.name,
    });

    if (!user.sellerId) {
      logger.info("❌ API Store - sellerId não encontrado");
      return res.status(404).json({
        error: "Dados do vendedor não encontrados",
      });
    }

    logger.info("🏪 Buscando dados da loja para vendedor:", user.sellerId);

    // Buscar dados completos do seller e da store correspondente
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("*")
      .eq("id", user.sellerId)
      .single();

    if (sellerError || !seller) {
      logger.error("❌ Erro ao buscar seller:", sellerError);
      return res.status(404).json({
        error: "Vendedor não encontrado",
      });
    }

    // Buscar store correspondente ao seller
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("sellerId", seller.id)
      .single();

    // Buscar políticas do seller em seller_settings
    const { data: sellerSettings } = await supabase
      .from("seller_settings")
      .select("returnPolicy, privacyPolicy, terms")
      .eq("sellerId", seller.id)
      .maybeSingle();

    if (storeError) {
      logger.error("⚠️ Store não encontrada para seller:", seller.id, storeError);
      // Se não há store, criar uma baseada nos dados do seller
      const { data: newStore, error: createError } = await supabase
        .from("stores")
        .insert({
          id: randomUUID(),
          sellerId: seller.id,
          name: seller.storeName || "",
          slug: seller.storeSlug || seller.storeName?.toLowerCase().replace(/\s+/g, "-") || `store-${randomUUID().slice(0, 8)}`,
          description: seller.storeDescription || "",
          address: seller.address || "",
          zipCode: seller.zipCode || "",
          category: seller.category || "Eletrônicos",
          logo: seller.logo || "",
          banner: seller.banner || "",
          city: seller.city || "Erechim",
          state: seller.state || "RS",
          phone: seller.phone || "",
          email: seller.email || user.email || "",
          whatsapp: seller.whatsapp || "",
          website: seller.website || "",
          isActive: true,
          isVerified: false,
          theme: "{}",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        logger.error("❌ Erro ao criar store:", createError);
        return res.status(500).json({
          error: "Erro ao criar loja",
        });
      }

      logger.info("✅ Store criada automaticamente:", newStore.id);

      // Estruturar dados usando a store recém-criada
      const storeData = {
        id: newStore.id,
        sellerId: seller.id,
        name: newStore.name,
        slug: newStore.slug,
        description: newStore.description,
        logo: newStore.logo,
        banner: newStore.banner,
        category: newStore.category,
        address: {
          ...parseAddress(newStore.address),
          city: newStore.city,
          state: newStore.state,
          zipCode: newStore.zipCode || "",
        },
        contact: {
          phone: newStore.phone,
          whatsapp: newStore.whatsapp || "",
          email: newStore.email,
          website: newStore.website || "",
        },
        policies: sellerSettings ? {
          returnPolicy: sellerSettings.returnPolicy || "",
          terms: sellerSettings.terms || "",
          privacyPolicy: sellerSettings.privacyPolicy || "",
        } : {
          returnPolicy: "",
          terms: "",
          privacyPolicy: "",
        },
        isVerified: newStore.isVerified,
        isActive: newStore.isActive,
        theme: newStore.theme,
      };

      return res.json({
        success: true,
        data: storeData,
      });
    }

    // Estruturar dados para o frontend usando a store existente
    const storeData = {
      id: store.id,
      sellerId: seller.id,
      name: store.name || seller.storeName || "",
      slug: store.slug || "",
      description: store.description || seller.storeDescription || "",
      logo: store.logo || seller.logo || "",
      banner: store.banner || seller.banner || "",
      category: store.category || seller.category || "geral", // 🔒 FIX (Bug #2): Fallback genérico ao invés de "Eletrônicos"
      address: {
        ...parseAddress(store.address),
        city: store.city || seller.city || "Erechim",
        state: store.state || seller.state || "RS",
        zipCode: store.zipCode || seller.zipCode || "",
      },
      contact: {
        phone: store.phone || seller.phone || "",
        whatsapp: store.whatsapp || seller.whatsapp || "",
        email: store.email || user.email || "",
        website: store.website || seller.website || "",
      },
      policies: sellerSettings ? {
        returnPolicy: sellerSettings.returnPolicy || "",
        terms: sellerSettings.terms || "",
        privacyPolicy: sellerSettings.privacyPolicy || "",
      } : {
        returnPolicy: "",
        terms: "",
        privacyPolicy: "",
      },
      isVerified: store.isVerified || false,
      isActive: store.isActive || true,
      theme: store.theme || "{}",
    };

    logger.info("✅ Dados da loja encontrados - Store ID:", store.id, "Nome:", store.name);

    res.json({
      success: true,
      data: storeData,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar dados da loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/analytics/categories - Buscar distribuição de categorias dos produtos
router.get("/analytics/categories", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;

    logger.info("📊 Buscando distribuição de categorias para vendedor:", sellerId);

    // Buscar produtos agrupados por categoria
    const { data: products, error } = await supabase.from("Product").select("categoryId").eq("sellerId", sellerId);

    if (error) {
      logger.error("❌ Erro ao buscar produtos:", error);
      throw new Error(error.message);
    }

    // Agrupar por categoria e contar
    const categoryMap = new Map();
    (products || []).forEach((product) => {
      const category = product.categoryId || "Sem categoria";
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    // Converter para array ordenado
    const categories = Array.from(categoryMap, ([category, count]) => ({
      category,
      count,
      percentage: products.length > 0 ? Math.round((count / products.length) * 100) : 0,
    })).sort((a, b) => b.count - a.count); // Ordenar por quantidade

    logger.info(`✅ ${categories.length} categorias encontradas`);

    res.json({
      success: true,
      data: categories,
      total: products.length,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar distribuição de categorias:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/analytics/products - Buscar analytics dos produtos do seller
router.get("/analytics/products", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;

    logger.info("📊 Buscando analytics de produtos para vendedor:", sellerId);

    // Buscar produtos do seller com informações completas
    const { data: products, error } = await supabase
      .from("Product")
      .select(
        `
        id,
        name,
        price,
        stock,
        isActive,
        viewCount,
        salesCount,
        rating,
        reviewCount,
        createdAt,
        categories (id, name)
      `
      )
      .eq("sellerId", sellerId)
      .order("salesCount", { ascending: false });

    if (error) {
      logger.error("❌ Erro ao buscar produtos:", error);
      throw new Error(error.message);
    }

    // Calcular estatísticas
    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter((p) => p.isActive).length || 0;
    const totalViews = products?.reduce((sum, p) => sum + (p.viewCount || 0), 0) || 0;
    const totalSales = products?.reduce((sum, p) => sum + (p.salesCount || 0), 0) || 0;
    const totalRevenue = products?.reduce((sum, p) => sum + (p.salesCount || 0) * parseFloat(p.price || 0), 0) || 0;
    const averageRating =
      products?.length > 0 ? products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length : 0;

    // Top 5 produtos mais vendidos
    const topSelling =
      products?.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        sales: p.salesCount || 0,
        revenue: (p.salesCount || 0) * parseFloat(p.price || 0),
        category: p.categories?.name || "Sem categoria",
      })) || [];

    // Produtos com baixo estoque (menos de 5 unidades)
    const lowStock =
      products
        ?.filter((p) => p.stock > 0 && p.stock < 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          stock: p.stock,
        })) || [];

    logger.info(`✅ Analytics de ${totalProducts} produtos calculados`);

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          activeProducts,
          totalViews,
          totalSales,
          totalRevenue,
          averageRating: Math.round(averageRating * 10) / 10,
        },
        topSelling,
        lowStock,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar analytics de produtos:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// PUT /api/seller/store - Atualizar dados da loja do vendedor autenticado
router.put("/store", authenticateSellerWithExtras, async (req, res) => {
  try {
    const user = req.user;
    const seller = req.seller;

    const {
      name,
      description,
      category,
      address,
      contact,
      logo,
      banner,
      phone,
      whatsapp,
      website,
      email,
      storeName,
      storeDescription,
      policies,
    } = req.body;

    logger.info("🏪 PUT /api/seller/store - Atualizando dados da loja");
    logger.info("📦 Dados recebidos:", { name, description, category, address, logo, banner });
    logger.info("📞 Dados de contato recebidos:", { contact, phone, whatsapp, website, email });

    // Buscar store correspondente ao seller
    let { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("sellerId", seller.id)
      .single();

    // Se não existe store, criar uma
    if (storeError && storeError.code === "PGRST116") {
      logger.info("🆕 Criando nova store para seller:", seller.id);

      const { data: newStore, error: createError } = await supabase
        .from("stores")
        .insert({
          id: randomUUID(),
          sellerId: seller.id,
          name: name || storeName || seller.storeName || "",
          slug: (name || storeName || seller.storeName || "").toLowerCase().replace(/\s+/g, "-") || `store-${randomUUID().slice(0, 8)}`,
          description: description || storeDescription || seller.storeDescription || "",
          address: address?.street || seller.address || "",
          zipCode: address?.zipCode || seller.zipCode || "",
          category: category || seller.category || "Eletrônicos",
          logo: logo || seller.logo || "",
          banner: banner || seller.banner || "",
          city: address?.city || seller.city || "Erechim",
          state: address?.state || seller.state || "RS",
          phone: phone || seller.phone || "",
          email: email || user.email || "",
          whatsapp: whatsapp || seller.whatsapp || "",
          website: website || seller.website || "",
          isActive: true,
          isVerified: false,
          theme: "{}",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        logger.error("❌ Erro ao criar store:", createError);
        return res.status(500).json({
          error: "Erro ao criar loja",
          details: createError.message,
        });
      }

      store = newStore;
      logger.info("✅ Store criada:", store.id);
    } else if (storeError) {
      logger.error("❌ Erro ao buscar store:", storeError);
      return res.status(500).json({
        error: "Erro ao buscar loja",
        details: storeError.message,
      });
    }

    // Extrair dados de contato estruturados
    const contactPhone = contact?.phone || phone || store.phone;
    const contactWhatsapp = contact?.whatsapp || whatsapp || store.whatsapp;
    const contactEmail = contact?.email || email || user.email;
    const contactWebsite = contact?.website || website || store.website;

    // Processar endereço completo usando formatAddress()
    let fullAddress = store.address;
    let addressZipCode = store.zipCode;

    if (address && typeof address === "object") {
      // Endereço estruturado - formatar para string usando função auxiliar
      fullAddress = formatAddress(address);
      addressZipCode = address.zipCode || store.zipCode;
    } else if (typeof address === "string") {
      fullAddress = address;
    }

    // Verificar se o nome mudou para regenerar slug
    const newName = name || storeName || store.name;
    const nameChanged = newName !== store.name;

    // Gerar novo slug se o nome mudou
    let newSlug = store.slug;
    if (nameChanged) {
      newSlug = await generateUniqueSlug(newName, store.id);
      logger.info(`🔗 Slug regenerado: ${store.slug} → ${newSlug}`);
    }

    // Atualizar dados da store
    const updateData = {
      name: newName,
      slug: newSlug, // 🔧 FIX: Agora atualiza o slug quando nome muda
      description: description || storeDescription || store.description,
      address: fullAddress || store.address,
      zipCode: addressZipCode || store.zipCode,
      category: category || store.category,
      city: address?.city || store.city,
      state: address?.state || store.state,
      logo: logo || store.logo,
      banner: banner || store.banner,
      phone: contactPhone,
      whatsapp: contactWhatsapp,
      email: contactEmail,
      website: contactWebsite,
      updatedAt: new Date().toISOString(),
    };

    const { data: updatedStore, error: updateError } = await supabase
      .from("stores")
      .update(updateData)
      .eq("id", store.id)
      .select()
      .single();

    if (updateError) {
      logger.error("❌ Erro ao atualizar store:", updateError);
      return res.status(500).json({
        error: "Erro ao atualizar loja",
        details: updateError.message,
      });
    }

    // Também atualizar dados do seller se necessário
    const sellerUpdateData = {
      storeName: name || storeName || seller.storeName,
      storeDescription: description || storeDescription || seller.storeDescription,
      category: category || seller.category,
      logo: logo || seller.logo,
      banner: banner || seller.banner,
      phone: contactPhone || seller.phone,
      whatsapp: contactWhatsapp || seller.whatsapp,
      website: contactWebsite || seller.website,
      zipCode: addressZipCode || seller.zipCode,
    };

    const { error: sellerUpdateError } = await supabase.from("sellers").update(sellerUpdateData).eq("id", seller.id);

    if (sellerUpdateError) {
      logger.warn("⚠️ Aviso ao atualizar seller:", sellerUpdateError);
      // Não falhar se apenas o seller não foi atualizado
    }

    // ✅ Atualizar políticas em seller_settings (se fornecidas)
    let updatedPolicies = null;
    if (policies && typeof policies === "object") {
      logger.info("📋 Atualizando políticas do seller:", seller.id);

      // Verificar se seller_settings existe
      const { data: existingSettings } = await supabase
        .from("seller_settings")
        .select("id")
        .eq("sellerId", seller.id)
        .maybeSingle();

      const policiesData = {
        returnPolicy: policies.returnPolicy || null,
        privacyPolicy: policies.privacyPolicy || null,
        terms: policies.terms || null,
      };

      if (existingSettings) {
        // Atualizar settings existentes
        const { data: updatedSettings, error: updateSettingsError } = await supabase
          .from("seller_settings")
          .update(policiesData)
          .eq("sellerId", seller.id)
          .select()
          .single();

        if (updateSettingsError) {
          logger.warn("⚠️ Erro ao atualizar seller_settings:", updateSettingsError);
        } else {
          updatedPolicies = updatedSettings;
          logger.info("✅ Políticas atualizadas com sucesso");
        }
      } else {
        // Criar novo registro de settings
        const { data: newSettings, error: createSettingsError } = await supabase
          .from("seller_settings")
          .insert({
            id: randomUUID(),
            sellerId: seller.id,
            ...policiesData,
          })
          .select()
          .single();

        if (createSettingsError) {
          logger.warn("⚠️ Erro ao criar seller_settings:", createSettingsError);
        } else {
          updatedPolicies = newSettings;
          logger.info("✅ Políticas criadas com sucesso");
        }
      }
    }

    // Fazer parse do endereço para retornar estruturado
    const parseAddress = (addressString) => {
      if (!addressString) return { street: "", number: "", neighborhood: "", city: "", state: "", zipCode: "" };

      const parts = addressString.split(",").map((part) => part.trim());
      const result = {
        street: "",
        number: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: updatedStore.zipCode || "",
      };

      // Tentar extrair informações do endereço
      if (parts.length > 0) {
        // Primeiro item pode conter rua e número
        const firstPart = parts[0];
        if (firstPart.includes("nº ")) {
          const streetParts = firstPart.split("nº ");
          result.street = streetParts[0].trim();
          result.number = streetParts[1].trim();
        } else {
          result.street = firstPart;
        }
      }

      // Tentar identificar bairro, cidade, estado
      if (parts.length > 1) result.neighborhood = parts[1];
      if (parts.length > 2) result.city = parts[2];
      if (parts.length > 3) result.state = parts[3];

      // Se foi passado o endereço original estruturado, preservar
      if (address && typeof address === "object") {
        return {
          street: address.street || result.street,
          number: address.number || result.number,
          neighborhood: address.neighborhood || result.neighborhood,
          city: address.city || result.city,
          state: address.state || result.state,
          zipCode: address.zipCode || updatedStore.zipCode || "",
        };
      }

      return result;
    };

    // Retornar dados atualizados estruturados
    const storeData = {
      id: updatedStore.id,
      sellerId: seller.id,
      name: updatedStore.name,
      description: updatedStore.description,
      logo: updatedStore.logo,
      banner: updatedStore.banner,
      category: updatedStore.category,
      address: parseAddress(updatedStore.address),
      contact: {
        phone: updatedStore.phone || "",
        whatsapp: updatedStore.whatsapp || "",
        email: updatedStore.email || user.email || "",
        website: updatedStore.website || "",
      },
      policies: updatedPolicies ? {
        returnPolicy: updatedPolicies.returnPolicy || "",
        terms: updatedPolicies.terms || "",
        privacyPolicy: updatedPolicies.privacyPolicy || "",
      } : (policies || null),
    };

    logger.info("✅ Loja atualizada com sucesso:", updatedStore.id);

    res.json({
      success: true,
      data: storeData,
      message: "Loja atualizada com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/sellers/settings - Buscar configurações do vendedor
router.get("/settings", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    logger.info("⚙️ Buscando configurações para vendedor:", sellerId);

    // Buscar configurações do vendedor no banco de dados
    const { data: settings, error: settingsError } = await supabase
      .from("SellerSettings")
      .select("*")
      .eq("sellerId", sellerId)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      logger.error("❌ Erro ao buscar configurações:", settingsError);
      return res.status(500).json({
        error: "Erro ao buscar configurações",
        details: settingsError.message,
      });
    }

    // Se não há configurações, criar configurações padrão
    if (!settings || settingsError?.code === "PGRST116") {
      logger.info("📝 Criando configurações padrão para seller:", sellerId);

      const defaultSettingsData = {
        sellerId: sellerId,
        acceptsCreditCard: true,
        acceptsDebitCard: true,
        acceptsPix: true,
        acceptsBoleto: false,
        acceptsWhatsapp: true,
        // Shipping fields removidos: Sistema WhatsApp-only (frete negociado via WhatsApp)
        // freeShippingMin: null,
        // shippingFee: 10.0,
        // deliveryDays: 7,
        // pickupAvailable: false,
        workingDays: JSON.stringify(["monday", "tuesday", "wednesday", "thursday", "friday"]),
        workingHours: JSON.stringify({ start: "08:00", end: "18:00" }),
        autoApproveOrders: false,
        returnPolicy: "7 dias para devolução",
        privacyPolicy: "Seus dados estão seguros conosco",
        terms: "Termos e condições padrão",
        emailNotifications: true,
        smsNotifications: false,
      };

      // Inserir configurações padrão no banco
      const { data: newSettings, error: createError } = await supabase
        .from("SellerSettings")
        .insert(defaultSettingsData)
        .select()
        .single();

      if (createError) {
        logger.error("❌ Erro ao criar configurações padrão:", createError);
        return res.status(500).json({
          error: "Erro ao criar configurações",
          details: createError.message,
        });
      }

      logger.info("✅ Configurações padrão criadas");

      // Formatar configurações para o frontend
      const formattedSettings = {
        sellerId: newSettings.sellerId,
        paymentMethods: {
          pix: newSettings.acceptsPix,
          creditCard: newSettings.acceptsCreditCard,
          debitCard: newSettings.acceptsDebitCard,
          boleto: newSettings.acceptsBoleto,
          whatsapp: newSettings.acceptsWhatsapp,
        },
        // shippingOptions removido: Sistema WhatsApp-only (frete negociado via WhatsApp)
        notifications: {
          emailNotifications: newSettings.emailNotifications,
          smsNotifications: newSettings.smsNotifications,
        },
        storePolicies: {
          returnPolicy: newSettings.returnPolicy,
          privacyPolicy: newSettings.privacyPolicy,
          terms: newSettings.terms,
        },
        storeConfig: {
          workingDays: JSON.parse(newSettings.workingDays || "[]"),
          workingHours: JSON.parse(newSettings.workingHours || '{"start": "08:00", "end": "18:00"}'),
          autoApproveOrders: newSettings.autoApproveOrders,
        },
      };

      return res.json({
        success: true,
        data: formattedSettings,
      });
    }

    // Formatar configurações existentes para o frontend
    const formattedSettings = {
      sellerId: settings.sellerId,
      paymentMethods: {
        pix: settings.acceptsPix,
        creditCard: settings.acceptsCreditCard,
        debitCard: settings.acceptsDebitCard,
        boleto: settings.acceptsBoleto,
        whatsapp: settings.acceptsWhatsapp,
      },
      // shippingOptions removido: Sistema WhatsApp-only (frete negociado via WhatsApp)
      notifications: {
        emailNotifications: settings.emailNotifications,
        smsNotifications: settings.smsNotifications,
      },
      storePolicies: {
        returnPolicy: settings.returnPolicy,
        privacyPolicy: settings.privacyPolicy,
        terms: settings.terms,
      },
      storeConfig: {
        workingDays: JSON.parse(settings.workingDays || "[]"),
        workingHours: JSON.parse(settings.workingHours || '{"start": "08:00", "end": "18:00"}'),
        autoApproveOrders: settings.autoApproveOrders,
      },
    };

    logger.info("✅ Configurações encontradas");
    res.json({
      success: true,
      data: formattedSettings,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar configurações do vendedor:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// PUT /api/sellers/settings - Atualizar configurações do vendedor
router.put("/settings", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { paymentMethods, notifications, storePolicies, storeConfig } = req.body; // shippingOptions removido

    logger.info("⚙️ Atualizando configurações para vendedor:", sellerId);
    logger.info("📦 Dados recebidos:", { paymentMethods, notifications, storePolicies, storeConfig }); // shippingOptions removido

    // Preparar dados para atualização no formato da tabela seller_settings
    const updateData = {
      // Métodos de pagamento
      acceptsCreditCard: paymentMethods?.creditCard ?? true,
      acceptsDebitCard: paymentMethods?.debitCard ?? true,
      acceptsPix: paymentMethods?.pix ?? true,
      acceptsBoleto: paymentMethods?.boleto ?? false,
      acceptsWhatsapp: paymentMethods?.whatsapp ?? true,

      // Opções de entrega removidas: Sistema WhatsApp-only (frete negociado via WhatsApp)
      // freeShippingMin: shippingOptions?.freeShippingMin || null,
      // shippingFee: shippingOptions?.shippingFee ?? 10.0,
      // deliveryDays: shippingOptions?.deliveryDays ?? 7,
      // pickupAvailable: shippingOptions?.pickupAvailable ?? false,

      // Notificações
      emailNotifications: notifications?.emailNotifications ?? true,
      smsNotifications: notifications?.smsNotifications ?? false,

      // Políticas da loja
      returnPolicy: storePolicies?.returnPolicy || "7 dias para devolução",
      privacyPolicy: storePolicies?.privacyPolicy || "Seus dados estão seguros conosco",
      terms: storePolicies?.terms || "Termos e condições padrão",

      // Configurações da loja
      workingDays: storeConfig?.workingDays
        ? JSON.stringify(storeConfig.workingDays)
        : JSON.stringify(["monday", "tuesday", "wednesday", "thursday", "friday"]),
      workingHours: storeConfig?.workingHours
        ? JSON.stringify(storeConfig.workingHours)
        : JSON.stringify({ start: "08:00", end: "18:00" }),
      autoApproveOrders: storeConfig?.autoApproveOrders ?? false,

      updatedAt: new Date().toISOString(),
    };

    // Tentar atualizar as configurações existentes
    const { data: updatedSettings, error: updateError } = await supabase
      .from("SellerSettings")
      .update(updateData)
      .eq("sellerId", sellerId)
      .select()
      .single();

    // Se não existe, criar novas configurações
    if (updateError && updateError.code === "PGRST116") {
      logger.info("📝 Configurações não existem, criando novas para seller:", sellerId);

      const createData = {
        sellerId: sellerId,
        ...updateData,
      };

      const { data: newSettings, error: createError } = await supabase
        .from("SellerSettings")
        .insert(createData)
        .select()
        .single();

      if (createError) {
        logger.error("❌ Erro ao criar configurações:", createError);
        return res.status(500).json({
          error: "Erro ao criar configurações",
          details: createError.message,
        });
      }

      logger.info("✅ Novas configurações criadas");

      // Formatar resposta com as configurações criadas
      const formattedResult = {
        sellerId: newSettings.sellerId,
        paymentMethods: {
          pix: newSettings.acceptsPix,
          creditCard: newSettings.acceptsCreditCard,
          debitCard: newSettings.acceptsDebitCard,
          boleto: newSettings.acceptsBoleto,
          whatsapp: newSettings.acceptsWhatsapp,
        },
        // shippingOptions removido: Sistema WhatsApp-only (frete negociado via WhatsApp)
        notifications: {
          emailNotifications: newSettings.emailNotifications,
          smsNotifications: newSettings.smsNotifications,
        },
        storePolicies: {
          returnPolicy: newSettings.returnPolicy,
          privacyPolicy: newSettings.privacyPolicy,
          terms: newSettings.terms,
        },
        storeConfig: {
          workingDays: JSON.parse(newSettings.workingDays || "[]"),
          workingHours: JSON.parse(newSettings.workingHours || '{"start": "08:00", "end": "18:00"}'),
          autoApproveOrders: newSettings.autoApproveOrders,
        },
        updatedAt: newSettings.updatedAt,
      };

      return res.json({
        success: true,
        data: formattedResult,
        message: "Configurações criadas com sucesso",
      });
    }

    if (updateError) {
      logger.error("❌ Erro ao atualizar configurações:", updateError);
      return res.status(500).json({
        error: "Erro ao atualizar configurações",
        details: updateError.message,
      });
    }

    logger.info("✅ Configurações atualizadas com sucesso");

    // Formatar resposta com as configurações atualizadas
    const formattedResult = {
      sellerId: updatedSettings.sellerId,
      paymentMethods: {
        pix: updatedSettings.acceptsPix,
        creditCard: updatedSettings.acceptsCreditCard,
        debitCard: updatedSettings.acceptsDebitCard,
        boleto: updatedSettings.acceptsBoleto,
        whatsapp: updatedSettings.acceptsWhatsapp,
      },
      // shippingOptions removido: Sistema WhatsApp-only (frete negociado via WhatsApp)
      notifications: {
        emailNotifications: updatedSettings.emailNotifications,
        smsNotifications: updatedSettings.smsNotifications,
      },
      storePolicies: {
        returnPolicy: updatedSettings.returnPolicy,
        privacyPolicy: updatedSettings.privacyPolicy,
        terms: updatedSettings.terms,
      },
      storeConfig: {
        workingDays: JSON.parse(updatedSettings.workingDays || "[]"),
        workingHours: JSON.parse(updatedSettings.workingHours || '{"start": "08:00", "end": "18:00"}'),
        autoApproveOrders: updatedSettings.autoApproveOrders,
      },
      updatedAt: updatedSettings.updatedAt,
    };

    res.json({
      success: true,
      data: formattedResult,
      message: "Configurações atualizadas com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar configurações:", error);
    res.status(500).json({
      error: "Erro ao atualizar configurações",
      details: error.message,
    });
  }
});

// GET /api/sellers/subscription - Buscar assinatura atual do vendedor
router.get("/subscription", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    logger.info("💳 Buscando assinatura para vendedor:", sellerId);

    // Buscar assinatura ativa do vendedor
    const { data: subscription, error: subError } = await supabase
      .from("Subscription")
      .select("*")
      .eq("sellerId", sellerId)
      .eq("status", "ACTIVE")
      .single();

    if (subError && subError.code !== "PGRST116") {
      logger.error("❌ Erro ao buscar assinatura:", subError);
      return res.status(500).json({
        error: "Erro ao buscar assinatura",
        details: subError.message,
      });
    }

    // Se não tem assinatura, criar uma padrão para o plano gratuito
    if (!subscription) {
      logger.info("📝 Criando assinatura padrão para plano gratuito");

      // Buscar plano gratuito ou criar um mock
      let freePlan = null;
      const { data: planData, error: planError } = await supabase.from("Plan").select("*").eq("price", 0).single();

      if (planError || !planData) {
        logger.info("💡 Nenhum plano gratuito no banco, criando plano mock");
        // Criar plano mock se não existir
        freePlan = {
          id: "plan-free-mock",
          name: "Gratuito",
          slug: "gratuito",
          description: "Plano básico gratuito",
          price: 0.0,
          billingPeriod: "monthly",
          maxAds: 5,
          maxPhotos: 3,
          maxProducts: 10,
          prioritySupport: false,
          support: "Email básico",
          features: JSON.stringify(["5 anúncios por mês", "3 fotos por produto", "10 produtos máximo"]),
          isActive: true,
          order: 1,
        };
      } else {
        freePlan = planData;
      }

      // Criar assinatura padrão
      const defaultSubscription = {
        id: `sub_${sellerId}`,
        sellerId,
        planId: freePlan.id,
        plan: freePlan,
        status: "active",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        autoRenew: true,
        paymentMethod: "Gratuito",
      };

      logger.info("✅ Assinatura padrão criada");
      return res.json({
        success: true,
        data: defaultSubscription,
      });
    }

    // Buscar dados do plano separadamente
    const { data: planData } = await supabase.from("Plan").select("*").eq("id", subscription.planId).single();

    // Formatar dados da assinatura
    const subscriptionData = {
      id: subscription.id,
      planId: subscription.planId,
      plan: planData,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      autoRenew: subscription.autoRenew || true,
      paymentMethod: subscription.paymentMethod || "Não informado",
    };

    logger.info("✅ Assinatura encontrada:", subscriptionData.plan?.name || "Plano não identificado");
    res.json({
      success: true,
      data: subscriptionData,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar assinatura:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// POST /api/sellers/upgrade - Fazer upgrade do plano
router.post("/upgrade", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: "ID do plano é obrigatório",
      });
    }

    logger.info("🚀 Processando upgrade de plano:", { sellerId, planId });

    // Buscar dados do plano
    const { data: plan, error: planError } = await supabase.from("Plan").select("*").eq("id", planId).single();

    if (planError || !plan) {
      logger.error("❌ Plano não encontrado:", planError);
      return res.status(404).json({
        error: "Plano não encontrado",
      });
    }

    // Verificar se é upgrade, downgrade ou mudança de plano
    const currentPlan = req.seller.plan;
    logger.info("📊 Plano atual:", currentPlan, "-> Novo plano:", plan.slug);

    // Buscar dados do plano atual para comparação
    const { data: currentPlanData } = await supabase
      .from("Plan")
      .select("id, name, price, order")
      .eq("slug", currentPlan)
      .single();

    let changeType = "change";
    if (currentPlanData) {
      if (plan.order > currentPlanData.order) {
        changeType = "upgrade";
      } else if (plan.order < currentPlanData.order) {
        changeType = "downgrade";
      } else {
        changeType = "same";
      }
    }

    logger.info(`📈 Tipo de mudança: ${changeType} (${currentPlanData?.name || "N/A"} -> ${plan.name})`);

    // Se for o mesmo plano, retornar erro
    if (changeType === "same") {
      return res.status(400).json({
        error: "Você já está neste plano",
        code: "SAME_PLAN",
      });
    }

    // Se for downgrade, verificar se o seller tem produtos/recursos acima do limite do novo plano
    if (changeType === "downgrade") {
      const { count: activeProducts } = await supabase
        .from("Product")
        .select("id", { count: "exact" })
        .eq("sellerId", sellerId)
        .eq("isActive", true);

      if (plan.maxProducts !== -1 && activeProducts > plan.maxProducts) {
        return res.status(400).json({
          error: `Não é possível fazer downgrade. Você tem ${activeProducts} produtos ativos, mas o plano "${plan.name}" permite apenas ${plan.maxProducts}.`,
          code: "DOWNGRADE_BLOCKED_BY_PRODUCTS",
          details: {
            currentProducts: activeProducts,
            maxAllowed: plan.maxProducts,
            suggestion: "Desative alguns produtos antes de fazer o downgrade",
          },
        });
      }
    }

    // Se o plano for gratuito, permitir mudança direta
    if (plan.price === 0) {
      // Atualizar seller para plano gratuito
      const { error: updateError } = await supabase
        .from("sellers")
        .update({ plan: plan.slug.toUpperCase() })
        .eq("id", sellerId);

      if (updateError) {
        logger.error("❌ Erro ao atualizar plano do seller:", updateError);
        return res.status(500).json({
          error: "Erro ao atualizar plano",
        });
      }

      logger.info(
        `✅ ${changeType === "upgrade" ? "Upgrade" : changeType === "downgrade" ? "Downgrade" : "Mudança"} para plano gratuito realizado`
      );
      return res.json({
        success: true,
        message: `${changeType === "upgrade" ? "Upgrade" : changeType === "downgrade" ? "Downgrade" : "Plano"} realizado com sucesso!`,
        data: {
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          changeType: changeType,
          previousPlan: currentPlanData?.name,
        },
      });
    }

    // Para planos pagos, usar nossa própria API de pagamentos
    const paymentUrl = `${process.env.APP_URL}/seller/checkout?planId=${plan.id}`;

    logger.info("💳 Redirecionando para checkout interno:", paymentUrl);

    res.json({
      success: true,
      message: `Redirecionando para pagamento (${changeType})...`,
      data: {
        paymentUrl,
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        changeType: changeType,
        previousPlan: currentPlanData?.name,
      },
    });
  } catch (error) {
    logger.error("❌ Erro no upgrade do plano:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/orders - Listar pedidos do vendedor
router.get("/orders", authenticateSellerWithExtras, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { status, limit = 50, offset = 0 } = req.query;

    logger.info("📦 Buscando pedidos do seller:", sellerId, { status, limit, offset });

    // Simplificar query - buscar apenas dados básicos dos pedidos
    let query = supabase
      .from("Order")
      .select("*")
      .eq("sellerId", sellerId)
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: orders, error } = await query;

    if (error) {
      logger.error("❌ Erro ao buscar pedidos:", error);
      logger.error("❌ Detalhes do erro:", error.message, error.code, error.details);
      return res.status(500).json({
        error: "Erro ao buscar pedidos",
        details: error.message,
      });
    }

    // Se não há pedidos, retornar array vazio
    if (!orders || orders.length === 0) {
      logger.info("ℹ️ Nenhum pedido encontrado para o vendedor");
      return res.json({
        success: true,
        orders: [],
        stats: {
          total: 0,
          pending: 0,
          confirmed: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
        },
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: 0,
        },
      });
    }

    // Estatísticas dos pedidos
    const { data: stats, error: statsError } = await supabase.from("Order").select("status").eq("sellerId", sellerId);

    const orderStats = {
      total: stats?.length || 0,
      pending: stats?.filter((o) => o.status === "pending").length || 0,
      confirmed: stats?.filter((o) => o.status === "confirmed").length || 0,
      processing: stats?.filter((o) => o.status === "processing").length || 0,
      shipped: stats?.filter((o) => o.status === "shipped").length || 0,
      delivered: stats?.filter((o) => o.status === "delivered").length || 0,
      cancelled: stats?.filter((o) => o.status === "cancelled").length || 0,
    };

    logger.info("✅ Pedidos encontrados:", orders?.length);

    res.json({
      success: true,
      orders: orders || [],
      stats: orderStats,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: stats?.length || 0,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar pedidos do seller:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/products - Listar produtos do vendedor
router.get("/products", authenticateSellerWithExtras, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const sellerId = req.user.sellerId;

    logger.info("🔍 Buscando produtos do seller:", sellerId);

    // Query base para produtos do vendedor (incluindo relações)
    let query = supabase
      .from("Product")
      .select(
        `
        id,
        sellerId,
        storeId,
        name,
        slug,
        description,
        price,
        comparePrice,
        stock,
        categoryId,
        categories!Product_categoryId_fkey(id, name, slug),
        isActive,
        isFeatured,
        rating,
        reviewCount,
        salesCount,
        sku,
        weight,
        dimensions,
        viewCount,
        createdAt,
        updatedAt
      `
      )
      .eq("sellerId", sellerId)
      .order("createdAt", { ascending: false });

    // Filtro por busca de texto
    if (search && search.trim() !== "") {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    // Filtro por categoria
    if (category && category !== "all") {
      query = query.eq("categoryId", category);
    }

    // Filtro por status
    if (status && status !== "all") {
      if (status === "active") {
        query = query.eq("isActive", true);
      } else if (status === "inactive") {
        query = query.eq("isActive", false);
      }
    }

    // Aplicar paginação
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error } = await query;

    if (error) {
      logger.error("❌ Erro ao buscar produtos:", error);
      throw error;
    }

    // Buscar total de produtos para paginação
    let countQuery = supabase.from("Product").select("id", { count: "exact", head: true }).eq("sellerId", sellerId);

    // Aplicar os mesmos filtros na contagem
    if (search && search.trim() !== "") {
      countQuery = countQuery.ilike("name", `%${search.trim()}%`);
    }
    if (category && category !== "all") {
      countQuery = countQuery.eq("categoryId", category);
    }
    if (status && status !== "all") {
      if (status === "active") {
        countQuery = countQuery.eq("isActive", true);
      } else if (status === "inactive") {
        countQuery = countQuery.eq("isActive", false);
      }
    }

    const { count: totalCount } = await countQuery;

    // Buscar imagens e especificações para cada produto
    const productsWithDetails = await Promise.all(
      (products || []).map(async (product) => {
        const metadata = parseProductMetadata(product.dimensions);
        // Buscar imagens do produto
        const { data: images, error: imagesError } = await supabase
          .from("ProductImage")
          .select("id, url, alt, order, position")
          .eq("productId", product.id)
          .order("order", { ascending: true });

        if (imagesError) {
          logger.warn(`⚠️ Erro ao buscar imagens do produto ${product.id}:`, imagesError);
        }

        // Buscar especificações do produto
        const { data: specifications, error: specsError } = await supabase
          .from("ProductSpecification")
          .select("name, value")
          .eq("productId", product.id);

        if (specsError) {
          logger.warn(`⚠️ Erro ao buscar especificações do produto ${product.id}:`, specsError);
        }

        // Formatar produto para o frontend
        return {
          id: product.id,
          sellerId: product.sellerId,
          storeId: product.storeId,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: parseFloat(product.price),
          comparePrice: product.comparePrice ? parseFloat(product.comparePrice) : undefined,
          stock: product.stock,
          categoryId: product.categoryId,
          category: product.categories || { id: product.categoryId, name: "Sem categoria", slug: "" },
          isActive: product.isActive,
          isFeatured: product.isFeatured || false,
          rating: product.rating ? parseFloat(product.rating) : 0,
          reviewCount: product.reviewCount || 0,
          salesCount: product.salesCount || 0,
          viewCount: product.viewCount || 0,
          sku: product.sku || undefined,
          weight: product.weight ? parseFloat(product.weight) : undefined,
          brand: metadata.brand || "",
          model: metadata.model || "",
          condition: metadata.condition || "",
          dimensions: metadata.dimensions || undefined,
          shippingOptions: metadata.shippingOptions || [],
          images: images || [],
          specifications: specifications || [],
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      })
    );

    const formattedProducts = productsWithDetails;

    const totalPages = Math.ceil((totalCount || 0) / parseInt(limit));

    logger.info(`✅ Produtos encontrados: ${formattedProducts.length}/${totalCount}`);

    res.json({
      success: true,
      data: formattedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
      filters: {
        search: search || "",
        category: category || "all",
        status: status || "all",
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao listar produtos do seller:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

export default router;
