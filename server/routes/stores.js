import express from 'express';
import { z } from 'zod';

const router = express.Router();

// Mock data para demonstração
const mockStores = [
  {
    id: 'store_1',
    name: 'TechStore',
    slug: 'techstore',
    description: 'Sua loja de tecnologia especializada em smartphones, notebooks e acessórios',
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200',
    banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    address: 'Rua da Tecnologia, 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    phone: '(11) 99999-9999',
    email: 'contato@techstore.com',
    whatsapp: '(11) 99999-9999',
    website: 'https://techstore.com',
    category: 'Eletrônicos',
    isActive: true,
    isVerified: true,
    rating: 4.9,
    reviewCount: 127,
    productCount: 25,
    salesCount: 890,
    plan: 'PEQUENA_EMPRESA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'store_2',
    name: 'GalaxyShop',
    slug: 'galaxyshop',
    description: 'Especialista em produtos Samsung e Android',
    logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200',
    banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    address: 'Av. Samsung, 456',
    city: 'Rio de Janeiro',
    state: 'RJ',
    zipCode: '20000-000',
    phone: '(21) 88888-8888',
    email: 'contato@galaxyshop.com',
    whatsapp: '(21) 88888-8888',
    website: 'https://galaxyshop.com',
    category: 'Eletrônicos',
    isActive: true,
    isVerified: true,
    rating: 4.8,
    reviewCount: 89,
    productCount: 18,
    salesCount: 567,
    plan: 'MICRO_EMPRESA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'store_3',
    name: 'ComputerWorld',
    slug: 'computerworld',
    description: 'Notebooks, desktops e componentes para informática',
    logo: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=200',
    banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    address: 'Rua dos Computadores, 789',
    city: 'Belo Horizonte',
    state: 'MG',
    zipCode: '30000-000',
    phone: '(31) 77777-7777',
    email: 'contato@computerworld.com',
    whatsapp: '(31) 77777-7777',
    website: 'https://computerworld.com',
    category: 'Eletrônicos',
    isActive: true,
    isVerified: true,
    rating: 4.6,
    reviewCount: 64,
    productCount: 32,
    salesCount: 234,
    plan: 'EMPRESA_SIMPLES',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'store_4',
    name: 'SneakerHouse',
    slug: 'sneakerhouse',
    description: 'Os melhores tênis e calçados esportivos',
    logo: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200',
    banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    address: 'Rua dos Tênis, 321',
    city: 'Porto Alegre',
    state: 'RS',
    zipCode: '90000-000',
    phone: '(51) 66666-6666',
    email: 'contato@sneakerhouse.com',
    whatsapp: '(51) 66666-6666',
    website: 'https://sneakerhouse.com',
    category: 'Moda & Beleza',
    isActive: true,
    isVerified: true,
    rating: 4.7,
    reviewCount: 156,
    productCount: 45,
    salesCount: 1234,
    plan: 'EMPRESA_PLUS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'store_5',
    name: 'TVMax',
    slug: 'tvmax',
    description: 'Smart TVs, home theater e equipamentos de áudio e vídeo',
    logo: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=200',
    banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    address: 'Av. das TVs, 654',
    city: 'Salvador',
    state: 'BA',
    zipCode: '40000-000',
    phone: '(71) 55555-5555',
    email: 'contato@tvmax.com',
    whatsapp: '(71) 55555-5555',
    website: 'https://tvmax.com',
    category: 'Eletrônicos',
    isActive: true,
    isVerified: true,
    rating: 4.5,
    reviewCount: 93,
    productCount: 22,
    salesCount: 456,
    plan: 'GRATUITO',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Schema de validação para query parameters
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('12'),
  search: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  isVerified: z.string().transform(val => val === 'true').optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  plan: z.string().optional(),
});

// GET /api/stores - Listar lojas
router.get('/', async (req, res) => {
  try {
    const query = querySchema.parse(req.query);

    let filteredStores = [...mockStores];

    // Aplicar filtros
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredStores = filteredStores.filter(store => 
        store.name.toLowerCase().includes(searchTerm) ||
        store.description.toLowerCase().includes(searchTerm) ||
        store.category.toLowerCase().includes(searchTerm)
      );
    }

    if (query.category && query.category !== 'Todos') {
      filteredStores = filteredStores.filter(store => 
        store.category.toLowerCase() === query.category.toLowerCase()
      );
    }

    if (query.city) {
      filteredStores = filteredStores.filter(store => 
        store.city.toLowerCase() === query.city.toLowerCase()
      );
    }

    if (query.isVerified !== undefined) {
      filteredStores = filteredStores.filter(store => store.isVerified === query.isVerified);
    }

    if (query.isActive !== undefined) {
      filteredStores = filteredStores.filter(store => store.isActive === query.isActive);
    }

    if (query.plan) {
      filteredStores = filteredStores.filter(store => store.plan === query.plan);
    }

    // Paginação
    const total = filteredStores.length;
    const skip = (query.page - 1) * query.limit;
    const stores = filteredStores.slice(skip, skip + query.limit);
    const totalPages = Math.ceil(total / query.limit);

    res.json({
      stores: stores,
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

// GET /api/stores/:id - Buscar loja por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const store = mockStores.find(s => s.id === id);
    
    if (!store) {
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

// GET /api/stores/slug/:slug - Buscar loja por slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const store = mockStores.find(s => s.slug === slug);
    
    if (!store) {
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

export default router;