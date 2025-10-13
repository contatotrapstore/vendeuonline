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

  useEffect(() => {
    // Verificar autenticação e tipo de usuário
    if (!user || user.userType !== "seller") {
      navigate("/login");
      return;
    }

    loadPlansAndSubscription();
  }, [user, navigate]);

  const loadPlansAndSubscription = async () => {
    try {
      setIsLoading(true);

      // Buscar planos disponíveis usando dados reais do Supabase
      const plansData = await apiRequest("/api/plans", { token });
      if (plansData?.data) {
        setPlans(plansData.data);
      }

      // Buscar assinatura atual
      try {
        const subscriptionData = await apiRequest("/api/seller/subscription", { token });
        if (subscriptionData?.data) {
          setCurrentSubscription(subscriptionData.data);
        }
      } catch (subscriptionError) {
        // Se não tem assinatura, criar uma padrão para o plano gratuito
        if (plansData?.data?.length > 0) {
          const freePlan = plansData.data.find((p) => p.price === 0) || plansData.data[0];
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    if (!currentSubscription || planId === currentSubscription.planId) return;

    setIsUpgrading(planId);
    try {
      const result = await apiRequest("/api/seller/upgrade", {
        method: "POST",
        token,
        body: JSON.stringify({ planId }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (result?.data?.paymentUrl) {
        // Redirecionar para pagamento
        window.open(result.data.paymentUrl, "_blank");
      } else {
        toast.success("Plano atualizado com sucesso!");
        loadPlansAndSubscription();
      }
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

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.planId === planId;
  };

  const canUpgrade = (planId: string) => {
    if (!currentSubscription) return false;
    const currentPlan = plans.find((p) => p.id === currentSubscription.planId);
    const targetPlan = plans.find((p) => p.id === planId);

    if (!currentPlan || !targetPlan) return false;
    return targetPlan.order > currentPlan.order;
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
                  <p className="text-sm text-gray-600">{currentSubscription.plan.name}</p>
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
            const canUpgradeToThis = canUpgrade(plan.id);

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
                    onClick={() => handleUpgradePlan(plan.id)}
                    disabled={isCurrent || !canUpgradeToThis || isUpgrading === plan.id}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isCurrent
                        ? "bg-green-100 text-green-800 cursor-not-allowed"
                        : canUpgradeToThis
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
                    ) : canUpgradeToThis ? (
                      "Fazer Upgrade"
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
