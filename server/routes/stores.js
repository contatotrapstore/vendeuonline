import express from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase-client.js";

const router = express.Router();

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Buscar dados atualizados do usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      console.error('❌ Erro ao buscar usuário:', error);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(401).json({ error: 'Token inválido' });
  }
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
    console.log("🔍 GET /api/stores - Buscando lojas no Supabase...");
    const query = querySchema.parse(req.query);

    // Buscar lojas no Supabase
    let supabaseQuery = supabase
      .from("stores")
      .select(
        `
        *,
        seller:sellers(*)
      `
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

    // Aplicar ordenação
    const orderColumn = query.sortBy === "sales" ? "salesCount" : query.sortBy;
    supabaseQuery = supabaseQuery.order(orderColumn, { ascending: query.sortOrder === "asc" });

    // Aplicar paginação
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;

    const { data: stores, error, count } = await supabaseQuery.range(from, to);

    if (error) {
      console.error("❌ Erro no Supabase:", error.message);
      throw error;
    }

    console.log(`✅ Supabase: ${stores?.length || 0} lojas encontradas`);

    const total = count || 0;
    const totalPages = Math.ceil(total / query.limit);

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      data: stores || [],
      stores: stores || [], // Para compatibilidade
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar lojas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao conectar com o banco de dados",
      error: error.message,
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
    console.error("Erro ao buscar loja:", error);
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

    res.set('Content-Type', 'application/json; charset=utf-8');
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
    console.error("Erro ao buscar produtos da loja:", error);
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
      contact
    } = req.body;

    console.log(`🏪 PUT /api/stores/${id} - Atualizando loja para usuário ${req.user.email}`);
    console.log('📦 Dados recebidos:', { name, description, category, address, contact, logo, banner, phone, website, whatsapp, email });
    console.log('📞 Dados de contato específicos:', contact);

    // Verificar se o usuário é vendedor
    if (req.user.type !== 'SELLER') {
      return res.status(403).json({ error: 'Apenas vendedores podem atualizar lojas' });
    }

    // Buscar dados do vendedor
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('userId', req.user.id)
      .single();

    if (sellerError || !seller) {
      console.error('❌ Vendedor não encontrado para usuário:', req.user.id, sellerError);
      return res.status(404).json({ error: 'Vendedor não encontrado' });
    }

    // Verificar se a loja existe e pertence ao vendedor
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .eq('sellerId', seller.id)
      .single();

    if (storeError || !store) {
      console.error('❌ Loja não encontrada ou não pertence ao vendedor:', id, seller.id, storeError);
      return res.status(404).json({ error: 'Loja não encontrada ou você não tem permissão para atualizá-la' });
    }

    // Extrair dados de contato se fornecidos
    const contactPhone = contact?.phone || phone;
    const contactWhatsapp = contact?.whatsapp;
    const contactEmail = contact?.email;
    const contactWebsite = contact?.website || website;
    
    console.log('🔍 Processando dados de contato:', { 
      contactPhone, contactWhatsapp, contactEmail, contactWebsite 
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
      updatedAt: new Date().toISOString()
    };

    console.log('🔄 Atualizando store com dados:', updateData);

    // Atualizar dados na tabela stores
    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar loja na tabela stores:', updateError);
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

    const { error: sellerUpdateError } = await supabase
      .from('sellers')
      .update(sellerUpdateData)
      .eq('id', seller.id);

    if (sellerUpdateError) {
      console.warn('⚠️ Erro ao sincronizar dados do seller:', sellerUpdateError);
      // Não falha a operação se não conseguir sincronizar
    }

    console.log('✅ Loja atualizada com sucesso:', updatedStore.name);

    res.json({
      success: true,
      message: 'Loja atualizada com sucesso',
      data: updatedStore
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar loja:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

export default router;
