#!/usr/bin/env node

/**
 * Script simples para resetar senha do admin via backend próprio
 */

import bcrypt from 'bcryptjs';

async function generateHash() {
  const newPassword = "Admin123!@#";

  console.log("🔐 Gerando hash para nova senha...\n");
  console.log("Senha:", newPassword);

  const hash = await bcrypt.hash(newPassword, 12);

  console.log("\n✅ Hash gerado com sucesso!\n");
  console.log("=".repeat(70));
  console.log("HASH DA SENHA (copie e atualize manualmente no Supabase Dashboard):");
  console.log("=".repeat(70));
  console.log(hash);
  console.log("=".repeat(70));

  console.log("\n📋 INSTRUÇÕES PARA ATUALIZAR NO SUPABASE:\n");
  console.log("1. Acesse: https://supabase.com/dashboard");
  console.log("2. Selecione o projeto: grupomaboon@gmail.com's Project");
  console.log("3. Vá em: Table Editor > User");
  console.log("4. Encontre o registro com email: admin@vendeuonline.com.br");
  console.log("5. Clique em editar e atualize o campo 'password' com o hash acima");
  console.log("6. Salve as alterações");
  console.log("\n✅ Depois disso, você poderá fazer login com:");
  console.log("   📧 Email: admin@vendeuonline.com.br");
  console.log("   🔑 Senha: Admin123!@#\n");
}

generateHash();
