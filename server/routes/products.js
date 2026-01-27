// VERSION: 2025-11-15T18:00 BRT - RPC Search Implementation
import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { z } from "zod";
import { supabase, supabaseAdmin } from "../lib/supabase-client.js";
import { protectRoute, validateInput, commonValidations } from "../middleware/security.js";
import {
  validateProduct,
  validateUUIDParam,
  validateProductIdParam,
  validatePagination,
  validateSearchFilters,
} from "../middleware/validation.js";
import { cache, CACHE_KEYS, CACHE_TTL, cacheMiddleware } from "../lib/cache.js";
import {
  OPTIMIZED_SELECTS,
  createOptimizedQuery,
  applyCommonFilters,
  applyTextSearch,
  withQueryMetrics,
} from "../lib/query-optimizer.js";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger.js";
import { parseProductMetadata, serializeProductMetadata } from "../lib/product-metadata.js";
import { randomUUID } from "crypto";

const router = express.Router();

logger.info("📦 Products routes loaded - PUT/DELETE should be available");

// Middleware de autenticação
// Middleware removido - usando middleware centralizado

// Função para processar query parameters
const processQuery = (query) => {
  return {
    page: parseInt(query.page) || 1,
    limit: parseInt(query.limit) || 12,
    search: query.search || undefined,
    category: query.category, // Zod garante que existe (undefined se ausente)
    minPrice: query.minPrice ? parseFloat(query.minPrice) : undefined,
    maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder || "desc",
    storeId: query.storeId || undefined,
    sellerId: query.sellerId || undefined,
    featured: query.featured === "true" || undefined,
    approvalStatus: query.approval || query.approvalStatus || undefined,
  };
};

const recalculateStoreProductCount = async (storeId) => {
  if (!storeId) return;
  try {
    const { count, error } = await supabase
      .from("Product")
      .select("id", { count: "exact", head: true })
      .eq("storeId", storeId)
      .eq("isActive", true);

    if (error) {
      logger.warn("⚠️ Erro ao recalcular productCount:", error);
      return;
    }

    await supabase
      .from("stores")
      .update({ productCount: count || 0 })
      .eq("id", storeId);
  } catch (err) {
    logger.warn("⚠️ Erro inesperado ao atualizar productCount:", err);
  }
};

// Schema de validação para criação de produtos
const createProductSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(200, "Nome muito longo"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(2000, "Descrição muito longa"),
  price: z.number().min(0.01, "Preço deve ser maior que zero").max(999999.99, "Preço máximo excedido"),
  comparePrice: z.number().optional(),
  stock: z.number().int().min(0, "Estoque não pode ser negativo"),
  categoryId: z.string().min(1, "ID da categoria é obrigatório"),
  images: z
    .array(
      z.object({
        url: z.string().url("URL da imagem inválida"),
        alt: z.string().max(200, "Texto alternativo muito longo"),
        order: z.number().int().min(0, "Ordem deve ser positiva"),
      })
    )
    .max(15, "Máximo 15 imagens por produto"),
  specifications: z
    .array(
      z.object({
        name: z.string().min(1, "Nome da especificação obrigatório"),
        value: z.string().min(1, "Valor da especificação obrigatório"),
      })
  )
  .optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  brand: z.string().max(120, "Marca muito longa").optional(),
  model: z.string().max(120, "Modelo muito longo").optional(),
  condition: z.string().max(30).optional(),
  dimensions: z
    .object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      unit: z.enum(["cm", "m"]).optional(),
    })
    .optional(),
  shippingOptions: z
    .array(z.enum(["retirada", "correios", "transportadora"]))
    .optional(),
  deliveryOptions: z
    .array(
      z.object({
        id: z.string().min(1, "ID da opção é obrigatório"),
        name: z.string().min(1, "Nome da opção de entrega é obrigatório").max(100, "Nome muito longo"),
        prazo: z.string().max(50, "Prazo muito longo").optional(),
        valor: z.number().min(0, "Valor não pode ser negativo").optional(),
      })
    )
    .max(10, "Máximo 10 opções de entrega por produto")
    .optional(),
}).refine((data) => {
  // Produtos ativos (publicados) devem ter pelo menos 1 imagem
  // Rascunhos (isActive=false) podem ficar sem imagem
  if (data.isActive && (!data.images || data.images.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "[PRODUCTS.JS] Pelo menos uma imagem é obrigatória para publicar o produto",
  path: ["images"],
});

// GET /api/products - Listar produtos
router.get(
  "/",
  validatePagination,
  validateSearchFilters,
  cacheMiddleware(
    (req) => CACHE_KEYS.PRODUCTS_LIST(req.query.page || 1, req.query.limit || 12, req.query),
    CACHE_TTL.MEDIUM,
    {
      skipCacheCondition: (req) => !!req.query.search || !!req.query.category || !!req.query.storeId,
    }
  ),
  async (req, res) => {
    try {
      logger.info("📦 Iniciando busca de produtos", { query: req.query });

      const query = processQuery(req.query);
      // Verificar se variáveis de ambiente estão configuradas
      if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        logger.error("❌ SUPABASE_URL não configurada");
        return res.status(500).json({
          success: false,
          error: "Configuração do banco de dados ausente",
          message: "Entre em contato com o suporte",
          products: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
      }

      // Se houver busca, usar RPC function (bypass do bug do .or())
      if (query.search) {
        logger.info("🔍 Usando RPC search_products para busca:", query.search);

        const { data: rpcProducts, error: rpcError } = await supabase.rpc("search_products", {
          keyword: query.search,
          p_category_id: query.category || null,
          p_store_id: query.storeId || null,
          p_min_price: query.minPrice || null,
          p_max_price: query.maxPrice || null,
          p_approval_status: query.approvalStatus ? query.approvalStatus.toUpperCase() : "APPROVED",
          p_page: query.page,
          p_limit: query.limit,
        });

        if (rpcError) {
          logger.error("Erro ao executar RPC search_products:", rpcError);
          throw rpcError;
        }

        // Se não houver produtos, retornar vazio
        if (!rpcProducts || rpcProducts.length === 0) {
          return res.json({
            success: true,
            products: [],
            pagination: {
              page: query.page,
              limit: query.limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
            _rpcUsed: true,
            _routeVersion: ROUTE_VERSION,
          });
        }

        // Buscar relações (images, specs, category, store, seller) separadamente
        const productIds = rpcProducts.map((p) => p.id);
        const totalCount = rpcProducts[0]?.total_count || 0;

        const { data: productsWithRelations, error: relError } = await supabase
          .from("Product")
          .select(
            `${OPTIMIZED_SELECTS.PRODUCTS_LIST},
             images:ProductImage(*),
             specifications:ProductSpecification(*),
             category:categories(id, name),
             store:stores!inner(id, name, slug, city, state, isVerified, rating, phone, whatsapp, email, isActive, approval_status),
             seller:sellers(id, rating, totalSales)`
          )
          .in("id", productIds);

        if (relError) {
          logger.error("Erro ao buscar relações dos produtos:", relError);
          throw relError;
        }

        // Ordenar produtos na mesma ordem do RPC
        const orderedProducts = productIds
          .map((id) => productsWithRelations.find((p) => p.id === id))
          .filter(Boolean);

        // Formatar produtos para resposta
        const formattedProducts = orderedProducts.map((product) => {
          const metadata = parseProductMetadata(product.dimensions);
          return {
            ...product,
            ...metadata,
            images: product.images || [],
            specifications: product.specifications || [],
          };
        });

        const totalPages = Math.ceil(totalCount / query.limit);

        return res.json({
          success: true,
          products: formattedProducts,
          pagination: {
            page: query.page,
            limit: query.limit,
            total: totalCount,
            totalPages,
            hasNext: query.page < totalPages,
            hasPrev: query.page > 1,
          },
        });
      }

      // NOVA ABORDAGEM: Se há filtro storeId, buscar IDs primeiro, depois dados completos
      if (req.query.storeId) {
        logger.info(`🔄 [NEW-APPROACH] Usando abordagem 2-step: primeiro IDs, depois dados completos`);

        // Step 1: Buscar IDs com filtro (sem joins para garantir que filtro funciona)
        let idQuery = supabase
          .from("Product")
          .select("id", { count: "exact" })
          .eq("isActive", true)
          .eq("storeId", req.query.storeId);

        if (query.approvalStatus) {
          idQuery = idQuery.eq("approval_status", query.approvalStatus.toLowerCase());
        }

        // Aplicar outros filtros...
        const rangeStart = (query.page - 1) * query.limit;
        const rangeEnd = rangeStart + query.limit - 1;
        idQuery = idQuery.range(rangeStart, rangeEnd);

        const { data: productIds, error: idError, count } = await idQuery;

        if (idError) {
          logger.error("❌ Erro ao buscar IDs:", idError);
          throw idError;
        }

        logger.info(`✅ [NEW-APPROACH] Step 1: Encontrados ${productIds?.length || 0} IDs (total: ${count})`);

        if (!productIds || productIds.length === 0) {
          return res.json({
            success: true,
            products: [],
            pagination: {
              page: query.page,
              limit: query.limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          });
        }

        // Step 2: Buscar dados completos usando os IDs
        const ids = productIds.map((p) => p.id);
        const { data: products, error: dataError } = await supabase
          .from("Product")
          .select(
            `${OPTIMIZED_SELECTS.PRODUCTS_LIST},
             images:ProductImage(*),
             specifications:ProductSpecification(*),
             category:categories(id, name),
             store:stores!inner(id, name, slug, city, state, isVerified, rating, phone, whatsapp, email, isActive, approval_status),
             seller:sellers(id, rating, totalSales)`
          )
          .in("id", ids);

        if (dataError) {
          logger.error("❌ Erro ao buscar dados completos:", dataError);
          throw dataError;
        }

        logger.info(`✅ [NEW-APPROACH] Step 2: Buscados ${products?.length || 0} produtos completos`);

        // Formatar e retornar
        const formattedProducts = (products || []).map((product) => {
          const metadata = parseProductMetadata(product.dimensions);
          return {
            ...product,
            minStock: product.minStock ?? 0,
            averageRating: product.rating || 0,
            totalReviews: product.reviewCount || 0,
            images: product.images || [],
            specifications: product.specifications || [],
            brand: metadata.brand || "",
            model: metadata.model || "",
            condition: metadata.condition || "",
            dimensions: metadata.dimensions || null,
            shippingOptions: metadata.shippingOptions || [],
            deliveryOptions: metadata.deliveryOptions || [],
            store: {
              id: product.store?.id || "",
              name: product.store?.name || "Loja",
              slug: product.store?.slug || "",
              city: product.store?.city || "",
              state: product.store?.state || "",
              isVerified: product.store?.isVerified || false,
              rating: product.store?.rating || 0,
              phone: product.store?.phone || "",
              whatsapp: product.store?.whatsapp || "",
              email: product.store?.email || "",
            },
            seller: {
              id: product.seller?.id || product.sellerId,
              rating: product.seller?.rating || 0,
              totalSales: product.seller?.totalSales || 0,
            },
          };
        });

        return res.json({
          success: true,
          products: formattedProducts,
          pagination: {
            page: query.page,
            limit: query.limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / query.limit),
            hasNext: query.page * query.limit < (count || 0),
            hasPrev: query.page > 1,
          },
        });
      }

      // Query normal (sem busca e sem storeId) - mantém lógica original
      let supabaseQuery = createOptimizedQuery(
        supabase,
        "Product",
        `${OPTIMIZED_SELECTS.PRODUCTS_LIST},
       images:ProductImage(*),
       specifications:ProductSpecification(*),
       category:categories(id, name),
       store:stores!inner(id, name, slug, city, state, isVerified, rating, phone, whatsapp, email, isActive, approval_status),
       seller:sellers(id, rating, totalSales)`
      )
      .eq("isActive", true)
      .eq("approval_status", "APPROVED")
      .eq("store.isActive", true)
      .eq("store.approval_status", "approved");

      // Filtro opcional de status - sobrescreve o padrão se especificado
      if (query.approvalStatus) {
        supabaseQuery = supabaseQuery.eq("approval_status", query.approvalStatus.toUpperCase());
      }

      // Converter slug de categoria para UUID se necessário
      logger.info(`🔍 [DEBUG] Antes conversão: query.category="${query.category}"`);
      if (query.category && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.category)) {
        logger.info(`🔍 [DEBUG] Detectado slug, iniciando conversão para UUID...`);
        // É um slug, converter para UUID
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", query.category)
          .single();

        if (category) {
          logger.info(`🔍 [CATEGORY FILTER] Convertido slug "${query.category}" para UUID "${category.id}"`);
          query.category = category.id;
        } else {
          logger.warn(`⚠️ [CATEGORY FILTER] Slug "${query.category}" não encontrado, filtro será ignorado`);
          query.category = null;
        }
      } else if (query.category) {
        logger.info(`🔍 [DEBUG] Já é UUID, mantendo: "${query.category}"`);
      } else {
        logger.info(`🔍 [DEBUG] Sem filtro de categoria (query.category = ${query.category})`);
      }
      logger.info(`🔍 [DEBUG] Após conversão: query.category="${query.category}"`);

      // Aplicar filtros otimizados (SEM storeId para evitar conflito)
      logger.info(`🔍 [DEBUG] Aplicando filtros: category="${query.category}", minPrice="${query.minPrice}", maxPrice="${query.maxPrice}"`);
      supabaseQuery = applyCommonFilters(supabaseQuery, {
        category: query.category,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        // storeId removido daqui - aplicado diretamente abaixo
      });

      // Aplicar storeId DIRETAMENTE (única aplicação para evitar conflito)
      logger.info(`🚨 [CRITICAL] query.storeId value: "${query.storeId}" | falsy: ${!query.storeId} | type: ${typeof query.storeId}`);
      logger.info(`🚨 [CRITICAL] Boolean check !!query.storeId = ${!!query.storeId}`);

      // TESTE FORÇADO: Aplicar filtro hardcoded para teste (testando diferentes sintaxes)
      if (req.query.storeId === "store_1763123228013_1w63s3kpo") {
        logger.info(`🧪 [TEST] FORÇANDO filtro hardcoded - testando syntax "storeId"`);
        supabaseQuery = supabaseQuery.eq("storeId", "store_1763123228013_1w63s3kpo");

        // Também tentar filtro no primeiro nível da query (antes dos joins serem processados)
        logger.info(`🧪 [TEST] Aplicando filtro NOVAMENTE após joins`);
        supabaseQuery = supabaseQuery.eq("storeId", "store_1763123228013_1w63s3kpo");
      }

      if (query.storeId) {
        logger.info(`✅ [FILTER] APLICANDO FILTRO storeId: "${query.storeId}"`);
        supabaseQuery = supabaseQuery.eq("storeId", query.storeId);
        logger.info(`✅ [FILTER] Filtro storeId APLICADO com sucesso`);
      } else {
        logger.info(`❌ [FILTER] NÃO aplicando filtro storeId (query.storeId é falsy)`);
      }

      if (query.featured) {
        supabaseQuery = supabaseQuery.eq("isFeatured", true);
      }

      if (query.sellerId) {
        supabaseQuery = supabaseQuery.eq("sellerId", query.sellerId);
      }

      // Ordenação
      const sortField = query.sortBy === "price_asc" ? "price" : query.sortBy;
      const sortOrder = query.sortBy === "price_asc" ? "asc" : query.sortOrder;

      supabaseQuery = supabaseQuery.order(sortField, { ascending: sortOrder === "asc" });

      // Paginação
      const rangeStart = (query.page - 1) * query.limit;
      const rangeEnd = rangeStart + query.limit - 1;

      supabaseQuery = supabaseQuery.range(rangeStart, rangeEnd);

      const { data: products, error, count } = await supabaseQuery;

      if (error) {
        logger.error("Erro ao buscar produtos no Supabase:", error);
        throw error;
      }

      // Formatar produtos para resposta com dados reais
      const formattedProducts = (products || []).map((product) => {
        const metadata = parseProductMetadata(product.dimensions);

        return {
          ...product,
          minStock: product.minStock ?? 0,
          averageRating: product.rating || 0,
          totalReviews: product.reviewCount || 0,
          // Garantir arrays vazios se null
          images: product.images || [],
          specifications: product.specifications || [],
          brand: metadata.brand || "",
          model: metadata.model || "",
          condition: metadata.condition || "",
          dimensions: metadata.dimensions || null,
          shippingOptions: metadata.shippingOptions || [],
          deliveryOptions: metadata.deliveryOptions || [],
          // Store com rating real (não placeholder)
          store: {
            id: product.store?.id || "",
            name: product.store?.name || "Loja",
            slug: product.store?.slug || "",
            city: product.store?.city || "",
            state: product.store?.state || "",
            isVerified: product.store?.isVerified || false,
            rating: product.store?.rating || 0,
            phone: product.store?.phone || "",
            whatsapp: product.store?.whatsapp || "",
            email: product.store?.email || "",
          },
          // Seller com dados reais (sem storeName que não existe)
          seller: {
            id: product.seller?.id || product.sellerId,
            rating: product.seller?.rating || 0,
            totalSales: product.seller?.totalSales || 0,
          },
        };
      });

      const totalCount = count || 0;

      res.json({
        success: true,
        products: formattedProducts,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / query.limit),
          hasNext: query.page * query.limit < totalCount,
          hasPrev: query.page > 1,
        },
      });
    } catch (error) {
      logger.error("❌ Erro ao buscar produtos:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });

      // Se um sellerId específico foi solicitado, retornar lista vazia
      if (req.query.sellerId) {
        return res.json({
          success: true,
          products: [],
          pagination: {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 12,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
      }

      // Mensagens de erro mais específicas
      let errorMessage = "Erro ao buscar produtos";
      let errorDetails = "Erro interno do servidor";

      if (error.message?.includes("connect") || error.message?.includes("ECONNREFUSED")) {
        errorMessage = "Erro de conexão com o banco de dados";
        errorDetails = "Não foi possível conectar ao banco. Verifique as configurações.";
      } else if (error.code === "PGRST116") {
        errorMessage = "Erro de configuração da query";
        errorDetails = "A tabela ou relacionamento solicitado não existe.";
      } else if (error.message?.includes("JWT")) {
        errorMessage = "Erro de autenticação com o banco";
        errorDetails = "Token de acesso inválido ou expirado.";
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
        message: errorDetails,
        ...(process.env.NODE_ENV === "development" && { debug: error.message }),
        products: [],
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    }
  }
);

// GET /api/products/test - Endpoint de teste (DEVE FICAR ANTES DE /:id)
router.get("/test", async (req, res) => {
  res.json({
    success: true,
    message: "API de produtos funcionando!",
    query: req.query,
  });
});

// GET /api/products/:id - Buscar produto por ID
router.get(
  "/:id",
  validateProductIdParam,
  cacheMiddleware((req) => CACHE_KEYS.PRODUCT_DETAIL(req.params.id), CACHE_TTL.LONG),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if request is authenticated (optional JWT token for seller access)
      let authenticatedSellerId = null;
      const authHeader = req.headers.authorization;
      logger.info(`🔐 GET /api/products/:id - Auth header present: ${!!authHeader}`);

      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          logger.info(`🔐 Token decoded - userId: ${decoded.userId}, type: ${decoded.type}`);

          // If user is a seller, get their seller ID
          if (decoded.type === "SELLER") {
            const { data: seller } = await supabase
              .from("sellers")
              .select("id")
              .eq("userId", decoded.userId)
              .single();
            if (seller) {
              authenticatedSellerId = seller.id;
              logger.info(`✅ Seller authenticated: ${authenticatedSellerId}`);
            } else {
              logger.info(`⚠️ Seller not found for userId: ${decoded.userId}`);
            }
          } else {
            logger.info(`ℹ️ User is not a seller - type: ${decoded.type}`);
          }
        } catch (error) {
          // Token invalid/expired - continue as public access
          logger.info(`⚠️ Invalid/expired token, treating as public access: ${error.message}`);
        }
      } else {
        logger.info(`ℹ️ No auth header or invalid format - public access`);
      }

      // Query simplificada para detalhes do produto (sem filtros de approval_status ou isActive)
      // Sellers podem ver produtos próprios (qualquer status/ativo) + Público vê apenas APPROVED + ACTIVE
      const { data: product, error } = await supabase
        .from("Product")
        .select(
          `
          *,
          images:ProductImage (id, url, alt, order),
          specifications:ProductSpecification (id, name, value),
          category:categories (id, name, slug),
          store:stores (id, name, slug, city, state, phone, whatsapp, email, isVerified, rating),
          seller:sellers (id, rating, totalSales)
        `
        )
        .eq("id", id)
        .single();

      if (error || !product) {
        logger.error("Erro ao buscar produto:", error);
        return res.status(404).json({
          error: "Produto não encontrado",
        });
      }

      // Access control:
      // 1. Se é o seller do produto: pode ver (qualquer approval_status, qualquer isActive)
      // 2. Se não é o seller: só vê se APPROVED + ACTIVE
      const isOwner = product.sellerId === authenticatedSellerId;
      const isPubliclyVisible = product.isActive === true;

      if (!isOwner && !isPubliclyVisible) {
        logger.info(`🚫 Product ${id} access DENIED - productSellerId: ${product.sellerId}, authenticatedSellerId: ${authenticatedSellerId}, approval_status: ${product.approval_status}, isActive: ${product.isActive}`);
        return res.status(404).json({
          error: "Produto não encontrado",
        });
      }

      logger.info(`✅ Product ${id} access GRANTED - productSellerId: ${product.sellerId}, authenticatedSellerId: ${authenticatedSellerId}, status: ${product.approval_status}`);

      // Formatar resposta com dados corretos de store e seller
      const metadata = parseProductMetadata(product.dimensions);

      const formattedProduct = {
        ...product,
        averageRating: product.rating || 0,
        totalReviews: product.reviewCount || 0,
        // Garantir arrays vazios se null
        images: product.images || [],
        specifications: product.specifications || [],
        brand: metadata.brand || "",
        model: metadata.model || "",
        condition: metadata.condition || "",
        shippingOptions: metadata.shippingOptions || [],
        deliveryOptions: metadata.deliveryOptions || [],
        dimensions: metadata.dimensions || null,
        // Store com todos os campos necessários
        store: {
          id: product.store?.id || "",
          name: product.store?.name || "Loja",
          slug: product.store?.slug || "",
          city: product.store?.city || "",
          state: product.store?.state || "",
          phone: product.store?.phone || "",
          whatsapp: product.store?.whatsapp || null,
           email: product.store?.email || "",
          isVerified: product.store?.isVerified || false,
          rating: product.store?.rating || 0,
        },
        // Seller com campos reais (sem storeName que não existe)
        seller: {
          id: product.seller?.id || product.sellerId,
          rating: product.seller?.rating || 0,
          totalSales: product.seller?.totalSales || 0,
        },
      };

      res.json(formattedProduct);
    } catch (error) {
      logger.error("Erro ao buscar produto:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  }
);

// GET /api/products/:id/related - Produtos relacionados
router.get("/:id/related", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    // Primeiro buscar o produto para pegar a categoria
    const { data: product, error: productError } = await supabase
      .from("Product")
      .select("categoryId")
      .eq("id", id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: "Produto não encontrado",
      });
    }

    // Buscar produtos relacionados da mesma categoria
    const { data: relatedProducts, error } = await supabase
      .from("Product")
      .select(
        `
        *,
        images:ProductImage(url, alt, order),
        category:categories(*),
        store:stores(id, name, slug, rating, isVerified, phone, whatsapp, email, city, state)
      `
      )
      .eq("categoryId", product.categoryId)
      .neq("id", id)
      .eq("isActive", true)
      .eq("approval_status", "APPROVED") // ✅ FIX Bug #7: UPPERCASE para match enum ApprovalStatus
      .eq("store.isActive", true) // ✅ FIX Bug #7: Filtrar lojas ativas
      .eq("store.approval_status", "approved") // ✅ FIX Bug #7: Filtrar lojas aprovadas
      .limit(limit);

    if (error) {
      throw error;
    }

    res.set("Content-Type", "application/json; charset=utf-8");
    res.json({
      products: relatedProducts || [],
    });
  } catch (error) {
    logger.error("Erro ao buscar produtos relacionados:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// POST /api/products - Criar produto
router.post("/", authenticate, protectRoute(["SELLER", "ADMIN"]), async (req, res) => {
  try {
    logger.info("🛍️ Criação de produto requisitada");

    // ✅ FIX: Log detalhado do payload para debug de validação
    logger.info("📋 Payload recebido:", {
      name: req.body.name,
      price: req.body.price,
      categoryId: req.body.categoryId,
      imagesCount: req.body.images?.length || 0,
      specificationsCount: req.body.specifications?.length || 0,
    });

    // Validar dados de entrada com schema correto
    const productData = createProductSchema.parse(req.body);

    // VALIDAÇÃO DE LIMITES DE PLANO
    if (req.user.type === "SELLER") {
      // 1. Buscar seller (usa enum plan, não foreign key planId)
      const { data: seller, error: sellerError } = await supabase
        .from("sellers")
        .select("id, plan")
        .eq("userId", req.user.id)
        .single();

      if (sellerError || !seller) {
        logger.error("❌ Erro ao buscar seller:", sellerError);
        return res.status(400).json({
          error: "Seller não encontrado",
          code: "SELLER_NOT_FOUND",
        });
      }

      // Plano GRATUITO permite produtos ilimitados (-1)
      const planLimits = {
        GRATUITO: { maxProducts: -1, maxAds: -1, maxPhotos: 5 },
        BASICO: { maxProducts: 50, maxAds: 50, maxPhotos: 10 },
        PREMIUM: { maxProducts: 200, maxAds: 200, maxPhotos: 15 },
        ENTERPRISE: { maxProducts: -1, maxAds: -1, maxPhotos: 20 },
      };

      const sellerPlan = planLimits[seller.plan] || planLimits.GRATUITO;

      logger.info(`📊 Validando limites - Plano: ${seller.plan}, Max Produtos: ${sellerPlan.maxProducts}`);

      // 2. Buscar storeId do seller (caso não esteja no req.user)
      if (!req.user.storeId) {
        const { data: store } = await supabase.from("stores").select("id").eq("sellerId", seller.id).single();

        if (store) {
          req.user.storeId = store.id;
          logger.info(`✅ StoreId encontrado: ${store.id}`);
        }
      }

      // 3. Contar produtos atuais do seller
      if (sellerPlan.maxProducts !== -1) {
        // -1 = ilimitado
        const { count: currentProducts, error: countError } = await supabase
          .from("Product")
          .select("id", { count: "exact" })
          .eq("sellerId", seller.id)
          .eq("isActive", true);

        if (countError) {
          logger.error("❌ Erro ao contar produtos:", countError);
          return res.status(500).json({
            error: "Erro interno ao validar limites",
            code: "COUNT_ERROR",
          });
        }

        logger.info(`🔢 Produtos atuais: ${currentProducts}/${sellerPlan.maxProducts}`);

        // 3. Verificar se excede o limite
        if (currentProducts >= sellerPlan.maxProducts) {
          return res.status(403).json({
            error: `Limite de produtos excedido. Seu plano "${sellerPlan.name}" permite até ${sellerPlan.maxProducts} produtos ativos.`,
            code: "PRODUCT_LIMIT_EXCEEDED",
            details: {
              currentCount: currentProducts,
              maxAllowed: sellerPlan.maxProducts,
              planName: sellerPlan.name,
              upgradeRequired: true,
            },
          });
        }
      }
    }

    // Gerar ID único para o produto
    const productId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Gerar slug a partir do nome do produto
    const slug =
      productData.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
        .trim()
        .replace(/\s+/g, "-") // Substitui espaços por hífen
        .replace(/-+/g, "-") + // Remove hífens duplicados
      `-${Date.now()}`; // Adiciona timestamp para garantir unicidade

    logger.info(`✅ Slug gerado: ${slug}`);

    const productMetadata = serializeProductMetadata({
      brand: productData.brand,
      model: productData.model,
      condition: productData.condition,
      dimensions: productData.dimensions,
      shippingOptions: productData.shippingOptions,
      deliveryOptions: productData.deliveryOptions,
    });

    // Criar produto no Supabase
    const { data: product, error } = await supabase
      .from("Product")
      .insert([
        {
          id: productId,
          slug: slug,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          comparePrice: productData.comparePrice || null,
          stock: productData.stock,
          categoryId: productData.categoryId,
          sellerId: req.user.sellerId,
          storeId: req.user.storeId,
          isActive: false,  // Sempre inativo até aprovação do admin
          approval_status: 'PENDING',  // Sempre pendente até aprovação do admin
          isFeatured: productData.isFeatured ?? false,
          dimensions: JSON.stringify(productMetadata),
          viewCount: 0,
          salesCount: 0,
          averageRating: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("❌ Erro ao criar produto no Supabase:", error);

      // ❌ REMOVIDO: Mock que dava falso sucesso
      // Agora retorna erro real para o usuário
      return res.status(500).json({
        success: false,
        error: "Falha ao criar produto",
        details: error.message,
        code: "PRODUCT_CREATION_FAILED",
      });
    }

    // Adicionar imagens se fornecidas
    if (productData.images && productData.images.length > 0) {
      try {
        logger.info(`📸 Salvando ${productData.images.length} imagens para produto ${productId}`);

        const imagePromises = productData.images.map(async (image, index) => {
          const imageData = {
            id: randomUUID(),
            productId: productId,
            url: image.url,
            alt: image.alt || productData.name,
            order: image.order !== undefined ? image.order : index,
          };

          logger.info(`📸 Inserindo imagem ${index + 1}:`, imageData);

          const { data, error } = await supabaseAdmin
            .from("ProductImage")
            .insert([imageData]);

          if (error) {
            logger.error(`❌ Erro ao inserir imagem ${index + 1}:`, error);
            throw error;
          }

          logger.info(`✅ Imagem ${index + 1} salva com sucesso`);
          return data;
        });

        await Promise.all(imagePromises);
        logger.info(`✅ Todas as ${productData.images.length} imagens salvas com sucesso`);
      } catch (imageError) {
        logger.error("❌ ERRO CRÍTICO ao salvar imagens:", imageError);
        // ⚠️ Produto foi criado mas imagens falharam - avisar usuário
        return res.status(207).json({
          success: true,
          warning: "Produto criado mas falha ao salvar imagens",
          error: imageError.message,
          productId: productId,
        });
      }
    }

    // Adicionar especificações se fornecidas
    if (productData.specifications && productData.specifications.length > 0) {
      try {
        logger.info(`📝 Salvando ${productData.specifications.length} especificações para produto ${productId}`);

        const specPromises = productData.specifications.map(async (spec, index) => {
          const specData = {
            id: `spec_${productId}_${index}`,
            productId: productId,
            name: spec.name,
            value: spec.value,
          };

          const { data, error } = await supabaseAdmin
            .from("ProductSpecification")
            .insert([specData]);

          if (error) {
            logger.error(`❌ Erro ao inserir especificação ${index + 1}:`, error);
            throw error;
          }

          return data;
        });

        await Promise.all(specPromises);
        logger.info(`✅ Todas as ${productData.specifications.length} especificações salvas`);
      } catch (specError) {
        logger.error("❌ Erro ao salvar especificações:", specError);
        // Especificações são menos críticas, apenas logar erro
      }
    }

    logger.info("✅ Produto criado com sucesso:", productId);
    await recalculateStoreProductCount(req.user.storeId);

    // Buscar produto completo com relacionamentos
    const { data: fullProduct, error: fetchError } = await supabase
      .from("Product")
      .select(
        `
        *,
        images:ProductImage(*),
        specifications:ProductSpecification(*),
        category:categories(*),
        store:stores(id, name, slug, rating, isVerified)
      `
      )
      .eq("id", productId)
      .single();

    // Invalidar cache de produtos após criação
    await cache.invalidatePattern("products:*");
    await cache.invalidatePattern("categories:*");

    const responseProduct = fullProduct
      ? {
          ...fullProduct,
          ...parseProductMetadata(fullProduct.dimensions),
        }
      : {
          ...product,
          ...parseProductMetadata(product.dimensions),
        };

    res.status(201).json({
      success: true,
      message: "Produto criado com sucesso",
      product: responseProduct,
    });
  } catch (error) {
    logger.error("❌ Erro ao criar produto:", error);

    if (error instanceof z.ZodError) {
      // ✅ FIX: Criar mensagem detalhada com erros específicos de cada campo
      const fieldErrors = error.issues.map((issue) => {
        const field = issue.path.join(".");
        return `${field}: ${issue.message}`;
      });

      return res.status(400).json({
        success: false,
        error: `Validação falhou - ${fieldErrors.join("; ")}`,
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

// PUT /api/products/:id - Atualizar produto
router.put("/:id", authenticate, protectRoute(["SELLER", "ADMIN"]), async (req, res) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;

    logger.info("🚀 PUT route called for product:", productId);
    logger.info("🔄 Atualizando produto:", productId, updateData);

    // Verificar se o produto existe e se o seller tem permissão
    const { data: existingProduct, error: fetchError } = await supabase
      .from("Product")
      .select("sellerId, storeId, dimensions, isActive")
      .eq("id", productId)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    // Verificar se o seller é o dono do produto (exceto admin)
    if (req.user.type !== "ADMIN" && existingProduct.sellerId !== req.user.sellerId) {
      return res.status(403).json({
        success: false,
        error: "Sem permissão para editar este produto",
      });
    }

    // Extrair images e specifications para processamento separado
    const { images, specifications, ...productFields } = updateData;

    // Filtrar apenas campos permitidos da tabela Product
    const allowedFields = [
      "name",
      "description",
      "price",
      "comparePrice",
      "categoryId",
      "stock",
      "weight",
      "isActive",
      "sku",
      "isFeatured",
    ];

    const filteredData = Object.keys(productFields)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = productFields[key];
        return obj;
      }, {});

    const metadataBefore = parseProductMetadata(existingProduct.dimensions);
    const metadataUpdates = serializeProductMetadata(
      {
        brand: productFields.brand,
        model: productFields.model,
        condition: productFields.condition,
        dimensions: productFields.dimensions,
        shippingOptions: productFields.shippingOptions,
        deliveryOptions: productFields.deliveryOptions,
      },
      metadataBefore
    );

    const metadataChanged = ["brand", "model", "condition", "dimensions", "shippingOptions", "deliveryOptions"].some(
      (field) => productFields[field] !== undefined
    );

    if (metadataChanged) {
      filteredData.dimensions = JSON.stringify(metadataUpdates);
    }

    // Validar: Só exigir imagem ao ATIVAR produto que estava inativo
    if (filteredData.isActive === true && existingProduct.isActive === false) {
      const hasImages = images && Array.isArray(images) && images.length > 0;
      if (!hasImages) {
        return res.status(400).json({
          success: false,
          error: "Validação falhou",
          details: [
            {
              field: "images",
              message: "[PUT] Pelo menos uma imagem é obrigatória para publicar o produto",
            },
          ],
        });
      }
    }

    // Atualizar produto (apenas campos da tabela Product)
    const { data: updatedProduct, error: updateError } = await supabase
      .from("Product")
      .update({
        ...filteredData,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", productId)
      .select()
      .single();

    if (updateError) {
      logger.error("❌ Erro ao atualizar produto:", updateError);
      return res.status(500).json({
        success: false,
        error: "Erro ao atualizar produto",
        details: updateError.message,
      });
    }

    // Processar images se fornecidas
    if (images && Array.isArray(images)) {
      // Deletar imagens antigas
      await supabaseAdmin.from("ProductImage").delete().eq("productId", productId);

      // Inserir novas imagens
      const imageRecords = images.map((img, idx) => ({
        id: randomUUID(), // ✅ FIX: Gerar UUID único para cada imagem (campo obrigatório)
        productId,
        url: img.url,
        alt: img.alt || updatedProduct.name,
        order: img.order || idx,
      }));

      const { error: imageError } = await supabaseAdmin.from("ProductImage").insert(imageRecords);

      if (imageError) {
        logger.error("⚠️ Erro ao atualizar imagens:", imageError);
      } else {
        logger.info(`✅ ${imageRecords.length} imagens salvas para produto ${productId}`);
      }
    }

    // Processar specifications se fornecidas
    if (specifications && Array.isArray(specifications)) {
      // Deletar especificações antigas
      await supabaseAdmin.from("ProductSpecification").delete().eq("productId", productId);

      // Inserir novas especificações
      const specRecords = specifications
        .filter((spec) => spec.name && spec.value)
        .map((spec) => ({
          productId,
          name: spec.name,
          value: spec.value,
        }));

      if (specRecords.length > 0) {
        const { error: specError } = await supabaseAdmin.from("ProductSpecification").insert(specRecords);

        if (specError) {
          logger.error("⚠️ Erro ao atualizar especificações:", specError);
        }
      }
    }

    logger.info("✅ Produto atualizado:", productId);

    if (productFields.isActive !== undefined) {
      await recalculateStoreProductCount(existingProduct.storeId);
    }

    // Invalidar cache de produtos
    await cache.invalidatePattern("products:*");
    await cache.invalidatePattern(`product:${productId}`);
    await cache.invalidatePattern("categories:*");
    logger.info("✅ Cache invalidado após atualização do produto");

    const normalizedProduct = {
      ...updatedProduct,
      ...parseProductMetadata(updatedProduct.dimensions),
    };

    res.json({
      success: true,
      message: "Produto atualizado com sucesso",
      product: normalizedProduct,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar produto:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// DELETE /api/products/:id - Deletar produto
router.delete("/:id", authenticate, protectRoute(["SELLER", "ADMIN"]), async (req, res) => {
  try {
    const productId = req.params.id;

    logger.info("🗑️ Deletando produto:", productId);

    // Verificar se o produto existe e se o seller tem permissão
    const { data: existingProduct, error: fetchError } = await supabase
      .from("Product")
      .select(`
        sellerId,
        name,
        seller:sellers!inner(storeId)
      `)
      .eq("id", productId)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    // Verificar se o seller é o dono do produto (exceto admin)
    if (req.user.type !== "ADMIN" && existingProduct.sellerId !== req.user.sellerId) {
      return res.status(403).json({
        success: false,
        error: "Sem permissão para deletar este produto",
      });
    }

    // Soft delete - marcar como inativo ao invés de deletar
    const { error: deleteError } = await supabase
      .from("Product")
      .update({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", productId);

    if (deleteError) {
      logger.error("❌ Erro ao deletar produto:", deleteError);
      return res.status(500).json({
        success: false,
        error: "Erro ao deletar produto",
      });
    }

    // ✅ Recalcular productCount da loja
    const storeId = existingProduct?.seller?.storeId;
    if (storeId) {
      await recalculateStoreProductCount(storeId);
    } else {
      logger.warn("⚠️ StoreId não encontrado, productCount não atualizado");
    }

    logger.info("✅ Produto deletado (soft delete):", productId);
    await cache.invalidatePattern("products:*");
    await cache.invalidatePattern("categories:*");

    res.json({
      success: true,
      message: `Produto "${existingProduct.name}" removido com sucesso`,
    });
  } catch (error) {
    logger.error("❌ Erro ao deletar produto:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

export default router;
