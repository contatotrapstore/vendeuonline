import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { supabase } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

// Middleware de autenticação admin
// Middleware removido - usando middleware centralizado

// Validar IDs de pixels
const validatePixelId = (type, value) => {
  if (!value) return true; // Vazio é válido (desabilitado)

  switch (type) {
    case "google_analytics_id":
      return /^G-[A-Z0-9]{10}$/.test(value);
    case "google_tag_manager_id":
      return /^GTM-[A-Z0-9]+$/.test(value);
    case "meta_pixel_id":
      return /^\d{15,16}$/.test(value);
    case "tiktok_pixel_id":
      return /^[A-Z0-9]{20}$/.test(value);
    default:
      return true;
  }
};

// Configurações de tracking suportadas
const TRACKING_CONFIGS = {
  google_analytics_id: {
    description: "Google Analytics 4 Measurement ID (formato: G-XXXXXXXXXX)",
    category: "tracking",
    validation: (value) => !value || /^G-[A-Z0-9]{10}$/.test(value),
  },
  google_tag_manager_id: {
    description: "Google Tag Manager ID (formato: GTM-XXXXXXX)",
    category: "tracking",
    validation: (value) => !value || /^GTM-[A-Z0-9]+$/.test(value),
  },
  meta_pixel_id: {
    description: "Meta/Facebook Pixel ID (apenas números)",
    category: "tracking",
    validation: (value) => !value || /^\d{15,16}$/.test(value),
  },
  tiktok_pixel_id: {
    description: "TikTok Pixel ID",
    category: "tracking",
    validation: (value) => !value || /^[A-Z0-9]{20}$/.test(value),
  },
  custom_head_scripts: {
    description: "Scripts personalizados para o <head>",
    category: "tracking",
    validation: () => true,
  },
  custom_body_scripts: {
    description: "Scripts personalizados para o <body>",
    category: "tracking",
    validation: () => true,
  },
};

// ROTA PÚBLICA: Buscar configurações de tracking ativas
router.get("/configs", async (req, res) => {
  try {
    const trackingKeys = Object.keys(TRACKING_CONFIGS);
    const configs = {};

    // Buscar todas as configurações de uma vez
    const { data: systemConfigs, error } = await supabase
      .from("system_configs")
      .select("key, value, isActive")
      .in("key", trackingKeys);

    if (error) {
      // Se a tabela não existe ou erro, usar valores padrão
      logger.info("ℹ️ Tabela system_configs não encontrada, usando valores padrão");

      for (const key of trackingKeys) {
        configs[key] = {
          value: "",
          isActive: false,
          isConfigured: false,
          description: TRACKING_CONFIGS[key].description
        };
      }
    } else {
      // Mapear configurações existentes
      const configMap = new Map(systemConfigs.map(c => [c.key, c]));

      for (const key of trackingKeys) {
        const config = configMap.get(key);
        configs[key] = {
          value: config?.value || "",
          isActive: config?.isActive || false,
          isConfigured: !!config?.value && config?.isActive,
          description: TRACKING_CONFIGS[key].description
        };
      }
    }

    return res.json({
      success: true,
      configs,
    });
  } catch (error) {
    logger.error("Erro ao buscar configurações de tracking:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// ROTA ADMIN: Buscar configurações (autenticada)
router.get("/admin", authenticateAdmin, async (req, res) => {
  try {
    const trackingKeys = Object.keys(TRACKING_CONFIGS);

    // Buscar todas as configurações de tracking
    const { data: configs, error } = await supabase
      .from("system_configs")
      .select("key, value, isActive, category")
      .eq("category", "tracking")
      .in("key", trackingKeys);

    if (error) {
      logger.error("Erro ao buscar configurações admin:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar configurações"
      });
    }

    // Create a map of existing configs
    const configMap = {};
    (configs || []).forEach(config => {
      configMap[config.key] = {
        key: config.key,
        value: config.value || "",
        description: TRACKING_CONFIGS[config.key].description,
        isActive: config.isActive,
        isConfigured: !!config.value && config.isActive,
      };
    });

    // Fill in missing configs with defaults
    Object.keys(TRACKING_CONFIGS).forEach((key) => {
      if (!configMap[key]) {
        configMap[key] = {
          key,
          value: "",
          description: TRACKING_CONFIGS[key].description,
          isActive: false,
          isConfigured: false,
        };
      }
    });

    return res.json({
      success: true,
      configs: configMap,
      supportedConfigs: TRACKING_CONFIGS,
    });
  } catch (error) {
    logger.error("Erro ao buscar configurações:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ROTA ADMIN: Salvar configuração
router.post("/admin", authenticateAdmin, async (req, res) => {
  try {
    const { key, value, isActive = true } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Chave da configuração é obrigatória" });
    }

    if (!TRACKING_CONFIGS[key]) {
      return res.status(400).json({ error: "Configuração não suportada" });
    }

    // Validar valor
    if (!TRACKING_CONFIGS[key].validation(value)) {
      return res.status(400).json({
        error: `Formato inválido para ${key}`,
        description: TRACKING_CONFIGS[key].description,
      });
    }

    // Implementar upsert com Supabase
    const configData = {
      key,
      value: value || "",
      isActive,
      category: 'tracking',
      description: TRACKING_CONFIGS[key].description,
      updatedBy: req.admin.userId,
      updatedAt: new Date().toISOString()
    };

    const { data: config, error } = await supabase
      .from("system_configs")
      .upsert(configData, { onConflict: 'key' })
      .select()
      .single();

    if (error) {
      logger.error("Erro ao salvar configuração:", error);
      return res.status(500).json({ error: "Erro ao salvar configuração" });
    }

    logger.info(`💾 Configuração salva no banco: ${key} = ${value ? "[CONFIGURADO]" : "[VAZIO]"}`);

    return res.json({
      success: true,
      message: "Configuração salva com sucesso",
      config: {
        key: config.key,
        value: config.value || "",
        description: TRACKING_CONFIGS[key].description,
        isActive: config.isActive,
        isConfigured: !!config.value && config.isActive,
      },
    });
  } catch (error) {
    logger.error("Erro ao salvar configuração:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
