'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billingPeriod: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  maxAds: number;
  maxPhotosPerAd: number;
  supportLevel: string;
  features: string[];
  isActive: boolean;
  order: number;
}

interface PlanSelectorProps {
  onPlanSelect?: (planId: string) => void;
  selectedPlanId?: string;
  showPaymentButton?: boolean;
}

export default function PlanSelector({ 
  onPlanSelect, 
  selectedPlanId, 
  showPaymentButton = true 
}: PlanSelectorProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>(selectedPlanId || '');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [processingPayment, setProcessingPayment] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans');
      if (response.ok) {
        const result = await response.json();
        setPlans(result.data || []);
      } else {
        toast.error('Erro ao carregar planos');
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    onPlanSelect?.(planId);
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      toast.error('Selecione um plano primeiro');
      return;
    }

    setProcessingPayment(true);

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan,
          paymentMethod
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirecionar para o checkout do Mercado Pago
        if (data.init_point) {
          window.location.href = data.init_point;
        } else {
          toast.error('Erro ao processar pagamento');
        }
      } else {
        toast.error(data.error || 'Erro ao processar pagamento');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getBillingText = (period: string) => {
    switch (period) {
      case 'MONTHLY':
        return '/mês';
      case 'YEARLY':
        return '/ano';
      case 'LIFETIME':
        return 'único';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const isPopular = plan.slug === 'pequena-empresa';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:shadow-lg'
              } ${
                isPopular ? 'border-green-500' : ''
              }`}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white px-3 py-1">
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">
                    {plan.price === 0 ? 'Grátis' : formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground ml-1">
                      {getBillingText(plan.billingPeriod)}
                    </span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>{plan.maxAds === -1 ? 'Anúncios ilimitados' : `${plan.maxAds} anúncios`}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>{plan.maxPhotosPerAd} fotos por anúncio</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Suporte por {plan.supportLevel.toLowerCase()}</span>
                  </div>
                </div>
                
                {plan.features.length > 0 && (
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {isSelected && (
                  <div className="mt-4 p-2 bg-primary/10 rounded-lg">
                    <div className="flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary mr-2" />
                      <span className="text-primary font-medium">Plano Selecionado</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {showPaymentButton && selectedPlan && (
        <div className="space-y-4 max-w-md mx-auto">
          <div className="space-y-3">
            <Label className="text-base font-medium">Método de Pagamento</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(value) => setPaymentMethod(value as 'pix' | 'credit_card')}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix" className="cursor-pointer">PIX</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit_card" id="credit_card" />
                <Label htmlFor="credit_card" className="cursor-pointer">Cartão de Crédito</Label>
              </div>
            </RadioGroup>
          </div>
          
          <Button 
            onClick={handlePayment}
            disabled={processingPayment}
            className="w-full"
            size="lg"
          >
            {processingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              'Continuar para Pagamento'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}