import express from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const query = querySchema.parse(req.query);

    // Dados mock temporários enquanto configuramos Supabase
    const mockStores = [
      {
        id: "store_1",
        name: "TechStore",
        slug: "techstore",
        description: "Sua loja de tecnologia especializada em smartphones e acessórios",
        logo: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200",
        banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
        address: "Rua da Tecnologia, 123",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567",
        phone: "(11) 99999-9999",
        email: "contato@techstore.com",
        category: "Eletrônicos",
        isActive: true,
        isVerified: true,
        rating: 4.8,
        reviewCount: 127,
        productCount: 25,
        salesCount: 890,
        createdAt: new Date().toISOString()
      },
      {
        id: "store_2",
        name: "Apple Store",
        slug: "apple-store",
        description: "Produtos Apple originais com garantia oficial",
        logo: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200",
        banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
        address: "Av. Paulista, 1000",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-100",
        phone: "(11) 88888-8888",
        email: "contato@applestore.com",
        category: "Eletrônicos",
        isActive: true,
        isVerified: true,
        rating: 4.9,
        reviewCount: 234,
        productCount: 18,
        salesCount: 1200,
        createdAt: new Date().toISOString()
      },
      {
        id: "store_3",
        name: "ComputerShop",
        slug: "computershop",
        description: "Notebooks, desktops e acessórios para informática",
        logo: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200",
        banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
        address: "Rua dos Computadores, 456",
        city: "Rio de Janeiro",
        state: "RJ",
        zipCode: "20000-000",
        phone: "(21) 77777-7777",
        email: "contato@computershop.com",
        category: "Informática",
        isActive: true,
        isVerified: true,
        rating: 4.6,
        reviewCount: 89,
        productCount: 42,
        salesCount: 567,
        createdAt: new Date().toISOString()
      }
    ];

    // Aplicar filtros simples
    let filteredStores = [...mockStores];

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredStores = filteredStores.filter(store => 
        store.name.toLowerCase().includes(searchTerm) ||
        store.description.toLowerCase().includes(searchTerm)
      );
    }

    if (query.verified) {
      filteredStores = filteredStores.filter(store => store.isVerified);
    }

    if (query.category && query.category !== 'Todos') {
      filteredStores = filteredStores.filter(store => 
        store.category.toLowerCase() === query.category.toLowerCase()
      );
    }

    // Paginação simples
    const startIndex = (query.page - 1) * query.limit;
    const paginatedStores = filteredStores.slice(startIndex, startIndex + query.limit);
    
    const total = filteredStores.length;
    const totalPages = Math.ceil(total / query.limit);

    res.json({
      success: true,
      stores: paginatedStores,
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
    console.error('Erro ao buscar lojas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
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
      products: products || [],
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