import express from "express";
import { randomUUID } from "crypto";
import { authenticateUser } from "../middleware/auth.js";
import { supabase, supabaseAdmin } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";
import { NotFoundError, AuthorizationError } from "../lib/errors.js";
import { DEFAULT_FREE_PLAN, formatPlanResponse } from "../utils/plan-utils.js";
import { createSubscriptionPayment } from "../lib/asaas.js";
import * as pgClient from "../lib/pg-client.js";

const router = express.Router();

const getDefaultStoreName = (user) => {
  const baseName =
    typeof user?.name === "string" && user.name.trim().length > 0
      ? user.name.trim()
      : "Vendedor";
  return `Loja de ${baseName}`;
};

const buildSellerDefaults = (user) => {
  const storeName = getDefaultStoreName(user);
  const slugBase =
    typeof user?.name === "string" && user.name.trim().length > 0
      ? user.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : "loja";

  const sellerDefaults = {
    rating: 0,
    totalSales: 0,
    commission: 5,
    isVerified: false,
  };

  const storeDefaults = {
    name: storeName,
    description: `Bem-vindo à ${storeName}`,
    slug: `${slugBase}-${Date.now().toString(36)}`,
    city: typeof user?.city === "string" ? user.city.trim() : "",
    state: typeof user?.state === "string" ? user.state.trim() : "",
    email: user?.email || "",
    phone: user?.phone || "",
    isActive: true,
    isVerified: false,
  };

  return { seller: sellerDefaults, store: storeDefaults };
};

/**
 * GET /api/sellers/settings
 * Retorna as configurações do vendedor
 */
router.get("/settings", authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Buscar seller pelo userId usando maybeSingle para evitar erro quando não existe
    let { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", userId)
      .maybeSingle(); // Use maybeSingle ao invés de single

    // Se seller não existir, criar automaticamente
    if (!seller) {
      logger.info(`Seller não encontrado para userId: ${userId}. Tentando criar...`);

      // Verificar se já existe (evitar duplicação)
      const { data: existingSeller } = await supabase
        .from("sellers")
        .select("id")
        .eq("userId", userId)
        .maybeSingle();

      if (existingSeller) {
        seller = existingSeller;
        logger.info(`Seller já existia: ${seller.id}`);
      } else {
        const { data: newSeller, error: createError } = await supabase
          .from("sellers")
          .insert({
            id: randomUUID(), // Gerar ID manualmente
            userId: userId,
            ...buildSellerDefaults(req.user),
            // Campos com defaults preenchidos automaticamente:
            // rating: 0.0, totalSales: 0, commission: 5.0, isVerified: false
          })
          .select("id")
          .single();

        if (createError) {
          logger.error("Erro ao criar seller:", createError);
          logger.error("Detalhes:", {
            code: createError.code,
            message: createError.message,
            details: createError.details,
            hint: createError.hint
          });

          // Mensagens específicas
          let errorMessage = "Erro ao criar perfil de vendedor.";
          if (createError.code === '23505') {
            errorMessage = "Perfil de vendedor já existe. Recarregue a página.";
          } else if (createError.code === '23503') {
            errorMessage = "Usuário não encontrado no sistema.";
          } else {
            errorMessage = `Erro ao criar vendedor: ${createError.message}`;
          }

          throw new NotFoundError(errorMessage);
        }

        if (!newSeller) {
          throw new NotFoundError("Erro ao criar perfil de vendedor. Por favor, contate o suporte.");
        }

        seller = newSeller;
        logger.info(`Seller criado com sucesso: ${seller.id}`);
      }
    }

    // Buscar configurações do seller
    const { data: settings, error: settingsError } = await supabase
      .from("SellerSettings")
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
            paypal: false,
            creditCard: true,
          },
          // shippingOptions removido: Sistema WhatsApp-only (frete negociado via WhatsApp)
          notifications: {
            smsOrders: false,
            emailOrders: true,
            emailPromotions: false,
            pushNotifications: true,
          },
          storePolicies: {
            returnPolicy: "7 dias para devolução",
            privacyPolicy: "Seus dados estão seguros conosco",
            // shippingPolicy removido: Sistema WhatsApp-only
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
    const userId = req.user.id;
    const {
      paymentMethods,
      // shippingOptions removido: Sistema WhatsApp-only
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

      const defaults = buildSellerDefaults(req.user);

      const { data: newSeller, error: createError } = await supabaseAdmin
        .from("sellers")
        .insert({
          id: randomUUID(), // Gerar ID manualmente
          userId: userId,
          ...defaults.seller,
          // Campos com defaults serão preenchidos automaticamente pelo Prisma:
          // rating: 0.0, totalSales: 0, commission: 5.0, isVerified: false
        })
        .select("id")
        .single();

      if (createError || !newSeller) {
        logger.error("Erro ao criar seller:", createError);
        logger.error("Detalhes completos:", {
          code: createError?.code,
          message: createError?.message,
          details: createError?.details,
          hint: createError?.hint,
        });
        throw new NotFoundError("Erro ao criar perfil de vendedor. Por favor, contate o suporte.");
      }

      seller = newSeller;
      logger.info(`Seller criado com sucesso: ${seller.id}`);
    }

    // Verificar se já existem configurações
    const { data: existingSettings } = await supabase
      .from("SellerSettings")
      .select("id")
      .eq("sellerId", seller.id)
      .single();

    let result;

    if (existingSettings) {
      // Atualizar configurações existentes
      const { data, error } = await supabase
        .from("SellerSettings")
        .update({
          paymentMethods,
          // shippingOptions removido: Sistema WhatsApp-only
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
        .from("SellerSettings")
        .insert({
          sellerId: seller.id,
          paymentMethods,
          // shippingOptions removido: Sistema WhatsApp-only
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
    const userId = req.user.id;

    // Buscar seller pelo userId usando maybeSingle para evitar erro quando não existe
    let { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", userId)
      .maybeSingle(); // Use maybeSingle ao invés de single

    // Se seller não existir, criar automaticamente
    if (!seller) {
      logger.info(`Seller não encontrado para userId: ${userId}. Criando automaticamente...`);

      const defaults = buildSellerDefaults(req.user);

      const { data: newSeller, error: createError } = await supabase
        .from("sellers")
        .insert({
          id: randomUUID(), // Gerar ID manualmente
          userId: userId,
          ...defaults.seller,
          // Campos com defaults preenchidos automaticamente:
          // rating: 0.0, totalSales: 0, commission: 5.0, isVerified: false
        })
        .select("id")
        .single();

      if (createError) {
        logger.error("Erro ao criar seller:", createError);
        throw new NotFoundError(`Erro ao criar perfil de vendedor: ${createError.message}`);
      }

      if (!newSeller) {
        throw new NotFoundError("Erro ao criar perfil de vendedor. Por favor, contate o suporte.");
      }

      seller = newSeller;
      logger.info(`Seller criado com sucesso: ${seller.id}`);
    }

    // Buscar assinatura ativa ou pendente (para mostrar badge de "Aguardando Pagamento")
    const { data: subscription, error: subError } = await supabase
      .from("Subscription")
      .select(`
        *,
        plan:planId (*)
      `)
      .eq("sellerId", seller.id)
      .in("status", ["ACTIVE", "PENDING"])
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

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

      const freePlan = formatPlanResponse(plan, DEFAULT_FREE_PLAN);

      return res.json({
        success: true,
        data: {
          id: "default",
          planId: freePlan?.id || DEFAULT_FREE_PLAN.id,
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
    const planData = formatPlanResponse(subscription.plan, DEFAULT_FREE_PLAN);
    const planId = planData?.id || subscription.planId;

    const subscriptionStatus =
      typeof subscription.status === "string"
        ? subscription.status.toLowerCase()
        : "active";

    const startDate = subscription.startDate || new Date().toISOString();

    const endDate =
      subscription.endDate ||
      new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const formattedSubscription = {
      id: subscription.id,
      planId,
      plan: planData,
      status: subscriptionStatus,
      startDate,
      endDate,
      autoRenew: subscription.autoRenew !== false,
      paymentMethod: subscription.paymentMethod || "Cartao de Credito",
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
    logger.info(`[UPGRADE] Iniciando upgrade para userId: ${req.user.id}`);

    const userId = req.user.id;
    const { planId, cpf } = req.body;

    if (!planId) {
      logger.error("[UPGRADE] planId não fornecido");
      throw new Error("planId é obrigatório");
    }

    logger.info(`[UPGRADE] planId recebido: ${planId}`);

    // Buscar seller pelo userId
    let { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", userId)
      .single();

    // Se seller não existir, criar automaticamente
    if (sellerError || !seller) {
      logger.info(`Criando registro de seller automaticamente para userId: ${userId}`);

      const defaults = buildSellerDefaults(req.user);

      const { data: newSeller, error: createError } = await supabase
        .from("sellers")
        .insert({
          id: randomUUID(), // Gerar ID manualmente
          userId: userId,
          ...defaults.seller,
          // Campos com defaults serão preenchidos automaticamente pelo Prisma:
          // rating: 0.0, totalSales: 0, commission: 5.0, isVerified: false
        })
        .select("id")
        .single();

      if (createError || !newSeller) {
        logger.error("Erro ao criar seller:", createError);
        logger.error("Detalhes completos:", {
          code: createError?.code,
          message: createError?.message,
          details: createError?.details,
          hint: createError?.hint,
        });
        throw new NotFoundError("Erro ao criar perfil de vendedor. Por favor, contate o suporte.");
      }

      seller = newSeller;
      logger.info(`Seller criado com sucesso: ${seller.id}`);
    }

    // Buscar detalhes do plano
    logger.info(`[UPGRADE] Buscando plano: ${planId}`);
    const { data: plan, error: planError } = await supabase
      .from("Plan")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      logger.error(`[UPGRADE] Plano não encontrado: ${planId}`, planError);
      throw new NotFoundError("Plano não encontrado");
    }

    logger.info(`[UPGRADE] Plano encontrado: ${plan.name}, price: ${plan.price} (tipo: ${typeof plan.price}), slug: ${plan.slug}`);

    // Plano gratuito não precisa de pagamento - ativar imediatamente
    if (plan.price === 0 || plan.price === "0" || plan.slug === "gratuito") {
      logger.info(`Plano gratuito detectado - ativando imediatamente para seller ${seller.id}`);

      // Cancelar assinatura atual (se existir)
      await supabaseAdmin
        .from("Subscription")
        .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
        .eq("sellerId", seller.id)
        .eq("status", "ACTIVE");

      // Criar assinatura gratuita ATIVA
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 10); // 10 anos (ilimitado)

      const { data: newSubscription, error: subError } = await supabaseAdmin
        .from("Subscription")
        .insert({
          sellerId: seller.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date().toISOString(),
          endDate: endDate.toISOString(),
          autoRenew: false, // Plano gratuito não renova
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (subError) {
        logger.error("Erro ao criar assinatura gratuita:", subError);
        throw new Error("Erro ao ativar plano gratuito");
      }

      const normalizedPlan = formatPlanResponse(plan, DEFAULT_FREE_PLAN);

      return res.json({
        success: true,
        message: "Plano gratuito ativado com sucesso",
        data: {
          subscription: {
            ...newSubscription,
            planId: plan.id,
            plan: normalizedPlan,
          },
          plan: normalizedPlan,
        },
      });
    }

    // Planos pagos: criar assinatura PENDING e gerar pagamento
    logger.info(`Plano pago detectado (${plan.price}) - criando assinatura PENDING e gerando pagamento`);

    // Verificar se já existe assinatura ativa
    const { data: existingActive } = await supabaseAdmin
      .from("Subscription")
      .select("id")
      .eq("sellerId", seller.id)
      .eq("status", "ACTIVE");

    if (existingActive && existingActive.length > 0) {
      logger.warn(`Seller ${seller.id} já possui assinatura ativa. Cancelando...`);
    }

    // Cancelar assinatura atual (se existir)
    logger.info(`[UPGRADE] Cancelando assinaturas ACTIVE para sellerId: ${seller.id}`);
    const { error: cancelError } = await supabaseAdmin
      .from("Subscription")
      .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .eq("sellerId", seller.id)
      .eq("status", "ACTIVE");

    if (cancelError) {
      logger.error("[UPGRADE] Erro ao cancelar assinatura anterior:", cancelError);
    } else {
      logger.info("[UPGRADE] ✅ Assinaturas anteriores canceladas (ou nenhuma encontrada)");
    }

    // ✅ VALIDAR CPF OBRIGATÓRIO PARA PLANOS PAGOS
    if (!cpf || cpf.replace(/\D/g, "").length !== 11) {
      logger.error("[UPGRADE] CPF inválido ou não fornecido:", cpf);
      return res.status(400).json({
        success: false,
        error: "CPF é obrigatório para planos pagos. Por favor, informe um CPF válido com 11 dígitos."
      });
    }

    logger.info(`[UPGRADE] ✅ CPF validado: ${cpf.replace(/\D/g, "")}`);

    // Criar nova assinatura com status PENDING (aguardando pagamento)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 mês a partir de hoje

    logger.info(`[UPGRADE] Preparando INSERT na Subscription para sellerId: ${seller.id}, planId: ${plan.id}`);
    const { data: newSubscription, error: subError } = await supabaseAdmin
      .from("Subscription")
      .insert({
        sellerId: seller.id,
        planId: plan.id,
        status: "PENDING", // ✅ Aguardando pagamento
        startDate: new Date().toISOString(),
        endDate: endDate.toISOString(),
        autoRenew: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    logger.info(`[UPGRADE] INSERT completed - data: ${newSubscription ? 'YES' : 'NO'}, error: ${subError ? 'YES' : 'NO'}`);

    if (subError) {
      logger.error("Detalhes do erro:", {
        code: subError.code,
        message: subError.message,
        details: subError.details,
        hint: subError.hint
      });

      let errorMessage = "Erro ao criar assinatura";
      if (subError.code === '23505') {
        errorMessage = "Você já possui uma assinatura pendente. Cancele a anterior primeiro.";
      } else if (subError.code === '23503') {
        errorMessage = "Plano selecionado não existe ou está inativo.";
      } else if (subError.message) {
        errorMessage = `Erro ao processar: ${subError.message}`;
      }

      throw new Error(errorMessage);
    }

    // Gerar pagamento ASAAS
    logger.info(`[UPGRADE] Gerando pagamento ASAAS para plano ${plan.name} (R$ ${plan.price})`);
    let paymentData = null;
    try {
      const planData = {
        id: plan.id,
        name: plan.name,
        price: parseFloat(plan.price),
      };

      const customerData = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || req.user.phoneNumber || "5511999999999", // Fallback
        cpfCnpj: cpf.replace(/\D/g, ""), // ✅ CORREÇÃO: CPF do checkout (limpo, sem pontos/traços)
      };

      logger.info(`[UPGRADE] Dados do pagamento:`, { planData, customerData });

      paymentData = await createSubscriptionPayment(planData, customerData);

      logger.info(`[UPGRADE] ✅ Pagamento ASAAS criado: ${paymentData.id} para subscription ${newSubscription.id}`);

      // Se payment mock retornou CONFIRMED (apenas em desenvolvimento), ativar subscription automaticamente
      const isDevelopment = process.env.NODE_ENV !== "production";

      if (paymentData.status === "CONFIRMED" && paymentData.id.startsWith("pay_mock") && isDevelopment) {
        logger.info(`[UPGRADE] Mock payment detectado em DESENVOLVIMENTO - ativando subscription automaticamente`);

        await supabaseAdmin
          .from("Subscription")
          .update({ status: "ACTIVE", updatedAt: new Date().toISOString() })
          .eq("id", newSubscription.id);

        logger.info(`[UPGRADE] ✅ Subscription ativada automaticamente (mock payment em desenvolvimento)`);
      } else if (paymentData.status === "CONFIRMED" && paymentData.id.startsWith("pay_mock")) {
        logger.warn(`[UPGRADE] ⚠️ Mock payment detectado em PRODUÇÃO - NÃO ativando automaticamente (aguardando webhook ASAAS)`);
      }

      // Salvar referência ao pagamento ASAAS na subscription (se houver campo)
      // Nota: Se não houver campo, o webhook vai usar o externalReference para encontrar a subscription

    } catch (paymentError) {
      logger.error("[UPGRADE] ❌ Erro ao gerar pagamento ASAAS:", paymentError);
      logger.error("[UPGRADE] Error stack:", paymentError.stack);

      // Cancelar subscription criada se falhar o pagamento
      await supabaseAdmin
        .from("Subscription")
        .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
        .eq("id", newSubscription.id);

      throw new Error("Erro ao gerar link de pagamento. Tente novamente.");
    }

    const normalizedPlan = formatPlanResponse(plan, DEFAULT_FREE_PLAN);

    // Retornar subscription PENDING + dados de pagamento
    res.json({
      success: true,
      message: "Aguardando pagamento. Você será redirecionado para a página de pagamento.",
      data: {
        subscription: {
          ...newSubscription,
          planId: plan.id,
          plan: normalizedPlan,
        },
        plan: normalizedPlan,
        // Campos flattened para compatibilidade frontend
        chargeId: paymentData.id, // Nome correto esperado pelo frontend
        paymentUrl: paymentData.invoiceUrl,
        bankSlipUrl: paymentData.bankSlipUrl,
        pixCode: paymentData.pixCode,
        pixQrCode: paymentData.pixQrCode,
        dueDate: paymentData.dueDate,
        // Objeto completo para backward compatibility
        payment: paymentData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sellers/activate-pending-subscription
 * Ativar subscription PENDING mais recente (para mock payments)
 */
router.post("/activate-pending-subscription", authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Não autenticado" });
    }

    logger.info(`[ACTIVATE PENDING] Ativando subscription PENDING para userId: ${userId}`);

    // Buscar seller
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", userId)
      .maybeSingle();

    if (sellerError || !seller) {
      logger.error(`[ACTIVATE PENDING] Seller não encontrado para userId: ${userId}`, sellerError);
      return res.status(404).json({ success: false, message: "Perfil de vendedor não encontrado" });
    }

    // Buscar subscription PENDING mais recente
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("Subscription")
      .select("id, planId")
      .eq("sellerId", seller.id)
      .eq("status", "PENDING")
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      logger.error("[ACTIVATE PENDING] Erro ao buscar subscription:", subError);
      return res.status(500).json({ success: false, message: "Erro ao buscar assinatura" });
    }

    if (!subscription) {
      logger.warn(`[ACTIVATE PENDING] Nenhuma subscription PENDING encontrada para seller ${seller.id}`);
      return res.status(404).json({ success: false, message: "Nenhuma assinatura pendente encontrada" });
    }

    logger.info(`[ACTIVATE PENDING] Subscription PENDING encontrada: ${subscription.id}`);

    // Cancelar assinatura ACTIVE anterior (se existir)
    await supabaseAdmin
      .from("Subscription")
      .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .eq("sellerId", seller.id)
      .eq("status", "ACTIVE");

    // Ativar subscription
    const { error: updateError } = await supabaseAdmin
      .from("Subscription")
      .update({
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      logger.error("[ACTIVATE PENDING] Erro ao ativar subscription:", updateError);
      return res.status(500).json({ success: false, message: "Erro ao ativar assinatura" });
    }

    logger.info(`[ACTIVATE PENDING] ✅ Subscription ${subscription.id} ativada com sucesso`);

    res.json({
      success: true,
      message: "Assinatura ativada com sucesso",
      data: { subscriptionId: subscription.id },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sellers/cancel-pending-subscription
 * Cancelar subscription PENDING (para quando usuário desiste do pagamento)
 */
router.post("/cancel-pending-subscription", authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Não autenticado" });
    }

    logger.info(`[CANCEL PENDING] Cancelando subscription PENDING para userId: ${userId}`);

    // Buscar seller
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id")
      .eq("userId", userId)
      .maybeSingle();

    if (sellerError || !seller) {
      logger.error(`[CANCEL PENDING] Seller não encontrado para userId: ${userId}`, sellerError);
      return res.status(404).json({ success: false, message: "Perfil de vendedor não encontrado" });
    }

    // Cancelar todas as subscriptions PENDING
    const { error: cancelError } = await supabaseAdmin
      .from("Subscription")
      .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .eq("sellerId", seller.id)
      .eq("status", "PENDING");

    if (cancelError) {
      logger.error("[CANCEL PENDING] Erro ao cancelar subscriptions:", cancelError);
      return res.status(500).json({ success: false, message: "Erro ao cancelar assinatura" });
    }

    logger.info(`[CANCEL PENDING] ✅ Subscriptions PENDING canceladas para seller ${seller.id}`);

    res.json({
      success: true,
      message: "Assinatura pendente cancelada com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
