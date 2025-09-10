import { getUserFromToken } from "./auth";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<Response>,
  requiredUserType?: string[]
) {
  return async (request: Request) => {
    try {
      const user = await getUserFromToken(request);

      if (!user) {
        return new Response(JSON.stringify({ error: "Token de autenticação necessário" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verificar tipo de usuário se especificado
      if (requiredUserType && !requiredUserType.includes(user.type)) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Adicionar usuário ao request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      return handler(authenticatedRequest);
    } catch (error) {
      console.error("Erro no middleware de autenticação:", error);
      return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

export function requireAuth(requiredUserType?: string[]) {
  return (handler: (request: AuthenticatedRequest) => Promise<Response>) => {
    return withAuth(handler, requiredUserType);
  };
}

// Função helper para autenticação simples
export async function authMiddleware(request: Request) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return {
        success: false,
        error: "Token de autenticação necessário",
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("Erro no middleware de autenticação:", error);
    return {
      success: false,
      error: "Token inválido",
    };
  }
}

// Middleware específicos para tipos de usuário
export const requireBuyer = requireAuth(["BUYER"]);
export const requireSeller = requireAuth(["SELLER"]);
export const requireAdmin = requireAuth(["ADMIN"]);
export const requireSellerOrAdmin = requireAuth(["SELLER", "ADMIN"]);
