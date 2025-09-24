import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { supabase } from "../lib/supabase-client.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { createSubscriptionPayment, validateWebhookToken, mapAsaasStatus } from "../lib/asaas.js";
import { logger } from "../lib/logger.js";


const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET é obrigatório para rotas payments");
}

// ASAAS API configuration
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

// ASAAS API client
async function asaasRequest(endpoint, options = {}) {
  const url = `${ASAAS_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ASAAS API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Middleware de autenticação real
// Middleware removido - usando middleware centralizado

// POST /api/payments/create - Criar pagamento
router.post("/create", authenticateUser, async (req, res) => {
  try {
    const { planId, paymentMethod } = req.body;

    if (!planId || !paymentMethod) {
      return res.status(400).json({
        error: "planId e paymentMethod são obrigatórios",
      });
    }

    logger.info("💳 Criando pagamento para:", req.user.email, "Plano:", planId);

    // Buscar plano real no Supabase
    const { data: plan, error: planError } = await supabase.from("Plan").select("*").eq("id", planId).single();

    if (planError || !plan) {
      return res.status(404).json({
        error: "Plano não encontrado",
      });
    }

    // Se plano é gratuito, não precisamos processar pagamento
    if (plan.price === 0) {
      // Criar assinatura gratuita diretamente
      const { data: subscription, error: subError } = await supabase
        .from("Subscription")
        .insert({
          userId: req.user.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date().toISOString(),
          endDate: null, // Plano gratuito não expira
        })
        .select()
        .single();

      if (subError) {
        logger.error("❌ Erro ao criar assinatura gratuita:", subError);
        throw new Error("Erro ao ativar plano gratuito");
      }

      return res.json({
        success: true,
        message: "Plano gratuito ativado com sucesso",
        subscription,
      });
    }

    // Para planos pagos, integrar com ASAAS
    if (!ASAAS_API_KEY) {
      logger.error("❌ ASAAS_API_KEY não configurada");
      return res.status(500).json({
        error: "Sistema de pagamentos não configurado",
        details: "Configure ASAAS_API_KEY no ambiente",
      });
    }

    try {
      // Usar nova integração ASAAS para criar pagamento
      logger.info("💳 Criando pagamento ASAAS usando nova integração...");

      const paymentData = await createSubscriptionPayment(plan, {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || "(11) 99999-9999",
        cpfCnpj: req.user.cpf || null,
        city: req.user.city || "São Paulo",
        state: req.user.state || "SP",
      });

      logger.info("✅ Pagamento ASAAS criado:", paymentData.id);

      // Atualizar o banco com dados do pagamento
      // (aqui você pode salvar informações do pagamento se necessário)

      // Salvar transação no nosso banco
      const { data: transaction, error: transactionError } = await supabase
        .from("payments")
        .insert({
          userId: req.user.id,
          planId: plan.id,
          asaasPaymentId: paymentData.id,
          amount: plan.price,
          paymentMethod: paymentMethod,
          status: paymentData.status,
          dueDate: paymentData.dueDate,
          description: `Assinatura ${plan.name}`,
        })
        .select()
        .single();

      if (transactionError) {
        logger.error("❌ Erro ao salvar transação:", transactionError);
      } else {
        logger.info("✅ Transação salva no banco:", transaction.id);
      }
      // Retornar resposta baseada no método de pagamento
      const response = {
        success: true,
        charge_id: paymentData.id,
        transaction_id: transaction?.id,
        payment_method: paymentMethod,
        invoice_url: paymentData.invoiceUrl,
        due_date: paymentData.dueDate,
        value: paymentData.value,
        status: paymentData.status,
        plan_name: plan.name,
      };

      // Adicionar dados PIX se disponíveis
      if (paymentData.pixCode && paymentData.pixQrCode) {
        response.pix_qr_code = {
          encodedImage: paymentData.pixQrCode,
          payload: paymentData.pixCode,
        };
      }

      // Adicionar URL do boleto se disponível
      if (paymentData.bankSlipUrl) {
        response.bank_slip_url = paymentData.bankSlipUrl;
      }

      return res.json(response);
    } catch (asaasError) {
      logger.error("Erro na integração ASAAS:", asaasError);
      return res.status(500).json({
        error: "Erro ao processar pagamento com ASAAS",
      });
    }
  } catch (error) {
    logger.error("Erro ao criar pagamento:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// POST /api/payments/webhook - Webhook do ASAAS
router.post("/webhook", (req, res) => {
  try {
    const webhookData = req.body;

    // Em produção, validar assinatura do webhook
    logger.info("Webhook recebido:", webhookData);

    // Processar eventos de pagamento
    if (webhookData.event === "PAYMENT_RECEIVED") {
      logger.info("Pagamento confirmado:", webhookData.payment);
      // Aqui atualizaria o status da assinatura no banco
    }

    res.json({ received: true });
  } catch (error) {
    logger.error("Erro no webhook:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/payments/:id - Buscar pagamento (requer autenticação)
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info("🔍 Buscando pagamento:", id, "para usuário:", userId);

    // Buscar pagamento no banco de dados
    const { data: payment, error } = await supabase
      .from("Payment")
      .select(
        `
        id,
        asaasPaymentId,
        amount,
        paymentMethod,
        status,
        dueDate,
        description,
        createdAt,
        updatedAt,
        planId,
        plans:Plan!inner (
          id,
          name,
          price,
          features
        )
      `
      )
      .eq("id", id)
      .eq("userId", userId)
      .single();

    if (error || !payment) {
      logger.error("❌ Pagamento não encontrado:", error);
      return res.status(404).json({
        success: false,
        error: "Pagamento não encontrado ou você não tem permissão para acessá-lo",
      });
    }

    // Se temos ASAAS configurado, buscar status atualizado
    let asaasStatus = null;
    if (ASAAS_API_KEY && payment.asaasPaymentId) {
      try {
        asaasStatus = await asaasRequest(`/payments/${payment.asaasPaymentId}`);
        logger.info("✅ Status ASAAS obtido:", asaasStatus.status);

        // Atualizar status no banco se diferente
        if (asaasStatus.status !== payment.status) {
          const { error: updateError } = await supabase
            .from("payments")
            .update({
              status: asaasStatus.status,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", id);

          if (updateError) {
            logger.warn("⚠️ Erro ao atualizar status:", updateError);
          } else {
            logger.info("✅ Status do pagamento atualizado:", payment.status, "→", asaasStatus.status);
          }
        }
      } catch (asaasError) {
        logger.warn("⚠️ Erro ao buscar status no ASAAS:", asaasError.message);
      }
    }

    // Formatar resposta
    const response = {
      success: true,
      data: {
        id: payment.id,
        asaasPaymentId: payment.asaasPaymentId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: asaasStatus?.status || payment.status,
        description: payment.description,
        dueDate: payment.dueDate,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        plan: {
          id: payment.plans.id,
          name: payment.plans.name,
          price: payment.plans.price,
          features: payment.plans.features,
        },
        // Informações adicionais do ASAAS se disponível
        ...(asaasStatus && {
          invoiceUrl: asaasStatus.invoiceUrl,
          bankSlipUrl: asaasStatus.bankSlipUrl,
          pixQrCode: asaasStatus.pixQrCode,
        }),
      },
    };

    logger.info("✅ Pagamento encontrado:", payment.id);

    res.json(response);
  } catch (error) {
    logger.error("❌ Erro ao buscar pagamento:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// POST /api/payments/webhook - Webhook ASAAS
router.post("/webhook", async (req, res) => {
  try {
    logger.info("🔔 Webhook ASAAS recebido:", req.body);

    // Validar token do webhook (se configurado)
    const receivedToken = req.headers["asaas-access-token"] || req.body.token;
    if (!validateWebhookToken(receivedToken)) {
      logger.error("❌ Token de webhook inválido");
      return res.status(401).json({ error: "Token inválido" });
    }

    const { event, payment } = req.body;

    if (!payment || !payment.id) {
      logger.error("❌ Webhook sem dados de pagamento");
      return res.status(400).json({ error: "Dados de pagamento ausentes" });
    }

    logger.info(`🔔 Evento ASAAS: ${event} para pagamento ${payment.id}`);

    // Buscar pagamento no nosso banco
    const { data: localPayment, error: fetchError } = await supabase
      .from("Payment")
      .select("*")
      .eq("asaasPaymentId", payment.id)
      .single();

    if (fetchError || !localPayment) {
      logger.error("❌ Pagamento não encontrado no banco:", payment.id);
      return res.status(404).json({ error: "Pagamento não encontrado" });
    }

    // Mapear status ASAAS para nosso status
    const newStatus = mapAsaasStatus(payment.status);
    logger.info(`📊 Status: ${payment.status} → ${newStatus}`);

    // Atualizar status do pagamento
    const { error: updateError } = await supabase
      .from("Payment")
      .update({
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", localPayment.id);

    if (updateError) {
      logger.error("❌ Erro ao atualizar pagamento:", updateError);
      return res.status(500).json({ error: "Erro ao atualizar pagamento" });
    }

    // Se pagamento foi aprovado, ativar assinatura
    if (newStatus === "paid") {
      logger.info("✅ Pagamento aprovado, ativando assinatura...");

      // Criar ou atualizar assinatura
      const { error: subscriptionError } = await supabase.from("Subscription").upsert({
        userId: localPayment.userId,
        planId: localPayment.planId,
        status: "ACTIVE",
        startDate: new Date().toISOString(),
        endDate: null, // Implementar lógica de data final baseada no plano
        paymentId: localPayment.id,
      });

      if (subscriptionError) {
        logger.error("❌ Erro ao ativar assinatura:", subscriptionError);
      } else {
        logger.info("✅ Assinatura ativada com sucesso");
      }
    }

    // Log do evento para auditoria
    logger.info("✅ Webhook processado com sucesso:", {
      event,
      paymentId: payment.id,
      status: newStatus,
      userId: localPayment.userId,
    });

    res.json({ success: true, message: "Webhook processado" });
  } catch (error) {
    logger.error("❌ Erro no webhook ASAAS:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
