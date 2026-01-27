import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { logger } from "../lib/logger.js";

// Carregar variáveis de ambiente
dotenv.config();

// URL e Keys do Supabase - URLs públicas podem usar NEXT_PUBLIC_* ou VITE_PUBLIC_*
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// 🚨 IMPORTANTE: Service Role Key deve ficar APENAS no backend
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 🔍 DEBUG: Log configuração do Supabase (APENAS EM DESENVOLVIMENTO)
if (process.env.NODE_ENV === "development" || process.env.DEBUG_SUPABASE === "true") {
  logger.info("🔍 [DEBUG] Configuração Supabase:");
  logger.info(`  - SUPABASE_URL: ${supabaseUrl ? "✅ Configurada" : "❌ Não configurada"}`);
  logger.info(`  - SUPABASE_ANON_KEY: ${supabaseAnonKey ? "✅ Configurada" : "❌ Não configurada"}`);
  logger.info(`  - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? "✅ Configurada" : "❌ Não configurada"}`);
  logger.info(`  - DATABASE_URL: ${process.env.DATABASE_URL ? "✅ Configurada" : "❌ Não configurada"}`);

  if (supabaseUrl) logger.info(`  - URL: ${supabaseUrl}`);
  if (process.env.DATABASE_URL) {
    // Mascarar senha no log
    const dbUrl = process.env.DATABASE_URL.replace(/:[^@]+@/, ":***@");
    logger.info(`  - DB: ${dbUrl}`);
  }
}

const missingSupabaseEnv = [];

if (!supabaseUrl) {
  logger.error("[WARN] NEXT_PUBLIC_SUPABASE_URL or VITE_PUBLIC_SUPABASE_URL is not defined");
  missingSupabaseEnv.push("NEXT_PUBLIC_SUPABASE_URL / VITE_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  logger.error("[WARN] NEXT_PUBLIC_SUPABASE_ANON_KEY or VITE_PUBLIC_SUPABASE_ANON_KEY is not defined");
  missingSupabaseEnv.push("NEXT_PUBLIC_SUPABASE_ANON_KEY / VITE_PUBLIC_SUPABASE_ANON_KEY");
}
if (!supabaseServiceKey) {
  logger.error("[WARN] SUPABASE_SERVICE_ROLE_KEY is not defined");
  missingSupabaseEnv.push("SUPABASE_SERVICE_ROLE_KEY");
}

if (missingSupabaseEnv.length > 0) {
  logger.error("⚠️ [WARNING] Missing Supabase credentials - some features may not work:");
  missingSupabaseEnv.forEach((envVar) => logger.error(`  - ${envVar}`));
  logger.error("💡 Define these variables in Render.com Environment Variables");
  logger.warn("⚠️ Server will start but Supabase features will fail until variables are configured");
  // DON'T exit - let server start so we can see health check
}

// Cliente normal (para operações gerais)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Cliente admin (para uploads e operações administrativas)
// ⚠️ IMPORTANTE: Service Role Key bypassa RLS (Row Level Security) - não logar valor em produção
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
});

logger.info("✅ Cliente Supabase inicializado");

// Função para testar a conexão
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("stores").select("id").limit(1);

    if (error) {
      logger.error("❌ Erro de conexão:", error.message);
      return false;
    }

    logger.info("✅ Conexão com Supabase funcionando!");
    return true;
  } catch (error) {
    logger.error("❌ Erro no cliente Supabase:", error.message);
    return false;
  }
}

// Função para obter estatísticas do banco
export async function getDatabaseStats() {
  try {
    const [usersResult, storesResult, productsResult] = await Promise.allSettled([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("stores").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
    ]);

    return {
      users: usersResult.status === "fulfilled" ? usersResult.value.count : 0,
      stores: storesResult.status === "fulfilled" ? storesResult.value.count : 0,
      products: productsResult.status === "fulfilled" ? productsResult.value.count : 0,
    };
  } catch (error) {
    logger.error("Erro ao obter estatísticas:", error);
    return { users: 0, stores: 0, products: 0 };
  }
}

// Funções para buscar dados públicos (usando anon key)
export async function getPlansAnon() {
  try {
    const { data, error } = await supabase
      .from("Plan")
      .select("*")
      .eq("isActive", true)
      .order("order", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error("Erro ao buscar planos:", error);
    throw error;
  }
}

export async function getProductsAnon() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        images:product_images(url, order),
        store:stores(id, name)
      `
      )
      .eq("isActive", true)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error("Erro ao buscar produtos:", error);
    throw error;
  }
}

export async function getStoresAnon() {
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("isActive", true)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error("Erro ao buscar lojas:", error);
    throw error;
  }
}

// Funções para Admin (usando service role key)
export async function getAdminStatsSupabase() {
  try {
    const [usersResult, productsResult, storesResult, ordersResult] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }).eq("isActive", true),
      supabaseAdmin.from("stores").select("*", { count: "exact", head: true }).eq("isActive", true),
      supabaseAdmin.from("Order").select("*", { count: "exact", head: true }),
    ]);

    return {
      totalUsers: usersResult.count || 0,
      totalProducts: productsResult.count || 0,
      totalStores: storesResult.count || 0,
      totalOrders: ordersResult.count || 0,
    };
  } catch (error) {
    logger.error("Erro ao buscar estatísticas admin:", error);
    throw error;
  }
}

// Funções para Orders
export async function getOrdersByUserSupabase(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("Order")
      .select(
        `
        *,
        items:OrderItem(*),
        user:users(id, name, email)
      `
      )
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error("Erro ao buscar pedidos do usuário:", error);
    throw error;
  }
}

export async function getOrderByIdSupabase(orderId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("Order")
      .select(
        `
        *,
        items:OrderItem(*),
        user:users(id, name, email)
      `
      )
      .eq("id", orderId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Erro ao buscar pedido:", error);
    throw error;
  }
}

export async function createOrderSupabase(orderData) {
  try {
    const { data, error } = await supabaseAdmin.from("Order").insert(orderData).select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Erro ao criar pedido:", error);
    throw error;
  }
}

export async function updateOrderStatusSupabase(orderId, status) {
  try {
    const { data, error } = await supabaseAdmin
      .from("Order")
      .update({ status, updatedAt: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error("Erro ao atualizar status do pedido:", error);
    throw error;
  }
}

// Funções para Seller Analytics
export async function getSellerStatsSupabase(sellerId) {
  try {
    // Buscar produtos do seller
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("sellerId", sellerId);

    if (productsError) throw productsError;

    const productIds = products.map((p) => p.id);

    // Se não tem produtos, retornar stats zeradas
    if (productIds.length === 0) {
      return {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalViews: 0,
      };
    }

    // Buscar pedidos dos produtos do seller
    const { data: orderItems, error: ordersError } = await supabaseAdmin
      .from("OrderItem")
      .select("quantity, price, orderId")
      .in("productId", productIds);

    if (ordersError) throw ordersError;

    // Calcular stats
    const totalProducts = products.length;
    const uniqueOrders = new Set(orderItems.map((item) => item.orderId)).size;
    const totalRevenue = orderItems.reduce((sum, item) => sum + item.quantity * parseFloat(item.price), 0);

    return {
      totalProducts,
      totalOrders: uniqueOrders,
      totalRevenue,
      totalViews: 0, // Views precisam ser implementadas separadamente
    };
  } catch (error) {
    logger.error("Erro ao buscar estatísticas do seller:", error);
    throw error;
  }
}

export default supabase;
