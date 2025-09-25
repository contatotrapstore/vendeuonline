/**
 * Otimizador de queries para reduzir carga no banco e melhorar performance
 */

import { logger } from "./logger.js";

/**
 * Colunas específicas para consultas otimizadas
 */
export const OPTIMIZED_SELECTS = {
  // Produtos - campos essenciais para listagem
  PRODUCTS_LIST:
    "id, name, description, price, comparePrice, categoryId, storeId, stock, isActive, salesCount, createdAt",

  // Produtos - campos para detalhes
  PRODUCTS_DETAIL:
    "id, name, description, price, comparePrice, categoryId, storeId, stock, isActive, tags, seoTitle, seoDescription, salesCount, createdAt, updatedAt",

  // Lojas - campos essenciais para listagem
  STORES_LIST: "id, name, description, logo, isActive, createdAt, sellerId",

  // Lojas - campos para detalhes
  STORES_DETAIL: "id, name, description, logo, banner, phone, email, isActive, createdAt, updatedAt, sellerId",

  // Usuários - campos públicos (sem dados sensíveis)
  USERS_PUBLIC: "id, name, email, type, avatar, createdAt, isActive",

  // Pedidos - campos essenciais
  ORDERS_LIST: "id, total, status, paymentStatus, createdAt, userId, items",

  // Reviews - campos essenciais
  REVIEWS_LIST: "id, rating, comment, createdAt, userId, productId",

  // Categorias - campos essenciais
  CATEGORIES: "id, name, description, icon, isActive, productCount",
};

/**
 * Índices recomendados para otimização
 */
export const RECOMMENDED_INDEXES = {
  products: ["isActive", "categoryId", "storeId", "price", "createdAt", "salesCount"],
  stores: ["isActive", "sellerId"],
  orders: ["userId", "status", "paymentStatus", "createdAt"],
  reviews: ["productId", "userId", "rating", "createdAt"],
};

/**
 * Cria query otimizada com campos específicos
 */
export function createOptimizedQuery(supabaseClient, table, selectFields = "*") {
  const query = supabaseClient.from(table).select(selectFields, { count: "exact" });

  logger.debug(`Query otimizada: ${table} - campos: ${selectFields}`);
  return query;
}

/**
 * Aplica filtros comuns de forma otimizada
 */
export function applyCommonFilters(query, filters = {}) {
  // Filtro de ativo (mais comum)
  if (filters.active !== undefined) {
    query = query.eq("isActive", filters.active);
  }

  // Filtro de categoria
  if (filters.category) {
    query = query.eq("categoryId", filters.category);
  }

  // Filtro de preço (range)
  if (filters.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice);
  }

  // Filtro de loja
  if (filters.storeId) {
    query = query.eq("storeId", filters.storeId);
  }

  // Filtro de usuário
  if (filters.userId) {
    query = query.eq("userId", filters.userId);
  }

  // Filtro de status
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  return query;
}

/**
 * Aplica busca de texto otimizada
 */
export function applyTextSearch(query, searchTerm, searchFields = ["name"]) {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return query;
  }

  const cleanTerm = searchTerm.trim();

  // Para múltiplos campos, usa OR
  if (searchFields.length > 1) {
    const orConditions = searchFields.map((field) => `${field}.ilike.%${cleanTerm}%`).join(",");
    query = query.or(orConditions);
  } else {
    query = query.ilike(searchFields[0], `%${cleanTerm}%`);
  }

  logger.debug(`Busca de texto: ${cleanTerm} em ${searchFields.join(", ")}`);
  return query;
}

/**
 * Monitora performance de queries
 */
export function withQueryMetrics(queryName, queryFunction) {
  return async (...args) => {
    const startTime = Date.now();

    try {
      const result = await queryFunction(...args);
      const duration = Date.now() - startTime;

      logger.info(`Query ${queryName}: ${duration}ms - ${result.data?.length || 0} registros`);

      if (duration > 1000) {
        logger.warn(`Query lenta detectada: ${queryName} - ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Query falhou: ${queryName} - ${duration}ms - ${error.message}`);
      throw error;
    }
  };
}

/**
 * Cache de queries frequentes
 */
class QueryCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
    };
  }

  getCacheKey(table, filters, pagination) {
    return `${table}:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;
  }

  get(key) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() - entry.timestamp < 300000) {
        // 5 minutos
        this.stats.hits++;
        return entry.data;
      } else {
        this.cache.delete(key);
      }
    }
    this.stats.misses++;
    return null;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Limitar tamanho do cache
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
    };
  }
}

export const queryCache = new QueryCache();
