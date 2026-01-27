import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger.js";


const prisma = new PrismaClient();

async function main() {
  logger.info("🌱 Iniciando seed do banco de dados...");

  // Limpar dados existentes na ordem correta (dependências primeiro)
  await prisma.seller.deleteMany({});
  await prisma.buyer.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.store.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.category.deleteMany({});

  logger.info("🗑️  Dados existentes removidos");

  // Seed de Planos
  const plans = [
    {
      name: "Gratuito",
      slug: "gratuito",
      description: "Plano básico para começar a vender",
      price: 0,
      billingPeriod: "monthly",
      maxAds: 5,
      maxPhotos: 3,
      maxProducts: 5,
      maxImages: 3,
      maxCategories: 2,
      prioritySupport: false,
      support: "Community",
      features: JSON.stringify(["5 anúncios ativos", "3 fotos por produto", "Suporte por comunidade", "Painel básico"]),
      isActive: true,
      order: 1,
    },
    {
      name: "Básico",
      slug: "basico",
      description: "Para vendedores iniciantes com mais recursos",
      price: 19.9,
      billingPeriod: "monthly",
      maxAds: 25,
      maxPhotos: 5,
      maxProducts: 25,
      maxImages: 5,
      maxCategories: 5,
      prioritySupport: false,
      support: "Email",
      features: JSON.stringify([
        "25 anúncios ativos",
        "5 fotos por produto",
        "Suporte por email",
        "Relatórios básicos",
        "Destacar produtos",
      ]),
      isActive: true,
      order: 2,
    },
    {
      name: "Profissional",
      slug: "profissional",
      description: "Para vendedores sérios que querem crescer",
      price: 39.9,
      billingPeriod: "monthly",
      maxAds: 100,
      maxPhotos: 10,
      maxProducts: 100,
      maxImages: 10,
      maxCategories: -1,
      prioritySupport: false,
      support: "Email + Chat",
      features: JSON.stringify([
        "100 anúncios ativos",
        "10 fotos por produto",
        "Suporte por email e chat",
        "Relatórios avançados",
        "Destacar produtos",
        "Análise de performance",
        "Categorias ilimitadas",
      ]),
      isActive: true,
      order: 3,
    },
    {
      name: "Empresa",
      slug: "empresa",
      description: "Para grandes vendedores e lojas estabelecidas",
      price: 79.9,
      billingPeriod: "monthly",
      maxAds: 500,
      maxPhotos: 15,
      maxProducts: 500,
      maxImages: 15,
      maxCategories: -1,
      prioritySupport: true,
      support: "Priority Support",
      features: JSON.stringify([
        "500 anúncios ativos",
        "15 fotos por produto",
        "Suporte prioritário",
        "Relatórios completos",
        "Destacar produtos",
        "Análise avançada",
        "Integrações API",
        "Gerente de conta",
      ]),
      isActive: true,
      order: 4,
    },
    {
      name: "Empresa Plus",
      slug: "empresa-plus",
      description: "Para empresas com volume alto de vendas",
      price: 199.9,
      billingPeriod: "monthly",
      maxAds: -1,
      maxPhotos: -1,
      maxProducts: -1,
      maxImages: -1,
      maxCategories: -1,
      prioritySupport: true,
      support: "Dedicated Support",
      features: JSON.stringify([
        "Anúncios ilimitados",
        "Fotos ilimitadas",
        "Suporte dedicado",
        "Relatórios personalizados",
        "API completa",
        "Integrações avançadas",
        "Consultoria especializada",
        "SLA garantido",
      ]),
      isActive: true,
      order: 5,
    },
  ];

  logger.info("📋 Criando planos...");
  const createdPlans = [];
  for (const plan of plans) {
    const created = await prisma.plan.create({
      data: plan,
    });
    createdPlans.push(created);
    logger.info(`✅ Plano "${created.name}" criado`);
  }

  // Seed de Categorias
  const categories = [
    {
      name: "Eletrônicos",
      slug: "eletronicos",
      description: "Celulares, computadores, TVs e mais",
      isActive: true,
      order: 1,
    },
    { name: "Moda", slug: "moda", description: "Roupas, sapatos e acessórios", isActive: true, order: 2 },
    {
      name: "Casa e Jardim",
      slug: "casa-jardim",
      description: "Móveis, decoração e utensílios",
      isActive: true,
      order: 3,
    },
    { name: "Veículos", slug: "veiculos", description: "Carros, motos e peças", isActive: true, order: 4 },
    { name: "Esportes", slug: "esportes", description: "Equipamentos esportivos e lazer", isActive: true, order: 5 },
    {
      name: "Bebês e Crianças",
      slug: "bebes-criancas",
      description: "Produtos infantis e brinquedos",
      isActive: true,
      order: 6,
    },
    {
      name: "Livros",
      slug: "livros",
      description: "Livros, revistas e materiais educativos",
      isActive: true,
      order: 7,
    },
    { name: "Imóveis", slug: "imoveis", description: "Casas, apartamentos e terrenos", isActive: true, order: 8 },
    { name: "Serviços", slug: "servicos", description: "Prestação de serviços diversos", isActive: true, order: 9 },
    { name: "Outros", slug: "outros", description: "Produtos diversos", isActive: true, order: 10 },
  ];

  logger.info("📂 Criando categorias...");
  for (const category of categories) {
    const created = await prisma.category.create({
      data: category,
    });
    logger.info(`✅ Categoria "${created.name}" criada`);
  }

  // Admin do sistema
  const adminPassword = "Admin123!@#";
  const adminHashedPassword = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.create({
    data: {
      name: "Administrador do Sistema",
      email: "admin@vendeuonline.com",
      password: adminHashedPassword,
      phone: "(54) 99999-0000",
      type: "ADMIN",
      city: "Erechim",
      state: "RS",
      isVerified: true,
      isActive: true,
    },
  });

  await prisma.admin.create({
    data: {
      userId: adminUser.id,
      permissions: JSON.stringify(["all"]),
    },
  });

  logger.info(`✅ Admin "${adminUser.name}" criado`);

  logger.info("");
  logger.info("⚡ CREDENCIAIS DO ADMINISTRADOR:");
  logger.info(`📧 Email: admin@vendeuonline.com`);
  logger.info(`🔑 Senha: ${adminPassword}`);
  logger.info("");
  logger.info("✨ Seed concluído com sucesso!");
  logger.info("📋 Criados:");
  logger.info("  - 5 Planos de assinatura");
  logger.info("  - 10 Categorias");
  logger.info("  - 1 Admin (admin@vendeuonline.com)");
}

main()
  .catch((e) => {
    logger.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
