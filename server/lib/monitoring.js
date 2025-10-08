/**
 * Sistema de monitoramento para produção
 * Coleta métricas, monitora performance e detecta problemas
 */

import { logger } from "./logger.js";
import { supabase } from "./supabase-client.js";
import { cache } from "./cache.js";

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
      },
      database: {
        connections: 0,
        queryTime: 0,
        errors: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      memory: {
        used: 0,
        limit: process.memoryUsage().heapTotal,
      },
    };

    this.alerts = [];
    this.healthStatus = "healthy";

    // Iniciar coleta de métricas
    this.startMetricsCollection();
  }

  /**
   * Middleware para monitorar requisições
   */
  requestMonitoring() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Incrementar contador de requisições
      this.metrics.requests.total++;

      // Interceptar response para coletar métricas
      const originalSend = res.send;
      res.send = function (body) {
        const responseTime = Date.now() - startTime;

        // Atualizar métricas de resposta
        // Excluir 401 (autenticação) de erros reais para health check
        const isExpectedAuthError = res.statusCode === 401 && req.path.includes("/auth/login");

        if (res.statusCode >= 200 && res.statusCode < 400) {
          monitoring.metrics.requests.successful++;
        } else if (!isExpectedAuthError) {
          // Só contar como falha se não for erro esperado de autenticação
          monitoring.metrics.requests.failed++;
        }

        // Calcular tempo médio de resposta
        monitoring.updateAverageResponseTime(responseTime);

        // Log de requests lentos
        if (responseTime > 2000) {
          logger.warn(`Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`);
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Atualizar tempo médio de resposta
   */
  updateAverageResponseTime(responseTime) {
    const currentAvg = this.metrics.requests.averageResponseTime;
    const totalRequests = this.metrics.requests.total;

    this.metrics.requests.averageResponseTime = (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * Monitorar banco de dados
   */
  async monitorDatabase() {
    try {
      const startTime = Date.now();

      // Test connection
      const { data, error, count } = await supabase.from("users").select("id", { count: "exact" }).limit(1);

      const queryTime = Date.now() - startTime;
      this.metrics.database.queryTime = queryTime;

      if (error) {
        this.metrics.database.errors++;
        logger.error("Database monitoring error:", error);
      }

      // Database connection status
      if (queryTime > 5000) {
        this.addAlert("high_db_latency", `Database query time: ${queryTime}ms`);
      }
    } catch (error) {
      this.metrics.database.errors++;
      logger.error("Database monitoring failed:", error);
    }
  }

  /**
   * Monitorar cache
   */
  monitorCache() {
    try {
      const cacheStats = cache.getStats();

      this.metrics.cache.hits = cacheStats.hits;
      this.metrics.cache.misses = cacheStats.misses;
      this.metrics.cache.hitRate = parseFloat(cacheStats.hitRate) || 0;

      // Alert se hit rate for muito baixo
      if (this.metrics.cache.hitRate < 20 && cacheStats.hits + cacheStats.misses > 100) {
        this.addAlert("low_cache_hit_rate", `Cache hit rate: ${this.metrics.cache.hitRate}%`);
      }
    } catch (error) {
      logger.error("Cache monitoring failed:", error);
    }
  }

  /**
   * Monitorar uso de memória (otimizado)
   */
  monitorMemory() {
    const memoryUsage = process.memoryUsage();

    this.metrics.memory.used = memoryUsage.heapUsed;

    // Calcular porcentagem de uso
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Threshold aumentado para 95% (evitar alertas constantes em desenvolvimento)
    if (memoryUsagePercent > 95) {
      this.addAlert("high_memory_usage", `Memory usage: ${memoryUsagePercent.toFixed(2)}%`);
    }
  }

  /**
   * Adicionar alerta
   */
  addAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type),
    };

    this.alerts.push(alert);

    // Manter apenas últimos 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // Log critical alerts
    if (alert.severity === "critical") {
      logger.error(`CRITICAL ALERT: ${message}`);
    } else if (alert.severity === "warning") {
      logger.warn(`WARNING: ${message}`);
    }
  }

  /**
   * Determinar severidade do alerta
   */
  getAlertSeverity(type) {
    const severityMap = {
      high_memory_usage: "critical",
      high_db_latency: "warning",
      low_cache_hit_rate: "info",
      high_error_rate: "critical",
    };

    return severityMap[type] || "info";
  }

  /**
   * Verificar saúde geral do sistema
   */
  checkSystemHealth() {
    const criticalAlerts = this.alerts.filter(
      (alert) => alert.severity === "critical" && Date.now() - new Date(alert.timestamp).getTime() < 300000 // últimos 5 minutos
    );

    const memoryUsagePercent = (this.metrics.memory.used / this.metrics.memory.limit) * 100;
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;

    if (criticalAlerts.length > 0 || memoryUsagePercent > 90 || errorRate > 0.1) {
      this.healthStatus = "unhealthy";
    } else if (memoryUsagePercent > 70 || errorRate > 0.05) {
      this.healthStatus = "degraded";
    } else {
      this.healthStatus = "healthy";
    }

    return this.healthStatus;
  }

  /**
   * Obter métricas completas
   */
  getMetrics() {
    return {
      ...this.metrics,
      health: this.checkSystemHealth(),
      alerts: this.alerts.slice(-10), // últimos 10 alerts
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Iniciar coleta automática de métricas (modo otimizado)
   */
  startMetricsCollection() {
    // Coletar métricas menos frequentemente em produção
    const interval = process.env.NODE_ENV === "production" ? 300000 : 60000; // 5min em prod, 1min em dev

    this.monitoringInterval = setInterval(() => {
      this.monitorCache();
      this.monitorMemory();
      // Reduzir monitoramento de DB que estava causando problemas
      if (Math.random() > 0.7) {
        // Apenas 30% das vezes
        this.monitorDatabase();
      }
    }, interval);

    // Limpar alerts antigos menos frequentemente
    this.cleanupInterval = setInterval(() => {
      const tenMinutesAgo = Date.now() - 600000;
      this.alerts = this.alerts.filter((alert) => new Date(alert.timestamp).getTime() > tenMinutesAgo);
    }, 600000); // 10 minutos

    // Garbage collection forçado em produção para economizar memória
    if (process.env.NODE_ENV === "production" && global.gc) {
      this.gcInterval = setInterval(() => {
        const memBefore = process.memoryUsage().heapUsed;
        global.gc();
        const memAfter = process.memoryUsage().heapUsed;
        const freed = ((memBefore - memAfter) / 1024 / 1024).toFixed(2);
        logger.info(`🗑️ Garbage collection executado: ${freed}MB liberados`);
      }, 600000); // 10 minutos
    }

    logger.info("Monitoring service started (optimized mode)");
  }

  /**
   * Parar coleta de métricas
   */
  stopMetricsCollection() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }
    logger.info("Monitoring service stopped");
  }

  /**
   * Health check endpoint data
   */
  async getHealthCheck() {
    const health = this.checkSystemHealth();

    return {
      status: health,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        database: this.metrics.database.errors === 0 ? "healthy" : "unhealthy",
        cache: this.metrics.cache.hitRate > 0 ? "healthy" : "unknown",
      },
      metrics: {
        totalRequests: this.metrics.requests.total,
        errorRate: ((this.metrics.requests.failed / this.metrics.requests.total) * 100).toFixed(2) + "%",
        averageResponseTime: Math.round(this.metrics.requests.averageResponseTime) + "ms",
        memoryUsage: Math.round(this.metrics.memory.used / 1024 / 1024) + "MB",
      },
    };
  }
}

// Singleton instance
export const monitoring = new MonitoringService();

// Health check endpoint
export function healthCheckRoute() {
  return async (req, res) => {
    try {
      const healthData = await monitoring.getHealthCheck();
      const statusCode = healthData.status === "healthy" ? 200 : 503;

      res.status(statusCode).json(healthData);
    } catch (error) {
      logger.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

// Metrics endpoint
export function metricsRoute() {
  return (req, res) => {
    try {
      const metrics = monitoring.getMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error("Metrics collection failed:", error);
      res.status(500).json({
        error: "Failed to collect metrics",
        timestamp: new Date().toISOString(),
      });
    }
  };
}
