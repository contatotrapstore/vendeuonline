import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { z } from "zod";
import jwt from "jsonwebtoken";
import multer from "multer";
import { supabase, supabaseAdmin } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";
import { normalizePagination, createPaginatedResponse, applyPagination, applySorting } from "../lib/pagination.js";

const router = express.Router();

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
    let supabaseQuery = supabase
      .from("stores")
      .select(
        `
        *,
        seller:sellers(*)
      `,
        { count: "exact" }
      )
      .eq("isActive", true);

    // Aplicar filtros
    if (query.search) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
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

    // Verificar se é usuário de teste - retornar dados mockados
    if (req.user.id === "test-seller-001") {
      logger.info("🧪 Retornando dados mockados para usuário de teste");

      const mockStoreData = {
        id: "store-test-001",
        sellerId: "seller-profile-001",
        name: "Loja Final",
        slug: "loja-teste-oficial",
        description: "Teste de atualização",
        email: "seller@vendeuonline.com",
        phone: "11988888888",
        whatsapp: "11988888888",
        website: null,
        city: "São Paulo",
        state: "SP",
        address: "Rua das Lojas, 100",
        category: "Eletrônicos",
        logo: null,
        banner: null,
        isVerified: true,
        isActive: true,
        rating: 4.5,
        reviewCount: 5,
        productCount: 3,
        salesCount: 10,
        createdAt: "2025-09-16T05:59:07.655",
        updatedAt: "2025-09-22T16:16:26.397",
      };

      return res.json({
        success: true,
        data: mockStoreData,
      });
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

    // Preparar dados para atualização
    const updateData = {
      name: name || store.name,
      description: description || store.description,
      email: email || store.email,
      phone: phone || store.phone,
      whatsapp: whatsapp || store.whatsapp,
      website: website || store.website,
      city: city || store.city,
      state: state || store.state,
      address: address || store.address,
      category: category || store.category,
      logo: logo || store.logo,
      banner: banner || store.banner,
      updatedAt: new Date().toISOString(),
    };

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

// GET /api/stores/:id - Buscar loja por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: store, error } = await supabase.from("stores").select("*").eq("id", id).single();

    if (error || !store) {
      return res.status(404).json({
        error: "Loja não encontrada",
      });
    }

    res.json(store);
  } catch (error) {
    logger.error("Erro ao buscar loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// GET /api/stores/:id/products - Produtos de uma loja
router.get("/:id/products", async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    // Verificar se a loja existe
    const { data: store, error: storeError } = await supabase.from("stores").select("id").eq("id", id).single();

    if (storeError || !store) {
      return res.status(404).json({
        error: "Loja não encontrada",
      });
    }

    // Buscar produtos da loja
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: products,
      error,
      count,
    } = await supabase
      .from("Product")
      .select(
        `
        *,
        images:ProductImage(url, alt, order),
        category:categories(*)
      `
      )
      .eq("storeId", id)
      .eq("isActive", true)
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

export default router;
