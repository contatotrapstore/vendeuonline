/**
 * 🔓 SUPABASE ANON CLIENT - Tentativa com chave anônima
 *
 * Teste usando ANON_KEY ao invés de SERVICE_ROLE_KEY
 * para verificar se o problema é de permissões RLS
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log("🔓 [SUPABASE-ANON] Inicializando com chave anônima...");
console.log("🔓 [SUPABASE-ANON] URL:", supabaseUrl ? "DEFINIDA" : "❌ NÃO DEFINIDA");
console.log("🔓 [SUPABASE-ANON] Anon Key:", supabaseAnonKey ? "DEFINIDA" : "❌ NÃO DEFINIDA");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ [SUPABASE-ANON] Variáveis de ambiente não configuradas");
  throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios");
}

/**
 * Headers para requisições com chave anônima
 */
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${supabaseAnonKey}`,
  apikey: supabaseAnonKey,
  Prefer: "return=representation",
};

/**
 * Função helper para fazer requisições com chave anônima
 */
async function supabaseAnonFetch(endpoint, options = {}) {
  const url = `${supabaseUrl}/rest/v1/${endpoint}`;

  console.log(`🔓 [SUPABASE-ANON] ${options.method || "GET"} ${endpoint}`);

  const response = await fetch(url, {
    headers,
    ...options,
  });

  const responseText = await response.text();
  console.log(`🔓 [SUPABASE-ANON] Response ${response.status}:`, responseText);

  if (!response.ok) {
    console.error(`❌ [SUPABASE-ANON] Error ${response.status}:`, responseText);
    throw new Error(`Supabase API Error (ANON): ${response.status} - ${responseText}`);
  }

  try {
    const data = JSON.parse(responseText);
    console.log(`✅ [SUPABASE-ANON] Success: ${Array.isArray(data) ? data.length : "single"} record(s)`);
    return data;
  } catch (parseError) {
    console.error("❌ [SUPABASE-ANON] JSON Parse Error:", parseError);
    throw new Error(`JSON Parse Error: ${parseError.message}`);
  }
}

/**
 * Buscar planos usando chave anônima
 */
export async function getPlansAnon() {
  try {
    return await supabaseAnonFetch("Plan?isActive=eq.true&order=order.asc");
  } catch (error) {
    console.error("❌ [PLANS-ANON] Erro:", error.message);
    throw error;
  }
}

/**
 * Buscar produtos usando chave anônima
 */
export async function getProductsAnon() {
  try {
    return await supabaseAnonFetch(
      "Product?isActive=eq.true&order=createdAt.desc&select=*,images:ProductImage(*),store:Store(*,seller:Seller(*,user:User(*)))"
    );
  } catch (error) {
    console.error("❌ [PRODUCTS-ANON] Erro:", error.message);
    throw error;
  }
}

/**
 * Buscar lojas usando chave anônima
 */
export async function getStoresAnon() {
  try {
    return await supabaseAnonFetch("Store?isActive=eq.true&select=*,seller:Seller(*,user:User(*))");
  } catch (error) {
    console.error("❌ [STORES-ANON] Erro:", error.message);
    throw error;
  }
}

/**
 * Buscar configurações de tracking usando chave anônima
 */
export async function getTrackingConfigsAnon() {
  try {
    return await supabaseAnonFetch("SystemConfig?category=eq.tracking&isActive=eq.true&select=key,value,isActive");
  } catch (error) {
    console.error("❌ [TRACKING-ANON] Erro:", error.message);
    throw error;
  }
}

console.log("✅ [SUPABASE-ANON] Inicializado com sucesso");

export default {
  getPlansAnon,
  getProductsAnon,
  getStoresAnon,
  getTrackingConfigsAnon,
};
