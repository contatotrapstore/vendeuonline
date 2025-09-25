// API ULTRA SIMPLIFICADA - APENAS RETORNA JSON HARDCODED
// Remove TODA lógica complexa para garantir que funcione no Vercel

export default function handler(req, res) {
  console.log("✅ [TRACKING] API ultra simplificada executando...");

  // CORS básico
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Sempre retorna 200 OK com dados básicos
  return res.status(200).json({
    success: true,
    configs: {
      google_analytics_id: {
        value: "",
        isActive: false,
        isConfigured: false,
        description: "Google Analytics 4 Measurement ID",
      },
      meta_pixel_id: {
        value: "",
        isActive: false,
        isConfigured: false,
        description: "Meta/Facebook Pixel ID",
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
        description: "Scripts personalizados para o head",
      },
      custom_body_scripts: {
        value: "",
        isActive: false,
        isConfigured: false,
        description: "Scripts personalizados para o body",
      },
    },
    fallback: "ultra-simple-hardcoded",
    message: "API funcionando em modo básico",
    timestamp: new Date().toISOString(),
  });
}
