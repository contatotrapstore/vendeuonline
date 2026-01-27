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
import { uniqueSlugify } from "../lib/utils.js";

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

const createDefaultAddressForUser = async ({ userId, address, city, state, zipCode }) => {
  const rawZip = (zipCode || "").trim();
  if (!userId || rawZip.length === 0) {
    return null;
  }

  const sanitizedZip = rawZip.replace(/\s+/g, "");

  try {
    const { data: existing } = await supabaseAdmin.from("addresses").select("id").eq("userId", userId).limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    const addressId = `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payload = {
      id: addressId,
      userId,
      label: "Principal",
      street: address || "",
      number: "",
      complement: "",
      neighborhood: "",
      city: city || "",
      state: state || "",
      zipCode: sanitizedZip,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from("addresses").insert(payload).select("id").single();

    if (error) {
      logger.warn("⚠️ Não foi possível criar endereço padrão:", error.message);
      return null;
    }

    return data?.id || addressId;
  } catch (error) {
    logger.warn("⚠️ Erro ao criar endereço padrão:", error);
    return null;
  }
};

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
          logger.info("⚠️ Loja não encontrada - criando automaticamente...");

          // Criar store automaticamente se não existir
          const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const storeName = seller.storeName || user.name + "'s Store";
          const storeSlug = uniqueSlugify(storeName); // ✅ FIX: Usar slugify para URLs amigáveis

          const { data: newStore, error: storeCreateError } = await supabaseAdmin
            .from("stores")
            .insert({
              id: storeId,
              sellerId: seller.id,
              name: storeName,
              slug: storeSlug,
              description: `Loja de ${user.name}`,
              email: user.email,
              phone: user.phone || "",
              city: user.city || "",
              state: user.state || "",
              isActive: true,
              isVerified: false,
            })
            .select()
            .single();

          if (!storeCreateError && newStore) {
            logger.info("✅ Store criada automaticamente no login:", newStore.id);
            seller.store = newStore;
          } else {
            logger.error("❌ Erro ao criar store automaticamente:", storeCreateError);
          }
        }

        user.seller = seller;
      } else {
        logger.info("⚠️ Dados do seller não encontrados para user:", user.id);
      }
    }

    // Debug: log dos dados que serão retornados (Supabase) - com safe stringify
    try {
      logger.info("🔍 Dados do seller antes da resposta (Supabase):", JSON.stringify(user.seller, null, 2));
    } catch (err) {
      logger.info("🔍 Dados do seller antes da resposta (Supabase):", user.seller);
    }

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

    // Criar usuário no Supabase
    const { data: newUser, error: insertError } = await supabase.from("users").insert([userData]).select().single();

    if (insertError) {
      throw new DatabaseError(`Erro ao criar usuário: ${insertError.message}`);
    }

    if (!newUser) {
      throw new DatabaseError("Usuário criado mas dados não retornados");
    }

    const token = generateToken(newUser);

    logger.info("✅ Usuário criado no Supabase:", emailLower);

    await createDefaultAddressForUser({
      userId: newUser.id,
      address: req.body.address,
      city,
      state,
      zipCode: req.body.zipCode,
    });

    // Se for SELLER, criar automaticamente seller e store
    let createdSeller = null;
    let createdStore = null;

    if (actualUserType === "SELLER") {
      try {
        // 🔒 FIX (Bug #1/#3/#5): Usar dados reais do formulário ao invés de hardcoded
        const sellerStoreName = req.body.storeName || `Loja de ${name}`;
        const sellerStoreDescription = req.body.storeDescription || "Nova loja criada automaticamente";
        const sellerAddress = req.body.address || `${city}, ${state}`;
        const sellerZipCode = req.body.zipCode || "00000-000";
        const sellerCategory = req.body.category || "geral";
        const sellerWhatsApp = req.body.whatsapp || phone || ""; // 🔒 FIX (Bug #5): Copiar phone se whatsapp não fornecido

        // Criar registro seller (usando supabaseAdmin para bypassar RLS)
        const sellerId = `seller_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const { data: sellerRecord, error: sellerError } = await supabaseAdmin
          .from("sellers")
          .insert({
            id: sellerId,
            userId: newUser.id,
            storeName: sellerStoreName,
          storeDescription: sellerStoreDescription,
          storeSlug: uniqueSlugify(sellerStoreName),
          address: sellerAddress,
          zipCode: sellerZipCode,
          category: sellerCategory,
          // whatsapp removed: campo não existe na tabela sellers (Bug #7 fix)
          plan: "GRATUITO",
          isActive: true,
          rating: 0,
          totalSales: 0,
            commission: 10,
          })
          .select()
          .single();

        if (sellerError) {
          logger.warn("⚠️ Erro ao criar seller:", sellerError.message);
        } else {
          logger.info("✅ Seller criado:", sellerId);
          createdSeller = sellerRecord;

          // Criar registro store (usando supabaseAdmin para bypassar RLS)
          const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          // 🔒 FIX (Bug #1/#3/#5): Usar mesmos dados do seller (já extraídos do req.body)
          const { data: storeRecord, error: storeError } = await supabaseAdmin
            .from("stores")
            .insert({
              id: storeId,
              sellerId: sellerId,
              name: sellerStoreName,
              slug: uniqueSlugify(sellerStoreName), // ✅ FIX: Usar slugify para URLs amigáveis (ex: "loja-de-eduardo-teste-lx5m3n")
              description: sellerStoreDescription,
              address: sellerAddress,
              city,
              state,
              zipCode: sellerZipCode,
              phone,
              whatsapp: sellerWhatsApp, // 🔒 FIX (Bug #5): WhatsApp agora é salvo
              email: emailLower,
              category: sellerCategory,
              plan: "GRATUITO", // 🔒 FIX (Bug #8): Campo plan é NOT NULL em stores
              isActive: true,
              isVerified: false,
              approval_status: "pending", // ✅ FIX Bug #6: Lojas novas começam como pendentes
              rating: 0,
              reviewCount: 0,
              productCount: 0,
              salesCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .select()
            .single();

          if (storeError) {
            logger.warn("⚠️ Erro ao criar store:", storeError.message);
          } else {
            logger.info("✅ Store criada:", storeId);
            createdStore = storeRecord;
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
        seller:
          actualUserType === "SELLER"
            ? {
                ...(createdSeller || {}),
                store: createdStore || null,
              }
            : null,
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

          // Se seller existe mas não tem store, criar automaticamente
          if (!seller.stores || seller.stores.length === 0) {
            logger.info("⚠️ Seller sem store - criando automaticamente...");

            const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const storeName = seller.storeName || req.user.name + "'s Store";
            const storeSlug = uniqueSlugify(storeName); // ✅ FIX: Usar slugify para URLs amigáveis

            const { data: newStore, error: storeCreateError } = await supabaseAdmin
              .from("stores")
              .insert({
                id: storeId,
                sellerId: seller.id,
                name: storeName,
                slug: storeSlug,
                description: `Loja de ${req.user.name}`,
                email: req.user.email,
                phone: req.user.phone || "",
                city: req.user.city || "",
                state: req.user.state || "",
                isActive: true,
                isVerified: false,
              })
              .select()
              .single();

            if (!storeCreateError && newStore) {
              logger.info("✅ Store criada automaticamente:", newStore.id);
              seller.stores = [newStore];
            } else {
              logger.error("❌ Erro ao criar store automaticamente:", storeCreateError);
            }
          }

          // Estruturar dados do seller no formato esperado pelo frontend
          req.user.seller = {
            id: seller.id,
            storeName: seller.storeName,
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
            .from("Order")
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
