import express from "express";
import { healthCheckRoute, metricsRoute, monitoring } from "../lib/monitoring.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";
import { testSupabaseConnection } from "../lib/supabase-client.js";

const router = express.Router();

// GET /api/health - Health check público
router.get("/", async (req, res) => {
  try {
    const health = await monitoring.getHealthCheck();
    res.status(200).json({
      status: "healthy",
      ...health,
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      error: error.message || "Unknown error",
      message: "Service temporarily unavailable",
    });
  }
});

// GET /api/health/metrics - Métricas detalhadas (admin apenas)
router.get("/metrics", authenticateAdmin, metricsRoute());

// GET /api/health/status - Status simplificado
router.get("/status", async (req, res) => {
  try {
    const health = await monitoring.getHealthCheck();

    res.json({
      status: health.status,
      uptime: health.uptime,
      timestamp: health.timestamp,
    });
  } catch (error) {
    logger.error("Status check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      error: "Service unavailable",
    });
  }
});

// GET /api/health/keep-alive - Endpoint para manter servidor ativo (Render free tier)
router.get("/keep-alive", async (req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
      message: "Server is warm and ready",
    });
  } catch (error) {
    logger.error("Keep-alive check failed:", error);
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
      message: "Server responding but with errors",
    });
  }
});

// GET /api/health/db - Health check específico do banco de dados
router.get("/db", async (req, res) => {
  const startTime = Date.now();

  try {
    logger.info("🏥 Iniciando health check do banco de dados");

    // Verificar variáveis de ambiente
    const envVars = {
      supabaseUrl: !!(
        process.env.SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL
      ),
      supabaseAnonKey: !!(
        process.env.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY
      ),
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      databaseUrl: !!process.env.DATABASE_URL,
      jwtSecret: !!process.env.JWT_SECRET,
    };

    // Testar conexão com Supabase
    const connectionTest = await testSupabaseConnection();
    const responseTime = Date.now() - startTime;

    const allEnvConfigured = Object.values(envVars).every((v) => v === true);
    const isHealthy = connectionTest && allEnvConfigured;

    const response = {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        connection: connectionTest ? "connected" : "disconnected",
        type: "Supabase PostgreSQL",
      },
      environment: {
        configured: allEnvConfigured,
        missing: Object.entries(envVars)
          .filter(([_, value]) => !value)
          .map(([key]) => key),
      },
      nodeEnv: process.env.NODE_ENV || "development",
    };

    const statusCode = isHealthy ? 200 : 503;
    logger.info(`✅ Health check concluído: ${response.status} (${responseTime}ms)`);

    res.status(statusCode).json(response);
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error("❌ Health check do banco falhou:", {
      message: error.message,
      responseTime: `${responseTime}ms`,
    });

    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: "Database connection failed",
      message: error.message,
    });
  }
});

export default router;
