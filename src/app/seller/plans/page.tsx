import { logger } from "@/lib/logger";

"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import {
  Crown,
  Check,
  X,
  Zap,
  Package,
  Image,
  Star,
  Calendar,
  CreditCard,
  Shield,
  Users,
  TrendingUp,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Loader2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billingPeriod: string;
  maxAds: number;
  maxPhotos: number;
  maxProducts: number;
  maxImages: number;
  maxCategories: number;
  prioritySupport: boolean;
  support: string;
  features: string[];
  isActive: boolean;
  order: number;
  popular?: boolean;
}

interface CurrentSubscription {
  id: string;
  planId: string;
  plan: Plan;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentMethod: string;
}

// Mock data removed - using real data from Supabase

export default function SellerPlansPage() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [showPollingProgress, setShowPollingProgress] = useState(false);

  const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  };

  const toBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "y"].includes(normalized)) return true;
      if (["false", "0", "no", "n"].includes(normalized)) return false;
    }
    return fallback;
  };

  const parsePlanFeatures = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : String(item)))
        .filter(Boolean);
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === "string" ? item.trim() : String(item)))
            .filter(Boolean);
        }
      } catch {
        return value
          .split(/[\r\n,;]+/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    if (value && typeof value === "object") {
      return Object.values(value as Record<string, unknown>)
        .map((item) => (typeof item === "string" ? item.trim() : String(item)))
        .filter(Boolean);
    }
    return [];
  };

  const normalizePlans = (rawPlans: unknown): Plan[] => {
    if (!Array.isArray(rawPlans)) {
      return [];
    }

    return rawPlans.map((plan: any) => ({
      ...plan,
      id:
        typeof plan?.id === "string"
          ? plan.id
          : String(plan?.id || plan?.slug || plan?.name || Math.random().toString(36).slice(2)),
      slug:
        typeof plan?.slug === "string"
          ? plan.slug
          : typeof plan?.name === "string"
            ? plan.name.toLowerCase().replace(/\s+/g, "-")
            : "",
      price: (() => {
        const normalizedPrice = toNumber(plan?.price);
        const slug = (plan?.slug || plan?.name || "").toString().toLowerCase();
        if (slug.includes("gratuit") || normalizedPrice <= 0) {
          return 0;
        }
        return normalizedPrice;
      })(),
      billingPeriod:
        typeof plan?.billingPeriod === "string"
          ? plan.billingPeriod
          : typeof plan?.billing_period === "string"
            ? plan.billing_period
            : "MONTHLY",
      maxAds: toNumber(plan?.maxAds, -1),
      maxPhotos: toNumber(plan?.maxPhotos, toNumber(plan?.maxPhotosPerAd, -1)),
      maxPhotosPerAd: toNumber(plan?.maxPhotosPerAd, toNumber(plan?.maxPhotos, -1)),
      maxProducts: toNumber(plan?.maxProducts, toNumber(plan?.maxAds, -1)),
      maxImages: toNumber(plan?.maxImages, toNumber(plan?.maxPhotosPerAd, -1)),
      maxCategories: toNumber(plan?.maxCategories, -1),
      prioritySupport: toBoolean(plan?.prioritySupport ?? plan?.priority_support),
      support:
        typeof plan?.support === "string"
          ? plan.support
          : typeof plan?.supportLevel === "string"
            ? plan.supportLevel
            : "Basic support",
      isActive: toBoolean(plan?.isActive ?? plan?.is_active, true),
      features: parsePlanFeatures(plan?.features),
    }));
  };

  const fetchSubscriptionWithFallback = async (): Promise<any | null> => {
    const endpoints = ["/api/sellers/subscription", "/api/seller/subscription"];

    for (const endpoint of endpoints) {
      try {
        const response = await apiRequest(endpoint, { token });
        if (response) {
          return response;
        }
      } catch (error) {
        if (
          !(error instanceof Error) ||
          (!error.message.includes("404") && !/not found|não encontrado|nao encontrado/i.test(error.message))
        ) {
          throw error;
        }
        // Otherwise try next fallback
      }
    }

    return null;
  };

  useEffect(() => {
    // Verificar autenticação e tipo de usuário (lowercase normalizado)
    if (!user || user.type !== "seller") {
      navigate("/login");
      return;
    }

    loadPlansAndSubscription();
  }, [user, navigate]);

  // Polling para verificar status da subscription quando está PENDING
  useEffect(() => {
    // Só fazer polling se há subscription PENDING
    if (!currentSubscription || currentSubscription.status?.toLowerCase() !== "pending") {
      setShowPollingProgress(false);
      setPollingCount(0);
      return;
    }

    logger.info("[POLLING] Subscription PENDING detectada - iniciando polling...");
    setShowPollingProgress(true);
    setPollingCount(0);

    let count = 0;
    const maxPolls = 60; // Máximo 60 verificações (5 minutos)

    // Verificar status a cada 5 segundos
    const interval = setInterval(() => {
      count++;
      setPollingCount(count);
      logger.info(`[POLLING] Verificando status da subscription... (${count}/${maxPolls})`);
      loadPlansAndSubscription();

      if (count >= maxPolls) {
        clearInterval(interval);
        setShowPollingProgress(false);
        logger.info("[POLLING] Timeout atingido - parando polling");
        toast.warning("Pagamento ainda pendente. Atualize a página para verificar o status.");
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [currentSubscription?.status]);

  const cancelPendingSubscription = async () => {
    if (!currentSubscription?.id) return;

    try {
      logger.info(`[CANCEL] Cancelando subscription PENDING: ${currentSubscription.id}`);

      const result = await apiRequest("/api/sellers/cancel-pending-subscription", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
      });

      if (result?.success) {
        toast.success("Assinatura pendente cancelada com sucesso");
        await loadPlansAndSubscription();
      } else {
        throw new Error(result?.message || "Erro ao cancelar assinatura");
      }
    } catch (error) {
      logger.error("[CANCEL] Erro ao cancelar subscription:", error);
      toast.error("Erro ao cancelar assinatura. Tente novamente.");
    }
  };

  const loadPlansAndSubscription = async () => {
    setIsLoading(true);
    let availablePlans: Plan[] = [];

    try {
      // Buscar planos disponiveis usando dados reais do Supabase
      const plansData = await apiRequest("/api/plans", { token });
      const rawPlanList = Array.isArray(plansData?.data) && plansData.data.length > 0
        ? plansData.data
        : Array.isArray(plansData?.plans)
          ? plansData.plans
          : [];

      availablePlans = normalizePlans(rawPlanList);
      setPlans(availablePlans);

      // Buscar assinatura atual
      const subscriptionResponse = await fetchSubscriptionWithFallback();

      if (subscriptionResponse?.data) {
        const planData = subscriptionResponse.data.plan
          ? {
              ...subscriptionResponse.data.plan,
              features: parsePlanFeatures(subscriptionResponse.data.plan.features),
              price: (() => {
                const rawPrice = toNumber(subscriptionResponse.data.plan.price);
                const slug = (subscriptionResponse.data.plan.slug || subscriptionResponse.data.plan.name || "")
                  .toString()
                  .toLowerCase();
                if (slug.includes("gratuit") || rawPrice <= 0) {
                  return 0;
                }
                return rawPrice;
              })(),
              slug:
                typeof subscriptionResponse.data.plan.slug === "string"
                  ? subscriptionResponse.data.plan.slug
                  : typeof subscriptionResponse.data.plan.name === "string"
                    ? subscriptionResponse.data.plan.name.toLowerCase().replace(/\s+/g, "-")
                    : "",
            }
          : undefined;

        setCurrentSubscription({
          ...subscriptionResponse.data,
          plan: planData ?? subscriptionResponse.data.plan,
        });
      } else {
        // Se nao tem assinatura, criar uma padrao para o plano gratuito
        if (availablePlans.length > 0) {
          const freePlan = availablePlans.find((p) => p.price === 0) || availablePlans[0];
          setCurrentSubscription({
            id: "default",
            planId: freePlan.id,
            plan: freePlan,
            status: "active",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            autoRenew: true,
            paymentMethod: "Gratuito",
          });
        }
      }
    } catch (error) {
      logger.error("Error loading plans and subscription:", error);
      toast.error("Erro ao carregar planos. Tente novamente.");
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePlan = async (planId: string) => {
    if (!currentSubscription || planId === currentSubscription.planId) return;

    setIsUpgrading(planId);

    // ✅ CORREÇÃO: Detectar se plano é PAGO ou GRATUITO
    const targetPlan = plans.find((p) => p.id === planId);

    if (!targetPlan) {
      logger.error(`[UPGRADE] Plano não encontrado: ${planId}`);
      toast.error("Plano não encontrado. Tente novamente.");
      setIsUpgrading(null);
      return;
    }

    const planPrice = toNumber(targetPlan.price, 0);
    const isPaidPlan = planPrice > 0;

    logger.info(`[UPGRADE] Plano ${targetPlan.name}: ${isPaidPlan ? "PAGO" : "GRATUITO"} (price: ${planPrice})`);

    // ✅ CORREÇÃO: Planos PAGOS redirecionam direto para checkout (SEM chamar API aqui)
    // O checkout irá coletar CPF e chamar API /api/sellers/upgrade com { planId, cpf }
    if (isPaidPlan) {
      logger.info("💳 Redirecionando para checkout (plano pago) - CPF será coletado lá");
      navigate(`/seller/checkout?planId=${planId}`);
      setIsUpgrading(null);
      return;
    }

    // ✅ Planos GRATUITOS continuam com lógica original (chamar API direto, sem CPF, sem checkout)
    const upgradeEndpoints = ["/api/sellers/upgrade", "/api/seller/upgrade"];

    const attemptUpgrade = async (endpoint: string) => {
      return apiRequest(endpoint, {
        method: "POST",
        token,
        body: JSON.stringify({ planId }), // Sem CPF (plano gratuito não precisa)
        headers: {
          "Content-Type": "application/json",
        },
      });
    };

    try {
      let result: any = null;
      let lastError: Error | null = null;

      for (const endpoint of upgradeEndpoints) {
        try {
          result = await attemptUpgrade(endpoint);
          lastError = null;
          break;
        } catch (error) {
          if (
            error instanceof Error &&
            (error.message.includes("404") || /not found|não encontrado|nao encontrado/i.test(error.message))
          ) {
            lastError = error;
            continue;
          }
          throw error;
        }
      }

      if (!result) {
        if (lastError) throw lastError;
        throw new Error("Erro desconhecido ao atualizar plano");
      }

      // Planos gratuitos não retornam paymentUrl (ativados imediatamente)
      toast.success("Plano atualizado com sucesso!");
      loadPlansAndSubscription();
    } catch (error) {
      logger.error("Error upgrading plan:", error);
      toast.error("Erro ao atualizar plano. Tente novamente.");
    } finally {
      setIsUpgrading(null);
    }
  };

  const formatValue = (value: number | undefined | null) => {
    // Null check para evitar crash quando campos não existem no banco
    if (value === undefined || value === null) return "0";
    return value === -1 ? "Ilimitado" : value.toString();
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes("gratuito")) return Package;
    if (name.includes("micro")) return Zap;
    if (name.includes("pequena")) return Star;
    if (name.includes("simples")) return TrendingUp;
    if (name.includes("plus") || name.includes("empresa")) return Crown;
    return Package;
  };

  const findPlanByIdentifier = (identifier: string) =>
    plans.find((plan) => plan.id === identifier || plan.slug === identifier);

  const isCurrentPlan = (planId: string) => {
    if (!currentSubscription) return false;
    if (currentSubscription.planId === planId) return true;

    const planMatch = findPlanByIdentifier(planId);
    if (!planMatch) return false;

    return (
      currentSubscription.planId === planMatch.id ||
      currentSubscription.planId === planMatch.slug
    );
  };

  const canChangePlan = (planId: string) => {
    if (!currentSubscription) return false;
    if (currentSubscription.planId === planId) return false;

    // Bloquear mudança se subscription estiver PENDING (aguardando pagamento)
    if (currentSubscription.status?.toLowerCase() === "pending") return false;

    const currentPlan = findPlanByIdentifier(currentSubscription.planId);
    const targetPlan = findPlanByIdentifier(planId);

    if (!targetPlan) return false;
    if (!currentPlan) return true;

    // Permitir mudança para QUALQUER plano diferente (upgrade ou downgrade)
    return true;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Planos e Assinaturas</h1>
              <p className="text-gray-600">Escolha o plano ideal para seu negócio</p>
            </div>
            {currentSubscription && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Plano Atual</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600">{currentSubscription.plan.name}</p>
                    {currentSubscription.status?.toLowerCase() === "pending" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                        <Clock className="w-3 h-3" />
                        Aguardando Pagamento
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {React.createElement(getPlanIcon(currentSubscription.plan.name), {
                    className: "h-6 w-6 text-blue-600",
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerta de Polling - Pagamento Pendente */}
        {showPollingProgress && currentSubscription?.status?.toLowerCase() === "pending" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                  <h3 className="text-lg font-semibold text-yellow-900">Aguardando Confirmação de Pagamento</h3>
                </div>
                <p className="text-sm text-yellow-800 mb-4">
                  Verificando status do pagamento automaticamente...
                </p>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-yellow-100 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(pollingCount / 60) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-yellow-700 font-medium whitespace-nowrap">
                    {pollingCount}/60 verificações
                  </span>
                </div>
                <div className="mt-4 flex items-center space-x-2 text-xs text-yellow-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Próxima verificação em 5 segundos...</span>
                </div>
              </div>
              <button
                onClick={cancelPendingSubscription}
                className="ml-4 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors whitespace-nowrap"
              >
                Cancelar Assinatura
              </button>
            </div>
          </div>
        )}

        {/* Assinatura Atual */}
        {currentSubscription && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Minha Assinatura</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    currentSubscription.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {currentSubscription.status === "active" ? "Ativa" : "Inativa"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Plano</p>
                    <p className="font-medium text-gray-900">{currentSubscription.plan.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valor</p>
                    <p className="font-medium text-gray-900">
                      {currentSubscription.plan.price === 0
                        ? "Gratuito"
                        : `R$ ${currentSubscription.plan.price.toFixed(2)}/mês`}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Próxima cobrança</p>
                    <p className="font-medium text-gray-900">
                      {new Date(currentSubscription.endDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Renovação automática</p>
                    <p className="font-medium text-gray-900">
                      {currentSubscription.autoRenew ? "Ativada" : "Desativada"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Limites atuais</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Produtos:</span>
                        <span className="text-sm font-medium">{formatValue(currentSubscription.plan.maxProducts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Anúncios/mês:</span>
                        <span className="text-sm font-medium">{formatValue(currentSubscription.plan.maxAds)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Fotos por produto:</span>
                        <span className="text-sm font-medium">{formatValue(currentSubscription.plan.maxPhotos)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.name);
            const isCurrent = isCurrentPlan(plan.id);
            const canChangeToThis = canChangePlan(plan.id);

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${
                  plan.popular
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : isCurrent
                      ? "border-green-500 ring-2 ring-green-200"
                      : "border-gray-200 hover:border-blue-300"
                }`}
              >
                {plan.popular && (
                  <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium rounded-t-lg">
                    ⭐ Mais Popular
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`h-8 w-8 ${isCurrent ? "text-green-600" : "text-blue-600"}`} />
                    {isCurrent && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Atual
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price === 0 ? "Grátis" : `R$ ${plan.price.toFixed(2)}`}
                      </span>
                      {plan.price > 0 && <span className="text-gray-600 ml-1">/mês</span>}
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Produtos</span>
                      <span className="font-medium">{formatValue(plan.maxProducts)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Anúncios/mês</span>
                      <span className="font-medium">{formatValue(plan.maxAds)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fotos</span>
                      <span className="font-medium">{formatValue(plan.maxPhotos)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={isCurrent || !canChangeToThis || isUpgrading === plan.id}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isCurrent
                        ? "bg-green-100 text-green-800 cursor-not-allowed"
                        : canChangeToThis
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-100 text-gray-500 cursor-not-allowed"
                    } ${isUpgrading === plan.id ? "opacity-50" : ""}`}
                  >
                    {isUpgrading === plan.id ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processando...
                      </div>
                    ) : isCurrent ? (
                      "Plano Atual"
                    ) : canChangeToThis ? (
                      plan.price > (currentSubscription?.plan?.price || 0)
                        ? "Fazer Upgrade"
                        : plan.price < (currentSubscription?.plan?.price || 0)
                          ? "Fazer Downgrade"
                          : "Alterar Plano"
                    ) : (
                      "Não disponível"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Ajuda */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dúvidas Frequentes</h2>

          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-medium text-gray-900 mb-2">Como funciona a cobrança?</h3>
              <p className="text-sm text-gray-600">
                A cobrança é realizada mensalmente no cartão de crédito cadastrado. O valor é proporcional ao período de
                uso.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="font-medium text-gray-900 mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-sm text-gray-600">
                Sim, você pode cancelar sua assinatura a qualquer momento. O plano permanecerá ativo até o fim do
                período já pago.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">E se eu exceder os limites do plano?</h3>
              <p className="text-sm text-gray-600">
                Você receberá notificações quando se aproximar dos limites. Para continuar usando todas as
                funcionalidades, será necessário fazer upgrade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

