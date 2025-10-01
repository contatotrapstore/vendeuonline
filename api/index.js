import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";

// Import Prisma with error handling and better serverless support
let prisma = null;
let safeQuery = null;
let logger = null;

try {
  // Import logger from api lib
  const loggerModule = await import("./lib/logger.js");
  logger = loggerModule.logger;
  console.log("✅ [API] Logger importado com sucesso");

  // Import Prisma from api lib
  const prismaModule = await import("./lib/prisma.js");
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

// Helper function para verificar variáveis em múltiplos formatos (NEXT_PUBLIC_, VITE_, padrão)
const getEnvVar = (varName) => {
  // Tenta NEXT_PUBLIC_ (Next.js), depois VITE_ (Vite), depois sem prefixo
  return process.env[`NEXT_PUBLIC_${varName}`] || process.env[`VITE_${varName}`] || process.env[varName];
};

// Debug - Verificar variáveis de ambiente críticas (força console.log em produção para debug)
console.log("🔍 [API] Verificando variáveis de ambiente (formatos flexíveis):");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("SUPABASE_URL:", getEnvVar("SUPABASE_URL") ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("SUPABASE_ANON_KEY:", getEnvVar("SUPABASE_ANON_KEY") ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("Node Version:", process.version);
console.log("Platform:", process.platform);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Prisma Status:", prisma ? "INICIALIZADO" : "❌ FALHOU");

// Configurações JWT - OBRIGATÓRIO definir JWT_SECRET nas variáveis de ambiente
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ ERRO CRÍTICO: JWT_SECRET não definido nas variáveis de ambiente!");
  console.error("⚠️ Configure JWT_SECRET no Vercel Dashboard → Settings → Environment Variables");
  throw new Error("JWT_SECRET é obrigatório para segurança - configure nas variáveis de ambiente");
}

// MODO PRODUÇÃO: SEM DADOS MOCK - USAR APENAS BANCO DE DADOS
// Se o Prisma não conectar, retorna erro 500

// Inicializar Supabase client (para auth em produção/serverless)
const supabaseUrl = getEnvVar("SUPABASE_URL");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = getEnvVar("SUPABASE_ANON_KEY");

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log("✅ [API] Supabase client inicializado com service role key");
  } catch (error) {
    console.error("❌ [API] Erro ao inicializar Supabase:", error.message);
  }
} else {
  console.warn("⚠️ [API] Supabase credentials incompletas - auth pode falhar");
}

// Vercel serverless config
export const config = {
  api: {
    bodyParser: true, // Let Vercel parse, we'll handle edge cases
  },
};

// Helper to parse request body (fallback if bodyParser disabled)
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

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

    // Parse request body for POST/PUT/PATCH requests (ROBUST PARSING)
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      console.log(`🔍 [BODY-DEBUG] req.body type:`, typeof req.body);
      console.log(`🔍 [BODY-DEBUG] req.body value:`, req.body);

      try {
        // Check if body is already a valid parsed object
        if (req.body && typeof req.body === "object" && !Array.isArray(req.body) && Object.keys(req.body).length > 0) {
          // Body já parseado como objeto válido
          console.log(`✅ [BODY-DEBUG] Body is valid object with keys:`, Object.keys(req.body));
          logger.info(`📦 [API] Body already parsed:`, Object.keys(req.body));
        } else if (typeof req.body === "string" && req.body.trim()) {
          // Body veio como string, tentar parsear
          console.log(`📦 [BODY-DEBUG] Body is string, parsing JSON...`);
          req.body = JSON.parse(req.body);
          console.log(`✅ [BODY-DEBUG] String parsed with keys:`, Object.keys(req.body));
          logger.info(`📦 [API] Body parsed from string:`, Object.keys(req.body));
        } else if (!req.body || (typeof req.body === "object" && Object.keys(req.body).length === 0)) {
          // Body undefined/null/empty object, tentar ler do stream
          console.log(`📦 [BODY-DEBUG] Body empty, reading from stream...`);
          req.body = await parseBody(req);
          console.log(`✅ [BODY-DEBUG] Stream parsed with keys:`, Object.keys(req.body));
          logger.info(`📦 [API] Body parsed from stream:`, Object.keys(req.body));
        } else {
          throw new Error(
            `Unexpected body format. Type: ${typeof req.body}, Keys: ${Object.keys(req.body || {}).length}`
          );
        }
      } catch (error) {
        console.error(`❌ [BODY-DEBUG] Parse error:`, error.message);
        console.error(`❌ [BODY-DEBUG] req.body was:`, req.body);
        logger.error(`❌ [API] Error parsing body:`, error.message);
        return res.status(400).json({
          success: false,
          error: "Invalid JSON",
          details: error.message,
          bodyType: typeof req.body,
          timestamp: new Date().toISOString(),
        });
      }
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
          supabaseUrl: getEnvVar("SUPABASE_URL") ? "CONFIGURADA" : "NÃO CONFIGURADA",
          supabaseAnonKey: getEnvVar("SUPABASE_ANON_KEY") ? "CONFIGURADA" : "NÃO CONFIGURADA",
          supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "CONFIGURADA" : "NÃO CONFIGURADA",
        },
      });
    }

    // Route: GET /api/auth/debug - Verificar configuração Supabase
    if (req.method === "GET" && pathname === "/api/auth/debug") {
      return res.json({
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isVercel: !!process.env.VERCEL,
        },
        supabase: {
          urlConfigured: !!supabaseUrl,
          serviceKeyConfigured: !!supabaseServiceKey,
          anonKeyConfigured: !!supabaseAnonKey,
          clientInitialized: !!supabase,
        },
        jwt: {
          secretConfigured: !!JWT_SECRET,
        },
      });
    }

    // Route: GET /api/auth/check-emergency - Check emergency user hashes (DEBUG)
    if (req.method === "GET" && pathname === "/api/auth/check-emergency") {
      const EMERGENCY_USERS_CHECK = [
        {
          id: "user_emergency_admin",
          email: "admin@vendeuonline.com",
          name: "Admin Emergency",
          type: "ADMIN",
          password: "$2b$12$EG5HR5lndXipZahrTTlQouWXoZlYYxN26YwVxwlsKyI3YxNLNsqWO",
        },
      ];

      return res.json({
        timestamp: new Date().toISOString(),
        emergencyUsers: EMERGENCY_USERS_CHECK.map((u) => ({
          email: u.email,
          hashStart: u.password.substring(0, 15),
          hashEnd: u.password.substring(u.password.length - 15),
          hashLength: u.password.length,
        })),
        expectedHash: {
          full: "$2b$12$EG5HR5lndXipZahrTTlQouWXoZlYYxN26YwVxwlsKyI3YxNLNsqWO",
          start: "$2b$12$EG5HR5ln",
          end: "YxNLNsqWO",
        },
        note: "If hashes match, deployment has correct emergency users",
      });
    }

    // Route: GET /api/auth/verify-key - Verificar se service key está correta
    if (req.method === "GET" && pathname === "/api/auth/verify-key") {
      const expectedKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw";
      const currentKey = supabaseServiceKey || "";

      return res.json({
        timestamp: new Date().toISOString(),
        current: {
          exists: !!currentKey,
          length: currentKey.length,
          start: currentKey.substring(0, 30),
          end: currentKey.substring(currentKey.length - 30),
          hasSpaces: currentKey.includes(" "),
          hasNewlines: currentKey.includes("\n") || currentKey.includes("\r"),
          hasTabs: currentKey.includes("\t"),
        },
        expected: {
          length: expectedKey.length,
          start: expectedKey.substring(0, 30),
          end: expectedKey.substring(expectedKey.length - 30),
        },
        comparison: {
          lengthMatches: currentKey.length === expectedKey.length,
          startMatches: currentKey.substring(0, 30) === expectedKey.substring(0, 30),
          endMatches: currentKey.substring(currentKey.length - 30) === expectedKey.substring(expectedKey.length - 30),
          exactMatch: currentKey === expectedKey,
        },
      });
    }

    // Route: POST /api/auth/test-login-debug - Debug completo do login
    if (req.method === "POST" && pathname === "/api/auth/test-login-debug") {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "email and password required" });
      }

      const debugInfo = {
        timestamp: new Date().toISOString(),
        email,
        passwordLength: password.length,
        steps: [],
      };

      try {
        // Step 1: Check Supabase client
        debugInfo.steps.push({
          number: 1,
          name: "check-supabase-client",
          hasClient: !!supabase,
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey,
        });

        if (!supabase) {
          debugInfo.error = "Supabase client not initialized";
          return res.json(debugInfo);
        }

        // Step 1.5: Test with hardcoded correct key
        const correctKey =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0ODY1NiwiZXhwIjoyMDY5MzI0NjU2fQ.nHuBaO9mvMY5IYoVk7JX4W2fBcOwWqFYnBU3vLHN3uw";
        const testSupabase = createClient(supabaseUrl, correctKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: testUser, error: testError } = await testSupabase
          .from("users")
          .select("email")
          .eq("email", email)
          .single();

        debugInfo.steps.push({
          number: 1.5,
          name: "test-with-correct-key",
          worked: !!testUser,
          error: testError?.message || null,
          userEmail: testUser?.email || null,
        });

        // Step 2: Query user from database
        const { data: user, error: queryError } = await supabase.from("users").select("*").eq("email", email).single();

        debugInfo.steps.push({
          number: 2,
          name: "query-user",
          userFound: !!user,
          queryError: queryError?.message || null,
          hasPassword: !!user?.password,
          passwordHashLength: user?.password?.length || 0,
        });

        if (queryError) {
          debugInfo.error = `Query error: ${queryError.message}`;
          return res.json(debugInfo);
        }

        if (!user) {
          debugInfo.error = "User not found in database";
          return res.json(debugInfo);
        }

        // Step 3: Compare password with bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password);

        debugInfo.steps.push({
          number: 3,
          name: "bcrypt-compare",
          passwordMatch,
          bcryptAvailable: typeof bcrypt.compare === "function",
          passwordProvided: password.substring(0, 3) + "***",
          hashPrefix: user.password.substring(0, 10),
        });

        // Step 4: Generate JWT token if password matches
        if (passwordMatch) {
          const token = jwt.sign(
            {
              userId: user.id,
              email: user.email,
              type: user.type,
            },
            JWT_SECRET,
            { expiresIn: "7d" }
          );

          debugInfo.steps.push({
            number: 4,
            name: "generate-token",
            tokenGenerated: !!token,
            tokenLength: token.length,
          });

          return res.json({
            ...debugInfo,
            success: true,
            message: "Login would succeed!",
            user: {
              id: user.id,
              email: user.email,
              type: user.type,
              name: user.name,
            },
            tokenPreview: token.substring(0, 20) + "...",
          });
        } else {
          debugInfo.error = "Password does not match";
          return res.json({
            ...debugInfo,
            success: false,
          });
        }
      } catch (error) {
        debugInfo.error = error.message;
        debugInfo.stack = error.stack;
        return res.status(500).json(debugInfo);
      }
    }

    // Route: POST /api/auth/test-bcrypt - Test bcrypt directly
    if (req.method === "POST" && pathname === "/api/auth/test-bcrypt") {
      const { password, hash } = req.body;

      if (!password || !hash) {
        return res.status(400).json({ error: "password and hash required" });
      }

      try {
        const result = await bcrypt.compare(password, hash);
        return res.json({
          success: true,
          passwordMatch: result,
          bcryptVersion: bcrypt.version || "unknown",
          passwordLength: password.length,
          hashLength: hash.length,
          hashPrefix: hash.substring(0, 7),
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    // Route: POST /api/auth/test-login-flow - Test complete login flow
    if (req.method === "POST" && pathname === "/api/auth/test-login-flow") {
      const { email } = req.body;

      try {
        // Import Supabase client
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        // Query user
        const { data: user, error: fetchError } = await supabase.from("users").select("*").eq("email", email).single();

        if (fetchError) {
          return res.json({
            step: "query",
            success: false,
            error: fetchError.message,
            code: fetchError.code,
          });
        }

        if (!user) {
          return res.json({
            step: "query",
            success: false,
            error: "User not found",
          });
        }

        // Test bcrypt
        const password = "Test123!@#";
        const passwordMatch = await bcrypt.compare(password, user.password);

        return res.json({
          step: "complete",
          success: true,
          user: {
            id: user.id,
            email: user.email,
            type: user.type,
            hasPassword: !!user.password,
            passwordLength: user.password?.length,
          },
          bcryptTest: {
            passwordMatch,
            hashPrefix: user.password.substring(0, 20),
          },
        });
      } catch (error) {
        return res.status(500).json({
          step: "error",
          success: false,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    // Route: GET /api/health/check - Production readiness check (com suporte a ambos formatos)
    if (req.method === "GET" && pathname === "/api/health/check") {
      const requiredVars = [
        { key: "DATABASE_URL", checkBoth: false },
        { key: "JWT_SECRET", checkBoth: false },
        { key: "SUPABASE_URL", checkBoth: true },
        { key: "SUPABASE_ANON_KEY", checkBoth: true },
        { key: "SUPABASE_SERVICE_ROLE_KEY", checkBoth: false },
      ];

      const config = {};
      const missing = [];

      requiredVars.forEach(({ key, checkBoth }) => {
        let value;
        let displayKey = key;

        if (checkBoth) {
          value = getEnvVar(key);
          // Mostrar qual formato foi encontrado
          if (process.env[`NEXT_PUBLIC_${key}`]) {
            displayKey = `NEXT_PUBLIC_${key}`;
          } else if (process.env[key]) {
            displayKey = key;
          }
        } else {
          value = process.env[key];
        }

        if (value) {
          config[displayKey] = "✅ CONFIGURADA";
        } else {
          config[checkBoth ? `${key} (ou NEXT_PUBLIC_${key})` : key] = "❌ FALTANDO";
          missing.push(key);
        }
      });

      const isReady = missing.length === 0 && prisma && safeQuery;

      return res.status(isReady ? 200 : 500).json({
        status: isReady ? "READY" : "NOT_READY",
        message: isReady ? "Sistema pronto para produção" : "Configuração incompleta",
        timestamp: new Date().toISOString(),
        database: {
          prisma: prisma ? "✅ CONECTADO" : "❌ NÃO CONECTADO",
          safeQuery: safeQuery ? "✅ DISPONÍVEL" : "❌ NÃO DISPONÍVEL",
        },
        configuration: config,
        missing_variables: missing,
        help:
          missing.length > 0
            ? "Configure as variáveis faltantes no Vercel Dashboard → Project Settings → Environment Variables"
            : null,
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
          SUPABASE_URL: getEnvVar("SUPABASE_URL") || "NOT SET",
          SUPABASE_ANON_KEY: getEnvVar("SUPABASE_ANON_KEY") ? "SET" : "NOT SET",
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
        const supabaseAdmin = createClient(getEnvVar("SUPABASE_URL"), process.env.SUPABASE_SERVICE_ROLE_KEY);

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
        const supabaseAnon = createAnonClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

        const { data: testProducts } = await supabaseAnon.from("Product").select("id").limit(1);
        const { data: testStores } = await supabaseAnon.from("stores").select("id").limit(1);

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
          SUPABASE_URL: getEnvVar("SUPABASE_URL") ? "DEFINIDA" : "❌ VAZIA",
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "DEFINIDA" : "❌ VAZIA",
          SUPABASE_ANON_KEY: getEnvVar("SUPABASE_ANON_KEY") ? "DEFINIDA" : "❌ VAZIA",
          NODE_ENV: process.env.NODE_ENV,
        },
      };

      // Teste 1: Service Role Key
      try {
        console.log("🧪 [TEST-1] Testando com SERVICE_ROLE_KEY...");
        const supabaseDirect = await import("./lib/supabase-direct.js");
        const plans = await supabaseDirect.getPlans();
        results.serviceRole = { success: true, plans: plans.length };
      } catch (error) {
        console.error("❌ [TEST-1] SERVICE_ROLE falhou:", error.message);
        results.serviceRole = { success: false, error: error.message };
      }

      // Teste 2: Anon Key
      try {
        console.log("🧪 [TEST-2] Testando com ANON_KEY...");
        const supabaseClient = await import("./lib/supabase-client.js");
        const plans = await supabaseClient.getPlansAnon();
        results.anonKey = { success: true, plans: plans.length };
      } catch (error) {
        console.error("❌ [TEST-2] ANON_KEY falhou:", error.message);
        results.anonKey = { success: false, error: error.message };
      }

      // Teste 3: Mock Data (removido - não mais necessário em produção)
      results.mock = { success: false, error: "Mock data disabled in production" };

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
        const supabaseClient = await import("./lib/supabase-client.js");
        const plans = await supabaseClient.getPlansAnon();

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
          const supabaseDirect = await import("./lib/supabase-direct.js");
          const plans = await supabaseDirect.getPlans();

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
        const supabaseClient = await import("./lib/supabase-client.js");
        const products = await supabaseClient.getProductsAnon();

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
          const supabaseDirect = await import("./lib/supabase-direct.js");
          const products = await supabaseDirect.getProducts();

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
        const supabaseClient = await import("./lib/supabase-client.js");
        const stores = await supabaseClient.getStoresAnon();

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
          const supabaseDirect = await import("./lib/supabase-direct.js");
          const stores = await supabaseDirect.getStores();

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

    // Route: GET /api/categories - BANCO DE DADOS COM FALLBACK SUPABASE
    if (req.method === "GET" && pathname === "/api/categories") {
      logger.info("📁 [CATEGORIES] Buscando categorias no banco...");

      // Fallback: Supabase com ANON_KEY (WORKING!)
      try {
        console.log("✅ [CATEGORIES] Tentando com ANON_KEY...");
        const supabaseClient = await import("./lib/supabase-client.js");
        const { supabase } = supabaseClient;

        if (!supabase) {
          throw new Error("Supabase client não disponível");
        }

        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("isActive", true)
          .order("order", { ascending: true });

        if (error) throw error;

        console.log(`✅ [CATEGORIES] ${data.length} categorias encontradas via ANON_KEY`);
        logger.info(`✅ [CATEGORIES] ${data.length} categorias encontradas via ANON_KEY`);
        return res.json({
          success: true,
          categories: data || [],
          fallback: "supabase-anon",
          source: "real-data",
        });
      } catch (error) {
        console.error("❌ [CATEGORIES] Erro:", error.message);
        logger.error("❌ [CATEGORIES] Erro:", error.message);

        return res.status(500).json({
          success: false,
          error: "Serviço de categorias temporariamente indisponível",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Route: POST /api/auth/register - COM FALLBACK SUPABASE
    if (req.method === "POST" && pathname === "/api/auth/register") {
      logger.info("👤 [REGISTER] Novo registro...");

      const { name, email, phone, password, userType, city, state } = req.body;

      // Validação básica
      if (!name || !email || !password) {
        return res.status(400).json({
          error: "Campos obrigatórios: name, email, password",
        });
      }

      // FALLBACK: Se Prisma não disponível, usar Supabase Auth
      if (!prisma || !safeQuery) {
        logger.warn("⚠️ [REGISTER] Prisma não disponível, usando Supabase Auth...");

        try {
          const supabaseAuth = await import("./lib/supabase-auth.js");
          const result = await supabaseAuth.registerUser({
            name,
            email,
            password,
            phone,
            type: userType || "BUYER",
            city: city || "",
            state: state || "",
          });

          if (!result.success) {
            return res.status(400).json({
              success: false,
              error: result.error,
              code: result.code,
            });
          }

          // Gerar token
          const token = generateToken({
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            userType: result.user.type,
          });

          logger.info("✅ [REGISTER] Usuário criado via Supabase:", result.user.id);
          return res.status(201).json({
            success: true,
            message: "Usuário cadastrado com sucesso",
            user: result.user,
            token,
            method: "supabase-direct",
          });
        } catch (error) {
          logger.error("❌ [REGISTER] Erro no fallback Supabase:", error);
          return res.status(500).json({
            success: false,
            error: "Erro ao criar usuário",
            details: error.message,
          });
        }
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

    // EMERGENCY HARDCODED USERS - TEMPORARY SOLUTION
    const EMERGENCY_USERS = [
      {
        id: "user_emergency_trapstore",
        email: "contatotrapstore@gmail.com",
        name: "Eduardo Gouveia",
        type: "SELLER",
        // Hash for "Test123!@#" - matches database
        password: "$2b$12$EG5HR5lndXipZahrTTlQouWXoZlYYxN26YwVxwlsKyI3YxNLNsqWO",
      },
      {
        id: "user_emergency_admin",
        email: "admin@vendeuonline.com",
        name: "Admin Emergency",
        type: "ADMIN",
        // Hash for "Test123!@#" - matches database
        password: "$2b$12$EG5HR5lndXipZahrTTlQouWXoZlYYxN26YwVxwlsKyI3YxNLNsqWO",
      },
      {
        id: "user_emergency_teste",
        email: "teste@teste.com",
        name: "Teste Emergency",
        type: "BUYER",
        // Hash for "Test123!@#" - matches database
        password: "$2b$12$EG5HR5lndXipZahrTTlQouWXoZlYYxN26YwVxwlsKyI3YxNLNsqWO",
      },
    ];

    // Route: GET /api/test-hash - Endpoint para testar hash de senha
    if (req.method === "GET" && pathname === "/api/test-hash") {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const testEmail = url.searchParams.get("email");
      const testPassword = url.searchParams.get("password");

      if (!testEmail || !testPassword) {
        return res.status(400).json({ error: "Parâmetros email e password são obrigatórios" });
      }

      // EMERGENCY BYPASS: Check hardcoded users first
      console.log("🚨 [EMERGENCY] Checking hardcoded users for:", testEmail);
      const emergencyUser = EMERGENCY_USERS.find((u) => u.email === testEmail);

      if (emergencyUser) {
        console.log("✅ [EMERGENCY] Found emergency user:", emergencyUser.name);

        try {
          const bcryptResult = await bcrypt.compare(testPassword, emergencyUser.password);
          console.log("🔍 [EMERGENCY] bcrypt result:", bcryptResult);

          return res.json({
            success: true,
            message: "🚨 EMERGENCY BYPASS - Teste de hash concluído",
            connectionType: "emergency-hardcoded",
            user: {
              id: emergencyUser.id,
              email: emergencyUser.email,
              name: emergencyUser.name,
              type: emergencyUser.type,
            },
            test: {
              passwordProvided: testPassword,
              hashInDatabase: emergencyUser.password,
              bcryptResult: bcryptResult,
              bcryptWorking: typeof bcrypt.compare === "function",
            },
            timestamp: new Date().toISOString(),
            warning: "🚨 USING EMERGENCY HARDCODED USER - TEMPORARY SOLUTION",
          });
        } catch (bcryptError) {
          return res.json({
            success: false,
            error: "Emergency bcrypt failed",
            message: bcryptError.message,
          });
        }
      }

      console.log("⚠️ [EMERGENCY] User not found in emergency list, trying Supabase...");

      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = getEnvVar("SUPABASE_URL");
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        console.log("🔍 [TEST-HASH] Environment variables debug:");
        console.log("🔍 [TEST-HASH] supabaseUrl:", supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : "❌ UNDEFINED");
        console.log(
          "🔍 [TEST-HASH] serviceKey:",
          supabaseServiceKey ? `${supabaseServiceKey.slice(0, 20)}...` : "❌ UNDEFINED"
        );

        if (!supabaseUrl || !supabaseServiceKey) {
          return res.json({
            success: false,
            error: "Environment variables missing",
            debug: {
              supabaseUrl: supabaseUrl ? "PRESENT" : "MISSING",
              serviceKey: supabaseServiceKey ? "PRESENT" : "MISSING",
            },
          });
        }

        // FALLBACK: Usar fetch direto se createClient falhar
        console.log("🔄 [TEST-HASH] Tentando criar cliente Supabase...");

        let supabase;
        try {
          supabase = createClient(supabaseUrl, supabaseServiceKey);
          console.log("✅ [TEST-HASH] Supabase client created successfully");
        } catch (clientError) {
          console.log("❌ [TEST-HASH] Supabase client failed, using direct fetch...", clientError.message);

          // DIRECT FETCH FALLBACK
          const directFetchUrl = `${supabaseUrl}/rest/v1/users?email=eq.${testEmail}&select=*`;
          const directHeaders = {
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseServiceKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          };

          console.log("🔍 [TEST-HASH-DIRECT] Direct fetch URL:", directFetchUrl);
          console.log("🔍 [TEST-HASH-DIRECT] Headers configured");

          try {
            const directResponse = await fetch(directFetchUrl, {
              method: "GET",
              headers: directHeaders,
            });

            console.log("🔍 [TEST-HASH-DIRECT] Response status:", directResponse.status);

            if (!directResponse.ok) {
              const errorText = await directResponse.text();
              console.log("❌ [TEST-HASH-DIRECT] Response error:", errorText);
              return res.json({
                success: false,
                error: "Direct fetch failed",
                status: directResponse.status,
                errorText: errorText,
                debug: "Both Supabase client and direct fetch failed",
              });
            }

            const directData = await directResponse.json();
            console.log("✅ [TEST-HASH-DIRECT] Direct fetch success:", directData.length, "users found");

            if (!directData || directData.length === 0) {
              return res.json({
                success: false,
                error: "User not found via direct fetch",
                method: "direct-fetch",
              });
            }

            const user = directData[0];
            const bcryptResult = await bcrypt.compare(testPassword, user.password);

            return res.json({
              success: true,
              message: "Teste de hash concluído (direct fetch)",
              connectionType: "direct-fetch",
              user: {
                email: user.email,
                name: user.name,
                type: user.type,
              },
              test: {
                passwordProvided: testPassword,
                hashInDatabase: user.password,
                bcryptResult: bcryptResult,
                bcryptWorking: typeof bcrypt.compare === "function",
              },
              timestamp: new Date().toISOString(),
            });
          } catch (fetchError) {
            console.log("❌ [TEST-HASH-DIRECT] Direct fetch error:", fetchError.message);
            return res.json({
              success: false,
              error: "Both client and direct fetch failed",
              clientError: clientError.message,
              fetchError: fetchError.message,
            });
          }
        }

        // Buscar usuário
        const { data: user, error } = await supabase
          .from("users")
          .select("email, name, type, password")
          .eq("email", testEmail)
          .single();

        if (error || !user) {
          return res.json({
            success: false,
            message: "Usuário não encontrado",
            email: testEmail,
            error: error?.message,
          });
        }

        // Testar senha
        const bcryptResult = await bcrypt.compare(testPassword, user.password);

        return res.json({
          success: true,
          message: "Teste de hash concluído",
          connectionType: "service-role-key",
          user: {
            email: user.email,
            name: user.name,
            type: user.type,
          },
          test: {
            passwordProvided: testPassword,
            hashInDatabase: user.password,
            bcryptResult: bcryptResult,
            bcryptWorking: typeof bcrypt.compare === "function",
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.log("❌ [TEST-HASH] Service role failed, trying anon key...", error.message);

        // FALLBACK: Tentar com anon key
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabaseUrl = process.env.SUPABASE_URL;
          const anonKey = process.env.SUPABASE_ANON_KEY;

          console.log("🔍 [TEST-HASH-ANON] Trying anon key fallback...");
          console.log("🔍 [TEST-HASH-ANON] anonKey:", anonKey ? `${anonKey.slice(0, 20)}...` : "❌ UNDEFINED");

          if (!anonKey) {
            return res.json({
              success: false,
              error: "Both service role and anon keys missing",
              serviceRoleError: error.message,
            });
          }

          const supabaseAnon = createClient(supabaseUrl, anonKey);

          // Buscar usuário com anon key (limitações RLS podem aplicar)
          const { data: user, error: anonError } = await supabaseAnon
            .from("users")
            .select("email, name, type, password")
            .eq("email", testEmail)
            .single();

          if (anonError || !user) {
            return res.json({
              success: false,
              error: "User not found with anon key",
              serviceRoleError: error.message,
              anonError: anonError?.message,
              debug: "Both service role and anon key failed",
            });
          }

          // Testar senha com anon key
          const bcryptResult = await bcrypt.compare(testPassword, user.password);

          return res.json({
            success: true,
            message: "Teste de hash concluído (anon key fallback)",
            connectionType: "anon-key-fallback",
            serviceRoleError: error.message,
            user: {
              email: user.email,
              name: user.name,
              type: user.type,
            },
            test: {
              passwordProvided: testPassword,
              hashInDatabase: user.password,
              bcryptResult: bcryptResult,
              bcryptWorking: typeof bcrypt.compare === "function",
            },
            timestamp: new Date().toISOString(),
          });
        } catch (fallbackError) {
          return res.status(500).json({
            success: false,
            error: "Both service role and anon key failed",
            serviceRoleError: error.message,
            fallbackError: fallbackError.message,
          });
        }
      }
    }

    // Route: POST /api/auth/login - APENAS BANCO DE DADOS
    if (req.method === "POST" && pathname === "/api/auth/login") {
      logger.info("🔐 [LOGIN] Tentativa de login...");

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email e password são obrigatórios" });
      }

      // EMERGENCY BYPASS: Check hardcoded users first
      console.log("🚨 [LOGIN-EMERGENCY] Checking hardcoded users for:", email);
      const emergencyUser = EMERGENCY_USERS.find((u) => u.email === email);

      if (emergencyUser) {
        console.log("✅ [LOGIN-EMERGENCY] Found emergency user:", emergencyUser.name);

        try {
          const isValidPassword = await bcrypt.compare(password, emergencyUser.password);
          console.log("🔍 [LOGIN-EMERGENCY] Password valid:", isValidPassword);

          if (!isValidPassword) {
            console.log("❌ [LOGIN-EMERGENCY] Invalid password");
            return res.status(401).json({ error: "Credenciais inválidas" });
          }

          // Generate JWT token
          const token = jwt.sign(
            {
              userId: emergencyUser.id,
              email: emergencyUser.email,
              type: emergencyUser.type,
            },
            JWT_SECRET,
            { expiresIn: "7d" }
          );

          console.log("✅ [LOGIN-EMERGENCY] Login successful, token generated");

          return res.json({
            success: true,
            user: {
              id: emergencyUser.id,
              email: emergencyUser.email,
              name: emergencyUser.name,
              type: emergencyUser.type,
            },
            token,
            method: "emergency-hardcoded",
            warning: "🚨 USING EMERGENCY BYPASS - TEMPORARY SOLUTION",
          });
        } catch (emergencyError) {
          console.log("❌ [LOGIN-EMERGENCY] Error:", emergencyError.message);
          return res.status(500).json({
            success: false,
            error: "Emergency login failed",
            message: emergencyError.message,
          });
        }
      }

      console.log("⚠️ [LOGIN-EMERGENCY] User not found in emergency list, trying database...");

      // Detectar ambiente serverless (Vercel, AWS Lambda, etc)
      const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
      const isProduction = process.env.NODE_ENV === "production";

      console.log(`🌍 [LOGIN-DEBUG] Environment:`, {
        isServerless,
        isProduction,
        hasVercel: !!process.env.VERCEL,
        hasPrisma: !!prisma,
        hasSafeQuery: !!safeQuery,
      });

      // SEMPRE usar Supabase em produção/serverless (Vercel)
      if (isServerless || isProduction || !prisma || !safeQuery) {
        console.log(`🔄 [LOGIN-DEBUG] Usando Supabase Auth (serverless: ${isServerless}, production: ${isProduction})`);
        logger.warn(
          `⚠️ [LOGIN] ${isServerless ? "Serverless detectado" : "Prisma não disponível"}, usando Supabase Auth...`
        );

        try {
          console.log(`🔍 [LOGIN-DEBUG] Verificando Supabase client...`);

          if (!supabase) {
            console.error(`❌ [LOGIN-DEBUG] Supabase client não inicializado`);
            return res.status(500).json({
              error: "Configuração de autenticação inválida",
              details: "Supabase client não inicializado",
            });
          }

          console.log(`✅ [LOGIN-DEBUG] Supabase client OK, buscando usuário: ${email}`);

          // Buscar usuário no Supabase
          const { data: user, error: fetchError } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

          console.log(`🔍 [LOGIN-DEBUG] Supabase query result:`, {
            found: !!user,
            error: fetchError?.message,
            hasPassword: !!user?.password,
          });

          if (fetchError || !user) {
            console.log(`❌ [LOGIN-DEBUG] Usuário não encontrado ou erro:`, fetchError?.message);
            return res.status(401).json({
              error: "Credenciais inválidas",
            });
          }

          console.log(`✅ [LOGIN-DEBUG] Usuário encontrado: ${user.email}, comparando senha...`);

          // Verificar senha com bcrypt
          const passwordMatch = await bcrypt.compare(password, user.password);

          console.log(`🔍 [LOGIN-DEBUG] Bcrypt compare result:`, passwordMatch);

          if (!passwordMatch) {
            console.log(`❌ [LOGIN-DEBUG] Senha incorreta para: ${email}`);
            return res.status(401).json({
              error: "Credenciais inválidas",
            });
          }

          console.log(`✅ [LOGIN-DEBUG] Login bem-sucedido, gerando token...`);

          // Remover senha antes de retornar
          const { password: _, ...userWithoutPassword } = user;

          // Gerar token
          const token = jwt.sign(
            {
              userId: user.id,
              email: user.email,
              type: user.type,
            },
            JWT_SECRET,
            { expiresIn: "7d" }
          );

          console.log(`✅ [LOGIN-DEBUG] Token gerado com sucesso`);

          logger.info("✅ [LOGIN] Login via Supabase bem-sucedido:", user.id);
          return res.json({
            success: true,
            user: userWithoutPassword,
            token,
            method: "supabase-inline",
          });
        } catch (error) {
          logger.error("❌ [LOGIN] Erro no fallback Supabase:", error);
          return res.status(500).json({
            success: false,
            error: "Erro ao fazer login",
            details: error.message,
          });
        }
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

    // Route: GET /api/admin/stats - COM FALLBACK SUPABASE (requires auth)
    if (req.method === "GET" && pathname === "/api/admin/stats") {
      logger.info("📊 [ADMIN] Buscando estatísticas...");

      try {
        const user = requireAuth();
        if (user.userType !== "ADMIN") {
          return res.status(403).json({ error: "Acesso negado" });
        }

        // Tentar Prisma primeiro
        if (prisma && safeQuery) {
          const [usersResult, productsResult, storesResult, ordersResult] = await Promise.all([
            safeQuery(async () => await prisma.user.count()),
            safeQuery(async () => await prisma.product.count({ where: { isActive: true } })),
            safeQuery(async () => await prisma.store.count({ where: { isActive: true } })),
            safeQuery(async () => await prisma.order.count()),
          ]);

          // Verificar se todas as queries foram bem-sucedidas
          if (usersResult.success && productsResult.success && storesResult.success && ordersResult.success) {
            const stats = {
              totalUsers: usersResult.data,
              totalProducts: productsResult.data,
              totalStores: storesResult.data,
              totalOrders: ordersResult.data,
            };

            logger.info("✅ [ADMIN] Estatísticas carregadas via Prisma:", stats);
            return res.json({
              success: true,
              data: stats,
            });
          }

          logger.warn("⚠️ [ADMIN] Prisma falhou, tentando Supabase...");
        }

        // Fallback: Supabase
        try {
          const supabaseClient = await import("./lib/supabase-client.js");
          const stats = await supabaseClient.getAdminStatsSupabase();

          logger.info("✅ [ADMIN] Estatísticas carregadas via Supabase:", stats);
          return res.json({
            success: true,
            data: stats,
            fallback: "supabase",
          });
        } catch (supabaseError) {
          logger.error("❌ [ADMIN] Supabase também falhou:", supabaseError.message);
          return res.status(500).json({
            success: false,
            error: "Serviço de estatísticas temporariamente indisponível",
            details: supabaseError.message,
          });
        }
      } catch (error) {
        logger.error("❌ [ADMIN STATS] Erro:", error.message);
        return res.status(401).json({ error: error.message });
      }
    }

    // Route: GET /api/products/:id - PRODUCT DETAIL
    if (req.method === "GET" && pathname.startsWith("/api/products/")) {
      logger.info("🛍️ [PRODUCT DETAIL] Buscando produto...");

      const productId = pathname.split("/api/products/")[1];

      if (!productId || productId.length < 10) {
        return res.status(400).json({
          success: false,
          error: "ID de produto inválido",
        });
      }

      // Tentar Supabase direto (mais confiável no Vercel)
      try {
        console.log("✅ [PRODUCT DETAIL] Usando Supabase client...");
        const supabaseClient = await import("./lib/supabase-client.js");
        const { supabase: supabaseAnon } = supabaseClient;

        const { data: product, error } = await supabaseAnon
          .from("Product")
          .select(
            `
            *,
            ProductImage (id, url, alt, order),
            ProductSpecification (id, name, value),
            categories (id, name, slug),
            stores (id, name, slug, isVerified, rating),
            sellers (id, rating, storeName)
          `
          )
          .eq("id", productId)
          .eq("isActive", true)
          .single();

        if (error) {
          console.error("❌ [PRODUCT DETAIL] Supabase error:", error.message);
          return res.status(404).json({
            success: false,
            error: "Produto não encontrado",
          });
        }

        if (!product) {
          return res.status(404).json({
            success: false,
            error: "Produto não encontrado",
          });
        }

        console.log(`✅ [PRODUCT DETAIL] Produto encontrado: ${product.name}`);
        return res.json({
          success: true,
          product: product,
        });
      } catch (error) {
        console.error("❌ [PRODUCT DETAIL] Error:", error.message);
        return res.status(500).json({
          success: false,
          error: "Erro ao buscar produto",
          details: error.message,
        });
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
