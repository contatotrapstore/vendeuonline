import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Importar rotas
import productsRouter from './server/routes/products.js';
import storesRouter from './server/routes/stores.js';
import authRouter from './server/routes/auth.js';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar Prisma
const prisma = new PrismaClient();

// Configurações JWT
const JWT_SECRET = process.env.JWT_SECRET || 'cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac';

const app = express();
const PORT = process.env.PORT || process.env.VITE_API_PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Usar rotas externas
app.use('/api/products', productsRouter);
app.use('/api/stores', storesRouter);
app.use('/api/auth', authRouter);

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

// Middleware de autenticação admin
const authenticateAdmin = async (req, res, next) => {
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

    // Verificar se é admin
    if (payload.type !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    req.user = payload;
    next();
  } catch (error) {
    console.error('Error in authenticateAdmin:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Funções de Auditoria
const createAuditLog = async (adminId, adminName, action, resource, resourceId, details, req, success = true, errorMessage = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action,
        resource,
        resourceId,
        details: JSON.stringify(details),
        ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
        success,
        errorMessage
      }
    });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
  }
};

// Middleware de auditoria para admins
const auditMiddleware = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();
    
    // Interceptar resposta
    res.send = function(data) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Determinar se a operação foi bem-sucedida
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Extrair detalhes da requisição
      const details = {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        statusCode: res.statusCode,
        responseTime: responseTime
      };
      
      // Remover dados sensíveis
      if (details.body && details.body.password) {
        details.body = { ...details.body, password: '[HIDDEN]' };
      }
      
      // Criar log de auditoria
      if (req.user) {
        createAuditLog(
          req.user.id,
          req.user.name || 'Admin',
          action,
          resource,
          req.params.id || null,
          details,
          req,
          success,
          success ? null : (typeof data === 'string' ? data : JSON.stringify(data))
        );
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API funcionando!' });
});

// Rotas de Autenticação (COMENTADA - usando arquivo routes/auth.js)
/*
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login request:', req.body);
    
    const { email, password, userType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no banco usando Prisma
    const whereClause = {
      email: email.toLowerCase(),
      isActive: true
    };

    // Se userType for fornecido, filtrar por ele
    if (userType) {
      whereClause.type = userType.toUpperCase();
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
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

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Remover senha da resposta
    const { password: _, ...userWithoutPassword } = user;

    // Gerar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      type: user.type
    });

    res.json({
      user: {
        ...userWithoutPassword,
        userType: user.type.toLowerCase()
      },
      token,
      expiresIn: '7d'
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
*/

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, city, state, userType } = req.body;

    console.log('Registration request:', { name, email, phone, city, state, userType });

    // Validações
    if (!name || !email || !password || !phone || !city || !state || !userType) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedUserType = userType.toUpperCase();

    // Mock check - simulate checking if user already exists
    // For demo purposes, we'll allow registration unless it's the existing mock users
    const mockExistingEmails = ['admin@test.com', 'joao@techstore.com', 'maria@email.com'];
    
    if (mockExistingEmails.includes(normalizedEmail)) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Generate mock user ID
    const newUserId = `user_${Date.now()}`;
    
    // Create mock new user object
    const newUser = {
      id: newUserId,
      name,
      email: normalizedEmail,
      phone,
      city,
      state,
      type: normalizedUserType,
      isVerified: false,
      isActive: true,
      avatar: null,
      createdAt: new Date().toISOString()
    };

    // Mock additional data based on user type
    let additionalData = {};
    
    if (normalizedUserType === 'SELLER') {
      const storeName = `Loja de ${name}`;
      additionalData.seller = {
        id: `seller_${newUserId}`,
        storeName: storeName,
        storeSlug: `${storeName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        storeDescription: `Bem-vindos à ${storeName}!`,
        rating: 0.0,
        totalSales: 0,
        commission: 5.0,
        isVerified: false
      };
    } else if (normalizedUserType === 'BUYER') {
      additionalData.buyer = {
        id: `buyer_${newUserId}`,
        preferences: {},
        favoriteCategories: []
      };
    }

    console.log('Mock user created successfully:', newUser.email);

    // Gerar token
    const token = generateToken(newUser);

    // Preparar resposta sem senha
    const { ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        ...userWithoutPassword,
        ...additionalData,
        userType: newUser.type.toLowerCase()
      },
      token
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de produtos (COMENTADA - usando arquivo routes/products.js)
/*
app.get('/api/products', async (req, res) => {
  try {
    console.log('Products request:', req.query);
    
    const {
      page = 1,
      limit = 12,
      search,
      category,
      minPrice,
      maxPrice,
      sortBy = 'createdAt'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir filtros Prisma - apenas produtos ativos e aprovados
    let whereClause = {
      isActive: true,
      approvalStatus: 'APPROVED'
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      whereClause.category = {
        slug: category
      };
    }

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price.gte = parseFloat(minPrice);
      if (maxPrice) whereClause.price.lte = parseFloat(maxPrice);
    }

    // Construir ordenação
    let orderBy = {};
    switch (sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'popular':
        orderBy = { salesCount: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Buscar produtos com contagem
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          images: {
            orderBy: { order: 'asc' }
          },
          category: true,
          store: {
            select: {
              name: true,
              slug: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.product.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      products: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Erro na API de produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
*/

// Rotas de Usuário - Perfil
app.get('/api/users/profile', authenticate, async (req, res) => {
  try {
    console.log('Profile request for user:', req.user);
    
    // Mock user data based on JWT token - while database connection is being resolved
    const userId = req.user.userId;
    const userType = req.user.type;
    
    // Create mock user data based on userId from token
    const mockUser = {
      id: userId,
      name: req.user.name || 'Mock User',
      email: req.user.email,
      phone: '(11) 99999-9999',
      city: 'São Paulo',
      state: 'SP', 
      avatar: null,
      isVerified: true,
      createdAt: new Date().toISOString(),
      buyer: userType === 'BUYER' ? { id: `buyer_${userId}` } : null,
      seller: userType === 'SELLER' ? { id: `seller_${userId}` } : null
    };

    // Mock addresses data
    const mockAddresses = [
      {
        id: 'addr_1',
        userId: userId,
        street: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        isDefault: true,
        createdAt: new Date().toISOString()
      }
    ];

    // Mock statistics
    const mockStats = {
      totalOrders: 5,
      favoriteProducts: 3,
      totalSpent: 299.90
    };

    const profile = {
      ...mockUser,
      addresses: mockAddresses,
      stats: mockStats
    };

    res.json({ profile });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/users/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, city, state } = req.body;

    if (!name || !phone || !city || !state) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name,
        phone,
        city,
        state,
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: 'Perfil atualizado com sucesso',
      user: updatedUser 
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para alterar senha
app.put('/api/users/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar usuário atual
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const passwordValid = await comparePassword(currentPassword, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const hashedNewPassword = await hashPassword(newPassword);

    // Atualizar senha
    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Senha alterada com sucesso' });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== AVATAR UPLOAD API ====
app.post('/api/users/avatar', authenticate, async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ error: 'Avatar é obrigatório' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        avatar: avatar,
        updatedAt: new Date()
      },
      select: { id: true, avatar: true }
    });

    res.json({ 
      message: 'Avatar atualizado com sucesso',
      avatarUrl: updatedUser.avatar
    });

  } catch (error) {
    console.error('Erro no upload do avatar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== ADDRESS MANAGEMENT API ====
// Listar endereços do usuário
app.get('/api/addresses', authenticate, async (req, res) => {
  try {
    // Mock addresses data while database connection is being resolved
    const mockAddresses = [
      {
        id: 'addr_1',
        userId: req.user.userId,
        label: 'Casa',
        street: 'Rua das Flores, 123',
        number: '123',
        complement: 'Apto 45',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'addr_2',
        userId: req.user.userId,
        label: 'Trabalho',
        street: 'Av. Paulista, 1000',
        number: '1000',
        complement: 'Sala 10',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    res.json({ addresses: mockAddresses });

  } catch (error) {
    console.error('Erro na API de endereços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar novo endereço
app.post('/api/addresses', authenticate, async (req, res) => {
  try {
    const {
      label,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      isDefault = false
    } = req.body;

    if (!label || !street || !number || !neighborhood || !city || !state || !zipCode) {
      return res.status(400).json({ error: 'Campos obrigatórios estão faltando' });
    }

    // Se este for o endereço padrão, remover padrão dos outros
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.userId },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user.userId,
        label,
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state,
        zipCode,
        isDefault
      }
    });

    res.status(201).json({ 
      message: 'Endereço adicionado com sucesso',
      address 
    });

  } catch (error) {
    console.error('Erro ao adicionar endereço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar endereço
app.put('/api/addresses/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      label,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      isDefault
    } = req.body;

    // Se este for o endereço padrão, remover padrão dos outros
    if (isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId: req.user.userId,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.update({
      where: { 
        id: id,
        userId: req.user.userId
      },
      data: {
        label,
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state,
        zipCode,
        isDefault: isDefault || false,
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: 'Endereço atualizado com sucesso',
      address 
    });

  } catch (error) {
    console.error('Erro ao atualizar endereço:', error);
    res.status(500).json({ error: 'Erro ao atualizar endereço' });
  }
});

// Deletar endereço
app.delete('/api/addresses/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.address.delete({
      where: { 
        id: id,
        userId: req.user.userId
      }
    });

    res.json({ message: 'Endereço removido com sucesso' });

  } catch (error) {
    console.error('Erro ao deletar endereço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== STATISTICS API ====
// Buscar estatísticas reais do usuário
app.get('/api/users/stats', authenticate, async (req, res) => {
  try {
    // Buscar pedidos do usuário
    const orders = await prisma.order.findMany({
      where: { buyerId: req.user.userId },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true
      }
    });

    // Buscar produtos favoritados (wishlist)
    const wishlist = await prisma.wishlist.findMany({
      where: {
        buyer: {
          userId: req.user.userId
        }
      },
      select: { id: true }
    });

    // Calcular estatísticas
    const totalOrders = orders?.length || 0;
    const totalSpent = orders?.reduce((sum, order) => {
      if (order.status === 'DELIVERED') {
        return sum + (parseFloat(order.total) || 0);
      }
      return sum;
    }, 0) || 0;
    const favoriteProducts = wishlist?.length || 0;

    const stats = {
      totalOrders,
      favoriteProducts,
      totalSpent: totalSpent,
      recentOrders: orders?.slice(-5) || [],
      memberSince: req.user.createdAt || null
    };

    res.json({ stats });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== ACCOUNT DELETION API ====
app.delete('/api/users/delete', authenticate, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória para deletar conta' });
    }

    // Verificar senha antes de deletar
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Deletar dados relacionados primeiro (se necessário)
    await prisma.address.deleteMany({ where: { userId: req.user.userId } });
    
    // Deletar registros específicos por tipo
    await prisma.buyer.deleteMany({ where: { userId: req.user.userId } });
    await prisma.seller.deleteMany({ where: { userId: req.user.userId } });

    // Finalmente deletar o usuário
    await prisma.user.delete({
      where: { id: req.user.userId }
    });

    res.json({ message: 'Conta deletada com sucesso' });

  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para pedidos
app.get('/api/orders', authenticate, async (req, res) => {
  try {
    // Tentar buscar pedidos do banco primeiro
    let orders = [];
    
    try {
      orders = await prisma.order.findMany({
        where: {
          buyerId: req.user.userId
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  images: {
                    take: 1,
                    orderBy: { order: 'asc' }
                  }
                }
              }
            }
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (dbError) {
      console.error('Erro ao buscar pedidos:', dbError.message);
      // Usar dados mock se falhar a conexão com o banco
      orders = [];
    }

    // Retornar lista vazia se não há pedidos
    res.json({
      success: true,
      orders: orders,
      pagination: {
        page: 1,
        limit: 50,
        total: orders.length,
        totalPages: orders.length > 0 ? 1 : 0,
        hasNext: false,
        hasPrev: false
      }
    });

  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== STORES API (COMENTADA - usando arquivo routes/stores.js) ====
/*
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      include: {
        seller: {
          select: {
            rating: true,
            totalSales: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: stores });
  } catch (error) {
    console.error('Erro ao buscar lojas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
*/

// ==== CATEGORIES API ====
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });

    res.json({ data: categories });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== PLANS API ====
app.get('/api/plans', async (req, res) => {
  try {
    // Mock plans data that matches the expected interface
    const mockPlans = [
      {
        id: "plan_1",
        name: "Gratuito",
        slug: "gratuito",
        description: "Para começar a vender",
        price: 0,
        billingPeriod: "monthly",
        maxAds: 3,
        maxPhotos: 1,
        support: "email",
        features: [
          "Até 3 anúncios",
          "1 foto por anúncio", 
          "Suporte básico por email",
          "Perfil simples de vendedor"
        ],
        isActive: true,
        order: 1
      },
      {
        id: "plan_2", 
        name: "Básico",
        slug: "basico",
        description: "Ideal para vendedores iniciantes",
        price: 19.90,
        billingPeriod: "monthly",
        maxAds: 10,
        maxPhotos: 5,
        support: "chat",
        features: [
          "Até 10 anúncios",
          "Até 5 fotos por anúncio",
          "Suporte prioritário",
          "Destaque nos resultados",
          "Estatísticas básicas"
        ],
        isActive: true,
        order: 2
      },
      {
        id: "plan_3",
        name: "Profissional", 
        slug: "profissional",
        description: "Para vendedores experientes",
        price: 39.90,
        billingPeriod: "monthly",
        maxAds: 50,
        maxPhotos: 10,
        support: "whatsapp",
        features: [
          "Até 50 anúncios",
          "Até 10 fotos por anúncio", 
          "Suporte prioritário 24/7",
          "Destaque premium",
          "Estatísticas avançadas",
          "Badge de verificado"
        ],
        isActive: true,
        order: 3
      },
      {
        id: "plan_4",
        name: "Empresa",
        slug: "empresa",
        description: "Para grandes vendedores",
        price: 79.90,
        billingPeriod: "monthly",
        maxAds: -1,
        maxPhotos: -1,
        support: "telefone",
        features: [
          "Anúncios ilimitados",
          "Fotos ilimitadas",
          "Suporte dedicado",
          "Destaque máximo",
          "Dashboard completo",
          "API de integração"
        ],
        isActive: true,
        order: 4
      }
    ];

    res.json({ data: mockPlans });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== WISHLIST API ====
app.get('/api/wishlist', authenticate, async (req, res) => {
  try {
    let wishlist = [];
    
    try {
      wishlist = await prisma.wishlist.findMany({
        where: {
          buyer: {
            userId: req.user.userId
          }
        },
        include: {
          product: {
            include: {
              images: {
                take: 1,
                orderBy: { order: 'asc' }
              },
              store: {
                select: {
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (dbError) {
      console.error('Erro ao buscar wishlist:', dbError.message);
      // Retornar lista vazia se falhar a conexão
      wishlist = [];
    }

    res.json({ 
      success: true,
      data: wishlist,
      total: wishlist.length 
    });
  } catch (error) {
    console.error('Erro ao buscar wishlist:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint alternativo para wishlist (buyer)
app.get('/api/buyer/wishlist', authenticate, async (req, res) => {
  try {
    let wishlist = [];
    
    try {
      wishlist = await prisma.wishlist.findMany({
        where: {
          buyer: {
            userId: req.user.userId
          }
        },
        include: {
          product: {
            include: {
              images: {
                take: 1,
                orderBy: { order: 'asc' }
              },
              store: {
                select: {
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (dbError) {
      console.error('Erro ao buscar wishlist do buyer:', dbError.message);
      // Retornar lista vazia se falhar a conexão
      wishlist = [];
    }

    res.json({ 
      success: true,
      data: wishlist,
      total: wishlist.length 
    });
  } catch (error) {
    console.error('Erro ao buscar wishlist do buyer:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== ADMIN APIs ====

// Dashboard Stats API
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    console.log('Admin stats endpoint called');
    
    // Buscar todas as estatísticas reais do banco
    const [
      totalUsers,
      buyersCount,
      sellersCount,
      adminsCount,
      totalStores,
      activeStores,
      pendingStores,
      suspendedStores,
      totalProducts,
      approvedProducts,
      pendingApprovals,
      totalOrders,
      activeUsers,
      totalSubscriptions,
      activeSubscriptions
    ] = await Promise.all([
      // Usuários
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { type: 'BUYER', isActive: true } }),
      prisma.user.count({ where: { type: 'SELLER', isActive: true } }),
      prisma.user.count({ where: { type: 'ADMIN', isActive: true } }),
      
      // Lojas
      prisma.store.count(),
      prisma.store.count({ where: { isActive: true } }),
      prisma.store.count({ where: { isVerified: false, isActive: true } }),
      prisma.store.count({ where: { isActive: false } }),
      
      // Produtos
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { approvalStatus: 'APPROVED', isActive: true } }),
      prisma.product.count({ where: { approvalStatus: 'PENDING', isActive: true } }),
      
      // Pedidos
      prisma.order.count(),
      
      // Usuários ativos (últimas 24h)
      prisma.user.count({ 
        where: { 
          isActive: true,
          lastLogin: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        } 
      }),
      
      // Assinaturas
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } })
    ]);

    // Receita do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        createdAt: { gte: startOfMonth }
      },
      _sum: { total: true }
    });

    // Pedidos do mês atual
    const monthlyOrders = await prisma.order.count({
      where: {
        createdAt: { gte: startOfMonth }
      }
    });

    // Taxa de conversão (vendedores com pelo menos um produto / total vendedores)
    const sellersWithProducts = await prisma.seller.count({
      where: {
        user: { isActive: true },
        products: { some: { isActive: true } }
      }
    });

    const conversionRate = sellersCount > 0 ? 
      parseFloat(((sellersWithProducts / sellersCount) * 100).toFixed(1)) : 0;

    const stats = {
      // Totais básicos
      totalUsers,
      buyersCount,
      sellersCount,
      adminsCount,
      
      // Lojas
      totalStores,
      activeStores,
      pendingStores,
      suspendedStores,
      
      // Produtos
      totalProducts,
      approvedProducts,
      pendingApprovals,
      
      // Pedidos e receita
      totalOrders,
      monthlyOrders,
      monthlyRevenue: monthlyRevenue._sum.total || 0,
      
      // Usuários ativos
      activeUsers,
      
      // Assinaturas
      totalSubscriptions,
      activeSubscriptions,
      
      // Métricas calculadas
      conversionRate
    };

    console.log('Admin stats computed:', stats);
    res.json({ data: stats });
  } catch (error) {
    console.error('Erro ao buscar estatísticas admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Users Management API
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all', userType = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = { isActive: true };

    // Filtro de busca
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filtro por tipo
    if (userType !== 'all') {
      whereClause.type = userType.toUpperCase();
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          type: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
          buyer: { select: { id: true } },
          seller: { 
            select: { 
              id: true, 
              rating: true,
              totalSales: true,
              store: { select: { name: true } }
            } 
          },
          admin: { select: { id: true, permissions: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.user.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      data: users.map(user => ({
        ...user,
        userType: user.type.toLowerCase(),
        status: user.isActive ? 'active' : 'inactive',
        storeCount: user.seller?.store ? 1 : 0,
        storeName: user.seller?.store?.name || null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuários admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update User Status
app.put('/api/admin/users/:id', authenticateAdmin, auditMiddleware('UPDATE', 'USER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isVerified } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof isActive !== 'undefined' && { isActive }),
        ...(typeof isVerified !== 'undefined' && { isVerified }),
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: 'Usuário atualizado com sucesso',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create User
app.post('/api/admin/users', authenticateAdmin, auditMiddleware('CREATE', 'USER'), async (req, res) => {
  try {
    const { name, email, password, phone, type, city, state } = req.body;

    // Validação básica
    if (!name || !email || !password || !phone || !type || !city || !state) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Hash da senha
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        type: type.toUpperCase(),
        city,
        state,
        isVerified: true, // Admin pode criar usuários já verificados
        isActive: true
      }
    });

    // Criar registro específico baseado no tipo
    if (type.toUpperCase() === 'BUYER') {
      await prisma.buyer.create({
        data: { userId: newUser.id }
      });
    } else if (type.toUpperCase() === 'SELLER') {
      await prisma.seller.create({
        data: { userId: newUser.id }
      });
    } else if (type.toUpperCase() === 'ADMIN') {
      await prisma.admin.create({
        data: { 
          userId: newUser.id,
          permissions: JSON.stringify(['read', 'write']) // Permissões padrão
        }
      });
    }

    // Remover senha da resposta
    const { password: _, ...userResponse } = newUser;

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      data: userResponse
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete User
app.delete('/api/admin/users/:id', authenticateAdmin, auditMiddleware('DELETE', 'USER'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: true,
        subscriptions: { where: { status: 'ACTIVE' } },
        seller: {
          include: {
            products: true,
            store: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se é seguro deletar
    if (user.orders.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir usuário com pedidos associados. Use desativação em vez disso.' 
      });
    }

    if (user.subscriptions.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir usuário com assinaturas ativas. Cancele as assinaturas primeiro.' 
      });
    }

    if (user.seller?.products.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir vendedor com produtos. Remova os produtos primeiro.' 
      });
    }

    // Deletar usuário (cascade irá deletar registros relacionados)
    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Plans Management API
// Removed duplicate endpoint - using the one with JSON.parse features below

// Create Plan
app.post('/api/admin/plans', authenticateAdmin, auditMiddleware('CREATE', 'PLAN'), async (req, res) => {
  try {
    const planData = req.body;
    
    const newPlan = await prisma.plan.create({
      data: {
        ...planData,
        features: typeof planData.features === 'string' ? planData.features : JSON.stringify(planData.features)
      }
    });

    res.status(201).json({ 
      message: 'Plano criado com sucesso',
      plan: newPlan 
    });
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Stores Management API
app.get('/api/admin/stores', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = {};
    
    if (status === 'pending') {
      whereClause.isVerified = false;
    } else if (status === 'active') {
      whereClause.isVerified = true;
      whereClause.isActive = true;
    }

    const [stores, totalCount] = await Promise.all([
      prisma.store.findMany({
        where: whereClause,
        include: {
          seller: {
            include: {
              user: {
                select: { name: true, email: true, phone: true }
              }
            }
          },
          _count: {
            select: { products: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.store.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      data: stores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar lojas admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Approve/Suspend Store
app.put('/api/admin/stores/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, isActive } = req.body;

    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        ...(typeof isVerified !== 'undefined' && { isVerified }),
        ...(typeof isActive !== 'undefined' && { isActive }),
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: 'Loja atualizada com sucesso',
      store: updatedStore 
    });
  } catch (error) {
    console.error('Erro ao atualizar loja:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Subscriptions Management API
app.get('/api/admin/subscriptions', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [subscriptions, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        include: {
          user: { select: { name: true, email: true } },
          seller: { 
            include: { 
              store: { select: { name: true } } 
            } 
          },
          plan: { select: { name: true, price: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.subscription.count()
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      data: subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar assinaturas admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update Subscription
app.put('/api/admin/subscriptions/:id', authenticateAdmin, auditMiddleware('UPDATE', 'SUBSCRIPTION'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, endDate, nextBilling } = req.body;

    // Verificar se assinatura existe
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true, price: true } }
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    // Validar status
    const validStatuses = ['PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Status inválido. Deve ser: PENDING, ACTIVE, CANCELLED ou EXPIRED' 
      });
    }

    // Preparar dados para atualização
    let updateData = {};
    
    if (status) {
      updateData.status = status;
      
      // Se cancelando, definir endDate como agora se não fornecido
      if (status === 'CANCELLED' && !endDate) {
        updateData.endDate = new Date();
      }
      
      // Se ativando, definir startDate se não existir
      if (status === 'ACTIVE' && !subscription.startDate) {
        updateData.startDate = new Date();
      }
    }
    
    if (endDate) {
      updateData.endDate = new Date(endDate);
    }
    
    if (nextBilling) {
      updateData.nextBilling = new Date(nextBilling);
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true, price: true } }
      }
    });

    res.json({
      message: 'Assinatura atualizada com sucesso',
      data: updatedSubscription
    });
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete Subscription
app.delete('/api/admin/subscriptions/:id', authenticateAdmin, auditMiddleware('DELETE', 'SUBSCRIPTION'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se assinatura existe
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true, price: true } }
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    // Verificar se é seguro deletar
    if (subscription.status === 'ACTIVE') {
      return res.status(400).json({ 
        error: 'Não é possível excluir assinatura ativa. Cancele primeiro ou use a atualização de status.' 
      });
    }

    // Deletar assinatura
    await prisma.subscription.delete({
      where: { id }
    });

    res.json({ 
      message: 'Assinatura excluída com sucesso',
      deletedSubscription: {
        id: subscription.id,
        user: subscription.user.name,
        plan: subscription.plan.name,
        status: subscription.status
      }
    });
  } catch (error) {
    console.error('Erro ao excluir assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Audit Logs API
app.get('/api/admin/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action = 'all', resource = 'all', adminId = 'all', success = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = {};

    // Filtros
    if (action !== 'all') {
      whereClause.action = action.toUpperCase();
    }
    
    if (resource !== 'all') {
      whereClause.resource = resource.toUpperCase();
    }
    
    if (adminId !== 'all') {
      whereClause.adminId = adminId;
    }
    
    if (success !== 'all') {
      whereClause.success = success === 'true';
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.auditLog.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      data: logs.map(log => ({
        ...log,
        details: JSON.parse(log.details)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Audit Log Statistics
app.get('/api/admin/audit-stats', authenticateAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [
      totalActions,
      successfulActions,
      failedActions,
      actionsByType,
      actionsByAdmin,
      recentActivity
    ] = await Promise.all([
      prisma.auditLog.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.auditLog.count({
        where: { 
          createdAt: { gte: startDate },
          success: true 
        }
      }),
      prisma.auditLog.count({
        where: { 
          createdAt: { gte: startDate },
          success: false 
        }
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate } },
        _count: { action: true }
      }),
      prisma.auditLog.groupBy({
        by: ['adminName'],
        where: { createdAt: { gte: startDate } },
        _count: { adminName: true }
      }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          adminName: true,
          action: true,
          resource: true,
          success: true,
          createdAt: true
        }
      })
    ]);

    res.json({
      period: `${days} dias`,
      summary: {
        totalActions,
        successfulActions,
        failedActions,
        successRate: totalActions > 0 ? ((successfulActions / totalActions) * 100).toFixed(2) : 0
      },
      actionsByType: actionsByType.map(item => ({
        action: item.action,
        count: item._count.action
      })),
      actionsByAdmin: actionsByAdmin.map(item => ({
        admin: item.adminName,
        count: item._count.adminName
      })),
      recentActivity
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de auditoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin Products API
app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all', category = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = {};

    // Filtro de busca
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filtro por status de aprovação
    if (status !== 'all') {
      if (status.toLowerCase() === 'pending') {
        whereClause.approvalStatus = 'PENDING';
      } else if (status.toLowerCase() === 'approved') {
        whereClause.approvalStatus = 'APPROVED';
      } else if (status.toLowerCase() === 'rejected') {
        whereClause.approvalStatus = 'REJECTED';
      } else if (status.toLowerCase() === 'active') {
        whereClause.isActive = true;
      } else if (status.toLowerCase() === 'inactive') {
        whereClause.isActive = false;
      }
    }

    // Filtro por categoria
    if (category !== 'all') {
      whereClause.categoryId = category;
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          store: { select: { name: true } },
          seller: {
            include: {
              user: { select: { name: true, email: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.product.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar produtos admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update Product Status
app.patch('/api/admin/products/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Converter status para isActive boolean
    let isActive = true;
    if (status.toLowerCase() === 'inactive' || status.toLowerCase() === 'suspended') {
      isActive = false;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isActive, updatedAt: new Date() }
    });

    res.json({ 
      message: 'Status do produto atualizado com sucesso',
      product: updatedProduct 
    });
  } catch (error) {
    console.error('Erro ao atualizar status do produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Approve/Reject Product
app.patch('/api/admin/products/:id/approval', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, rejectionReason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'Status de aprovação inválido' });
    }

    const updateData = {
      approvalStatus,
      updatedAt: new Date()
    };

    if (approvalStatus === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = req.user.userId;
      updateData.rejectionReason = null;
    } else if (approvalStatus === 'REJECTED') {
      updateData.rejectionReason = rejectionReason || 'Produto rejeitado pelo administrador';
      updateData.approvedAt = null;
      updateData.approvedBy = null;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        store: { select: { name: true } },
        seller: {
          include: {
            user: { select: { name: true, email: true } }
          }
        }
      }
    });

    res.json({ 
      message: `Produto ${approvalStatus === 'APPROVED' ? 'aprovado' : 'rejeitado'} com sucesso`,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Erro ao aprovar/rejeitar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete Product
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({ where: { id } });

    res.json({ message: 'Produto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== ADMIN BANNERS MANAGEMENT ====
// Get All Banners
app.get('/api/admin/banners', authenticateAdmin, async (req, res) => {
  try {
    console.log('Admin banners endpoint called');
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: banners });
  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create Banner
app.post('/api/admin/banners', authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      targetUrl,
      position,
      isActive,
      startDate,
      endDate
    } = req.body;

    // Validações básicas
    if (!title || !imageUrl || !position) {
      return res.status(400).json({ error: 'Título, imagem e posição são obrigatórios' });
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        description,
        imageUrl,
        targetUrl,
        position,
        isActive: isActive !== undefined ? isActive : true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      }
    });

    console.log(`Banner "${title}" criado com sucesso`);
    res.status(201).json({ data: banner, message: 'Banner criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar banner:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update Banner
app.put('/api/admin/banners/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      imageUrl,
      targetUrl,
      position,
      isActive,
      startDate,
      endDate
    } = req.body;

    // Verificar se banner existe
    const existingBanner = await prisma.banner.findUnique({
      where: { id }
    });

    if (!existingBanner) {
      return res.status(404).json({ error: 'Banner não encontrado' });
    }

    // Validações básicas
    if (!title || !imageUrl || !position) {
      return res.status(400).json({ error: 'Título, imagem e posição são obrigatórios' });
    }

    const updatedBanner = await prisma.banner.update({
      where: { id },
      data: {
        title,
        description,
        imageUrl,
        targetUrl,
        position,
        isActive: isActive !== undefined ? isActive : existingBanner.isActive,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      }
    });

    console.log(`Banner "${title}" atualizado com sucesso`);
    res.json({ data: updatedBanner, message: 'Banner atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar banner:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Toggle Banner Status
app.patch('/api/admin/banners/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const banner = await prisma.banner.findUnique({
      where: { id }
    });

    if (!banner) {
      return res.status(404).json({ error: 'Banner não encontrado' });
    }

    const updatedBanner = await prisma.banner.update({
      where: { id },
      data: { isActive }
    });

    console.log(`Banner status alterado para ${isActive ? 'ativo' : 'inativo'}`);
    res.json({ data: updatedBanner, message: 'Status do banner atualizado' });
  } catch (error) {
    console.error('Erro ao alterar status do banner:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete Banner
app.delete('/api/admin/banners/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se banner existe
    const banner = await prisma.banner.findUnique({
      where: { id }
    });

    if (!banner) {
      return res.status(404).json({ error: 'Banner não encontrado' });
    }

    await prisma.banner.delete({
      where: { id }
    });

    console.log(`Banner "${banner.title}" excluído com sucesso`);
    res.json({ message: 'Banner excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir banner:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Track Banner Click
app.post('/api/admin/banners/:id/click', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.banner.update({
      where: { id },
      data: {
        clicks: {
          increment: 1
        }
      }
    });

    res.json({ message: 'Click registrado' });
  } catch (error) {
    console.error('Erro ao registrar click:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Track Banner Impression
app.post('/api/admin/banners/:id/impression', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.banner.update({
      where: { id },
      data: {
        impressions: {
          increment: 1
        }
      }
    });

    res.json({ message: 'Impressão registrada' });
  } catch (error) {
    console.error('Erro ao registrar impressão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==== ADMIN PLANS MANAGEMENT ====
// Get All Plans for Admin
app.get('/api/admin/plans', authenticateAdmin, async (req, res) => {
  try {
    console.log('Admin plans endpoint called');
    const plans = await prisma.plan.findMany({
      include: {
        _count: {
          select: { sellers: true, subscriptions: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Parse features JSON string for each plan
    const formattedPlans = plans.map(plan => {
      console.log('Processing plan:', plan.name, 'features:', plan.features);
      return {
        ...plan,
        features: JSON.parse(plan.features || '[]')
      };
    });

    res.json({ 
      data: formattedPlans,
      plans: formattedPlans,
      message: 'Planos carregados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar planos admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update Plan
app.put('/api/admin/plans/:id', authenticateAdmin, auditMiddleware('UPDATE', 'PLAN'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      billingPeriod,
      maxAds,
      maxPhotos,
      maxProducts,
      maxImages,
      maxCategories,
      prioritySupport,
      support,
      features,
      isActive
    } = req.body;

    // Validações
    if (!name || !description || price < 0) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Atualizar plano
    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        billingPeriod,
        maxAds: parseInt(maxAds) || -1,
        maxPhotos: parseInt(maxPhotos) || -1,
        maxProducts: parseInt(maxProducts) || -1,
        maxImages: parseInt(maxImages) || -1,
        maxCategories: parseInt(maxCategories) || -1,
        prioritySupport: Boolean(prioritySupport),
        support: support || 'Email',
        features: JSON.stringify(features || []),
        isActive: Boolean(isActive),
        updatedAt: new Date()
      }
    });

    // Log da alteração
    console.log(`[ADMIN] Plano ${name} atualizado por admin ${req.user.userId}`);
    console.log(`Preço: R$ ${price} | Ativo: ${isActive} | Limites: ${maxAds}/${maxProducts}/${maxPhotos}`);

    res.json({
      plan: {
        ...updatedPlan,
        features: JSON.parse(updatedPlan.features || '[]')
      },
      message: `Plano ${name} atualizado com sucesso`
    });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get Plan Analytics
app.get('/api/admin/plans/:id/analytics', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [plan, subscriptionsCount, activeSubscriptions, revenue] = await Promise.all([
      prisma.plan.findUnique({ where: { id } }),
      prisma.subscription.count({ where: { planId: id } }),
      prisma.subscription.count({ 
        where: { 
          planId: id,
          status: 'ACTIVE'
        }
      }),
      prisma.subscription.aggregate({
        where: {
          planId: id,
          status: 'ACTIVE'
        },
        _sum: {
          // Assuming we track revenue per subscription
          // This would need to be calculated based on plan price
        }
      })
    ]);

    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    // Calculate monthly recurring revenue
    const monthlyRevenue = activeSubscriptions * plan.price;

    res.json({
      plan: {
        ...plan,
        features: JSON.parse(plan.features || '[]')
      },
      analytics: {
        totalSubscriptions: subscriptionsCount,
        activeSubscriptions,
        monthlyRevenue,
        conversionRate: subscriptionsCount > 0 ? (activeSubscriptions / subscriptionsCount) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Erro ao buscar analytics do plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete Plan
app.delete('/api/admin/plans/:id', authenticateAdmin, auditMiddleware('DELETE', 'PLAN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se plano existe
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { 
            subscriptions: true,
            sellers: true
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    // Verificar se há assinaturas ativas
    if (plan._count.subscriptions > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir plano com assinaturas ativas. Cancele todas as assinaturas primeiro.' 
      });
    }

    await prisma.plan.delete({
      where: { id }
    });

    console.log(`Plano "${plan.name}" excluído com sucesso`);
    res.json({ message: 'Plano excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


// Função para iniciar servidor com fallback de porta
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Servidor API rodando em http://localhost:${port}`);
    console.log(`📱 Frontend disponível em http://localhost:${process.env.VITE_FRONTEND_PORT || 5173}`);
    console.log(`🔗 Teste a API: http://localhost:${port}/api/health`);
    console.log(`🔑 Login teste: admin@test.com / 123456`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Porta ${port} em uso, tentando porta ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Erro ao iniciar servidor:', err);
      process.exit(1);
    }
  });
  
  return server;
};

// Iniciar servidor
startServer(PORT);

export default app;