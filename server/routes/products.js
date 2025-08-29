import express from 'express';
import { z } from 'zod';

const router = express.Router();

// Mock data para demonstração
const mockProducts = [
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    description: 'Smartphone Apple iPhone 15 Pro Max com 256GB, câmera profissional e chip A17 Pro',
    price: 8999.99,
    comparePrice: 9499.99,
    stock: 15,
    isActive: true,
    isFeatured: true,
    rating: 0,
    averageRating: 4.8,
    reviewCount: 0,
    totalReviews: 127,
    viewCount: 0,
    salesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    categoryId: 'cat_eletr',
    images: [
      {
        id: '1',
        url: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400',
        alt: 'iPhone 15 Pro Max',
        order: 0
      }
    ],
    specifications: [
      { name: 'Marca', value: 'Apple' },
      { name: 'Modelo', value: 'iPhone 15 Pro Max' },
      { name: 'Armazenamento', value: '256GB' },
      { name: 'Condição', value: 'Novo' }
    ],
    category: {
      id: 'cat_eletr',
      name: 'Eletrônicos',
      slug: 'eletronicos'
    },
    store: {
      id: 'store_1',
      name: 'TechStore',
      slug: 'techstore',
      rating: 4.9,
      isVerified: true
    },
    seller: {
      id: 'seller_1',
      storeName: 'TechStore',
      rating: 4.9
    }
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Smartphone Samsung Galaxy S24 Ultra com S Pen, câmera de 200MP e tela Dynamic AMOLED',
    price: 7499.99,
    comparePrice: 7999.99,
    stock: 8,
    isActive: true,
    isFeatured: true,
    rating: 0,
    averageRating: 4.7,
    reviewCount: 0,
    totalReviews: 89,
    viewCount: 0,
    salesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    categoryId: 'cat_eletr',
    images: [
      {
        id: '2',
        url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400',
        alt: 'Samsung Galaxy S24 Ultra',
        order: 0
      }
    ],
    specifications: [
      { name: 'Marca', value: 'Samsung' },
      { name: 'Modelo', value: 'Galaxy S24 Ultra' },
      { name: 'Armazenamento', value: '512GB' },
      { name: 'Condição', value: 'Novo' }
    ],
    category: {
      id: 'cat_eletr',
      name: 'Eletrônicos',
      slug: 'eletronicos'
    },
    store: {
      id: 'store_2',
      name: 'GalaxyShop',
      slug: 'galaxyshop',
      rating: 4.8,
      isVerified: true
    },
    seller: {
      id: 'seller_2',
      storeName: 'GalaxyShop',
      rating: 4.8
    }
  },
  {
    id: '3',
    name: 'Notebook Dell Inspiron 15',
    description: 'Notebook Dell Inspiron 15 com Intel i7, 16GB RAM, SSD 512GB, tela Full HD',
    price: 3299.99,
    comparePrice: 3799.99,
    stock: 5,
    isActive: true,
    isFeatured: false,
    rating: 0,
    averageRating: 4.5,
    reviewCount: 0,
    totalReviews: 64,
    viewCount: 0,
    salesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    categoryId: 'cat_eletr',
    images: [
      {
        id: '3',
        url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
        alt: 'Notebook Dell Inspiron 15',
        order: 0
      }
    ],
    specifications: [
      { name: 'Marca', value: 'Dell' },
      { name: 'Modelo', value: 'Inspiron 15' },
      { name: 'Processador', value: 'Intel Core i7' },
      { name: 'RAM', value: '16GB' },
      { name: 'Armazenamento', value: '512GB SSD' },
      { name: 'Condição', value: 'Novo' }
    ],
    category: {
      id: 'cat_eletr',
      name: 'Eletrônicos',
      slug: 'eletronicos'
    },
    store: {
      id: 'store_3',
      name: 'ComputerWorld',
      slug: 'computerworld',
      rating: 4.6,
      isVerified: true
    },
    seller: {
      id: 'seller_3',
      storeName: 'ComputerWorld',
      rating: 4.6
    }
  },
  {
    id: '4',
    name: 'Tênis Nike Air Max 270',
    description: 'Tênis Nike Air Max 270 masculino, confortável e estiloso para o dia a dia',
    price: 599.99,
    comparePrice: 699.99,
    stock: 20,
    isActive: true,
    isFeatured: false,
    rating: 0,
    averageRating: 4.4,
    reviewCount: 0,
    totalReviews: 156,
    viewCount: 0,
    salesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    categoryId: 'cat_moda',
    images: [
      {
        id: '4',
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
        alt: 'Tênis Nike Air Max 270',
        order: 0
      }
    ],
    specifications: [
      { name: 'Marca', value: 'Nike' },
      { name: 'Modelo', value: 'Air Max 270' },
      { name: 'Tamanho', value: '42' },
      { name: 'Cor', value: 'Preto/Branco' },
      { name: 'Condição', value: 'Novo' }
    ],
    category: {
      id: 'cat_moda',
      name: 'Moda & Beleza',
      slug: 'moda-beleza'
    },
    store: {
      id: 'store_4',
      name: 'SneakerHouse',
      slug: 'sneakerhouse',
      rating: 4.7,
      isVerified: true
    },
    seller: {
      id: 'seller_4',
      storeName: 'SneakerHouse',
      rating: 4.7
    }
  },
  {
    id: '5',
    name: 'Smart TV LG 55" 4K',
    description: 'Smart TV LG 55 polegadas 4K Ultra HD com HDR, WebOS e controle por voz',
    price: 2199.99,
    comparePrice: 2599.99,
    stock: 3,
    isActive: true,
    isFeatured: true,
    rating: 0,
    averageRating: 4.6,
    reviewCount: 0,
    totalReviews: 93,
    viewCount: 0,
    salesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    categoryId: 'cat_eletr',
    images: [
      {
        id: '5',
        url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
        alt: 'Smart TV LG 55" 4K',
        order: 0
      }
    ],
    specifications: [
      { name: 'Marca', value: 'LG' },
      { name: 'Tamanho', value: '55 polegadas' },
      { name: 'Resolução', value: '4K Ultra HD' },
      { name: 'Sistema', value: 'WebOS' },
      { name: 'Condição', value: 'Novo' }
    ],
    category: {
      id: 'cat_eletr',
      name: 'Eletrônicos',
      slug: 'eletronicos'
    },
    store: {
      id: 'store_5',
      name: 'TVMax',
      slug: 'tvmax',
      rating: 4.5,
      isVerified: true
    },
    seller: {
      id: 'seller_5',
      storeName: 'TVMax',
      rating: 4.5
    }
  }
];

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

    let filteredProducts = [...mockProducts];

    // Aplicar filtros
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.specifications.some(spec => 
          spec.name.toLowerCase().includes(searchTerm) ||
          spec.value.toLowerCase().includes(searchTerm)
        )
      );
    }

    if (query.category && query.category !== 'Todos') {
      const categorySlug = query.category.toLowerCase().replace(/\s+/g, '-');
      filteredProducts = filteredProducts.filter(product => 
        product.category.slug === categorySlug ||
        product.category.name.toLowerCase() === query.category.toLowerCase()
      );
    }

    if (query.minPrice) {
      filteredProducts = filteredProducts.filter(product => product.price >= query.minPrice);
    }

    if (query.maxPrice) {
      filteredProducts = filteredProducts.filter(product => product.price <= query.maxPrice);
    }

    if (query.storeId) {
      filteredProducts = filteredProducts.filter(product => product.store.id === query.storeId);
    }

    if (query.sellerId) {
      filteredProducts = filteredProducts.filter(product => product.seller.id === query.sellerId);
    }

    if (query.featured) {
      filteredProducts = filteredProducts.filter(product => product.isFeatured);
    }

    // Ordenação
    if (query.sortBy === 'price') {
      filteredProducts.sort((a, b) => {
        return query.sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
      });
    } else if (query.sortBy === 'rating') {
      filteredProducts.sort((a, b) => {
        return query.sortOrder === 'asc' ? a.averageRating - b.averageRating : b.averageRating - a.averageRating;
      });
    } else if (query.sortBy === 'sales') {
      filteredProducts.sort((a, b) => {
        return query.sortOrder === 'asc' ? a.salesCount - b.salesCount : b.salesCount - a.salesCount;
      });
    } else if (query.sortBy === 'name') {
      filteredProducts.sort((a, b) => {
        return query.sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
    }

    // Paginação
    const total = filteredProducts.length;
    const skip = (query.page - 1) * query.limit;
    const products = filteredProducts.slice(skip, skip + query.limit);

    const totalPages = Math.ceil(total / query.limit);

    res.json({
      products: products,
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
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        details: error.issues
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/products/:id - Buscar produto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = mockProducts.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    // Simular incremento de visualizações
    product.viewCount = (product.viewCount || 0) + 1;

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

    const product = mockProducts.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado'
      });
    }

    // Buscar produtos relacionados (mesma categoria ou loja, exceto o atual)
    const relatedProducts = mockProducts
      .filter(p => 
        p.id !== id && 
        (p.categoryId === product.categoryId || p.seller.id === product.seller.id)
      )
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, limit);

    res.json({
      products: relatedProducts
    });

  } catch (error) {
    console.error('Erro ao buscar produtos relacionados:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

export default router;