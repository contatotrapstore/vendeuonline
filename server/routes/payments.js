import express from "express";
import { supabase } from "../lib/supabase-client.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac";

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
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de autenticação necessário" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuário real do Supabase
    const { data: user, error } = await supabase.from("users").select("*").eq("id", decoded.userId).single();

    if (error || !user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    return res.status(401).json({ error: "Token inválido" });
  }
}

// POST /api/payments/create - Criar pagamento
router.post("/create", authenticateUser, async (req, res) => {
  try {
    const { planId, paymentMethod } = req.body;

    if (!planId || !paymentMethod) {
      return res.status(400).json({
        error: "planId e paymentMethod são obrigatórios",
      });
    }

    console.log("💳 Criando pagamento para:", req.user.email, "Plano:", planId);

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
        console.error("❌ Erro ao criar assinatura gratuita:", subError);
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
      console.error("❌ ASAAS_API_KEY não configurada");
      return res.status(500).json({
        error: "Sistema de pagamentos não configurado",
        details: "Configure ASAAS_API_KEY no ambiente",
      });
    }

    try {
      // Criar ou buscar cliente no ASAAS usando dados reais do usuário
      let customer;
      try {
        // Tentar criar cliente no ASAAS
        customer = await asaasRequest("/customers", {
          method: "POST",
          body: JSON.stringify({
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone || "(11) 99999-9999", // Telefone padrão se não informado
            cpfCnpj: req.user.cpf || "11144477735", // CPF padrão se não informado
            city: req.user.city || "São Paulo",
            state: req.user.state || "SP",
            externalReference: req.user.id, // Referência para nosso usuário
          }),
        });

        console.log("✅ Cliente ASAAS criado:", customer.id);

        // Salvar ID do cliente ASAAS no nosso banco
        await supabase.from("users").update({ asaasCustomerId: customer.id }).eq("id", req.user.id);
      } catch (customerError) {
        console.warn("⚠️ Erro ao criar cliente, tentando buscar existente:", customerError.message);

        // Tentar buscar cliente existente pelo email
        try {
          const existingCustomers = await asaasRequest(`/customers?email=${req.user.email}`);
          if (existingCustomers.data && existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
            console.log("✅ Cliente ASAAS encontrado:", customer.id);
          } else {
            throw new Error("Cliente não encontrado");
          }
        } catch (searchError) {
          console.error("❌ Erro ao buscar cliente existente:", searchError);
          return res.status(500).json({
            error: "Erro ao gerenciar cliente no sistema de pagamentos",
            details: searchError.message,
          });
        }
      }

      // Criar cobrança no ASAAS
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 dias para vencimento

      const chargeData = {
        customer: customer.id,
        billingType: paymentMethod.toUpperCase(),
        value: plan.price,
        dueDate: dueDate.toISOString().split("T")[0], // YYYY-MM-DD
        description: `Plano ${plan.name} - Vendeu Online`,
        externalReference: `plan_${planId}_user_${req.user.id}_${Date.now()}`,
      };

      console.log("📄 Criando cobrança ASAAS:", chargeData);

      const charge = await asaasRequest("/payments", {
        method: "POST",
        body: JSON.stringify(chargeData),
      });

      console.log("✅ Cobrança ASAAS criada:", charge.id);

      // Salvar transação no nosso banco
      const { data: transaction, error: transactionError } = await supabase
        .from("Payment")
        .insert({
          userId: req.user.id,
          planId: plan.id,
          asaasPaymentId: charge.id,
          amount: plan.price,
          paymentMethod: paymentMethod,
          status: charge.status,
          dueDate: charge.dueDate,
          description: `Assinatura ${plan.name}`,
        })
        .select()
        .single();

      if (transactionError) {
        console.error("❌ Erro ao salvar transação:", transactionError);
      } else {
        console.log("✅ Transação salva no banco:", transaction.id);
      }

      // Se for PIX, buscar QR Code
      let pixData = null;
      if (paymentMethod === "pix") {
        try {
          pixData = await asaasRequest(`/payments/${charge.id}/pixQrCode`);
          console.log("✅ QR Code PIX gerado");
        } catch (pixError) {
          console.warn("⚠️ Erro ao buscar QR Code PIX:", pixError.message);
        }
      }

      // Retornar resposta baseada no método de pagamento
      const response = {
        success: true,
        charge_id: charge.id,
        transaction_id: transaction?.id,
        payment_method: paymentMethod,
        invoice_url: charge.invoiceUrl,
        due_date: charge.dueDate,
        value: charge.value,
        status: charge.status,
        plan_name: plan.name,
      };

      if (paymentMethod === "pix" && pixData) {
        response.pix_qr_code = {
          encodedImage: pixData.encodedImage,
          payload: pixData.payload,
        };
      }

      return res.json(response);
    } catch (asaasError) {
      console.error("Erro na integração ASAAS:", asaasError);
      return res.status(500).json({
        error: "Erro ao processar pagamento com ASAAS",
      });
    }
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
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
    console.log("Webhook recebido:", webhookData);

    // Processar eventos de pagamento
    if (webhookData.event === "PAYMENT_RECEIVED") {
      console.log("Pagamento confirmado:", webhookData.payment);
      // Aqui atualizaria o status da assinatura no banco
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Erro no webhook:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/payments/:id - Buscar pagamento (requer autenticação)
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log("🔍 Buscando pagamento:", id, "para usuário:", userId);

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
      console.error("❌ Pagamento não encontrado:", error);
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
        console.log("✅ Status ASAAS obtido:", asaasStatus.status);

        // Atualizar status no banco se diferente
        if (asaasStatus.status !== payment.status) {
          const { error: updateError } = await supabase
            .from("Payment")
            .update({
              status: asaasStatus.status,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", id);

          if (updateError) {
            console.warn("⚠️ Erro ao atualizar status:", updateError);
          } else {
            console.log("✅ Status do pagamento atualizado:", payment.status, "→", asaasStatus.status);
          }
        }
      } catch (asaasError) {
        console.warn("⚠️ Erro ao buscar status no ASAAS:", asaasError.message);
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

    console.log("✅ Pagamento encontrado:", payment.id);

    res.json(response);
  } catch (error) {
    console.error("❌ Erro ao buscar pagamento:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

export default router;
