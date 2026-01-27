#!/usr/bin/env node

/**
 * Reset Admin Password Script
 * Uses Supabase service role key to update admin password
 */

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

// Configuration
const SUPABASE_URL = "https://dycsfnbqgojhttnjbndp.supabase.co";
const SUPABASE_SERVICE_KEY = "sbp_2819abc20d13daeb567c8699cff63aec6e703516";
const ADMIN_EMAIL = "admin@vendeuonline.com";
const NEW_PASSWORD = "Admin2024!@#";

async function main() {
  console.log("🔐 Atualizando senha do admin...\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Find admin user
    console.log("🔍 Buscando usuário admin...");
    const { data: admin, error: findError } = await supabase
      .from("users")
      .select("id, email, name, type")
      .eq("email", ADMIN_EMAIL)
      .single();

    if (findError) {
      console.error("❌ Erro ao buscar admin:", findError.message);
      process.exit(1);
    }

    if (!admin) {
      console.error("❌ Admin não encontrado!");
      process.exit(1);
    }

    console.log(`✅ Admin encontrado: ${admin.email} (ID: ${admin.id})`);

    // 2. Hash new password
    console.log("\n🔑 Gerando hash da nova senha...");
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);

    // 3. Update password
    console.log("💾 Atualizando senha no banco...");
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", admin.id);

    if (updateError) {
      console.error("❌ Erro ao atualizar senha:", updateError.message);
      process.exit(1);
    }

    console.log("\n✅ SENHA ATUALIZADA COM SUCESSO!");
    console.log("=====================================");
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Nova senha: ${NEW_PASSWORD}`);
    console.log("=====================================\n");

  } catch (error) {
    console.error("❌ Erro fatal:", error.message);
    process.exit(1);
  }
}

main();
