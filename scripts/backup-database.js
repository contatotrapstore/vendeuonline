import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Erro: Variáveis de ambiente não configuradas");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅" : "❌");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✅" : "❌");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Script de Backup do Banco de Dados
 *
 * Este script faz backup de todas as tabelas principais do banco antes
 * de aplicar mudanças no schema (remoção de Cart, Order, Payment, etc.)
 */

const TABLES_TO_BACKUP = [
  "User",
  "Seller",
  "Store",
  "Product",
  "ProductImage",
  "ProductSpecification",
  "Category",
  "Review",
  "Wishlist",
  "Notification",
  "Plan",
  "Subscription",
  // Tabelas que serão removidas (backup importante!)
  "Cart",
  "Order",
  "OrderItem",
  "Payment",
  "Address",
];

async function backupTable(tableName) {
  console.log(`\n📦 Fazendo backup da tabela: ${tableName}`);

  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select("*", { count: "exact" });

    if (error) {
      // Se tabela não existe (ex: Cart, Order já foram removidas), não é erro crítico
      console.log(`⚠️  Tabela ${tableName} não encontrada (pode já ter sido removida)`);
      return { table: tableName, records: 0, data: [], skipped: true };
    }

    console.log(`   ✅ ${count || 0} registros encontrados`);
    return { table: tableName, records: count || 0, data: data || [], skipped: false };
  } catch (err) {
    console.error(`   ❌ Erro ao fazer backup de ${tableName}:`, err.message);
    return { table: tableName, records: 0, data: [], error: err.message };
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("🔒 BACKUP DO BANCO DE DADOS - VENDEU ONLINE");
  console.log("=".repeat(60));
  console.log(`📅 Data: ${new Date().toISOString()}`);
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  console.log("=".repeat(60));

  const backup = {
    timestamp: new Date().toISOString(),
    supabaseUrl,
    tables: [],
  };

  // Fazer backup de todas as tabelas
  for (const tableName of TABLES_TO_BACKUP) {
    const result = await backupTable(tableName);
    backup.tables.push(result);
  }

  // Salvar backup em arquivo JSON
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");
  const filename = `db-backup-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("✅ BACKUP COMPLETO!");
  console.log("=".repeat(60));
  console.log(`📁 Arquivo salvo: ${filepath}`);
  console.log(`📊 Total de tabelas: ${backup.tables.length}`);
  console.log(
    `📦 Total de registros: ${backup.tables.reduce((sum, t) => sum + t.records, 0)}`
  );

  // Resumo por tabela
  console.log("\n📋 Resumo por Tabela:");
  console.log("-".repeat(60));
  backup.tables.forEach((t) => {
    const status = t.skipped
      ? "⚠️  SKIPPED"
      : t.error
        ? "❌ ERROR"
        : "✅ OK";
    console.log(`${status.padEnd(12)} ${t.table.padEnd(30)} ${t.records} registros`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("⚠️  IMPORTANTE:");
  console.log("   Este backup contém todos os dados antes da mudança de schema.");
  console.log("   Guarde este arquivo em local seguro antes de prosseguir!");
  console.log("=".repeat(60));
}

main()
  .then(() => {
    console.log("\n✅ Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro fatal:", error);
    process.exit(1);
  });
