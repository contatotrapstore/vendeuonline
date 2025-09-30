import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

// Singleton do Prisma para evitar múltiplas conexões no Vercel
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ["error", "warn", "info"],
    });
  }
  prisma = global.__prisma;
}

// Função para testar conexão
export async function testConnection() {
  try {
    await prisma.$connect();
    logger.info("✅ [PRISMA] Conexão estabelecida com sucesso");
    return true;
  } catch (error) {
    logger.error("❌ [PRISMA] Erro de conexão:", error);
    return false;
  }
}

// Função para desconectar (importante no Vercel)
export async function disconnect() {
  try {
    await prisma.$disconnect();
    logger.info("✅ [PRISMA] Desconectado com sucesso");
  } catch (error) {
    logger.error("❌ [PRISMA] Erro ao desconectar:", error);
  }
}

// Wrapper para queries com tratamento de erro
export async function safeQuery(queryFn) {
  try {
    await testConnection();
    const result = await queryFn(prisma);
    return { success: true, data: result };
  } catch (error) {
    logger.error("❌ [PRISMA] Erro na query:", error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}

export default prisma;
