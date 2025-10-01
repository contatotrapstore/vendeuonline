/**
 * Script para popular o banco com lojas variadas
 * Adiciona 10 lojas de diferentes categorias
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const stores = [
  {
    name: "Moda Elegante",
    category: "Moda e Vestuário",
    description: "Roupas femininas e masculinas com as últimas tendências da moda",
    email: "contato@modaelegante.com",
    phone: "(54) 3321-1001",
    city: "Erechim",
    state: "RS",
  },
  {
    name: "Casa & Decoração",
    category: "Casa e Jardim",
    description: "Móveis, decoração e utensílios para transformar sua casa",
    email: "vendas@casadecor.com",
    phone: "(54) 3321-1002",
    city: "Erechim",
    state: "RS",
  },
  {
    name: "Esportes Total",
    category: "Esportes e Lazer",
    description: "Artigos esportivos, equipamentos fitness e roupas esportivas",
    email: "esportes@esportestotal.com",
    phone: "(54) 3321-1003",
    city: "Erechim",
    state: "RS",
  },
  {
    name: "Beleza & Saúde",
    category: "Beleza e Cosméticos",
    description: "Cosméticos, perfumes e produtos de cuidados pessoais",
    email: "atendimento@belezasaude.com",
    phone: "(54) 3321-1004",
    city: "Erechim",
    state: "RS",
  },
  {
    name: "Livraria Saber",
    category: "Livros e Papelaria",
    description: "Livros, materiais escolares e artigos de papelaria",
    email: "livros@livrariasaber.com",
    phone: "(54) 3321-1005",
    city: "Erechim",
    state: "RS",
  },
  {
    name: "Pet Shop Amigo Fiel",
    category: "Pets",
    description: "Tudo para seu pet: rações, brinquedos, acessórios e higiene",
    email: "pet@amigofiel.com",
    phone: "(54) 3321-1006",
    city: "Erechim",
    state: "RS",
  },
  {
    name: "Brinquedos & Cia",
    category: "Brinquedos e Games",
    description: "Brinquedos educativos, jogos e diversão para todas as idades",
    email: "vendas@brinquedosecia.com",
    phone: "(54) 3321-1007",
    city: "Erechim",
    state: "RS",
  },
  {
    name: "AutoPeças Erechim",
    category: "Automotivo",
    description: "Peças, acessórios e produtos automotivos",
    email: "autopecas@erechim.com",
    phone: "(54) 3321-1008",
    city: "Erechim",
    state: "RS",
  },
  {
    name: "Sabor Gaúcho",
    category: "Alimentos e Bebidas",
    description: "Produtos coloniais, vinhos e delícias da região",
    email: "sabor@saborgaucho.com",
    phone: "(54) 3321-1009",
    city: "Erechim",
    state: "RS",
  },
  {
    name: "Ferramentas Pro",
    category: "Ferramentas e Construção",
    description: "Ferramentas profissionais e materiais de construção",
    email: "ferramentas@pro.com",
    phone: "(54) 3321-1010",
    city: "Erechim",
    state: "RS",
  },
];

async function seedStores() {
  console.log("🏪 Iniciando população de lojas...\n");

  for (const storeData of stores) {
    try {
      // 1. Criar usuário seller
      const password = await bcrypt.hash("Seller123!", 10);
      const userEmail = storeData.email;

      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          name: `Vendedor ${storeData.name}`,
          email: userEmail,
          password: password,
          phone: storeData.phone,
          type: "SELLER",
          city: storeData.city,
          state: storeData.state,
          isVerified: true,
        })
        .select()
        .single();

      if (userError) {
        console.error(`❌ Erro ao criar usuário para ${storeData.name}:`, userError.message);
        continue;
      }

      console.log(`✅ Usuário criado: ${user.email}`);

      // 2. Criar registro de seller
      const { data: seller, error: sellerError } = await supabase
        .from("sellers")
        .insert({
          userId: user.id,
          storeName: storeData.name,
          storeDescription: storeData.description,
          storeSlug: storeData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          address: `${storeData.city}, ${storeData.state}`,
          zipCode: "99700-000",
          category: storeData.category,
          plan: "BASICO",
          isActive: true,
          rating: 4.5 + Math.random() * 0.5, // Rating entre 4.5 e 5.0
        })
        .select()
        .single();

      if (sellerError) {
        console.error(`❌ Erro ao criar seller para ${storeData.name}:`, sellerError.message);
        continue;
      }

      console.log(`✅ Seller criado: ${seller.id}`);

      // 3. Criar loja
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .insert({
          sellerId: seller.id,
          name: storeData.name,
          slug: storeData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: storeData.description,
          category: storeData.category,
          address: `${storeData.city}, ${storeData.state}`,
          city: storeData.city,
          state: storeData.state,
          zipCode: "99700-000",
          phone: storeData.phone,
          email: storeData.email,
          whatsapp: storeData.phone,
          isActive: true,
          isVerified: true,
          rating: 4.5 + Math.random() * 0.5,
          plan: "BASICO",
          productCount: 0,
        })
        .select()
        .single();

      if (storeError) {
        console.error(`❌ Erro ao criar loja ${storeData.name}:`, storeError.message);
        continue;
      }

      console.log(`✅ Loja criada: ${store.name} (${store.id})`);
      console.log("");
    } catch (error) {
      console.error(`❌ Erro inesperado ao criar ${storeData.name}:`, error.message);
      continue;
    }
  }

  console.log("\n🎉 População de lojas concluída!");
}

// Executar
seedStores().catch(console.error);
