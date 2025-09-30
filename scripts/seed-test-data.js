/**
 * Script para popular banco de dados com dados de teste
 * Usa Supabase REST API diretamente
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/['"]/g, "");
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/['"]/g, "");

console.log("🔍 Verificando variáveis:");
console.log("- SUPABASE_URL:", supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : "❌ NÃO DEFINIDA");
console.log("- SERVICE_KEY:", supabaseServiceKey ? `${supabaseServiceKey.slice(0, 30)}...` : "❌ NÃO DEFINIDA");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedCategories() {
  console.log("\n📁 Criando categorias...");

  const categories = [
    {
      name: "Eletrônicos",
      slug: "eletronicos",
      description: "Smartphones, computadores, tablets e acessórios tecnológicos",
      order: 1,
    },
    {
      name: "Moda e Vestuário",
      slug: "moda-vestuario",
      description: "Roupas, calçados e acessórios para todas as idades",
      order: 2,
    },
    {
      name: "Casa e Decoração",
      slug: "casa-decoracao",
      description: "Móveis, decoração e utensílios domésticos",
      order: 3,
    },
    {
      name: "Esportes e Lazer",
      slug: "esportes-lazer",
      description: "Equipamentos esportivos, bicicletas e artigos de lazer",
      order: 4,
    },
    {
      name: "Livros e Papelaria",
      slug: "livros-papelaria",
      description: "Livros, cadernos, material escolar e de escritório",
      order: 5,
    },
  ];

  for (const cat of categories) {
    const { data, error } = await supabase
      .from("categories")
      .upsert(
        {
          id: crypto.randomUUID(),
          ...cat,
          isActive: true,
          productCount: 0,
          createdAt: new Date().toISOString(),
        },
        { onConflict: "slug" }
      )
      .select();

    if (error) {
      console.error(`❌ Erro ao criar categoria ${cat.name}:`, error.message);
    } else {
      console.log(`✅ Categoria criada: ${cat.name}`);
    }
  }
}

async function seedUsers() {
  console.log("\n👥 Criando usuários...");

  const password = await bcrypt.hash("Test123!@#", 12);

  const users = [
    {
      id: crypto.randomUUID(),
      name: "Admin Teste",
      email: "admin@vendeuonline.com",
      type: "ADMIN",
      city: "Erechim",
      state: "RS",
      phone: "(54) 99999-1111",
    },
    {
      id: crypto.randomUUID(),
      name: "Vendedor Teste",
      email: "vendedor@vendeuonline.com",
      type: "SELLER",
      city: "Erechim",
      state: "RS",
      phone: "(54) 99999-2222",
    },
    {
      id: crypto.randomUUID(),
      name: "Comprador Teste",
      email: "comprador@vendeuonline.com",
      type: "BUYER",
      city: "Erechim",
      state: "RS",
      phone: "(54) 99999-3333",
    },
  ];

  const createdUsers = [];

  for (const user of users) {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          ...user,
          password,
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select();

    if (error) {
      console.error(`❌ Erro ao criar usuário ${user.name}:`, error.message);
    } else {
      console.log(`✅ Usuário criado: ${user.name} (${user.email})`);
      createdUsers.push(data[0]);
    }
  }

  return createdUsers;
}

async function seedSellers(users) {
  console.log("\n🏪 Criando perfis de vendedores...");

  const sellerUser = users.find((u) => u.type === "SELLER");
  if (!sellerUser) {
    console.error("❌ Usuário vendedor não encontrado");
    return [];
  }

  const seller = {
    id: crypto.randomUUID(),
    userId: sellerUser.id,
    storeName: "TechStore Erechim",
    storeDescription: "Sua loja de eletrônicos em Erechim",
    storeSlug: "techstore-erechim",
    address: "Rua Sete de Setembro, 123",
    zipCode: "99700-000",
    category: "Eletrônicos",
    plan: "PREMIUM",
    isActive: true,
    rating: 4.8,
    totalSales: 0,
    commission: 5.0,
  };

  const { data, error } = await supabase.from("sellers").upsert(seller, { onConflict: "userId" }).select();

  if (error) {
    console.error("❌ Erro ao criar vendedor:", error.message);
    return [];
  }

  console.log(`✅ Vendedor criado: ${seller.storeName}`);
  return data;
}

async function seedStores(sellers) {
  console.log("\n🏬 Criando lojas...");

  if (sellers.length === 0) {
    console.error("❌ Nenhum vendedor disponível");
    return [];
  }

  const stores = [
    {
      id: crypto.randomUUID(),
      sellerId: sellers[0].id,
      name: "TechStore Erechim",
      slug: "techstore-erechim",
      description: "Os melhores produtos de tecnologia com preços imbatíveis",
      address: "Rua Sete de Setembro, 123",
      city: "Erechim",
      state: "RS",
      zipCode: "99700-000",
      phone: "(54) 3321-1234",
      email: "contato@techstore.com",
      category: "Eletrônicos",
      isActive: true,
      isVerified: true,
      rating: 4.8,
      reviewCount: 15,
      productCount: 0,
      salesCount: 0,
      plan: "PREMIUM",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const createdStores = [];

  for (const store of stores) {
    const { data, error } = await supabase.from("stores").upsert(store, { onConflict: "slug" }).select();

    if (error) {
      console.error(`❌ Erro ao criar loja ${store.name}:`, error.message);
    } else {
      console.log(`✅ Loja criada: ${store.name}`);
      createdStores.push(data[0]);
    }
  }

  return createdStores;
}

async function seedProducts(stores, sellers, categories) {
  console.log("\n📦 Criando produtos...");

  if (stores.length === 0 || sellers.length === 0) {
    console.error("❌ Lojas ou vendedores não disponíveis");
    return;
  }

  // Buscar categoria Eletrônicos
  const { data: eletronicosCategoria } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "eletronicos")
    .single();

  if (!eletronicosCategoria) {
    console.error("❌ Categoria Eletrônicos não encontrada");
    return;
  }

  const products = [
    {
      id: crypto.randomUUID(),
      sellerId: sellers[0].id,
      storeId: stores[0].id,
      categoryId: eletronicosCategoria.id,
      name: "iPhone 15 Pro Max 256GB",
      slug: "iphone-15-pro-max-256gb",
      description: "iPhone 15 Pro Max com tela de 6.7 polegadas, chip A17 Pro e sistema de câmeras profissional",
      price: 8999.99,
      comparePrice: 9999.99,
      stock: 5,
      sku: "IPHONE-15-PM-256",
      isActive: true,
      isFeatured: true,
      rating: 4.9,
      reviewCount: 0,
      viewCount: 0,
      salesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      sellerId: sellers[0].id,
      storeId: stores[0].id,
      categoryId: eletronicosCategoria.id,
      name: "MacBook Air M2 256GB",
      slug: "macbook-air-m2-256gb",
      description: "MacBook Air com chip M2, tela Liquid Retina de 13.6 polegadas e até 18 horas de bateria",
      price: 9999.99,
      comparePrice: 10999.99,
      stock: 3,
      sku: "MBA-M2-256",
      isActive: true,
      isFeatured: true,
      rating: 5.0,
      reviewCount: 0,
      viewCount: 0,
      salesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      sellerId: sellers[0].id,
      storeId: stores[0].id,
      categoryId: eletronicosCategoria.id,
      name: "AirPods Pro 2ª geração",
      slug: "airpods-pro-2-geracao",
      description: "AirPods Pro com cancelamento ativo de ruído, áudio espacial e estojo MagSafe",
      price: 2299.99,
      comparePrice: 2599.99,
      stock: 10,
      sku: "AIRPODS-PRO-2",
      isActive: true,
      isFeatured: false,
      rating: 4.8,
      reviewCount: 0,
      viewCount: 0,
      salesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      sellerId: sellers[0].id,
      storeId: stores[0].id,
      categoryId: eletronicosCategoria.id,
      name: "Samsung Galaxy S24 Ultra",
      slug: "samsung-galaxy-s24-ultra",
      description: "Galaxy S24 Ultra com câmera de 200MP, S Pen integrada e tela Dynamic AMOLED 2X",
      price: 7499.99,
      comparePrice: 8299.99,
      stock: 7,
      sku: "S24-ULTRA",
      isActive: true,
      isFeatured: true,
      rating: 4.7,
      reviewCount: 0,
      viewCount: 0,
      salesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      sellerId: sellers[0].id,
      storeId: stores[0].id,
      categoryId: eletronicosCategoria.id,
      name: "Apple Watch Series 9 GPS 45mm",
      slug: "apple-watch-series-9-gps-45mm",
      description: "Apple Watch Series 9 com chip S9, tela Retina sempre ativa e monitoramento avançado de saúde",
      price: 4299.99,
      stock: 8,
      sku: "AW-S9-45",
      isActive: true,
      isFeatured: false,
      rating: 4.9,
      reviewCount: 0,
      viewCount: 0,
      salesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const product of products) {
    const { data, error } = await supabase.from("Product").upsert(product, { onConflict: "slug" }).select();

    if (error) {
      console.error(`❌ Erro ao criar produto ${product.name}:`, error.message);
    } else {
      console.log(`✅ Produto criado: ${product.name} - R$ ${product.price}`);
    }
  }
}

async function main() {
  console.log("🚀 Iniciando seed do banco de dados...\n");

  try {
    await seedCategories();
    const users = await seedUsers();
    const sellers = await seedSellers(users);
    const stores = await seedStores(sellers);
    await seedProducts(stores, sellers, []);

    console.log("\n✅ Seed concluído com sucesso!");
    console.log("\n📊 Resumo:");
    console.log("- 5 categorias criadas");
    console.log("- 3 usuários criados");
    console.log("- 1 vendedor criado");
    console.log("- 1 loja criada");
    console.log("- 5 produtos criados");
    console.log("\n🔐 Credenciais de teste:");
    console.log("- Admin: admin@vendeuonline.com | Test123!@#");
    console.log("- Vendedor: vendedor@vendeuonline.com | Test123!@#");
    console.log("- Comprador: comprador@vendeuonline.com | Test123!@#");
  } catch (error) {
    console.error("\n❌ Erro durante seed:", error);
    process.exit(1);
  }
}

main();
