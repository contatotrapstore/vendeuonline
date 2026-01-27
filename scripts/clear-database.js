#!/usr/bin/env node

/**
 * 🗑️ SCRIPT DE LIMPEZA COMPLETA DO BANCO DE DADOS
 *
 * Este script limpa TODOS os dados do banco, mantendo apenas a estrutura.
 * Use apenas em desenvolvimento ou para reset completo.
 *
 * ATENÇÃO: Esta operação é IRREVERSÍVEL!
 */

import { createClient } from "@supabase/supabase-js";
import { logger } from "../server/lib/logger.js";
import dotenv from "dotenv";
import readline from "readline";

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error("❌ Erro: Variáveis SUPABASE não configuradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Interface para confirmação
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Função para confirmar ação perigosa
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === "sim" || answer.toLowerCase() === "s");
    });
  });
}

/**
 * Limpar dados de uma tabela
 */
async function clearTable(tableName) {
  try {
    logger.info(`🧹 Limpando tabela: ${tableName}...`);

    const { error } = await supabase.from(tableName).delete().neq("id", ""); // Deleta todos os registros

    if (error) {
      logger.error(`❌ Erro ao limpar ${tableName}:`, error.message);
      return false;
    }

    logger.info(`✅ Tabela ${tableName} limpa com sucesso`);
    return true;
  } catch (error) {
    logger.error(`❌ Erro ao limpar ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Contar registros de uma tabela
 */
async function countRecords(tableName) {
  try {
    const { count, error } = await supabase.from(tableName).select("*", { count: "exact", head: true });

    if (error) {
      logger.error(`❌ Erro ao contar ${tableName}:`, error.message);
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error(`❌ Erro ao contar ${tableName}:`, error.message);
    return 0;
  }
}

/**
 * Criar usuário admin padrão
 */
async function createDefaultAdmin() {
  try {
    logger.info("🔧 Criando usuário admin padrão...");

    const adminUser = {
      id: "admin-default-001",
      email: "admin@vendeuonline.com",
      name: "Admin Sistema",
      type: "ADMIN",
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from("users").insert([adminUser]);

    if (error) {
      logger.error("❌ Erro ao criar admin:", error.message);
      return false;
    }

    logger.info("✅ Usuário admin criado: admin@vendeuonline.com");
    return true;
  } catch (error) {
    logger.error("❌ Erro ao criar admin:", error.message);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  logger.info("🗑️  LIMPEZA COMPLETA DO BANCO DE DADOS");
  logger.info("=====================================");
  logger.info("⚠️  ATENÇÃO: Esta operação irá DELETAR TODOS os dados!");
  logger.info("⚠️  Apenas a estrutura das tabelas será mantida.");
  logger.info("");

  // Listar dados atuais
  logger.info("📊 Dados atuais no banco:");

  const tables = [
    "users",
    "sellers",
    "buyers",
    "stores",
    "products",
    "Order",
    "OrderItem",
    "carts",
    "reviews",
    "wishlists",
    "addresses",
    "notifications",
    "plans",
    "Subscription",
    "payments",
    "categories",
  ];

  let totalRecords = 0;
  for (const table of tables) {
    const count = await countRecords(table);
    if (count > 0) {
      logger.info(`   ${table}: ${count} registros`);
      totalRecords += count;
    }
  }

  logger.info(`\n📈 Total: ${totalRecords} registros no banco`);
  logger.info("");

  if (totalRecords === 0) {
    logger.info("✅ Banco já está limpo! Nenhuma ação necessária.");
    rl.close();
    return;
  }

  // Confirmação final
  const confirmed = await askConfirmation('❓ Deseja REALMENTE limpar TODOS os dados? Digite "sim" para confirmar: ');

  if (!confirmed) {
    logger.info("⏹️  Operação cancelada pelo usuário.");
    rl.close();
    return;
  }

  logger.info("\n🚀 Iniciando limpeza...\n");

  // Ordem de limpeza (respeitando foreign keys)
  const cleanupOrder = [
    "OrderItem", // Depende de Order e Product
    "Order", // Depende de users
    "carts", // Depende de users e products
    "reviews", // Depende de users e products
    "wishlists", // Depende de users e products
    "addresses", // Depende de users
    "notifications", // Depende de users
    "payments", // Depende de users
    "Subscription", // Depende de users e plans
    "products", // Depende de stores
    "stores", // Depende de sellers
    "sellers", // Depende de users
    "buyers", // Depende de users
    "users", // Base
    "plans", // Independente
    "categories", // Independente
  ];

  let successCount = 0;

  // Executar limpeza
  for (const table of cleanupOrder) {
    const success = await clearTable(table);
    if (success) successCount++;
  }

  logger.info("\n📊 RESULTADO DA LIMPEZA:");
  logger.info(`✅ ${successCount}/${cleanupOrder.length} tabelas limpas com sucesso`);

  if (successCount === cleanupOrder.length) {
    logger.info("🎉 Banco limpo completamente!");

    // Pergunta se quer criar admin padrão
    const createAdmin = await askConfirmation("\n❓ Deseja criar um usuário admin padrão? (sim/não): ");

    if (createAdmin) {
      await createDefaultAdmin();
    }

    logger.info("\n✅ Limpeza finalizada! Sistema pronto para novos dados.");
  } else {
    logger.info("⚠️  Alguns erros ocorreram durante a limpeza. Verifique os logs acima.");
  }

  rl.close();
}

// Executar script
main().catch((error) => {
  logger.error("❌ Erro fatal:", error);
  rl.close();
  process.exit(1);
});
