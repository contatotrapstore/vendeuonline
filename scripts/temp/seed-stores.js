import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const storesData = [
  {
    name: "TechStore",
    slug: "techstore",
    description: "Sua loja de tecnologia especializada em smartphones e acessórios",
    logo: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200",
    banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
    address: "Rua da Tecnologia, 123",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567",
    phone: "(11) 99999-9999",
    email: "contato@techstore.com",
    category: "Eletrônicos",
    isActive: true,
    isVerified: true,
    rating: 4.8,
    reviewCount: 127,
    productCount: 25,
    salesCount: 890,
  },
  {
    name: "Apple Store",
    slug: "apple-store",
    description: "Produtos Apple originais com garantia oficial",
    logo: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200",
    banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
    address: "Av. Paulista, 1000",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310-100",
    phone: "(11) 88888-8888",
    email: "contato@applestore.com",
    category: "Eletrônicos",
    isActive: true,
    isVerified: true,
    rating: 4.9,
    reviewCount: 234,
    productCount: 18,
    salesCount: 1200,
  },
  {
    name: "ComputerShop",
    slug: "computershop",
    description: "Notebooks, desktops e acessórios para informática",
    logo: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200",
    banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
    address: "Rua dos Computadores, 456",
    city: "Rio de Janeiro",
    state: "RJ",
    zipCode: "20000-000",
    phone: "(21) 77777-7777",
    email: "contato@computershop.com",
    category: "Informática",
    isActive: true,
    isVerified: true,
    rating: 4.6,
    reviewCount: 89,
    productCount: 42,
    salesCount: 567,
  },
];

async function seedStores() {
  try {
    console.log("🌱 Inserindo dados de lojas...");

    // Verificar se já existem lojas
    const { data: existingStores, error: checkError } = await supabase.from("stores").select("id").limit(1);

    if (checkError) {
      console.error("❌ Erro ao verificar lojas existentes:", checkError);
      return;
    }

    if (existingStores && existingStores.length > 0) {
      console.log("ℹ️  Lojas já existem no banco. Pulando inserção.");
      return;
    }

    // Inserir lojas
    const { data: insertedStores, error: insertError } = await supabase.from("stores").insert(storesData).select();

    if (insertError) {
      console.error("❌ Erro ao inserir lojas:", insertError);
      return;
    }

    console.log(`✅ ${insertedStores.length} lojas inseridas com sucesso!`);

    insertedStores.forEach((store) => {
      console.log(`   - ${store.name} (${store.city}/${store.state})`);
    });
  } catch (error) {
    console.error("❌ Erro geral:", error);
  }
}

// Executar seed
seedStores()
  .then(() => {
    console.log("🏁 Seed de lojas concluído!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha no seed:", error);
    process.exit(1);
  });
