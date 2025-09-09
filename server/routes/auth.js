import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Configurar Prisma
const prisma = new PrismaClient();

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login request:', req.body.email);
    
    const { email, password, userType } = loginSchema.parse(req.body);

    // Buscar usuário no Supabase
    console.log('📡 Buscando usuário no Supabase...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      console.log('❌ Usuário não encontrado:', email);
      return res.status(401).json({ 
        error: 'Email ou senha inválidos',
        success: false 
      });
    }

    console.log('✅ Usuário encontrado no Supabase');

    // Verificar tipo de usuário se especificado
    if (userType && user.type.toLowerCase() !== userType.toLowerCase()) {
      console.log('❌ Tipo de usuário incorreto:', { expected: userType, actual: user.type });
      return res.status(401).json({ 
        error: 'Tipo de usuário incorreto',
        success: false 
      });
    }

    // Verificar senha
    const isValidPassword = await comparePassword(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Senha inválida para:', email);
      return res.status(401).json({ 
        error: 'Email ou senha inválidos',
        success: false 
      });
    }

    // Gerar token
    const token = generateToken(user);

    console.log('✅ Login realizado com sucesso:', user.email);

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
    console.error('❌ Erro no login:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.issues,
        success: false
      });
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor',
      success: false 
    });
  }
});

// POST /api/auth/register - Registro (Versão simplificada para demonstração)
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request:', req.body);
    
    const { name, email, password, phone, city, state, userType } = registerSchema.parse(req.body);

    // Verificar se o usuário já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }
    
    const hashedPassword = await hashPassword(password);
    
    // Criar usuário no banco de dados
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        city,
        state,
        type: userType.toUpperCase(),
        isVerified: false
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return res.status(500).json({ error: 'Erro ao criar usuário' });
    }

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

    console.log('User created successfully:', email);

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
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