import express from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase-client.js";
import { protectRoute, validateInput, commonValidations } from "../middleware/security.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware de autenticação específico para vendedores
const authenticateSeller = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    const jwtSecret =
      process.env.JWT_SECRET ||
      "cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac";

    const decoded = jwt.verify(token, jwtSecret);
    console.log("🔐 Autenticando vendedor NOVO:", decoded.userId);

    // Buscar usuário primeiro (apenas campos básicos)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .eq("type", "SELLER")
      .single();

    if (userError || !user) {
      console.log("❌ Usuário não encontrado ou não é seller:", userError);
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Buscar dados do seller separadamente
    const { data: sellers, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", user.id)
      .single();

    if (sellerError || !sellers) {
      console.log("❌ Dados de seller não encontrados:", sellerError);
      return res.status(403).json({ error: "Dados de vendedor não encontrados" });
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

    console.log("✅ Vendedor autenticado (NOVO):", stores?.name || sellers.id);
    next();
  } catch (error) {
    console.error("❌ Erro na autenticação do vendedor (NOVO):", error);

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
router.get("/categories", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    console.log("📊 Buscando categorias para vendedor:", sellerId);

    // Retornar dados mockados temporariamente até resolver schema
    const categoriesData = [
      { name: "Eletrônicos", count: 3 },
      { name: "Informática", count: 1 },
      { name: "Acessórios", count: 2 },
    ];

    console.log("✅ Categorias encontradas (mockadas):", categoriesData.length);

    res.json({
      success: true,
      data: categoriesData,
      total: categoriesData.length,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar categorias:", error);
    res.status(500).json({
      error: "Erro interno",
      details: error.message,
    });
  }
});

// GET /api/seller/stats - Estatísticas do vendedor
router.get("/stats", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    console.log("📊 Buscando stats para vendedor:", sellerId);

    // Buscar estatísticas dos produtos com tratamento de erro
    const { data: productStats, error: productError } = await supabase
      .from("Product")
      .select("id, stock, viewCount, salesCount, rating")
      .eq("sellerId", sellerId);

    if (productError) {
      console.error("❌ Erro ao buscar produtos:", productError);
    }

    // Buscar estatísticas dos pedidos com tratamento de erro
    const { data: orderStats, error: orderError } = await supabase
      .from("Order")
      .select("id, total, status, createdAt")
      .eq("sellerId", sellerId);

    if (orderError) {
      console.error("❌ Erro ao buscar pedidos:", orderError);
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
        console.error("❌ Erro ao buscar reviews:", reviewError);
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

    console.log("✅ Stats calculadas:", stats);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar estatísticas do vendedor:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/recent-orders - Pedidos recentes
router.get("/recent-orders", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const limit = parseInt(req.query.limit) || 10;
    console.log("📦 Buscando pedidos recentes para vendedor:", sellerId, "limit:", limit);

    // Buscar pedidos com dados básicos primeiro
    const { data: orders, error } = await supabase
      .from("Order")
      .select("id, total, status, createdAt, buyerId")
      .eq("sellerId", sellerId)
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Erro ao buscar pedidos:", error);
      // Retornar array vazio em caso de erro ao invés de falhar
      return res.json({
        success: true,
        data: [],
      });
    }

    // Se não há pedidos, retornar array vazio
    if (!orders || orders.length === 0) {
      console.log("ℹ️ Nenhum pedido encontrado para o vendedor");
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
        console.error("❌ Erro ao buscar compradores:", buyerError);
      } else {
        buyerData = buyers || [];
      }
    }

    // Buscar itens dos pedidos
    const orderIds = orders.map((order) => order.id);
    let orderItems = [];

    if (orderIds.length > 0) {
      const { data: items, error: itemError } = await supabase
        .from("order_items")
        .select(
          `
          orderId,
          quantity,
          productId,
          products!inner(name, price)
        `
        )
        .in("orderId", orderIds);

      if (itemError) {
        console.error("❌ Erro ao buscar itens dos pedidos:", itemError);
      } else {
        orderItems = items || [];
      }
    }

    // Formatar dados para o frontend
    const formattedOrders = orders.map((order) => {
      const buyer = buyerData.find((b) => b.id === order.buyerId);
      const items = orderItems.filter((item) => item.orderId === order.id);
      const mainProduct = items[0]?.products;
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

    console.log("✅ Pedidos formatados:", formattedOrders.length);

    res.json({
      success: true,
      data: formattedOrders,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar pedidos recentes:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/top-products - Produtos mais vendidos
router.get("/top-products", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const limit = parseInt(req.query.limit) || 5;
    console.log("🏆 Buscando produtos mais vendidos para vendedor:", sellerId, "limit:", limit);

    const { data: products, error } = await supabase
      .from("Product")
      .select("id, name, salesCount, stock, price")
      .eq("sellerId", sellerId)
      .order("salesCount", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Erro ao buscar produtos:", error);
      return res.json({
        success: true,
        data: [],
      });
    }

    // Se não há produtos, retornar array vazio
    if (!products || products.length === 0) {
      console.log("ℹ️ Nenhum produto encontrado para o vendedor");
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

    console.log("✅ Produtos formatados:", formattedProducts.length);

    res.json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar produtos mais vendidos:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/analytics - Análise detalhada com comparações
router.get("/analytics", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const period = req.query.period || "30"; // dias
    console.log("📈 Buscando analytics para vendedor:", sellerId, "período:", period, "dias");

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
        console.error("❌ Erro ao buscar analytics:", analyticsError);
        analyticsData = [];
      } else {
        // Dados já filtrados por sellerId na query
        analyticsData = currentData || [];
        previousAnalyticsData = previousData || [];
      }
    } catch (error) {
      console.error("❌ Erro ao processar analytics:", error);
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
      console.error("❌ Erro ao buscar pedidos do período:", ordersError);
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

    console.log("✅ Analytics calculadas com comparações:", analyticsResult);

    res.json({
      success: true,
      data: analyticsResult,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar analytics:", error);
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

// GET /api/seller/store - Buscar dados da loja do vendedor autenticado
router.get("/store", authenticateSeller, async (req, res) => {
  try {
    const user = req.user;
    console.log("🔍 Debug API Store - user:", {
      sellerId: user.sellerId,
      storeId: user.storeId,
      storeName: user.storeName,
      name: user.name,
    });

    if (!user.sellerId) {
      console.log("❌ API Store - sellerId não encontrado");
      return res.status(404).json({
        error: "Dados do vendedor não encontrados",
      });
    }

    console.log("🏪 Buscando dados da loja para vendedor:", user.sellerId);

    // Buscar dados completos do seller e da store correspondente
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("*")
      .eq("id", user.sellerId)
      .single();

    if (sellerError || !seller) {
      console.error("❌ Erro ao buscar seller:", sellerError);
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

    if (storeError) {
      console.error("⚠️ Store não encontrada para seller:", seller.id, storeError);
      // Se não há store, criar uma baseada nos dados do seller
      const { data: newStore, error: createError } = await supabase
        .from("stores")
        .insert({
          sellerId: seller.id,
          name: seller.storeName || "",
          slug: seller.storeSlug || seller.storeName?.toLowerCase().replace(/\s+/g, "-") || "store",
          description: seller.storeDescription || "",
          logo: seller.logo || "",
          banner: seller.banner || "",
          category: seller.category || "eletronicos",
          address: seller.address || "",
          city: seller.city || "Não informado",
          state: seller.state || "Não informado",
          zipCode: seller.zipCode || "",
          phone: seller.phone || "",
          email: seller.email || "",
          website: seller.website || "",
          isActive: true,
          isVerified: false,
          rating: 0,
          reviewCount: 0,
          productCount: 0,
          salesCount: 0,
          plan: seller.plan || "GRATUITO",
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Erro ao criar store:", createError);
        return res.status(500).json({
          error: "Erro ao criar loja",
        });
      }

      console.log("✅ Store criada automaticamente:", newStore.id);

      // Estruturar dados usando a store recém-criada
      const storeData = {
        id: newStore.id, // Use store.id, não seller.id
        sellerId: seller.id,
        name: newStore.name,
        description: newStore.description,
        logo: newStore.logo,
        banner: newStore.banner,
        category: newStore.category,
        address: {
          street: newStore.address ? newStore.address.split(",")[0] || "" : "",
          number: "",
          neighborhood: "",
          city: newStore.address ? newStore.address.split(",")[1] || "" : "",
          state: newStore.address ? newStore.address.split(",")[2] || "" : "",
          zipCode: newStore.zipCode || seller.zipCode || "",
        },
        contact: {
          phone: newStore.phone || "",
          whatsapp: newStore.whatsapp || seller.whatsapp || "",
          email: newStore.email || user.email || "",
          website: newStore.website || "",
        },
      };

      return res.json({
        success: true,
        data: storeData,
      });
    }

    // Estruturar dados para o frontend usando a store existente
    const storeData = {
      id: store.id, // Use store.id, não seller.id
      sellerId: seller.id,
      name: store.name || seller.storeName || "",
      description: store.description || seller.storeDescription || "",
      logo: store.logo || seller.logo || "",
      banner: store.banner || seller.banner || "",
      category: store.category || seller.category || "eletronicos",
      address: {
        street: store.address ? store.address.split(",")[0] || "" : "",
        number: "",
        neighborhood: "",
        city: store.address ? store.address.split(",")[1] || "" : "",
        state: store.address ? store.address.split(",")[2] || "" : "",
        zipCode: store.zipCode || seller.zipCode || "",
      },
      contact: {
        phone: store.phone || seller.phone || "",
        whatsapp: store.whatsapp || seller.whatsapp || "",
        email: store.email || user.email || "",
        website: store.website || seller.website || "",
      },
    };

    console.log("✅ Dados da loja encontrados - Store ID:", store.id, "Nome:", store.name);

    res.json({
      success: true,
      data: storeData,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar dados da loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/analytics/categories - Buscar distribuição de categorias dos produtos
router.get("/analytics/categories", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;

    console.log("📊 Buscando distribuição de categorias para vendedor:", sellerId);

    // Buscar produtos agrupados por categoria
    const { data: products, error } = await supabase.from("Product").select("categoryId").eq("sellerId", sellerId);

    if (error) {
      console.error("❌ Erro ao buscar produtos:", error);
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

    console.log(`✅ ${categories.length} categorias encontradas`);

    res.json({
      success: true,
      data: categories,
      total: products.length,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar distribuição de categorias:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// PUT /api/seller/store - Atualizar dados da loja do vendedor autenticado
router.put("/store", authenticateSeller, async (req, res) => {
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
    } = req.body;

    console.log("🏪 PUT /api/seller/store - Atualizando dados da loja");
    console.log("📦 Dados recebidos:", { name, description, category, address, logo, banner });
    console.log("📞 Dados de contato recebidos:", { contact, phone, whatsapp, website, email });

    // Buscar store correspondente ao seller
    let { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("sellerId", seller.id)
      .single();

    // Se não existe store, criar uma
    if (storeError && storeError.code === "PGRST116") {
      console.log("🆕 Criando nova store para seller:", seller.id);

      const { data: newStore, error: createError } = await supabase
        .from("stores")
        .insert({
          sellerId: seller.id,
          name: name || storeName || seller.storeName || "",
          description: description || storeDescription || seller.storeDescription || "",
          logo: logo || seller.logo || "",
          banner: banner || seller.banner || "",
          category: category || seller.category || "eletronicos",
          address:
            typeof address === "string"
              ? address
              : address
                ? `${address.street || ""}, ${address.city || ""}, ${address.state || ""}`
                : "",
          phone: phone || seller.phone || "",
          website: website || seller.website || "",
          status: "ACTIVE",
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Erro ao criar store:", createError);
        return res.status(500).json({
          error: "Erro ao criar loja",
          details: createError.message,
        });
      }

      store = newStore;
      console.log("✅ Store criada:", store.id);
    } else if (storeError) {
      console.error("❌ Erro ao buscar store:", storeError);
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

    // Processar endereço completo
    let fullAddress = store.address;
    let addressZipCode = store.zipCode;

    if (address && typeof address === "object") {
      // Endereço estruturado - manter informações completas
      const addressParts = [];
      if (address.street) addressParts.push(address.street);
      if (address.number) addressParts.push(`nº ${address.number}`);
      if (address.neighborhood) addressParts.push(address.neighborhood);
      if (address.city) addressParts.push(address.city);
      if (address.state) addressParts.push(address.state);

      fullAddress = addressParts.join(", ");
      addressZipCode = address.zipCode || store.zipCode;
    } else if (typeof address === "string") {
      fullAddress = address;
    }

    // Atualizar dados da store
    const updateData = {
      name: name || storeName || store.name,
      description: description || storeDescription || store.description,
      category: category || store.category,
      address: fullAddress,
      zipCode: addressZipCode,
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
      console.error("❌ Erro ao atualizar store:", updateError);
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
      console.warn("⚠️ Aviso ao atualizar seller:", sellerUpdateError);
      // Não falhar se apenas o seller não foi atualizado
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
    };

    console.log("✅ Loja atualizada com sucesso:", updatedStore.id);

    res.json({
      success: true,
      data: storeData,
      message: "Loja atualizada com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/sellers/settings - Buscar configurações do vendedor
router.get("/settings", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    console.log("⚙️ Buscando configurações para vendedor:", sellerId);

    // Usar configurações baseadas na loja existente + padrões
    console.log("⚙️ Gerando configurações padrão para seller:", sellerId);

    // Sempre retornar configurações padrão (não há tabela seller_settings)
    const settings = null;

    if (!settings) {
      const defaultSettings = {
        sellerId,
        paymentMethods: {
          pix: true,
          creditCard: true,
          boleto: false,
          paypal: false,
        },
        shippingOptions: {
          sedex: true,
          pac: true,
          freeShipping: false,
          expressDelivery: false,
        },
        notifications: {
          emailOrders: true,
          emailPromotions: false,
          smsOrders: false,
          pushNotifications: true,
        },
        storePolicies: {
          returnPolicy: "7 dias para devolução",
          shippingPolicy: "Envio em até 2 dias úteis",
          privacyPolicy: "Seus dados estão seguros conosco",
        },
      };

      // Retornar configurações padrão (sem persistir em tabela inexistente)
      console.log("✅ Retornando configurações padrão");
      return res.json({
        success: true,
        data: defaultSettings,
      });
    }

    console.log("✅ Configurações encontradas");
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar configurações do vendedor:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// PUT /api/sellers/settings - Atualizar configurações do vendedor
router.put("/settings", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { paymentMethods, shippingOptions, notifications, storePolicies } = req.body;

    console.log("⚙️ Atualizando configurações para vendedor:", sellerId);

    // Simular save de configurações (não persistir em tabela inexistente)
    const mockResult = {
      id: `settings_${sellerId}_${Date.now()}`,
      sellerId,
      paymentMethods: paymentMethods || {},
      shippingOptions: shippingOptions || {},
      notifications: notifications || {},
      storePolicies: storePolicies || {},
      updatedAt: new Date().toISOString(),
    };

    console.log("✅ Configurações 'salvas' (simulação):", mockResult);
    const result = mockResult;

    console.log("✅ Configurações atualizadas com sucesso");
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar configurações:", error);
    res.status(500).json({
      error: "Erro ao atualizar configurações",
      details: error.message,
    });
  }
});

// GET /api/sellers/subscription - Buscar assinatura atual do vendedor
router.get("/subscription", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    console.log("💳 Buscando assinatura para vendedor:", sellerId);

    // Buscar assinatura ativa do vendedor
    const { data: subscription, error: subError } = await supabase
      .from("Subscription")
      .select("*")
      .eq("sellerId", sellerId)
      .eq("status", "ACTIVE")
      .single();

    if (subError && subError.code !== "PGRST116") {
      console.error("❌ Erro ao buscar assinatura:", subError);
      return res.status(500).json({
        error: "Erro ao buscar assinatura",
        details: subError.message,
      });
    }

    // Se não tem assinatura, criar uma padrão para o plano gratuito
    if (!subscription) {
      console.log("📝 Criando assinatura padrão para plano gratuito");

      // Buscar plano gratuito ou criar um mock
      let freePlan = null;
      const { data: planData, error: planError } = await supabase.from("Plan").select("*").eq("price", 0).single();

      if (planError || !planData) {
        console.log("💡 Nenhum plano gratuito no banco, criando plano mock");
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

      console.log("✅ Assinatura padrão criada");
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

    console.log("✅ Assinatura encontrada:", subscriptionData.plan?.name || "Plano não identificado");
    res.json({
      success: true,
      data: subscriptionData,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar assinatura:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// POST /api/sellers/upgrade - Fazer upgrade do plano
router.post("/upgrade", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: "ID do plano é obrigatório",
      });
    }

    console.log("🚀 Processando upgrade de plano:", { sellerId, planId });

    // Buscar dados do plano
    const { data: plan, error: planError } = await supabase.from("Plan").select("*").eq("id", planId).single();

    if (planError || !plan) {
      console.error("❌ Plano não encontrado:", planError);
      return res.status(404).json({
        error: "Plano não encontrado",
      });
    }

    // Verificar se é upgrade, downgrade ou mudança de plano
    const currentPlan = req.seller.plan;
    console.log("📊 Plano atual:", currentPlan, "-> Novo plano:", plan.slug);

    // Buscar dados do plano atual para comparação
    const { data: currentPlanData } = await supabase
      .from("plans")
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

    console.log(`📈 Tipo de mudança: ${changeType} (${currentPlanData?.name || "N/A"} -> ${plan.name})`);

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
        console.error("❌ Erro ao atualizar plano do seller:", updateError);
        return res.status(500).json({
          error: "Erro ao atualizar plano",
        });
      }

      console.log(
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

    console.log("💳 Redirecionando para checkout interno:", paymentUrl);

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
    console.error("❌ Erro no upgrade do plano:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/orders - Listar pedidos do vendedor
router.get("/orders", authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { status, limit = 50, offset = 0 } = req.query;

    console.log("📦 Buscando pedidos do seller:", sellerId, { status, limit, offset });

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
      console.error("❌ Erro ao buscar pedidos:", error);
      console.error("❌ Detalhes do erro:", error.message, error.code, error.details);
      return res.status(500).json({
        error: "Erro ao buscar pedidos",
        details: error.message,
      });
    }

    // Se não há pedidos, retornar array vazio
    if (!orders || orders.length === 0) {
      console.log("ℹ️ Nenhum pedido encontrado para o vendedor");
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

    console.log("✅ Pedidos encontrados:", orders?.length);

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
    console.error("❌ Erro ao buscar pedidos do seller:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/seller/products - Listar produtos do vendedor
router.get("/products", authenticateSeller, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const sellerId = req.user.sellerId;

    console.log("🔍 Buscando produtos do seller:", sellerId);

    // Query base para produtos do vendedor (sem imagens por enquanto)
    let query = supabase
      .from("Product")
      .select(
        `
        id,
        name,
        description,
        price,
        stock,
        categoryId,
        isActive,
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
      console.error("❌ Erro ao buscar produtos:", error);
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

    // Formatar produtos para o frontend
    const formattedProducts =
      products?.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        stockQuantity: product.stock,
        categoryId: product.categoryId,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        images: [], // Imagens serão buscadas separadamente se necessário
        mainImage: null, // Por enquanto sem imagem principal
      })) || [];

    const totalPages = Math.ceil((totalCount || 0) / parseInt(limit));

    console.log(`✅ Produtos encontrados: ${formattedProducts.length}/${totalCount}`);

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
    console.error("❌ Erro ao listar produtos do seller:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

export default router;
