'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone, FileText, Check, Clock, X } from 'lucide-react';
import { usePayment, PaymentData } from '@/store/paymentStore';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';

interface CheckoutFormData {
  email: string;
  cpf: string;
  fullName: string;
  phone: string;
  address: {
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

const initialFormData: CheckoutFormData = {
  email: '',
  cpf: '',
  fullName: '',
  phone: '',
  address: {
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  }
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('orderId') || `order_${Date.now()}`;
  
  const {
    paymentMethods,
    currentPayment,
    isProcessing,
    error,
    createPayment,
    processPayment,
    clearError,
    isPixPayment,
    isCardPayment,
    isPending,
    isApproved
  } = usePayment();
  
  const { items, total, clearCart } = useCartStore();
  
  const [step, setStep] = useState<'form' | 'payment' | 'confirmation'>('form');
  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethods[0]);
  const [cardData, setCardData] = useState({
    number: '',
    holderName: '',
    expiryDate: '',
    cvv: '',
    cpf: ''
  });
  const [installments, setInstallments] = useState(1);
  const [pixTimer, setPixTimer] = useState(0);

  // PIX timer effect
  useEffect(() => {
    if (isPixPayment && currentPayment?.expiresAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(currentPayment.expiresAt!).getTime();
        const timeLeft = Math.max(0, Math.floor((expiry - now) / 1000));
        setPixTimer(timeLeft);
        
        if (timeLeft === 0) {
          clearInterval(interval);
          toast.error('Código PIX expirado. Gere um novo código.');
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isPixPayment, currentPayment]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && step === 'form') {
      navigate('/cart');
    }
  }, [items, step, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      const paymentData: PaymentData = {
        method: selectedPaymentMethod,
        amount: total,
        installments: selectedPaymentMethod.type === 'credit_card' ? installments : undefined,
        cardData: isCardPayment ? {
          ...cardData,
          cpf: formData.cpf
        } : undefined,
        pixData: isPixPayment ? {
          cpf: formData.cpf,
          email: formData.email
        } : undefined
      };

      const payment = await createPayment(orderId, paymentData);
      
      if (selectedPaymentMethod.type === 'pix') {
        setStep('confirmation');
        toast.success('Código PIX gerado com sucesso!');
      } else {
        const success = await processPayment(payment.id);
        if (success) {
          setStep('confirmation');
          clearCart();
          toast.success('Pagamento aprovado com sucesso!');
        }
      }
    } catch (error) {
      toast.error('Erro ao processar pagamento');
    }
  };

  const copyPixCode = () => {
    if (currentPayment?.pixCode) {
      navigator.clipboard.writeText(currentPayment.pixCode);
      toast.success('Código PIX copiado!');
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'pix': return <Smartphone className="h-5 w-5" />;
      case 'credit_card':
      case 'debit_card': return <CreditCard className="h-5 w-5" />;
      case 'boleto': return <FileText className="h-5 w-5" />;
      default: return <CreditCard className="h-5 w-5" />;
    }
  };

  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            {isPixPayment ? (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Smartphone className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">PIX Gerado com Sucesso!</h1>
                <p className="text-gray-600 mb-6">Use o código abaixo para realizar o pagamento</p>
                
                {pixTimer > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-orange-700">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Expira em: {formatTime(pixTimer)}</span>
                    </div>
                  </div>
                )}
                
                {currentPayment?.pixQrCode && (
                  <div className="mb-6">
                    <img 
                      src={currentPayment.pixQrCode} 
                      alt="QR Code PIX" 
                      className="mx-auto mb-4 border rounded-lg"
                    />
                    <p className="text-sm text-gray-600 mb-4">Escaneie o QR Code ou copie o código abaixo</p>
                  </div>
                )}
                
                {currentPayment?.pixCode && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-xs text-gray-600 mb-2">Código PIX:</p>
                    <p className="font-mono text-sm break-all text-gray-800 mb-3">
                      {currentPayment.pixCode}
                    </p>
                    <button
                      onClick={copyPixCode}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Copiar Código
                    </button>
                  </div>
                )}
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    R$ {total.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-gray-600">Após o pagamento, você receberá a confirmação por email</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Pagamento Aprovado!</h1>
                <p className="text-gray-600 mb-6">Seu pedido foi confirmado e você receberá os detalhes por email</p>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Pedido:</p>
                      <p className="font-medium">#{orderId.slice(-8).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total:</p>
                      <p className="font-medium">R$ {total.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Método:</p>
                      <p className="font-medium">{selectedPaymentMethod.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status:</p>
                      <p className="font-medium text-green-600">Aprovado</p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => navigate('/buyer/orders')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ver Meus Pedidos
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => step === 'form' ? navigate('/cart') : setStep('form')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Finalizar Compra</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'form' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {step === 'form' ? '1' : <Check className="h-4 w-4" />}
            </div>
            <div className="w-16 h-1 bg-gray-200 mx-2">
              <div className={`h-full bg-blue-600 transition-all duration-300 ${
                step === 'payment' ? 'w-full' : 'w-0'
              }`} />
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'payment' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 'form' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Dados de Entrega</h2>
                
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CPF *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.cpf}
                        onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CEP *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address.zipCode}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, zipCode: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endereço *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address.street}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, street: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address.number}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, number: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={formData.address.complement}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, complement: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bairro *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address.neighborhood}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, neighborhood: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estado *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address.state}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, state: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address.city}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        address: { ...prev.address, city: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Continuar para Pagamento
                  </button>
                </form>
              </div>
            )}

            {step === 'payment' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Forma de Pagamento</h2>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-red-700">
                      <X className="h-5 w-5" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Payment Methods */}
                  <div className="space-y-3">
                    {paymentMethods.filter(method => method.enabled).map(method => (
                      <label
                        key={method.id}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentMethod.id === method.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedPaymentMethod.id === method.id}
                          onChange={() => setSelectedPaymentMethod(method)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            {getPaymentIcon(method.type)}
                            <div>
                              <p className="font-medium text-gray-900">{method.name}</p>
                              <p className="text-sm text-gray-600">{method.processingTime}</p>
                            </div>
                          </div>
                          {method.fee && method.fee > 0 && (
                            <span className="text-sm text-gray-600">
                              Taxa: R$ {method.fee.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {/* Card Form */}
                  {isCardPayment && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900">Dados do Cartão</h3>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número do Cartão *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="0000 0000 0000 0000"
                            value={cardData.number}
                            onChange={(e) => setCardData(prev => ({ ...prev, number: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nome no Cartão *
                          </label>
                          <input
                            type="text"
                            required
                            value={cardData.holderName}
                            onChange={(e) => setCardData(prev => ({ ...prev, holderName: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Validade *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="MM/AA"
                            value={cardData.expiryDate}
                            onChange={(e) => setCardData(prev => ({ ...prev, expiryDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CVV *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="000"
                            value={cardData.cvv}
                            onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {selectedPaymentMethod.type === 'credit_card' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Parcelas
                          </label>
                          <select
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                              <option key={num} value={num}>
                                {num}x de R$ {(total / num).toFixed(2).replace('.', ',')} 
                                {num === 1 ? ' à vista' : ` (Total: R$ ${total.toFixed(2).replace('.', ',')})`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processando...
                      </>
                    ) : (
                      `Finalizar Compra - R$ ${total.toFixed(2).replace('.', ',')}`
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Pedido</h3>
              
              <div className="space-y-3 mb-4">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-gray-600">Qtd: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frete:</span>
                  <span className="text-green-600">Grátis</span>
                </div>
                {selectedPaymentMethod.fee && selectedPaymentMethod.fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxa de pagamento:</span>
                    <span className="text-gray-900">R$ {selectedPaymentMethod.fee.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>R$ {(total + (selectedPaymentMethod.fee || 0)).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}