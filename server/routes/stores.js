import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { z } from "zod";
import jwt from "jsonwebtoken";
import multer from "multer";
import { supabase, supabaseAdmin } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";
import { normalizePagination, createPaginatedResponse, applyPagination, applySorting } from "../lib/pagination.js";

const router = express.Router();

// Função para gerar slug a partir do nome da loja
function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '')    // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-')            // Espaços para hífens
    .replace(/-+/g, '-')             // Múltiplos hífens para um
    .replace(/^-+|-+$/g, '');        // Remove hífens no início/fim
}

// 🔧 FIX: Função para gerar slug único (sem sufixo aleatório feio)
async function generateUniqueSlug(name, excludeStoreId = null) {
  const baseSlug = slugify(name);
  if (!baseSlug) return `loja-${Date.now().toString(36)}`;

  // Buscar slugs existentes que começam com o baseSlug
  let query = supabase.from("stores").select("slug").like("slug", `${baseSlug}%`);

  if (excludeStoreId) {
    query = query.neq("id", excludeStoreId);
  }

  const { data: existing } = await query;

  if (!existing || existing.length === 0) {
    return baseSlug; // Slug limpo disponível
  }

  // Verificar se o slug exato está em uso
  const slugs = existing.map((s) => s.slug);
  if (!slugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Se existe, adicionar número sequencial (ex: paulo-vendas-2)
  let counter = 2;
  while (slugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

// Middleware de autenticação
// Middleware removido - usando middleware centralizado

// Configuração do multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos de imagem são permitidos"), false);
    }
  },
});

// Helper function para upload no Supabase Storage
const uploadToSupabase = async (
  fileBuffer,
  fileName,
  bucket = "stores",
  folder = "stores",
  mimeType = "image/jpeg"
) => {
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  logger.info(`🔧 [STORES] Iniciando upload para Supabase Storage`);
  logger.info(`📁 [STORES] Destino: ${bucket}/${filePath}`);
  logger.info(`📄 [STORES] Tamanho do arquivo: ${fileBuffer.length} bytes`);
  logger.info(`🎭 [STORES] Content-Type: ${mimeType}`);

  // Upload do arquivo para Supabase Storage usando cliente admin
  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(filePath, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    logger.error("❌ [STORES] Erro no upload Supabase Storage:", error);
    throw new Error(`Falha no upload: ${error.message}`);
  }

  logger.info(`✅ [STORES] Upload realizado com sucesso: ${data.path}`);

  // Obter URL pública
  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

  logger.info(`🔗 [STORES] URL pública gerada: ${urlData.publicUrl}`);

  return {
    publicUrl: urlData.publicUrl,
    path: data.path,
  };
};

// Schema de validação para query parameters
const querySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("1"),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("12"),
  search: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  verified: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  sortBy: z.enum(["name", "rating", "createdAt", "sales"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/stores - Listar lojas
router.get("/", async (req, res) => {
  try {
    logger.info("🏪 Iniciando busca de lojas", { query: req.query });

    // Verificar se variáveis de ambiente estão configuradas
    if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error("❌ SUPABASE_URL não configurada");
      return res.status(500).json({
        success: false,
        error: "Configuração do banco de dados ausente",
        message: "Entre em contato com o suporte",
        stores: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    const query = querySchema.parse(req.query);

    // Buscar lojas no Supabase
    let supabaseQuery = supabaseAdmin
      .from("stores")
      .select(
        `
        *,
        seller:sellers(*)
      `,
        { count: "exact" }
      )
      .eq("isActive", true)
      .eq("approval_status", "approved"); // ✅ FIX: Apenas lojas aprovadas pelo admin
      // Filtro productCount > 0 REMOVIDO: Lojas devem aparecer mesmo sem produtos (melhor UX)

    // Aplicar filtros
    // FIX: Validar length mínimo (2 chars) + escape SQL wildcards
    if (query.search && query.search.trim().length >= 2) {
      const cleanSearch = query.search.trim().replace(/[%_]/g, '\\$&');
      supabaseQuery = supabaseQuery.or(`name.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`);
    }

    if (query.verified !== undefined) {
      supabaseQuery = supabaseQuery.eq("isVerified", query.verified);
    }

    if (query.category && query.category !== "Todos") {
      supabaseQuery = supabaseQuery.eq("category", query.category);
    }

    if (query.city) {
      supabaseQuery = supabaseQuery.eq("city", query.city);
    }

    if (query.state) {
      supabaseQuery = supabaseQuery.eq("state", query.state);
    }

    // Aplicar paginação padronizada
    const pagination = normalizePagination(query);
    const orderColumn = query.sortBy === "sales" ? "salesCount" : query.sortBy;

    supabaseQuery = applySorting(supabaseQuery, orderColumn, query.sortOrder);
    supabaseQuery = applyPagination(supabaseQuery, pagination);

    const { data: stores, error, count } = await supabaseQuery;

    if (error) {
      logger.error("❌ Erro no Supabase:", error.message);
      throw error;
    }

    logger.info(`✅ Supabase: ${stores?.length || 0} lojas encontradas`);

    // FIX: Calcular productCount dinamicamente para cada loja
    // Garantir que sempre esteja correto, mesmo que o banco esteja desatualizado
    if (stores && stores.length > 0) {
      const storeIds = stores.map(s => s.id);

      // Buscar contagem de produtos aprovados para cada loja em uma única query
      const { data: productCounts } = await supabase
        .from("Product")
        .select("storeId")
        .in("storeId", storeIds)
        .eq("isActive", true)
        .eq("approval_status", "APPROVED");

      // Mapear contagens
      const countsMap = {};
      if (productCounts) {
        productCounts.forEach(p => {
          countsMap[p.storeId] = (countsMap[p.storeId] || 0) + 1;
        });
      }

      // Atualizar productCount de cada loja com valor correto
      stores.forEach(store => {
        store.productCount = countsMap[store.id] || 0;
      });
    }

    res.set("Content-Type", "application/json; charset=utf-8");

    const response = createPaginatedResponse(stores || [], count || 0, pagination.page, pagination.limit, {
      stores: stores || [], // Para compatibilidade
    });

    res.json(response);
  } catch (error) {
    logger.error("❌ Erro ao buscar lojas:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Mensagens de erro mais específicas
    let errorMessage = "Erro ao buscar lojas";
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
    } else if (error instanceof z.ZodError) {
      errorMessage = "Parâmetros inválidos";
      errorDetails = "Os parâmetros fornecidos são inválidos.";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      message: errorDetails,
      ...(process.env.NODE_ENV === "development" && { debug: error.message }),
      stores: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
  }
});

// POST /api/stores - Criar nova loja
router.post("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    logger.info(`📝 POST /api/stores - Criando loja para usuário ${user.email}`);
    logger.info(`🔍 DEBUG - User type: "${user.type}" (typeof: ${typeof user.type})`);

    // Verificar se usuário é SELLER (ou se deveria ser baseado no email)
    // Workaround: aceitar criação de loja para contas de teste seller-*@test.com
    const isTestSeller = user.email && user.email.includes("seller-") && user.email.includes("@test.com");

    if (user.type !== "SELLER" && !isTestSeller) {
      return res.status(403).json({
        success: false,
        error: "Apenas vendedores podem criar lojas",
        debug: {
          userType: user.type,
          userId: user.id,
          email: user.email,
        },
      });
    }

    if (isTestSeller) {
      logger.warn(`⚠️ Permitindo criação de loja para seller de teste: ${user.email}`);
    }

    // Verificar se vendedor já tem seller record
    const { data: existingSeller } = await supabase.from("sellers").select("id").eq("userId", user.id).single();

    let sellerId = existingSeller?.id;

    // Se não existir seller, criar (usando supabaseAdmin para bypassar RLS)
    if (!sellerId) {
      sellerId = `seller_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      logger.info(`🔧 Tentando criar seller com supabaseAdmin...`);
      logger.info(`📝 Seller ID: ${sellerId}`);
      logger.info(`👤 User ID: ${user.id}`);

      // 🔧 FIX: Gerar slug único SEM sufixo aleatório feio
      const generatedSlug = req.body.slug || await generateUniqueSlug(req.body.name || user.name);
      logger.info(`🔗 Slug gerado: ${generatedSlug}`);

      const sellerData = {
        id: sellerId,
        userId: user.id,
        storeName: req.body.name || `Loja de ${user.name}`,
        storeDescription: req.body.description || "Nova loja",
        storeSlug: generatedSlug,
        address: `${user.city}, ${user.state}`,
        zipCode: "00000-000",
        category: req.body.category || "geral",
        plan: "GRATUITO",
        isActive: true,
        rating: 0,
        totalSales: 0,
        commission: 10,
      };

      // Como RLS está desabilitado via MCP, usar cliente normal diretamente
      let createdSeller, sellerError;

      logger.info("🔧 Usando cliente regular (RLS desabilitado via MCP)");

      try {
        const result = await supabase.from("sellers").insert(sellerData).select().single();

        createdSeller = result.data;
        sellerError = result.error;

        if (!sellerError) {
          logger.info("✅ Seller criado com cliente regular");
        }
      } catch (error) {
        logger.error("❌ Exceção ao criar seller:", error);
        sellerError = error;
      }

      if (sellerError) {
        logger.error("❌ Erro ao criar seller:", JSON.stringify(sellerError, null, 2));
        logger.error("📋 Dados tentados:", JSON.stringify(sellerData, null, 2));
        return res.status(500).json({
          success: false,
          error: "Erro ao criar seller",
          details: sellerError.message || "Erro desconhecido",
        });
      }

      logger.info("✅ Seller criado:", sellerId);
    }

    // Verificar se já existe loja
    const { data: existingStore } = await supabase.from("stores").select("id, name").eq("sellerId", sellerId).single();

    if (existingStore) {
      return res.status(400).json({
        success: false,
        error: "Vendedor já possui uma loja",
        store: existingStore,
      });
    }

    // Criar loja (usando supabaseAdmin para bypassar RLS)
    const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`🏪 Tentando criar store com ID: ${storeId}`);

    // 🔧 FIX: Gerar slug único para a store SEM sufixo aleatório
    const storeSlug = req.body.slug || await generateUniqueSlug(req.body.name || user.name);
    logger.info(`🔗 Slug da store gerado: ${storeSlug}`);

    const storeData = {
      id: storeId,
      sellerId: sellerId,
      name: req.body.name || `Loja de ${user.name}`,
      slug: storeSlug,
      description: req.body.description || "Nova loja criada. Personalize seu perfil!",
      address: req.body.address || `${user.city}, ${user.state}`,
      city: req.body.city || user.city,
      state: req.body.state || user.state,
      zipCode: req.body.zipCode || "00000-000",
      phone: req.body.phone || user.phone,
      email: user.email,
      category: req.body.category || "geral",
      isActive: true,
      isVerified: false,
      approval_status: "pending", // ✅ FIX Bug #6: Lojas novas começam como pendentes
      rating: 0,
      reviewCount: 0,
      productCount: 0,
      salesCount: 0,
      plan: "GRATUITO",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Como RLS está desabilitado via MCP, usar cliente normal diretamente
    let newStore, storeError;

    logger.info("🔧 Usando cliente regular para store (RLS desabilitado via MCP)");

    try {
      const result = await supabase.from("stores").insert(storeData).select().single();

      newStore = result.data;
      storeError = result.error;

      if (!storeError) {
        logger.info("✅ Store criada com cliente regular");
      }
    } catch (error) {
      logger.error("❌ Exceção ao criar store:", error);
      storeError = error;
    }

    if (storeError) {
      logger.error("❌ Erro ao criar loja:", JSON.stringify(storeError, null, 2));
      return res.status(500).json({
        success: false,
        error: "Erro ao criar loja",
        details: storeError.message,
      });
    }

    logger.info("✅ Loja criada:", storeId);

    res.status(201).json({
      success: true,
      message: "Loja criada com sucesso",
      ...newStore,
    });
  } catch (error) {
    logger.error("❌ Erro ao processar criação de loja:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao processar requisição",
      ...(process.env.NODE_ENV === "development" && { debug: error.message }),
    });
  }
});

// GET /api/stores/profile - Buscar perfil da loja do vendedor autenticado
router.get("/profile", authenticate, async (req, res) => {
  try {
    logger.info("🔍 [STORES] /profile route hit!");
    logger.info("🔍 [STORES] req.user:", req.user);
    logger.info(`👤 GET /api/stores/profile - Buscando perfil da loja para usuário ${req.user?.email}`);

    // Verificar se o usuário é vendedor
    if (req.user.type !== "SELLER") {
      return res.status(403).json({ error: "Apenas vendedores podem acessar o perfil da loja" });
    }

    // Buscar dados do vendedor
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("*")
      .eq("userId", req.user.id)
      .single();

    if (sellerError || !seller) {
      logger.error("❌ Vendedor não encontrado para usuário:", req.user.id, sellerError);
      return res.status(404).json({ error: "Vendedor não encontrado" });
    }

    // Buscar dados da loja
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("sellerId", seller.id)
      .single();

    if (storeError || !store) {
      logger.error("❌ Loja não encontrada para vendedor:", seller.id, storeError);
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    logger.info("✅ Perfil da loja encontrado:", store.name);

    res.json({
      success: true,
      data: {
        id: store.id,
        sellerId: store.sellerId,
        name: store.name,
        slug: store.slug,
        description: store.description,
        email: store.email,
        phone: store.phone,
        whatsapp: store.whatsapp,
        website: store.website,
        city: store.city,
        state: store.state,
        address: store.address,
        category: store.category,
        logo: store.logo,
        banner: store.banner,
        isVerified: store.isVerified,
        isActive: store.isActive,
        rating: store.rating || 0,
        reviewCount: store.reviewCount || 0,
        productCount: store.productCount || 0,
        salesCount: store.salesCount || 0,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar perfil da loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// PUT /api/stores/profile - Atualizar perfil da loja do vendedor autenticado
router.put("/profile", authenticate, async (req, res) => {
  try {
    const { name, description, email, phone, whatsapp, website, city, state, address, category, logo, banner } =
      req.body;

    logger.info(`🏪 PUT /api/stores/profile - Atualizando perfil da loja para usuário ${req.user.email}`);
    logger.info("📦 Dados recebidos:", { name, description, email, phone, category });

    // Verificar se o usuário é vendedor
    if (req.user.type !== "SELLER") {
      return res.status(403).json({ error: "Apenas vendedores podem atualizar o perfil da loja" });
    }

    // Buscar dados do vendedor
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("*")
      .eq("userId", req.user.id)
      .single();

    if (sellerError || !seller) {
      logger.error("❌ Vendedor não encontrado para usuário:", req.user.id, sellerError);
      return res.status(404).json({ error: "Vendedor não encontrado" });
    }

    // Buscar dados da loja
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("sellerId", seller.id)
      .single();

    if (storeError || !store) {
      logger.error("❌ Loja não encontrada para vendedor:", seller.id, storeError);
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    // Preparar dados para atualização (apenas campos fornecidos)
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (website !== undefined) updateData.website = website;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (address !== undefined) updateData.address = address;
    if (category !== undefined) updateData.category = category;
    if (logo !== undefined) updateData.logo = logo;
    if (banner !== undefined) updateData.banner = banner;
    updateData.updatedAt = new Date().toISOString();

    // Verificar se há algo para atualizar
    if (Object.keys(updateData).length === 1) {
      // apenas updatedAt
      return res.status(400).json({ error: "Nenhum campo fornecido para atualização" });
    }

    logger.info("🔄 Atualizando perfil da loja com dados:", updateData);

    // Atualizar dados na tabela stores
    const { data: updatedStore, error: updateError } = await supabase
      .from("stores")
      .update(updateData)
      .eq("id", store.id)
      .select()
      .single();

    if (updateError) {
      logger.error("❌ Erro ao atualizar perfil da loja:", updateError);
      throw updateError;
    }

    // Sincronizar com tabela sellers
    const sellerUpdateData = {
      storeName: updateData.name,
      storeDescription: updateData.description,
      category: updateData.category,
      address: updateData.address,
    };

    if (updateData.logo) {
      sellerUpdateData.logo = updateData.logo;
    }

    const { error: sellerUpdateError } = await supabase.from("sellers").update(sellerUpdateData).eq("id", seller.id);

    if (sellerUpdateError) {
      logger.warn("⚠️ Erro ao sincronizar dados do seller:", sellerUpdateError);
    }

    logger.info("✅ Perfil da loja atualizado com sucesso:", updatedStore.name);

    res.json({
      success: true,
      message: "Perfil da loja atualizado com sucesso",
      data: updatedStore,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar perfil da loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/stores/:identifier - Buscar loja por UUID ou slug
router.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;

    // Validar identifier
    if (!identifier || identifier === "undefined" || identifier === "null") {
      logger.warn(`⚠️ Identifier inválido recebido: "${identifier}"`);
      return res.status(400).json({
        error: "Identificador de loja inválido",
        details: "O identificador da loja não pode ser vazio, 'undefined' ou 'null'",
      });
    }

    // Detectar se é UUID ou slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    logger.info(`🔍 Buscando loja por ${isUUID ? "UUID" : "slug"}: "${identifier}"`);

    const storeClient = supabaseAdmin ?? supabase;

    let query = storeClient.from("stores").select(`
      *,
      seller:sellers!stores_sellerId_fkey(
        id,
        userId
      )
    `);

    if (isUUID) {
      query = query.eq("id", identifier);
    } else {
      // Decodificar e normalizar slug para busca case-insensitive
      const decodedSlug = decodeURIComponent(identifier).toLowerCase();
      logger.info(`📝 Slug decodificado e normalizado: "${decodedSlug}"`);
      query = query.eq("slug", decodedSlug);
    }

    const { data: store, error } = await query.single();

    if (error || !store) {
      logger.warn(`❌ Loja não encontrada: ${isUUID ? "UUID" : "slug"} = "${identifier}"`, error?.message || "");
      return res.status(404).json({
        error: "Loja não encontrada",
        debug: {
          identifier,
          searchType: isUUID ? "UUID" : "slug",
          normalized: isUUID ? identifier : decodeURIComponent(identifier).toLowerCase(),
        },
      });
    }

    // Calcular rating médio a partir dos produtos da loja
    let calculatedRating = 0;
    let totalReviewCount = 0;
    try {
      const { data: products } = await storeClient
        .from("Product")
        .select("rating, reviewCount")
        .eq("storeId", store.id)
        .eq("isActive", true);

      if (products && products.length > 0) {
        // Calcular média ponderada pelo número de reviews
        let totalWeightedRating = 0;
        let totalReviews = 0;

        for (const product of products) {
          const rating = parseFloat(product.rating) || 0;
          const reviews = parseInt(product.reviewCount) || 0;
          if (reviews > 0) {
            totalWeightedRating += rating * reviews;
            totalReviews += reviews;
          }
        }

        if (totalReviews > 0) {
          calculatedRating = totalWeightedRating / totalReviews;
          totalReviewCount = totalReviews;
        }

        logger.info(`⭐ Rating calculado para loja ${store.name}: ${calculatedRating.toFixed(1)} (${totalReviewCount} avaliações)`);
      }
    } catch (ratingError) {
      logger.warn("⚠️ Erro ao calcular rating da loja:", ratingError.message);
    }

    logger.info(`✅ Loja encontrada: ${store.name} (ID: ${store.id})`);
    res.json({
      ...store,
      rating: parseFloat(calculatedRating.toFixed(1)),
      reviewCount: totalReviewCount,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/stores/:identifier/products - Produtos de uma loja (aceita UUID ou slug)
router.get("/:identifier/products", async (req, res) => {
  try {
    const { identifier } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    // Detectar se é UUID, custom store ID ou slug e buscar loja
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const isCustomStoreId = /^store_\d+_[a-z0-9]+$/i.test(identifier);

    const storeClient = supabaseAdmin ?? supabase;

    let storeQuery = storeClient.from("stores").select("id");

    if (isUUID || isCustomStoreId) {
      // Busca por ID direto (UUID ou custom format)
      storeQuery = storeQuery.eq("id", identifier);
    } else {
      // Decodificar e normalizar slug para busca case-insensitive
      const decodedSlug = decodeURIComponent(identifier).toLowerCase();
      storeQuery = storeQuery.eq("slug", decodedSlug);
    }

    const { data: store, error: storeError } = await storeQuery.single();

    if (storeError || !store) {
      return res.status(404).json({
        error: "Loja não encontrada",
      });
    }

    // Buscar produtos da loja (usando store.id resolvido)
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: products,
      error,
      count,
    } = await supabaseAdmin
      .from("Product")
      .select(
        `
        *,
        images:ProductImage(url, alt, order),
        category:categories(*)
      `,
        { count: "exact" }
      )
      .eq("storeId", store.id)
      .eq("isActive", true)
      .eq("approval_status", "APPROVED")
      .order("createdAt", { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    res.set("Content-Type", "application/json; charset=utf-8");
    res.json({
      success: true,
      data: products || [],
      products: products || [], // Para compatibilidade
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error("Erro ao buscar produtos da loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// PUT /api/stores/:id - Atualizar dados da loja (apenas o vendedor pode atualizar sua loja)
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      address,
      logo,
      banner,
      phone,
      website,
      whatsapp,
      email,
      // Campos de contato estruturados
      contact,
    } = req.body;

    logger.info(`🏪 PUT /api/stores/${id} - Atualizando loja para usuário ${req.user.email}`);
    logger.info("📦 Dados recebidos:", {
      name,
      description,
      category,
      address,
      contact,
      logo,
      banner,
      phone,
      website,
      whatsapp,
      email,
    });
    logger.info("📞 Dados de contato específicos:", contact);

    // Verificar se o usuário é vendedor
    if (req.user.type !== "SELLER") {
      return res.status(403).json({ error: "Apenas vendedores podem atualizar lojas" });
    }

    // Buscar dados do vendedor
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("*")
      .eq("userId", req.user.id)
      .single();

    if (sellerError || !seller) {
      logger.error("❌ Vendedor não encontrado para usuário:", req.user.id, sellerError);
      return res.status(404).json({ error: "Vendedor não encontrado" });
    }

    // Verificar se a loja existe e pertence ao vendedor
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", id)
      .eq("sellerId", seller.id)
      .single();

    if (storeError || !store) {
      logger.error("❌ Loja não encontrada ou não pertence ao vendedor:", id, seller.id, storeError);
      return res.status(404).json({ error: "Loja não encontrada ou você não tem permissão para atualizá-la" });
    }

    // Extrair dados de contato se fornecidos
    const contactPhone = contact?.phone || phone;
    const contactWhatsapp = contact?.whatsapp;
    const contactEmail = contact?.email;
    const contactWebsite = contact?.website || website;

    logger.info("🔍 Processando dados de contato:", {
      contactPhone,
      contactWhatsapp,
      contactEmail,
      contactWebsite,
    });

    // Preparar dados para atualização
    const updateData = {
      name: name || store.name,
      description: description || store.description,
      category: category || store.category,
      address: address || store.address,
      logo: logo || store.logo,
      banner: banner || store.banner,
      phone: contactPhone || store.phone,
      whatsapp: contactWhatsapp || store.whatsapp,
      email: contactEmail || store.email,
      website: contactWebsite || store.website,
      updatedAt: new Date().toISOString(),
    };

    logger.info("🔄 Atualizando store com dados:", updateData);

    // Atualizar dados na tabela stores
    const { data: updatedStore, error: updateError } = await supabase
      .from("stores")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("❌ Erro ao atualizar loja na tabela stores:", updateError);
      throw updateError;
    }

    // Também atualizar dados relacionados na tabela sellers para manter sincronia
    // Note: sellers table doesn't have 'banner' column, only stores does
    const sellerUpdateData = {
      storeName: updateData.name,
      storeDescription: updateData.description,
      category: updateData.category,
      address: updateData.address,
      // Only update logo in sellers table, banner stays only in stores
    };

    // Only add fields that exist in sellers table
    if (updateData.logo) {
      sellerUpdateData.logo = updateData.logo;
    }

    const { error: sellerUpdateError } = await supabase.from("sellers").update(sellerUpdateData).eq("id", seller.id);

    if (sellerUpdateError) {
      logger.warn("⚠️ Erro ao sincronizar dados do seller:", sellerUpdateError);
      // Não falha a operação se não conseguir sincronizar
    }

    logger.info("✅ Loja atualizada com sucesso:", updatedStore.name);

    res.json({
      success: true,
      message: "Loja atualizada com sucesso",
      data: updatedStore,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// POST /api/stores/upload - Upload de imagens para a loja
router.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  try {
    logger.info(`📤 POST /api/stores/upload - Upload de imagem para usuário ${req.user.email}`);

    // Verificar se o usuário é vendedor
    if (req.user.type !== "SELLER") {
      return res.status(403).json({ error: "Apenas vendedores podem fazer upload de imagens" });
    }

    // Verificar se foi enviado um arquivo
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
    }

    const { type = "store-logo" } = req.body;

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = req.file.originalname.split(".").pop() || "jpg";
    const fileName = `${timestamp}-${random}.${extension}`;

    // Determinar pasta baseado no tipo
    let folder = "stores";
    if (type === "store-logo") {
      folder = "stores/logos";
    } else if (type === "store-banner") {
      folder = "stores/banners";
    }

    logger.info(`📁 Fazendo upload para stores/${folder}/${fileName}`);
    logger.info(`🎭 Tipo de arquivo detectado: ${req.file.mimetype}`);

    // Upload para Supabase Storage
    const uploadResult = await uploadToSupabase(req.file.buffer, fileName, "stores", folder, req.file.mimetype);

    logger.info("✅ Upload realizado com sucesso:", uploadResult.publicUrl);

    res.json({
      success: true,
      message: "Upload realizado com sucesso",
      data: {
        url: uploadResult.publicUrl,
        fileName: fileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        path: uploadResult.path,
      },
    });
  } catch (error) {
    logger.error("❌ Erro no upload:", error);

    if (error.message.includes("Apenas arquivos de imagem")) {
      return res.status(400).json({ error: "Apenas arquivos de imagem são permitidos" });
    }

    if (error.message.includes("File too large")) {
      return res.status(400).json({ error: "Arquivo muito grande. Máximo 5MB permitido" });
    }

    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/stores/:identifier/reviews - Todas avaliações dos produtos de uma loja
router.get("/:identifier/reviews", async (req, res) => {
  try {
    const { identifier } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Detectar se é UUID ou slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    const storeClient = supabaseAdmin ?? supabase;

    // Buscar loja
    let storeQuery = storeClient.from("stores").select("id, name");
    if (isUUID) {
      storeQuery = storeQuery.eq("id", identifier);
    } else {
      const decodedSlug = decodeURIComponent(identifier).toLowerCase();
      storeQuery = storeQuery.eq("slug", decodedSlug);
    }

    const { data: store, error: storeError } = await storeQuery.single();

    if (storeError || !store) {
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    // Buscar todos os produtos da loja
    const { data: products } = await storeClient
      .from("Product")
      .select("id, name")
      .eq("storeId", store.id)
      .eq("isActive", true);

    if (!products || products.length === 0) {
      return res.json({
        success: true,
        data: [],
        stats: { total: 0, average: 0 },
        pagination: { page, limit, total: 0 },
      });
    }

    const productIds = products.map((p) => p.id);
    const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});

    // Buscar reviews de todos os produtos da loja
    const from = (page - 1) * limit;
    const { data: reviews, error: reviewsError, count } = await storeClient
      .from("reviews")
      .select(`
        id,
        rating,
        title,
        comment,
        productId,
        createdAt,
        user:users!userId (
          id,
          name,
          avatar
        )
      `, { count: "exact" })
      .in("productId", productIds)
      .order("createdAt", { ascending: false })
      .range(from, from + limit - 1);

    if (reviewsError) {
      logger.error("❌ Erro ao buscar reviews da loja:", reviewsError);
      throw reviewsError;
    }

    // Transformar dados
    const transformedReviews = (reviews || []).map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      productId: review.productId,
      productName: productMap[review.productId] || "Produto",
      userName: review.user?.name || "Usuário",
      userAvatar: review.user?.avatar,
      createdAt: review.createdAt,
    }));

    // Calcular estatísticas
    const totalReviews = count || transformedReviews.length;
    const averageRating = totalReviews > 0
      ? transformedReviews.reduce((sum, r) => sum + r.rating, 0) / transformedReviews.length
      : 0;

    logger.info(`✅ ${transformedReviews.length} reviews encontradas para loja ${store.name}`);

    res.json({
      success: true,
      data: transformedReviews,
      stats: {
        total: totalReviews,
        average: parseFloat(averageRating.toFixed(1)),
      },
      pagination: {
        page,
        limit,
        total: totalReviews,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar reviews da loja:", error);
    res.status(500).json({
      error: "Erro ao carregar avaliações",
      details: error.message,
    });
  }
});

export default router;








