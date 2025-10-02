import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createTestData() {
  console.log("🔧 Criando dados de teste para validação completa...\n");

  try {
    // 1. Buscar IDs necessários
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", "f2a92871-3dd2-4d99-b95c-b37a55d42ad6")
      .single();

    if (sellerError) {
      console.error("❌ Erro ao buscar seller:", sellerError);
      process.exit(1);
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("sellerId", seller.id)
      .single();

    if (storeError) {
      console.error("❌ Erro ao buscar store:", storeError);
      process.exit(1);
    }

    const { data: categories } = await supabase.from("categories").select("id").limit(1);

    const category = categories?.[0];

    if (!seller || !store || !category) {
      console.error("❌ Erro: Dados necessários não encontrados");
      console.error("Seller:", seller);
      console.error("Store:", store);
      console.error("Category:", category);
      process.exit(1);
    }

    console.log("✅ IDs obtidos:");
    console.log(`   Seller: ${seller.id}`);
    console.log(`   Store: ${store.id}`);
    console.log(`   Category: ${category.id}\n`);

    // 2. Criar produtos de teste
    console.log("📦 Criando produtos de teste...");

    const products = [
      {
        sellerId: seller.id,
        storeId: store.id,
        categoryId: category.id,
        name: "Smartphone Samsung Galaxy S23",
        slug: "smartphone-samsung-galaxy-s23",
        description: "Smartphone Samsung Galaxy S23 128GB com câmera de 50MP e tela AMOLED de 6.1 polegadas",
        price: 3499.99,
        comparePrice: 3999.99,
        stock: 15,
        sku: "SAM-S23-128",
        isActive: true,
        isFeatured: true,
      },
      {
        sellerId: seller.id,
        storeId: store.id,
        categoryId: category.id,
        name: "Notebook Dell Inspiron 15",
        slug: "notebook-dell-inspiron-15",
        description: "Notebook Dell Inspiron 15 com Intel Core i5, 8GB RAM, 256GB SSD",
        price: 2899.9,
        comparePrice: 3299.9,
        stock: 8,
        sku: "DELL-INS15-I5",
        isActive: true,
        isFeatured: false,
      },
      {
        sellerId: seller.id,
        storeId: store.id,
        categoryId: category.id,
        name: 'Smart TV LG 50" 4K',
        slug: "smart-tv-lg-50-4k",
        description: "Smart TV LG 50 polegadas 4K UHD com WebOS e ThinQ AI",
        price: 1999.0,
        comparePrice: 2499.0,
        stock: 5,
        sku: "LG-TV50-4K",
        isActive: true,
        isFeatured: true,
      },
      {
        sellerId: seller.id,
        storeId: store.id,
        categoryId: category.id,
        name: "Fone Bluetooth Sony WH-1000XM5",
        slug: "fone-bluetooth-sony-wh1000xm5",
        description: "Fone de ouvido Bluetooth Sony com cancelamento de ruído Premium",
        price: 1499.99,
        comparePrice: 1799.99,
        stock: 12,
        sku: "SONY-WH1000XM5",
        isActive: true,
        isFeatured: false,
      },
      {
        sellerId: seller.id,
        storeId: store.id,
        categoryId: category.id,
        name: "Mouse Gamer Logitech G502",
        slug: "mouse-gamer-logitech-g502",
        description: "Mouse Gamer Logitech G502 HERO com sensor de 25K DPI",
        price: 299.9,
        comparePrice: 399.9,
        stock: 25,
        sku: "LOG-G502-HERO",
        isActive: true,
        isFeatured: false,
      },
    ];

    for (const product of products) {
      const { data, error } = await supabase.from("Product").insert([product]).select().single();

      if (error) {
        console.log(`❌ Erro ao criar produto ${product.name}:`, error.message);
      } else {
        console.log(`✅ Produto criado: ${data.name} (ID: ${data.id})`);

        // Adicionar imagens para o produto
        const images = [
          {
            productId: data.id,
            url: `https://picsum.photos/seed/${data.id}-1/800/600`,
            alt: `${data.name} - Imagem 1`,
            order: 0,
            position: 0,
          },
          {
            productId: data.id,
            url: `https://picsum.photos/seed/${data.id}-2/800/600`,
            alt: `${data.name} - Imagem 2`,
            order: 1,
            position: 1,
          },
        ];

        await supabase.from("ProductImage").insert(images);
        console.log(`   ✅ 2 imagens adicionadas`);

        // Adicionar especificações
        const specs = [
          { productId: data.id, name: "Marca", value: product.name.split(" ")[0] },
          { productId: data.id, name: "Modelo", value: product.sku },
          { productId: data.id, name: "Garantia", value: "1 ano" },
        ];

        await supabase.from("ProductSpecification").insert(specs);
        console.log(`   ✅ 3 especificações adicionadas\n`);
      }
    }

    // 3. Criar endereços de teste para buyer
    console.log("📍 Criando endereços de teste...");

    const addresses = [
      {
        userId: "13b903c9-4469-4e0b-99d4-bab8c5285995",
        label: "Casa",
        street: "Rua das Flores",
        number: "123",
        complement: "Apto 45",
        neighborhood: "Jardim Botânico",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567",
        isDefault: true,
      },
      {
        userId: "13b903c9-4469-4e0b-99d4-bab8c5285995",
        label: "Trabalho",
        street: "Avenida Paulista",
        number: "1000",
        complement: "Sala 501",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-100",
        isDefault: false,
      },
    ];

    for (const address of addresses) {
      const { data, error } = await supabase.from("addresses").insert([address]).select().single();

      if (error) {
        console.log(`❌ Erro ao criar endereço:`, error.message);
      } else {
        console.log(`✅ Endereço criado: ${data.label}`);
      }
    }

    // 4. Resumo final
    console.log("\n========================================");
    console.log("📊 RESUMO DA CRIAÇÃO DE DADOS DE TESTE");
    console.log("========================================");
    console.log("✅ 5 produtos criados");
    console.log("✅ 10 imagens de produtos criadas");
    console.log("✅ 15 especificações criadas");
    console.log("✅ 2 endereços criados");
    console.log("========================================\n");

    // Verificar contagens
    const { count: productCount } = await supabase
      .from("Product")
      .select("*", { count: "exact", head: true })
      .eq("sellerId", seller.id);

    console.log(`📦 Total de produtos no banco: ${productCount}`);
    console.log("✅ Dados de teste prontos para validação completa!\n");
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  }
}

createTestData().catch(console.error);
