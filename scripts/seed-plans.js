// Script para popular banco com os 4 planos corretos
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  {
    id: "plan_1",
    name: "Gratuito",
    slug: "gratuito",
    description: "Para começar a vender",
    price: 0,
    billingPeriod: "monthly",
    maxAds: 3,
    maxPhotos: 1,
    maxProducts: 3,
    maxImages: 1,
    maxCategories: 1,
    prioritySupport: false,
    support: "email",
    features: JSON.stringify([
      "Até 3 anúncios",
      "1 foto por anúncio",
      "Suporte básico por email",
      "Perfil simples de vendedor",
    ]),
    isActive: true,
    order: 1,
  },
  {
    id: "plan_2",
    name: "Básico",
    slug: "basico",
    description: "Ideal para vendedores iniciantes",
    price: 19.9,
    billingPeriod: "monthly",
    maxAds: 10,
    maxPhotos: 5,
    maxProducts: 10,
    maxImages: 5,
    maxCategories: 3,
    prioritySupport: false,
    support: "chat",
    features: JSON.stringify([
      "Até 10 anúncios",
      "Até 5 fotos por anúncio",
      "Suporte prioritário",
      "Destaque nos resultados",
      "Estatísticas básicas",
    ]),
    isActive: true,
    order: 2,
  },
  {
    id: "plan_3",
    name: "Profissional",
    slug: "profissional",
    description: "Para vendedores experientes",
    price: 39.9,
    billingPeriod: "monthly",
    maxAds: 50,
    maxPhotos: 10,
    maxProducts: 50,
    maxImages: 10,
    maxCategories: 10,
    prioritySupport: true,
    support: "whatsapp",
    features: JSON.stringify([
      "Até 50 anúncios",
      "Até 10 fotos por anúncio",
      "Suporte prioritário 24/7",
      "Destaque premium",
      "Estatísticas avançadas",
      "Badge de verificado",
    ]),
    isActive: true,
    order: 3,
  },
  {
    id: "plan_4",
    name: "Empresa",
    slug: "empresa",
    description: "Para grandes vendedores",
    price: 79.9,
    billingPeriod: "monthly",
    maxAds: -1,
    maxPhotos: -1,
    maxProducts: -1,
    maxImages: -1,
    maxCategories: -1,
    prioritySupport: true,
    support: "telefone",
    features: JSON.stringify([
      "Anúncios ilimitados",
      "Fotos ilimitadas",
      "Suporte dedicado",
      "Destaque máximo",
      "Dashboard completo",
      "API de integração",
    ]),
    isActive: true,
    order: 4,
  },
];

async function seedPlans() {
  try {
    console.log("🌱 Iniciando seed dos planos...");

    // Limpar planos existentes
    await prisma.plan.deleteMany();
    console.log("✅ Planos existentes removidos");

    // Inserir novos planos
    for (const plan of plans) {
      await prisma.plan.create({
        data: plan,
      });
      console.log(`✅ Plano criado: ${plan.name} - R$ ${plan.price}`);
    }

    console.log(`🎉 Seed concluído! ${plans.length} planos criados com sucesso.`);
  } catch (error) {
    console.error("❌ Erro no seed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPlans();
