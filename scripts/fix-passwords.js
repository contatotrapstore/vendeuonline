/**
 * Script para corrigir hashes de senha dos usuários de teste
 * Gera hashes bcrypt válidos para: admin, seller, buyer
 * Senha: Test123!@#
 */

import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixPasswords() {
  console.log("🔧 Iniciando correção de senhas...\n");

  const password = "Test123!@#";
  const hash = await bcrypt.hash(password, 12);

  console.log(`✅ Hash gerado: ${hash}\n`);

  // Usuários para corrigir
  const users = [
    { email: "admin@vendeuonline.com", type: "ADMIN" },
    { email: "seller@vendeuonline.com", type: "SELLER" },
    { email: "comprador@vendeuonline.com", type: "BUYER" },
    // Sellers das lojas criadas
    { email: "contato@modaelegante.com", type: "SELLER" },
    { email: "vendas@casadecor.com", type: "SELLER" },
    { email: "esportes@esportestotal.com", type: "SELLER" },
    { email: "atendimento@belezasaude.com", type: "SELLER" },
    { email: "livros@livrariasaber.com", type: "SELLER" },
    { email: "pet@amigofiel.com", type: "SELLER" },
    { email: "vendas@brinquedosecia.com", type: "SELLER" },
    { email: "autopecas@erechim.com", type: "SELLER" },
    { email: "sabor@saborgaucho.com", type: "SELLER" },
    { email: "ferramentas@pro.com", type: "SELLER" },
    // Buyers para reviews
    { email: "joao.silva@email.com", type: "BUYER" },
    { email: "maria.santos@email.com", type: "BUYER" },
    { email: "carlos.souza@email.com", type: "BUYER" },
    { email: "ana.costa@email.com", type: "BUYER" },
    { email: "pedro.oliveira@email.com", type: "BUYER" },
  ];

  let updated = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const { data, error } = await supabase.from("users").update({ password: hash }).eq("email", user.email).select();

      if (error) {
        console.error(`❌ Erro ao atualizar ${user.email}:`, error.message);
        errors++;
      } else if (data && data.length > 0) {
        console.log(`✅ ${user.type.padEnd(6)} - ${user.email} atualizado`);
        updated++;
      } else {
        console.log(`⚠️  ${user.type.padEnd(6)} - ${user.email} não encontrado`);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar ${user.email}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Atualizados: ${updated}`);
  console.log(`   ❌ Erros: ${errors}`);
  console.log(`   ℹ️  Total processados: ${users.length}`);
  console.log(`\n🔑 Credenciais de teste:`);
  console.log(`   Admin: admin@vendeuonline.com / Test123!@#`);
  console.log(`   Seller: seller@vendeuonline.com / Test123!@#`);
  console.log(`   Buyer: comprador@vendeuonline.com / Test123!@#`);
}

fixPasswords().catch(console.error);
