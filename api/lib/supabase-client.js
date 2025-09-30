/**
 * 🗃️ SUPABASE CLIENT - Versão adaptada para Vercel Serverless
 *
 * Cliente Supabase com fallbacks e funções auxiliares
 * Versão adaptada do server/lib/supabase-client.js para ambiente serverless
 */

import { createClient } from "@supabase/supabase-js";

// Helper para tentar múltiplos formatos de variáveis
const getEnvVar = (varName) => {
  return process.env[`NEXT_PUBLIC_${varName}`] || process.env[`VITE_${varName}`] || process.env[varName];
};

// URL e Keys do Supabase
const supabaseUrl = getEnvVar("SUPABASE_URL");
const supabaseAnonKey = getEnvVar("SUPABASE_ANON_KEY");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validação de variáveis (sem process.exit para não matar serverless)
const missingVars = [];
if (!supabaseUrl) missingVars.push("SUPABASE_URL");
if (!supabaseAnonKey) missingVars.push("SUPABASE_ANON_KEY");
if (!supabaseServiceKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");

if (missingVars.length > 0) {
  console.error("❌ [SUPABASE-CLIENT] Variáveis faltando:", missingVars.join(", "));
  console.error("⚠️ [SUPABASE-CLIENT] Configure no Vercel Dashboard > Environment Variables");
}

// Cliente normal (anon key)
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

// Cliente admin (service role)
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

/**
 * Buscar planos usando anon key
 */
export async function getPlansAnon() {
  if (!supabase) {
    throw new Error("Supabase client não inicializado - verifique variáveis de ambiente");
  }

  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar planos: ${error.message}`);
  }

  return data || [];
}

/**
 * Buscar produtos usando anon key
 */
export async function getProductsAnon() {
  if (!supabase) {
    throw new Error("Supabase client não inicializado - verifique variáveis de ambiente");
  }

  const { data, error } = await supabase
    .from("Product")
    .select(
      `
      *,
      images:ProductImage(*),
      store:stores(
        *,
        seller:sellers(
          *,
          user:users(*)
        )
      )
    `
    )
    .eq("isActive", true)
    .order("createdAt", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar produtos: ${error.message}`);
  }

  return data || [];
}

/**
 * Buscar lojas usando anon key
 */
export async function getStoresAnon() {
  if (!supabase) {
    throw new Error("Supabase client não inicializado - verifique variáveis de ambiente");
  }

  const { data, error } = await supabase
    .from("stores")
    .select(
      `
      *,
      seller:sellers(
        *,
        user:users(*)
      )
    `
    )
    .eq("isActive", true);

  if (error) {
    throw new Error(`Erro ao buscar lojas: ${error.message}`);
  }

  return data || [];
}

/**
 * Buscar estatísticas para admin
 */
export async function getAdminStatsSupabase() {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client não inicializado - verifique SUPABASE_SERVICE_ROLE_KEY");
  }

  try {
    const [usersResult, productsResult, storesResult, ordersResult] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("Product").select("*", { count: "exact", head: true }).eq("isActive", true),
      supabaseAdmin.from("stores").select("*", { count: "exact", head: true }).eq("isActive", true),
      supabaseAdmin.from("Order").select("*", { count: "exact", head: true }),
    ]);

    // Verificar erros
    if (usersResult.error) throw new Error(`Erro users: ${usersResult.error.message}`);
    if (productsResult.error) throw new Error(`Erro products: ${productsResult.error.message}`);
    if (storesResult.error) throw new Error(`Erro stores: ${storesResult.error.message}`);
    if (ordersResult.error) throw new Error(`Erro orders: ${ordersResult.error.message}`);

    return {
      totalUsers: usersResult.count || 0,
      totalProducts: productsResult.count || 0,
      totalStores: storesResult.count || 0,
      totalOrders: ordersResult.count || 0,
    };
  } catch (error) {
    console.error("❌ [ADMIN STATS] Erro:", error.message);
    throw error;
  }
}

/**
 * Buscar configurações de tracking
 */
export async function getTrackingConfigsAnon() {
  if (!supabase) {
    throw new Error("Supabase client não inicializado - verifique variáveis de ambiente");
  }

  const { data, error } = await supabase
    .from("system_configs")
    .select("key, value, isActive")
    .eq("category", "tracking")
    .eq("isActive", true);

  if (error) {
    throw new Error(`Erro ao buscar tracking configs: ${error.message}`);
  }

  return data || [];
}

console.log("✅ [SUPABASE-CLIENT] Inicializado para serverless");

export default {
  supabase,
  supabaseAdmin,
  getPlansAnon,
  getProductsAnon,
  getStoresAnon,
  getAdminStatsSupabase,
  getTrackingConfigsAnon,
};
