import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

// URL e Keys do Supabase (aceita NEXT_PUBLIC_* ou VITE_PUBLIC_*)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const missingSupabaseEnv = [];

if (!supabaseUrl) {
  console.error("[WARN] NEXT_PUBLIC_SUPABASE_URL or VITE_PUBLIC_SUPABASE_URL is not defined");
  missingSupabaseEnv.push("NEXT_PUBLIC_SUPABASE_URL / VITE_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  console.error("[WARN] NEXT_PUBLIC_SUPABASE_ANON_KEY or VITE_PUBLIC_SUPABASE_ANON_KEY is not defined");
  missingSupabaseEnv.push("NEXT_PUBLIC_SUPABASE_ANON_KEY / VITE_PUBLIC_SUPABASE_ANON_KEY");
}
if (!supabaseServiceKey) {
  console.error("[WARN] SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY is not defined");
  missingSupabaseEnv.push("SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_SERVICE_ROLE_KEY");
}

if (missingSupabaseEnv.length > 0) {
  console.error("[ERROR] Missing Supabase credentials");
  console.error("Define the following variables in your .env file:");
  missingSupabaseEnv.forEach((envVar) => console.error(`- ${envVar}`));
  process.exit(1); // Stop the app if credentials are missing
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
      supabase.from("products").select("*", { count: "exact", head: true }),
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
