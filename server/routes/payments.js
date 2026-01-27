import express from "express";
import { supabaseAdmin } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";
import { validateWebhookToken, mapAsaasStatus } from "../lib/asaas.js";
import { mapPlanSlugToEnum } from "../utils/plan-utils.js";

const router = express.Router();

/**
 * POST /api/payments/webhook
 * Webhook do ASAAS para receber atualizações de pagamento
 */
router.post("/webhook", async (req, res) => {
  try {
    // Log do payload para debugging
    logger.info("[ASAAS Webhook] Recebido:", {
      event: req.body.event,
      payment: req.body.payment?.id,
      externalReference: req.body.payment?.externalReference,
    });

    // Validar token do webhook
    const webhookToken = req.headers["asaas-access-token"] || req.body.token;

    if (!validateWebhookToken(webhookToken)) {
      logger.warn("[ASAAS Webhook] Token inválido");
      return res.status(401).json({ error: "Webhook token inválido" });
    }

    const { event, payment } = req.body;

    if (!event || !payment) {
      logger.error("[ASAAS Webhook] Payload inválido - faltando event ou payment");
      return res.status(400).json({ error: "Payload inválido" });
    }

    // Eventos que indicam pagamento confirmado
    const paidEvents = [
      "PAYMENT_RECEIVED",
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED_IN_CASH",
    ];

    // Se não for evento de pagamento confirmado, apenas logar e retornar sucesso
    if (!paidEvents.includes(event)) {
      logger.info(`[ASAAS Webhook] Evento ${event} ignorado (não é confirmação de pagamento)`);
      return res.json({ success: true, message: "Evento recebido" });
    }

    // Pagamento confirmado - ativar assinatura
    logger.info(`[ASAAS Webhook] Pagamento confirmado: ${payment.id}`);

    // Extrair planId e userId do externalReference: "plan_<planId>_user_<userId>"
    const externalRef = payment.externalReference;
    if (!externalRef || typeof externalRef !== "string") {
      logger.error("[ASAAS Webhook] externalReference não encontrado no pagamento");
      return res.status(400).json({ error: "externalReference ausente" });
    }

    // Parse do externalReference: "plan_<planId>_user_<userId>"
    const match = externalRef.match(/plan_(.+)_user_(.+)/);
    if (!match) {
      logger.error(`[ASAAS Webhook] externalReference inválido: ${externalRef}`);
      return res.status(400).json({ error: "externalReference inválido" });
    }

    const [, planId, userId] = match;
    logger.info(`[ASAAS Webhook] Identificado planId: ${planId}, userId: ${userId}`);

    // Buscar seller pelo userId
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from("sellers")
      .select("id")
      .eq("userId", userId)
      .single();

    if (sellerError || !seller) {
      logger.error(`[ASAAS Webhook] Seller não encontrado para userId: ${userId}`, sellerError);
      return res.status(404).json({ error: "Seller não encontrado" });
    }

    logger.info(`[ASAAS Webhook] Seller encontrado: ${seller.id}`);

    // Buscar subscription PENDING para este seller+plan
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("Subscription")
      .select("id, planId")
      .eq("sellerId", seller.id)
      .eq("planId", planId)
      .eq("status", "PENDING")
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      logger.error("[ASAAS Webhook] Erro ao buscar subscription:", subError);
      return res.status(500).json({ error: "Erro ao buscar assinatura" });
    }

    if (!subscription) {
      logger.warn(`[ASAAS Webhook] Subscription PENDING não encontrada para seller ${seller.id} e plan ${planId}`);
      // Não retornar erro - talvez já foi ativada por outro webhook
      return res.json({ success: true, message: "Subscription já processada" });
    }

    logger.info(`[ASAAS Webhook] Subscription PENDING encontrada: ${subscription.id}`);

    // Buscar detalhes do plano para obter slug
    const { data: plan, error: planError } = await supabaseAdmin
      .from("Plan")
      .select("slug")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      logger.error(`[ASAAS Webhook] Plano não encontrado: ${planId}`, planError);
      return res.status(404).json({ error: "Plano não encontrado" });
    }

    // Mapear slug para enum
    const planEnum = mapPlanSlugToEnum(plan.slug);
    logger.info(`[ASAAS Webhook] Plan slug "${plan.slug}" mapeado para enum "${planEnum}"`);

    // Atualizar subscription para ACTIVE
    const { error: updateSubError } = await supabaseAdmin
      .from("Subscription")
      .update({
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateSubError) {
      logger.error("[ASAAS Webhook] Erro ao ativar subscription:", updateSubError);
      return res.status(500).json({ error: "Erro ao ativar assinatura" });
    }

    logger.info(`[ASAAS Webhook] Subscription ${subscription.id} ativada com sucesso`);

    // Atualizar sellers.planId e sellers.plan enum
    const { error: updateSellerError } = await supabaseAdmin
      .from("sellers")
      .update({
        planId: planId,
        plan: planEnum, // Atualizar enum também
        updatedAt: new Date().toISOString(),
      })
      .eq("id", seller.id);

    if (updateSellerError) {
      logger.error("[ASAAS Webhook] Erro ao atualizar seller:", updateSellerError);
      // Não retornar erro - subscription já foi ativada
    } else {
      logger.info(`[ASAAS Webhook] Seller ${seller.id} atualizado: planId=${planId}, plan=${planEnum}`);
    }

    // Sucesso!
    logger.info(`[ASAAS Webhook] ✅ Pagamento processado com sucesso - Subscription ${subscription.id} ATIVA`);

    res.json({
      success: true,
      message: "Pagamento processado com sucesso",
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.error("[ASAAS Webhook] Erro inesperado:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/payments/status/:paymentId
 * Consultar status de um pagamento específico
 */
router.get("/status/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Buscar no ASAAS (usar função getCharge se disponível)
    // Por enquanto, retornar apenas o status da subscription

    logger.info(`[Payment Status] Consultando pagamento: ${paymentId}`);

    res.json({
      success: true,
      message: "Consulta de status de pagamento - implementação futura",
      paymentId,
    });
  } catch (error) {
    logger.error("[Payment Status] Erro:", error);
    res.status(500).json({ error: "Erro ao consultar status" });
  }
});

export default router;
