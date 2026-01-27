/**
 * PostgreSQL Direct Client
 *
 * Usa conexão direta ao PostgreSQL para operações que não funcionam via REST API
 * devido a problemas com a service_role key
 */

import pg from 'pg';
import logger from './logger.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error:', err);
});

/**
 * Executa query SQL diretamente no PostgreSQL
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Result object with rows
 */
export async function query(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    logger.error('PostgreSQL query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cancela assinaturas ativas de um seller
 * @param {string} sellerId - ID do seller
 * @returns {Promise<void>}
 */
export async function cancelActiveSubscriptions(sellerId) {
  const sql = `
    UPDATE "Subscription"
    SET status = 'CANCELLED', "updatedAt" = NOW()
    WHERE "sellerId" = $1 AND status = 'ACTIVE'
    RETURNING id
  `;

  const result = await query(sql, [sellerId]);
  logger.info(`[PG] Canceladas ${result.rowCount} assinaturas ativas para seller ${sellerId}`);
  return result.rows;
}

/**
 * Cria nova assinatura
 * @param {Object} data - Dados da assinatura
 * @returns {Promise<Object>} Nova assinatura criada
 */
export async function createSubscription(data) {
  const { sellerId, planId, status, startDate, endDate, autoRenew } = data;

  const sql = `
    INSERT INTO "Subscription" (
      "sellerId", "planId", status, "startDate", "endDate", "autoRenew", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *
  `;

  const result = await query(sql, [
    sellerId,
    planId,
    status,
    startDate,
    endDate,
    autoRenew
  ]);

  if (result.rows.length === 0) {
    throw new Error('Falha ao criar assinatura');
  }

  logger.info(`[PG] ✅ Assinatura criada com sucesso: ${result.rows[0].id}`);
  return result.rows[0];
}

/**
 * Busca assinatura ativa de um seller
 * @param {string} sellerId - ID do seller
 * @returns {Promise<Object|null>} Assinatura ativa ou null
 */
export async function getActiveSubscription(sellerId) {
  const sql = `
    SELECT * FROM "Subscription"
    WHERE "sellerId" = $1 AND status = 'ACTIVE'
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  const result = await query(sql, [sellerId]);
  return result.rows[0] || null;
}

export default {
  query,
  cancelActiveSubscriptions,
  createSubscription,
  getActiveSubscription,
};
