import { apiRateLimiter, authRateLimiter, searchRateLimiter, securityMonitor } from "@/utils/security";
import { applyCorsHeaders, handlePreflight } from "@/lib/cors";
import { logger } from "@/lib/logger";


// Função para obter IP do cliente
function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return "unknown";
}

// Função para obter identificador único do usuário
function getUserIdentifier(request: Request): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}_${userAgent.slice(0, 50)}`;
}

// Headers de segurança padrão
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https:;",
};

// Middleware de rate limiting
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  limiterType: "api" | "auth" | "search" = "api"
) {
  return async (request: Request) => {
    const identifier = getUserIdentifier(request);

    let limiter;
    switch (limiterType) {
      case "auth":
        limiter = authRateLimiter;
        break;
      case "search":
        limiter = searchRateLimiter;
        break;
      default:
        limiter = apiRateLimiter;
    }

    const result = limiter.check(identifier);

    if (!result.allowed) {
      logger.warn(`Rate limit exceeded for ${identifier} on ${request.url}`);

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: "Muitas requisições. Tente novamente mais tarde.",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": limiter["config"].maxRequests.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
          },
        }
      );
    }

    const response = await handler(request);

    // Adicionar headers de rate limit à resposta
    response.headers.set("X-RateLimit-Limit", limiter["config"].maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(result.resetTime).toISOString());

    return response;
  };
}

// Middleware de headers de segurança
export function withSecurityHeaders(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    const response = await handler(request);

    // Aplicar headers de segurança
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

// Middleware de validação de entrada
export function withInputValidation(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      // Verificar se é uma requisição com body
      if (["POST", "PUT", "PATCH"].includes(request.method)) {
        const contentType = request.headers.get("content-type");

        if (contentType?.includes("application/json")) {
          const body = await request.json();

          // Verificar cada campo do body por ataques
          const validateObject = (obj: any, path = ""): boolean => {
            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key;

              if (typeof value === "string") {
                // Detectar XSS
                if (securityMonitor.detectXSS(value)) {
                  logger.warn(`XSS attempt detected in ${currentPath}:`, value);
                  securityMonitor.logSuspiciousActivity("XSS_ATTEMPT", {
                    field: currentPath,
                    value,
                    ip: getClientIP(request),
                    userAgent: request.headers.get("user-agent"),
                    url: request.url,
                  });
                  return false;
                }

                // Detectar SQL Injection
                if (securityMonitor.detectSQLInjection(value)) {
                  logger.warn(`SQL injection attempt detected in ${currentPath}:`, value);
                  securityMonitor.logSuspiciousActivity("SQL_INJECTION_ATTEMPT", {
                    field: currentPath,
                    value,
                    ip: getClientIP(request),
                    userAgent: request.headers.get("user-agent"),
                    url: request.url,
                  });
                  return false;
                }
              } else if (typeof value === "object" && value !== null) {
                if (!validateObject(value, currentPath)) {
                  return false;
                }
              }
            }
            return true;
          };

          if (!validateObject(body)) {
            return new Response(JSON.stringify({ error: "Entrada inválida detectada" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Recriar request com body validado
          const newRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(body),
          });

          return handler(newRequest);
        }
      }

      return handler(request);
    } catch (error) {
      logger.error("Erro na validação de entrada:", error);
      return new Response(JSON.stringify({ error: "Erro na validação da requisição" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

// Middleware de logging de segurança
export function withSecurityLogging(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    const startTime = Date.now();
    const ip = getClientIP(request);
    const userAgent = request.headers.get("user-agent");

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;

      // Log requisições suspeitas (muito lentas ou com status de erro)
      if (duration > 5000 || response.status >= 400) {
        logger.warn("Requisição suspeita:", {
          method: request.method,
          url: request.url,
          status: response.status,
          duration,
          ip,
          userAgent,
        });
      }

      return response;
    } catch (error) {
      logger.error("Erro na requisição:", {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : "Unknown error",
        ip,
        userAgent,
      });

      throw error;
    }
  };
}

// Middleware combinado para máxima segurança
export function withFullSecurity(
  handler: (request: Request) => Promise<Response>,
  options: {
    rateLimit?: "api" | "auth" | "search";
    skipInputValidation?: boolean;
    skipSecurityHeaders?: boolean;
    skipLogging?: boolean;
  } = {}
) {
  return async (request: Request): Promise<Response> => {
    // Lidar com preflight CORS
    const preflightResponse = handlePreflight(request);
    if (preflightResponse) {
      return preflightResponse;
    }

    let wrappedHandler = handler;

    // Aplicar middlewares na ordem correta
    if (!options.skipLogging) {
      wrappedHandler = withSecurityLogging(wrappedHandler);
    }

    if (!options.skipInputValidation) {
      wrappedHandler = withInputValidation(wrappedHandler);
    }

    if (!options.skipSecurityHeaders) {
      wrappedHandler = withSecurityHeaders(wrappedHandler);
    }

    if (options.rateLimit) {
      wrappedHandler = withRateLimit(wrappedHandler, options.rateLimit);
    }

    const response = await wrappedHandler(request);

    // Aplicar CORS
    return applyCorsHeaders(request, response);
  };
}

// Helpers para aplicar middlewares específicos
export const withApiSecurity = (handler: (request: Request) => Promise<Response>) => {
  return async (request: Request): Promise<Response> => {
    // Lidar com preflight CORS
    const preflightResponse = handlePreflight(request);
    if (preflightResponse) {
      return preflightResponse;
    }

    const securedHandler = withFullSecurity(handler, { rateLimit: "api" });
    const response = await securedHandler(request);

    // Aplicar CORS
    return applyCorsHeaders(request, response);
  };
};

export const withAuthSecurity = (handler: (request: Request) => Promise<Response>) => {
  return async (request: Request): Promise<Response> => {
    // Lidar com preflight CORS
    const preflightResponse = handlePreflight(request);
    if (preflightResponse) {
      return preflightResponse;
    }

    const securedHandler = withFullSecurity(handler, { rateLimit: "auth" });
    const response = await securedHandler(request);

    // Aplicar CORS
    return applyCorsHeaders(request, response);
  };
};

export const withSearchSecurity = (handler: (request: Request) => Promise<Response>) => {
  return async (request: Request): Promise<Response> => {
    // Lidar com preflight CORS
    const preflightResponse = handlePreflight(request);
    if (preflightResponse) {
      return preflightResponse;
    }

    const securedHandler = withFullSecurity(handler, { rateLimit: "search" });
    const response = await securedHandler(request);

    // Aplicar CORS
    return applyCorsHeaders(request, response);
  };
};
