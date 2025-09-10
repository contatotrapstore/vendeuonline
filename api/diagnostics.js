// Função de diagnóstico completa para identificar problemas no Vercel
export default async function handler(req, res) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    tests: {},
  };

  try {
    console.log("🩺 [DIAGNOSTICS] Iniciando diagnóstico completo...");

    // 1. Testar variáveis de ambiente
    diagnostics.tests.environmentVariables = {
      status: "running",
      variables: {
        DATABASE_URL: process.env.DATABASE_URL ? "DEFINIDA" : "❌ NÃO DEFINIDA",
        DATABASE_URL_preview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + "..." : "N/A",
        JWT_SECRET: process.env.JWT_SECRET ? "DEFINIDA" : "❌ NÃO DEFINIDA",
        SUPABASE_URL: process.env.SUPABASE_URL ? "DEFINIDA" : "❌ NÃO DEFINIDA",
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? "DEFINIDA" : "❌ NÃO DEFINIDA",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "DEFINIDA" : "❌ NÃO DEFINIDA",
      },
    };

    // 2. Testar se Prisma Client existe
    try {
      const { PrismaClient } = await import("@prisma/client");
      diagnostics.tests.prismaImport = {
        status: "success",
        message: "PrismaClient importado com sucesso",
      };

      // 3. Testar criação da instância Prisma
      try {
        const prisma = new PrismaClient({
          log: ["error", "warn"],
        });
        diagnostics.tests.prismaInstance = {
          status: "success",
          message: "Instância PrismaClient criada",
        };

        // 4. Testar conexão com banco
        try {
          console.log("🩺 [DIAGNOSTICS] Tentando conectar ao banco...");
          await prisma.$connect();
          diagnostics.tests.databaseConnection = {
            status: "success",
            message: "Conexão com banco estabelecida",
          };

          // 5. Testar query simples
          try {
            console.log("🩺 [DIAGNOSTICS] Tentando query de teste...");
            const result = await prisma.$queryRaw`SELECT 1 as test`;
            diagnostics.tests.simpleQuery = {
              status: "success",
              message: "Query de teste executada",
              result: result,
            };

            // 6. Testar se tabela Plan existe
            try {
              const planCount = await prisma.plan.count();
              diagnostics.tests.planTable = {
                status: "success",
                message: `Tabela Plan encontrada com ${planCount} registros`,
              };
            } catch (error) {
              diagnostics.tests.planTable = {
                status: "error",
                message: "Erro ao acessar tabela Plan",
                error: error.message,
              };
            }
          } catch (error) {
            diagnostics.tests.simpleQuery = {
              status: "error",
              message: "Erro na query de teste",
              error: error.message,
            };
          }

          await prisma.$disconnect();
        } catch (error) {
          diagnostics.tests.databaseConnection = {
            status: "error",
            message: "Erro ao conectar com banco",
            error: error.message,
            code: error.code,
            meta: error.meta,
          };
        }
      } catch (error) {
        diagnostics.tests.prismaInstance = {
          status: "error",
          message: "Erro ao criar instância PrismaClient",
          error: error.message,
        };
      }
    } catch (error) {
      diagnostics.tests.prismaImport = {
        status: "error",
        message: "Erro ao importar PrismaClient",
        error: error.message,
      };
    }

    // 7. Testar conexão direta PostgreSQL (sem Prisma)
    try {
      // Só tenta se DATABASE_URL existir
      if (process.env.DATABASE_URL) {
        const { Client } = await import("pg");
        const client = new Client({
          connectionString: process.env.DATABASE_URL,
        });

        await client.connect();
        const result = await client.query("SELECT NOW() as current_time");
        await client.end();

        diagnostics.tests.directPostgresConnection = {
          status: "success",
          message: "Conexão direta com PostgreSQL funcionando",
          result: result.rows[0],
        };
      } else {
        diagnostics.tests.directPostgresConnection = {
          status: "skipped",
          message: "DATABASE_URL não definida",
        };
      }
    } catch (error) {
      diagnostics.tests.directPostgresConnection = {
        status: "error",
        message: "Erro na conexão direta com PostgreSQL",
        error: error.message,
      };
    }

    console.log("🩺 [DIAGNOSTICS] Diagnóstico concluído");
    res.status(200).json({
      success: true,
      diagnostics,
    });
  } catch (error) {
    console.error("❌ [DIAGNOSTICS] Erro geral:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      diagnostics,
    });
  }
}
