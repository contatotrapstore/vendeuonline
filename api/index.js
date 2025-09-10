// Serverless function for Vercel
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// Import Prisma with error handling
let prisma = null;
let safeQuery = null;

try {
  const prismaModule = await import("../lib/prisma.js");
  prisma = prismaModule.default;
  safeQuery = prismaModule.safeQuery;
  console.log("✅ [API] Prisma importado com sucesso");
} catch (error) {
  console.error("❌ [API] Erro ao importar Prisma:", error.message);
}

// Debug - Verificar variáveis de ambiente críticas
console.log("🔍 [API] Verificando variáveis de ambiente:");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("Node Version:", process.version);
console.log("Platform:", process.platform);

// Configurações JWT
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac";

// MODO PRODUÇÃO: SEM DADOS MOCK - USAR APENAS BANCO DE DADOS
// Se o Prisma não conectar, retorna erro 500

// Serverless function handler
export default async function handler(req, res) {
  try {
    console.log(`🚀 [API] Request: ${req.method} ${req.url}`);

    // CORS headers
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    // Route handling
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    console.log(`📍 [API] Rota: ${pathname}`);

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

    const requireAuth = () => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Token de autorização requerido");
      }

      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (!payload) {
        throw new Error("Token inválido");
      }

      return payload;
    };

    // Route: GET /api/health
    if (req.method === "GET" && pathname === "/api/health") {
      return res.json({
        status: "OK",
        message: "API funcionando!",
        timestamp: new Date().toISOString(),
        prismaStatus: prisma ? "CONECTADO" : "NÃO CONECTADO",
      });
    }

    // Route: GET /api/plans - APENAS BANCO DE DADOS
    if (req.method === "GET" && pathname === "/api/plans") {
      console.log("📋 [PLANS] Buscando planos no banco...");

      if (!prisma || !safeQuery) {
        console.error("❌ [PLANS] Prisma não disponível");
        return res.status(500).json({
          success: false,
          error: "Banco de dados não disponível. Verifique variáveis de ambiente.",
        });
      }

      const result = await safeQuery(async () => {
        return await prisma.plan.findMany({
          where: { isActive: true },
          orderBy: { order: "asc" },
        });
      });

      if (!result.success) {
        console.error("❌ [PLANS] Erro no banco:", result.error);
        return res.status(500).json({
          success: false,
          error: "Erro ao buscar planos no banco de dados",
          details: result.error,
        });
      }

      console.log(`✅ [PLANS] ${result.data.length} planos encontrados`);
      return res.json({
        success: true,
        plans: result.data,
      });
    }

    // Route: GET /api/products - APENAS BANCO DE DADOS
    if (req.method === "GET" && pathname === "/api/products") {
      console.log("🛍️ [PRODUCTS] Buscando produtos no banco...");

      if (!prisma || !safeQuery) {
        console.error("❌ [PRODUCTS] Prisma não disponível");
        return res.status(500).json({
          success: false,
          error: "Banco de dados não disponível. Verifique variáveis de ambiente.",
        });
      }

      const result = await safeQuery(async () => {
        return await prisma.product.findMany({
          where: { isActive: true },
          include: {
            images: { orderBy: { order: "asc" } },
            store: {
              include: {
                seller: { include: { user: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
      });

      if (!result.success) {
        console.error("❌ [PRODUCTS] Erro no banco:", result.error);
        return res.status(500).json({
          success: false,
          error: "Erro ao buscar produtos no banco de dados",
          details: result.error,
        });
      }

      console.log(`✅ [PRODUCTS] ${result.data.length} produtos encontrados`);
      return res.json({
        success: true,
        products: result.data,
      });
    }

    // Route: GET /api/stores - APENAS BANCO DE DADOS
    if (req.method === "GET" && pathname === "/api/stores") {
      console.log("🏪 [STORES] Buscando lojas no banco...");

      if (!prisma || !safeQuery) {
        console.error("❌ [STORES] Prisma não disponível");
        return res.status(500).json({
          success: false,
          error: "Banco de dados não disponível. Verifique variáveis de ambiente.",
        });
      }

      const result = await safeQuery(async () => {
        return await prisma.store.findMany({
          where: { isActive: true },
          include: {
            seller: { include: { user: true } },
          },
        });
      });

      if (!result.success) {
        console.error("❌ [STORES] Erro no banco:", result.error);
        return res.status(500).json({
          success: false,
          error: "Erro ao buscar lojas no banco de dados",
          details: result.error,
        });
      }

      console.log(`✅ [STORES] ${result.data.length} lojas encontradas`);
      return res.json({
        success: true,
        data: result.data,
        stores: result.data, // Para compatibilidade
        pagination: {
          page: 1,
          limit: result.data.length,
          total: result.data.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    // Route: POST /api/auth/register - APENAS BANCO DE DADOS
    if (req.method === "POST" && pathname === "/api/auth/register") {
      console.log("👤 [REGISTER] Novo registro...");

      const { name, email, phone, password, userType, city, state } = req.body;

      // Validação básica
      if (!name || !email || !password) {
        return res.status(400).json({
          error: "Campos obrigatórios: name, email, password",
        });
      }

      if (!prisma || !safeQuery) {
        console.error("❌ [REGISTER] Prisma não disponível");
        return res.status(500).json({
          success: false,
          error: "Banco de dados não disponível. Verifique variáveis de ambiente.",
        });
      }

      // Verificar se usuário já existe
      const existingResult = await safeQuery(async () => {
        return await prisma.user.findUnique({ where: { email } });
      });

      if (!existingResult.success) {
        console.error("❌ [REGISTER] Erro ao verificar usuário:", existingResult.error);
        return res.status(500).json({
          success: false,
          error: "Erro ao verificar usuário no banco de dados",
          details: existingResult.error,
        });
      }

      if (existingResult.data) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      // Criar novo usuário
      const hashedPassword = await hashPassword(password);

      const createResult = await safeQuery(async () => {
        return await prisma.user.create({
          data: {
            id: uuidv4(),
            name,
            email,
            phone,
            password: hashedPassword,
            type: userType || "BUYER",
            city,
            state,
            isVerified: false,
          },
        });
      });

      if (!createResult.success) {
        console.error("❌ [REGISTER] Erro ao criar usuário:", createResult.error);
        return res.status(500).json({
          success: false,
          error: "Erro ao criar usuário no banco de dados",
          details: createResult.error,
        });
      }

      // Gerar token
      const token = generateToken({
        id: createResult.data.id,
        email: createResult.data.email,
        name: createResult.data.name,
        userType: createResult.data.type,
      });

      // Remover password da resposta
      const { password: _, ...userWithoutPassword } = createResult.data;

      console.log("✅ [REGISTER] Usuário criado com sucesso:", userWithoutPassword.id);
      return res.status(201).json({
        success: true,
        message: "Usuário cadastrado com sucesso",
        user: userWithoutPassword,
        token,
      });
    }

    // Route: POST /api/auth/login - APENAS BANCO DE DADOS
    if (req.method === "POST" && pathname === "/api/auth/login") {
      console.log("🔐 [LOGIN] Tentativa de login...");

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email e password são obrigatórios" });
      }

      if (!prisma || !safeQuery) {
        console.error("❌ [LOGIN] Prisma não disponível");
        return res.status(500).json({
          success: false,
          error: "Banco de dados não disponível. Verifique variáveis de ambiente.",
        });
      }

      // Buscar usuário no banco
      const result = await safeQuery(async () => {
        return await prisma.user.findUnique({
          where: { email },
        });
      });

      if (!result.success) {
        console.error("❌ [LOGIN] Erro no banco:", result.error);
        return res.status(500).json({
          success: false,
          error: "Erro ao buscar usuário no banco de dados",
          details: result.error,
        });
      }

      if (!result.data) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Verificar password
      const isValid = await comparePassword(password, result.data.password);
      if (!isValid) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Gerar token
      const token = generateToken({
        id: result.data.id,
        email: result.data.email,
        name: result.data.name,
        userType: result.data.type,
      });

      // Remover password da resposta
      const { password: _, ...userWithoutPassword } = result.data;

      console.log("✅ [LOGIN] Login realizado com sucesso:", userWithoutPassword.id);
      return res.json({
        success: true,
        message: "Login realizado com sucesso",
        user: userWithoutPassword,
        token,
      });
    }

    // Route: GET /api/admin/stats - APENAS BANCO DE DADOS (requires auth)
    if (req.method === "GET" && pathname === "/api/admin/stats") {
      console.log("📊 [ADMIN] Buscando estatísticas...");

      try {
        const user = requireAuth();
        if (user.userType !== "ADMIN") {
          return res.status(403).json({ error: "Acesso negado" });
        }

        if (!prisma || !safeQuery) {
          console.error("❌ [ADMIN] Prisma não disponível");
          return res.status(500).json({
            success: false,
            error: "Banco de dados não disponível. Verifique variáveis de ambiente.",
          });
        }

        // Buscar stats reais do banco
        const [usersResult, productsResult, storesResult, ordersResult] = await Promise.all([
          safeQuery(async () => await prisma.user.count()),
          safeQuery(async () => await prisma.product.count({ where: { isActive: true } })),
          safeQuery(async () => await prisma.store.count({ where: { isActive: true } })),
          safeQuery(async () => await prisma.order.count()),
        ]);

        // Verificar se todas as queries foram bem-sucedidas
        if (!usersResult.success || !productsResult.success || !storesResult.success || !ordersResult.success) {
          console.error("❌ [ADMIN] Erro ao buscar estatísticas");
          return res.status(500).json({
            success: false,
            error: "Erro ao buscar estatísticas no banco de dados",
          });
        }

        const stats = {
          totalUsers: usersResult.data,
          totalProducts: productsResult.data,
          totalStores: storesResult.data,
          totalOrders: ordersResult.data,
        };

        console.log("✅ [ADMIN] Estatísticas carregadas:", stats);
        return res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("❌ [ADMIN STATS] Erro:", error.message);
        return res.status(401).json({ error: error.message });
      }
    }

    // Route not found
    return res.status(404).json({
      error: "Rota não encontrada",
      method: req.method,
      pathname: pathname,
    });
  } catch (error) {
    console.error("💥 [API] Erro geral:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
