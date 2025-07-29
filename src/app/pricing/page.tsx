'use client';

import { Check, Star, Crown, Building2, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    id: 'basico',
    name: 'Básico',
    price: 'Grátis',
    period: '30 dias',
    description: 'Ideal para quem está começando',
    icon: Star,
    color: 'from-gray-500 to-gray-600',
    features: [
      '5 anúncios ativos',
      'Validade de 30 dias',
      'Suporte por e-mail',
      'Fotos básicas (até 3 por anúncio)',
      'Localização no mapa',
      'Contato via WhatsApp/Telefone'
    ],
    limitations: [
      'Sem destaque nos resultados',
      'Sem impulsionamento',
      'Sem estatísticas detalhadas'
    ]
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: 'R$ 29,90',
    period: '/mês',
    description: 'Para vendedores regulares',
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    popular: true,
    features: [
      '20 anúncios ativos',
      'Validade de 60 dias',
      'Suporte prioritário',
      'Fotos em alta qualidade (até 8 por anúncio)',
      'Destaque na categoria',
      'Impulsionamento básico (2x por mês)',
      'Estatísticas básicas',
      'Badge de vendedor verificado'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'R$ 59,90',
    period: '/mês',
    description: 'Para vendedores experientes',
    icon: Crown,
    color: 'from-purple-500 to-purple-600',
    features: [
      '50 anúncios ativos',
      'Validade de 90 dias',
      'Suporte VIP (chat ao vivo)',
      'Fotos profissionais ilimitadas',
      'Destaque na página inicial',
      'Impulsionamento avançado (5x por mês)',
      'Estatísticas detalhadas',
      'Loja personalizada',
      'Múltiplas formas de contato'
    ]
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    price: 'R$ 99,90',
    period: '/mês',
    description: 'Para empresas e grandes vendedores',
    icon: Building2,
    color: 'from-emerald-500 to-emerald-600',
    features: [
      'Anúncios ilimitados',
      'Validade de 120 dias',
      'Gerente de conta dedicado',
      'Fotos e vídeos profissionais',
      'Destaque premium em todas as páginas',
      'Impulsionamento ilimitado',
      'Analytics completo',
      'API para integração',
      'Múltiplos usuários',
      'Relatórios personalizados'
    ]
  }
];

const paymentMethods = [
  'PIX (5% de desconto)',
  'Cartão de Crédito (até 12x)',
  'Boleto Bancário',
  'Débito Automático'
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Planos para Vendedores
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-8">
            Escolha o plano ideal para impulsionar suas vendas em Erechim-RS
          </p>
          <div className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-full inline-block font-semibold">
            🎉 30 dias grátis + Garantia de 7 dias
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  plan.popular ? 'border-blue-500 ring-4 ring-blue-100' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}
                
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      {plan.period && (
                        <span className="text-gray-600 ml-1">{plan.period}</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations && (
                    <div className="mb-6">
                      <p className="text-sm font-medium text-gray-500 mb-2">Limitações:</p>
                      <ul className="space-y-1">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="text-xs text-gray-500">
                            • {limitation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link
                    to={`/auth/register?plan=${plan.id}`}
                    className={`w-full py-3 px-6 rounded-lg font-semibold text-center transition-all duration-300 block ${
                      plan.popular
                        ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.price === 'Grátis' ? 'Começar Grátis' : 'Escolher Plano'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Methods */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Formas de Pagamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {paymentMethods.map((method, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
                <p className="text-gray-700 font-medium">{method}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Perguntas Frequentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Posso cancelar a qualquer momento?</h3>
              <p className="text-gray-600">Sim, você pode cancelar seu plano a qualquer momento. Não há fidelidade.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Como funciona a garantia de 7 dias?</h3>
              <p className="text-gray-600">Se não ficar satisfeito, devolvemos 100% do valor pago nos primeiros 7 dias.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Posso fazer upgrade do plano?</h3>
              <p className="text-gray-600">Sim, você pode fazer upgrade a qualquer momento e pagar apenas a diferença proporcional.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Há desconto para pagamento anual?</h3>
              <p className="text-gray-600">Sim, oferecemos 20% de desconto para pagamentos anuais à vista.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Pronto para começar a vender?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Junte-se a centenas de vendedores em Erechim-RS
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth/register"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Começar Grátis
              </Link>
              <a
                href="mailto:grupomaboon@gmail.com"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Falar com Consultor
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}