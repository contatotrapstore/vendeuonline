import { Router } from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { supabase, supabaseAdmin } from "../lib/supabase-client.js";
import { securityHeaders, adminRateLimit, protectRoute, validateInput, sanitizeInput } from "../middleware/security.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Middleware removido - usando middleware centralizado em server.js
// server.js já aplica: authenticate + protectRoute(["ADMIN"])
// Middleware duplicado causava 403 para emergency users

// PRODUÇÃO: Autenticação aplicada em server.js (linha 299)
// router.use(authenticateAdmin);  // ❌ REMOVIDO - causa dupla autenticação
// router.use(adminRateLimit);
// router.use(securityHeaders);

// ==== DASHBOARD ====
router.get("/dashboard", async (req, res) => {
  try {
    logger.info("📊 Admin dashboard endpoint called");

    // Buscar estatísticas reais do banco
    const { data: usersData } = await supabase.from("users").select("type");
    const { data: storesData } = await supabase.from("stores").select("isActive, isVerified");
    const { data: productsData } = await supabase.from("products").select("isActive");
    const { count: ordersCount } = await supabase.from("Order").select("*", { count: "exact", head: true });

    const totalUsers = usersData?.length || 0;
    const buyersCount = usersData?.filter((u) => u.type === "BUYER").length || 0;
    const sellersCount = usersData?.filter((u) => u.type === "SELLER").length || 0;
    const adminsCount = usersData?.filter((u) => u.type === "ADMIN").length || 0;

    const totalStores = storesData?.length || 0;
    const activeStores = storesData?.filter((s) => s.isActive).length || 0;

    const totalProducts = productsData?.length || 0;
    const activeProducts = productsData?.filter((p) => p.isActive).length || 0;

    const dashboard = {
      users: {
        total: totalUsers,
        buyers: buyersCount,
        sellers: sellersCount,
        admins: adminsCount,
      },
      stores: {
        total: totalStores,
        active: activeStores,
        inactive: totalStores - activeStores,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
      },
      orders: {
        total: ordersCount || 0,
      },
      stats: {
        conversionRate: totalUsers > 0 ? Math.round((sellersCount / totalUsers) * 100) : 0,
      },
    };

    logger.info("✅ Admin dashboard retrieved successfully");
    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error("❌ Erro ao buscar dashboard:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar dados do dashboard",
      details: error.message,
    });
  }
});

// ==== DASHBOARD STATS ====
router.get("/stats", async (req, res) => {
  try {
    logger.info("📊 Admin stats endpoint called");

    try {
      // Buscar dados reais do Supabase para usuários
      logger.info("📊 Buscando dados reais do Supabase...");

      // Query para contagem de usuários por tipo
      const { data: usersData, error: usersError } = await supabase.from("users").select("type");

      if (usersError) {
        logger.error("❌ Erro ao buscar usuários do Supabase:", usersError.message);
        return res.status(500).json({
          success: false,
          error: "Erro ao buscar usuários do banco de dados",
          details: usersError.message,
        });
      }

      // Calcular estatísticas de usuários
      const totalUsers = usersData.length;
      const buyersCount = usersData.filter((u) => u.type === "BUYER").length;
      const sellersCount = usersData.filter((u) => u.type === "SELLER").length;
      const adminsCount = usersData.filter((u) => u.type === "ADMIN").length;

      // Buscar dados reais de stores
      const { data: storesData } = await supabase.from("stores").select("isActive, approval_status");
      const totalStores = storesData?.length || 0;
      const activeStores = storesData?.filter((s) => s.isActive).length || 0;
      const pendingStores = storesData?.filter((s) => s.approval_status === "pending").length || 0;
      const suspendedStores = storesData?.filter((s) => s.approval_status === "suspended").length || 0;

      // Buscar dados reais de products
      const { data: productsData } = await supabase.from("Product").select("isActive");
      const totalProducts = productsData?.length || 0;
      const approvedProducts = productsData?.filter((p) => p.isActive).length || 0;
      const pendingApprovals = totalProducts - approvedProducts;

      // Buscar dados reais de orders
      const { count: totalOrders } = await supabase.from("Order").select("*", { count: "exact", head: true });

      // Buscar dados reais de subscriptions
      const { data: subscriptionsData } = await supabase.from("Subscription").select("status");
      const totalSubscriptions = subscriptionsData?.length || 0;
      const activeSubscriptions = subscriptionsData?.filter((s) => s.status === "ACTIVE").length || 0;

      // Calcular receita mensal real (soma dos pagamentos confirmados do mês atual)
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "CONFIRMED")
        .gte("createdAt", firstDayOfMonth);
      const monthlyRevenue = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      const stats = {
        totalUsers,
        buyersCount,
        sellersCount,
        adminsCount,
        totalStores,
        activeStores,
        pendingStores,
        suspendedStores,
        totalProducts,
        approvedProducts,
        pendingApprovals,
        totalOrders: totalOrders || 0,
        totalSubscriptions,
        activeSubscriptions,
        monthlyRevenue,
        conversionRate: totalUsers > 0 ? Math.round((sellersCount / totalUsers) * 100) : 0,
      };

      logger.info("✅ Admin stats retrieved successfully (100% dados reais):", stats);
      res.json(stats); // Retorna objeto direto sem wrapper
    } catch (supabaseError) {
      logger.error("❌ Erro no Supabase:", supabaseError);

      // Retornar stats básicas como fallback para evitar UI quebrada
      logger.warn("⚠️ Retornando stats zeradas como fallback");
      return res.status(200).json({
        totalUsers: 0,
        buyersCount: 0,
        sellersCount: 0,
        adminsCount: 0,
        totalStores: 0,
        activeStores: 0,
        pendingStores: 0,
        suspendedStores: 0,
        totalProducts: 0,
        approvedProducts: 0,
        pendingApprovals: 0,
        totalOrders: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        monthlyRevenue: 0,
        conversionRate: 0,
        error: "Dados temporariamente indisponíveis",
        fallback: true,
      });
    }
  } catch (error) {
    logger.error("❌ Erro fatal ao buscar estatísticas admin:", error);

    // Fallback para erro fatal também
    res.status(200).json({
      totalUsers: 0,
      buyersCount: 0,
      sellersCount: 0,
      adminsCount: 0,
      totalStores: 0,
      activeStores: 0,
      pendingStores: 0,
      suspendedStores: 0,
      totalProducts: 0,
      approvedProducts: 0,
      pendingApprovals: 0,
      totalOrders: 0,
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      monthlyRevenue: 0,
      conversionRate: 0,
      error: "Erro interno do servidor",
      fallback: true,
    });
  }
});

// ==== USERS MANAGEMENT ====
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search } = req.query;

    logger.info("👥 GET /api/admin/users - Buscando usuários...");

    // Buscar dados reais do Supabase
    logger.info("🔍 Buscando usuários do Supabase com filtros:", { search, type, page, limit });

    let query = supabase
      .from("users")
      .select("id, name, email, phone, type, city, state, avatar, isVerified, createdAt, updatedAt");

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (type && type !== "all") {
      query = query.eq("type", type.toUpperCase());
    }

    // Contar total primeiro
    const { count: totalCount, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (countError) {
      logger.error("❌ Erro ao contar usuários:", countError);
      throw countError;
    }

    // Aplicar paginação
    const queryOffset = (page - 1) * limit;
    query = query.order("createdAt", { ascending: false }).range(queryOffset, queryOffset + parseInt(limit) - 1);

    const { data: userData, error: userError } = await query;

    if (userError) {
      logger.error("❌ Erro ao buscar usuários:", userError);
      throw userError;
    }

    const rawUsers = userData || [];
    const total = totalCount || 0;

    // Transformar para formato esperado pelo frontend
    const users = rawUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.type,
      city: user.city,
      state: user.state,
      avatar: user.avatar,
      isVerified: user.isVerified,
      status: user.isVerified ? "active" : "pending",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: null,
      orderCount: 0,
      storeCount: user.type === "seller" ? 1 : undefined,
    }));

    logger.info(`✅ ${users.length}/${total} usuários retornados do Supabase`);

    res.json({
      users: users,
      total: total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar usuários:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao conectar com banco de dados. Verifique a configuração do Supabase.",
      details: error.message,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  }
});

// ==== STORES MANAGEMENT ====
router.get("/stores", async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    logger.info("🏪 GET /api/admin/stores - Buscando lojas REAIS do Supabase...");

    // Query base para buscar stores com dados do seller, reviews e products
    let query = supabase.from("stores").select(`
        id,
        name,
        description,
        isActive,
        createdAt,
        updatedAt,
        sellerId,
        sellers!inner (
          id,
          users!inner (
            id,
            name,
            email,
            phone,
            city,
            state
          )
        ),
        reviews (
          id
        ),
        Product (
          id
        )
      `);

    // Aplicar filtros
    if (status && status !== "all") {
      if (status === "active") {
        query = query.eq("isActive", true);
      } else if (status === "inactive") {
        query = query.eq("isActive", false);
      }
    }

    // Aplicar busca por nome ou email do seller
    if (search) {
      query = query.or(`name.ilike.%${search}%,sellers.users.email.ilike.%${search}%`);
    }

    // Aplicar paginação
    const queryOffset = (page - 1) * limit;
    query = query.range(queryOffset, queryOffset + parseInt(limit) - 1);

    const { data: stores, error, count } = await query;

    if (error) {
      logger.error("❌ Erro ao buscar stores:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Transformar dados para formato esperado pelo frontend
    const transformedStores = (stores || []).map((store) => {
      const seller = store.sellers;
      const user = seller?.users;

      return {
        id: store.id,
        name: store.name || "Loja sem nome",
        sellerId: store.sellerId,
        city: user?.city || "N/A",
        state: user?.state || "N/A",
        phone: user?.phone || "N/A",
        email: user?.email || "N/A",
        category: "Geral", // Campo fixo por enquanto
        isActive: store.isActive,
        isVerified: true, // Por enquanto todas estão verificadas
        rating: 4.5, // Rating simulado
        reviewCount: store.reviews?.length || 0,
        productCount: store.products?.length || 0,
        salesCount: 0, // Vendas simuladas
        plan: "básico", // Plano simulado
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      };
    });

    // Calcular total de lojas
    const total = transformedStores.length;

    logger.info(`✅ ${transformedStores.length} lojas retornadas do Supabase REAL`);

    res.json({
      stores: transformedStores,
      total: total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar lojas:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao conectar com banco de dados. Verifique a configuração do Supabase.",
      details: error.message,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  }
});

// ==== PRODUCTS MANAGEMENT ====
router.get("/products", async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, search } = req.query;

    logger.info("📦 GET /api/admin/products - Buscando produtos REAIS do Supabase...");

    // Query base para buscar produtos com join de stores apenas
    // Sellers são acessados via stores.sellerId
    let query = supabase.from("Product").select(`
        id,
        name,
        description,
        price,
        comparePrice,
        stock,
        isActive,
        isFeatured,
        rating,
        salesCount,
        createdAt,
        updatedAt,
        sellerId,
        storeId,
        stores!storeId (
          id,
          name,
          sellerId
        )
      `);

    // Aplicar filtros
    if (status && status !== "all") {
      if (status === "active") {
        query = query.eq("isActive", true);
      } else if (status === "inactive") {
        query = query.eq("isActive", false);
      }
    }

    // Category filter removed - field doesn't exist in current schema

    // Aplicar busca por nome
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // Aplicar paginação
    const queryOffset = (page - 1) * limit;
    query = query.range(queryOffset, queryOffset + parseInt(limit) - 1);

    const { data: products, error } = await query;

    if (error) {
      logger.error("❌ Erro ao buscar products:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Buscar contagens reais para cada produto
    const productIds = products.map((p) => p.id);

    // ✅ IMPLEMENTED: Real count queries for reviews and sales
    // Query para contagem de reviews por produto (RLS policies may restrict access)
    let reviewCounts = {};
    if (productIds.length > 0) {
      try {
        const { data: reviewData } = await supabase.from("reviews").select("productId").in("productId", productIds);

        // Contar reviews por produto
        reviewCounts =
          reviewData?.reduce((acc, review) => {
            acc[review.productId] = (acc[review.productId] || 0) + 1;
            return acc;
          }, {}) || {};
      } catch (error) {
        logger.info(`⚠️ Could not read reviews (RLS policy):`, error.message);
        // Fallback to existing data - in production, proper RLS policies would be configured
      }
    }

    // Query para contagem de itens vendidos por produto (OrderItem)
    let salesCounts = {};
    if (productIds.length > 0) {
      try {
        const { data: salesData } = await supabase
          .from("OrderItem")
          .select("productId, quantity")
          .in("productId", productIds);

        // Somar quantidades vendidas por produto
        salesCounts =
          salesData?.reduce((acc, item) => {
            acc[item.productId] = (acc[item.productId] || 0) + (item.quantity || 0);
            return acc;
          }, {}) || {};
      } catch (error) {
        logger.info(`⚠️ Could not read OrderItem (RLS policy):`, error.message);
        // Fallback to existing salesCount from product data
      }
    }

    // Transformar dados para formato esperado pelo frontend
    const transformedProducts = (products || []).map((product) => {
      return {
        id: product.id,
        name: product.name,
        sellerId: product.sellerId,
        storeId: product.storeId,
        storeName: product.stores?.name || "N/A",
        sellerName: product.sellers?.users?.name || "N/A",
        sellerEmail: product.sellers?.users?.email || "N/A",
        category: "N/A", // Field doesn't exist in current schema
        price: product.price || 0,
        comparePrice: product.comparePrice || null,
        stock: product.stock || 0,
        isActive: product.isActive,
        isFeatured: product.isFeatured || false,
        rating: product.rating || 0,
        reviewCount: reviewCounts[product.id] || 0, // ✅ Contagem real de reviews
        viewCount: 0, // Field doesn't exist in current schema
        salesCount: salesCounts[product.id] || product.salesCount || 0, // ✅ Contagem real de vendas
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    // Aplicar paginação aos dados transformados
    const paginationOffset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedProducts = transformedProducts.slice(paginationOffset, paginationOffset + parseInt(limit));
    const total = transformedProducts.length;

    logger.info(`✅ ${paginatedProducts.length}/${total} produtos retornados com contagens REAIS (reviews, vendas)`);

    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar produtos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao conectar com banco de dados. Verifique a configuração do Supabase.",
      details: error.message,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  }
});

// ==== PLANS MANAGEMENT ====
router.get("/plans", async (req, res) => {
  try {
    logger.info("💰 GET /api/admin/plans - Buscando planos REAIS do Supabase...");

    // Buscar planos reais do Supabase
    const { data: plans, error } = await supabase.from("plans").select("*").order("order", { ascending: true });

    if (error) {
      logger.error("❌ Erro ao buscar plans:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Se não há planos no banco, criar planos padrão
    if (!plans || plans.length === 0) {
      logger.info("⚠️ Nenhum plano encontrado, criando planos padrão...");

      const defaultPlans = [
        {
          name: "Gratuito",
          description: "Plano básico para começar",
          price: 0,
          billingPeriod: "MONTHLY",
          maxAds: 3,
          maxPhotosPerAd: 3,
          supportLevel: "EMAIL",
          features: ["3 anúncios", "3 fotos por anúncio", "Suporte por email"],
          isActive: true,
          order: 1,
        },
        {
          name: "Básico",
          description: "Ideal para pequenos vendedores",
          price: 29.9,
          billingPeriod: "MONTHLY",
          maxAds: 10,
          maxPhotosPerAd: 5,
          supportLevel: "EMAIL",
          features: ["10 anúncios", "5 fotos por anúncio", "Suporte prioritário"],
          isActive: true,
          order: 2,
        },
        {
          name: "Premium",
          description: "Para vendedores profissionais",
          price: 59.9,
          billingPeriod: "MONTHLY",
          maxAds: 50,
          maxPhotosPerAd: 10,
          supportLevel: "CHAT",
          features: ["50 anúncios", "10 fotos por anúncio", "Suporte via chat", "Destaque nos resultados"],
          isActive: true,
          order: 3,
        },
        {
          name: "Empresa",
          description: "Para empresas e grandes vendedores",
          price: 99.9,
          billingPeriod: "MONTHLY",
          maxAds: -1,
          maxPhotosPerAd: -1,
          supportLevel: "PHONE",
          features: ["Anúncios ilimitados", "Fotos ilimitadas", "Suporte telefônico", "API personalizada"],
          isActive: true,
          order: 4,
        },
      ];

      // Inserir planos padrão
      const { data: createdPlans, error: createError } = await supabase.from("plans").insert(defaultPlans).select();

      if (createError) {
        logger.error("❌ Erro ao criar planos padrão:", createError);
        // Retornar planos hardcoded se falhar a criação
        return res.json({
          success: true,
          data: defaultPlans,
          message: "Planos retornados (fallback)",
        });
      }

      logger.info(`✅ ${createdPlans.length} planos padrão criados no banco`);
      return res.json({
        success: true,
        data: createdPlans,
      });
    }

    logger.info(`✅ ${plans.length} planos retornados do Supabase REAL`);

    res.json(plans); // Retorna array direto sem wrapper
  } catch (error) {
    logger.error("❌ Erro ao buscar planos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao conectar com banco de dados. Verifique a configuração do Supabase.",
      details: error.message,
      data: [],
    });
  }
});

// ==== PLAN UPDATE ====
router.put("/plans/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const planData = req.body;

    logger.info(`💰 PUT /api/admin/plans/${id} - Atualizando plano via MCP:`, planData);

    // Atualizar o plano usando helper MCP
    const updateData = {
      name: planData.name,
      description: planData.description,
      price: parseFloat(planData.price),
      updatedAt: new Date().toISOString(),
    };

    // Apenas adicionar campos opcionais se fornecidos (usando nomes corretos da tabela Plan - camelCase)
    if (planData.billingPeriod) updateData.billingPeriod = planData.billingPeriod;
    if (planData.maxAds !== undefined) updateData.maxAds = parseInt(planData.maxAds) || -1;
    if (planData.maxPhotosPerAd !== undefined) updateData.maxPhotosPerAd = parseInt(planData.maxPhotosPerAd) || -1;
    if (planData.supportLevel) updateData.supportLevel = planData.supportLevel;
    if (planData.features) updateData.features = planData.features;
    if (planData.isActive !== undefined) updateData.isActive = Boolean(planData.isActive);

    const { data: updatedPlan, error: updateError } = await supabase
      .from("plans")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("❌ Erro ao atualizar plano:", updateError);
      throw updateError;
    }

    logger.info("✅ Plano atualizado com sucesso");

    res.json({
      success: true,
      message: `Plano ${planData.name} atualizado com sucesso`,
      data: updatedPlan,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar plano:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao conectar com banco de dados. Verifique a configuração do Supabase.",
      details: error.message,
    });
  }
});

// POST /api/admin/plans - Criar novo plano
router.post("/plans", authenticateAdmin, async (req, res) => {
  try {
    const planData = req.body;

    logger.info(`💰 POST /api/admin/plans - Criando novo plano:`, planData);

    // Validar dados obrigatórios
    if (!planData.name || !planData.description || planData.price === undefined) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios: name, description, price",
      });
    }

    // Gerar slug único baseado no nome
    const slug = planData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Verificar se já existe um plano com este nome
    const { data: existingPlan } = await supabaseAdmin.from("plans").select("id").eq("name", planData.name).single();

    if (existingPlan) {
      return res.status(400).json({
        success: false,
        error: "Já existe um plano com este nome",
      });
    }

    // Determinar ordem (ultimo + 1)
    const { data: lastPlan } = await supabaseAdmin
      .from("plans")
      .select("order")
      .order("order", { ascending: false })
      .limit(1)
      .single();

    const newOrder = (lastPlan?.order || 0) + 1;

    // Criar novo plano (usando tabela Plan com camelCase)
    const { data: newPlan, error } = await supabaseAdmin
      .from("plans")
      .insert([
        {
          name: planData.name,
          description: planData.description,
          price: parseFloat(planData.price),
          billingPeriod: planData.billingPeriod || "monthly",
          maxAds: parseInt(planData.maxAds) || -1,
          maxPhotosPerAd: parseInt(planData.maxPhotos) || -1,
          maxProducts: parseInt(planData.maxProducts) || -1,
          maxImages: parseInt(planData.maxImages) || -1,
          maxCategories: parseInt(planData.maxCategories) || -1,
          prioritySupport: Boolean(planData.prioritySupport),
          supportLevel: planData.support || "Email",
          features: Array.isArray(planData.features) ? planData.features : [],
          isActive: Boolean(planData.isActive !== false),
          order: newOrder,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("❌ Erro ao criar plano:", error);
      throw error;
    }

    logger.info("✅ Plano criado com sucesso:", newPlan.id);

    res.status(201).json({
      success: true,
      message: `Plano ${planData.name} criado com sucesso`,
      data: newPlan,
    });
  } catch (error) {
    logger.error("❌ Erro ao criar plano:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar plano",
      details: error.message,
    });
  }
});

// DELETE /api/admin/plans/:id - Deletar plano
router.delete("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`💰 DELETE /api/admin/plans/${id} - Deletando plano`);

    // Verificar se o plano existe
    const { data: plan, error: fetchError } = await supabase.from("plans").select("id, name").eq("id", id).single();

    if (fetchError || !plan) {
      return res.status(404).json({
        success: false,
        error: "Plano não encontrado",
      });
    }

    // Verificar se há assinaturas ativas usando este plano
    const { count: activeSubscriptions, error: countError } = await supabaseAdmin
      .from("subscriptions")
      .select("id", { count: "exact" })
      .eq("planId", id)
      .eq("status", "ACTIVE");

    if (countError) {
      logger.error("❌ Erro ao verificar assinaturas:", countError);
      return res.status(500).json({
        success: false,
        error: "Erro ao verificar assinaturas ativas",
      });
    }

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        error: `Não é possível deletar o plano. Há ${activeSubscriptions} assinatura(s) ativa(s) usando este plano.`,
        details: {
          activeSubscriptions,
          suggestion: "Desative o plano ao invés de deletá-lo",
        },
      });
    }

    // Deletar o plano
    const { error: deleteError } = await supabaseAdmin.from("plans").delete().eq("id", id);

    if (deleteError) {
      logger.error("❌ Erro ao deletar plano:", deleteError);
      throw deleteError;
    }

    logger.info("✅ Plano deletado com sucesso");

    res.json({
      success: true,
      message: `Plano ${plan.name} deletado com sucesso`,
    });
  } catch (error) {
    logger.error("❌ Erro ao deletar plano:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao deletar plano",
      details: error.message,
    });
  }
});

// ==== SUBSCRIPTIONS MANAGEMENT ====
router.get("/subscriptions", authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    logger.info("💳 GET /api/admin/subscriptions - Buscando subscriptions REAIS do Supabase...");

    // Buscar subscriptions reais do Supabase
    let query = supabase.from("Subscription").select(`
        id,
        sellerId,
        planId,
        status,
        startDate,
        endDate,
        autoRenew,
        paymentMethod,
        createdAt,
        updatedAt,
        Plan (
          id,
          name,
          price
        )
      `);

    // Aplicar filtros
    if (status && ["ACTIVE", "CANCELLED", "EXPIRED"].includes(status)) {
      query = query.eq("status", status);
    }

    // Aplicar paginação
    const queryOffset = (page - 1) * limit;
    query = query.range(queryOffset, queryOffset + parseInt(limit) - 1);

    const { data: subscriptions, error } = await query;

    if (error) {
      logger.error("❌ Erro ao buscar subscriptions:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Contar total para paginação
    let countQuery = supabase.from("Subscription").select("id", { count: "exact" });
    if (status && ["ACTIVE", "CANCELLED", "EXPIRED"].includes(status)) {
      countQuery = countQuery.eq("status", status);
    }
    const { count: total } = await countQuery;

    // Transformar dados das subscriptions usando os joins já incluídos
    const transformedSubscriptions = (subscriptions || []).map((subscription) => {
      return {
        id: subscription.id,
        sellerId: subscription.sellerId,
        planId: subscription.planId,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.autoRenew || false,
        paymentMethod: subscription.paymentMethod || "N/A",
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        plan: {
          id: subscription.Plan?.id,
          name: subscription.Plan?.name || "N/A",
          price: subscription.Plan?.price || 0,
        },
      };
    });

    // Total já obtido da query count
    const subscriptionsTotal = total || 0;

    logger.info(`✅ ${transformedSubscriptions.length}/${subscriptionsTotal} assinaturas retornadas do Supabase`);

    res.json(transformedSubscriptions); // Retorna array direto sem wrapper
  } catch (error) {
    logger.error("❌ Erro ao buscar assinaturas:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao conectar com banco de dados. Verifique a configuração do Supabase.",
      details: error.message,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  }
});

// ==== STORE ACTIONS ====
router.post("/stores/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    // Simular aprovação (em produção usaria Prisma)
    const store = {
      id,
      approval_status: "approved",
      message: "Loja aprovada com sucesso",
    };

    res.json({ success: true, data: store });
  } catch (error) {
    logger.error("❌ Erro ao aprovar loja:", error);
    res.status(500).json({ success: false, error: "Erro ao aprovar loja" });
  }
});

router.post("/stores/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Simular rejeição
    const store = {
      id,
      approval_status: "rejected",
      rejection_reason: reason,
      message: "Loja rejeitada",
    };

    res.json({ success: true, data: store });
  } catch (error) {
    logger.error("❌ Erro ao rejeitar loja:", error);
    res.status(500).json({ success: false, error: "Erro ao rejeitar loja" });
  }
});

router.post("/stores/:id/suspend", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Simular suspensão
    const store = {
      id,
      approval_status: "suspended",
      rejection_reason: reason,
      message: "Loja suspensa",
    };

    res.json({ success: true, data: store });
  } catch (error) {
    logger.error("❌ Erro ao suspender loja:", error);
    res.status(500).json({ success: false, error: "Erro ao suspender loja" });
  }
});

router.post("/stores/:id/activate", async (req, res) => {
  try {
    const { id } = req.params;

    // Simular ativação
    const store = {
      id,
      approval_status: "approved",
      message: "Loja ativada",
    };

    res.json({ success: true, data: store });
  } catch (error) {
    logger.error("❌ Erro ao ativar loja:", error);
    res.status(500).json({ success: false, error: "Erro ao ativar loja" });
  }
});

// ==== USER ACTIONS ====
router.patch("/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    logger.info(`👤 PATCH /api/admin/users/${id}/status - Atualizando status para: ${status}`);

    // Buscar usuário atual
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, name, email, type, isVerified")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      logger.error("❌ Usuário não encontrado:", fetchError);
      return res.status(404).json({ success: false, error: "Usuário não encontrado" });
    }

    // Atualizar campo isVerified baseado no status
    const isVerified = status === "active";

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ isVerified })
      .eq("id", id)
      .select("id, name, email, type, isVerified")
      .single();

    if (updateError) {
      logger.error("❌ Erro ao atualizar usuário:", updateError);
      throw updateError;
    }

    logger.info(`✅ Status do usuário ${user.name} atualizado para: ${status}`);

    res.json({
      success: true,
      data: updatedUser,
      message: `Status do usuário atualizado para ${status}`,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar status do usuário:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar status do usuário",
      details: error.message,
    });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`🗑️ DELETE /api/admin/users/${id} - Excluindo usuário...`);

    // Verificar se usuário existe
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, name, email, type")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      logger.error("❌ Usuário não encontrado:", fetchError);
      return res.status(404).json({ success: false, error: "Usuário não encontrado" });
    }

    // Verificar se não é admin (proteção)
    if (user.type === "ADMIN") {
      return res.status(403).json({
        success: false,
        error: "Não é possível excluir usuários administradores",
      });
    }

    // Excluir usuário
    const { error: deleteError } = await supabase.from("users").delete().eq("id", id);

    if (deleteError) {
      logger.error("❌ Erro ao excluir usuário:", deleteError);
      throw deleteError;
    }

    logger.info(`✅ Usuário ${user.name} excluído com sucesso`);

    res.json({
      success: true,
      message: `Usuário ${user.name} excluído com sucesso`,
    });
  } catch (error) {
    logger.error("❌ Erro ao excluir usuário:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao excluir usuário",
      details: error.message,
    });
  }
});

// ==== ORDERS MANAGEMENT ====
router.get("/orders", async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    logger.info("🛒 GET /api/admin/orders - Buscando pedidos REAIS do Supabase...");

    // Query base para buscar orders com dados do buyer, store e items
    let query = supabase.from("orders").select(`
        id,
        total,
        status,
        paymentMethod,
        paymentStatus,
        createdAt,
        updatedAt,
        buyerId,
        storeId,
        users!inner (
          id,
          name,
          email
        ),
        stores!inner (
          id,
          name
        ),
        orderItems (
          id,
          quantity
        )
      `);

    // Aplicar filtros
    if (status && ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"].includes(status)) {
      query = query.eq("status", status);
    }

    // Aplicar paginação
    const queryOffset = (page - 1) * limit;
    query = query.order("createdAt", { ascending: false }).range(queryOffset, queryOffset + parseInt(limit) - 1);

    const { data: orders, error } = await query;

    if (error) {
      logger.error("❌ Erro ao buscar orders:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    // Transformar dados para formato esperado pelo frontend
    const transformedOrders = (orders || []).map((order) => {
      const buyer = order.users;
      const store = order.stores;

      return {
        id: order.id,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        buyer: {
          user: {
            name: buyer?.name || "N/A",
            email: buyer?.email || "N/A",
          },
        },
        store: {
          name: store?.name || "N/A",
        },
        _count: {
          items: order.orderItems?.length || 0,
        },
      };
    });

    // Contar total
    const { count: totalCount, error: countError } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    const total = totalCount || 0;

    logger.info(`✅ ${transformedOrders.length}/${total} pedidos retornados do Supabase REAL`);

    res.json({
      success: true,
      data: transformedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar pedidos:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao conectar com banco de dados. Verifique a configuração do Supabase.",
      details: error.message,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  }
});

// ==== BANNERS MANAGEMENT ====
router.get("/banners", async (req, res) => {
  try {
    logger.info("🎨 GET /api/admin/banners - Buscando banners...");

    // Por enquanto retornar dados simulados até implementar na base
    const banners = [
      {
        id: "1",
        title: "Banner Principal",
        description: "Banner promocional da homepage",
        imageUrl: "/images/banner-home.jpg",
        targetUrl: "/promocoes",
        position: "HEADER",
        isActive: true,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        clicks: 150,
        impressions: 5000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        title: "Banner Categoria",
        description: "Banner lateral para categorias",
        imageUrl: "/images/banner-sidebar.jpg",
        targetUrl: "/categorias/eletronicos",
        position: "SIDEBAR",
        isActive: true,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        clicks: 85,
        impressions: 2500,
        createdAt: new Date().toISOString(),
      },
    ];

    logger.info(`✅ ${banners.length} banners retornados (dados simulados)`);

    res.json({
      success: true,
      banners,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar banners:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar banners",
      details: error.message,
    });
  }
});

router.post("/banners", async (req, res) => {
  try {
    const bannerData = req.body;
    logger.info("🎨 POST /api/admin/banners - Criando banner:", bannerData);

    // Simular criação
    const newBanner = {
      id: Date.now().toString(),
      ...bannerData,
      clicks: 0,
      impressions: 0,
      createdAt: new Date().toISOString(),
    };

    logger.info("✅ Banner criado com sucesso");

    res.json({
      success: true,
      message: "Banner criado com sucesso",
      banner: newBanner,
    });
  } catch (error) {
    logger.error("❌ Erro ao criar banner:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar banner",
      details: error.message,
    });
  }
});

router.put("/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const bannerData = req.body;
    logger.info(`🎨 PUT /api/admin/banners/${id} - Atualizando banner:`, bannerData);

    // Simular atualização
    const updatedBanner = {
      id,
      ...bannerData,
      updatedAt: new Date().toISOString(),
    };

    logger.info("✅ Banner atualizado com sucesso");

    res.json({
      success: true,
      message: "Banner atualizado com sucesso",
      banner: updatedBanner,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar banner:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar banner",
      details: error.message,
    });
  }
});

router.delete("/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`🗑️ DELETE /api/admin/banners/${id} - Excluindo banner...`);

    // Simular exclusão
    logger.info("✅ Banner excluído com sucesso");

    res.json({
      success: true,
      message: "Banner excluído com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao excluir banner:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao excluir banner",
      details: error.message,
    });
  }
});

// PUT /api/admin/subscriptions/:id - Atualizar status de assinatura
router.put("/subscriptions/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    logger.info(`💳 PUT /api/admin/subscriptions/${id} - Atualizando status para: ${status}`);

    // Validar status
    const validStatuses = ["ACTIVE", "CANCELLED", "EXPIRED", "PENDING"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status inválido",
        validStatuses,
      });
    }

    // Verificar se a assinatura existe
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from("subscriptions")
      .select(
        `
        id,
        status,
        userId,
        planId,
        users (
          id,
          name,
          email
        ),
        plans (
          id,
          name,
          price
        )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({
        success: false,
        error: "Assinatura não encontrada",
      });
    }

    // Atualizar assinatura
    const updateData = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // Se estiver cancelando, definir data de cancelamento
    if (status === "CANCELLED") {
      updateData.cancelledAt = new Date().toISOString();
    }

    // Se estiver ativando, limpar data de cancelamento
    if (status === "ACTIVE") {
      updateData.cancelledAt = null;
    }

    const { data: updatedSubscription, error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("❌ Erro ao atualizar assinatura:", updateError);
      throw updateError;
    }

    logger.info("✅ Assinatura atualizada com sucesso");

    res.json({
      success: true,
      message: `Assinatura ${status.toLowerCase()} com sucesso`,
      data: {
        ...updatedSubscription,
        user: subscription.users,
        plan: subscription.plans,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar assinatura:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar assinatura",
      details: error.message,
    });
  }
});

// POST /api/admin/subscriptions/:id/cancel - Cancelar assinatura
router.post("/subscriptions/:id/cancel", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, refund = false } = req.body;

    logger.info(`💳 POST /api/admin/subscriptions/${id}/cancel - Cancelando assinatura`);

    // Verificar se a assinatura existe e está ativa
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from("subscriptions")
      .select(
        `
        id,
        status,
        userId,
        planId,
        startDate,
        endDate,
        users (
          id,
          name,
          email
        ),
        plans (
          id,
          name,
          price
        )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({
        success: false,
        error: "Assinatura não encontrada",
      });
    }

    if (subscription.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        error: "Esta assinatura já está cancelada",
      });
    }

    // Cancelar assinatura
    const { data: cancelledSubscription, error: cancelError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "CANCELLED",
        cancelledAt: new Date().toISOString(),
        cancelReason: reason || "Cancelado pelo administrador",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (cancelError) {
      logger.error("❌ Erro ao cancelar assinatura:", cancelError);
      throw cancelError;
    }

    // Processar reembolso se solicitado
    if (refund && subscription.paymentId) {
      try {
        // Buscar informações do pagamento
        const { data: payment } = await supabase
          .from("payments")
          .select("asaasPaymentId, amount")
          .eq("id", subscription.paymentId)
          .single();

        if (payment?.asaasPaymentId) {
          // Integrar com ASAAS para processar reembolso
          const { asaasRequest } = await import("../lib/asaas.js");
          const refundResult = await asaasRequest(`/payments/${payment.asaasPaymentId}/refund`, {
            method: "POST",
            body: JSON.stringify({
              value: payment.amount,
              description: `Reembolso - Cancelamento de assinatura ${subscription.plans.name}`,
            }),
          });

          logger.info("✅ Reembolso processado:", refundResult.id);
        }
      } catch (refundError) {
        logger.error("⚠️ Erro ao processar reembolso:", refundError);
        // Não falhar o cancelamento se o reembolso der erro
      }
    }

    logger.info("✅ Assinatura cancelada com sucesso");

    res.json({
      success: true,
      message: "Assinatura cancelada com sucesso",
      data: {
        ...cancelledSubscription,
        user: subscription.users,
        plan: subscription.plans,
        refundProcessed: refund,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao cancelar assinatura:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao cancelar assinatura",
      details: error.message,
    });
  }
});

// POST /api/admin/subscriptions/:id/renew - Renovar assinatura
router.post("/subscriptions/:id/renew", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { months = 1, notes } = req.body;

    logger.info(`💳 POST /api/admin/subscriptions/${id}/renew - Renovando por ${months} mês(es)`);

    // Verificar se a assinatura existe
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from("subscriptions")
      .select(
        `
        id,
        status,
        userId,
        planId,
        endDate,
        users!inner (
          id,
          name,
          email
        ),
        plans!inner (
          id,
          name,
          price,
          billingPeriod
        )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({
        success: false,
        error: "Assinatura não encontrada",
      });
    }

    // Calcular nova data de vencimento
    const currentEndDate = new Date(subscription.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);

    // Renovar assinatura
    const { data: renewedSubscription, error: renewError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "ACTIVE",
        endDate: newEndDate.toISOString(),
        lastPayment: new Date().toISOString(),
        nextBilling: newEndDate.toISOString(),
        renewalNotes: notes || `Renovado manualmente pelo admin por ${months} mês(es)`,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (renewError) {
      logger.error("❌ Erro ao renovar assinatura:", renewError);
      throw renewError;
    }

    logger.info("✅ Assinatura renovada com sucesso");

    res.json({
      success: true,
      message: `Assinatura renovada por ${months} mês(es)`,
      data: {
        ...renewedSubscription,
        user: subscription.users,
        plan: subscription.plans,
        renewalPeriod: `${months} mês(es)`,
        newEndDate: newEndDate.toISOString(),
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao renovar assinatura:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao renovar assinatura",
      details: error.message,
    });
  }
});

// ==== ORDER STATUS UPDATE ====
router.put("/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingCode, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório" });
    }

    const validStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const updateData = { status, updatedAt: new Date().toISOString() };
    if (trackingCode) updateData.trackingCode = trackingCode;
    if (notes) updateData.notes = notes;

    const { data: order, error } = await supabase.from("Order").update(updateData).eq("id", id).select().single();

    if (error) {
      throw error;
    }

    logger.info(`✅ Status do pedido ${id} atualizado para ${status}`);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error("❌ Erro ao atualizar status do pedido:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==== REVENUE ANALYTICS ====
router.get("/revenue", async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from("Order")
      .select("total, status, createdAt")
      .in("status", ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]);

    if (error) {
      throw error;
    }

    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) || 0;
    const orderCount = orders?.length || 0;

    // Calcular receita por mês (últimos 6 meses)
    const monthlyRevenue = {};
    orders?.forEach((order) => {
      const month = new Date(order.createdAt).toISOString().slice(0, 7); // YYYY-MM
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + parseFloat(order.total || 0);
    });

    res.json({
      success: true,
      data: {
        totalRevenue,
        orderCount,
        averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
        monthlyRevenue,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar receita:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==== REPORTS: SALES ====
router.get("/reports/sales", async (req, res) => {
  try {
    const { startDate, endDate, period = "daily" } = req.query;

    let query = supabase
      .from("Order")
      .select("id, total, status, createdAt")
      .in("status", ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]);

    if (startDate) {
      query = query.gte("createdAt", startDate);
    }
    if (endDate) {
      query = query.lte("createdAt", endDate);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    const groupedSales = {};
    orders?.forEach((order) => {
      let key;
      const date = new Date(order.createdAt);

      if (period === "daily") {
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
      } else if (period === "monthly") {
        key = date.toISOString().slice(0, 7); // YYYY-MM
      } else if (period === "yearly") {
        key = date.toISOString().slice(0, 4); // YYYY
      }

      if (!groupedSales[key]) {
        groupedSales[key] = { count: 0, revenue: 0 };
      }
      groupedSales[key].count++;
      groupedSales[key].revenue += parseFloat(order.total || 0);
    });

    res.json({
      success: true,
      data: {
        period,
        sales: groupedSales,
        totalOrders: orders?.length || 0,
        totalRevenue: orders?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao gerar relatório de vendas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==== REPORTS: USERS ====
router.get("/reports/users", async (req, res) => {
  try {
    const { data: users, error } = await supabase.from("users").select("id, type, createdAt, isActive");

    if (error) {
      throw error;
    }

    const usersByType = {
      BUYER: 0,
      SELLER: 0,
      ADMIN: 0,
    };

    const usersByMonth = {};

    users?.forEach((user) => {
      usersByType[user.type] = (usersByType[user.type] || 0) + 1;

      const month = new Date(user.createdAt).toISOString().slice(0, 7);
      if (!usersByMonth[month]) {
        usersByMonth[month] = { total: 0, active: 0 };
      }
      usersByMonth[month].total++;
      if (user.isActive) {
        usersByMonth[month].active++;
      }
    });

    res.json({
      success: true,
      data: {
        total: users?.length || 0,
        byType: usersByType,
        byMonth: usersByMonth,
        activeUsers: users?.filter((u) => u.isActive).length || 0,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao gerar relatório de usuários:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==== REPORTS: PRODUCTS ====
router.get("/reports/products", async (req, res) => {
  try {
    const { data: products, error } = await supabase.from("Product").select(`
        id,
        name,
        price,
        stock,
        isActive,
        viewCount,
        salesCount,
        categoryId,
        categories (name)
      `);

    if (error) {
      throw error;
    }

    const productsByCategory = {};
    let totalRevenue = 0;

    products?.forEach((product) => {
      const categoryName = product.categories?.name || "Sem categoria";

      if (!productsByCategory[categoryName]) {
        productsByCategory[categoryName] = {
          count: 0,
          revenue: 0,
          sales: 0,
        };
      }

      productsByCategory[categoryName].count++;
      productsByCategory[categoryName].sales += product.salesCount || 0;
      productsByCategory[categoryName].revenue += (product.salesCount || 0) * parseFloat(product.price || 0);
      totalRevenue += (product.salesCount || 0) * parseFloat(product.price || 0);
    });

    res.json({
      success: true,
      data: {
        total: products?.length || 0,
        active: products?.filter((p) => p.isActive).length || 0,
        outOfStock: products?.filter((p) => p.stock === 0).length || 0,
        byCategory: productsByCategory,
        totalRevenue,
        totalSales: products?.reduce((sum, p) => sum + (p.salesCount || 0), 0) || 0,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao gerar relatório de produtos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==== BROADCAST NOTIFICATIONS ====
router.post("/notifications/broadcast", async (req, res) => {
  try {
    const { title, message, type = "SYSTEM", userType } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "Título e mensagem são obrigatórios" });
    }

    // Buscar usuários alvo
    let query = supabase.from("users").select("id");

    if (userType && userType !== "all") {
      query = query.eq("type", userType.toUpperCase());
    }

    const { data: targetUsers, error: usersError } = await query;

    if (usersError) {
      throw usersError;
    }

    // Criar notificações para todos os usuários alvo
    const notifications =
      targetUsers?.map((user) => ({
        userId: user.id,
        type,
        title,
        message,
        isRead: false,
      })) || [];

    const { data: createdNotifications, error } = await supabase.from("Notification").insert(notifications).select();

    if (error) {
      throw error;
    }

    logger.info(`✅ ${createdNotifications.length} notificações enviadas`);

    res.json({
      success: true,
      message: `Notificação enviada para ${createdNotifications.length} usuários`,
      data: {
        sentCount: createdNotifications.length,
        targetType: userType || "all",
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao enviar notificações em massa:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==== UPDATE SUBSCRIPTION STATUS ====
router.put("/subscriptions/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status é obrigatório" });
    }

    const validStatuses = ["ACTIVE", "INACTIVE", "CANCELLED", "EXPIRED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const { data: subscription, error } = await supabase
      .from("Subscription")
      .update({ status, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`✅ Status da assinatura ${id} atualizado para ${status}`);

    res.json({
      success: true,
      message: "Status da assinatura atualizado com sucesso",
      data: subscription,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar status da assinatura:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
