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
  minPrice: z.string().transform(val => parseFloat(val)).optional(),
  maxPrice: z.string().transform(val => parseFloat(val)).optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'rating', 'sales']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  storeId: z.string().optional(),
  sellerId: z.string().optional(),
  featured: z.string().transform(val => val === 'true').optional()
});

// GET /api/products - Listar produtos
router.get('/', async (req, res) => {
  try {
    const query = querySchema.parse(req.query);

    // Dados mock temporários enquanto configuramos Supabase
    const mockProducts = [
      {
        id: "test-product-1",
        name: "Smartphone Galaxy S24",
        description: "Smartphone Samsung Galaxy S24 com tela de 6.2 polegadas",
        price: 2499.90,
        comparePrice: 2799.90,
        stock: 15,
        isActive: true,
        isFeatured: true,
        rating: 4.5,
        averageRating: 4.5,
        reviewCount: 127,
        viewCount: 1250,
        salesCount: 89,
        createdAt: new Date().toISOString(),
        images: [
          {
            id: "1",
            url: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400",
            alt: "Samsung Galaxy S24",
            order: 0
          }
        ],
        category: {
          id: "cat_1",
          name: "Smartphones",
          slug: "smartphones"
        },
        store: {
          id: "store_1",
          name: "TechStore",
          slug: "techstore",
          rating: 4.8,
          isVerified: true
        }
      },
      {
        id: "test-product-2",
        name: "iPhone 15 Pro Max",
        description: "iPhone 15 Pro Max 256GB com câmera profissional",
        price: 6999.90,
        comparePrice: 7499.90,
        stock: 8,
        isActive: true,
        isFeatured: true,
        rating: 4.8,
        averageRating: 4.8,
        reviewCount: 95,
        viewCount: 2100,
        salesCount: 67,
        createdAt: new Date().toISOString(),
        images: [
          {
            id: "2",
            url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400",
            alt: "iPhone 15 Pro Max",
            order: 0
          }
        ],
        category: {
          id: "cat_1",
          name: "Smartphones",
          slug: "smartphones"
        },
        store: {
          id: "store_2",
          name: "Apple Store",
          slug: "apple-store",
          rating: 4.9,
          isVerified: true
        }
      },
      {
        id: "test-product-3",
        name: "Notebook Dell Inspiron",
        description: "Notebook Dell Inspiron 15 com Intel i5 e 8GB RAM",
        price: 2899.90,
        comparePrice: 3199.90,
        stock: 12,
        isActive: true,
        isFeatured: false,
        rating: 4.3,
        averageRating: 4.3,
        reviewCount: 76,
        viewCount: 890,
        salesCount: 45,
        createdAt: new Date().toISOString(),
        images: [
          {
            id: "3",
            url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
            alt: "Notebook Dell",
            order: 0
          }
        ],
        category: {
          id: "cat_2",
          name: "Notebooks",
          slug: "notebooks"
        },
        store: {
          id: "store_3",
          name: "ComputerShop",
          slug: "computershop",
          rating: 4.6,
          isVerified: true
        }
      }
    ];

    // Aplicar filtros simples
    let filteredProducts = [...mockProducts];

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
      );
    }

    if (query.featured) {
      filteredProducts = filteredProducts.filter(product => product.isFeatured);
    }

    // Paginação simples
    const startIndex = (query.page - 1) * query.limit;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + query.limit);
    
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / query.limit);

    res.json({
      success: true,
      products: paginatedProducts,
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
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
});

// GET /api/products/:id - Buscar produto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('Product')
      .select(`
        *,
        images:ProductImage(*),
        specifications:ProductSpecification(*),
        category:categories(*),
        store:stores(id, name, slug, rating, isVerified),
        seller:sellers(id, storeName, rating)
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    // Incrementar visualizações
    await supabase
      .from('Product')
      .update({ viewCount: product.viewCount + 1 })
      .eq('id', id);

    res.json(product);

  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/products/:id/related - Produtos relacionados
router.get('/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    // Primeiro buscar o produto para pegar a categoria
    const { data: product, error: productError } = await supabase
      .from('Product')
      .select('categoryId')
      .eq('id', id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    // Buscar produtos relacionados da mesma categoria
    const { data: relatedProducts, error } = await supabase
      .from('Product')
      .select(`
        *,
        images:ProductImage(url, alt, order),
        category:categories(*),
        store:stores(id, name, slug, rating, isVerified)
      `)
      .eq('categoryId', product.categoryId)
      .neq('id', id)
      .eq('isActive', true)
      .limit(limit);

    if (error) {
      throw error;
    }

    res.json({
      products: relatedProducts || []
    });

  } catch (error) {
    console.error('Erro ao buscar produtos relacionados:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

export default router;