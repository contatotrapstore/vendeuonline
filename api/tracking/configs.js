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
      console.warn("⚠️ [TRACKING] Prisma falhou, tentando fallback...");

      // Fallback 1: Supabase com ANON_KEY (WORKING!)
      try {
        console.log("✅ [TRACKING] Tentando com ANON_KEY (strategy working)...");
        const { getTrackingConfigsAnon } = await import("../../lib/supabase-anon.js");
        configs = await getTrackingConfigsAnon();
        usedFallback = "supabase-anon";
        console.log("✅ [TRACKING] Configurações obtidas via ANON_KEY");
      } catch (anonError) {
        console.warn("⚠️ [TRACKING] ANON_KEY falhou:", anonError.message);

        // Fallback 2: Supabase com SERVICE_ROLE_KEY
        try {
          console.log("⚠️ [TRACKING] Tentando SERVICE_ROLE_KEY...");
          const { getTrackingConfigs } = await import("../../lib/supabase-fetch.js");
          configs = await getTrackingConfigs();
          usedFallback = "supabase-fetch";
          console.log("✅ [TRACKING] Configurações obtidas via SERVICE_ROLE_KEY");
        } catch (fetchError) {
          console.error("❌ [TRACKING] SERVICE_ROLE_KEY falhou:", fetchError.message);
          // Vai para emergency fallback fora do try/catch
          throw fetchError;
        }
      }
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
    console.error("❌ [TRACKING] Erro stack:", error.stack);
    logger.error("Erro ao buscar configurações de tracking:", error);

    console.error("❌ [TRACKING] Todos os fallbacks falharam, usando emergency fallback");

    // EMERGENCY FALLBACK: Configurações hardcoded para manter o site funcionando
    const emergencyConfigs = {
      google_analytics_id: {
        value: "",
        isActive: false,
        isConfigured: false,
        description: "Google Analytics 4 Measurement ID (formato: G-XXXXXXXXXX)",
      },
      google_tag_manager_id: {
        value: "",
        isActive: false,
        isConfigured: false,
        description: "Google Tag Manager ID (formato: GTM-XXXXXXX)",
      },
      meta_pixel_id: {
        value: "",
        isActive: false,
        isConfigured: false,
        description: "Meta/Facebook Pixel ID (apenas números)",
      },
      tiktok_pixel_id: {
        value: "",
        isActive: false,
        isConfigured: false,
        description: "TikTok Pixel ID",
      },
      custom_head_scripts: {
        value: "",
        isActive: false,
        isConfigured: false,
        description: "Scripts personalizados para o <head>",
      },
      custom_body_scripts: {
        value: "",
        isActive: false,
        isConfigured: false,
        description: "Scripts personalizados para o <body>",
      },
    };

    return res.status(200).json({
      success: true,
      configs: emergencyConfigs,
      fallback: "emergency-hardcoded",
      message: "Usando configurações de emergência - funcionalidade limitada",
      timestamp: new Date().toISOString(),
    });
  }
}
