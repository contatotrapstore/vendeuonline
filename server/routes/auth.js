import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Mock users para demonstração
const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@vendeuonline.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    phone: '(11) 99999-9999',
    city: 'São Paulo',
    state: 'SP',
    userType: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString(),
    admin: {
      id: 'admin_1',
      permissions: ['all']
    }
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'joao@gmail.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    phone: '(11) 88888-8888',
    city: 'São Paulo',
    state: 'SP',
    userType: 'buyer',
    isVerified: true,
    createdAt: new Date().toISOString(),
    buyer: {
      id: 'buyer_1',
      wishlistCount: 5,
      orderCount: 12
    }
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'maria@techstore.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    phone: '(11) 77777-7777',
    city: 'São Paulo',
    state: 'SP',
    userType: 'seller',
    isVerified: true,
    createdAt: new Date().toISOString(),
    seller: {
      id: 'seller_1',
      storeName: 'TechStore',
      rating: 4.9,
      totalSales: 890,
      plan: 'PEQUENA_EMPRESA',
      isVerified: true
    }
  }
];

// JWT Secret (use a mesma do .env)
const JWT_SECRET = process.env.JWT_SECRET || 'cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac';

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    // Buscar usuário
    const user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Verificar senha (para demo, aceitar "password")
    const isValidPassword = password === 'password' || await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Remover senha do retorno
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      token
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, userType, city, state } = req.body;
    
    if (!name || !email || !phone || !password || !userType || !city || !state) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    // Verificar se email já existe
    const existingUser = mockUsers.find(u => u.email === email);
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar novo usuário
    const newUser = {
      id: `${mockUsers.length + 1}`,
      name,
      email,
      password: hashedPassword,
      phone,
      city,
      state,
      userType,
      isVerified: false,
      createdAt: new Date().toISOString(),
    };
    
    // Adicionar dados específicos do tipo
    if (userType === 'buyer') {
      newUser.buyer = {
        id: `buyer_${mockUsers.length + 1}`,
        wishlistCount: 0,
        orderCount: 0
      };
    } else if (userType === 'seller') {
      newUser.seller = {
        id: `seller_${mockUsers.length + 1}`,
        storeName: `${name}'s Store`,
        rating: 0,
        totalSales: 0,
        plan: 'GRATUITO',
        isVerified: false
      };
    }
    
    // Adicionar aos mock users (em produção seria salvo no banco)
    mockUsers.push(newUser);
    
    // Gerar JWT
    const token = jwt.sign(
      { userId: newUser.id, userType: newUser.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Remover senha do retorno
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      user: userWithoutPassword,
      token
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  try {
    const user = mockUsers.find(u => u.id === req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Remover senha do retorno
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // Com JWT, logout é feito no frontend removendo o token
  res.json({ message: 'Logout realizado com sucesso' });
});

export default router;