import express from "express";
import { authenticate, authenticateAdmin } from "../middleware/auth.js";
import { cache } from "../lib/cache.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

// GET /api/cache/stats - Estatísticas do cache (admin apenas)
router.get("/stats", authenticate, authenticateAdmin, async (req, res) => {
  try {
    const stats = cache.getStats();

    res.json({
      success: true,
      data: {
        ...stats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas do cache'
    });
  }
});

// DELETE /api/cache/clear - Limpar todo o cache (admin apenas)
router.delete("/clear", authenticate, authenticateAdmin, async (req, res) => {
  try {
    const success = await cache.flush();

    if (success) {
      logger.info('Cache limpo por admin:', req.user.email);
      res.json({
        success: true,
        message: 'Cache limpo com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Falha ao limpar cache'
      });
    }
  } catch (error) {
    logger.error('Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar cache'
    });
  }
});

// DELETE /api/cache/pattern/:pattern - Invalidar cache por padrão (admin apenas)
router.delete("/pattern/:pattern", authenticate, authenticateAdmin, async (req, res) => {
  try {
    const { pattern } = req.params;

    if (!pattern || pattern.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Padrão deve ter pelo menos 3 caracteres'
      });
    }

    const success = await cache.invalidatePattern(pattern);

    if (success) {
      logger.info('Cache invalidado por admin:', pattern, req.user.email);
      res.json({
        success: true,
        message: `Cache invalidado para padrão: ${pattern}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Falha ao invalidar cache'
      });
    }
  } catch (error) {
    logger.error('Erro ao invalidar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao invalidar cache'
    });
  }
});

// GET /api/cache/health - Health check do cache
router.get("/health", async (req, res) => {
  try {
    const testKey = 'cache:health:test';
    const testValue = { timestamp: Date.now() };

    // Testar set/get
    await cache.set(testKey, testValue, 10);
    const retrievedValue = await cache.get(testKey);
    await cache.del(testKey);

    const isWorking = retrievedValue && retrievedValue.timestamp === testValue.timestamp;

    res.json({
      success: true,
      data: {
        status: isWorking ? 'healthy' : 'degraded',
        type: cache.isRedis ? 'redis' : 'memory',
        test_passed: isWorking,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Health check do cache falhou:', error);
    res.status(500).json({
      success: false,
      error: 'Health check falhou',
      details: error.message
    });
  }
});

export default router;