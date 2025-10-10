import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { z } from "zod";
import { supabase } from "../lib/supabase-client.js";
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
    category: query.category || undefined,
    minPrice: query.minPrice ? parseFloat(query.minPrice) : undefined,
    maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder || "desc",
    storeId: query.storeId || undefined,
    sellerId: query.sellerId || undefined,
    featured: query.featured === "true" || undefined,
  };
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
    .optional(),
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
});

// GET /api/products - Listar produtos
router.get(
  "/",
  validatePagination,
  validateSearchFilters,
  cacheMiddleware(
    (req) => CACHE_KEYS.PRODUCTS_LIST(req.query.page || 1, req.query.limit || 12, req.query),
    CACHE_TTL.MEDIUM
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

      // Query otimizada com campos específicos
      let supabaseQuery = createOptimizedQuery(
        supabase,
        "Product",
        `${OPTIMIZED_SELECTS.PRODUCTS_LIST},
       images:ProductImage(*),
       specifications:ProductSpecification(*),
       category:categories(id, name),
       store:stores(id, name, slug, isVerified)`
      )
      .eq("isActive", true)
      .eq("approval_status", "APPROVED"); // Apenas produtos aprovados aparecem publicamente

      // Aplicar filtros otimizados
      supabaseQuery = applyCommonFilters(supabaseQuery, {
        category: query.category,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        storeId: query.storeId,
      });

      // Aplicar busca de texto otimizada
      if (query.search) {
        supabaseQuery = applyTextSearch(supabaseQuery, query.search, ["name", "description"]);
      }

      if (query.featured) {
        supabaseQuery = supabaseQuery.eq("isFeatured", true);
      }

      if (query.storeId) {
        supabaseQuery = supabaseQuery.eq("storeId", query.storeId);
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

      // Formatar produtos para resposta
      const formattedProducts = (products || []).map((product) => ({
        ...product,
        averageRating: product.rating || 0,
        totalReviews: product.reviewCount || 0,
        store: {
          ...product.store,
          rating: 5, // Placeholder rating
        },
        seller: {
          id: product.sellerId,
          rating: 5,
          storeName: product.store?.name || "Loja",
        },
      }));

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

      // Query simplificada para detalhes do produto
      const { data: product, error } = await supabase
        .from("Product")
        .select(
          `
          *,
          ProductImage (id, url, alt, order),
          ProductSpecification (id, name, value),
          categories (id, name, slug),
          stores (id, name, slug, isVerified, rating),
          sellers (id, rating, storeName)
        `
        )
        .eq("id", id)
        .eq("isActive", true)
        .eq("approval_status", "APPROVED") // Apenas produtos aprovados podem ser visualizados
        .single();

      if (error || !product) {
        logger.error("Erro ao buscar produto:", error);
        return res.status(404).json({
          error: "Produto não encontrado",
        });
      }

      // Incrementar visualizações (opcional - pode remover se não quiser salvar no banco)
      // await prisma.product.update({
      //   where: { id },
      //   data: { viewCount: { increment: 1 } }
      // });

      // Formatar resposta
      const formattedProduct = {
        ...product,
        averageRating: product.rating || 0,
        totalReviews: product.reviewCount || 0,
        store: {
          ...product.stores,
          rating: 5, // Placeholder rating
        },
        seller: {
          id: product.sellerId,
          rating: product.seller?.rating || 5,
          storeName: product.stores?.name || product.seller?.user?.name || "Loja",
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
        store:stores(id, name, slug, rating, isVerified)
      `
      )
      .eq("categoryId", product.categoryId)
      .neq("id", id)
      .eq("isActive", true)
      .eq("approval_status", "APPROVED") // Apenas produtos aprovados em relacionados
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
    logger.info("🛍️ Criação de produto requisitada:", req.body);

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
          isActive: productData.isActive,
          isFeatured: req.user.type === "ADMIN" ? productData.isFeatured : false,
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
      const imagePromises = productData.images.map((image, index) =>
        supabase.from("ProductImage").insert([
          {
            id: `img_${productId}_${index}`,
            productId: productId,
            url: image.url,
            alt: image.alt,
            order: image.order,
          },
        ])
      );

      await Promise.all(imagePromises);
    }

    // Adicionar especificações se fornecidas
    if (productData.specifications && productData.specifications.length > 0) {
      const specPromises = productData.specifications.map((spec, index) =>
        supabase.from("ProductSpecification").insert([
          {
            id: `spec_${productId}_${index}`,
            productId: productId,
            name: spec.name,
            value: spec.value,
          },
        ])
      );

      await Promise.all(specPromises);
    }

    logger.info("✅ Produto criado com sucesso:", productId);

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

    res.status(201).json({
      success: true,
      message: "Produto criado com sucesso",
      product: fullProduct || product,
    });
  } catch (error) {
    logger.error("❌ Erro ao criar produto:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Dados de entrada inválidos",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
          value: issue.input,
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
      .select("sellerId")
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
      "dimensions",
      "isActive",
      "brand",
      "model",
      "sku",
      "tags",
    ];

    const filteredData = Object.keys(productFields)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = productFields[key];
        return obj;
      }, {});

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
      await supabase.from("ProductImage").delete().eq("productId", productId);

      // Inserir novas imagens
      const imageRecords = images.map((img, idx) => ({
        productId,
        url: img.url,
        alt: img.alt || updatedProduct.name,
        isMain: img.isMain || idx === 0,
        order: img.order || idx,
      }));

      const { error: imageError } = await supabase.from("ProductImage").insert(imageRecords);

      if (imageError) {
        logger.error("⚠️ Erro ao atualizar imagens:", imageError);
      }
    }

    // Processar specifications se fornecidas
    if (specifications && Array.isArray(specifications)) {
      // Deletar especificações antigas
      await supabase.from("ProductSpecification").delete().eq("productId", productId);

      // Inserir novas especificações
      const specRecords = specifications
        .filter((spec) => spec.name && spec.value)
        .map((spec) => ({
          productId,
          name: spec.name,
          value: spec.value,
        }));

      if (specRecords.length > 0) {
        const { error: specError } = await supabase.from("ProductSpecification").insert(specRecords);

        if (specError) {
          logger.error("⚠️ Erro ao atualizar especificações:", specError);
        }
      }
    }

    logger.info("✅ Produto atualizado:", productId);

    res.json({
      success: true,
      message: "Produto atualizado com sucesso",
      product: updatedProduct,
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
      .select("sellerId, name")
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

    logger.info("✅ Produto deletado (soft delete):", productId);

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
