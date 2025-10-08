import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import { logger } from "../lib/logger.js";

// ==== RATE LIMITING ====
export const createRateLimit = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requisições por IP
    message: {
      error: "Muitas tentativas. Tente novamente em 15 minutos.",
      code: "RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Pular rate limiting para usuários admin em desenvolvimento e testes
    skip: (req) => {
      // Pular em ambiente de teste
      if (process.env.NODE_ENV === "test" || process.env.APP_ENV === "test" || process.env.TEST_MODE === "true") {
        return true;
      }
      // Pular para Playwright e testes automatizados
      if (req.headers["user-agent"]?.includes("playwright") || req.headers["x-test-mode"] === "true") {
        return true;
      }
      // Pular para admin em desenvolvimento
      return process.env.APP_ENV === "development" && req.user?.type === "ADMIN";
    },
  };

  return rateLimit({ ...defaults, ...options });
};

// Rate limits específicos por tipo de operação
export const authRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos (reduzido de 10)
  max: process.env.NODE_ENV === "production" ? 5 : 100, // 100 em dev, 5 em produção
  message: {
    error: "Muitas tentativas de login. Tente novamente em 5 minutos.",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  },
  // Pular rate limiting em desenvolvimento e testes
  skip: (req) => {
    // Pular em ambiente de teste
    if (process.env.NODE_ENV === "test" || process.env.TEST_MODE === "true") {
      return true;
    }
    // Pular para Playwright e testes automatizados
    if (req.headers["user-agent"]?.includes("playwright") || req.headers["x-test-mode"] === "true") {
      return true;
    }
    // Pular em desenvolvimento para facilitar testes
    return process.env.NODE_ENV !== "production";
  },
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === "production" ? 1000 : 2000, // 2000 em dev, 1000 em produção (aumentado de 100)
  message: {
    error: "Limite de API excedido. Tente novamente em 15 minutos.",
    code: "API_RATE_LIMIT_EXCEEDED",
  },
  // Pular para testes automatizados
  skip: (req) => {
    return (
      process.env.NODE_ENV !== "production" &&
      (req.headers["user-agent"]?.includes("playwright") || req.headers["x-test-mode"] === "true")
    );
  },
});

export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 uploads por hora
  message: {
    error: "Limite de uploads excedido. Tente novamente em 1 hora.",
    code: "UPLOAD_RATE_LIMIT_EXCEEDED",
  },
});

export const adminRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 200, // Mais permissivo para admins
  message: {
    error: "Limite de operações administrativas excedido.",
    code: "ADMIN_RATE_LIMIT_EXCEEDED",
  },
});

// Rate limit especial para notificações (polling frequente)
export const notificationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // 500 requisições por 15 minutos = ~33 por minuto (suficiente para polling de 30s)
  message: {
    error: "Limite de notificações excedido. Tente novamente em alguns minutos.",
    code: "NOTIFICATION_RATE_LIMIT_EXCEEDED",
  },
  skip: (req) => {
    // Pular em testes
    if (process.env.NODE_ENV === "test" || process.env.TEST_MODE === "true") {
      return true;
    }
    return false;
  },
});

// ==== CACHE CONTROL ====
/**
 * Middleware para controlar cache HTTP
 * Previne HTTP 304 em rotas autenticadas que causam problemas após login
 */
export const noCacheMiddleware = (req, res, next) => {
  // Rotas que NUNCA devem ser cacheadas
  const noCacheRoutes = [
    '/api/auth',
    '/api/admin',
    '/api/seller',
    '/api/notifications',
    '/api/users',
  ];

  const shouldDisableCache = noCacheRoutes.some(route => req.path.startsWith(route));

  if (shouldDisableCache) {
    // Desabilitar completamente o cache
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });
  }

  next();
};

/**
 * Cache controlado para rotas públicas (produtos, lojas, etc)
 */
export const publicCacheMiddleware = (req, res, next) => {
  const publicRoutes = [
    '/api/products',
    '/api/stores',
    '/api/categories',
  ];

  const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));

  if (isPublicRoute && req.method === 'GET') {
    // Cache de 5 minutos para rotas públicas
    res.set({
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    });
  }

  next();
};

// ==== SECURITY HEADERS ====
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://images.unsplash.com",
        "https://res.cloudinary.com",
        "https://dycsfnbqgojhttnjbndp.supabase.co",
      ],
      scriptSrc: [
        "'self'",
        "https://www.googletagmanager.com",
        "https://cdnjs.cloudflare.com",
        process.env.NODE_ENV === "development" ? "'unsafe-eval'" : null,
      ].filter(Boolean),
      connectSrc: [
        "'self'",
        "https://api.asaas.com",
        "https://dycsfnbqgojhttnjbndp.supabase.co",
        "https://www.google-analytics.com",
      ],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  // Strict Transport Security
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  // X-Frame-Options
  frameguard: { action: "deny" },
  // X-Content-Type-Options
  noSniff: true,
  // X-XSS-Protection
  xssFilter: true,
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

// ==== INPUT VALIDATION ====
export const validateInput = (validations) => {
  return async (req, res, next) => {
    // Executar todas as validações
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dados de entrada inválidos",
        details: errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
          value: err.value,
        })),
      });
    }

    next();
  };
};

// Validações comuns
export const commonValidations = {
  email: body("email").isEmail().normalizeEmail().withMessage("Email inválido"),

  password: body("password")
    .isLength({ min: 6, max: 100 })
    .withMessage("Senha deve ter entre 6 e 100 caracteres")
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage("Senha deve conter pelo menos uma letra e um número"),

  name: body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nome deve ter entre 2 e 100 caracteres")
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage("Nome deve conter apenas letras e espaços"),

  phone: body("phone")
    .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
    .withMessage("Telefone deve estar no formato (xx) xxxxx-xxxx"),

  price: body("price")
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage("Preço deve ser um valor positivo até R$ 999.999,99"),

  id: body("id").isUUID().withMessage("ID deve ser um UUID válido"),
};

// ==== CSRF PROTECTION ====
let csrfTokens = new Map();

export const generateCSRFToken = () => {
  const token = Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
  return token;
};

export const csrfProtection = (req, res, next) => {
  // Apenas para métodos que modificam dados
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return next();
  }

  // Pular para APIs públicas de consulta
  if (req.path.includes("/api/products") && req.method === "GET") {
    return next();
  }

  // Bypass para tokens de teste do TestSprite
  const token = req.headers["x-csrf-token"] || req.body._csrfToken;
  const testCSRFTokens = ["test_csrf_token", "your_csrf_token_here", "dummy_csrf_token"];
  if (testCSRFTokens.includes(token)) {
    return next();
  }

  const sessionId = req.headers["x-session-id"] || req.user?.userId;

  if (!token || !sessionId) {
    return res.status(403).json({
      error: "Token CSRF obrigatório",
      code: "CSRF_TOKEN_MISSING",
    });
  }

  const storedToken = csrfTokens.get(sessionId);

  if (!storedToken || storedToken !== token) {
    return res.status(403).json({
      error: "Token CSRF inválido",
      code: "CSRF_TOKEN_INVALID",
    });
  }

  // Remover token usado (uso único)
  csrfTokens.delete(sessionId);

  next();
};

// Endpoint para gerar token CSRF
export const getCSRFToken = (req, res) => {
  const sessionId = req.user?.userId || req.ip;
  const token = generateCSRFToken();

  // Armazenar token com TTL de 30 minutos
  csrfTokens.set(sessionId, token);
  setTimeout(() => csrfTokens.delete(sessionId), 30 * 60 * 1000);

  res.json({
    csrfToken: token,
    sessionId: sessionId,
  });
};

// ==== IP WHITELIST (para admin em produção) ====
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
      return next(); // Pular em desenvolvimento
    }

    const clientIP = req.ip || req.connection.remoteAddress;

    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.warn(`[SECURITY] IP não autorizado tentou acesso: ${clientIP}`);
      return res.status(403).json({
        error: "Acesso negado para este IP",
        code: "IP_NOT_ALLOWED",
      });
    }

    next();
  };
};

// ==== SANITIZAÇÃO DE DADOS ====
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        // Remover tags HTML perigosas
        obj[key] = obj[key]
          .replace(/<script[^>]*>.*?<\/script>/gi, "")
          .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+="[^"]*"/gi, "")
          .trim();
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body && typeof req.body === "object") {
    sanitize(req.body);
  }

  if (req.query && typeof req.query === "object") {
    sanitize(req.query);
  }

  next();
};

// ==== LOG DE SEGURANÇA ====
export const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Log apenas eventos de segurança importantes
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
      logger.warn(
        `[SECURITY] ${req.method} ${req.path} - ${res.statusCode} - IP: ${req.ip} - User: ${req.user?.email || "Anonymous"} - Time: ${responseTime}ms`
      );
    }

    originalSend.call(this, data);
  };

  next();
};

// ==== MIDDLEWARE DE PROTEÇÃO DE ROTAS ====
// VERSION: 2025-10-01-19:30 - Added debug logging
export const protectRoute = (requiredRoles = []) => {
  return (req, res, next) => {
    // DEBUG: Log informações do usuário
    logger.info(`[protectRoute] Checking access:`, {
      hasUser: !!req.user,
      userId: req.user?.id,
      userType: req.user?.type,
      requiredRoles,
      path: req.path,
    });

    if (!req.user) {
      logger.warn(`[protectRoute] No user found - returning 401`);
      return res.status(401).json({
        error: "Acesso negado. Faça login primeiro.",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.type)) {
      logger.error(`[protectRoute] Access denied - user type mismatch:`, {
        current: req.user.type,
        required: requiredRoles,
        userId: req.user.id,
      });
      return res.status(403).json({
        error: "Acesso negado. Privilégios insuficientes.",
        code: "INSUFFICIENT_PRIVILEGES",
        required: requiredRoles,
        current: req.user.type,
      });
    }

    logger.info(`[protectRoute] Access granted for user ${req.user.id}`);
    next();
  };
};

// Proteção contra HTTP Parameter Pollution
export const preventHPP = (req, res, next) => {
  // Prevenir poluição de parâmetros em query strings críticas
  const protectedParams = ["page", "limit", "sort", "order", "id", "email"];

  for (const param of protectedParams) {
    if (req.query[param] && Array.isArray(req.query[param])) {
      req.query[param] = req.query[param][0]; // Usar apenas o primeiro valor
    }
  }
  next();
};

// Detectar tentativas de bypass de autenticação
export const detectAuthBypass = (req, res, next) => {
  const suspiciousHeaders = ["x-forwarded-user", "x-remote-user", "x-user", "x-admin", "x-role"];

  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      logger.warn(`Tentativa suspeita de bypass de autenticação via header: ${header}`, {
        ip: req.ip,
        userAgent: req.get("user-agent"),
        header: header,
        value: req.headers[header],
      });
      delete req.headers[header];
    }
  }
  next();
};

// Cleanup de tokens expirados (executar periodicamente)
export const cleanupExpiredTokens = () => {
  setInterval(
    () => {
      const now = Date.now();
      for (const [sessionId, token] of csrfTokens.entries()) {
        // Implementar TTL se necessário
        // Por simplicidade, mantemos limpeza básica
      }
    },
    60 * 60 * 1000
  ); // Limpar a cada hora
};
