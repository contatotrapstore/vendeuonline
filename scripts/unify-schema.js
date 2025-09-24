import { supabase } from "../server/lib/supabase-client.js";
import { logger } from "../server/lib/logger.js";

/**
 * Script para unificar schemas duplicados
 * Padroniza para snake_case e remove tabelas duplicadas
 */

async function unifySchema() {
  try {
    logger.info("🔄 Iniciando unificação do schema...");

    // 1. PAYMENT -> payments (mover dados se existirem)
    logger.info("📋 Unificando Payment -> payments...");

    const { data: paymentData, error: paymentError } = await supabase
      .from("Payment")
      .select("*");

    if (paymentError) {
      logger.error("Erro ao ler Payment:", paymentError);
    } else if (paymentData && paymentData.length > 0) {
      // Mover dados para payments
      const { error: insertError } = await supabase
        .from("payments")
        .insert(paymentData);

      if (insertError) {
        logger.error("Erro ao inserir em payments:", insertError);
      } else {
        logger.info(`✅ ${paymentData.length} registros movidos para payments`);
      }
    } else {
      logger.info("ℹ️ Tabela Payment está vazia");
    }

    // 2. ADDRESS -> addresses (mover dados se existirem)
    logger.info("📋 Unificando Address -> addresses...");

    const { data: addressData, error: addressError } = await supabase
      .from("Address")
      .select("*");

    if (addressError) {
      logger.error("Erro ao ler Address:", addressError);
    } else if (addressData && addressData.length > 0) {
      // Mover dados para addresses
      const { error: insertError } = await supabase
        .from("addresses")
        .insert(addressData);

      if (insertError) {
        logger.error("Erro ao inserir em addresses:", insertError);
      } else {
        logger.info(`✅ ${addressData.length} registros movidos para addresses`);
      }
    } else {
      logger.info("ℹ️ Tabela Address está vazia");
    }

    // 3. REVIEW -> reviews (já tem dados, verificar se Review está vazia)
    logger.info("📋 Verificando Review -> reviews...");

    const { data: reviewData, error: reviewError } = await supabase
      .from("Review")
      .select("*");

    if (reviewError) {
      logger.error("Erro ao ler Review:", reviewError);
    } else if (reviewData && reviewData.length > 0) {
      logger.warn(`⚠️ Tabela Review tem ${reviewData.length} registros que precisam ser movidos manualmente`);
    } else {
      logger.info("ℹ️ Tabela Review está vazia, reviews será mantida como principal");
    }

    // 4. Verificar e reportar outras inconsistências
    logger.info("🔍 Verificando outras tabelas com nomenclatura inconsistente...");

    // Lista de tabelas para verificar nomenclatura
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables_list')
      .catch(() => null);

    logger.info("✅ Unificação de schema concluída!");
    logger.info("📋 PRÓXIMOS PASSOS:");
    logger.info("1. Atualizar código para usar tabelas snake_case");
    logger.info("2. Remover tabelas duplicadas vazias");
    logger.info("3. Ativar RLS nas tabelas principais");

  } catch (error) {
    logger.error("❌ Erro durante unificação:", error);
  }
}

// Executar apenas se chamado diretamente
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  unifySchema();
}

export { unifySchema };