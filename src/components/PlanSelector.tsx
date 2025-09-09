'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, Copy, CreditCard, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { get, post } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { appCache } from '@/lib/cache';

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

      const response = await get('/api/plans');
      
      // Armazenar no cache
      appCache.setPlans(response, 10 * 60 * 1000); // 10 minutos para planos
      
      setPlans(response.data || response.plans || response);
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

  const handleLoginRedirect = () => {
    toast.info('Faça login para assinar um plano');
    navigate('/login');
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      toast.error('Selecione um plano primeiro');
      return;
    }

    // Verificar se usuário está logado
    if (!isAuthenticated) {
      handleLoginRedirect();
      return;
    }

    setProcessingPayment(true);

    try {
      const response = await post('/payments/create', {
        planId: selectedPlan,
        paymentMethod
      });

      if (response.success) {
        toast.success('Pagamento criado com sucesso!');
        
        if (paymentMethod === 'pix' && response.pix_qr_code) {
          setPixData({
            pixQrCode: `data:image/png;base64,${response.pix_qr_code?.encodedImage}`,
            pixCode: response.pix_qr_code?.payload,
            invoiceUrl: response.invoice_url
          });
          setShowPixModal(true);
        } else if (paymentMethod === 'credit_card') {
          toast.info('Redirecionando para o checkout seguro...');
          setTimeout(() => {
            window.open(response.invoice_url, '_blank');
          }, 1000);
        }
      } else {
        toast.error(response.error || 'Erro ao processar pagamento');
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
    if (!period) return '';
    switch (period.toLowerCase()) {
      case 'monthly':
        return '/mês';
      case 'yearly':
        return '/ano';
      case 'lifetime':
        return 'único';
      default:
        return '';
    }
  };

  const copyPixCode = (pixCode: string) => {
    navigator.clipboard.writeText(pixCode).then(() => {
      toast.success('Código PIX copiado!');
    }).catch(() => {
      toast.error('Erro ao copiar código PIX');
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
    <div className="space-y-6">
      {/* First row - 3 plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
        {plans.slice(0, 3).map((plan) => {
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
                    <span>{plan.maxPhotos} fotos por anúncio</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span>Suporte por {plan.support ? plan.support.toLowerCase() : 'email'}</span>
                  </div>
                </div>
                
                {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div className="space-y-2">
                    {plan.features.map((feature: string, index: number) => (
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
      
      {/* Second row - remaining plans (centered) */}
      {plans.length > 3 && (
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
            {plans.slice(3).map((plan) => {
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
                        <span>{plan.maxPhotos} fotos por anúncio</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span>Suporte por {plan.support ? plan.support.toLowerCase() : 'email'}</span>
                      </div>
                    </div>
                    
                    {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                      <div className="space-y-2">
                        {plan.features.map((feature: string, index: number) => (
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
        </div>
      )}
      
      {showPaymentButton && selectedPlan && (
        <div className="space-y-4 max-w-md mx-auto">
          {/* Informações do usuário logado */}
          {isAuthenticated && user && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-green-800">{user.name}</p>
                  <p className="text-sm text-green-600">{user.email}</p>
                </div>
              </div>
            </div>
          )}
          
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
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            size="lg"
          >
            {processingPayment ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-3" />
                Processando pagamento...
              </>
            ) : !isAuthenticated ? (
              <>
                <LogIn className="h-5 w-5 mr-3" />
                Faça Login para Assinar
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-3" />
                Continuar para Pagamento
              </>
            )}
          </Button>
        </div>
      )}

      {/* PIX Modal */}
      <Modal 
        isOpen={showPixModal} 
        onClose={handleClosePixModal}
        title="Pagamento PIX"
        size="md"
      >
        {pixData && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Escaneie o QR Code abaixo para pagar ou copie o código PIX
              </p>
              {pixData.pixQrCode ? (
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg">
                    <img 
                      src={pixData.pixQrCode} 
                      alt="QR Code PIX" 
                      className="w-48 h-48"
                      style={{ imageRendering: 'pixelated' }}
                      onError={(e) => {
                        console.error('Erro ao carregar QR Code:', e);
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
                <Label className="text-sm font-medium text-gray-700">
                  Código PIX (Copia e Cola)
                </Label>
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
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
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
              <Button
                onClick={handleClosePixModal}
                variant="outline"
                className="flex-1"
              >
                Fechar
              </Button>
              <Button
                onClick={() => copyPixCode(pixData.pixCode)}
                className="flex-1"
              >
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