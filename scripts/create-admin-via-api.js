#!/usr/bin/env node

/**
 * Script para criar admin através da API do próprio sistema
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = "https://vendeuonline-uqkk.onrender.com";

async function createAdminViaAPI() {
  console.log("🔧 Criando admin através da API do sistema...\n");

  try {
    const adminData = {
      name: "Administrador Principal",
      email: "admin@vendeuonline.com.br",
      password: "Admin123!@#",
      phone: "54999999999",
      city: "Erechim",
      state: "RS",
      type: "ADMIN"
    };

    console.log("📤 Enviando requisição de registro...");
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Erro ao criar admin:", result.message || result.error);
      console.log("\n⚠️ Detalhes:", JSON.stringify(result, null, 2));
      return;
    }

    console.log("✅ Admin criado com sucesso!\n");
    console.log("=".repeat(60));
    console.log("🎯 ADMIN PRINCIPAL CRIADO COM SUCESSO!");
    console.log("=".repeat(60));
    console.log("");
    console.log("📧 Email: admin@vendeuonline.com.br");
    console.log("🔑 Senha: Admin123!@#");
    console.log("🆔 User ID:", result.user?.id || "N/A");
    console.log("");
    console.log("🌐 Acesso: https://www.vendeu.online/login");
    console.log("");
    console.log("🛡️ Permissões: Acesso total ao sistema");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Erro inesperado:", error.message);
  }
}

createAdminViaAPI();
