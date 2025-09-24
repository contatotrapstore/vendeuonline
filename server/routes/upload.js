import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import multer from "multer";
import jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";


const router = express.Router();

// Configuração do multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos de imagem são permitidos"), false);
    }
  },
});

// Middleware de autenticação para upload
// Middleware removido - usando middleware centralizado

// Helper function para upload no Supabase Storage
const uploadToSupabase = async (
  fileBuffer,
  fileName,
  bucket = "stores",
  folder = "images",
  mimeType = "image/jpeg"
) => {
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  logger.info(`🔧 [UPLOAD] Iniciando upload para Supabase Storage`);
  logger.info(`📁 [UPLOAD] Destino: ${bucket}/${filePath}`);
  logger.info(`📄 [UPLOAD] Tamanho do arquivo: ${fileBuffer.length} bytes`);
  logger.info(`🎭 [UPLOAD] Content-Type: ${mimeType}`);

  // Upload do arquivo para Supabase Storage usando cliente normal
  const { data, error } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    logger.error("❌ [UPLOAD] Erro no upload Supabase Storage:", error);
    logger.error("🔍 [UPLOAD] Detalhes do erro:", {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
    });

    // Se falhar com cliente normal, tentar com admin
    logger.info("🔄 [UPLOAD] Tentando com cliente admin...");
    const { data: adminData, error: adminError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (adminError) {
      logger.error("❌ [UPLOAD] Erro também com cliente admin:", adminError);
      throw new Error(`Falha no upload: ${adminError.message}`);
    }

    logger.info(`✅ [UPLOAD] Upload realizado com sucesso via admin: ${adminData.path}`);

    // Obter URL pública usando cliente admin
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(adminData.path);

    logger.info(`🔗 [UPLOAD] URL pública gerada: ${urlData.publicUrl}`);

    return {
      publicUrl: urlData.publicUrl,
      path: adminData.path,
    };
  }

  logger.info(`✅ [UPLOAD] Upload realizado com sucesso: ${data.path}`);

  // Obter URL pública usando cliente normal
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  logger.info(`🔗 [UPLOAD] URL pública gerada: ${urlData.publicUrl}`);

  return {
    publicUrl: urlData.publicUrl,
    path: data.path,
  };
};

// POST /api/upload - Upload de imagens
router.post("/", authenticate, upload.single("file"), async (req, res) => {
  try {
    logger.info("📤 Upload de imagem solicitado pelo usuário:", req.user.email);

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const { type = "general", entityId } = req.body;

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = req.file.originalname.split(".").pop() || "jpg";
    const fileName = `${timestamp}-${random}.${extension}`;

    // Determinar bucket e pasta baseado no tipo
    let bucket = "stores";
    let folder = "images";

    if (type === "avatar") {
      folder = "avatars";
    } else if (type === "store-logo" || type === "store-banner") {
      folder = "stores";
    } else if (type === "product") {
      folder = "products";
    }

    logger.info(`📁 Fazendo upload para ${bucket}/${folder}/${fileName}`);
    logger.info(`🎭 Tipo de arquivo detectado: ${req.file.mimetype}`);

    // Upload para Supabase Storage com tipo correto
    const uploadResult = await uploadToSupabase(req.file.buffer, fileName, bucket, folder, req.file.mimetype);

    logger.info("✅ Upload realizado com sucesso:", uploadResult.publicUrl);

    res.json({
      success: true,
      message: "Upload realizado com sucesso",
      url: uploadResult.publicUrl,
      path: uploadResult.path,
      fileName: fileName,
    });
  } catch (error) {
    logger.error("❌ Erro no upload:", error);

    if (error.message.includes("Apenas arquivos de imagem")) {
      return res.status(400).json({ error: "Apenas arquivos de imagem são permitidos" });
    }

    if (error.message.includes("File too large")) {
      return res.status(400).json({ error: "Arquivo muito grande. Máximo 5MB permitido" });
    }

    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

export default router;
