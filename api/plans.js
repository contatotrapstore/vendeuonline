import { safeQuery } from '../lib/prisma.js';

// Dados mock para fallback - TODOS os 4 planos do projeto
const mockPlans = [
  {
    id: "plan_1",
    name: "Gratuito",
    slug: "gratuito",
    description: "Para começar a vender",
    price: 0,
    billingPeriod: "monthly",
    maxAds: 3,
    maxPhotos: 1,
    support: "email",
    features: [
      "Até 3 anúncios",
      "1 foto por anúncio", 
      "Suporte básico por email",
      "Perfil simples de vendedor"
    ],
    isActive: true,
    order: 1
  },
  {
    id: "plan_2",
    name: "Básico", 
    slug: "basico",
    description: "Ideal para vendedores iniciantes",
    price: 19.90,
    billingPeriod: "monthly",
    maxAds: 10,
    maxPhotos: 5,
    support: "chat",
    features: [
      "Até 10 anúncios",
      "Até 5 fotos por anúncio",
      "Suporte prioritário",
      "Destaque nos resultados",
      "Estatísticas básicas"
    ],
    isActive: true,
    order: 2
  },
  {
    id: "plan_3",
    name: "Profissional", 
    slug: "profissional",
    description: "Para vendedores experientes",
    price: 39.90,
    billingPeriod: "monthly",
    maxAds: 50,
    maxPhotos: 10,
    support: "whatsapp",
    features: [
      "Até 50 anúncios",
      "Até 10 fotos por anúncio", 
      "Suporte prioritário 24/7",
      "Destaque premium",
      "Estatísticas avançadas",
      "Badge de verificado"
    ],
    isActive: true,
    order: 3
  },
  {
    id: "plan_4",
    name: "Empresa",
    slug: "empresa",
    description: "Para grandes vendedores",
    price: 79.90,
    billingPeriod: "monthly",
    maxAds: -1,
    maxPhotos: -1,
    support: "telefone",
    features: [
      "Anúncios ilimitados",
      "Fotos ilimitadas",
      "Suporte dedicado",
      "Destaque máximo",
      "Dashboard completo",
      "API de integração"
    ],
    isActive: true,
    order: 4
  }
];

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
    
    // Tentar buscar do banco usando safeQuery
    const result = await safeQuery(async (prisma) => {
      console.log('🔍 [PLANS] Buscando planos ativos...');
      const plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' }
      });
      
      return plans.map(plan => ({
        ...plan,
        features: JSON.parse(plan.features || '[]')
      }));
    });

    if (result.success) {
      console.log(`✅ [PLANS] Encontrados ${result.data.length} planos do banco`);
      res.status(200).json({
        success: true,
        plans: result.data,
        total: result.data.length,
        source: 'database'
      });
    } else {
      // Fallback para dados mock
      console.warn('⚠️ [PLANS] Banco falhou, usando dados mock:', result.error);
      res.status(200).json({
        success: true,
        plans: mockPlans,
        total: mockPlans.length,
        source: 'mock',
        warning: 'Usando dados de demonstração - banco indisponível'
      });
    }
    
  } catch (error) {
    console.error('❌ [PLANS] Erro geral:', error);
    
    // Último recurso: retornar mock
    res.status(200).json({
      success: true,
      plans: mockPlans,
      total: mockPlans.length,
      source: 'mock',
      warning: 'Usando dados de demonstração - erro interno'
    });
  }
}