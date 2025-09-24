import express from "express";
import { healthCheckRoute, metricsRoute, monitoring } from "../lib/monitoring.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

// GET /api/health - Health check público
router.get("/", healthCheckRoute());

// GET /api/health/metrics - Métricas detalhadas (admin apenas)
router.get("/metrics", authenticateAdmin, metricsRoute());

// GET /api/health/status - Status simplificado
router.get("/status", async (req, res) => {
  try {
    const health = await monitoring.getHealthCheck();

    res.json({
      status: health.status,
      uptime: health.uptime,
      timestamp: health.timestamp
    });
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable'
    });
  }
});

export default router;