import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { logger } from "../lib/logger.js";

dotenv.config();

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixTestData() {
  logger.info("🔧 Iniciando correção de dados de teste...\n");

  try {
    // 1. CRIAR USUÁRIOS DE TESTE COM SENHAS CONHECIDAS
    logger.info("📝 Criando usuários de teste...");

    const testPassword = await bcrypt.hash("Test123!@#", 10);

    const testUsers = [
      {
        id: "test-admin-001",
        email: "admin@vendeuonline.com",
        password: testPassword,
        name: "Admin Teste",
        type: "ADMIN",
        phone: "11999999999",
        city: "São Paulo",
        state: "SP",
        isVerified: true,
      },
      {
        id: "test-seller-001",
        email: "seller@vendeuonline.com",
        password: testPassword,
        name: "Vendedor Teste",
        type: "SELLER",
        phone: "11988888888",
        city: "São Paulo",
        state: "SP",
        isVerified: true,
      },
      {
        id: "test-buyer-001",
        email: "buyer@vendeuonline.com",
        password: testPassword,
        name: "Comprador Teste",
        type: "BUYER",
        phone: "11977777777",
        city: "Rio de Janeiro",
        state: "RJ",
        isVerified: true,
      },
    ];

    for (const user of testUsers) {
      const { error } = await supabase.from("users").upsert(user, { onConflict: "email" });

      if (error) {
        logger.info(`⚠️ Erro ao criar ${user.email}:`, error.message);
      } else {
        logger.info(`✅ Usuário ${user.email} criado/atualizado`);
      }
    }

    // 2. CRIAR PERFIS ESPECÍFICOS
    logger.info("\n📝 Criando perfis específicos...");

    // Admin profile
    await supabase.from("admins").upsert(
      {
        id: "admin-profile-001",
        userId: "test-admin-001",
        permissions: ["ALL"],
        lastLogin: new Date().toISOString(),
      },
      { onConflict: "userId" }
    );

    // Seller profile
    await supabase.from("sellers").upsert(
      {
        id: "seller-profile-001",
        userId: "test-seller-001",
        storeName: "Loja Teste",
        storeDescription: "Uma loja de teste completa",
        storeSlug: "loja-teste",
        cnpj: "12345678000199",
        address: "Rua Teste, 123",
        zipCode: "01000-000",
        category: "Eletrônicos",
        plan: "BASICO",
        isActive: true,
        rating: 4.5,
        totalSales: 10,
      },
      { onConflict: "userId" }
    );

    // Buyer profile
    await supabase.from("buyers").upsert(
      {
        id: "buyer-profile-001",
        userId: "test-buyer-001",
      },
      { onConflict: "userId" }
    );

    logger.info("✅ Perfis criados");

    // 3. CRIAR LOJA PARA O SELLER
    logger.info("\n📝 Criando loja para o vendedor...");

    await supabase.from("stores").upsert(
      {
        id: "store-test-001",
        sellerId: "seller-profile-001",
        name: "Loja Teste Oficial",
        slug: "loja-teste-oficial",
        description: "A melhor loja de teste do marketplace",
        address: "Rua das Lojas, 100",
        city: "São Paulo",
        state: "SP",
        zipCode: "01000-000",
        phone: "11988888888",
        email: "contato@lojateste.com",
        whatsapp: "11988888888",
        category: "Eletrônicos",
        isActive: true,
        isVerified: true,
        rating: 4.5,
        reviewCount: 5,
        productCount: 3,
        salesCount: 10,
        plan: "BASICO",
      },
      { onConflict: "slug" }
    );

    logger.info("✅ Loja criada");

    // 4. POPULAR DADOS TRANSACIONAIS
    logger.info("\n📝 Populando dados transacionais...");

    // Buscar produtos existentes
    const { data: products } = await supabase.from("Product").select("id, name, price").limit(3);

    if (products && products.length > 0) {
      const productId = products[0].id;

      // Criar pedido de teste
      const orderData = {
        id: "order-test-001",
        buyerId: "buyer-profile-001",
        sellerId: "seller-profile-001",
        storeId: "store-test-001",
        total: products[0].price,
        subtotal: products[0].price,
        shipping: 10,
        discount: 0,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "PIX",
        shippingAddress: {
          street: "Rua Teste",
          number: "123",
          city: "São Paulo",
          state: "SP",
          zipCode: "01000-000",
        },
      };

      const { error: orderError } = await supabase.from("Order").upsert(orderData, { onConflict: "id" });

      if (!orderError) {
        logger.info("✅ Pedido criado");

        // Criar item do pedido
        await supabase.from("OrderItem").upsert(
          {
            id: "order-item-001",
            orderId: "order-test-001",
            productId: productId,
            quantity: 1,
            price: products[0].price,
            total: products[0].price,
          },
          { onConflict: "id" }
        );

        logger.info("✅ Item do pedido criado");
      }

      // Adicionar produto ao wishlist
      await supabase.from("Wishlist").upsert(
        {
          id: "wishlist-001",
          userId: "test-buyer-001",
          productId: productId,
        },
        { onConflict: "id" }
      );

      logger.info("✅ Item adicionado ao wishlist");

      // Criar review
      await supabase.from("reviews").upsert(
        {
          id: "review-001",
          userId: "test-buyer-001",
          productId: productId,
          rating: 5,
          title: "Excelente produto!",
          comment: "Produto de qualidade, entrega rápida. Recomendo!",
          isVerified: true,
          status: "approved",
        },
        { onConflict: "id" }
      );

      logger.info("✅ Review criada");

      // Atualizar estatísticas do produto
      await supabase
        .from("Product")
        .update({
          averageRating: 5,
          totalReviews: 1,
          salesCount: 1,
        })
        .eq("id", productId);
    }

    // 5. CRIAR NOTIFICAÇÕES
    logger.info("\n📝 Criando notificações...");

    await supabase.from("notifications").insert([
      {
        userId: "test-seller-001",
        title: "Novo pedido recebido",
        message: "Você recebeu um novo pedido de R$ 100,00",
        type: "info",
      },
      {
        userId: "test-buyer-001",
        title: "Pedido confirmado",
        message: "Seu pedido foi confirmado e está sendo processado",
        type: "success",
      },
    ]);

    logger.info("✅ Notificações criadas");

    logger.info("\n🎉 Correção de dados concluída com sucesso!");
    logger.info("\n📋 CREDENCIAIS DE TESTE:");
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info("Admin:  admin@vendeuonline.com  | Senha: Test123!@#");
    logger.info("Seller: seller@vendeuonline.com | Senha: Test123!@#");
    logger.info("Buyer:  buyer@vendeuonline.com  | Senha: Test123!@#");
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    logger.error("❌ Erro ao corrigir dados:", error);
  }
}

// Run the fix
fixTestData();
