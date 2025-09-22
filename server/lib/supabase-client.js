import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

// Validar variáveis de ambiente obrigatórias
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("⚠️ NEXT_PUBLIC_SUPABASE_URL não está configurada no ambiente");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY não está configurada no ambiente");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("⚠️ SUPABASE_SERVICE_ROLE_KEY não está configurada no ambiente");
}

// URL e Keys do Supabase (somente de variáveis de ambiente)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validar se as credenciais foram carregadas
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("❌ ERRO CRÍTICO: Credenciais do Supabase não configuradas!");
  console.error("Configure as seguintes variáveis no arquivo .env:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1); // Encerrar aplicação se credenciais não estiverem configuradas
}

// Cliente normal (para operações gerais)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Cliente admin (para uploads e operações administrativas)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
  },
});

console.log("✅ Cliente Supabase inicializado com variáveis de ambiente");

// Função para testar a conexão
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("stores").select("id").limit(1);

    if (error) {
      console.error("❌ Erro de conexão:", error.message);
      return false;
    }

    console.log("✅ Conexão com Supabase funcionando!");
    return true;
  } catch (error) {
    console.error("❌ Erro no cliente Supabase:", error.message);
    return false;
  }
}

// Função para obter estatísticas do banco
export async function getDatabaseStats() {
  try {
    const [usersResult, storesResult, productsResult] = await Promise.allSettled([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("stores").select("*", { count: "exact", head: true }),
      supabase.from("Product").select("*", { count: "exact", head: true }),
    ]);

    return {
      users: usersResult.status === "fulfilled" ? usersResult.value.count : 0,
      stores: storesResult.status === "fulfilled" ? storesResult.value.count : 0,
      products: productsResult.status === "fulfilled" ? productsResult.value.count : 0,
    };
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    return { users: 0, stores: 0, products: 0 };
  }
}

export default supabase;
