/**
 * Sistema de cache inteligente para dados da aplicação
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

interface CacheOptions {
  ttl?: number; // Time to live em ms (padrão: 5 min)
  maxSize?: number; // Tamanho máximo do cache (padrão: 100)
  persistToLocalStorage?: boolean; // Salvar no localStorage
}

class Cache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutos
  private maxSize = 100;
  private persistToLocalStorage = true;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL;
    this.maxSize = options.maxSize || this.maxSize;
    this.persistToLocalStorage = options.persistToLocalStorage !== false;

    // Carregar cache do localStorage se habilitado
    if (this.persistToLocalStorage) {
      this.loadFromLocalStorage();
    }

    // Limpeza periódica de items expirados
    setInterval(() => this.cleanup(), 60000); // A cada minuto
  }

  private generateKey(prefix: string, params?: Record<string, any>): string {
    if (!params) return prefix;
    
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('app-cache');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, entry]) => {
          const cacheEntry = entry as CacheEntry<any>;
          if (cacheEntry.expiresAt > Date.now()) {
            this.cache.set(key, cacheEntry);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    if (!this.persistToLocalStorage) return;

    try {
      const data: Record<string, CacheEntry<any>> = {};
      this.cache.forEach((entry, key) => {
        data[key] = entry;
      });
      localStorage.setItem('app-cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
      this.saveToLocalStorage();
    }
  }

  private evictOldest(): void {
    if (this.cache.size === 0) return;

    let oldestKey = '';
    let oldestTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Se cache está cheio, remover o mais antigo
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL),
      key
    };

    this.cache.set(key, entry);
    this.saveToLocalStorage();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar se expirou
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.saveToLocalStorage();
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.saveToLocalStorage();
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.saveToLocalStorage();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.saveToLocalStorage();
  }

  // Métodos específicos para produtos
  setProducts(params: Record<string, any>, data: any, ttl?: number): void {
    const key = this.generateKey('products', params);
    this.set(key, data, ttl);
  }

  getProducts(params: Record<string, any>): any | null {
    const key = this.generateKey('products', params);
    return this.get(key);
  }

  // Métodos específicos para lojas
  setStores(params: Record<string, any>, data: any, ttl?: number): void {
    const key = this.generateKey('stores', params);
    this.set(key, data, ttl);
  }

  getStores(params: Record<string, any>): any | null {
    const key = this.generateKey('stores', params);
    return this.get(key);
  }

  // Métodos específicos para planos
  setPlans(data: any, ttl?: number): void {
    this.set('plans', data, ttl || 10 * 60 * 1000); // Planos podem ficar em cache por mais tempo
  }

  getPlans(): any | null {
    return this.get('plans');
  }

  // Invalidar cache relacionado a um produto específico
  invalidateProduct(productId: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (key.includes('products') || key.includes(`product:${productId}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
  }

  // Invalidar cache relacionado a uma loja específica
  invalidateStore(storeId: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (key.includes('stores') || key.includes(`store:${storeId}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
  }

  // Estatísticas do cache
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    let oldest: CacheEntry<any> | null = null;
    let newest: CacheEntry<any> | null = null;

    this.cache.forEach(entry => {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = entry;
      }
      if (!newest || entry.timestamp > newest.timestamp) {
        newest = entry;
      }
    });

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // TODO: Implementar tracking de hit rate
      oldestEntry: oldest?.key || null,
      newestEntry: newest?.key || null
    };
  }
}

// Instância global do cache
export const appCache = new Cache({
  ttl: 5 * 60 * 1000, // 5 minutos para a maioria dos dados
  maxSize: 200, // Aumentar um pouco o limite
  persistToLocalStorage: true
});

// Hook para usar o cache em componentes React
export const useCache = () => {
  return {
    cache: appCache,
    getStats: () => appCache.getStats(),
    clearCache: () => appCache.clear()
  };
};

export default appCache;