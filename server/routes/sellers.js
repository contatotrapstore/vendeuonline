import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { supabase } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";
import { NotFoundError, AuthorizationError } from "../lib/errors.js";

const router = express.Router();

/**
 * GET /api/sellers/settings
 * Retorna as configurações do vendedor
 */
router.get("/settings", authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Buscar seller pelo userId
    let { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", userId)
      .single();

    // Se seller não existir, criar automaticamente
    if (sellerError || !seller) {
      logger.info(`Criando registro de seller automaticamente para userId: ${userId}`);

      const { data: newSeller, error: createError } = await supabase
        .from("sellers")
        .insert({
          userId: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError || !newSeller) {
        logger.error("Erro ao criar seller:", createError);
        throw new NotFoundError("Erro ao criar perfil de vendedor. Por favor, contate o suporte.");
      }

      seller = newSeller;
      logger.info(`Seller criado com sucesso: ${seller.id}`);
    }

    // Buscar configurações do seller
    const { data: settings, error: settingsError } = await supabase
      .from("seller_settings")
      .select("*")
      .eq("sellerId", seller.id)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      // PGRST116 = not found
      logger.error("Erro ao buscar configurações do seller:", settingsError);
      throw new Error("Erro ao buscar configurações");
    }

    // Se não existir, retornar configurações padrão
    if (!settings) {
      return res.json({
        success: true,
        data: {
          sellerId: seller.id,
          paymentMethods: {
            pix: true,
            boleto: false,
            paypal: false,
            creditCard: true,
          },
          shippingOptions: {
            pac: true,
            sedex: true,
            freeShipping: false,
            expressDelivery: false,
          },
          notifications: {
            smsOrders: false,
            emailOrders: true,
            emailPromotions: false,
            pushNotifications: true,
          },
          storePolicies: {
            returnPolicy: "7 dias para devolução",
            privacyPolicy: "Seus dados estão seguros conosco",
            shippingPolicy: "Envio em até 2 dias úteis",
          },
        },
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/sellers/settings
 * Atualiza as configurações do vendedor
 */
router.put("/settings", authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      paymentMethods,
      shippingOptions,
      notifications,
      storePolicies,
    } = req.body;

    // Buscar seller pelo userId
    let { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", userId)
      .single();

    // Se seller não existir, criar automaticamente
    if (sellerError || !seller) {
      logger.info(`Criando registro de seller automaticamente para userId: ${userId}`);

      const { data: newSeller, error: createError } = await supabase
        .from("sellers")
        .insert({
          userId: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError || !newSeller) {
        logger.error("Erro ao criar seller:", createError);
        throw new NotFoundError("Erro ao criar perfil de vendedor. Por favor, contate o suporte.");
      }

      seller = newSeller;
      logger.info(`Seller criado com sucesso: ${seller.id}`);
    }

    // Verificar se já existem configurações
    const { data: existingSettings } = await supabase
      .from("seller_settings")
      .select("id")
      .eq("sellerId", seller.id)
      .single();

    let result;

    if (existingSettings) {
      // Atualizar configurações existentes
      const { data, error } = await supabase
        .from("seller_settings")
        .update({
          paymentMethods,
          shippingOptions,
          notifications,
          storePolicies,
          updatedAt: new Date().toISOString(),
        })
        .eq("sellerId", seller.id)
        .select()
        .single();

      if (error) {
        logger.error("Erro ao atualizar configurações:", error);
        throw new Error("Erro ao atualizar configurações");
      }

      result = data;
    } else {
      // Criar novas configurações
      const { data, error } = await supabase
        .from("seller_settings")
        .insert({
          sellerId: seller.id,
          paymentMethods,
          shippingOptions,
          notifications,
          storePolicies,
        })
        .select()
        .single();

      if (error) {
        logger.error("Erro ao criar configurações:", error);
        throw new Error("Erro ao criar configurações");
      }

      result = data;
    }

    res.json({
      success: true,
      message: "Configurações atualizadas com sucesso",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sellers/subscription
 * Retorna a assinatura atual do vendedor
 */
router.get("/subscription", authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Buscar seller pelo userId
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id, plan")
      .eq("userId", userId)
      .single();

    if (sellerError || !seller) {
      throw new NotFoundError("Vendedor não encontrado");
    }

    // Buscar assinatura ativa
    const { data: subscription, error: subError } = await supabase
      .from("Subscription")
      .select(`
        *,
        plan:planId (
          id,
          name,
          slug,
          description,
          price,
          billingPeriod,
          maxAds,
          maxPhotosPerAd,
          features
        )
      `)
      .eq("sellerId", seller.id)
      .eq("status", "ACTIVE")
      .order("createdAt", { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== "PGRST116") {
      logger.error("Erro ao buscar assinatura:", subError);
    }

    // Se não tiver assinatura, retornar plano atual do seller (padrão GRATUITO)
    if (!subscription) {
      // Buscar detalhes do plano Gratuito
      const { data: plan } = await supabase
        .from("Plan")
        .select("*")
        .eq("slug", "gratuito")
        .single();

      const freePlan = plan || {
        id: "free",
        name: "Gratuito",
        slug: "gratuito",
        price: 0,
        billingPeriod: "MONTHLY",
        maxAds: 1,
        maxPhotos: 5,
        maxProducts: 5,
        maxImages: 5,
        maxCategories: 1,
        prioritySupport: false,
        support: "Suporte básico",
        features: ["1 anúncio por mês", "5 fotos por produto", "Suporte básico por e-mail"],
        isActive: true,
        order: 1,
      };

      return res.json({
        success: true,
        data: {
          id: "default",
          planId: freePlan.id,
          plan: freePlan,
          status: "active",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          autoRenew: false,
          paymentMethod: "Gratuito",
        },
      });
    }

    // Formatar subscription para o formato esperado pelo frontend
    const formattedSubscription = {
      id: subscription.id,
      planId: subscription.planId,
      plan: {
        ...subscription.plan,
        maxPhotos: subscription.plan.maxPhotosPerAd || subscription.plan.maxPhotos || 5,
        maxProducts: subscription.plan.maxProducts || subscription.plan.maxAds || 5,
        maxImages: subscription.plan.maxImages || subscription.plan.maxPhotosPerAd || 5,
        maxCategories: subscription.plan.maxCategories || 1,
        prioritySupport: subscription.plan.prioritySupport || false,
        support: subscription.plan.support || "Suporte básico",
        features: subscription.plan.features || [],
        isActive: subscription.plan.isActive !== false,
        order: subscription.plan.order || 1,
      },
      status: subscription.status.toLowerCase(),
      startDate: subscription.startDate,
      endDate: subscription.endDate || new Date(new Date(subscription.startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: subscription.autoRenew !== false,
      paymentMethod: subscription.paymentMethod || "Cartão de Crédito",
    };

    res.json({
      success: true,
      data: formattedSubscription,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sellers/upgrade
 * Faz upgrade do plano do vendedor
 */
router.post("/upgrade", authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { planId } = req.body;

    if (!planId) {
      throw new Error("planId é obrigatório");
    }

    // Buscar seller pelo userId
    let { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", userId)
      .single();

    // Se seller não existir, criar automaticamente
    if (sellerError || !seller) {
      logger.info(`Criando registro de seller automaticamente para userId: ${userId}`);

      const { data: newSeller, error: createError } = await supabase
        .from("sellers")
        .insert({
          userId: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError || !newSeller) {
        logger.error("Erro ao criar seller:", createError);
        throw new NotFoundError("Erro ao criar perfil de vendedor. Por favor, contate o suporte.");
      }

      seller = newSeller;
      logger.info(`Seller criado com sucesso: ${seller.id}`);
    }

    // Buscar detalhes do plano
    const { data: plan, error: planError } = await supabase
      .from("Plan")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      throw new NotFoundError("Plano não encontrado");
    }

    // Cancelar assinatura atual (se existir)
    await supabase
      .from("Subscription")
      .update({ status: "CANCELLED" })
      .eq("sellerId", seller.id)
      .eq("status", "ACTIVE");

    // Criar nova assinatura
    const { data: newSubscription, error: subError } = await supabase
      .from("Subscription")
      .insert({
        sellerId: seller.id,
        planId: plan.id,
        status: "ACTIVE",
        startDate: new Date().toISOString(),
        autoRenew: true,
      })
      .select()
      .single();

    if (subError) {
      logger.error("Erro ao criar assinatura:", subError);
      throw new Error("Erro ao criar assinatura");
    }

    res.json({
      success: true,
      message: "Plano atualizado com sucesso",
      data: {
        subscription: newSubscription,
        plan: plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
