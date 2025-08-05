import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    name: 'Gratuito',
    slug: 'gratuito',
    description: 'Para usuários iniciantes',
    price: 0,
    billingPeriod: 'LIFETIME' as const,
    maxAds: 1,
    maxPhotosPerAd: 5,
    maxHighlightsPerDay: 0,
    supportLevel: 'EMAIL' as const,
    features: [
      '1 anúncio a cada 60 dias',
      'Duração de 30 dias',
      'Até 5 fotos por anúncio',
      'Anúncio extra por R$ 4,90',
      'Destaque extra por R$ 9,90 cada',
      'Suporte por email',
      'Compartilhamento em redes sociais',
      'Estatísticas básicas',
      'Verificação do perfil',
      'Atendimento prioritário'
    ],
    isActive: true,
    order: 1
  },
  {
    name: 'Micro-Empresa',
    slug: 'micro-empresa',
    description: 'Para microempreendedores',
    price: 24.90,
    billingPeriod: 'MONTHLY' as const,
    maxAds: 2,
    maxPhotosPerAd: 6,
    maxHighlightsPerDay: 1,
    supportLevel: 'EMAIL' as const,
    features: [
      '2 anúncios simultâneos',
      'Duração de 30 dias',
      'Até 6 fotos por anúncio',
      '1 destaque por dia',
      'Anúncio extra por R$ 14,90',
      'Destaque extra por R$ 4,90',
      'Estatísticas básicas',
      'Suporte por email',
      'Verificação do perfil',
      'Atendimento prioritário'
    ],
    isActive: true,
    order: 2
  },
  {
    name: 'Pequena Empresa',
    slug: 'pequena-empresa',
    description: 'Para pequenos negócios',
    price: 49.90,
    billingPeriod: 'MONTHLY' as const,
    maxAds: 5,
    maxPhotosPerAd: 10,
    maxHighlightsPerDay: 4,
    supportLevel: 'CHAT' as const,
    features: [
      '5 anúncios simultâneos',
      'Duração de 30 dias',
      'Até 10 fotos por anúncio',
      '4 destaques por dia',
      'Anúncio extra por R$ 14,90',
      'Destaque extra por R$ 4,90',
      'Estatísticas detalhadas',
      'Atendimento prioritário',
      'Verificação do perfil',
      'Logo na página de anúncios'
    ],
    isActive: true,
    order: 3
  },
  {
    name: 'Empresa Simples',
    slug: 'empresa-simples',
    description: 'Para empresas em crescimento',
    price: 99.90,
    billingPeriod: 'MONTHLY' as const,
    maxAds: 10,
    maxPhotosPerAd: 15,
    maxHighlightsPerDay: 4,
    supportLevel: 'CHAT' as const,
    features: [
      '10 anúncios simultâneos',
      'Duração de 30 dias',
      'Até 15 fotos por anúncio',
      '4 destaques por dia',
      'Anúncio extra por R$ 14,90',
      'Destaque extra por R$ 4,90',
      'Estatísticas avançadas',
      'Atendimento prioritário',
      'Verificação do perfil',
      'Perfil de loja personalizado'
    ],
    isActive: true,
    order: 4
  },
  {
    name: 'Empresa Plus',
    slug: 'empresa-plus',
    description: 'Para grandes negócios',
    price: 149.90,
    billingPeriod: 'MONTHLY' as const,
    maxAds: 20,
    maxPhotosPerAd: 20,
    maxHighlightsPerDay: 8,
    supportLevel: 'PRIORITY' as const,
    features: [
      '20 anúncios simultâneos',
      'Duração de 30 dias',
      'Até 20 fotos por anúncio',
      '8 destaques por dia',
      'Anúncio extra por R$ 14,90',
      'Destaque extra por R$ 4,90',
      'Estatísticas premium',
      'Suporte dedicado',
      'Verificação do perfil',
      'Perfil de loja personalizado'
    ],
    isActive: true,
    order: 5
  }
];

async function seedPlans() {
  try {
    console.log('🌱 Iniciando seed dos planos...');

    // Limpar planos existentes
    await prisma.plan.deleteMany({});
    console.log('🗑️ Planos existentes removidos');

    // Criar novos planos
    for (const plan of plans) {
      await prisma.plan.create({
        data: plan
      });
      console.log(`✅ Plano "${plan.name}" criado`);
    }

    console.log('🎉 Seed dos planos concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao fazer seed dos planos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o seed diretamente
seedPlans()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

export { seedPlans };