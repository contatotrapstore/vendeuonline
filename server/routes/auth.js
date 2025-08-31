import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Configurar Prisma
const prisma = new PrismaClient();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac';

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  userType: z.string().optional()
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().min(2, 'Estado deve ter pelo menos 2 caracteres'),
  userType: z.enum(['buyer', 'seller'], { required_error: 'Tipo de usuário é obrigatório' })
});

// Função auxiliar para comparar senhas
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Função auxiliar para hash da senha
const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

// Função para gerar token JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: user.type,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Mock users for testing while Supabase connection is being resolved
const mockUsers = [
  {
    id: "admin_1",
    name: "Admin User",
    email: "admin@test.com",
    password: "$2a$10$rVQ3h.uOMRl4oD2zQKXXqOQWpL3lBfJ1/QT9wvJF8pHx9Gx7QIIK.", // hashed "123456"
    type: "ADMIN",
    isVerified: true,
    city: "São Paulo",
    state: "SP",
    avatar: null,
    phone: "(11) 99999-0000",
    createdAt: new Date().toISOString()
  },
  {
    id: "seller_1", 
    name: "João Silva",
    email: "joao@techstore.com",
    password: "$2a$10$rVQ3h.uOMRl4oD2zQKXXqOQWpL3lBfJ1/QT9wvJF8pHx9Gx7QIIK.", // hashed "123456"
    type: "SELLER",
    isVerified: true,
    city: "São Paulo", 
    state: "SP",
    avatar: null,
    phone: "(11) 99999-1111",
    createdAt: new Date().toISOString()
  },
  {
    id: "buyer_1",
    name: "Maria Santos",
    email: "maria@email.com", 
    password: "$2a$10$rVQ3h.uOMRl4oD2zQKXXqOQWpL3lBfJ1/QT9wvJF8pHx9Gx7QIIK.", // hashed "123456"
    type: "BUYER",
    isVerified: true,
    city: "Rio de Janeiro",
    state: "RJ", 
    avatar: null,
    phone: "(21) 88888-2222",
    createdAt: new Date().toISOString()
  }
];

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login request:', req.body);
    
    const { email, password, userType } = loginSchema.parse(req.body);

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
        success: true,
        message: 'Login realizado com sucesso',
        user: {
          ...adminUser,
          userType: 'admin',
          admin: {
            id: 'admin_1',
            permissions: ['all']
          }
        },
        token
      });
    }

    // Buscar usuário nos dados mock (modo demonstração)
    // TODO: Substituir por busca no banco quando conectividade for resolvida
    let user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log('User not found in mock data:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Verificar tipo de usuário se especificado
    if (userType && user.type.toLowerCase() !== userType.toLowerCase()) {
      console.log('User type mismatch:', { expected: userType, actual: user.type });
      return res.status(401).json({ error: 'Tipo de usuário incorreto' });
    }

    // Verificar senha (aceitar tanto hash quanto senha simples para demo)
    let isValidPassword = false;
    if (password === '123456') {
      isValidPassword = true; // Para demonstração
    } else {
      isValidPassword = await comparePassword(password, user.password);
    }
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Gerar token
    const token = generateToken(user);

    console.log('Login successful for user:', user.email);

    // Construir resposta com dados específicos do tipo de usuário
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      state: user.state,
      type: user.type,
      userType: user.type.toLowerCase(),
      isVerified: user.isVerified,
      avatar: user.avatar,
      createdAt: user.createdAt
    };

    if (user.type === 'BUYER') {
      userData.buyer = {
        id: `buyer_${user.id}`,
        wishlistCount: 0,
        orderCount: 0
      };
    }

    if (user.type === 'SELLER') {
      userData.seller = {
        id: `seller_${user.id}`,
        storeName: `${user.name} Store`,
        rating: 4.8,
        totalSales: 0,
        plan: 'gratuito',
        isVerified: true
      };
    }

    if (user.type === 'ADMIN') {
      userData.admin = {
        id: `admin_${user.id}`,
        permissions: ['all']
      };
    }

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: userData,
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.issues
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/register - Registro (Versão simplificada para demonstração)
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request:', req.body);
    
    const { name, email, password, phone, city, state, userType } = registerSchema.parse(req.body);

    // Por enquanto, aceitar registros normalmente (modo demonstração)
    // TODO: Conectar com Supabase quando a conectividade for resolvida
    
    const hashedPassword = await hashPassword(password);
    
    // Gerar ID único para o usuário
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simular criação do usuário (dados serão perdidos quando servidor reiniciar)
    const newUser = {
      id: userId,
      name,
      email: email.toLowerCase(), 
      phone,
      city,
      state,
      type: userType.toUpperCase(),
      isVerified: false,
      isActive: true,
      avatar: null,
      createdAt: new Date()
    };

    const token = generateToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      city: newUser.city,
      state: newUser.state,
      type: newUser.type,
      isVerified: newUser.isVerified
    });

    console.log('Demo user created successfully:', email);

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso (modo demonstração)',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        city: newUser.city,
        state: newUser.state,
        type: newUser.type,
        userType: userType,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt.toISOString()
      },
      token
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.issues
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;