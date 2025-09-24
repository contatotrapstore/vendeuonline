import fetch from "node-fetch";
import { logger } from "../lib/logger.js";


// Configuração ASAAS
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

if (!ASAAS_API_KEY) {
  logger.warn("⚠️ ASAAS_API_KEY não configurada - Pagamentos não funcionarão");
}

// Cliente para requisições ASAAS
export async function asaasRequest(endpoint, options = {}) {
  if (!ASAAS_API_KEY) {
    throw new Error("ASAAS_API_KEY não configurada");
  }

  const url = `${ASAAS_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
        "User-Agent": "Vendeu Online Marketplace",
        ...options.headers,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error(`❌ ASAAS API Error: ${response.status} - ${responseText}`);
      throw new Error(`ASAAS API Error: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    logger.error("❌ Erro na requisição ASAAS:", error);
    throw error;
  }
}

// Criar ou buscar cliente no ASAAS
export async function createOrGetCustomer(userData) {
  try {
    // Primeiro, tentar buscar cliente existente pelo email
    const searchResponse = await asaasRequest(`/customers?email=${encodeURIComponent(userData.email)}`);

    if (searchResponse.data && searchResponse.data.length > 0) {
      logger.info("✅ Cliente ASAAS encontrado:", searchResponse.data[0].id);
      return searchResponse.data[0];
    }

    // Se não encontrou, criar novo cliente
    const customerData = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      mobilePhone: userData.phone,
      cpfCnpj: userData.cpfCnpj || null,
      postalCode: userData.postalCode || null,
      address: userData.address || null,
      addressNumber: userData.addressNumber || null,
      complement: userData.complement || null,
      province: userData.city || null,
      city: userData.city || null,
      state: userData.state || null,
      country: "Brasil",
      observations: `Cliente do marketplace Vendeu Online - ID: ${userData.id}`,
    };

    const response = await asaasRequest("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });

    logger.info("✅ Cliente ASAAS criado:", response.id);
    return response;
  } catch (error) {
    logger.error("❌ Erro ao criar/buscar cliente ASAAS:", error);
    throw error;
  }
}

// Criar cobrança no ASAAS
export async function createCharge(chargeData) {
  try {
    const response = await asaasRequest("/payments", {
      method: "POST",
      body: JSON.stringify(chargeData),
    });

    logger.info("✅ Cobrança ASAAS criada:", response.id);
    return response;
  } catch (error) {
    logger.error("❌ Erro ao criar cobrança ASAAS:", error);
    throw error;
  }
}

// Buscar cobrança no ASAAS
export async function getCharge(chargeId) {
  try {
    const response = await asaasRequest(`/payments/${chargeId}`);
    return response;
  } catch (error) {
    logger.error("❌ Erro ao buscar cobrança ASAAS:", error);
    throw error;
  }
}

// Validar webhook ASAAS
export function validateWebhookToken(receivedToken) {
  if (!ASAAS_WEBHOOK_TOKEN) {
    logger.warn("⚠️ ASAAS_WEBHOOK_TOKEN não configurado - Webhooks não validados");
    return true; // Aceitar em desenvolvimento
  }

  return receivedToken === ASAAS_WEBHOOK_TOKEN;
}

// Mapear status ASAAS para status interno
export function mapAsaasStatus(asaasStatus) {
  const statusMap = {
    PENDING: "pending",
    RECEIVED: "paid",
    CONFIRMED: "paid",
    OVERDUE: "overdue",
    REFUNDED: "refunded",
    RECEIVED_IN_CASH: "paid",
    REFUND_REQUESTED: "refund_requested",
    REFUND_IN_PROGRESS: "refund_in_progress",
    CHARGEBACK_REQUESTED: "chargeback",
    CHARGEBACK_DISPUTE: "chargeback",
    AWAITING_CHARGEBACK_REVERSAL: "chargeback",
    DUNNING_REQUESTED: "dunning",
    DUNNING_RECEIVED: "paid",
    AWAITING_RISK_ANALYSIS: "pending",
  };

  return statusMap[asaasStatus] || "unknown";
}

// Gerar link de pagamento para planos
export async function createSubscriptionPayment(planData, customerData) {
  if (!ASAAS_API_KEY) {
    // Retornar mock para desenvolvimento
    return {
      id: "pay_mock_" + Date.now(),
      status: "PENDING",
      value: planData.price,
      description: `Assinatura ${planData.name}`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      invoiceUrl: "https://sandbox.asaas.com/i/mock",
      bankSlipUrl: "https://sandbox.asaas.com/b/mock",
      pixCode: "00020126580014br.gov.bcb.pix013634MOCK",
      pixQrCode:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    };
  }

  try {
    // Criar cliente se necessário
    const customer = await createOrGetCustomer(customerData);

    // Dados da cobrança
    const chargeData = {
      customer: customer.id,
      billingType: "UNDEFINED", // Permite PIX, Boleto e Cartão
      value: planData.price,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 7 dias
      description: `Assinatura ${planData.name} - Vendeu Online`,
      externalReference: `plan_${planData.id}_user_${customerData.id}`,
      installmentCount: 1,
      installmentValue: planData.price,
      discount: {
        value: 0,
        dueDateLimitDays: 0,
        type: "FIXED",
      },
      interest: {
        value: 2,
        type: "PERCENTAGE",
      },
      fine: {
        value: 1,
        type: "PERCENTAGE",
      },
      postalService: false,
      split: [],
      callback: {
        successUrl: `${process.env.APP_URL}/payment/success`,
        autoRedirect: true,
      },
    };

    const charge = await createCharge(chargeData);

    return {
      id: charge.id,
      status: charge.status,
      value: charge.value,
      description: charge.description,
      dueDate: charge.dueDate,
      invoiceUrl: charge.invoiceUrl,
      bankSlipUrl: charge.bankSlipUrl,
      pixCode: charge.pix?.payload,
      pixQrCode: charge.pix?.qrCode?.encodedImage,
    };
  } catch (error) {
    logger.error("❌ Erro ao criar pagamento de assinatura:", error);
    throw error;
  }
}

export default {
  asaasRequest,
  createOrGetCustomer,
  createCharge,
  getCharge,
  validateWebhookToken,
  mapAsaasStatus,
  createSubscriptionPayment,
};
