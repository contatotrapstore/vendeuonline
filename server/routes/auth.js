import express from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac';

// Schema de validação para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  userType: z.string().optional()
});

// Função auxiliar para comparar senhas
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
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

    // Buscar usuário nos dados mock
    let user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Se userType for fornecido, filtrar por ele
    if (userType && user) {
      if (user.type !== userType.toUpperCase()) {
        user = null;
      }
    }

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha (para demo, aceitar tanto hash quanto texto plano)
    let passwordValid = false;
    if (password === '123456') {
      passwordValid = true; // Para demonstração, aceitar senha simples
    } else {
      passwordValid = await comparePassword(password, user.password);
    }
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = generateToken(user);

    // Preparar dados do usuário (sem senha)
    const { password: _, ...userData } = user;

    // Dados adicionais mock baseados no tipo
    let additionalData = {};
    
    if (user.type === 'SELLER') {
      additionalData.seller = {
        id: "seller_profile_1",
        storeName: "TechStore",
        storeSlug: "techstore",
        storeDescription: "Sua loja de tecnologia",
        businessType: "PF",
        rating: 4.8
      };
    } else if (user.type === 'ADMIN') {
      additionalData.admin = {
        id: "admin_profile_1",
        permissions: ["manage_users", "manage_products", "manage_stores", "view_analytics"]
      };
    }

    console.log('Login successful for user:', user.email);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        ...userData,
        ...additionalData
      },
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

export default router;