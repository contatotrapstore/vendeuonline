import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  "Eletrônicos",
  "Moda",
  "Casa e Jardim",
  "Veículos",
  "Esportes",
  "Livros",
  "Beleza",
  "Brinquedos",
  "Instrumentos Musicais",
  "Pet Shop",
];

const BRANDS = [
  "Samsung",
  "Apple",
  "LG",
  "Sony",
  "Dell",
  "HP",
  "Nike",
  "Adidas",
  "Zara",
  "H&M",
  "Philips",
  "Brastemp",
  "Electrolux",
  "Whirlpool",
  "Honda",
  "Toyota",
  "Ford",
  "Chevrolet",
  "Yamaha",
  "Kawasaki",
];

const PRODUCT_NAMES = [
  "Smartphone Premium",
  "Notebook Gamer",
  'Smart TV 55"',
  "Ar Condicionado",
  "Geladeira Frost Free",
  "Fogão 5 Bocas",
  "Micro-ondas Digital",
  "Camiseta Básica",
  "Calça Jeans",
  "Tênis Esportivo",
  "Jaqueta de Couro",
  "Sofá 3 Lugares",
  "Mesa de Jantar",
  "Cama Box",
  "Guarda-roupa",
  "Bicicleta Mountain Bike",
  "Esteira Elétrica",
  "Halteres",
  "Proteína Whey",
  "Violão Clássico",
  "Teclado Musical",
  "Fone de Ouvido",
  "Caixa de Som Bluetooth",
];

const CONDITIONS = ["new", "used", "refurbished"];
const APPROVAL_STATUS = ["PENDING", "APPROVED", "REJECTED"];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomPrice(min = 50, max = 2000) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function getRandomStock(min = 0, max = 100) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateDescription(productName, brand, category) {
  const descriptions = [
    `${productName} da marca ${brand}, ideal para ${category.toLowerCase()}. Produto de alta qualidade com garantia.`,
    `Excelente ${productName} ${brand}. Perfeito para quem busca qualidade e durabilidade em ${category.toLowerCase()}.`,
    `${brand} ${productName} - O que você precisa em ${category.toLowerCase()}. Condição impecável e preço justo.`,
    `Super ${productName} da ${brand}! Categoria ${category}. Não perca esta oportunidade única.`,
    `${productName} ${brand} em ótimo estado. Ideal para ${category.toLowerCase()}. Entrega rápida garantida.`,
  ];
  return getRandomElement(descriptions);
}

async function createSeedData() {
  console.log("🌱 Iniciando seed de dados para admin...");

  try {
    // Buscar sellers existentes
    const sellers = await prisma.seller.findMany({
      include: {
        user: true,
        store: true,
      },
    });

    if (sellers.length === 0) {
      console.log("❌ Nenhum seller encontrado. Execute o seed principal primeiro.");
      return;
    }

    console.log(`✅ Encontrados ${sellers.length} sellers`);

    // Buscar categorias existentes
    let categories = await prisma.category.findMany();

    if (categories.length === 0) {
      console.log("📦 Criando categorias...");
      for (let i = 0; i < CATEGORIES.length; i++) {
        const category = CATEGORIES[i];
        const slug = category
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        await prisma.category.create({
          data: {
            name: category,
            slug,
            description: `Produtos da categoria ${category}`,
            isActive: true,
            order: i + 1,
          },
        });
      }
      categories = await prisma.category.findMany();
      console.log(`✅ ${categories.length} categorias criadas`);
    }

    // Criar produtos variados para cada seller
    console.log("🛍️ Criando produtos...");
    const totalProducts = 50; // Total de produtos para criar
    let createdCount = 0;

    for (let i = 0; i < totalProducts; i++) {
      const seller = getRandomElement(sellers);
      const store = seller.store; // Use singular store relation

      if (!store) {
        console.log(`⚠️ Seller ${seller.user.name} não possui loja, pulando produto ${i + 1}`);
        continue;
      }

      const category = getRandomElement(categories);
      const brand = getRandomElement(BRANDS);
      const productName = getRandomElement(PRODUCT_NAMES);
      const condition = getRandomElement(CONDITIONS);
      const approvalStatus = getRandomElement(APPROVAL_STATUS);

      const price = getRandomPrice();
      const comparePrice = Math.random() > 0.6 ? getRandomPrice(price + 50, price * 1.5) : null;
      const stock = getRandomStock();
      const isFeatured = Math.random() > 0.8;
      const isActive = approvalStatus === "APPROVED" ? Math.random() > 0.1 : false;

      try {
        const product = await prisma.product.create({
          data: {
            sellerId: seller.id,
            storeId: store.id,
            categoryId: category.id,
            name: `${brand} ${productName} #${i + 1}`,
            description: generateDescription(productName, brand, category.name),
            price,
            comparePrice,
            stock,
            minStock: 5,
            sku: `SKU-${seller.id.slice(-8)}-${Date.now()}-${i}`,
            isFeatured,
            isActive,
            approvalStatus,
            approvedAt: approvalStatus === "APPROVED" ? new Date() : null,
            approvedBy: approvalStatus === "APPROVED" ? "admin@vendeuonline.com" : null,
            rejectionReason:
              approvalStatus === "REJECTED"
                ? getRandomElement([
                    "Imagens de baixa qualidade",
                    "Descrição insuficiente",
                    "Preço fora do padrão",
                    "Produto não permitido",
                  ])
                : null,
            rating: Math.random() * 5,
            reviewCount: Math.floor(Math.random() * 50),
            salesCount: Math.floor(Math.random() * 25),
            tags: JSON.stringify([category.name.toLowerCase(), brand.toLowerCase(), condition]),
          },
        });

        // Criar imagens para o produto
        const imageCount = Math.floor(Math.random() * 5) + 1;
        for (let j = 0; j < imageCount; j++) {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: `https://via.placeholder.com/600x400/${Math.floor(Math.random() * 16777215).toString(16)}/${Math.floor(Math.random() * 16777215).toString(16)}?text=${encodeURIComponent(product.name)}`,
              alt: `Imagem ${j + 1} do ${product.name}`,
              order: j,
              isMain: j === 0,
            },
          });
        }

        createdCount++;
        if (createdCount % 10 === 0) {
          console.log(`  📦 ${createdCount}/${totalProducts} produtos criados...`);
        }
      } catch (error) {
        console.error(`Erro ao criar produto ${i + 1}:`, error.message);
      }
    }

    // Criar algumas lojas com diferentes status
    console.log("🏪 Atualizando status das lojas...");
    const stores = await prisma.store.findMany();

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const shouldSuspend = Math.random() > 0.8;
      const shouldDeactivate = Math.random() > 0.9;

      if (shouldSuspend) {
        await prisma.store.update({
          where: { id: store.id },
          data: {
            isVerified: false,
            isActive: false,
          },
        });
      } else if (shouldDeactivate) {
        await prisma.store.update({
          where: { id: store.id },
          data: {
            isActive: false,
          },
        });
      }
    }

    // Estatísticas finais
    const stats = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { approvalStatus: "PENDING" } }),
      prisma.product.count({ where: { approvalStatus: "APPROVED" } }),
      prisma.product.count({ where: { approvalStatus: "REJECTED" } }),
      prisma.store.count(),
      prisma.store.count({ where: { isVerified: true } }),
      prisma.store.count({ where: { isActive: true } }),
    ]);

    console.log("\n🎉 Seed de dados admin concluído!");
    console.log("📊 Estatísticas:");
    console.log(`  📦 Total de produtos: ${stats[0]}`);
    console.log(`  ⏳ Produtos pendentes: ${stats[1]}`);
    console.log(`  ✅ Produtos aprovados: ${stats[2]}`);
    console.log(`  ❌ Produtos rejeitados: ${stats[3]}`);
    console.log(`  🏪 Total de lojas: ${stats[4]}`);
    console.log(`  ✅ Lojas verificadas: ${stats[5]}`);
    console.log(`  🟢 Lojas ativas: ${stats[6]}`);
  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  }
}

// Executar o seed
createSeedData()
  .catch((e) => {
    console.error("❌ Falha no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
