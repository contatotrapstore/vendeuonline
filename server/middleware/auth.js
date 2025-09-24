import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";


// JWT Secret - OBRIGATÓRIO definir JWT_SECRET nas variáveis de ambiente
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error("❌ ERRO CRÍTICO: JWT_SECRET não definido nas variáveis de ambiente!");
  process.exit(1);
}

/**
 * Middleware de autenticação centralizado
 * Valida token JWT e busca usuário no Supabase
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token de autenticação necessário",
        code: "MISSING_TOKEN",
      });
    }

    const token = authHeader.substring(7);

    // Validar formato básico do token
    if (!token || token.length < 10) {
      return res.status(401).json({
        error: "Formato de token inválido",
        code: "INVALID_TOKEN_FORMAT",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        error: "Token inválido ou expirado",
        code: "INVALID_TOKEN",
      });
    }

    // Buscar usuário real do Supabase
    const { data: user, error } = await supabase.from("users").select("*").eq("id", decoded.userId).single();

    if (error || !user) {
      return res.status(401).json({
        error: "Usuário não encontrado",
        code: "USER_NOT_FOUND",
      });
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      return res.status(401).json({
        error: "Usuário inativo",
        code: "USER_INACTIVE",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("❌ Erro na autenticação:", error);
    return res.status(500).json({
      error: "Erro interno de autenticação",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Middleware de autenticação para vendedores
 * Inclui informações do seller e da loja
 */
export const authenticateSeller = async (req, res, next) => {
  try {
    // Primeiro, autenticar como usuário normal
    await new Promise((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Verificar se é um seller
    if (req.user.type !== "SELLER") {
      return res.status(403).json({
        error: "Acesso restrito a vendedores",
        code: "SELLER_ONLY",
      });
    }

    // Buscar informações do seller e loja associada
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select(`
        id,
        *,
        store:stores(id, name, isActive)
      `)
      .eq("userId", req.user.id)
      .single();

    if (sellerError || !seller) {
      return res.status(404).json({
        error: "Perfil de vendedor não encontrado",
        code: "SELLER_PROFILE_NOT_FOUND",
      });
    }

    // Adicionar informações do seller ao req.user
    req.user.sellerId = seller.id;
    req.user.storeId = seller.store?.id;
    req.seller = seller;

    // Log para debug se loja não encontrada
    if (!seller.store) {
      logger.warn(`⚠️ Loja não encontrada para seller: ${seller.id}`);
    }

    next();
  } catch (error) {
    logger.error("❌ Erro na autenticação do seller:", error);
    return res.status(500).json({
      error: "Erro interno de autenticação",
      code: "SELLER_AUTH_ERROR",
    });
  }
};

/**
 * Middleware de autenticação para admins
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    // Primeiro, autenticar como usuário normal
    await new Promise((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Verificar se é um admin
    if (req.user.type !== "ADMIN") {
      return res.status(403).json({
        error: "Acesso restrito a administradores",
        code: "ADMIN_ONLY",
      });
    }

    next();
  } catch (error) {
    logger.error("❌ Erro na autenticação do admin:", error);
    return res.status(500).json({
      error: "Erro interno de autenticação",
      code: "ADMIN_AUTH_ERROR",
    });
  }
};

/**
 * Middleware de autenticação para buyers
 */
export const authenticateBuyer = async (req, res, next) => {
  try {
    // Primeiro, autenticar como usuário normal
    await new Promise((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Verificar se é um buyer
    if (req.user.type !== "BUYER") {
      return res.status(403).json({
        error: "Acesso restrito a compradores",
        code: "BUYER_ONLY",
      });
    }

    // Buscar informações do buyer
    const { data: buyer, error: buyerError } = await supabase
      .from("buyers")
      .select("*")
      .eq("userId", req.user.id)
      .single();

    if (buyerError || !buyer) {
      return res.status(404).json({
        error: "Perfil de comprador não encontrado",
        code: "BUYER_PROFILE_NOT_FOUND",
      });
    }

    req.user.buyerId = buyer.id;
    req.buyer = buyer;
    next();
  } catch (error) {
    logger.error("❌ Erro na autenticação do buyer:", error);
    return res.status(500).json({
      error: "Erro interno de autenticação",
      code: "BUYER_AUTH_ERROR",
    });
  }
};

/**
 * Middleware de autenticação opcional
 * Adiciona informações do usuário se token estiver presente, mas permite acesso sem autenticação
 * Usado em rotas públicas que podem ter comportamento diferente se autenticado
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    // Validar formato básico do token
    if (!token || token.length < 10) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      req.user = null;
      return next();
    }

    // Buscar usuário real do Supabase
    const { data: user, error } = await supabase.from("users").select("*").eq("id", decoded.userId).single();

    if (error || !user || !user.isActive) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("❌ Erro na autenticação opcional:", error);
    req.user = null;
    next();
  }
};

/**
 * Middleware de autenticação universal
 * Adiciona informações específicas do tipo de usuário (seller/buyer)
 * Usado em rotas que precisam funcionar para múltiplos tipos
 */
export const authenticate = async (req, res, next) => {
  try {
    // Primeiro, autenticar como usuário normal
    await new Promise((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Se for seller, buscar informações do seller e loja
    if (req.user.type === "SELLER") {
      const { data: seller, error: sellerError } = await supabase
        .from("sellers")
        .select(`
          id,
          *,
          store:stores(id, name, isActive)
        `)
        .eq("userId", req.user.id)
        .single();

      if (!sellerError && seller) {
        req.user.sellerId = seller.id;
        req.user.storeId = seller.store?.id;
        req.seller = seller;

        if (!seller.store) {
          logger.warn(`⚠️ Loja não encontrada para seller: ${seller.id}`);
        }
      } else {
        logger.warn(`⚠️ Seller não encontrado para usuário: ${req.user.id}`);
      }
    }

    // Se for buyer, buscar informações do buyer
    if (req.user.type === "BUYER") {
      const { data: buyer, error: buyerError } = await supabase
        .from("buyers")
        .select("*")
        .eq("userId", req.user.id)
        .single();

      if (!buyerError && buyer) {
        req.user.buyerId = buyer.id;
        req.buyer = buyer;
      } else {
        logger.warn(`⚠️ Buyer não encontrado para usuário: ${req.user.id}`);
      }
    }

    next();
  } catch (error) {
    logger.error("❌ Erro na autenticação universal:", error);
    return res.status(500).json({
      error: "Erro interno de autenticação",
      code: "AUTH_ERROR",
    });
  }
};
