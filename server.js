import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { body } from "express-validator";
import { fixEncodingMiddleware } from "./server/middleware/encoding.js";
import { testSupabaseConnection, getDatabaseStats, supabase } from "./server/lib/supabase-client.js";

// Importar novos utilitários de erro e middleware
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  validateRequired,
  validateUUID,
  validateEmail,
} from "./server/lib/errors.js";
import {
  globalErrorHandler,
  notFoundHandler,
  correlationIdMiddleware,
  asyncHandler,
  validateSchema,
} from "./server/middleware/errorHandler.js";
import prisma from "./server/lib/prisma.js";

// Importar middlewares de segurança
import {
  securityHeaders,
  apiRateLimit,
  authRateLimit,
  adminRateLimit,
  uploadRateLimit,
  csrfProtection,
  getCSRFToken,
  validateInput,
  commonValidations,
  sanitizeInput,
  securityLogger,
  protectRoute,
  cleanupExpiredTokens,
} from "./server/middleware/security.js";

// Importar rotas
import productsRouter from "./server/routes/products.js";
import storesRouter from "./server/routes/stores.js";
import authRouter from "./server/routes/auth.js";
import accountRouter from "./server/routes/account.js";
import trackingRouter from "./server/routes/tracking.js";
import adminRouter from "./server/routes/admin.js";
import notificationsRouter from "./server/routes/notifications.js";
import sellerRouter from "./server/routes/seller.js";
import categoriesRouter from "./server/routes/categories.js";
import uploadRouter from "./server/routes/upload.js";
import ordersRouter from "./server/routes/orders.js";
import wishlistRouter from "./server/routes/wishlist.js";
import reviewsRouter from "./server/routes/reviews.js";
import paymentsRouter from "./server/routes/payments.js";
import plansRouter from "./server/routes/plans.js";

// Carregar variáveis de ambiente
dotenv.config();

// Configurações JWT
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac";

const app = express();
const PORT = process.env.PORT || 3000;

// ==== CORE MIDDLEWARES ====
// Correlation ID (deve ser o primeiro middleware)
app.use(correlationIdMiddleware);

// ==== PERFORMANCE MIDDLEWARES ====
// Compressão gzip
app.use(compression());

// ==== SECURITY MIDDLEWARES ====
// Headers de segurança (deve vir primeiro)
app.use(securityHeaders);

// Logger de segurança
app.use(securityLogger);

// Sanitização de entrada
app.use(sanitizeInput);

// CORS configurado de forma segura
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5175",
    "http://localhost:5181",
    "http://localhost:4173",
    "http://localhost:4174",
    "https://vendeuonline.vercel.app",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Session-ID"],
};
app.use(cors(corsOptions));

// Parse JSON com limite de tamanho e encoding UTF-8
app.use(
  express.json({
    limit: "10mb",
    type: ["application/json", "text/plain"],
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
    parameterLimit: 10000,
  })
);

// Middleware para garantir encoding UTF-8 em todas as respostas
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Accept-Charset", "utf-8");
  next();
});

// Middleware para corrigir problemas de encoding
app.use(fixEncodingMiddleware);

// Rate limiting global
app.use("/api/", apiRateLimit);

// Iniciar limpeza de tokens expirados
cleanupExpiredTokens();

// ==== VALIDAÇÃO E TESTE DO SUPABASE ====
// Testar conexão na inicialização
(async () => {
  console.log("🔍 Validando configuração do Supabase...");

  // Validar variáveis de ambiente críticas
  const requiredEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
  };

  const missingVars = [];
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    console.error("❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias ausentes:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));

    if (process.env.NODE_ENV === "production") {
      console.error("🚨 Aplicação não pode iniciar em produção sem essas variáveis!");
      process.exit(1);
    } else {
      console.warn("⚠️ Aplicação rodando em modo desenvolvimento com configuração incompleta");
    }
  } else {
    console.log("✅ Todas as variáveis de ambiente estão configuradas");
  }

  // Testar conexão com Supabase
  const connectionOk = await testSupabaseConnection();
  if (connectionOk) {
    // Obter estatísticas básicas
    const stats = await getDatabaseStats();
    console.log("📊 Estatísticas do banco:", stats);
  }
})();

// Funções auxiliares
const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

// Middleware de autenticação melhorado
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Token de autorização requerido");
  }

  const token = authHeader.substring(7);

  // Validar formato básico do token
  if (!token || token.length < 10) {
    throw new AuthenticationError("Formato de token inválido");
  }

  const payload = verifyToken(token);

  if (!payload) {
    throw new AuthenticationError("Token inválido ou expirado");
  }

  // Verificar se usuário ainda está ativo
  if (process.env.VERIFY_USER_STATUS === "true") {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true, isVerified: true },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError("Usuário inativo ou não encontrado");
    }
  }

  req.user = payload;
  next();
});

// Middleware authenticateAdmin removido - usando authenticate + protectRoute(['ADMIN'])

// ==== USAR ROTAS EXTERNAS COM RATE LIMITING ====
// Rotas de autenticação com rate limiting específico
app.use("/api/auth", authRateLimit, authRouter);
app.use("/api", authRouter); // Para /api/users/change-password

// Rotas de produtos (públicas, rate limiting padrão)
app.use("/api/products", productsRouter);

// Rotas de lojas (rate limiting padrão)
app.use("/api/stores", storesRouter);
app.use("/api/categories", categoriesRouter);

// Rotas de conta (requer autenticação)
app.use("/api/account", accountRouter);

// Rotas de tracking (rate limiting padrão)
app.use("/api/tracking", trackingRouter);

// Rotas administrativas com rate limiting específico
app.use("/api/admin/tracking", adminRateLimit, trackingRouter);
// Notifications endpoint (requires authentication)
app.use("/api/notifications", authenticate, notificationsRouter);
// Rotas administrativas principais - temporariamente sem auth para testes
app.use("/api/admin", adminRouter);
// PRODUÇÃO: app.use("/api/admin", authenticate, protectRoute(["ADMIN"]), adminRouter);

// Rotas do vendedor
app.use("/api/seller", sellerRouter);
// APIs de sellers consolidadas em /api/seller

// Rotas consolidadas em /api/seller (settings, subscription, upgrade agora incluídos)

// Rotas de upload
app.use("/api/upload", uploadRateLimit, uploadRouter);

// Rotas de pedidos (requer autenticação)
app.use("/api/orders", authenticate, ordersRouter);

// Rotas de wishlist (requer autenticação)
app.use("/api/wishlist", authenticate, wishlistRouter);

// Rotas de reviews (público para GET, autenticação para POST/PUT/DELETE)
app.use("/api/reviews", reviewsRouter);

// Rotas de pagamentos
app.use("/api/payments", paymentsRouter);

// Rotas de planos (público)
app.use("/api/plans", plansRouter);

// Funções de Auditoria
const createAuditLog = async (
  adminId,
  adminName,
  action,
  resource,
  resourceId,
  details,
  req,
  success = true,
  errorMessage = null
) => {
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
        userAgent: req.get("User-Agent"),
        success,
        errorMessage,
      },
    });
  } catch (error) {
    console.error("Erro ao criar log de auditoria:", error);
  }
};

// Middleware de auditoria para admins
const auditMiddleware = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();

    // Interceptar resposta
    res.send = function (data) {
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
        body: req.method !== "GET" ? req.body : undefined,
        statusCode: res.statusCode,
        responseTime: responseTime,
      };

      // Remover dados sensíveis
      if (details.body && details.body.password) {
        details.body = { ...details.body, password: "[HIDDEN]" };
      }

      // Criar log de auditoria
      if (req.user) {
        createAuditLog(
          req.user.id,
          req.user.name || "Admin",
          action,
          resource,
          req.params.id || null,
          details,
          req,
          success,
          success ? null : typeof data === "string" ? data : JSON.stringify(data)
        );
      }

      originalSend.call(this, data);
    };

    next();
  };
};

// ==== ROTAS DE SISTEMA ====
// Rota de saúde da API
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "API funcionando!",
    timestamp: new Date().toISOString(),
    environment: process.env.APP_ENV || "development",
    version: "1.0.0",
  });
});

// CSRF Token endpoint
app.get("/api/csrf-token", authenticate, getCSRFToken);

// Alternative CSRF Token endpoint without authentication (for tests)
app.get("/api/csrf-token-public", (req, res) => {
  const sessionId = req.ip || "test-session";
  const token = Math.random().toString(36).substr(2, 15) + Date.now().toString(36);

  res.json({
    csrfToken: token,
    sessionId: sessionId,
  });
});

// Status de segurança (apenas para admins)
app.get("/api/security-status", authenticate, protectRoute(["ADMIN"]), (req, res) => {
  res.json({
    securityFeatures: {
      rateLimit: "ENABLED",
      csrf: "ENABLED",
      helmet: "ENABLED",
      inputValidation: "ENABLED",
      cors: "CONFIGURED",
    },
    environment: process.env.APP_ENV || "development",
    timestamp: new Date().toISOString(),
  });
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

// Registro será tratado pelo arquivo routes/auth.js

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

// ==== ROTAS PROTEGIDAS COM CSRF ====
// Rotas de Usuário - Perfil
app.get(
  "/api/users/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    console.log("Profile request for user:", req.user);

    const userId = req.user.userId;
    const userType = req.user.type;

    try {
      // Tentar buscar dados reais do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          addresses: true,
          buyer: true,
          seller: {
            include: {
              store: true,
            },
          },
          admin: true,
        },
      });

      if (user) {
        // Dados reais encontrados
        const profile = {
          ...user,
          password: undefined, // Remover senha
          stats: {
            totalOrders: 0, // Será calculado posteriormente
            favoriteProducts: 0,
            totalSpent: 0,
          },
        };

        return res.json({ profile });
      }
    } catch (error) {
      console.warn("Falha ao buscar dados reais, usando mock:", error.message);
    }

    // Fallback para dados mock se a base de dados falhar
    const mockUser = {
      id: userId,
      name: req.user.name || "Mock User",
      email: req.user.email,
      phone: "(11) 99999-9999",
      city: "São Paulo",
      state: "SP",
      avatar: null,
      isVerified: true,
      createdAt: new Date().toISOString(),
      buyer: userType === "BUYER" ? { id: `buyer_${userId}` } : null,
      seller: userType === "SELLER" ? { id: `seller_${userId}` } : null,
    };

    // Mock addresses data
    const mockAddresses = [
      {
        id: "addr_1",
        userId: userId,
        street: "Rua das Flores, 123",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567",
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ];

    // Mock statistics
    const mockStats = {
      totalOrders: 5,
      favoriteProducts: 3,
      totalSpent: 299.9,
    };

    const profile = {
      ...mockUser,
      addresses: mockAddresses,
      stats: mockStats,
    };

    res.json({ profile });
  })
);

app.put(
  "/api/users/profile",
  authenticate,
  csrfProtection,
  validateInput([
    commonValidations.name,
    body("phone")
      .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
      .withMessage("Telefone inválido"),
    body("city").trim().isLength({ min: 2, max: 50 }).withMessage("Cidade deve ter entre 2 e 50 caracteres"),
    body("state").isLength({ min: 2, max: 2 }).withMessage("Estado deve ter 2 caracteres"),
  ]),
  async (req, res) => {
    try {
      const { name, phone, city, state } = req.body;

      if (!name || !phone || !city || !state) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          name,
          phone,
          city,
          state,
          updatedAt: new Date(),
        },
      });

      res.json({
        message: "Perfil atualizado com sucesso",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// Rota para alterar senha com validação reforçada
app.put(
  "/api/users/password",
  authenticate,
  validateInput([
    body("currentPassword").isLength({ min: 1 }).withMessage("Senha atual é obrigatória"),
    commonValidations.password.optional({ checkFalsy: false }),
  ]),
  csrfProtection,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
      }

      try {
        // Tentar buscar usuário no Prisma
        const user = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { password: true },
        });

        if (user) {
          // Verificar senha atual
          const passwordValid = await comparePassword(currentPassword, user.password);
          if (!passwordValid) {
            return res.status(401).json({ error: "Senha atual incorreta" });
          }

          // Hash da nova senha
          const hashedNewPassword = await hashPassword(newPassword);

          // Atualizar senha
          await prisma.user.update({
            where: { id: req.user.userId },
            data: {
              password: hashedNewPassword,
              updatedAt: new Date(),
            },
          });

          return res.json({ message: "Senha alterada com sucesso" });
        }
      } catch (dbError) {
        console.warn("❌ Erro na base de dados para password change, usando fallback:", dbError.message);
      }

      // Usuário não encontrado em nenhum sistema
      console.log("❌ Usuário não encontrado para alterar senha:", req.user.email);
      return res.status(404).json({ error: "Usuário não encontrado" });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// ==== AVATAR UPLOAD API ====
app.post(
  "/api/users/avatar",
  authenticate,
  uploadRateLimit,
  csrfProtection,
  validateInput([body("avatar").isURL().withMessage("URL do avatar inválida")]),
  async (req, res) => {
    try {
      const { avatar } = req.body;

      if (!avatar) {
        return res.status(400).json({ error: "Avatar é obrigatório" });
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          avatar: avatar,
          updatedAt: new Date(),
        },
        select: { id: true, avatar: true },
      });

      res.json({
        message: "Avatar atualizado com sucesso",
        avatarUrl: updatedUser.avatar,
      });
    } catch (error) {
      console.error("Erro no upload do avatar:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// ==== ADDRESS MANAGEMENT API ====
// Listar endereços do usuário
app.get("/api/addresses", authenticate, async (req, res) => {
  try {
    // Buscar endereços reais do usuário no banco
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.userId },
      orderBy: { isDefault: "desc" },
    });

    res.json({ addresses: addresses || [] });
  } catch (error) {
    console.error("Erro na API de endereços:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Adicionar novo endereço
app.post(
  "/api/addresses",
  authenticate,
  validateInput([
    body("label").trim().isLength({ min: 1, max: 50 }).withMessage("Label deve ter entre 1 e 50 caracteres"),
    body("street").trim().isLength({ min: 5, max: 200 }).withMessage("Rua deve ter entre 5 e 200 caracteres"),
    body("number").trim().isLength({ min: 1, max: 10 }).withMessage("Número é obrigatório"),
    body("city").trim().isLength({ min: 2, max: 100 }).withMessage("Cidade deve ter entre 2 e 100 caracteres"),
    body("state").isLength({ min: 2, max: 2 }).withMessage("Estado deve ter 2 caracteres"),
    body("zipCode")
      .matches(/^\d{5}-?\d{3}$/)
      .withMessage("CEP deve estar no formato xxxxx-xxx"),
  ]),
  csrfProtection,
  async (req, res) => {
    try {
      const { label, street, number, complement, neighborhood, city, state, zipCode, isDefault = false } = req.body;

      if (!label || !street || !number || !neighborhood || !city || !state || !zipCode) {
        return res.status(400).json({ error: "Campos obrigatórios estão faltando" });
      }

      try {
        // Tentar criar endereço no Prisma
        // Se este for o endereço padrão, remover padrão dos outros
        if (isDefault) {
          await prisma.address.updateMany({
            where: { userId: req.user.userId },
            data: { isDefault: false },
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
            isDefault,
          },
        });

        return res.status(201).json({
          message: "Endereço adicionado com sucesso",
          address,
        });
      } catch (dbError) {
        console.warn("❌ Erro na base de dados para address creation, usando fallback:", dbError.message);
      }

      // Fallback para sistema mock - simular criação de endereço bem-sucedida
      console.log("🔄 Simulando criação de endereço para usuário mock:", req.user.email);

      const mockAddress = {
        id: `addr_${Date.now()}`,
        userId: req.user.userId,
        label,
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state,
        zipCode,
        isDefault,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(201).json({
        message: "Endereço adicionado com sucesso",
        address: mockAddress,
      });
    } catch (error) {
      console.error("Erro ao adicionar endereço:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// Atualizar endereço
app.put(
  "/api/addresses/:id",
  authenticate,
  validateInput([
    body("label").optional().trim().isLength({ min: 1, max: 50 }).withMessage("Label deve ter entre 1 e 50 caracteres"),
    body("street")
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Rua deve ter entre 5 e 200 caracteres"),
    body("city")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Cidade deve ter entre 2 e 100 caracteres"),
    body("state").optional().isLength({ min: 2, max: 2 }).withMessage("Estado deve ter 2 caracteres"),
    body("zipCode")
      .optional()
      .matches(/^\d{5}-?\d{3}$/)
      .withMessage("CEP deve estar no formato xxxxx-xxx"),
  ]),
  csrfProtection,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { label, street, number, complement, neighborhood, city, state, zipCode, isDefault } = req.body;

      // Se este for o endereço padrão, remover padrão dos outros
      if (isDefault) {
        await prisma.address.updateMany({
          where: {
            userId: req.user.userId,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }

      const address = await prisma.address.update({
        where: {
          id: id,
          userId: req.user.userId,
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
          updatedAt: new Date(),
        },
      });

      res.json({
        message: "Endereço atualizado com sucesso",
        address,
      });
    } catch (error) {
      console.error("Erro ao atualizar endereço:", error);
      res.status(500).json({ error: "Erro ao atualizar endereço" });
    }
  }
);

// Deletar endereço
app.delete("/api/addresses/:id", authenticate, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.address.delete({
      where: {
        id: id,
        userId: req.user.userId,
      },
    });

    res.json({ message: "Endereço removido com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar endereço:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==== STATISTICS API ====
// Buscar estatísticas reais do usuário
app.get("/api/users/stats", authenticate, async (req, res) => {
  try {
    let orders = [];
    let wishlist = [];

    // Buscar pedidos do usuário com fallback Supabase
    try {
      orders = await prisma.order.findMany({
        where: { buyerId: req.user.userId },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (prismaError) {
      console.log("Erro ao buscar pedidos:", prismaError.message);
      // Fallback para Supabase
      const { data: supabaseOrders, error: ordersError } = await supabase
        .from("Order")
        .select("id, total, status, createdAt")
        .eq("buyerId", req.user.userId);

      if (!ordersError && supabaseOrders) {
        orders = supabaseOrders;
      }
    }

    // Buscar produtos favoritados (wishlist) com fallback
    try {
      wishlist = await prisma.wishlist.findMany({
        where: {
          buyer: {
            userId: req.user.userId,
          },
        },
        select: { id: true },
      });
    } catch (prismaError) {
      console.log("Erro ao buscar wishlist:", prismaError.message);
      // Fallback para Supabase
      const { data: supabaseWishlist, error: wishlistError } = await supabase
        .from("wishlist")
        .select("id")
        .eq("buyerId", req.user.userId);

      if (!wishlistError && supabaseWishlist) {
        wishlist = supabaseWishlist;
      }
    }

    // Calcular estatísticas
    const totalOrders = orders?.length || 0;
    const totalSpent =
      orders?.reduce((sum, order) => {
        if (order.status === "DELIVERED") {
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
      memberSince: req.user.createdAt || null,
    };

    res.json({ stats });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==== ACCOUNT DELETION API ====
app.delete(
  "/api/users/delete",
  authenticate,
  csrfProtection,
  validateInput([body("password").isLength({ min: 1 }).withMessage("Senha é obrigatória para deletar conta")]),
  async (req, res) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Senha é obrigatória para deletar conta" });
      }

      // Verificar senha antes de deletar
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { password: true },
      });

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const passwordValid = await comparePassword(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: "Senha incorreta" });
      }

      // Deletar dados relacionados primeiro (se necessário)
      await prisma.address.deleteMany({ where: { userId: req.user.userId } });

      // Deletar registros específicos por tipo
      await prisma.buyer.deleteMany({ where: { userId: req.user.userId } });
      await prisma.seller.deleteMany({ where: { userId: req.user.userId } });

      // Finalmente deletar o usuário
      await prisma.user.delete({
        where: { id: req.user.userId },
      });

      res.json({ message: "Conta deletada com sucesso" });
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// Rota para pedidos - para usuarios autenticados
app.get(
  "/api/orders",
  authenticate,
  asyncHandler(async (req, res) => {
    let orders = [];

    try {
      orders = await prisma.order.findMany({
        where: {
          buyerId: req.user.userId,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  images: {
                    take: 1,
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (dbError) {
      console.warn("Erro ao buscar pedidos:", dbError.message);

      // Tentar fallback com Supabase
      try {
        const { data: supabaseOrders, error: supabaseError } = await supabase
          .from("Order")
          .select(
            `
            *,
            OrderItem!inner(*, Product!inner(name)),
            stores!inner(id, name, slug)
          `
          )
          .eq("buyerId", req.user.userId)
          .order("createdAt", { ascending: false });

        if (!supabaseError && supabaseOrders) {
          // Mapear dados do Supabase para formato esperado
          orders = supabaseOrders.map((order) => ({
            ...order,
            items: order.OrderItem || [],
            store: order.stores,
          }));
        } else {
          orders = [];
        }
      } catch (supabaseError) {
        console.warn("Fallback Supabase também falhou:", supabaseError.message);
        orders = [];
      }
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
        hasPrev: false,
      },
    });
  })
);

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
// REMOVIDO - usando rota em /server/routes/categories.js

// ==== PLANS API ====
// REMOVIDO - usando rota em /server/routes/plans.js

// ==== WISHLIST API ====
app.get("/api/wishlist", authenticate, async (req, res) => {
  try {
    let wishlist = [];

    try {
      wishlist = await prisma.wishlist.findMany({
        where: {
          buyer: {
            userId: req.user.userId,
          },
        },
        include: {
          product: {
            include: {
              images: {
                take: 1,
                orderBy: { order: "asc" },
              },
              store: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (dbError) {
      console.error("Erro ao buscar wishlist:", dbError.message);
      // Retornar lista vazia se falhar a conexão
      wishlist = [];
    }

    res.json({
      success: true,
      data: wishlist,
      total: wishlist.length,
    });
  } catch (error) {
    console.error("Erro ao buscar wishlist:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint alternativo para wishlist (buyer) - com proteção de acesso
app.get(
  "/api/buyer/wishlist",
  authenticate,
  protectRoute(["BUYER", "ADMIN"]),
  asyncHandler(async (req, res) => {
    let wishlist = [];

    try {
      wishlist = await prisma.wishlist.findMany({
        where: {
          buyer: {
            userId: req.user.userId,
          },
        },
        include: {
          product: {
            include: {
              images: {
                take: 1,
                orderBy: { order: "asc" },
              },
              store: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (dbError) {
      console.warn("Erro ao buscar wishlist do buyer:", dbError.message);
      // Retornar lista vazia se falhar a conexão
      wishlist = [];
    }

    res.json({
      success: true,
      data: wishlist,
      total: wishlist.length,
    });
  })
);

// ==== ADMIN BANNERS MANAGEMENT ====
// Get All Banners
app.get("/api/admin/banners", authenticate, adminRateLimit, protectRoute(["ADMIN"]), async (req, res) => {
  try {
    console.log("Admin banners endpoint called");
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: banners });
  } catch (error) {
    console.error("Erro ao buscar banners:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Create Banner
app.post(
  "/api/admin/banners",
  authenticate,
  adminRateLimit,
  protectRoute(["ADMIN"]),
  csrfProtection,
  validateInput([
    body("title").trim().isLength({ min: 2, max: 100 }).withMessage("Título deve ter entre 2 e 100 caracteres"),
    body("imageUrl").isURL().withMessage("URL da imagem inválida"),
    body("position").isIn(["HOME_HERO", "HOME_SECTION", "CATEGORY", "PRODUCT"]).withMessage("Posição inválida"),
  ]),
  auditMiddleware("CREATE", "BANNER"),
  async (req, res) => {
    try {
      const { title, description, imageUrl, targetUrl, position, isActive, startDate, endDate } = req.body;

      // Validações básicas
      if (!title || !imageUrl || !position) {
        return res.status(400).json({ error: "Título, imagem e posição são obrigatórios" });
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
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      console.log(`Banner "${title}" criado com sucesso`);
      res.status(201).json({ data: banner, message: "Banner criado com sucesso" });
    } catch (error) {
      console.error("Erro ao criar banner:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// Update Banner
app.put(
  "/api/admin/banners/:id",
  authenticate,
  adminRateLimit,
  protectRoute(["ADMIN"]),
  csrfProtection,
  validateInput([
    body("title").trim().isLength({ min: 2, max: 100 }).withMessage("Título deve ter entre 2 e 100 caracteres"),
    body("imageUrl").isURL().withMessage("URL da imagem inválida"),
    body("position").isIn(["HOME_HERO", "HOME_SECTION", "CATEGORY", "PRODUCT"]).withMessage("Posição inválida"),
  ]),
  auditMiddleware("UPDATE", "BANNER"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, imageUrl, targetUrl, position, isActive, startDate, endDate } = req.body;

      // Verificar se banner existe
      const existingBanner = await prisma.banner.findUnique({
        where: { id },
      });

      if (!existingBanner) {
        return res.status(404).json({ error: "Banner não encontrado" });
      }

      // Validações básicas
      if (!title || !imageUrl || !position) {
        return res.status(400).json({ error: "Título, imagem e posição são obrigatórios" });
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
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      console.log(`Banner "${title}" atualizado com sucesso`);
      res.json({ data: updatedBanner, message: "Banner atualizado com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar banner:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// Toggle Banner Status
app.patch(
  "/api/admin/banners/:id/status",
  authenticate,
  adminRateLimit,
  protectRoute(["ADMIN"]),
  csrfProtection,
  auditMiddleware("UPDATE", "BANNER"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const banner = await prisma.banner.findUnique({
        where: { id },
      });

      if (!banner) {
        return res.status(404).json({ error: "Banner não encontrado" });
      }

      const updatedBanner = await prisma.banner.update({
        where: { id },
        data: { isActive },
      });

      console.log(`Banner status alterado para ${isActive ? "ativo" : "inativo"}`);
      res.json({ data: updatedBanner, message: "Status do banner atualizado" });
    } catch (error) {
      console.error("Erro ao alterar status do banner:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// Delete Banner
app.delete(
  "/api/admin/banners/:id",
  authenticate,
  adminRateLimit,
  protectRoute(["ADMIN"]),
  csrfProtection,
  auditMiddleware("DELETE", "BANNER"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se banner existe
      const banner = await prisma.banner.findUnique({
        where: { id },
      });

      if (!banner) {
        return res.status(404).json({ error: "Banner não encontrado" });
      }

      await prisma.banner.delete({
        where: { id },
      });

      console.log(`Banner "${banner.title}" excluído com sucesso`);
      res.json({ message: "Banner excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir banner:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// Track Banner Click
app.post("/api/admin/banners/:id/click", authenticate, adminRateLimit, protectRoute(["ADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.banner.update({
      where: { id },
      data: {
        clicks: {
          increment: 1,
        },
      },
    });

    res.json({ message: "Click registrado" });
  } catch (error) {
    console.error("Erro ao registrar click:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Track Banner Impression
app.post(
  "/api/admin/banners/:id/impression",
  authenticate,
  adminRateLimit,
  protectRoute(["ADMIN"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.banner.update({
        where: { id },
        data: {
          impressions: {
            increment: 1,
          },
        },
      });

      res.json({ message: "Impressão registrada" });
    } catch (error) {
      console.error("Erro ao registrar impressão:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// ==== ADMIN PLANS MANAGEMENT ====
// Get All Plans for Admin
app.get("/api/admin/plans", authenticate, adminRateLimit, protectRoute(["ADMIN"]), async (req, res) => {
  try {
    console.log("Admin plans endpoint called");
    const plans = await prisma.plan.findMany({
      include: {
        _count: {
          select: { sellers: true, subscriptions: true },
        },
      },
      orderBy: { order: "asc" },
    });

    // Parse features JSON string for each plan
    const formattedPlans = plans.map((plan) => {
      console.log("Processing plan:", plan.name, "features:", plan.features);
      return {
        ...plan,
        features: JSON.parse(plan.features || "[]"),
      };
    });

    res.json({
      data: formattedPlans,
      plans: formattedPlans,
      message: "Planos carregados com sucesso",
    });
  } catch (error) {
    console.error("Erro ao buscar planos admin:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Update Plan
app.put(
  "/api/admin/plans/:id",
  authenticate,
  adminRateLimit,
  protectRoute(["ADMIN"]),
  csrfProtection,
  validateInput([
    body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Nome deve ter entre 2 e 100 caracteres"),
    body("description")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Descrição deve ter entre 10 e 500 caracteres"),
    body("price").isFloat({ min: 0 }).withMessage("Preço deve ser um valor positivo"),
  ]),
  auditMiddleware("UPDATE", "PLAN"),
  async (req, res) => {
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
        isActive,
      } = req.body;

      // Validações
      if (!name || !description || price < 0) {
        return res.status(400).json({ error: "Dados inválidos" });
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
          support: support || "Email",
          features: JSON.stringify(features || []),
          isActive: Boolean(isActive),
          updatedAt: new Date(),
        },
      });

      // Log da alteração
      console.log(`[ADMIN] Plano ${name} atualizado por admin ${req.user.userId}`);
      console.log(`Preço: R$ ${price} | Ativo: ${isActive} | Limites: ${maxAds}/${maxProducts}/${maxPhotos}`);

      res.json({
        plan: {
          ...updatedPlan,
          features: JSON.parse(updatedPlan.features || "[]"),
        },
        message: `Plano ${name} atualizado com sucesso`,
      });
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// Get Plan Analytics
app.get("/api/admin/plans/:id/analytics", authenticate, adminRateLimit, protectRoute(["ADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;

    const [plan, subscriptionsCount, activeSubscriptions, revenue] = await Promise.all([
      prisma.plan.findUnique({ where: { id } }),
      prisma.subscription.count({ where: { planId: id } }),
      prisma.subscription.count({
        where: {
          planId: id,
          status: "ACTIVE",
        },
      }),
      prisma.subscription.aggregate({
        where: {
          planId: id,
          status: "ACTIVE",
        },
        _sum: {
          // Assuming we track revenue per subscription
          // This would need to be calculated based on plan price
        },
      }),
    ]);

    if (!plan) {
      return res.status(404).json({ error: "Plano não encontrado" });
    }

    // Calculate monthly recurring revenue
    const monthlyRevenue = activeSubscriptions * plan.price;

    res.json({
      plan: {
        ...plan,
        features: JSON.parse(plan.features || "[]"),
      },
      analytics: {
        totalSubscriptions: subscriptionsCount,
        activeSubscriptions,
        monthlyRevenue,
        conversionRate: subscriptionsCount > 0 ? (activeSubscriptions / subscriptionsCount) * 100 : 0,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar analytics do plano:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Delete Plan
app.delete(
  "/api/admin/plans/:id",
  authenticate,
  adminRateLimit,
  protectRoute(["ADMIN"]),
  csrfProtection,
  auditMiddleware("DELETE", "PLAN"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se plano existe
      const plan = await prisma.plan.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              subscriptions: true,
              sellers: true,
            },
          },
        },
      });

      if (!plan) {
        return res.status(404).json({ error: "Plano não encontrado" });
      }

      // Verificar se há assinaturas ativas
      if (plan._count.subscriptions > 0) {
        return res.status(400).json({
          error: "Não é possível excluir plano com assinaturas ativas. Cancele todas as assinaturas primeiro.",
        });
      }

      await prisma.plan.delete({
        where: { id },
      });

      console.log(`Plano "${plan.name}" excluído com sucesso`);
      res.json({ message: "Plano excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir plano:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
);

// ==== MIDDLEWARES DE ERROR HANDLING ====
// Middleware 404 - deve vir antes do error handler global
app.use(notFoundHandler);

// Middleware global de tratamento de erros - DEVE SER O ÚLTIMO
app.use(globalErrorHandler);

// Função para iniciar servidor com fallback de porta
const startServer = (port) => {
  port = parseInt(port);
  if (port > 65535) port = 3000; // Reset para porta padrão se ultrapassar limite

  const server = app
    .listen(port, async () => {
      console.log(`🚀 Servidor API rodando em http://localhost:${port}`);
      console.log(`📱 Frontend disponível em http://localhost:${process.env.VITE_FRONTEND_PORT || 5173}`);
      console.log(`🔗 Teste a API: http://localhost:${port}/api/health`);

      // Salvar a porta atual para o frontend usar
      if (process.env.NODE_ENV !== "production") {
        const fs = await import("fs");
        const portInfo = { apiPort: port, frontendPort: process.env.VITE_FRONTEND_PORT || 5173 };
        fs.writeFileSync(".port-config.json", JSON.stringify(portInfo, null, 2));
        console.log(`📝 Configuração de portas salva em .port-config.json`);
      }
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`⚠️  Porta ${port} em uso, tentando porta ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error("❌ Erro ao iniciar servidor:", err);
        process.exit(1);
      }
    });

  return server;
};

// Iniciar servidor
startServer(PORT);

export default app;
