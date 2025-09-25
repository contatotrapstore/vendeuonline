// API pública para buscar configurações de tracking (sem autenticação) - COM FALLBACK SUPABASE
import { logger } from "../../lib/logger.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Tentar Prisma primeiro
    let configs = null;
    let usedFallback = false;

    try {
      configs = await prisma.systemConfig.findMany({
        where: {
          category: "tracking",
          isActive: true,
        },
        select: {
          key: true,
          value: true,
          isActive: true,
        },
      });
      console.log("✅ [TRACKING] Configurações obtidas via Prisma");
    } catch (prismaError) {
      console.warn("⚠️ [TRACKING] Prisma falhou, tentando Supabase direto");

      // Fallback para Supabase direto
      const { getTrackingConfigs } = await import("../../lib/supabase-direct.js");
      configs = await getTrackingConfigs();
      usedFallback = true;
      console.log("✅ [TRACKING] Configurações obtidas via Supabase direto");
    }

    // Converter para formato mais usável
    const configMap = {};
    configs.forEach((config) => {
      configMap[config.key] = {
        value: config.value,
        isActive: config.isActive,
        isConfigured: !!config.value && config.value.trim() !== "",
      };
    });

    return res.status(200).json({
      success: true,
      configs: configMap,
      fallback: usedFallback,
    });
  } catch (error) {
    console.error("❌ [TRACKING] Erro ao buscar configurações:", error);
    logger.error("Erro ao buscar configurações de tracking:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
}
