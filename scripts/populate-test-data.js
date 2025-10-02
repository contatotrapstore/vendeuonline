import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("🚀 Iniciando população do banco de dados...\n");

async function populateDatabase() {
  try {
    // 1. CRIAR CATEGORIAS
    console.log("📁 Criando categorias...");
    const categories = [
      {
        name: "Eletrônicos",
        slug: "eletronicos",
        description: "Produtos eletrônicos e tecnologia",
        isActive: true,
        order: 1,
      },
      { name: "Moda", slug: "moda", description: "Roupas, calçados e acessórios", isActive: true, order: 2 },
      {
        name: "Casa e Decoração",
        slug: "casa-decoracao",
        description: "Móveis e itens de decoração",
        isActive: true,
        order: 3,
      },
      { name: "Esportes", slug: "esportes", description: "Artigos esportivos e fitness", isActive: true, order: 4 },
      { name: "Livros", slug: "livros", description: "Livros e publicações", isActive: true, order: 5 },
      { name: "Beleza", slug: "beleza", description: "Cosméticos e cuidados pessoais", isActive: true, order: 6 },
      { name: "Alimentação", slug: "alimentacao", description: "Alimentos e bebidas", isActive: true, order: 7 },
      { name: "Pets", slug: "pets", description: "Produtos para animais de estimação", isActive: true, order: 8 },
    ];

    const { data: createdCategories, error: catError } = await supabase
      .from("categories")
      .upsert(categories, { onConflict: "slug" })
      .select();

    if (catError) {
      console.error("❌ Erro ao criar categorias:", catError);
    } else {
      console.log(`✅ ${createdCategories.length} categorias criadas\n`);
    }

    // 2. BUSCAR SELLERS EXISTENTES
    console.log("👥 Buscando sellers existentes...");
    const { data: sellers, error: sellerError } = await supabase
      .from("sellers")
      .select("id, userId, storeName")
      .limit(5);

    if (sellerError || !sellers || sellers.length === 0) {
      console.log("⚠️  Nenhum seller encontrado. Criando seller de teste...");

      // Criar usuário seller
      const hashedPassword = await bcrypt.hash("Test123!@#", 10);
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          email: "testproducts@vendeuonline.com",
          password: hashedPassword,
          name: "Seller de Teste",
          type: "SELLER",
          city: "São Paulo",
          state: "SP",
          isActive: true,
          isVerified: true,
        })
        .select()
        .single();

      if (userError) {
        console.error("❌ Erro ao criar usuário seller:", userError);
        return;
      }

      // Criar seller
      const { data: newSeller, error: newSellerError } = await supabase
        .from("sellers")
        .insert({
          userId: newUser.id,
          storeName: "Loja de Produtos de Teste",
          storeDescription: "Loja para testes do marketplace",
          category: "Eletrônicos",
          planId: "default-plan-id",
        })
        .select()
        .single();

      if (newSellerError) {
        console.error("❌ Erro ao criar seller:", newSellerError);
        return;
      }

      // Criar store
      const { data: newStore, error: storeError } = await supabase
        .from("stores")
        .insert({
          sellerId: newSeller.id,
          name: "Loja de Produtos de Teste",
          slug: "loja-teste-produtos",
          description: "Loja para testes do marketplace",
          email: "testproducts@vendeuonline.com",
          phone: "(11) 99999-9999",
          city: "São Paulo",
          state: "SP",
          category: "Eletrônicos",
          isActive: true,
          isVerified: true,
        })
        .select()
        .single();

      if (storeError) {
        console.error("❌ Erro ao criar store:", storeError);
        return;
      }

      sellers.push({ ...newSeller, storeId: newStore.id });
      console.log(`✅ Seller de teste criado: ${newSeller.storeName}\n`);
    } else {
      console.log(`✅ ${sellers.length} sellers encontrados\n`);
    }

    // 3. BUSCAR STORES DOS SELLERS
    console.log("🏪 Buscando stores...");
    const sellerIds = sellers.map((s) => s.id);
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, sellerId, name")
      .in("sellerId", sellerIds);

    if (storesError) {
      console.error("❌ Erro ao buscar stores:", storesError);
      return;
    }
    console.log(`✅ ${stores.length} stores encontradas\n`);

    // 4. CRIAR PRODUTOS
    console.log("📦 Criando produtos...");
    const products = [];

    for (const store of stores.slice(0, 3)) {
      const storeProducts = [
        {
          sellerId: store.sellerId,
          storeId: store.id,
          name: `Smartphone Galaxy Pro - ${store.name}`,
          description: "Smartphone de última geração com câmera de 108MP, processador octa-core e 5G.",
          price: 2499.99,
          comparePrice: 2999.99,
          category: "Eletrônicos",
          brand: "Samsung",
          stock: 50,
          isActive: true,
          isFeatured: true,
          images: ["https://via.placeholder.com/800x600/0066cc/ffffff?text=Galaxy+Pro"],
          tags: ["smartphone", "5g", "tecnologia"],
        },
        {
          sellerId: store.sellerId,
          storeId: store.id,
          name: `Notebook Ultra - ${store.name}`,
          description: "Notebook profissional com Intel i7, 16GB RAM, SSD 512GB e tela Full HD.",
          price: 4999.99,
          comparePrice: 5999.99,
          category: "Eletrônicos",
          brand: "Dell",
          stock: 30,
          isActive: true,
          isFeatured: true,
          images: ["https://via.placeholder.com/800x600/333333/ffffff?text=Notebook+Ultra"],
          tags: ["notebook", "computador", "trabalho"],
        },
        {
          sellerId: store.sellerId,
          storeId: store.id,
          name: `Fone Bluetooth Premium - ${store.name}`,
          description: "Fone de ouvido sem fio com cancelamento de ruído ativo e bateria de 30h.",
          price: 599.99,
          comparePrice: 799.99,
          category: "Eletrônicos",
          brand: "Sony",
          stock: 100,
          isActive: true,
          isFeatured: false,
          images: ["https://via.placeholder.com/800x600/ff6600/ffffff?text=Fone+Premium"],
          tags: ["fone", "bluetooth", "audio"],
        },
        {
          sellerId: store.sellerId,
          storeId: store.id,
          name: `Smartwatch Fitness - ${store.name}`,
          description: "Relógio inteligente com monitoramento de saúde, GPS e resistência à água.",
          price: 899.99,
          comparePrice: 1199.99,
          category: "Eletrônicos",
          brand: "Apple",
          stock: 75,
          isActive: true,
          isFeatured: true,
          images: ["https://via.placeholder.com/800x600/00cc66/ffffff?text=Smartwatch"],
          tags: ["smartwatch", "fitness", "saude"],
        },
      ];

      products.push(...storeProducts);
    }

    const { data: createdProducts, error: prodError } = await supabase.from("products").insert(products).select();

    if (prodError) {
      console.error("❌ Erro ao criar produtos:", prodError);
    } else {
      console.log(`✅ ${createdProducts.length} produtos criados\n`);
    }

    // 5. CRIAR PLANOS
    console.log("💳 Criando planos de assinatura...");
    const plans = [
      {
        name: "Gratuito",
        slug: "gratuito",
        description: "Plano básico para começar",
        price: 0,
        billingPeriod: "monthly",
        maxAds: 5,
        maxPhotos: 3,
        maxProducts: 10,
        maxImages: 50,
        maxCategories: 2,
        prioritySupport: false,
        support: "Email",
        features: ["5 anúncios", "3 fotos por produto", "Suporte por email"],
        isActive: true,
        order: 1,
      },
      {
        name: "Básico",
        slug: "basico",
        description: "Ideal para pequenos vendedores",
        price: 29.9,
        billingPeriod: "monthly",
        maxAds: 20,
        maxPhotos: 5,
        maxProducts: 50,
        maxImages: 250,
        maxCategories: 5,
        prioritySupport: false,
        support: "Email",
        features: ["20 anúncios", "5 fotos por produto", "Suporte por email", "Estatísticas básicas"],
        isActive: true,
        order: 2,
      },
      {
        name: "Profissional",
        slug: "profissional",
        description: "Para vendedores estabelecidos",
        price: 79.9,
        billingPeriod: "monthly",
        maxAds: 100,
        maxPhotos: 10,
        maxProducts: 200,
        maxImages: 2000,
        maxCategories: -1,
        prioritySupport: true,
        support: "Email e WhatsApp",
        features: [
          "100 anúncios",
          "10 fotos por produto",
          "Suporte prioritário",
          "Estatísticas avançadas",
          "Destaque na busca",
        ],
        isActive: true,
        order: 3,
      },
      {
        name: "Empresa",
        slug: "empresa",
        description: "Para grandes operações",
        price: 199.9,
        billingPeriod: "monthly",
        maxAds: -1,
        maxPhotos: 15,
        maxProducts: -1,
        maxImages: -1,
        maxCategories: -1,
        prioritySupport: true,
        support: "Email, WhatsApp e Telefone",
        features: [
          "Anúncios ilimitados",
          "15 fotos por produto",
          "Suporte premium 24/7",
          "API de integração",
          "Gerente de conta dedicado",
        ],
        isActive: true,
        order: 4,
      },
    ];

    const { data: createdPlans, error: plansError } = await supabase
      .from("plans")
      .upsert(plans, { onConflict: "slug" })
      .select();

    if (plansError) {
      console.error("❌ Erro ao criar planos:", plansError);
    } else {
      console.log(`✅ ${createdPlans.length} planos criados\n`);
    }

    // 6. RESUMO FINAL
    console.log("═══════════════════════════════════════");
    console.log("✅ POPULAÇÃO DO BANCO CONCLUÍDA!");
    console.log("═══════════════════════════════════════");
    console.log(`📁 Categorias: ${createdCategories?.length || 0}`);
    console.log(`📦 Produtos: ${createdProducts?.length || 0}`);
    console.log(`💳 Planos: ${createdPlans?.length || 0}`);
    console.log("═══════════════════════════════════════\n");
  } catch (error) {
    console.error("❌ Erro fatal na população:", error);
    process.exit(1);
  }
}

populateDatabase();
