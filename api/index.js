import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// Import Prisma with error handling and better serverless support
let prisma = null;
let safeQuery = null;
let logger = null;

try {
  // Import logger
  const loggerModule = await import("../lib/logger.js");
  logger = loggerModule.logger;
  console.log("✅ [API] Logger importado com sucesso");

  // Import Prisma with correct path
  const prismaModule = await import("../lib/prisma.js");
  prisma = prismaModule.default;
  safeQuery = prismaModule.safeQuery;

  // Test Prisma connection immediately
  if (prisma) {
    console.log("✅ [API] Prisma importado com sucesso");
    // Test connection in background
    prisma
      .$connect()
      .then(() => {
        console.log("✅ [API] Prisma conectado ao banco com sucesso");
      })
      .catch((err) => {
        console.error("❌ [API] Erro na conexão Prisma:", err.message);
      });
  } else {
    throw new Error("Prisma client não inicializado");
  }
} catch (error) {
  console.error("❌ [API] Erro CRÍTICO ao importar módulos:", error.message);
  console.error("❌ [API] Stack trace:", error.stack);
  console.error("❌ [API] Environment check:");
  console.error("❌ [API] DATABASE_URL:", process.env.DATABASE_URL ? "DEFINIDA" : "NÃO DEFINIDA");
  console.error("❌ [API] NODE_ENV:", process.env.NODE_ENV);

  // Fallback logger
  logger = {
    info: (...args) => console.log("ℹ️", ...args),
    error: (...args) => console.error("❌", ...args),
    warn: (...args) => console.warn("⚠️", ...args),
  };
}

// Debug - Verificar variáveis de ambiente críticas (força console.log em produção para debug)
console.log("🔍 [API] Verificando variáveis de ambiente:");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("Node Version:", process.version);
console.log("Platform:", process.platform);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Prisma Status:", prisma ? "INICIALIZADO" : "❌ FALHOU");

// Configurações JWT - OBRIGATÓRIO definir JWT_SECRET nas variáveis de ambiente
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error("❌ ERRO CRÍTICO: JWT_SECRET não definido nas variáveis de ambiente!");
  throw new Error("JWT_SECRET é obrigatório para segurança");
}

// MODO PRODUÇÃO: SEM DADOS MOCK - USAR APENAS BANCO DE DADOS
// Se o Prisma não conectar, retorna erro 500

// Serverless function handler
export default async function handler(req, res) {
  try {
    logger.info(`🚀 [API] Request: ${req.method} ${req.url}`);

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

    logger.info(`📍 [API] Rota: ${pathname}`);

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

    // Route: GET /api/health - Enhanced diagnostic endpoint
    if (req.method === "GET" && pathname === "/api/health") {
      return res.json({
        status: "OK",
        message: "API funcionando!",
        timestamp: new Date().toISOString(),
        prismaStatus: prisma ? "CONECTADO" : "NÃO CONECTADO",
        safeQueryStatus: safeQuery ? "DISPONÍVEL" : "NÃO DISPONÍVEL",
        environment: {
          nodeEnv: process.env.NODE_ENV,
          nodeVersion: process.version,
          platform: process.platform,
          databaseUrl: process.env.DATABASE_URL ? "CONFIGURADA" : "NÃO CONFIGURADA",
          jwtSecret: process.env.JWT_SECRET ? "CONFIGURADA" : "NÃO CONFIGURADA",
          supabaseUrl: process.env.SUPABASE_URL ? "CONFIGURADA" : "NÃO CONFIGURADA",
          supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? "CONFIGURADA" : "NÃO CONFIGURADA",
          supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "CONFIGURADA" : "NÃO CONFIGURADA",
        },
      });
    }

    // Route: GET /api/debug - Diagnostic endpoint for troubleshooting
    if (req.method === "GET" && pathname === "/api/debug") {
      const diagnostics = {
        status: "DIAGNOSTIC",
        timestamp: new Date().toISOString(),
        modules: {
          prisma: prisma ? "LOADED" : "FAILED",
          safeQuery: safeQuery ? "LOADED" : "FAILED",
          logger: logger ? "LOADED" : "FAILED",
        },
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.slice(0, 20)}...` : "NOT SET",
          JWT_SECRET: process.env.JWT_SECRET ? "SET" : "NOT SET",
          SUPABASE_URL: process.env.SUPABASE_URL || "NOT SET",
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? "SET" : "NOT SET",
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET",
        },
        prismaConnection: null,
      };

      // Test Prisma connection if available
      if (prisma && safeQuery) {
        try {
          const connectionTest = await safeQuery(async () => {
            return await prisma.$queryRaw`SELECT 1 as test`;
          });
          diagnostics.prismaConnection = connectionTest.success ? "SUCCESS" : `FAILED: ${connectionTest.error}`;
        } catch (error) {
          diagnostics.prismaConnection = `ERROR: ${error.message}`;
        }
      } else {
        diagnostics.prismaConnection = "PRISMA NOT AVAILABLE";
      }

      return res.json(diagnostics);
    }

    // Route: POST /api/apply-rls - APLICAR RLS POLICIES VIA SUPABASE CLIENT
    if (req.method === "POST" && pathname === "/api/apply-rls") {
      console.log("🚀 [APPLY-RLS] Executando aplicação automática de RLS policies...");

      try {
        const { createClient } = await import("@supabase/supabase-js");

        // Usar SERVICE_ROLE_KEY para aplicar policies
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const policies = [
          `CREATE POLICY IF NOT EXISTS "Enable public select access for products" ON "Product" FOR SELECT USING (true);`,
          `CREATE POLICY IF NOT EXISTS "Enable public select access for stores" ON "Store" FOR SELECT USING (true);`,
          `CREATE POLICY IF NOT EXISTS "Enable public select access for categories" ON "Category" FOR SELECT USING (true);`,
          `CREATE POLICY IF NOT EXISTS "Enable public select access for system_config" ON "SystemConfig" FOR SELECT USING (true);`,
        ];

        const results = [];
        for (const policy of policies) {
          try {
            console.log(`🔧 [APPLY-RLS] Aplicando: ${policy.substring(0, 80)}...`);
            const { error } = await supabaseAdmin.rpc("exec_sql", { sql: policy });

            if (error) {
              results.push({ policy: policy.substring(0, 80), success: false, error: error.message });
            } else {
              results.push({ policy: policy.substring(0, 80), success: true });
            }
          } catch (err) {
            results.push({ policy: policy.substring(0, 80), success: false, error: err.message });
          }
        }

        // Testar acesso após policies
        const { createClient: createAnonClient } = await import("@supabase/supabase-js");
        const supabaseAnon = createAnonClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data: testProducts } = await supabaseAnon.from("Product").select("id").limit(1);
        const { data: testStores } = await supabaseAnon.from("Store").select("id").limit(1);

        return res.json({
          success: true,
          message: "RLS policies aplicadas via runtime",
          policies: results,
          verification: {
            products: testProducts?.length || 0,
            stores: testStores?.length || 0,
            status: testProducts?.length > 0 && testStores?.length > 0 ? "SUCCESS" : "NEEDS_MANUAL_APPLICATION",
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ [APPLY-RLS] Falha:", error);
        return res.status(500).json({
          success: false,
          error: "Falha ao aplicar RLS policies",
          details: error.message,
          instructions: "Use Supabase Dashboard > SQL Editor com supabase-rls-config.sql",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Route: GET /api/test-supabase - Test endpoint para Supabase fetch direto
    if (req.method === "GET" && pathname === "/api/test-supabase") {
      console.log("🧪 [TEST-SUPABASE] Iniciando teste direto...");

      const results = {
        serviceRole: null,
        anonKey: null,
        mock: null,
        environment: {
          SUPABASE_URL: process.env.SUPABASE_URL ? "DEFINIDA" : "❌ VAZIA",
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "DEFINIDA" : "❌ VAZIA",
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? "DEFINIDA" : "❌ VAZIA",
          NODE_ENV: process.env.NODE_ENV,
        },
      };

      // Teste 1: Service Role Key
      try {
        console.log("🧪 [TEST-1] Testando com SERVICE_ROLE_KEY...");
        const supabaseFetch = await import("../lib/supabase-fetch.js");
        const plans = await supabaseFetch.getPlans();
        results.serviceRole = { success: true, plans: plans.length };
      } catch (error) {
        console.error("❌ [TEST-1] SERVICE_ROLE falhou:", error.message);
        results.serviceRole = { success: false, error: error.message };
      }

      // Teste 2: Anon Key
      try {
        console.log("🧪 [TEST-2] Testando com ANON_KEY...");
        const supabaseAnon = await import("../lib/supabase-anon.js");
        const plans = await supabaseAnon.getPlansAnon();
        results.anonKey = { success: true, plans: plans.length };
      } catch (error) {
        console.error("❌ [TEST-2] ANON_KEY falhou:", error.message);
        results.anonKey = { success: false, error: error.message };
      }

      // Teste 3: Mock Data
      try {
        console.log("🧪 [TEST-3] Testando mock data...");
        const mockData = await import("../lib/emergency-mock.js");
        const plans = mockData.getMockPlans();
        results.mock = { success: true, plans: plans.length };
      } catch (error) {
        console.error("❌ [TEST-3] MOCK falhou:", error.message);
        results.mock = { success: false, error: error.message };
      }

      console.log("🧪 [TEST-SUPABASE] Todos os testes concluídos!");
      return res.json({
        status: "DIAGNOSTIC_COMPLETE",
        message: "Diagnóstico completo de todas as estratégias",
        results: results,
        timestamp: new Date().toISOString(),
      });
    }

    // Route: GET /api/plans - BANCO DE DADOS COM FALLBACK SUPABASE
    if (req.method === "GET" && pathname === "/api/plans") {
      logger.info("📋 [PLANS] Buscando planos no banco...");

      // Tentar Prisma primeiro
      if (prisma && safeQuery) {
        const result = await safeQuery(async () => {
          return await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { order: "asc" },
          });
        });

        if (result.success) {
          logger.info(`✅ [PLANS] ${result.data.length} planos encontrados via Prisma`);
          return res.json({
            success: true,
            plans: result.data,
          });
        }

        logger.warn("⚠️ [PLANS] Prisma falhou, tentando Supabase direto");
      }

      // Fallback 1: Supabase com ANON_KEY (WORKING!)
      try {
        console.log("✅ [PLANS] Tentando com ANON_KEY (strategy working)...");
        const { getPlansAnon } = await import("../lib/supabase-anon.js");
        const plans = await getPlansAnon();

        console.log(`✅ [PLANS] ${plans.length} planos encontrados via ANON_KEY`);
        logger.info(`✅ [PLANS] ${plans.length} planos encontrados via ANON_KEY`);
        return res.json({
          success: true,
          plans: plans,
          fallback: "supabase-anon",
          source: "real-data",
        });
      } catch (anonError) {
        console.warn("⚠️ [PLANS] ANON_KEY falhou, tentando SERVICE_ROLE...");

        // Fallback 2: Supabase com SERVICE_ROLE_KEY
        try {
          console.log("⚠️ [PLANS] Tentando SERVICE_ROLE_KEY...");
          const { getPlans } = await import("../lib/supabase-fetch.js");
          const plans = await getPlans();

          console.log(`✅ [PLANS] ${plans.length} planos encontrados via SERVICE_ROLE`);
          return res.json({
            success: true,
            plans: plans,
            fallback: "supabase-service",
            source: "real-data",
          });
        } catch (serviceError) {
          console.error("❌ [PLANS] Todos os fallbacks falharam");

          return res.status(500).json({
            success: false,
            error: "Serviço de planos temporariamente indisponível",
            details: "Erro de conexão com banco de dados",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Route: GET /api/products - BANCO DE DADOS COM FALLBACK SUPABASE
    if (req.method === "GET" && pathname === "/api/products") {
      logger.info("🛍️ [PRODUCTS] Buscando produtos no banco...");

      // Tentar Prisma primeiro
      if (prisma && safeQuery) {
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

        if (result.success) {
          logger.info(`✅ [PRODUCTS] ${result.data.length} produtos encontrados via Prisma`);
          return res.json({
            success: true,
            products: result.data,
          });
        }

        logger.warn("⚠️ [PRODUCTS] Prisma falhou, tentando Supabase direto");
      }

      // Fallback 1: Supabase com ANON_KEY (WORKING!)
      try {
        console.log("✅ [PRODUCTS] Tentando com ANON_KEY (strategy working)...");
        const { getProductsAnon } = await import("../lib/supabase-anon.js");
        const products = await getProductsAnon();

        console.log(`✅ [PRODUCTS] ${products.length} produtos encontrados via ANON_KEY`);
        logger.info(`✅ [PRODUCTS] ${products.length} produtos encontrados via ANON_KEY`);
        return res.json({
          success: true,
          products: products,
          fallback: "supabase-anon",
          source: "real-data",
        });
      } catch (anonError) {
        console.warn("⚠️ [PRODUCTS] ANON_KEY falhou:", anonError.message);
        console.warn("⚠️ [PRODUCTS] Tentando SERVICE_ROLE_KEY...");

        // Fallback 2: Supabase com SERVICE_ROLE_KEY
        try {
          console.log("⚠️ [PRODUCTS] Tentando SERVICE_ROLE_KEY...");
          const { getProducts } = await import("../lib/supabase-fetch.js");
          const products = await getProducts();

          console.log(`✅ [PRODUCTS] ${products.length} produtos encontrados via SERVICE_ROLE_KEY`);
          return res.json({
            success: true,
            products: products,
            fallback: "supabase-service",
            source: "real-data",
          });
        } catch (serviceError) {
          console.error("❌ [PRODUCTS] SERVICE_ROLE também falhou:", serviceError.message);

          // Diagnóstico final do erro
          const isRLSError =
            serviceError.message?.includes("RLS") ||
            serviceError.message?.includes("policy") ||
            serviceError.code === "42501" ||
            anonError.message?.includes("RLS") ||
            anonError.message?.includes("policy") ||
            anonError.code === "42501";

          console.error("❌ [PRODUCTS] Diagnóstico:", {
            anonError: anonError.message,
            serviceError: serviceError.message,
            isRLSError,
          });

          return res.status(500).json({
            success: false,
            error: "Serviço de produtos temporariamente indisponível",
            details: isRLSError ? "Configuração de segurança pendente" : "Erro de conexão com banco de dados",
            timestamp: new Date().toISOString(),
            diagnostic: {
              probable_cause: isRLSError ? "RLS policies not configured" : "Database connection issue",
            },
          });
        }
      }
    }

    // Route: GET /api/stores - BANCO DE DADOS COM FALLBACK SUPABASE
    if (req.method === "GET" && pathname === "/api/stores") {
      logger.info("🏪 [STORES] Buscando lojas no banco...");

      // Tentar Prisma primeiro
      if (prisma && safeQuery) {
        const result = await safeQuery(async () => {
          return await prisma.store.findMany({
            where: { isActive: true },
            include: {
              seller: { include: { user: true } },
            },
          });
        });

        if (result.success) {
          logger.info(`✅ [STORES] ${result.data.length} lojas encontradas via Prisma`);
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

        logger.warn("⚠️ [STORES] Prisma falhou, tentando Supabase direto");
      }

      // Fallback 1: Supabase com ANON_KEY (WORKING!)
      try {
        console.log("✅ [STORES] Tentando com ANON_KEY (strategy working)...");
        const { getStoresAnon } = await import("../lib/supabase-anon.js");
        const stores = await getStoresAnon();

        console.log(`✅ [STORES] ${stores.length} lojas encontradas via ANON_KEY`);
        logger.info(`✅ [STORES] ${stores.length} lojas encontradas via ANON_KEY`);
        return res.json({
          success: true,
          data: stores,
          stores: stores, // Para compatibilidade
          fallback: "supabase-anon",
          source: "real-data",
          pagination: {
            page: 1,
            limit: stores.length,
            total: stores.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });
      } catch (anonError) {
        console.warn("⚠️ [STORES] ANON_KEY falhou:", anonError.message);
        console.warn("⚠️ [STORES] Tentando SERVICE_ROLE_KEY...");

        // Fallback 2: Supabase com SERVICE_ROLE_KEY
        try {
          console.log("⚠️ [STORES] Tentando SERVICE_ROLE_KEY...");
          const { getStores } = await import("../lib/supabase-fetch.js");
          const stores = await getStores();

          console.log(`✅ [STORES] ${stores.length} lojas encontradas via SERVICE_ROLE_KEY`);
          logger.info(`✅ [STORES] ${stores.length} lojas encontradas via SERVICE_ROLE_KEY`);
          return res.json({
            success: true,
            data: stores,
            stores: stores, // Para compatibilidade
            fallback: "supabase-service",
            source: "real-data",
            pagination: {
              page: 1,
              limit: stores.length,
              total: stores.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          });
        } catch (error) {
          console.error("❌ [STORES] SERVICE_ROLE_KEY falhou:", error.message);
          console.error("❌ [STORES] Erro stack:", error.stack);
          logger.error("❌ [STORES] SERVICE_ROLE_KEY falhou:", error.message);

          console.error("❌ [STORES] Todos os fallbacks falharam");

          // Diagnóstico final do erro
          const isRLSError =
            error.message?.includes("RLS") ||
            error.message?.includes("policy") ||
            error.code === "42501" ||
            anonError.message?.includes("RLS") ||
            anonError.message?.includes("policy") ||
            anonError.code === "42501";

          return res.status(500).json({
            success: false,
            error: "Serviço de lojas temporariamente indisponível",
            details: isRLSError ? "Configuração de segurança pendente" : "Erro de conexão com banco de dados",
            timestamp: new Date().toISOString(),
            diagnostic: {
              probable_cause: isRLSError ? "RLS policies not configured" : "Database connection issue",
            },
          });
        }
      }
    }

    // Route: POST /api/auth/register - APENAS BANCO DE DADOS
    if (req.method === "POST" && pathname === "/api/auth/register") {
      logger.info("👤 [REGISTER] Novo registro...");

      const { name, email, phone, password, userType, city, state } = req.body;

      // Validação básica
      if (!name || !email || !password) {
        return res.status(400).json({
          error: "Campos obrigatórios: name, email, password",
        });
      }

      if (!prisma || !safeQuery) {
        logger.error("❌ [REGISTER] Prisma não disponível");
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
        logger.error("❌ [REGISTER] Erro ao verificar usuário:", existingResult.error);
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
        logger.error("❌ [REGISTER] Erro ao criar usuário:", createResult.error);
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

      logger.info("✅ [REGISTER] Usuário criado com sucesso:", userWithoutPassword.id);
      return res.status(201).json({
        success: true,
        message: "Usuário cadastrado com sucesso",
        user: userWithoutPassword,
        token,
      });
    }

    // Route: POST /api/auth/login - APENAS BANCO DE DADOS
    if (req.method === "POST" && pathname === "/api/auth/login") {
      logger.info("🔐 [LOGIN] Tentativa de login...");

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email e password são obrigatórios" });
      }

      if (!prisma || !safeQuery) {
        logger.error("❌ [LOGIN] Prisma não disponível");
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
        logger.error("❌ [LOGIN] Erro no banco:", result.error);
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

      logger.info("✅ [LOGIN] Login realizado com sucesso:", userWithoutPassword.id);
      return res.json({
        success: true,
        message: "Login realizado com sucesso",
        user: userWithoutPassword,
        token,
      });
    }

    // Route: GET /api/admin/stats - APENAS BANCO DE DADOS (requires auth)
    if (req.method === "GET" && pathname === "/api/admin/stats") {
      logger.info("📊 [ADMIN] Buscando estatísticas...");

      try {
        const user = requireAuth();
        if (user.userType !== "ADMIN") {
          return res.status(403).json({ error: "Acesso negado" });
        }

        if (!prisma || !safeQuery) {
          logger.error("❌ [ADMIN] Prisma não disponível");
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
          logger.error("❌ [ADMIN] Erro ao buscar estatísticas");
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

        logger.info("✅ [ADMIN] Estatísticas carregadas:", stats);
        return res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        logger.error("❌ [ADMIN STATS] Erro:", error.message);
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
    logger.error("💥 [API] Erro geral:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
