"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Copy, CreditCard, LogIn, Star, Zap, Shield, Users, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Modal from "@/components/ui/Modal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { appCache } from "@/lib/cache";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billingPeriod: string;
  maxAds: number;
  maxPhotos: number;
  support: string;
  features: string | string[];
  isActive: boolean;
  order: number;
}

interface PlanSelectorProps {
  onPlanSelect?: (planId: string) => void;
  selectedPlanId?: string;
  showPaymentButton?: boolean;
}

export default function PlanSelector({ onPlanSelect, selectedPlanId, showPaymentButton = true }: PlanSelectorProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>(selectedPlanId || "");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const navigate = useNavigate();

  // Autenticação
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      // Verificar cache primeiro
      const cachedPlans = appCache.getPlans();
      if (cachedPlans) {
        setPlans(cachedPlans.data || cachedPlans.plans || cachedPlans);
        setLoading(false);
        return;
      }

      const response = await get("/api/plans");

      // Armazenar no cache
      appCache.setPlans(response, 10 * 60 * 1000); // 10 minutos para planos

      setPlans(response.data || response.plans || response);
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    onPlanSelect?.(planId);
  };

  const handleLoginRedirect = () => {
    toast.info("Faça login para assinar um plano");
    navigate("/login");
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      toast.error("Selecione um plano primeiro");
      return;
    }

    // Verificar se usuário está logado
    if (!isAuthenticated) {
      handleLoginRedirect();
      return;
    }

    setProcessingPayment(true);

    try {
      const response = await post("/payments/create", {
        planId: selectedPlan,
        paymentMethod,
      });

      if (response.success) {
        toast.success("Pagamento criado com sucesso!");

        if (paymentMethod === "pix" && response.pix_qr_code) {
          setPixData({
            pixQrCode: `data:image/png;base64,${response.pix_qr_code?.encodedImage}`,
            pixCode: response.pix_qr_code?.payload,
            invoiceUrl: response.invoice_url,
          });
          setShowPixModal(true);
        } else if (paymentMethod === "credit_card") {
          toast.info("Redirecionando para o checkout seguro...");
          setTimeout(() => {
            window.open(response.invoice_url, "_blank");
          }, 1000);
        }
      } else {
        toast.error(response.error || "Erro ao processar pagamento");
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      toast.error("Erro ao processar pagamento");
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getBillingText = (period: string) => {
    if (!period) return "";
    switch (period.toLowerCase()) {
      case "monthly":
        return "/mês";
      case "yearly":
        return "/ano";
      case "lifetime":
        return "único";
      default:
        return "";
    }
  };

  const getPlanIcon = (planSlug: string) => {
    switch (planSlug) {
      case "gratuito":
        return Star;
      case "pequena-empresa":
        return TrendingUp;
      case "profissional":
        return Zap;
      case "empresa-plus":
        return Shield;
      default:
        return Users;
    }
  };

  const getPlanGradient = (planSlug: string, isSelected: boolean) => {
    const gradients = {
      "gratuito": isSelected ? "from-gray-500 to-gray-700" : "from-gray-100 to-gray-200",
      "pequena-empresa": isSelected ? "from-green-500 to-emerald-600" : "from-green-50 to-emerald-50",
      "profissional": isSelected ? "from-blue-500 to-indigo-600" : "from-blue-50 to-indigo-50",
      "empresa-plus": isSelected ? "from-purple-500 to-pink-600" : "from-purple-50 to-pink-50"
    };
    return gradients[planSlug as keyof typeof gradients] || gradients["gratuito"];
  };

  const copyPixCode = (pixCode: string) => {
    navigator.clipboard
      .writeText(pixCode)
      .then(() => {
        toast.success("Código PIX copiado!");
      })
      .catch(() => {
        toast.error("Erro ao copiar código PIX");
      });
  };

  const handleClosePixModal = () => {
    setShowPixModal(false);
    setPixData(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const isPopular = plan.slug === "pequena-empresa";
          const PlanIcon = getPlanIcon(plan.slug);

          return (
            <Card
              key={plan.id}
              className={`relative cursor-pointer group transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                isSelected 
                  ? "ring-4 ring-blue-500/30 shadow-2xl border-blue-500 scale-105" 
                  : "hover:shadow-xl border-gray-200"
              } ${isPopular ? "border-green-500 shadow-green-100" : ""} overflow-hidden`}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {/* Background Gradient Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br opacity-5 ${getPlanGradient(plan.slug, false)}`} />
              
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-1.5 shadow-lg animate-pulse">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}

              {/* Plan Icon */}
              <div className="absolute top-4 right-4 z-10">
                <div className={`p-2 rounded-full bg-gradient-to-r ${getPlanGradient(plan.slug, isSelected)} ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                  <PlanIcon className="h-4 w-4" />
                </div>
              </div>

              <CardHeader className="text-center pb-4 relative z-10">
                <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 leading-relaxed">
                  {plan.description}
                </CardDescription>
                <div className="mt-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === 0 ? "Grátis" : formatPrice(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-500 ml-2 text-lg">{getBillingText(plan.billingPeriod)}</span>
                    )}
                  </div>
                  {plan.price > 0 && plan.billingPeriod === "monthly" && (
                    <p className="text-xs text-gray-500 mt-1">sem compromisso</p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 relative z-10">
                {/* Core Features */}
                <div className="space-y-3">
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <span>{plan.maxAds === -1 ? "Anúncios ilimitados" : `${plan.maxAds} anúncios`}</span>
                  </div>
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <span>{plan.maxPhotos} fotos por anúncio</span>
                  </div>
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                    <span>Suporte via {plan.support ? plan.support.toLowerCase() : "email"}</span>
                  </div>
                </div>

                {/* Additional Features */}
                {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    {plan.features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                          <Check className="h-3 w-3 text-blue-500" />
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mr-2">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-blue-700 font-semibold">Plano Selecionado</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>


      {showPaymentButton && selectedPlan && (
        <div className="max-w-lg mx-auto mt-12">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {/* User Info */}
            {isAuthenticated && user && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">{user.name}</p>
                    <p className="text-sm text-green-600">{user.email}</p>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <Check className="h-3 w-3 mr-1" />
                      Logado
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="space-y-4 mb-6">
              <Label className="text-lg font-semibold text-gray-900">Método de Pagamento</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as "pix" | "credit_card")}
                className="space-y-3"
              >
                <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all cursor-pointer ${
                  paymentMethod === "pix" 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <RadioGroupItem value="pix" id="pix" className="text-blue-600" />
                  <Label htmlFor="pix" className="cursor-pointer flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">PIX</p>
                        <p className="text-sm text-gray-600">Aprovação instantânea</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        5% OFF
                      </Badge>
                    </div>
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all cursor-pointer ${
                  paymentMethod === "credit_card" 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <RadioGroupItem value="credit_card" id="credit_card" className="text-blue-600" />
                  <Label htmlFor="credit_card" className="cursor-pointer flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Cartão de Crédito</p>
                        <p className="text-sm text-gray-600">Parcelamento disponível</p>
                      </div>
                      <Badge variant="outline">
                        até 12x
                      </Badge>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={processingPayment}
              className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-xl"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                  Processando pagamento...
                </>
              ) : !isAuthenticated ? (
                <>
                  <LogIn className="h-6 w-6 mr-3" />
                  Faça Login para Assinar
                </>
              ) : (
                <>
                  <CreditCard className="h-6 w-6 mr-3" />
                  Finalizar Assinatura
                </>
              )}
            </Button>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Shield className="h-4 w-4" />
              <span>Pagamento 100% seguro e criptografado</span>
            </div>
          </div>
        </div>
      )}

      {/* PIX Modal */}
      <Modal isOpen={showPixModal} onClose={handleClosePixModal} title="Pagamento PIX" size="md">
        {pixData && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Escaneie o QR Code abaixo para pagar ou copie o código PIX</p>
              {pixData.pixQrCode ? (
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg">
                    <img
                      src={pixData.pixQrCode}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                      style={{ imageRendering: "pixelated" }}
                      onError={(e) => {
                        console.error("Erro ao carregar QR Code:", e);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-center mb-4">
                  <div className="p-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 text-sm">QR Code não disponível</p>
                  </div>
                </div>
              )}
            </div>

            {pixData.pixCode && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Código PIX (Copia e Cola)</Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono break-all">
                    {pixData.pixCode}
                  </div>
                  <Button
                    onClick={() => copyPixCode(pixData.pixCode)}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="text-blue-800 font-medium mb-1">Instruções:</p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• O pagamento será processado automaticamente</li>
                    <li>• Você receberá uma confirmação por email</li>
                    <li>• O PIX expira em 24 horas</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={handleClosePixModal} variant="outline" className="flex-1">
                Fechar
              </Button>
              <Button onClick={() => copyPixCode(pixData.pixCode)} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
