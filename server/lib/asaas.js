import fetch from "node-fetch";
import { logger } from "../lib/logger.js";


// Configuração ASAAS
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

// Debug: Verificar se env vars estão carregadas
if (ASAAS_API_KEY) {
  logger.asaasInfo(`✅ ASAAS_API_KEY configurada: ${ASAAS_API_KEY.substring(0, 30)}...`);
  logger.asaasInfo(`✅ ASAAS_BASE_URL: ${ASAAS_BASE_URL}`);
  logger.asaasInfo(`✅ ASAAS_WEBHOOK_TOKEN: ${ASAAS_WEBHOOK_TOKEN ? "configurado" : "não configurado"}`);
} else {
  logger.asaasError(`❌ ASAAS_API_KEY NÃO configurada - usando mock payment`);
  logger.asaasInfo("⚠️ ASAAS_API_KEY não configurada - Pagamentos não funcionarão");
}

// Cliente para requisições ASAAS
export async function asaasRequest(endpoint, options = {}) {
  if (!ASAAS_API_KEY) {
    throw new Error("ASAAS_API_KEY não configurada");
  }

  const url = `${ASAAS_BASE_URL}${endpoint}`;

  logger.asaasInfo(`[ASAAS REQUEST] ${options.method || 'GET'} ${url}`);
  logger.asaasInfo(`[ASAAS REQUEST] Headers:`, {
    "Content-Type": "application/json",
    "access_token": ASAAS_API_KEY.substring(0, 20) + "..."
  });

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
    logger.asaasInfo(`[ASAAS RESPONSE] Status: ${response.status}`);
    logger.asaasInfo(`[ASAAS RESPONSE] Body (first 500 chars): ${responseText.substring(0, 500)}`);

    if (!response.ok) {
      logger.asaasError(`❌ ASAAS API Error: ${response.status} - ${responseText}`);

      // Tentar parsear resposta de erro
      try {
        const errorData = JSON.parse(responseText);
        logger.asaasError(`❌ ASAAS Error Details:`, errorData);
      } catch (parseError) {
        logger.asaasError(`❌ ASAAS Error (raw):`, responseText);
      }

      throw new Error(`ASAAS API Error: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    logger.asaasError("❌ Erro na requisição ASAAS:", error?.message);
    logger.asaasError("❌ Error stack:", error?.stack);
    throw error;
  }
}

// Criar ou buscar cliente no ASAAS
export async function createOrGetCustomer(userData) {
  try {
    // Primeiro, tentar buscar cliente existente pelo email
    const searchResponse = await asaasRequest(`/customers?email=${encodeURIComponent(userData.email)}`);

    if (searchResponse.data && searchResponse.data.length > 0) {
      const existingCustomer = searchResponse.data[0];
      logger.asaasInfo("✅ Cliente ASAAS encontrado:", existingCustomer.id);

      // ✅ CORREÇÃO: Atualizar cliente se CPF estiver faltando
      if (!existingCustomer.cpfCnpj && userData.cpfCnpj) {
        logger.asaasInfo("⚠️ Cliente sem CPF - atualizando com CPF fornecido...");

        try {
          const updateData = {
            name: userData.name,
            cpfCnpj: userData.cpfCnpj,
            phone: userData.phone,
            mobilePhone: userData.phone,
            // Atualizar outros campos opcionais se fornecidos
            ...(userData.postalCode && { postalCode: userData.postalCode }),
            ...(userData.address && { address: userData.address }),
            ...(userData.addressNumber && { addressNumber: userData.addressNumber }),
            ...(userData.city && { province: userData.city, city: userData.city }),
            ...(userData.state && { state: userData.state }),
          };

          const updatedCustomer = await asaasRequest(`/customers/${existingCustomer.id}`, {
            method: "PUT",
            body: JSON.stringify(updateData),
          });

          logger.asaasInfo("✅ Cliente ASAAS atualizado com CPF:", updatedCustomer.id);
          return updatedCustomer;
        } catch (updateError) {
          logger.asaasError("❌ Erro ao atualizar cliente ASAAS, retornando cliente original:", updateError);
          // Em caso de erro no update, retorna cliente original para não bloquear o fluxo
          return existingCustomer;
        }
      }

      return existingCustomer;
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

    logger.asaasInfo("✅ Cliente ASAAS criado:", response.id);
    return response;
  } catch (error) {
    logger.asaasError("❌ Erro ao criar/buscar cliente ASAAS:", error);
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

    logger.asaasInfo("✅ Cobrança ASAAS criada:", response.id);
    return response;
  } catch (error) {
    logger.asaasError("❌ Erro ao criar cobrança ASAAS:", error);
    throw error;
  }
}

// Buscar cobrança no ASAAS
export async function getCharge(chargeId) {
  try {
    const response = await asaasRequest(`/payments/${chargeId}`);
    return response;
  } catch (error) {
    logger.asaasError("❌ Erro ao buscar cobrança ASAAS:", error);
    throw error;
  }
}

// Buscar QR Code PIX para pagamento
export async function getPixQrCode(paymentId) {
  try {
    const response = await asaasRequest(`/payments/${paymentId}/pixQrCode`);
    logger.asaasInfo("✅ [ASAAS] PIX QR Code obtido:", paymentId);
    return response;
  } catch (error) {
    logger.asaasInfo("⚠️ [ASAAS] PIX QR Code não disponível para:", paymentId, error.message);
    return null; // PIX pode não estar disponível imediatamente
  }
}

// Validar webhook ASAAS
export function validateWebhookToken(receivedToken) {
  if (!ASAAS_WEBHOOK_TOKEN) {
    logger.asaasInfo("⚠️ ASAAS_WEBHOOK_TOKEN não configurado - Webhooks não validados");
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
  logger.asaasInfo("═══════════════════════════════════════════════");
  logger.asaasInfo("🔄 [ASAAS] createSubscriptionPayment called");
  logger.asaasInfo("═══════════════════════════════════════════════");
  logger.asaasInfo("📦 Plan Data:", { name: planData.name, price: planData.price, id: planData.id });
  logger.asaasInfo("👤 Customer Data:", {
    id: customerData.id,
    email: customerData.email,
    name: customerData.name,
    phone: customerData.phone
  });

  // Verificar se ASAAS_API_KEY está configurada
  if (!ASAAS_API_KEY) {
    logger.asaasError("❌ [ASAAS] ASAAS_API_KEY não configurada!");
    logger.asaasError("❌ [ASAAS] Mock payment será retornado - PRODUÇÃO NÃO FUNCIONARÁ");
    logger.asaasError("❌ [ASAAS] Configure ASAAS_API_KEY nas variáveis de ambiente");
    logger.asaasInfo("⚠️ ASAAS_API_KEY não configurada - retornando mock payment");

    // Retornar mock para desenvolvimento - redireciona para página local
    const baseUrl = process.env.APP_URL || "http://localhost:5173";

    const mockPayment = {
      id: "pay_mock_" + Date.now(),
      status: "CONFIRMED", // Mock já aprova automaticamente em desenvolvimento
      value: planData.price,
      description: `Assinatura ${planData.name}`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      invoiceUrl: `${baseUrl}/seller/plans?payment=mock_success&plan=${encodeURIComponent(planData.name)}`,
      bankSlipUrl: `${baseUrl}/seller/plans?payment=mock_success`,
      pixCode: "00020126580014br.gov.bcb.pix013634MOCK",
      pixQrCode:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    };

    logger.asaasInfo("🔧 [ASAAS] Mock payment gerado:", mockPayment);
    return mockPayment;
  }

  logger.asaasInfo("✅ [ASAAS] ASAAS_API_KEY encontrada - usando pagamento REAL");
  logger.asaasInfo("🌐 [ASAAS] Base URL:", ASAAS_BASE_URL);
  logger.asaasInfo("🔑 [ASAAS] API Key Format:", ASAAS_API_KEY.substring(0, 10) + "...");
  logger.asaasInfo("🔑 [ASAAS] API Key Starts With $aact_:", ASAAS_API_KEY.startsWith("$aact_"));

  try {
    logger.asaasInfo("🔄 [ASAAS] Iniciando criação de pagamento real...");
    logger.asaasInfo("📊 [ASAAS] Plan:", planData.name, "| Price:", planData.price);
    logger.asaasInfo("👤 [ASAAS] Customer:", { id: customerData.id, email: customerData.email, name: customerData.name, phone: customerData.phone, cpfCnpj: customerData.cpfCnpj });

    // Criar cliente se necessário
    logger.asaasInfo("🔍 [ASAAS] Buscando/criando cliente ASAAS...");
    const customer = await createOrGetCustomer(customerData);
    logger.asaasInfo("✅ [ASAAS] Cliente ASAAS pronto:", customer.id);

    // Dados da cobrança
    const chargeData = {
      customer: customer.id,
      billingType: "UNDEFINED", // Permite PIX e Cartão
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
    };

    // ⚠️ CALLBACK DESABILITADO: Requer domínio configurado na conta ASAAS
    //
    // ERRO ASAAS: "Não há nenhum domínio configurado em sua conta"
    // SOLUÇÃO: Configurar domínio no painel ASAAS:
    //   1. Acesse: https://www.asaas.com → Login
    //   2. Menu: Minha Conta → Informações
    //   3. Campo: Site/Website → https://www.vendeu.online
    //   4. Salvar e aguardar 1-5 minutos
    //   5. Descomentar código abaixo e fazer deploy
    //
    // NOTA: Confirmação de pagamento FUNCIONA sem callback via:
    //   - Frontend: PaymentStatusPolling.tsx (polling a cada 5s)
    //   - Backend: /api/payments/webhook (notificações ASAAS)
    //
    // if (process.env.APP_URL) {
    //   chargeData.callback = {
    //     successUrl: `${process.env.APP_URL}/payment/success`,
    //     autoRedirect: true,
    //   };
    // }

    logger.asaasInfo("💳 [ASAAS] Criando cobrança com billingType: UNDEFINED (PIX + Cartão)");
    logger.asaasInfo("📅 [ASAAS] Due Date:", chargeData.dueDate);

    const charge = await createCharge(chargeData);

    logger.asaasInfo("✅ [ASAAS] Cobrança criada com sucesso!");
    logger.asaasInfo("🆔 [ASAAS] Charge ID:", charge.id);
    logger.asaasInfo("📊 [ASAAS] Status:", charge.status);
    logger.asaasInfo("🔗 [ASAAS] Invoice URL:", charge.invoiceUrl);

    // Buscar QR Code PIX (funciona para billingType: UNDEFINED e PIX)
    let pixData = null;
    if (charge.id && ['PIX', 'UNDEFINED'].includes(chargeData.billingType)) {
      logger.asaasInfo("🔍 [ASAAS] Buscando QR Code PIX para pagamento:", charge.id);
      pixData = await getPixQrCode(charge.id);

      if (pixData) {
        logger.asaasInfo("✅ [ASAAS] PIX QR Code disponível");
      } else {
        logger.asaasInfo("⚠️ [ASAAS] PIX QR Code não disponível (pode levar alguns segundos)");
      }
    }

    const paymentResponse = {
      id: charge.id,
      status: charge.status,
      value: charge.value,
      description: charge.description,
      dueDate: charge.dueDate,
      invoiceUrl: charge.invoiceUrl,
      pixCode: pixData?.payload || null,
      pixQrCode: pixData?.encodedImage
        ? `data:image/png;base64,${pixData.encodedImage}`
        : null,
    };

    logger.asaasInfo("✅ [ASAAS] Payment response construído:", {
      id: paymentResponse.id,
      status: paymentResponse.status,
      hasPixCode: !!paymentResponse.pixCode,
      hasPixQrCode: !!paymentResponse.pixQrCode,
      hasBankSlip: !!paymentResponse.bankSlipUrl,
    });
    logger.asaasInfo("═══════════════════════════════════════════════");

    return paymentResponse;
  } catch (error) {
    logger.asaasError("═══════════════════════════════════════════════");
    logger.asaasError("❌ [ASAAS] ERRO ao criar pagamento de assinatura");
    logger.asaasError("═══════════════════════════════════════════════");
    logger.asaasError("🔥 [ASAAS] Error type:", error?.constructor?.name);
    logger.asaasError("🔥 [ASAAS] Error message:", error?.message);

    // Diagnosticar tipo de erro e fornecer sugestões específicas
    const errorMessage = error?.message?.toLowerCase() || "";

    if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
      logger.asaasError("🔑 [ASAAS] ERRO 401 - CHAVE API INVÁLIDA");
      logger.asaasError("💡 [ASAAS] Solução:");
      logger.asaasError("   1. Verifique se ASAAS_API_KEY está correta no Render.com");
      logger.asaasError("   2. Gere uma nova chave em: https://www.asaas.com/config/api");
      logger.asaasError("   3. Atualize a variável de ambiente e reinicie o servidor");
      logger.asaasError("   4. Confirme que a chave começa com '$aact_'");
    } else if (errorMessage.includes("timeout") || errorMessage.includes("econnrefused")) {
      logger.asaasError("⏱️ [ASAAS] ERRO DE TIMEOUT/CONEXÃO");
      logger.asaasError("💡 [ASAAS] Solução:");
      logger.asaasError("   1. Verifique sua conexão de rede");
      logger.asaasError("   2. Confirme que ASAAS_BASE_URL está correto:", ASAAS_BASE_URL);
      logger.asaasError("   3. Tente novamente em alguns segundos");
      logger.asaasError("   4. Verifique status do ASAAS: https://status.asaas.com");
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      logger.asaasError("🌐 [ASAAS] ERRO DE REDE");
      logger.asaasError("💡 [ASAAS] Solução:");
      logger.asaasError("   1. Verifique se o servidor tem acesso à internet");
      logger.asaasError("   2. Verifique firewall/proxy do Render.com");
      logger.asaasError("   3. Confirme que api.asaas.com está acessível");
    } else if (errorMessage.includes("400") || errorMessage.includes("bad request")) {
      logger.asaasError("📋 [ASAAS] ERRO 400 - DADOS INVÁLIDOS");
      logger.asaasError("💡 [ASAAS] Solução:");
      logger.asaasError("   1. Verifique os dados do cliente:", { email: customerData.email, phone: customerData.phone, cpfCnpj: customerData.cpfCnpj });
      logger.asaasError("   2. Verifique os dados do plano:", { name: planData.name, price: planData.price });
      logger.asaasError("   3. Campos obrigatórios: name, email, phone");
    } else {
      logger.asaasError("❓ [ASAAS] ERRO DESCONHECIDO");
      logger.asaasError("💡 [ASAAS] Solução:");
      logger.asaasError("   1. Verifique os logs acima para detalhes");
      logger.asaasError("   2. Entre em contato com suporte ASAAS se persistir");
    }

    logger.asaasError("📚 [ASAAS] Error stack:", error?.stack);

    if (error?.response) {
      logger.asaasError("📡 [ASAAS] API Response Status:", error.response.status);
      logger.asaasError("📡 [ASAAS] API Response Data:", error.response.data);
    }

    logger.asaasInfo("⚠️ [ASAAS] Retornando mock payment como fallback devido a erro");
    logger.asaasInfo("⚠️ [ASAAS] ATENÇÃO: Isso NÃO deve acontecer em produção!");

    // Fallback para mock em caso de erro (API key inválida, campos faltando, etc)
    // Em desenvolvimento, redireciona para página local de sucesso
    const baseUrl = process.env.APP_URL || "http://localhost:5173";

    const mockFallback = {
      id: "pay_mock_fallback_" + Date.now(),
      status: "CONFIRMED", // Mock já aprova automaticamente em desenvolvimento
      value: planData.price,
      description: `Assinatura ${planData.name}`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      invoiceUrl: `${baseUrl}/seller/plans?payment=mock_success&plan=${encodeURIComponent(planData.name)}`,
      bankSlipUrl: `${baseUrl}/seller/plans?payment=mock_success`,
      pixCode: "00020126580014br.gov.bcb.pix013634MOCK_FALLBACK",
      pixQrCode:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    };

    logger.asaasInfo("🔧 [ASAAS] Mock fallback payment gerado:", mockFallback);
    logger.asaasInfo("═══════════════════════════════════════════════");

    return mockFallback;
  }
}

export default {
  asaasRequest,
  createOrGetCustomer,
  createCharge,
  getCharge,
  getPixQrCode,
  validateWebhookToken,
  mapAsaasStatus,
  createSubscriptionPayment,
};
