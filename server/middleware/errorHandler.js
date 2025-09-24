import { AppError, createPrismaError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";


/**
 * Middleware global de tratamento de erros
 * Deve ser o último middleware da aplicação
 */
export const globalErrorHandler = (error, req, res, next) => {
  let appError = error;

  // Converter erros do Prisma em AppErrors
  if (error.code && error.code.startsWith("P")) {
    appError = createPrismaError(error);
  }

  // Se não é um AppError, criar um genérico
  if (!(appError instanceof AppError)) {
    appError = new AppError(
      process.env.NODE_ENV === "production" ? "Erro interno do servidor" : error.message || "Erro desconhecido",
      500,
      "INTERNAL_ERROR"
    );
  }

  // Log do erro (estruturado)
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      stack: process.env.NODE_ENV !== "production" ? appError.stack : undefined,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?.userId || null,
    },
    correlationId: req.correlationId || null,
  };

  // Log baseado na severidade
  if (appError.statusCode >= 500) {
    logger.error("🚨 [ERROR]", JSON.stringify(errorLog, null, 2));
  } else if (appError.statusCode >= 400) {
    logger.warn("⚠️ [WARN]", JSON.stringify(errorLog, null, 2));
  } else {
    console.info("ℹ️ [INFO]", JSON.stringify(errorLog, null, 2));
  }

  // Resposta para o cliente
  const response = {
    success: false,
    error: appError.message,
    code: appError.code,
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId || null,
  };

  // Incluir detalhes apenas em desenvolvimento ou para erros de validação
  if (process.env.NODE_ENV !== "production" || appError.statusCode < 500) {
    if (appError.details) {
      response.details = appError.details;
    }
  }

  // Incluir stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV === "development") {
    response.stack = appError.stack;
  }

  res.status(appError.statusCode).json(response);
};

/**
 * Middleware para capturar erros 404
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Rota ${req.originalUrl} não encontrada`, 404, "ROUTE_NOT_FOUND");
  next(error);
};

/**
 * Middleware para adicionar correlation ID às requisições
 */
export const correlationIdMiddleware = (req, res, next) => {
  req.correlationId = req.headers["x-correlation-id"] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  res.setHeader("X-Correlation-ID", req.correlationId);
  next();
};

/**
 * Wrapper para rotas assíncronas
 * Automaticamente captura erros e os passa para o middleware de erro
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para validar dados com Zod
 */
export const validateSchema = (schema, source = "body") => {
  return asyncHandler(async (req, res, next) => {
    try {
      const data = req[source];
      const validated = await schema.parseAsync(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error.errors) {
        // Erro de validação do Zod
        const details = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          value: err.received,
        }));

        throw new AppError("Dados de entrada inválidos", 400, "VALIDATION_ERROR", details);
      }
      throw error;
    }
  });
};

/**
 * Middleware para retry em operações de banco de dados
 */
export const withRetry = (operation, maxRetries = 3, delay = 1000) => {
  return async (...args) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation(...args);
      } catch (error) {
        lastError = error;

        // Não fazer retry para erros de validação ou negócio
        if (error instanceof AppError && error.statusCode < 500) {
          throw error;
        }

        // Não fazer retry se é a última tentativa
        if (attempt === maxRetries) {
          break;
        }

        logger.warn(`🔄 Retry ${attempt}/${maxRetries} for operation failed:`, error.message);

        // Delay exponencial
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError;
  };
};
