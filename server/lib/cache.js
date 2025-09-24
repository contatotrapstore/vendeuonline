import NodeCache from "node-cache";
import { logger } from "./logger.js";

/**
 * Sistema de cache inteligente com fallback
 * Usa Redis se disponível, senão usa cache em memória
 */

// Cache em memória como fallback
const memoryCache = new NodeCache({
  stdTTL: 600, // 10 minutos padrão
  checkperiod: 120, // Verificar itens expirados a cada 2 minutos
  useClones: false // Performance
});

let redisClient = null;
let cacheType = 'memory';

// Tentar conectar com Redis (opcional)
async function initializeRedis() {
  try {
    // Só tenta conectar se a URL do Redis estiver definida
    if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
      const { createClient } = await import('redis');

      redisClient = createClient({
        url: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
      });

      await redisClient.connect();
      cacheType = 'redis';
      logger.info('✅ Cache Redis conectado');
    } else {
      logger.info('ℹ️ Redis não configurado, usando cache em memória');
    }
  } catch (error) {
    logger.warn('⚠️ Redis não disponível, usando cache em memória:', error.message);
    cacheType = 'memory';
  }
}

// Cache universal
export class CacheManager {
  constructor() {
    this.isRedis = cacheType === 'redis';
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  // Obter valor do cache
  async get(key) {
    try {
      let value;

      if (this.isRedis && redisClient) {
        value = await redisClient.get(key);
        if (value) value = JSON.parse(value);
      } else {
        value = memoryCache.get(key);
      }

      if (value !== undefined) {
        this.stats.hits++;
        logger.debug('Cache HIT:', key);
        return value;
      } else {
        this.stats.misses++;
        logger.debug('Cache MISS:', key);
        return null;
      }
    } catch (error) {
      logger.error('Erro ao ler cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  // Definir valor no cache
  async set(key, value, ttl = 600) {
    try {
      if (this.isRedis && redisClient) {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
      } else {
        memoryCache.set(key, value, ttl);
      }

      this.stats.sets++;
      logger.debug('Cache SET:', key, `TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Erro ao definir cache:', error);
      return false;
    }
  }

  // Deletar chave específica
  async del(key) {
    try {
      if (this.isRedis && redisClient) {
        await redisClient.del(key);
      } else {
        memoryCache.del(key);
      }
      logger.debug('Cache DEL:', key);
      return true;
    } catch (error) {
      logger.error('Erro ao deletar cache:', error);
      return false;
    }
  }

  // Invalidar cache por padrão
  async invalidatePattern(pattern) {
    try {
      if (this.isRedis && redisClient) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
          logger.debug('Cache invalidado (Redis):', pattern, `${keys.length} keys`);
        }
      } else {
        // Para NodeCache, invalida todas as chaves que contêm o padrão
        const keys = memoryCache.keys().filter(key =>
          key.includes(pattern.replace('*', ''))
        );
        keys.forEach(key => memoryCache.del(key));
        logger.debug('Cache invalidado (Memory):', pattern, `${keys.length} keys`);
      }
      return true;
    } catch (error) {
      logger.error('Erro ao invalidar cache:', error);
      return false;
    }
  }

  // Limpar todo o cache
  async flush() {
    try {
      if (this.isRedis && redisClient) {
        await redisClient.flushAll();
      } else {
        memoryCache.flushAll();
      }
      logger.info('Cache totalmente limpo');
      return true;
    } catch (error) {
      logger.error('Erro ao limpar cache:', error);
      return false;
    }
  }

  // Obter estatísticas
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 ?
      (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) : 0;

    return {
      type: cacheType,
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryKeys: !this.isRedis ? memoryCache.keys().length : 'N/A'
    };
  }
}

// Instância singleton
export const cache = new CacheManager();

// Chaves de cache padronizadas
export const CACHE_KEYS = {
  // Produtos
  PRODUCTS_LIST: (page, limit, filters) =>
    `products:list:${page}:${limit}:${JSON.stringify(filters)}`,
  PRODUCT_DETAIL: (id) => `product:${id}`,
  PRODUCT_SEARCH: (query, filters) =>
    `products:search:${query}:${JSON.stringify(filters)}`,

  // Categorias
  CATEGORIES_LIST: () => 'categories:list',
  CATEGORY_PRODUCTS: (categoryId, page) => `category:${categoryId}:products:${page}`,

  // Lojas
  STORES_LIST: (page, limit) => `stores:list:${page}:${limit}`,
  STORE_DETAIL: (id) => `store:${id}`,
  STORE_PRODUCTS: (storeId, page) => `store:${storeId}:products:${page}`,

  // Usuários (dados não sensíveis)
  USER_PROFILE: (id) => `user:profile:${id}`,
  USER_ORDERS: (id, page) => `user:${id}:orders:${page}`,

  // Analytics (cache longo)
  ANALYTICS_DAILY: (date) => `analytics:daily:${date}`,
  POPULAR_PRODUCTS: () => 'products:popular',
  TRENDING_SEARCHES: () => 'searches:trending'
};

// TTL padrões (em segundos)
export const CACHE_TTL = {
  SHORT: 300,    // 5 minutos
  MEDIUM: 1800,  // 30 minutos
  LONG: 3600,    // 1 hora
  DAILY: 86400   // 24 horas
};

// Middleware para cache automático
export const cacheMiddleware = (keyGenerator, ttl = CACHE_TTL.MEDIUM) => {
  return async (req, res, next) => {
    try {
      const cacheKey = typeof keyGenerator === 'function' ?
        keyGenerator(req) : keyGenerator;

      // Tentar buscar do cache
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        logger.debug('Resposta do cache:', cacheKey);
        return res.json(cachedData);
      }

      // Interceptar res.json para cachear
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Só cachear respostas de sucesso
        if (res.statusCode === 200 && data.success !== false) {
          cache.set(cacheKey, data, ttl);
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Erro no middleware de cache:', error);
      next(); // Continuar sem cache
    }
  };
};

// Inicializar cache na importação
initializeRedis();

// Cleanup graceful
process.on('SIGINT', async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Cache Redis desconectado');
  }
});

export default cache;