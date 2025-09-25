import { logger } from "../../lib/logger.js";

// API pública para buscar configurações de tracking (sem autenticação)
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
    // Buscar apenas configurações ativas de tracking
    const configs = await prisma.systemConfig.findMany({
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
    });
  } catch (error) {
    logger.error("Erro ao buscar configurações de tracking:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
}
