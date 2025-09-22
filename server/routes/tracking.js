import express from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET não está configurado no ambiente");
  process.exit(1);
}

// Middleware de autenticação admin
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autorização requerido" });
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== "ADMIN") {
      return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
    }
    req.admin = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

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
    // Simular configurações para teste (já que não temos banco)
    const mockConfigs = {
      google_analytics_id: {
        value: "",
        isActive: true,
        isConfigured: false,
      },
      meta_pixel_id: {
        value: "",
        isActive: true,
        isConfigured: false,
      },
      tiktok_pixel_id: {
        value: "",
        isActive: true,
        isConfigured: false,
      },
      custom_head_scripts: {
        value: "",
        isActive: true,
        isConfigured: false,
      },
    };

    return res.json({
      success: true,
      configs: mockConfigs,
    });
  } catch (error) {
    console.error("Erro ao buscar configurações de tracking:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// ROTA ADMIN: Buscar configurações (autenticada)
router.get("/admin", authenticateAdmin, async (req, res) => {
  try {
    // Simular configurações para teste
    const configMap = {};

    // Garantir que todas as configurações existam
    Object.keys(TRACKING_CONFIGS).forEach((key) => {
      configMap[key] = {
        key,
        value: "",
        description: TRACKING_CONFIGS[key].description,
        isActive: true,
        isConfigured: false,
      };
    });

    return res.json({
      success: true,
      configs: configMap,
      supportedConfigs: TRACKING_CONFIGS,
    });
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
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

    // Simular salvamento (sem banco)
    console.log(`💾 Salvando configuração: ${key} = ${value ? "[CONFIGURADO]" : "[VAZIO]"}`);

    return res.json({
      success: true,
      message: "Configuração salva com sucesso",
      config: {
        key,
        value: value || "",
        description: TRACKING_CONFIGS[key].description,
        isActive,
      },
    });
  } catch (error) {
    console.error("Erro ao salvar configuração:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
