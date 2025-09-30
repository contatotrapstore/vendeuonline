/**
 * 🔍 ENDPOINT DE DIAGNÓSTICO PARA VERCEL
 *
 * Verifica se todas as configurações estão corretas para rodar no Vercel
 * Acesse: /api/vercel-check
 */

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();

  // Função helper para verificar variáveis (tenta múltiplos formatos)
  const getEnvVar = (varName) => {
    return process.env[`NEXT_PUBLIC_${varName}`] || process.env[`VITE_${varName}`] || process.env[varName];
  };

  // Lista de variáveis obrigatórias
  const requiredVars = [
    { name: "DATABASE_URL", checkMultiple: false },
    { name: "JWT_SECRET", checkMultiple: false },
    { name: "SUPABASE_URL", checkMultiple: true },
    { name: "SUPABASE_ANON_KEY", checkMultiple: true },
    { name: "SUPABASE_SERVICE_ROLE_KEY", checkMultiple: false },
  ];

  const results = {
    timestamp,
    status: "CHECKING",
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
    },
    variables: {},
    missing: [],
    warnings: [],
    tests: {},
  };

  // Verificar variáveis de ambiente
  console.log("🔍 [VERCEL-CHECK] Iniciando verificação de variáveis...");

  requiredVars.forEach(({ name, checkMultiple }) => {
    let value;
    let foundAs = null;

    if (checkMultiple) {
      value = getEnvVar(name);
      if (process.env[`NEXT_PUBLIC_${name}`]) foundAs = `NEXT_PUBLIC_${name}`;
      else if (process.env[`VITE_${name}`]) foundAs = `VITE_${name}`;
      else if (process.env[name]) foundAs = name;
    } else {
      value = process.env[name];
      foundAs = value ? name : null;
    }

    if (value) {
      results.variables[name] = {
        status: "✅ CONFIGURADA",
        foundAs: foundAs,
        preview: value.substring(0, 20) + "...",
      };
    } else {
      results.variables[name] = {
        status: "❌ FALTANDO",
        foundAs: null,
      };
      results.missing.push(name);
    }
  });

  // Testar imports críticos
  console.log("🔍 [VERCEL-CHECK] Testando imports...");

  try {
    const loggerModule = await import("./lib/logger.js");
    results.tests.logger = { status: "✅ OK", module: "./lib/logger.js" };
  } catch (error) {
    results.tests.logger = { status: "❌ FALHOU", error: error.message };
    results.warnings.push("Logger import failed - pode causar problemas de logging");
  }

  try {
    const prismaModule = await import("./lib/prisma.js");
    results.tests.prisma = { status: "✅ OK", module: "./lib/prisma.js" };
  } catch (error) {
    results.tests.prisma = { status: "❌ FALHOU", error: error.message };
    results.warnings.push("Prisma import failed - fallback para Supabase será usado");
  }

  try {
    const supabaseDirectModule = await import("./lib/supabase-direct.js");
    results.tests.supabaseDirect = { status: "✅ OK", module: "./lib/supabase-direct.js" };
  } catch (error) {
    results.tests.supabaseDirect = { status: "❌ FALHOU", error: error.message };
    results.warnings.push("Supabase Direct import failed - APIs podem falhar");
  }

  try {
    const supabaseAnonModule = await import("./lib/supabase-anon.js");
    results.tests.supabaseAnon = { status: "✅ OK", module: "./lib/supabase-anon.js" };
  } catch (error) {
    results.tests.supabaseAnon = { status: "❌ FALHOU", error: error.message };
    results.warnings.push("Supabase Anon import failed - fallback pode não funcionar");
  }

  try {
    const supabaseAuthModule = await import("./lib/supabase-auth.js");
    results.tests.supabaseAuth = { status: "✅ OK", module: "./lib/supabase-auth.js" };
  } catch (error) {
    results.tests.supabaseAuth = { status: "❌ FALHOU", error: error.message };
    results.warnings.push("Supabase Auth import failed - autenticação pode falhar");
  }

  // Testar conexão com Supabase
  if (results.missing.length === 0) {
    console.log("🔍 [VERCEL-CHECK] Testando conexão Supabase...");

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = getEnvVar("SUPABASE_URL");
      const supabaseAnonKey = getEnvVar("SUPABASE_ANON_KEY");

      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Testar uma query simples
        const { data, error } = await supabase.from("Plan").select("id").limit(1);

        if (error) {
          results.tests.supabaseConnection = {
            status: "⚠️ CONECTADO MAS COM ERRO",
            error: error.message,
            hint: "Pode ser problema de RLS policies",
          };
          results.warnings.push("Supabase conectou mas query falhou - verifique RLS policies");
        } else {
          results.tests.supabaseConnection = {
            status: "✅ OK",
            message: "Conexão Supabase funcionando",
            recordsFound: data?.length || 0,
          };
        }
      }
    } catch (error) {
      results.tests.supabaseConnection = {
        status: "❌ FALHOU",
        error: error.message,
      };
      results.warnings.push("Falha ao testar conexão Supabase");
    }
  }

  // Determinar status final
  if (results.missing.length === 0 && results.warnings.length === 0) {
    results.status = "✅ READY";
    results.message = "Sistema pronto para produção no Vercel";
  } else if (results.missing.length > 0) {
    results.status = "❌ NOT_READY";
    results.message = "Configuração incompleta - variáveis faltando";
  } else {
    results.status = "⚠️ WARNINGS";
    results.message = "Sistema pode funcionar mas com warnings";
  }

  // Adicionar instruções
  if (results.missing.length > 0) {
    results.instructions = {
      step1: "Acesse Vercel Dashboard → Project Settings → Environment Variables",
      step2: `Configure as seguintes variáveis: ${results.missing.join(", ")}`,
      step3: "Faça redeploy do projeto",
      step4: "Teste novamente este endpoint",
    };
  }

  console.log(`🔍 [VERCEL-CHECK] Verificação concluída: ${results.status}`);

  // Retornar com status code apropriado
  const statusCode = results.status === "✅ READY" ? 200 : results.status === "⚠️ WARNINGS" ? 200 : 500;

  return res.status(statusCode).json(results);
}
