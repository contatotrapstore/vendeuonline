import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, "..", ".env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createTestUsers() {
  console.log("🔧 Criando usuários de teste...\n");

  const password = "Test123!@#";
  const hashedPassword = await bcrypt.hash(password, 10);

  const users = [
    {
      email: "admin@vendeuonline.com",
      name: "Admin User",
      type: "ADMIN",
      password: hashedPassword,
    },
    {
      email: "seller@vendeuonline.com",
      name: "Seller User",
      type: "SELLER",
      password: hashedPassword,
    },
    {
      email: "buyer@vendeuonline.com",
      name: "Buyer User",
      type: "BUYER",
      password: hashedPassword,
    },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const userData of users) {
    try {
      // Verificar se usuário já existe
      const { data: existing } = await supabase.from("users").select("id, email").eq("email", userData.email).single();

      if (existing) {
        console.log(`⚠️  Usuário já existe: ${userData.email}`);
        // Atualizar senha do usuário existente
        const { error: updateError } = await supabase
          .from("users")
          .update({ password: userData.password })
          .eq("email", userData.email);

        if (updateError) {
          console.log(`❌ Erro ao atualizar senha: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`✅ Senha atualizada: ${userData.email}\n`);
          successCount++;
        }
        continue;
      }

      // Criar novo usuário
      const { data, error } = await supabase.from("users").insert([userData]).select().single();

      if (error) {
        console.log(`❌ Erro ao criar ${userData.email}:`);
        console.log(`   ${error.message}\n`);
        errorCount++;
        continue;
      }

      console.log(`✅ Usuário criado: ${userData.email}`);
      console.log(`   ID: ${data.id}`);
      console.log(`   Tipo: ${data.type}\n`);
      successCount++;

      // Se for SELLER, criar registro na tabela sellers
      if (userData.type === "SELLER") {
        const { data: sellerData, error: sellerError } = await supabase
          .from("sellers")
          .insert([
            {
              userId: data.id,
              storeName: "Test Store",
              storeDescription: "Loja de teste para validação",
              contactEmail: userData.email,
              contactPhone: "(11) 99999-9999",
            },
          ])
          .select()
          .single();

        if (sellerError) {
          console.log(`   ⚠️  Erro ao criar seller: ${sellerError.message}`);
        } else {
          console.log(`   ✅ Seller criado: ID ${sellerData.id}\n`);
        }
      }
    } catch (error) {
      console.log(`❌ Erro inesperado ao processar ${userData.email}:`);
      console.log(`   ${error.message}\n`);
      errorCount++;
    }
  }

  console.log("\n========================================");
  console.log("📊 RESUMO DA CRIAÇÃO DE USUÁRIOS");
  console.log("========================================");
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📧 Total: ${users.length}`);
  console.log("\n🔑 CREDENCIAIS DE TESTE:");
  console.log("========================================");
  users.forEach((user) => {
    console.log(`${user.type.padEnd(10)} | ${user.email.padEnd(30)} | ${password}`);
  });
  console.log("========================================\n");

  // Verificar usuários criados
  console.log("🔍 Verificando usuários no banco...\n");
  const { data: allUsers, error: queryError } = await supabase
    .from("users")
    .select("id, email, name, type, createdAt")
    .in(
      "email",
      users.map((u) => u.email)
    )
    .order("type");

  if (queryError) {
    console.log(`❌ Erro ao consultar usuários: ${queryError.message}`);
  } else {
    console.log(`✅ ${allUsers.length} usuários encontrados no banco:\n`);
    allUsers.forEach((user, idx) => {
      console.log(`${idx + 1}. [${user.type}] ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Criado em: ${new Date(user.createdAt).toLocaleString("pt-BR")}\n`);
    });
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

createTestUsers().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
