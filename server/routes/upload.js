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
    logger.info("📤 [UPLOAD] ==== INÍCIO DO UPLOAD ====");
    logger.info(`📤 [UPLOAD] Usuário: ${req.user?.email || 'DESCONHECIDO'}`);
    logger.info(`📤 [UPLOAD] Usuário ID: ${req.user?.id || 'DESCONHECIDO'}`);
    logger.info(`📤 [UPLOAD] Arquivo recebido: ${req.file ? 'SIM' : 'NÃO'}`);

    if (req.file) {
      logger.info(`📤 [UPLOAD] Nome: ${req.file.originalname}`);
      logger.info(`📤 [UPLOAD] Tamanho: ${req.file.size} bytes (${(req.file.size / 1024).toFixed(2)} KB)`);
      logger.info(`📤 [UPLOAD] MIME: ${req.file.mimetype}`);
      logger.info(`📤 [UPLOAD] Buffer length: ${req.file.buffer?.length || 0}`);
    }

    logger.info(`📤 [UPLOAD] Body - bucket: ${req.body.bucket || 'undefined'}`);
    logger.info(`📤 [UPLOAD] Body - folder: ${req.body.folder || 'undefined'}`);
    logger.info(`📤 [UPLOAD] Body - type: ${req.body.type || 'undefined'}`);

    if (!req.file) {
      logger.error("❌ [UPLOAD] Nenhum arquivo foi recebido no req.file");
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const { bucket: requestBucket, folder: requestFolder, type = "general", entityId } = req.body;

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = req.file.originalname.split(".").pop() || "jpg";
    const fileName = `${timestamp}-${random}.${extension}`;

    // Determinar bucket e pasta (priorizar parâmetros do request)
    let bucket = requestBucket || "stores";
    let folder = requestFolder || "images";

    // Se não foi passado bucket/folder, determinar baseado no tipo (fallback)
    if (!requestBucket) {
      if (type === "avatar") {
        bucket = "avatars";
        folder = "avatars";
      } else if (type === "store-logo" || type === "store-banner") {
        bucket = "stores";
        folder = "stores";
      } else if (type === "product") {
        bucket = "products";
        folder = "products";
      }
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
    logger.error("❌ [UPLOAD] ==== ERRO NO UPLOAD ====");
    logger.error("❌ [UPLOAD] Tipo do erro:", error.constructor.name);
    logger.error("❌ [UPLOAD] Mensagem:", error.message);
    logger.error("❌ [UPLOAD] Stack:", error.stack);

    if (error.message.includes("Apenas arquivos de imagem")) {
      return res.status(400).json({ error: "Apenas arquivos de imagem são permitidos" });
    }

    if (error.message.includes("File too large")) {
      return res.status(400).json({ error: "Arquivo muito grande. Máximo 5MB permitido" });
    }

    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
      errorType: error.constructor.name,
    });
  }
});

export default router;
