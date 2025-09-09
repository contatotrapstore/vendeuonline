import express from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Configurar cliente Supabase  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Schema de validação para query parameters
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('12'),
  search: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  verified: z.string().transform(val => val === 'true').optional(),
  sortBy: z.enum(['name', 'rating', 'createdAt', 'sales']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// GET /api/stores - Listar lojas
router.get('/', async (req, res) => {
  try {
    console.log('🔍 GET /api/stores - Buscando lojas no Supabase...');
    const query = querySchema.parse(req.query);

    // Buscar lojas no Supabase
    let supabaseQuery = supabase
      .from('stores')
      .select(`
        *,
        seller:sellers(*)
      `)
      .eq('isActive', true);

    // Aplicar filtros
    if (query.search) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }

    if (query.verified !== undefined) {
      supabaseQuery = supabaseQuery.eq('isVerified', query.verified);
    }

    if (query.category && query.category !== 'Todos') {
      supabaseQuery = supabaseQuery.eq('category', query.category);
    }

    if (query.city) {
      supabaseQuery = supabaseQuery.eq('city', query.city);
    }

    if (query.state) {
      supabaseQuery = supabaseQuery.eq('state', query.state);
    }

    // Aplicar ordenação
    const orderColumn = query.sortBy === 'sales' ? 'salesCount' : query.sortBy;
    supabaseQuery = supabaseQuery.order(orderColumn, { ascending: query.sortOrder === 'asc' });

    // Aplicar paginação
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    
    const { data: stores, error, count } = await supabaseQuery
      .range(from, to);

    if (error) {
      console.error('❌ Erro no Supabase:', error.message);
      throw error;
    }

    console.log(`✅ Supabase: ${stores?.length || 0} lojas encontradas`);
    
    const total = count || 0;
    const totalPages = Math.ceil(total / query.limit);

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
        hasPrev: query.page > 1
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar lojas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao conectar com o banco de dados',
      error: error.message 
    });
  }
});

// GET /api/stores/:id - Buscar loja por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !store) {
      return res.status(404).json({
        error: 'Loja não encontrada'
      });
    }

    res.json(store);

  } catch (error) {
    console.error('Erro ao buscar loja:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/stores/:id/products - Produtos de uma loja
router.get('/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    // Verificar se a loja existe
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', id)
      .single();

    if (storeError || !store) {
      return res.status(404).json({
        error: 'Loja não encontrada'
      });
    }

    // Buscar produtos da loja
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: products, error, count } = await supabase
      .from('Product')
      .select(`
        *,
        images:ProductImage(url, alt, order),
        category:categories(*)
      `)
      .eq('storeId', id)
      .eq('isActive', true)
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

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
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao buscar produtos da loja:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

export default router;