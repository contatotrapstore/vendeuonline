import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Carregar variáveis de ambiente
dotenv.config();

// Debug - Verificar variáveis de ambiente críticas
console.log('🔍 [DEBUG] Verificando variáveis de ambiente:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'DEFINIDA' : '❌ NÃO DEFINIDA');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'DEFINIDA' : '❌ NÃO DEFINIDA');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'DEFINIDA' : '❌ NÃO DEFINIDA');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'DEFINIDA' : '❌ NÃO DEFINIDA');

// Configurar Prisma
const prisma = new PrismaClient();

// Debug - Testar conexão com banco
prisma.$connect()
  .then(() => {
    console.log('✅ [DEBUG] Conexão com banco de dados estabelecida com sucesso');
  })
  .catch((error) => {
    console.error('❌ [DEBUG] Erro ao conectar com banco de dados:', error.message);
  });

// Configurações JWT
const JWT_SECRET = process.env.JWT_SECRET || 'cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Funções auxiliares
const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização requerido' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API funcionando!', timestamp: new Date().toISOString() });
});

// Conectar ao banco de dados via Prisma - não usar dados mock
const mockProducts = [
  {
    id: "1",
    name: "Smartphone Samsung Galaxy S24",
    description: "Smartphone premium com câmera profissional e desempenho superior.",
    price: 2499.99,
    originalPrice: 2799.99,
    category: "eletronicos",
    images: [
      { id: "1", url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400", alt: "Samsung Galaxy S24", order: 0 }
    ],
    specifications: { marca: "Samsung", modelo: "Galaxy S24", cor: "Preto" },
    isActive: true,
    store: { id: "1", name: "TechStore", slug: "techstore" }
  },
  {
    id: "2", 
    name: "Notebook Dell Inspiron",
    description: "Notebook para uso profissional com alta performance.",
    price: 3299.99,
    category: "eletronicos",
    images: [
      { id: "2", url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400", alt: "Dell Inspiron", order: 0 }
    ],
    isActive: true,
    store: { id: "1", name: "TechStore", slug: "techstore" }
  }
];

const mockStores = [
  {
    id: "1",
    name: "TechStore",
    slug: "techstore", 
    description: "Sua loja de tecnologia completa",
    isActive: true,
    seller: { user: { name: "João Silva" } }
  }
];

const mockPlans = [
  {
    id: "plan_1",
    name: "Gratuito",
    slug: "gratuito",
    price: 0,
    billingPeriod: "monthly",
    maxAds: 3,
    maxPhotos: 1,
    priority: 1,
    support: "email",
    features: [
      "Até 3 anúncios simultâneos",
      "1 foto por produto",
      "Suporte por email",
      "Painel básico de vendas"
    ],
    isActive: true,
    isFeatured: false,
    order: 1
  },
  {
    id: "plan_2", 
    name: "Básico",
    slug: "basico",
    price: 29.90,
    billingPeriod: "monthly",
    maxAds: 10,
    maxPhotos: 3,
    priority: 2,
    support: "email",
    features: [
      "Até 10 anúncios simultâneos",
      "3 fotos por produto", 
      "Suporte prioritário por email",
      "Relatórios básicos de vendas",
      "Integração com redes sociais"
    ],
    isActive: true,
    isFeatured: false,
    order: 2
  }
];

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, userType, city, state } = req.body;

    console.log('Registration request:', { name, email, phone, city, state, userType });

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Este email já está cadastrado' });
    }

    const hashedPassword = await hashPassword(password);
    
    // Criar usuário no banco de dados
    const user = await prisma.user.create({
      data: {
        name,
        email, 
        phone,
        password: hashedPassword,
        city,
        state,
        type: userType.toUpperCase(),
        isVerified: false,
        isActive: true,
        avatar: null
      }
    });

    // Criar registro específico do tipo de usuário
    if (userType === 'buyer') {
      await prisma.buyer.create({
        data: {
          userId: user.id
        }
      });
    } else if (userType === 'seller') {
      await prisma.seller.create({
        data: {
          userId: user.id
        }
      });
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      state: user.state,
      type: user.type,
      isVerified: user.isVerified
    });

    console.log('User created successfully in database:', email);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        state: user.state,
        userType: userType,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString()
      },
      token
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    console.log('Login request:', { email, password: password ? '***' : 'missing', userType });

    // Admin padrão (manter para testes)
    if (email === 'admin@test.com' && password === '123456') {
      const adminUser = {
        id: 'admin_1',
        name: 'Administrador',
        email: 'admin@test.com',
        phone: '11999999999',
        city: 'São Paulo',
        state: 'SP',
        type: 'ADMIN',
        isVerified: true,
        isActive: true,
        avatar: null,
        createdAt: new Date().toISOString()
      };

      const token = generateToken(adminUser);
      console.log('Login successful for admin user:', email);

      return res.json({
        message: 'Login realizado com sucesso',
        user: {
          ...adminUser,
          userType: 'admin',
          admin: { id: 'admin_1', permissions: ['all'] }
        },
        token
      });
    }

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        buyer: true,
        seller: {
          include: {
            store: true
          }
        },
        admin: true
      }
    });

    if (!user || !user.isActive) {
      console.log('User not found or inactive:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Verificar senha
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Verificar tipo de usuário se especificado
    if (userType && user.type.toLowerCase() !== userType.toLowerCase()) {
      console.log('User type mismatch:', { expected: userType, actual: user.type });
      return res.status(401).json({ error: 'Tipo de usuário incorreto' });
    }

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      state: user.state,
      type: user.type,
      isVerified: user.isVerified
    });

    console.log('Login successful for user:', email);

    // Construir resposta com dados específicos do tipo de usuário
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      state: user.state,
      userType: user.type.toLowerCase(),
      isVerified: user.isVerified,
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString()
    };

    if (user.type === 'BUYER' && user.buyer) {
      userData.buyer = {
        id: user.buyer.id,
        wishlistCount: 0, // TODO: calcular do banco
        orderCount: 0 // TODO: calcular do banco
      };
    }

    if (user.type === 'SELLER' && user.seller) {
      userData.seller = {
        id: user.seller.id,
        storeName: user.seller.store?.name || `${user.name} Store`,
        rating: user.seller.rating,
        totalSales: user.seller.totalSales,
        plan: 'gratuito', // TODO: buscar plano atual
        isVerified: user.seller.isVerified
      };
    }

    if (user.type === 'ADMIN' && user.admin) {
      userData.admin = {
        id: user.admin.id,
        permissions: JSON.parse(user.admin.permissions)
      };
    }

    return res.json({
      message: 'Login realizado com sucesso',
      user: userData,
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    console.log('Profile request for user:', req.user);
    
    // Buscar dados atualizados do usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        buyer: true,
        seller: {
          include: {
            store: true
          }
        },
        admin: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Construir dados do usuário para resposta
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      state: user.state,
      userType: user.type.toLowerCase(),
      isVerified: user.isVerified,
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString()
    };

    if (user.type === 'BUYER' && user.buyer) {
      userData.buyer = {
        id: user.buyer.id,
        wishlistCount: 0, // TODO: calcular do banco
        orderCount: 0 // TODO: calcular do banco
      };
    }

    if (user.type === 'SELLER' && user.seller) {
      userData.seller = {
        id: user.seller.id,
        storeName: user.seller.store?.name || `${user.name} Store`,
        rating: user.seller.rating,
        totalSales: user.seller.totalSales,
        plan: 'gratuito', // TODO: buscar plano atual
        isVerified: user.seller.isVerified
      };
    }

    if (user.type === 'ADMIN' && user.admin) {
      userData.admin = {
        id: user.admin.id,
        permissions: JSON.parse(user.admin.permissions)
      };
    }
    
    res.json({
      user: userData
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Products API
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category, seller } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(category && { categoryId: category }),
      ...(seller && { sellerId: seller })
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: true,
          category: true,
          seller: {
            include: {
              store: true,
              user: {
                select: { name: true, city: true, state: true }
              }
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);
    
    res.json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Stores API
app.get('/api/stores', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          seller: {
            include: {
              user: {
                select: { name: true, city: true, state: true }
              }
            }
          },
          _count: {
            select: { products: true }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.store.count({ where })
    ]);
    
    res.json({
      success: true,
      stores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar lojas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Plans API
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });
    
    res.json({
      success: true,
      plans: plans.map(plan => ({
        ...plan,
        features: JSON.parse(plan.features || '[]')
      })),
      total: plans.length
    });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Orders API
app.get('/api/orders', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      orders: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Wishlist APIs
app.get('/api/wishlist', authenticate, async (req, res) => {
  try {
    res.json({ 
      success: true,
      data: [],
      total: 0
    });
  } catch (error) {
    console.error('Erro ao buscar wishlist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/buyer/wishlist', authenticate, async (req, res) => {
  try {
    res.json({ 
      success: true,
      data: [],
      total: 0
    });
  } catch (error) {
    console.error('Erro ao buscar wishlist do buyer:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin stats
app.get('/api/admin/stats', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const [
      totalUsers,
      buyers,
      sellers,
      admins,
      totalStores,
      activeStores,
      pendingStores,
      suspendedStores,
      totalProducts,
      approvedProducts,
      pendingProducts,
      totalOrders,
      totalRevenue,
      totalSubscriptions,
      activeSubscriptions,
      subscriptionRevenue
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { type: 'BUYER' } }),
      prisma.user.count({ where: { type: 'SELLER' } }),
      prisma.user.count({ where: { type: 'ADMIN' } }),
      prisma.store.count(),
      prisma.store.count({ where: { isActive: true } }),
      prisma.store.count({ where: { isActive: false, isVerified: false } }),
      prisma.store.count({ where: { isActive: false, isVerified: true } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: false } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'COMPLETED' }
      }).then(result => result._sum.totalAmount || 0),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { isActive: true } }),
      prisma.subscription.aggregate({
        _sum: { 
          plan: {
            price: true
          }
        },
        where: { isActive: true }
      }).then(result => result._sum?.plan?.price || 0)
    ]);

    res.json({
      success: true,
      data: {
        users: { 
          total: totalUsers, 
          buyers: buyers, 
          sellers: sellers, 
          admins: admins 
        },
        stores: { 
          total: totalStores, 
          active: activeStores, 
          pending: pendingStores, 
          suspended: suspendedStores 
        },
        products: { 
          total: totalProducts, 
          approved: approvedProducts, 
          pending: pendingProducts 
        },
        orders: { 
          total: totalOrders, 
          revenue: totalRevenue 
        },
        subscriptions: { 
          total: totalSubscriptions, 
          active: activeSubscriptions, 
          revenue: subscriptionRevenue 
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin Users API
app.get('/api/admin/users', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { page = 1, limit = 20, search, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(type && { type: type.toUpperCase() })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          type: true,
          city: true,
          state: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          lastLogin: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin Stores API
app.get('/api/admin/stores', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status && { 
        isActive: status === 'active',
        ...(status === 'pending' && { isVerified: false })
      })
    };

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          seller: {
            include: {
              user: {
                select: { name: true, email: true, city: true, state: true }
              }
            }
          },
          _count: {
            select: { products: true }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.store.count({ where })
    ]);
    
    res.json({
      success: true,
      stores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar lojas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin Products API
app.get('/api/admin/products', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status && { 
        isActive: status === 'active'
      })
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: true,
          category: true,
          seller: {
            include: {
              store: true,
              user: {
                select: { name: true, email: true, city: true, state: true }
              }
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);
    
    res.json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Profile and addresses
app.get('/api/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/profile/addresses', authenticate, (req, res) => {
  res.json({ addresses: [] });
});

// Export the Express API
export default app;