"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import PlanSelector from "@/components/PlanSelector";
import { CreditCard, Smartphone, FileText, Shield, Star, Users, Award, CheckCircle, MessageCircle, ChevronDown } from "lucide-react";

const paymentMethods = [
  {
    icon: Smartphone,
    name: "PIX",
    description: "5% de desconto à vista",
  },
  {
    icon: CreditCard,
    name: "Cartão de Crédito",
    description: "Até 12x sem juros",
  },
  {
    icon: FileText,
    name: "Boleto Bancário",
    description: "Vencimento em 3 dias úteis",
  },
  {
    icon: Shield,
    name: "Débito Automático",
    description: "Renovação automática",
  },
];

const benefits = [
  {
    icon: CheckCircle,
    title: "Sem Compromisso",
    description: "Cancele a qualquer momento sem taxas ou multas",
    color: "text-green-600"
  },
  {
    icon: Users,
    title: "Suporte Especializado",
    description: "Nossa equipe está pronta para ajudar você a vender mais",
    color: "text-blue-600"
  },
  {
    icon: Award,
    title: "Atualizações Gratuitas",
    description: "Novas funcionalidades incluídas automaticamente",
    color: "text-purple-600"
  },
  {
    icon: Shield,
    title: "Garantia de Satisfação",
    description: "30 dias de garantia ou seu dinheiro de volta",
    color: "text-indigo-600"
  },
];

const testimonials = [
  {
    name: "Maria Silva",
    role: "Proprietária da Loja Moda & Estilo",
    image: "https://images.unsplash.com/photo-1494790108755-2616b02b96a3?w=64&h=64&fit=crop&crop=face",
    content: "Desde que assinei o plano Profissional, minhas vendas aumentaram 150%. A plataforma é incrível!",
    rating: 5
  },
  {
    name: "João Santos",
    role: "Vendedor de Eletrônicos",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
    content: "O suporte é excepcional e as ferramentas me ajudam muito no dia a dia. Recomendo!",
    rating: 5
  },
  {
    name: "Ana Costa",
    role: "Empreendedora Digital",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face",
    content: "Melhor investimento que fiz para meu negócio. Plataforma completa e fácil de usar.",
    rating: 5
  }
];

const faqs = [
  {
    question: "Posso mudar de plano a qualquer momento?",
    answer: "Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças entram em vigor imediatamente."
  },
  {
    question: "Como funciona o período de teste gratuito?",
    answer: "Todos os planos pagos incluem 30 dias gratuitos. Você só será cobrado após o período de teste, e pode cancelar a qualquer momento."
  },
  {
    question: "O que acontece se eu cancelar minha assinatura?",
    answer: "Seus anúncios continuarão ativos até o final do período pago. Após isso, você será automaticamente movido para o plano gratuito."
  },
  {
    question: "Posso ter múltiplas lojas com um plano?",
    answer: "Cada plano é válido para uma loja. Para múltiplas lojas, você precisará de assinaturas separadas ou pode considerar nosso plano Empresa Plus."
  },
  {
    question: "Como funciona o suporte técnico?",
    answer: "Oferecemos suporte via email para todos os planos, chat ao vivo para planos Profissional e superiores, e suporte telefônico para o plano Empresa Plus."
  },
  {
    question: "Existe desconto para pagamento anual?",
    answer: "Sim! Oferecemos até 20% de desconto para assinaturas anuais. O desconto é aplicado automaticamente no checkout."
  }
];

export default function PricingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Redirecionar compradores para a home (planos são apenas para vendedores)
  useEffect(() => {
    if (user && user.type === "BUYER") {
      navigate("/");
    }
  }, [user, navigate]);

  // Se for comprador, mostrar mensagem enquanto redireciona
  if (user && user.type === "BUYER") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Redirecionando...</h2>
          <p className="text-gray-600">Os planos são exclusivos para vendedores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white py-24 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6 border border-white/20">
            <Star className="h-4 w-4 mr-2 text-yellow-400" />
            Mais de 10.000 vendedores confiam na nossa plataforma
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Planos para Vendedores
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto mb-10 leading-relaxed">
            Escolha o plano ideal para impulsionar suas vendas e transformar seu negócio no maior marketplace da região
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-6 py-3 rounded-full font-bold shadow-lg animate-bounce">
              🎉 30 dias grátis para todos os planos
            </div>
            <div className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-full font-medium border border-white/20">
              ✅ Garantia de satisfação
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">150%</div>
              <div className="text-blue-100 text-sm">Aumento médio nas vendas</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">10k+</div>
              <div className="text-blue-100 text-sm">Vendedores ativos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-blue-100 text-sm">Suporte disponível</div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Escolha seu Plano
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Selecione o plano que melhor atende às suas necessidades e comece a vender hoje mesmo
          </p>
          
        </div>
        <PlanSelector />
      </div>

      {/* Testimonials */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">O que nossos clientes dizem</h2>
            <p className="text-xl text-gray-600">Histórias reais de sucesso dos nossos vendedores</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 italic">"{testimonial.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-6">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Formas de Pagamento</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Facilitamos o seu pagamento com diversas opções seguras e práticas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {paymentMethods.map((method, index) => {
              const Icon = method.icon;
              const gradients = [
                "from-green-400 to-blue-500",
                "from-blue-500 to-purple-600", 
                "from-orange-400 to-pink-500",
                "from-purple-500 to-indigo-600"
              ];
              
              return (
                <div key={index} className="group relative bg-white rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-transparent hover:scale-105">
                  {/* Gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${gradients[index]} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                  
                  <div className={`relative w-16 h-16 mx-auto mb-6 bg-gradient-to-r ${gradients[index]} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="font-bold text-xl text-gray-900 mb-3 group-hover:text-gray-800 transition-colors">
                    {method.name}
                  </h3>
                  
                  <p className="text-gray-600 group-hover:text-gray-700 transition-colors leading-relaxed">
                    {method.description}
                  </p>
                  
                  {/* Special badge for PIX */}
                  {method.name === "PIX" && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      MAIS USADO
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Security Badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 bg-white px-8 py-4 rounded-full shadow-md border border-gray-100">
              <Shield className="h-6 w-6 text-green-600" />
              <span className="font-semibold text-gray-700">Pagamentos 100% seguros e criptografados</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">SSL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-br from-gray-50 via-indigo-50/50 to-blue-50/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-6">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Por que escolher nossos planos?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Benefícios exclusivos que fazem a diferença no seu sucesso como vendedor
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="group relative text-center">
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-transparent">
                    {/* Icon with color */}
                    <div className={`w-14 h-14 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
                      index === 0 ? 'bg-green-100' :
                      index === 1 ? 'bg-blue-100' :
                      index === 2 ? 'bg-purple-100' : 'bg-indigo-100'
                    }`}>
                      <Icon className={`w-7 h-7 ${benefit.color}`} />
                    </div>
                    
                    <h3 className="font-bold text-xl text-gray-900 mb-4 group-hover:text-gray-800">
                      {benefit.title}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-700">
                      {benefit.description}
                    </p>

                    {/* Hover effect gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${
                      index === 0 ? 'from-green-500/5 to-emerald-500/5' :
                      index === 1 ? 'from-blue-500/5 to-cyan-500/5' :
                      index === 2 ? 'from-purple-500/5 to-pink-500/5' : 'from-indigo-500/5 to-violet-500/5'
                    } opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 pointer-events-none`}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust indicators */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold text-gray-700">99.9% de Uptime</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold text-gray-700">Suporte 24/7</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold text-gray-700">Satisfação Garantida</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2>
            <p className="text-xl text-gray-600">Tire todas suas dúvidas sobre nossos planos</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-8 py-6 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset group"
                >
                  <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown 
                    className={`h-5 w-5 text-gray-500 group-hover:text-blue-600 transform transition-transform duration-300 flex-shrink-0 ${
                      openFaqIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openFaqIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="px-8 pb-6">
                    <div className="h-px bg-gradient-to-r from-blue-100 via-purple-100 to-transparent mb-4"></div>
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Support */}
          <div className="mt-12 text-center">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Ainda tem dúvidas?</h3>
              <p className="text-gray-600 mb-6">Nossa equipe está pronta para ajudar você a escolher o plano ideal</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Falar com Suporte
                </a>
                <a
                  href="https://wa.me/5511999999999"
                  className="border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-blue-500 hover:text-blue-600 transition-all duration-300"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar a vender mais?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Junte-se a milhares de vendedores que já escolheram nosso marketplace
          </p>
          <div className="space-x-4">
            <a
              href="/auth/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
            >
              Começar Agora
            </a>
            <a
              href="/contact"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors inline-block"
            >
              Falar com Vendas
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
