/**
 * Sistema de monitoramento para produção
 * Coleta métricas, monitora performance e detecta problemas
 */

import { logger } from './logger.js';
import { supabase } from './supabase-client.js';
import { cache } from './cache.js';

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      database: {
        connections: 0,
        queryTime: 0,
        errors: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      memory: {
        used: 0,
        limit: process.memoryUsage().heapTotal
      }
    };

    this.alerts = [];
    this.healthStatus = 'healthy';

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
      res.send = function(body) {
        const responseTime = Date.now() - startTime;

        // Atualizar métricas de resposta
        if (res.statusCode >= 200 && res.statusCode < 400) {
          monitoring.metrics.requests.successful++;
        } else {
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

    this.metrics.requests.averageResponseTime =
      ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  /**
   * Monitorar banco de dados
   */
  async monitorDatabase() {
    try {
      const startTime = Date.now();

      // Test connection
      const { data, error } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact' })
        .limit(1);

      const queryTime = Date.now() - startTime;
      this.metrics.database.queryTime = queryTime;

      if (error) {
        this.metrics.database.errors++;
        logger.error('Database monitoring error:', error);
      }

      // Database connection status
      if (queryTime > 5000) {
        this.addAlert('high_db_latency', `Database query time: ${queryTime}ms`);
      }

    } catch (error) {
      this.metrics.database.errors++;
      logger.error('Database monitoring failed:', error);
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
      if (this.metrics.cache.hitRate < 20 && (cacheStats.hits + cacheStats.misses) > 100) {
        this.addAlert('low_cache_hit_rate', `Cache hit rate: ${this.metrics.cache.hitRate}%`);
      }

    } catch (error) {
      logger.error('Cache monitoring failed:', error);
    }
  }

  /**
   * Monitorar uso de memória
   */
  monitorMemory() {
    const memoryUsage = process.memoryUsage();

    this.metrics.memory.used = memoryUsage.heapUsed;

    // Calcular porcentagem de uso
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    if (memoryUsagePercent > 85) {
      this.addAlert('high_memory_usage', `Memory usage: ${memoryUsagePercent.toFixed(2)}%`);
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
      severity: this.getAlertSeverity(type)
    };

    this.alerts.push(alert);

    // Manter apenas últimos 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    // Log critical alerts
    if (alert.severity === 'critical') {
      logger.error(`CRITICAL ALERT: ${message}`);
    } else if (alert.severity === 'warning') {
      logger.warn(`WARNING: ${message}`);
    }
  }

  /**
   * Determinar severidade do alerta
   */
  getAlertSeverity(type) {
    const severityMap = {
      high_memory_usage: 'critical',
      high_db_latency: 'warning',
      low_cache_hit_rate: 'info',
      high_error_rate: 'critical'
    };

    return severityMap[type] || 'info';
  }

  /**
   * Verificar saúde geral do sistema
   */
  checkSystemHealth() {
    const criticalAlerts = this.alerts.filter(alert =>
      alert.severity === 'critical' &&
      Date.now() - new Date(alert.timestamp).getTime() < 300000 // últimos 5 minutos
    );

    const memoryUsagePercent = (this.metrics.memory.used / this.metrics.memory.limit) * 100;
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;

    if (criticalAlerts.length > 0 || memoryUsagePercent > 90 || errorRate > 0.1) {
      this.healthStatus = 'unhealthy';
    } else if (memoryUsagePercent > 70 || errorRate > 0.05) {
      this.healthStatus = 'degraded';
    } else {
      this.healthStatus = 'healthy';
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
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Iniciar coleta automática de métricas
   */
  startMetricsCollection() {
    // Coletar métricas a cada 30 segundos
    setInterval(() => {
      this.monitorDatabase();
      this.monitorCache();
      this.monitorMemory();
    }, 30000);

    // Limpar alerts antigos a cada 5 minutos
    setInterval(() => {
      const fiveMinutesAgo = Date.now() - 300000;
      this.alerts = this.alerts.filter(alert =>
        new Date(alert.timestamp).getTime() > fiveMinutesAgo
      );
    }, 300000);

    logger.info('Monitoring service started');
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
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: this.metrics.database.errors === 0 ? 'healthy' : 'unhealthy',
        cache: this.metrics.cache.hitRate > 0 ? 'healthy' : 'unknown'
      },
      metrics: {
        totalRequests: this.metrics.requests.total,
        errorRate: ((this.metrics.requests.failed / this.metrics.requests.total) * 100).toFixed(2) + '%',
        averageResponseTime: Math.round(this.metrics.requests.averageResponseTime) + 'ms',
        memoryUsage: Math.round((this.metrics.memory.used / 1024 / 1024)) + 'MB'
      }
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
      const statusCode = healthData.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json(healthData);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
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
      logger.error('Metrics collection failed:', error);
      res.status(500).json({
        error: 'Failed to collect metrics',
        timestamp: new Date().toISOString()
      });
    }
  };
}