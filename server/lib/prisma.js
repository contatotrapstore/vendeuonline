import { PrismaClient } from "@prisma/client";

// Cliente Prisma simples e direto
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Wrapper para queries com tratamento de erro (necessário para api/index.js)
export async function safeQuery(queryFn) {
  try {
    await prisma.$connect();
    const result = await queryFn(prisma);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [PRISMA] Erro na query:", error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}

export default prisma;
