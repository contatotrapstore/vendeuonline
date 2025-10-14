#!/usr/bin/env node

/**
 * Script para atualizar senha do admin existente
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function updateAdminPassword() {
  console.log("🔧 Atualizando senha do admin...\n");

  try {
    // Gerar novo hash da senha
    console.log("🔐 Gerando novo hash da senha...");
    const newPassword = "Admin123!@#";
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log("✅ Hash gerado com sucesso\n");

    // Buscar admin existente
    console.log("🔍 Buscando admin existente...");
    const searchResponse = await fetch(
      `${supabaseUrl}/rest/v1/User?email=eq.admin@vendeuonline.com.br&type=eq.ADMIN&select=*`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        }
      }
    );

    const responseText = await searchResponse.text();
    console.log("📋 Resposta da busca:", responseText);

    let users;
    try {
      users = JSON.parse(responseText);
    } catch (e) {
      console.error("❌ Erro ao parsear resposta:", e.message);
      console.log("Resposta raw:", responseText);
      return;
    }

    if (!users || !Array.isArray(users) || users.length === 0) {
      console.error("❌ Admin não encontrado no banco!");
      console.log("Resposta recebida:", users);
      return;
    }

    const admin = users[0];
    console.log("✅ Admin encontrado!");
    console.log("   ID:", admin.id);
    console.log("   Email:", admin.email);
    console.log("   Nome:", admin.name);

    // Atualizar senha
    console.log("\n🔄 Atualizando senha...");
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/User?id=eq.${admin.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          password: hashedPassword,
          updatedAt: new Date().toISOString()
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error("❌ Erro ao atualizar senha:", errorText);
      return;
    }

    console.log("✅ Senha atualizada com sucesso!\n");

    console.log("=".repeat(60));
    console.log("🎯 SENHA DO ADMIN ATUALIZADA COM SUCESSO!");
    console.log("=".repeat(60));
    console.log("");
    console.log("📧 Email: admin@vendeuonline.com.br");
    console.log("🔑 Nova Senha: Admin123!@#");
    console.log("🆔 User ID:", admin.id);
    console.log("");
    console.log("🌐 Acesso: https://www.vendeu.online/login");
    console.log("");
    console.log("🛡️ Permissões: Acesso total ao sistema");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Erro inesperado:", error.message);
  }
}

updateAdminPassword();
