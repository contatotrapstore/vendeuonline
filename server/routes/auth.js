import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import prisma from "../lib/prisma.js";
import { AppError, ValidationError, AuthenticationError, ConflictError, DatabaseError } from "../lib/errors.js";
import { asyncHandler, validateSchema } from "../middleware/errorHandler.js";
import { loginSchema, createUserSchema } from "../schemas/commonSchemas.js";
import { autoNotify } from "../middleware/notifications.js";

const router = express.Router();

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// JWT Secret
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac";

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
    console.log("🔐 Login request:", req.body.email);

    const { email, password, userType } = req.body;
    const emailLower = email.toLowerCase();

    // Tentar buscar usuário no banco de dados Prisma primeiro
    try {
      console.log("📡 Buscando usuário no banco de dados...");
      const user = await prisma.user.findUnique({
        where: { email: emailLower },
        include: {
          buyer: true,
          seller: {
            include: {
              store: true,
              plan: true,
            },
          },
          admin: true,
        },
      });

      if (!user) {
        console.log("❌ Usuário não encontrado no Prisma, tentando Supabase:", email);
        throw new Error("User not found in Prisma");
      }

      // Verificar tipo de usuário se especificado (admins podem acessar independente do userType)
      if (userType && user.type.toLowerCase() !== userType.toLowerCase() && user.type.toLowerCase() !== 'admin') {
        console.log("❌ Tipo de usuário incorreto:", { expected: userType, actual: user.type });
        throw new AuthenticationError("Tipo de usuário incorreto");
      }

      // Verificar senha
      const isValidPassword = await comparePassword(password, user.password);

      if (!isValidPassword) {
        console.log("❌ Senha inválida para:", email);
        throw new AuthenticationError("Email ou senha inválidos");
      }

      // Gerar token
      const token = generateToken(user);
      console.log("✅ Login realizado com sucesso (Prisma):", user.email);

      // Criar notificação de login
      await autoNotify.onLogin(user.id, user.name);

      // Construir resposta (remover senha)
      const { password: _, ...userData } = user;
      userData.userType = user.type.toLowerCase();

      return res.json({
        success: true,
        message: "Login realizado com sucesso",
        user: userData,
        token,
        expiresIn: "7d",
      });
    } catch (dbError) {
      console.warn("❌ Prisma falhou, tentando fallback Supabase:", dbError.message);
    }

    // Buscar usuário no Supabase como fallback
    console.log("📡 Buscando usuário no Supabase...");
    const { data: user, error: userError } = await supabase.from("users").select("*").eq("email", emailLower).single();

    if (userError || !user) {
      console.log("❌ Usuário não encontrado em todos os sistemas:", email);
      throw new AuthenticationError("Email ou senha inválidos");
    }

    console.log("✅ Usuário encontrado no Supabase");

    // Verificar tipo de usuário se especificado (admins podem acessar independente do userType)
    if (userType && user.type.toLowerCase() !== userType.toLowerCase() && user.type.toLowerCase() !== 'admin') {
      console.log("❌ Tipo de usuário incorreto:", { expected: userType, actual: user.type });
      throw new AuthenticationError("Tipo de usuário incorreto");
    }

    // Verificar senha
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      console.log("❌ Senha inválida para:", email);
      throw new AuthenticationError("Email ou senha inválidos");
    }

    // Gerar token
    const token = generateToken(user);

    console.log("✅ Login realizado com sucesso (Supabase):", user.email);

    // Criar notificação de login
    await autoNotify.onLogin(user.id, user.name);

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
    console.log("📝 Registration request:", req.body);

    const { name, email, password, phone, city, state, userType } = req.body;
    const emailLower = email.toLowerCase();

    // Verificar se o usuário já existe primeiro no Prisma
    try {
      const existingPrismaUser = await prisma.user.findUnique({
        where: { email: emailLower }
      });
      
      if (existingPrismaUser) {
        console.log("❌ Email já existe no banco de dados:", email);
        throw new ValidationError("Email já está em uso");
      }
    } catch (prismaError) {
      console.warn("⚠️ Prisma não disponível, verificando no Supabase");
    }

    // Verificar se o usuário já existe no Supabase
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", emailLower).single();

    if (existingUser) {
      console.log("❌ Email já existe no Supabase:", email);
      throw new ValidationError("Email já está em uso");
    }

    const hashedPassword = await hashPassword(password);

    // Gerar ID único para o usuário (com verificação dupla)
    let userId;
    do {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } while (!userId || userId === "null" || userId === "undefined");

    console.log("🆔 Generated user ID:", userId);

    const userData = {
      id: userId,
      name,
      email: emailLower,
      password: hashedPassword,
      phone,
      city,
      state,
      type: userType,
      isVerified: false,
      createdAt: new Date().toISOString(),
    };

    // Tentar criar usuário no Prisma primeiro
    try {
      const newUser = await prisma.user.create({
        data: userData
      });

      const token = generateToken(newUser);
      console.log("✅ Usuário criado no Prisma:", emailLower);

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
          userType: userType.toLowerCase(),
          isVerified: newUser.isVerified,
          createdAt: newUser.createdAt,
        },
        token,
      });
    } catch (prismaError) {
      console.warn("⚠️ Prisma falhou, tentando Supabase:", prismaError.message);
    }

    // Fallback para Supabase
    const { data: newUser, error: insertError } = await supabase.from("users").insert([userData]).select().single();

    if (insertError) {
      console.error("❌ Erro ao criar usuário:", insertError.message);
      throw new DatabaseError("Erro ao criar usuário no banco de dados");
    }

    const token = generateToken(newUser);

    console.log("✅ Usuário criado no Supabase:", emailLower);

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
        userType: userType,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt.toISOString(),
      },
      token,
    });
  })
);

export default router;
