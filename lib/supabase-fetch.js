/**
 * 🗃️ SUPABASE FETCH CLIENT - Fallback usando fetch nativo
 *
 * Implementação usando fetch nativo ao invés do cliente Supabase
 * para evitar problemas de importação em ambiente serverless
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔍 [SUPABASE-FETCH] Inicializando...");
console.log("🔍 [SUPABASE-FETCH] URL:", supabaseUrl ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("🔍 [SUPABASE-FETCH] Service Key:", supabaseServiceKey ? "DEFINIDA" : "❌ NÃO DEFINIDA");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ [SUPABASE-FETCH] Variáveis de ambiente não configuradas");
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
}

/**
 * Headers padrão para requisições Supabase
 */
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${supabaseServiceKey}`,
  apikey: supabaseServiceKey,
  Prefer: "return=representation",
};

/**
 * Função helper para fazer requisições ao Supabase REST API
 */
async function supabaseFetch(endpoint, options = {}) {
  const url = `${supabaseUrl}/rest/v1/${endpoint}`;

  console.log(`🌐 [SUPABASE-FETCH] ${options.method || "GET"} ${endpoint}`);

  const response = await fetch(url, {
    headers,
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ [SUPABASE-FETCH] Error ${response.status}:`, error);
    throw new Error(`Supabase API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log(`✅ [SUPABASE-FETCH] Success: ${Array.isArray(data) ? data.length : "single"} record(s)`);
  return data;
}

/**
 * Buscar planos usando fetch direto
 */
export async function getPlans() {
  try {
    return await supabaseFetch("plans?is_active=eq.true&order=order.asc");
  } catch (error) {
    console.error("❌ [PLANS] Erro fetch direto:", error.message);
    throw error;
  }
}

/**
 * Buscar produtos usando fetch direto
 */
export async function getProducts() {
  try {
    return await supabaseFetch("Product?isActive=eq.true&order=createdAt.desc&select=*");
  } catch (error) {
    console.error("❌ [PRODUCTS] Erro fetch direto:", error.message);
    throw error;
  }
}

/**
 * Buscar lojas usando fetch direto
 */
export async function getStores() {
  try {
    return await supabaseFetch("stores?isActive=eq.true&select=*");
  } catch (error) {
    console.error("❌ [STORES] Erro fetch direto:", error.message);
    throw error;
  }
}

/**
 * Buscar configurações de tracking usando fetch direto
 */
export async function getTrackingConfigs() {
  try {
    return await supabaseFetch("system_configs?category=eq.tracking&isActive=eq.true&select=key,value,isActive");
  } catch (error) {
    console.error("❌ [TRACKING] Erro fetch direto:", error.message);
    throw error;
  }
}

/**
 * Buscar usuário por email usando fetch direto
 */
export async function getUserByEmail(email) {
  try {
    const result = await supabaseFetch(`User?email=eq.${encodeURIComponent(email)}`);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("❌ [USER] Erro fetch direto:", error.message);
    throw error;
  }
}

/**
 * Criar usuário usando fetch direto
 */
export async function createUser(userData) {
  try {
    const result = await supabaseFetch("User", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error("❌ [CREATE USER] Erro fetch direto:", error.message);
    throw error;
  }
}

/**
 * Buscar estatísticas para admin usando fetch direto
 */
export async function getAdminStats() {
  try {
    const [users, products, stores, orders] = await Promise.all([
      supabaseFetch("User?select=id"),
      supabaseFetch("Product?isActive=eq.true&select=id"),
      supabaseFetch("stores?isActive=eq.true&select=id"),
      supabaseFetch("Order?select=id"),
    ]);

    return {
      totalUsers: users.length,
      totalProducts: products.length,
      totalStores: stores.length,
      totalOrders: orders.length,
    };
  } catch (error) {
    console.error("❌ [ADMIN STATS] Erro fetch direto:", error.message);
    throw error;
  }
}

console.log("✅ [SUPABASE-FETCH] Inicializado com sucesso");

export default {
  getPlans,
  getProducts,
  getStores,
  getTrackingConfigs,
  getUserByEmail,
  createUser,
  getAdminStats,
};
