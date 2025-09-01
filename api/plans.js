import { PrismaClient } from '@prisma/client';

// Função serverless específica para planos
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 [PLANS] Iniciando busca de planos...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    const prisma = new PrismaClient();
    
    console.log('🔍 [PLANS] Conectando ao banco...');
    await prisma.$connect();
    
    console.log('🔍 [PLANS] Buscando planos ativos...');
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });
    
    console.log(`🔍 [PLANS] Encontrados ${plans.length} planos`);
    
    const formattedPlans = plans.map(plan => ({
      ...plan,
      features: JSON.parse(plan.features || '[]')
    }));
    
    await prisma.$disconnect();
    
    res.status(200).json({
      success: true,
      plans: formattedPlans,
      total: plans.length
    });
    
  } catch (error) {
    console.error('❌ [PLANS] Erro detalhado:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}