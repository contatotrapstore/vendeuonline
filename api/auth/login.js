import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, userType } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const emailLower = email.toLowerCase();

    console.log("🔐 Login request:", emailLower);

    // Buscar usuário no Supabase
    const { data: user, error: userError } = await supabase.from("users").select("*").eq("email", emailLower).single();

    if (userError || !user) {
      console.log("❌ Usuário não encontrado:", emailLower);
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    console.log("✅ Usuário encontrado:", user.email);

    // Verificar tipo de usuário se especificado
    if (userType && user.type.toLowerCase() !== userType.toLowerCase() && user.type.toLowerCase() !== "admin") {
      console.log("❌ Tipo de usuário incorreto");
      return res.status(401).json({ error: "Tipo de usuário incorreto" });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log("❌ Senha inválida");
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    // Gerar token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        type: user.type,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Login realizado com sucesso");

    // Buscar dados adicionais se for vendedor
    if (user.type.toUpperCase() === "SELLER") {
      const { data: seller } = await supabase.from("sellers").select("*").eq("userId", user.id).single();

      if (seller) {
        const { data: store } = await supabase.from("stores").select("*").eq("sellerId", seller.id).single();

        if (store) {
          seller.store = store;
        }
        user.seller = seller;
      }
    }

    // Remover senha da resposta
    const { password: _, ...userData } = user;
    userData.userType = user.type.toLowerCase();

    return res.status(200).json({
      success: true,
      message: "Login realizado com sucesso",
      user: userData,
      token,
      expiresIn: "7d",
    });
  } catch (error) {
    console.error("❌ Erro no login:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
