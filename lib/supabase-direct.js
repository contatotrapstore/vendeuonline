/**
 * 🗃️ SUPABASE DIRECT CLIENT - Fallback para quando Prisma falha
 *
 * Cliente direto do Supabase para uso em ambiente serverless
 * quando o Prisma não consegue inicializar corretamente
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    console.log("✅ [SUPABASE] Cliente direto inicializado com sucesso");
  } else {
    console.error("❌ [SUPABASE] Variáveis de ambiente não configuradas");
    console.error("❌ [SUPABASE] SUPABASE_URL:", supabaseUrl ? "DEFINIDA" : "NÃO DEFINIDA");
    console.error("❌ [SUPABASE] SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "DEFINIDA" : "NÃO DEFINIDA");
  }
} catch (error) {
  console.error("❌ [SUPABASE] Erro ao inicializar cliente:", error.message);
}

/**
 * Buscar planos usando Supabase direto
 */
export async function getPlans() {
  if (!supabaseClient) {
    throw new Error("Cliente Supabase não disponível");
  }

  const { data, error } = await supabaseClient
    .from("Plan")
    .select("*")
    .eq("isActive", true)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(`Erro Supabase: ${error.message}`);
  }

  return data;
}

/**
 * Buscar produtos usando Supabase direto
 */
export async function getProducts() {
  if (!supabaseClient) {
    throw new Error("Cliente Supabase não disponível");
  }

  const { data, error } = await supabaseClient
    .from("Product")
    .select(
      `
      *,
      images:ProductImage(*, order),
      store:Store(
        *,
        seller:Seller(
          *,
          user:User(*)
        )
      )
    `
    )
    .eq("isActive", true)
    .order("createdAt", { ascending: false });

  if (error) {
    throw new Error(`Erro Supabase: ${error.message}`);
  }

  return data;
}

/**
 * Buscar lojas usando Supabase direto
 */
export async function getStores() {
  if (!supabaseClient) {
    throw new Error("Cliente Supabase não disponível");
  }

  const { data, error } = await supabaseClient
    .from("Store")
    .select(
      `
      *,
      seller:Seller(
        *,
        user:User(*)
      )
    `
    )
    .eq("isActive", true);

  if (error) {
    throw new Error(`Erro Supabase: ${error.message}`);
  }

  return data;
}

/**
 * Buscar configurações de tracking usando Supabase direto
 */
export async function getTrackingConfigs() {
  if (!supabaseClient) {
    throw new Error("Cliente Supabase não disponível");
  }

  const { data, error } = await supabaseClient
    .from("SystemConfig")
    .select("key, value, isActive")
    .eq("category", "tracking")
    .eq("isActive", true);

  if (error) {
    throw new Error(`Erro Supabase: ${error.message}`);
  }

  return data;
}

/**
 * Buscar usuário por email usando Supabase direto
 */
export async function getUserByEmail(email) {
  if (!supabaseClient) {
    throw new Error("Cliente Supabase não disponível");
  }

  const { data, error } = await supabaseClient.from("User").select("*").eq("email", email).single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = not found
    throw new Error(`Erro Supabase: ${error.message}`);
  }

  return data;
}

/**
 * Criar usuário usando Supabase direto
 */
export async function createUser(userData) {
  if (!supabaseClient) {
    throw new Error("Cliente Supabase não disponível");
  }

  const { data, error } = await supabaseClient.from("User").insert(userData).select().single();

  if (error) {
    throw new Error(`Erro Supabase: ${error.message}`);
  }

  return data;
}

/**
 * Buscar estatísticas para admin usando Supabase direto
 */
export async function getAdminStats() {
  if (!supabaseClient) {
    throw new Error("Cliente Supabase não disponível");
  }

  const [usersResult, productsResult, storesResult, ordersResult] = await Promise.all([
    supabaseClient.from("User").select("*", { count: "exact", head: true }),
    supabaseClient.from("Product").select("*", { count: "exact", head: true }).eq("isActive", true),
    supabaseClient.from("Store").select("*", { count: "exact", head: true }).eq("isActive", true),
    supabaseClient.from("Order").select("*", { count: "exact", head: true }),
  ]);

  // Verificar erros
  if (usersResult.error) throw new Error(`Erro users: ${usersResult.error.message}`);
  if (productsResult.error) throw new Error(`Erro products: ${productsResult.error.message}`);
  if (storesResult.error) throw new Error(`Erro stores: ${storesResult.error.message}`);
  if (ordersResult.error) throw new Error(`Erro orders: ${ordersResult.error.message}`);

  return {
    totalUsers: usersResult.count,
    totalProducts: productsResult.count,
    totalStores: storesResult.count,
    totalOrders: ordersResult.count,
  };
}

export { supabaseClient };
export default supabaseClient;
