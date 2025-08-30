import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar Prisma
const prisma = new PrismaClient();

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

// Mock data
const mockUsers = new Map();
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

    const userId = `user_${Date.now()}`;
    const hashedPassword = await hashPassword(password);
    
    const user = {
      id: userId,
      name,
      email, 
      phone,
      city,
      state,
      type: userType.toUpperCase(),
      isVerified: false,
      isActive: true,
      avatar: null,
      createdAt: new Date().toISOString()
    };

    mockUsers.set(email, { ...user, password: hashedPassword });

    const token = generateToken(user);
    console.log('Mock user created successfully:', email);

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
        isVerified: user.isVerified
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
    console.log('Login request:', { email, password: password ? '***' : 'missing' });

    // Check mock users first
    const mockUser = mockUsers.get(email);
    if (mockUser && await comparePassword(password, mockUser.password)) {
      const token = generateToken(mockUser);
      console.log('Login successful for user:', email);
      return res.json({
        message: 'Login realizado com sucesso',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          phone: mockUser.phone,
          city: mockUser.city,
          state: mockUser.state,
          userType: mockUser.type.toLowerCase(),
          isVerified: mockUser.isVerified,
          ...(mockUser.type === 'BUYER' && {
            buyer: { id: mockUser.id, wishlistCount: 0, orderCount: 0 }
          }),
          ...(mockUser.type === 'SELLER' && {
            seller: { id: mockUser.id, storeName: `${mockUser.name} Store`, rating: 5, totalSales: 0, plan: 'gratuito', isVerified: true }
          }),
          ...(mockUser.type === 'ADMIN' && {
            admin: { id: mockUser.id, permissions: ['all'] }
          })
        },
        token
      });
    }

    // Admin padrão
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
      console.log('Login successful for user:', email);

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

    console.log('User found: No');
    res.status(401).json({ error: 'Email ou senha inválidos' });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  try {
    console.log('Profile request for user:', req.user);
    
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Products API
app.get('/api/products', async (req, res) => {
  try {
    res.json({
      success: true,
      products: mockProducts,
      pagination: {
        page: 1,
        limit: 50,
        total: mockProducts.length,
        totalPages: 1
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
    res.json({
      success: true,
      stores: mockStores,
      pagination: {
        page: 1,
        limit: 50,
        total: mockStores.length,
        totalPages: 1
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
    res.json({
      success: true,
      plans: mockPlans,
      total: mockPlans.length
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

    res.json({
      success: true,
      data: {
        users: { total: 1, buyers: 0, sellers: 0, admins: 1 },
        stores: { total: 1, active: 1, pending: 0, suspended: 0 },
        products: { total: 2, approved: 2, pending: 0 },
        orders: { total: 0, revenue: 0 },
        subscriptions: { total: 0, active: 0, revenue: 0 }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
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