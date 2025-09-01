// Função serverless simples para testar variáveis de ambiente
export default function handler(req, res) {
  try {
    console.log('🔍 [TEST] Testando variáveis de ambiente no Vercel...');
    
    // Verificar variáveis críticas
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? 'DEFINIDA' : '❌ NÃO DEFINIDA',
      JWT_SECRET: process.env.JWT_SECRET ? 'DEFINIDA' : '❌ NÃO DEFINIDA',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'DEFINIDA' : '❌ NÃO DEFINIDA',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'DEFINIDA' : '❌ NÃO DEFINIDA',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINIDA' : '❌ NÃO DEFINIDA',
      
      // Verificar também as versões VITE_
      VITE_PUBLIC_SUPABASE_URL: process.env.VITE_PUBLIC_SUPABASE_URL ? 'DEFINIDA' : '❌ NÃO DEFINIDA',
      VITE_PUBLIC_SUPABASE_ANON_KEY: process.env.VITE_PUBLIC_SUPABASE_ANON_KEY ? 'DEFINIDA' : '❌ NÃO DEFINIDA',
      VITE_SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'DEFINIDA' : '❌ NÃO DEFINIDA'
    };
    
    // Log no servidor
    console.log('Variáveis de ambiente:', envVars);
    
    // Resposta JSON
    res.status(200).json({
      success: true,
      message: 'Teste de variáveis de ambiente',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      variables: envVars
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}