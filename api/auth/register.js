import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

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

  const { name, email, password, phone, city, state, type, userType } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
  }

  try {
    const emailLower = email.toLowerCase();
    const actualUserType = (type || userType || "BUYER").toUpperCase();

    console.log("📝 Registration request:", { email: emailLower, type: actualUserType });

    // Verificar se usuário já existe
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", emailLower).single();

    if (existingUser) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Gerar ID único
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Criar usuário
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert([
        {
          id: userId,
          name,
          email: emailLower,
          password: hashedPassword,
          phone: phone || null,
          city: city || null,
          state: state || null,
          type: actualUserType,
          isVerified: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (createError) {
      console.error("❌ Erro ao criar usuário:", createError);
      return res.status(500).json({ error: "Erro ao criar usuário" });
    }

    console.log("✅ Usuário criado:", newUser.email);

    // Gerar token
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        type: newUser.type,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Remover senha da resposta
    const { password: _, ...userData } = newUser;
    userData.userType = actualUserType.toLowerCase();

    return res.status(201).json({
      success: true,
      message: "Usuário registrado com sucesso",
      user: userData,
      token,
    });
  } catch (error) {
    console.error("❌ Erro no registro:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
