import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// URL e Keys do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dycsfnbqgojhttnjbndp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ';
// Service role key está inválida, usar anon key para fallback até obter nova service role key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Y3NmbmJxZ29qaHR0bmpibmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDg2NTYsImV4cCI6MjA2OTMyNDY1Nn0.eLO91-DAAWWP-5g3MG19s6lDtFhrfOu3qk-TTlbrtbQ';

// Cliente normal (para operações gerais)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente admin (para uploads e operações administrativas)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Cliente Supabase inicializado com credenciais hardcoded');

// Função para testar a conexão
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro de conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão com Supabase funcionando!');
    return true;
  } catch (error) {
    console.error('❌ Erro no cliente Supabase:', error.message);
    return false;
  }
}

// Função para obter estatísticas do banco
export async function getDatabaseStats() {
  try {
    const [usersResult, storesResult, productsResult] = await Promise.allSettled([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('stores').select('*', { count: 'exact', head: true }),
      supabase.from('Product').select('*', { count: 'exact', head: true })
    ]);

    return {
      users: usersResult.status === 'fulfilled' ? usersResult.value.count : 0,
      stores: storesResult.status === 'fulfilled' ? storesResult.value.count : 0,
      products: productsResult.status === 'fulfilled' ? productsResult.value.count : 0
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return { users: 0, stores: 0, products: 0 };
  }
}

export default supabase;