import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "../lib/supabase-client.js";
import { AppError, ValidationError, AuthenticationError, ConflictError, DatabaseError } from "../lib/errors.js";
import { asyncHandler, validateSchema } from "../middleware/errorHandler.js";
import { loginSchema, createUserSchema, changePasswordSchema } from "../schemas/commonSchemas.js";
import { autoNotify } from "../middleware/notifications.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error("❌ JWT_SECRET não está configurado no ambiente");
  process.exit(1);
}

// Função auxiliar para hash da senha
const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

// Função auxiliar para comparar senhas
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Exportar funções utilitárias para uso no server.js
export { hashPassword, comparePassword };

// Função para gerar token JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: user.type,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// POST /api/auth/login - Login
router.post(
  "/login",
  validateSchema(loginSchema),
  asyncHandler(async (req, res) => {
    logger.info("🔐 Login request:", req.body.email);

    const { email, password, userType } = req.body;
    const emailLower = email.toLowerCase();

    // Buscar usuário no Supabase
    logger.info("📡 Buscando usuário no Supabase...");
    const { data: user, error: userError } = await supabase.from("users").select("*").eq("email", emailLower).single();

    if (userError || !user) {
      logger.info("❌ Usuário não encontrado em todos os sistemas:", email);
      throw new AuthenticationError("Email ou senha inválidos");
    }

    logger.info("✅ Usuário encontrado no Supabase");

    // Verificar tipo de usuário se especificado (admins podem acessar independente do userType)
    if (userType && user.type.toLowerCase() !== userType.toLowerCase() && user.type.toLowerCase() !== "admin") {
      logger.info("❌ Tipo de usuário incorreto:", { expected: userType, actual: user.type });
      throw new AuthenticationError("Tipo de usuário incorreto");
    }

    // Verificar senha
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      logger.info("❌ Senha inválida para:", email);
      throw new AuthenticationError("Email ou senha inválidos");
    }

    // Gerar token
    const token = generateToken(user);

    logger.info("✅ Login realizado com sucesso (Supabase):", user.email);

    // Criar notificação de login
    await autoNotify.onLogin(user.id, user.name);

    // Debug: verificar tipo do usuário
    logger.info(`🔍 Verificando tipo do usuário: "${user.type}" (length: ${user.type.length})`);
    logger.info(`🔍 Comparação SELLER: ${user.type === "SELLER"}`);
    logger.info(`🔍 Comparação seller: ${user.type === "seller"}`);
    logger.info(`🔍 Comparação .toUpperCase(): ${user.type.toUpperCase() === "SELLER"}`);

    // Buscar dados adicionais se for vendedor
    if (user.type.toUpperCase() === "SELLER") {
      logger.info("📊 Buscando dados do vendedor no Supabase...");

      // Buscar dados do seller
      const { data: seller, error: sellerError } = await supabase
        .from("sellers")
        .select("*")
        .eq("userId", user.id)
        .single();

      if (!sellerError && seller) {
        logger.info("✅ Dados do seller encontrados:", seller.id);

        // Buscar dados da loja
        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("*")
          .eq("sellerId", seller.id)
          .single();

        if (!storeError && store) {
          logger.info("✅ Dados da loja encontrados:", store.name);
          seller.store = store;
        } else {
          logger.info("⚠️ Loja não encontrada para seller:", seller.id);
        }

        user.seller = seller;
      } else {
        logger.info("⚠️ Dados do seller não encontrados para user:", user.id);
      }
    }

    // Debug: log dos dados que serão retornados (Supabase)
    logger.info("🔍 Dados do seller antes da resposta (Supabase):", JSON.stringify(user.seller, null, 2));

    // Construir resposta com dados específicos do tipo de usuário (remover senha)
    const { password: _, ...userData } = user;
    userData.userType = user.type.toLowerCase();

    return res.json({
      success: true,
      message: "Login realizado com sucesso",
      user: userData,
      token,
      expiresIn: "7d",
    });
  })
);

// POST /api/auth/register - Registro
router.post(
  "/register",
  validateSchema(createUserSchema),
  asyncHandler(async (req, res) => {
    logger.info("📝 Registration request:", req.body);

    const { name, email, password, phone, city, state, userType, type } = req.body;
    const emailLower = email.toLowerCase();

    // Suportar tanto 'type' quanto 'userType' com fallback para BUYER
    // Priorizar 'type' sobre 'userType' pois é o campo padrão
    const actualUserType = (type || userType || "BUYER").toUpperCase();

    // Verificar se o usuário já existe primeiro no Prisma
    try {
      const existingPrismaUser = await prisma.user.findUnique({
        where: { email: emailLower },
      });

      if (existingPrismaUser) {
        logger.info("❌ Email já existe no banco de dados:", email);
        throw new ValidationError("Email já está em uso");
      }
    } catch (prismaError) {
      logger.warn("⚠️ Prisma não disponível, verificando no Supabase");
    }

    // Verificar se o usuário já existe no Supabase
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", emailLower).single();

    if (existingUser) {
      logger.info("❌ Email já existe no Supabase:", email);
      throw new ValidationError("Email já está em uso");
    }

    const hashedPassword = await hashPassword(password);

    // Gerar ID único para o usuário (com verificação dupla)
    let userId;
    do {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } while (!userId || userId === "null" || userId === "undefined");

    logger.info("🆔 Generated user ID:", userId);

    const userData = {
      id: userId,
      name,
      email: emailLower,
      password: hashedPassword,
      phone,
      city,
      state,
      type: actualUserType, // Garantir que tipo seja BUYER, SELLER ou ADMIN
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Tentar criar usuário no Prisma primeiro
    try {
      const newUser = await prisma.user.create({
        data: userData,
      });

      const token = generateToken(newUser);
      logger.info("✅ Usuário criado no Prisma:", emailLower);

      return res.status(201).json({
        success: true,
        message: "Usuário criado com sucesso",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          city: newUser.city,
          state: newUser.state,
          type: newUser.type,
          userType: actualUserType.toLowerCase(),
          isVerified: newUser.isVerified,
          createdAt: newUser.createdAt,
        },
        token,
      });
    } catch (prismaError) {
      logger.warn("⚠️ Prisma falhou, tentando Supabase:", prismaError.message);
    }

    // Fallback para Supabase
    logger.info("🔍 DEBUG - Inserindo no Supabase:", { type: actualUserType, email: emailLower });
    const { data: newUser, error: insertError } = await supabase.from("users").insert([userData]).select().single();

    if (insertError) {
      logger.error("❌ Erro ao criar usuário:", insertError.message);
      throw new DatabaseError("Erro ao criar usuário no banco de dados");
    }

    logger.info("🔍 DEBUG - Supabase retornou:", { type: newUser.type, email: newUser.email });

    const token = generateToken(newUser);

    logger.info("✅ Usuário criado no Supabase:", emailLower);

    // Se for SELLER, criar automaticamente seller e store
    if (actualUserType === "SELLER") {
      try {
        // Criar registro seller (usando supabaseAdmin para bypassar RLS)
        const sellerId = `seller_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const { error: sellerError } = await supabaseAdmin.from("sellers").insert({
          id: sellerId,
          userId: newUser.id,
          storeName: `Loja de ${name}`,
          storeDescription: "Nova loja criada automaticamente",
          storeSlug: `loja-${newUser.id.substring(0, 8)}`,
          address: `${city}, ${state}`,
          zipCode: "00000-000",
          category: "geral",
          plan: "GRATUITO",
          isActive: true,
          rating: 0,
          totalSales: 0,
          commission: 10,
        });

        if (sellerError) {
          logger.warn("⚠️ Erro ao criar seller:", sellerError.message);
        } else {
          logger.info("✅ Seller criado:", sellerId);

          // Criar registro store (usando supabaseAdmin para bypassar RLS)
          const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const { error: storeError } = await supabaseAdmin.from("stores").insert({
            id: storeId,
            sellerId: sellerId,
            name: `Loja de ${name}`,
            slug: `loja-${newUser.id.substring(0, 8)}`,
            description: "Nova loja criada automaticamente. Personalize seu perfil!",
            address: `${city}, ${state}`,
            city,
            state,
            zipCode: "00000-000",
            phone,
            email: emailLower,
            category: "geral",
            isActive: true,
            isVerified: false,
            rating: 0,
            reviewCount: 0,
            productCount: 0,
            salesCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          if (storeError) {
            logger.warn("⚠️ Erro ao criar store:", storeError.message);
          } else {
            logger.info("✅ Store criada:", storeId);
          }
        }
      } catch (err) {
        logger.error("❌ Erro ao criar seller/store:", err);
        // Não falhar o registro, apenas logar o erro
      }
    }

    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        city: newUser.city,
        state: newUser.state,
        type: newUser.type,
        userType: actualUserType.toLowerCase(),
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt,
      },
      token,
    });
  })
);

// Middleware de autenticação para mudança de senha
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuário no banco
    const { data: user, error } = await supabase.from("users").select("*").eq("id", decoded.userId).single();

    if (error || !user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("❌ Erro na autenticação:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido" });
    }

    res.status(401).json({ error: "Falha na autenticação" });
  }
};

// Schema de validação para mudança de senha
// POST /api/users/change-password - Alterar senha do usuário
router.post(
  "/users/change-password",
  authenticateUser,
  validateSchema(changePasswordSchema),
  asyncHandler(async (req, res) => {
    logger.info("🔐 Solicitação de mudança de senha para:", req.user.email);

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Verificar senha atual
    const isValidCurrentPassword = await comparePassword(currentPassword, req.user.password);

    if (!isValidCurrentPassword) {
      logger.info("❌ Senha atual incorreta para:", req.user.email);
      throw new AuthenticationError("Senha atual incorreta");
    }

    // Gerar hash da nova senha
    const newPasswordHash = await hashPassword(newPassword);

    // Atualizar senha no Supabase
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password: newPasswordHash,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      logger.error("❌ Erro ao atualizar senha no Supabase:", updateError);
      throw new DatabaseError("Erro ao atualizar senha");
    }

    logger.info("✅ Senha alterada com sucesso para:", req.user.email);

    // Criar notificação de mudança de senha
    try {
      await autoNotify.onPasswordChange(userId, req.user.name);
    } catch (notifyError) {
      logger.warn("⚠️ Erro ao criar notificação de mudança de senha:", notifyError);
    }

    res.json({
      success: true,
      message: "Senha alterada com sucesso",
    });
  })
);

// GET /api/auth/me - Obter dados do usuário autenticado
router.get(
  "/me",
  authenticateUser,
  asyncHandler(async (req, res) => {
    logger.info("🔍 Buscando dados do usuário:", req.user.email);

    try {
      // Se for vendedor, buscar dados completos do seller e store
      if (req.user.type === "SELLER") {
        logger.info("📊 Buscando dados do vendedor...");

        const { data: seller, error: sellerError } = await supabase
          .from("sellers")
          .select(
            `
            id,
            planId,
            rating,
            totalSales,
            commission,
            isVerified,
            stores(
              id,
              name,
              slug,
              description,
              email,
              phone,
              city,
              state,
              logo,
              banner,
              isVerified,
              isActive
            )
          `
          )
          .eq("userId", req.user.id)
          .single();

        if (!sellerError && seller) {
          logger.info("✅ Dados do seller encontrados:", seller.id);

          // Estruturar dados do seller no formato esperado pelo frontend
          req.user.seller = {
            id: seller.id,
            rating: seller.rating,
            totalSales: seller.totalSales,
            isVerified: seller.isVerified,
            store: seller.stores?.[0] || null, // Primeira loja se existir
          };
        } else {
          logger.info("⚠️ Dados do seller não encontrados");
        }
      }

      // Se for comprador, buscar dados do buyer
      if (req.user.type === "BUYER") {
        const { data: buyer, error: buyerError } = await supabase
          .from("buyers")
          .select("id")
          .eq("userId", req.user.id)
          .single();

        if (!buyerError && buyer) {
          // Buscar contagens reais
          const { data: wishlistCount } = await supabase
            .from("wishlists")
            .select("id", { count: "exact" })
            .eq("buyerId", buyer.id);

          const { data: orderCount } = await supabase
            .from("orders")
            .select("id", { count: "exact" })
            .eq("userId", req.user.id);

          req.user.buyer = {
            id: buyer.id,
            wishlistCount: wishlistCount?.length || 0,
            orderCount: orderCount?.length || 0,
          };
        }
      }

      // Remover senha da resposta
      const { password, ...userData } = req.user;
      userData.userType = req.user.type.toLowerCase();

      logger.info("✅ Dados do usuário carregados com sucesso");
      res.json({
        success: true,
        user: userData,
      });
    } catch (error) {
      logger.error("❌ Erro ao buscar dados do usuário:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao carregar dados do usuário",
      });
    }
  })
);

// POST /api/auth/logout - Logout
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    // Como JWT é stateless, o logout é feito no client-side
    // Mas podemos registrar o evento aqui e retornar sucesso
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        logger.info("🚪 Logout realizado:", decoded.email);
      } catch (error) {
        // Token inválido ou expirado - ainda assim permitir logout
        logger.warn("⚠️ Logout com token inválido/expirado");
      }
    }

    res.json({
      success: true,
      message: "Logout realizado com sucesso",
    });
  })
);

export default router;
