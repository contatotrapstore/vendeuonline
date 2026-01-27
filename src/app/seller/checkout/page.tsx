"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { apiRequest } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, XCircle } from "lucide-react";
import { logger } from "@/lib/logger";
import {
  PaymentMethodSelector,
  PixPaymentDisplay,
  PlanSummary,
} from "@/components/checkout";

type PaymentMethod = "PIX" | "CREDIT_CARD";
type CheckoutStep =
  | "LOADING"
  | "SELECT_METHOD"
  | "PROCESSING"
  | "PIX_DISPLAY"
  | "REDIRECT_CARD"
  | "ERROR";

interface PaymentData {
  id: string;
  status: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixCode?: string;
  pixQrCode?: string;
  dueDate?: string;
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  const planId = searchParams.get("planId");

  const [step, setStep] = useState<CheckoutStep>("LOADING");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cpf, setCpf] = useState<string>(""); // ✅ NOVO: Estado para armazenar CPF

  // 1. Check auth and load plan on mount
  useEffect(() => {
    if (!user || user.type !== "seller") {
      logger.warn("[CHECKOUT] Unauthorized access - redirecting to login");
      toast.error("Acesso não autorizado");
      navigate("/login");
      return;
    }

    if (!planId) {
      logger.warn("[CHECKOUT] No planId provided - redirecting to plans");
      toast.error("Plano não especificado");
      navigate("/seller/plans");
      return;
    }

    loadPlanDetails();
  }, [user, planId, navigate, token]);

  const loadPlanDetails = async () => {
    try {
      logger.info(`[CHECKOUT] Loading plan details for planId: ${planId}`);

      const response = await apiRequest("/api/plans", {
        method: "GET",
        token,
        headers: { "Content-Type": "application/json" },
      });

      if (!response?.success || !response?.data) {
        throw new Error("Erro ao carregar planos");
      }

      const foundPlan = response.data.find((p: any) => p.id === planId);

      if (!foundPlan) {
        logger.error(`[CHECKOUT] Plan not found: ${planId}`);
        throw new Error("Plano não encontrado");
      }

      logger.info(`[CHECKOUT] ✅ Plan loaded: ${foundPlan.name}`);
      setPlan(foundPlan);
      setStep("SELECT_METHOD");
    } catch (error) {
      logger.error("[CHECKOUT] ❌ Error loading plan:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao carregar plano";
      setError(errorMessage);
      toast.error(errorMessage);
      setTimeout(() => navigate("/seller/plans"), 3000);
    }
  };

  // 2. Handle payment method selection
  const handleMethodSelect = async (method: PaymentMethod) => {
    // ✅ VALIDAR CPF OBRIGATÓRIO ANTES DE PROCESSAR PAGAMENTO
    if (!cpf || cpf.replace(/\D/g, "").length !== 11) {
      toast.error("CPF é obrigatório. Por favor, informe um CPF válido com 11 dígitos.");
      logger.error("[CHECKOUT] CPF inválido ou não fornecido:", cpf);
      return;
    }

    logger.info("[CHECKOUT] ✅ CPF validado:", cpf.replace(/\D/g, ""));

    setSelectedMethod(method);
    setStep("PROCESSING");

    logger.info(`[CHECKOUT] Payment method selected: ${method}`);
    logger.info(`[CHECKOUT] Processing upgrade to plan: ${plan.name}`);

    try {
      // Call upgrade API (creates PENDING subscription + ASAAS charge)
      const result = await apiRequest("/api/sellers/upgrade", {
        method: "POST",
        token,
        body: JSON.stringify({ planId, cpf }), // ✅ NOVO: Enviar CPF no body
        headers: { "Content-Type": "application/json" },
      });

      logger.info("[CHECKOUT] Upgrade API response:", result);

      if (!result?.success) {
        throw new Error(result?.message || "Erro ao processar pagamento");
      }

      // Usar campos flattened da resposta (backend agora retorna tudo no nível correto)
      const payment = {
        id: result.data.chargeId || result.data.payment?.id || "unknown",
        status: "PENDING",
        invoiceUrl: result.data.paymentUrl || result.data.payment?.invoiceUrl,
        bankSlipUrl: result.data.bankSlipUrl || result.data.payment?.bankSlipUrl,
        pixCode: result.data.pixCode || result.data.payment?.pixCode,
        pixQrCode: result.data.pixQrCode || result.data.payment?.pixQrCode,
        dueDate: result.data.dueDate || result.data.payment?.dueDate,
      };

      logger.info("[CHECKOUT] Payment data extracted:", {
        id: payment.id,
        hasPixCode: !!payment.pixCode,
        hasPixQrCode: !!payment.pixQrCode,
        hasBankSlipUrl: !!payment.bankSlipUrl,
      });

      logger.info("[CHECKOUT] ✅ Payment created:", {
        id: payment.id,
        status: payment.status,
        method,
      });

      setPaymentData(payment);

      // Route based on payment method
      if (method === "PIX") {
        if (!payment.pixCode || !payment.pixQrCode) {
          logger.error("[CHECKOUT] PIX data missing:", {
            pixCode: payment.pixCode,
            pixQrCode: payment.pixQrCode,
          });
          throw new Error(
            "QR Code PIX não está disponível no momento. " +
              "Aguarde alguns segundos e tente novamente, ou escolha Cartão."
          );
        }
        logger.info("[CHECKOUT] Showing PIX payment display");
        setStep("PIX_DISPLAY");
      } else if (method === "CREDIT_CARD") {
        logger.info("[CHECKOUT] Redirecting to ASAAS for credit card payment");
        setStep("REDIRECT_CARD");
        toast.success("Redirecionando para pagamento...");
        // Redirect to ASAAS checkout page
        setTimeout(() => {
          window.location.href = payment.invoiceUrl;
        }, 2000);
      }
    } catch (error) {
      logger.error("[CHECKOUT] ❌ Error processing payment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao processar pagamento";
      setError(errorMessage);
      setStep("ERROR");
      toast.error(errorMessage);
    }
  };

  // 3. Handle payment success
  const handlePaymentSuccess = () => {
    logger.info("[CHECKOUT] ✅ Payment confirmed - redirecting to plans");
    toast.success("Pagamento confirmado! Plano ativado.");
    setTimeout(() => {
      navigate("/seller/plans");
    }, 2000);
  };

  // 4. Render UI based on step
  if (step === "LOADING") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (step === "SELECT_METHOD" && plan) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
            <p className="text-gray-600">Escolha como deseja pagar</p>
          </div>

          <PlanSummary plan={plan} />

          {/* ✅ NOVO: Campo CPF obrigatório */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
              CPF (obrigatório para pagamento) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => {
                // Permitir apenas números e limitar a 11 dígitos
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 11) {
                  setCpf(value);
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              maxLength={14}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              {cpf.length > 0 && cpf.replace(/\D/g, "").length === 11 ? (
                <span className="text-green-600">✓ CPF válido</span>
              ) : cpf.length > 0 ? (
                <span className="text-red-600">✗ CPF deve ter 11 dígitos</span>
              ) : (
                "Informe seu CPF para gerar o pagamento"
              )}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <PaymentMethodSelector onSelect={handleMethodSelect} />
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/seller/plans")}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              ← Voltar para planos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "PROCESSING") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processando pagamento...
          </h2>
          <p className="text-gray-600">
            Gerando seu {selectedMethod === "PIX" ? "código PIX" : selectedMethod === "BOLETO" ? "boleto" : "link de pagamento"}
          </p>
        </div>
      </div>
    );
  }

  if (step === "PIX_DISPLAY" && paymentData && plan) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <PixPaymentDisplay
          pixCode={paymentData.pixCode!}
          pixQrCode={paymentData.pixQrCode!}
          amount={plan.price}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    );
  }

  if (step === "REDIRECT_CARD") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Redirecionando para pagamento...
          </h2>
          <p className="text-gray-600 mb-4">
            Você será levado para o ambiente seguro ASAAS para finalizar o pagamento com cartão de crédito.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              🔒 Pagamento 100% seguro e criptografado
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "ERROR") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Erro no Checkout
            </h2>
            <p className="text-gray-600 mb-6">{error || "Erro desconhecido"}</p>
            <button
              onClick={() => navigate("/seller/plans")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar para Planos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
