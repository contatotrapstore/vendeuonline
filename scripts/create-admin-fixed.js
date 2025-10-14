#!/usr/bin/env node

/**
 * Script para criar admin principal
 * Usa API REST do Supabase diretamente
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

async function createAdmin() {
  console.log("🔧 Creating admin principal account...\n");

  try {
    // Gerar hash da senha
    console.log("🔐 Gerando hash da senha...");
    const hashedPassword = await bcrypt.hash("Admin123!@#", 12);
    console.log("✅ Hash gerado com sucesso\n");

    // Dados do admin
    const userId = randomUUID();
    const adminId = randomUUID();

    const adminUserData = {
      id: userId,
      email: "admin@vendeuonline.com.br",
      password: hashedPassword,
      name: "Administrador Principal",
      phone: "54999999999",
      type: "ADMIN",
      city: "Erechim",
      state: "RS",
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Inserir usuário na tabela User
    console.log("👤 Criando usuário admin na tabela User...");
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/User`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(adminUserData)
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("❌ Erro ao criar usuário:", errorText);
      return;
    }

    const user = await userResponse.json();
    console.log("✅ Usuário criado com sucesso!");
    console.log("   ID:", user[0].id);
    console.log("   Email:", user[0].email);
    console.log("   Name:", user[0].name);

    // Inserir registro na tabela Admin
    console.log("\n🛡️ Criando registro admin na tabela Admin...");
    const adminData = {
      id: adminId,
      userId: userId,
      permissions: JSON.stringify(["ALL"])
    };

    const adminResponse = await fetch(`${supabaseUrl}/rest/v1/Admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(adminData)
    });

    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error("❌ Erro ao criar registro admin:", errorText);
      return;
    }

    console.log("✅ Registro admin criado com sucesso!\n");

    console.log("=".repeat(60));
    console.log("🎯 ADMIN PRINCIPAL CRIADO COM SUCESSO!");
    console.log("=".repeat(60));
    console.log("");
    console.log("📧 Email: admin@vendeuonline.com.br");
    console.log("🔑 Senha: Admin123!@#");
    console.log("🆔 User ID:", userId);
    console.log("🆔 Admin ID:", adminId);
    console.log("");
    console.log("🌐 Acesso: https://www.vendeu.online/login");
    console.log("   ou localmente: http://localhost:5173/login");
    console.log("");
    console.log("🛡️ Permissões: Acesso total ao sistema");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

createAdmin();
