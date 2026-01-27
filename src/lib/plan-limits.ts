import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";


// Definição dos limites de cada plano
export const PLAN_LIMITS = {
  GRATUITO: {
    maxProducts: 1,
    maxPhotosPerProduct: 5,
    productDuration: 30, // dias
    features: ["basic_stats", "email_support"],
  },
  MICRO_EMPRESA: {
    maxProducts: 2,
    maxPhotosPerProduct: 6,
    productDuration: 30,
    features: ["basic_stats", "email_support", "priority_support"],
  },
  PEQUENA_EMPRESA: {
    maxProducts: 5,
    maxPhotosPerProduct: 10,
    productDuration: 30,
    features: ["detailed_stats", "chat_support", "store_logo"],
  },
  EMPRESA_SIMPLES: {
    maxProducts: 10,
    maxPhotosPerProduct: 15,
    productDuration: 30,
    features: ["advanced_stats", "chat_support", "custom_store"],
  },
  EMPRESA_PLUS: {
    maxProducts: 20,
    maxPhotosPerProduct: 20,
    productDuration: 30,
    features: ["premium_stats", "dedicated_support", "custom_store", "priority_listing"],
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

// Tipos de features disponíveis
export type FeatureType =
  | "basic_stats"
  | "email_support"
  | "priority_support"
  | "detailed_stats"
  | "chat_support"
  | "store_logo"
  | "advanced_stats"
  | "custom_store"
  | "premium_stats"
  | "dedicated_support"
  | "priority_listing";

// Interface para validação de limites
export interface PlanValidation {
  valid: boolean;
  error?: string;
  currentUsage?: number;
  limit?: number;
}

// Classe para gerenciar limitações de planos
export class PlanLimitValidator {
  // Validar se vendedor pode criar novo produto
  static async validateProductCreation(sellerId: string): Promise<PlanValidation> {
    try {
      // Buscar vendedor com plano atual
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: {
          plan: {
            select: {
              slug: true,
            },
          },
        },
      });

      if (!seller || !seller.plan) {
        return { valid: false, error: "Vendedor não encontrado ou sem plano" };
      }

      const planSlug = seller.plan.slug.toUpperCase() as PlanType;
      const planLimits = PLAN_LIMITS[planSlug];
      if (!planLimits) {
        return { valid: false, error: "Plano inválido" };
      }

      // Contar produtos ativos do vendedor
      const activeProducts = await prisma.product.count({
        where: {
          sellerId: sellerId,
          isActive: true,
        },
      });

      if (activeProducts >= planLimits.maxProducts) {
        return {
          valid: false,
          error: `Limite de produtos atingido. Seu plano permite apenas ${planLimits.maxProducts} produto(s) simultâneo(s).`,
          currentUsage: activeProducts,
          limit: planLimits.maxProducts,
        };
      }

      return {
        valid: true,
        currentUsage: activeProducts,
        limit: planLimits.maxProducts,
      };
    } catch (error) {
      logger.error("Erro ao validar criação de produto:", error);
      return { valid: false, error: "Erro interno na validação" };
    }
  }

  // Validar número de fotos no produto
  static validateProductPhotos(plan: PlanType, photoCount: number): PlanValidation {
    const planLimits = PLAN_LIMITS[plan];

    if (photoCount > planLimits.maxPhotosPerProduct) {
      return {
        valid: false,
        error: `Limite de fotos excedido. Seu plano permite apenas ${planLimits.maxPhotosPerProduct} foto(s) por produto.`,
        currentUsage: photoCount,
        limit: planLimits.maxPhotosPerProduct,
      };
    }

    return {
      valid: true,
      currentUsage: photoCount,
      limit: planLimits.maxPhotosPerProduct,
    };
  }

  // Buscar estatísticas de uso do plano
  static async getPlanUsage(sellerId: string) {
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: {
          plan: {
            select: {
              slug: true,
            },
          },
        },
      });

      if (!seller || !seller.plan) {
        throw new Error("Vendedor não encontrado ou sem plano");
      }

      const planSlug = seller.plan.slug.toUpperCase() as PlanType;
      const planLimits = PLAN_LIMITS[planSlug];

      // Contar recursos em uso
      const activeProducts = await prisma.product.count({
        where: {
          sellerId: sellerId,
          isActive: true,
        },
      });

      // Buscar produto com mais fotos para estatística
      const productWithMostPhotos = await prisma.product.findFirst({
        where: { sellerId },
        include: { images: true },
        orderBy: {
          images: {
            _count: "desc",
          },
        },
      });

      const maxPhotosUsed = productWithMostPhotos?.images?.length || 0;

      return {
        plan: planSlug,
        limits: planLimits,
        usage: {
          products: {
            used: activeProducts,
            limit: planLimits.maxProducts,
            percentage: Math.round((activeProducts / planLimits.maxProducts) * 100),
          },
          photos: {
            maxUsed: maxPhotosUsed,
            limit: planLimits.maxPhotosPerProduct,
            percentage: Math.round((maxPhotosUsed / planLimits.maxPhotosPerProduct) * 100),
          },
        },
        features: planLimits.features,
      };
    } catch (error) {
      logger.error("Erro ao buscar uso do plano:", error);
      throw error;
    }
  }

  // Verificar se vendedor tem acesso a uma funcionalidade
  static async hasFeatureAccess(sellerId: string, feature: FeatureType): Promise<boolean> {
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: {
          plan: {
            select: {
              slug: true,
            },
          },
        },
      });

      if (!seller || !seller.plan) return false;

      const planSlug = seller.plan.slug.toUpperCase() as PlanType;
      const planLimits = PLAN_LIMITS[planSlug];
      if (!planLimits) return false;
      return (planLimits.features as readonly FeatureType[]).includes(feature);
    } catch (error) {
      logger.error("Erro ao verificar acesso à funcionalidade:", error);
      return false;
    }
  }
}

// Middleware para validar limites de plano
export function withPlanValidation(
  validationType: "product_creation" | "product_photos",
  options?: { photoCount?: number }
) {
  return async (sellerId: string): Promise<PlanValidation> => {
    switch (validationType) {
      case "product_creation":
        return await PlanLimitValidator.validateProductCreation(sellerId);

      case "product_photos":
        if (!options?.photoCount) {
          return { valid: false, error: "Número de fotos não especificado" };
        }
        // Primeiro precisamos buscar o plano do vendedor
        const seller = await prisma.seller.findUnique({
          where: { id: sellerId },
          select: {
            plan: {
              select: {
                slug: true,
              },
            },
          },
        });
        if (!seller || !seller.plan) {
          return { valid: false, error: "Vendedor não encontrado ou sem plano" };
        }
        const planSlug = seller.plan.slug.toUpperCase() as PlanType;
        return PlanLimitValidator.validateProductPhotos(planSlug, options.photoCount);

      default:
        return { valid: false, error: "Tipo de validação inválido" };
    }
  };
}

export default PlanLimitValidator;
