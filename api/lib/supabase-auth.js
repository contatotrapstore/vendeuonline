import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { logger } from "./logger.js";

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase configuration for auth");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Registrar novo usuário usando tabela public.users (não auth.users)
 * Mantém compatibilidade com schema existente do Prisma
 */
export async function registerUser({ name, email, password, phone, type = "BUYER", city = "", state = "" }) {
  try {
    logger.info(`[SUPABASE-AUTH] Registrando usuário: ${email}`);

    // Verificar se email já existe
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single();

    if (existingUser) {
      return {
        success: false,
        error: "Email já cadastrado",
        code: "EMAIL_EXISTS",
      };
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Gerar ID único (compatível com Prisma cuid)
    const userId = `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Inserir usuário na tabela public.users
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: userId,
        name,
        email,
        password: hashedPassword,
        phone,
        type: type.toUpperCase(),
        city: city || "",
        state: state || "",
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error("[SUPABASE-AUTH] Erro ao inserir usuário:", insertError);
      return {
        success: false,
        error: "Erro ao criar usuário",
        details: insertError.message,
      };
    }

    logger.info(`[SUPABASE-AUTH] Usuário criado com sucesso: ${newUser.id}`);

    // Retornar usuário sem senha
    const { password: _, ...userWithoutPassword } = newUser;

    return {
      success: true,
      user: userWithoutPassword,
    };
  } catch (error) {
    logger.error("[SUPABASE-AUTH] Erro no registro:", error);
    return {
      success: false,
      error: "Erro interno ao registrar usuário",
      details: error.message,
    };
  }
}

/**
 * Fazer login verificando credenciais na tabela public.users
 */
export async function loginUser({ email, password }) {
  try {
    logger.info(`[SUPABASE-AUTH] Tentativa de login: ${email}`);

    // Buscar usuário por email
    const { data: user, error: fetchError } = await supabase.from("users").select("*").eq("email", email).single();

    if (fetchError || !user) {
      logger.warn(`[SUPABASE-AUTH] Usuário não encontrado: ${email}`);
      return {
        success: false,
        error: "Credenciais inválidas",
        code: "INVALID_CREDENTIALS",
      };
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      logger.warn(`[SUPABASE-AUTH] Senha incorreta para: ${email}`);
      return {
        success: false,
        error: "Credenciais inválidas",
        code: "INVALID_CREDENTIALS",
      };
    }

    // Atualizar lastLogin
    await supabase.from("users").update({ updatedAt: new Date().toISOString() }).eq("id", user.id);

    logger.info(`[SUPABASE-AUTH] Login bem-sucedido: ${user.id}`);

    // Retornar usuário sem senha
    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
    };
  } catch (error) {
    logger.error("[SUPABASE-AUTH] Erro no login:", error);
    return {
      success: false,
      error: "Erro interno ao fazer login",
      details: error.message,
    };
  }
}

/**
 * Buscar usuário por ID
 */
export async function getUserById(userId) {
  try {
    const { data: user, error } = await supabase.from("users").select("*").eq("id", userId).single();

    if (error || !user) {
      return {
        success: false,
        error: "Usuário não encontrado",
      };
    }

    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
    };
  } catch (error) {
    logger.error("[SUPABASE-AUTH] Erro ao buscar usuário:", error);
    return {
      success: false,
      error: "Erro ao buscar usuário",
      details: error.message,
    };
  }
}

/**
 * Atualizar dados do usuário
 */
export async function updateUser(userId, updates) {
  try {
    // Se estiver atualizando senha, criptografar
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 12);
    }

    updates.updatedAt = new Date().toISOString();

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: "Erro ao atualizar usuário",
        details: error.message,
      };
    }

    const { password: _, ...userWithoutPassword } = updatedUser;

    return {
      success: true,
      user: userWithoutPassword,
    };
  } catch (error) {
    logger.error("[SUPABASE-AUTH] Erro ao atualizar usuário:", error);
    return {
      success: false,
      error: "Erro ao atualizar usuário",
      details: error.message,
    };
  }
}

export { supabase };
