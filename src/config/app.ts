// Configurações da aplicação Vendeu Online

export const APP_CONFIG = {
  // Informações básicas
  name: 'Vendeu Online',
  description: 'Plataforma de classificados e marketplace para Erechim-RS. Venda e compre produtos localmente.',
  tagline: 'Seu marketplace local em Erechim-RS',
  
  // Localização
  region: {
    city: 'Erechim',
    state: 'RS',
    fullName: 'Erechim-RS'
  },
  
  // Contato
  contact: {
    email: 'grupomaboon@gmail.com',
    phone: '(54) 99999-9999',
    whatsapp: '5554999999999',
    address: {
      street: 'Rua Principal, 123',
      neighborhood: 'Centro',
      city: 'Erechim',
      state: 'RS',
      zipCode: '99700-000'
    }
  },
  
  // Redes sociais
  social: {
    facebook: 'https://facebook.com/vendeuonline',
    instagram: 'https://instagram.com/vendeuonline',
    twitter: 'https://twitter.com/vendeuonline',
    linkedin: 'https://linkedin.com/company/vendeuonline'
  },
  
  // Cores da marca
  colors: {
    primary: '#3B82F6', // Azul
    secondary: '#8B5CF6', // Roxo
    accent: '#10B981', // Verde
    background: '#F8FAFC',
    text: '#1F2937'
  },
  
  // Categorias de produtos
  categories: [
    'Eletrônicos',
    'Imóveis', 
    'Veículos',
    'Roupas',
    'Comida',
    'Serviços',
    'Emprego',
    'Móveis'
  ],
  
  // Planos de preços
  plans: {
    basic: {
      id: 'basico',
      name: 'Básico',
      price: 0,
      period: '30 dias',
      maxAds: 5,
      validity: 30,
      support: 'E-mail',
      features: [
        '5 anúncios ativos',
        'Validade de 30 dias',
        'Suporte por e-mail',
        'Fotos básicas (até 3 por anúncio)',
        'Localização no mapa',
        'Contato via WhatsApp/Telefone'
      ]
    },
    professional: {
      id: 'profissional',
      name: 'Profissional',
      price: 29.90,
      period: 'mensal',
      maxAds: 20,
      validity: 60,
      support: 'Prioritário',
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
    premium: {
      id: 'premium',
      name: 'Premium',
      price: 59.90,
      period: 'mensal',
      maxAds: 50,
      validity: 90,
      support: 'VIP',
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
    enterprise: {
      id: 'empresarial',
      name: 'Empresarial',
      price: 99.90,
      period: 'mensal',
      maxAds: -1, // Ilimitado
      validity: 120,
      support: 'Dedicado',
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
  },
  
  // Formas de pagamento
  paymentMethods: [
    {
      name: 'PIX',
      description: '5% de desconto',
      icon: 'pix'
    },
    {
      name: 'Cartão de Crédito',
      description: 'até 12x',
      icon: 'credit-card'
    },
    {
      name: 'Boleto Bancário',
      description: 'à vista',
      icon: 'receipt'
    },
    {
      name: 'Débito Automático',
      description: 'recorrente',
      icon: 'repeat'
    }
  ],
  
  // Configurações de SEO
  seo: {
    keywords: [
      'marketplace',
      'classificados',
      'Erechim',
      'RS',
      'comprar',
      'vender',
      'produtos locais',
      'anúncios'
    ],
    author: 'Vendeu Online',
    robots: 'index, follow'
  },
  
  // URLs importantes
  urls: {
    terms: '/termos-de-uso',
    privacy: '/politica-de-privacidade',
    help: '/ajuda',
    contact: '/contato',
    pricing: '/pricing'
  },
  
  // Configurações de funcionalidades
  features: {
    enableNotifications: true,
    enableChat: true,
    enableReviews: true,
    enableWishlist: true,
    enableCompare: true,
    maxPhotosPerAd: {
      basic: 3,
      professional: 8,
      premium: 15,
      enterprise: 25
    }
  },
  
  // Limites e configurações
  limits: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxDescriptionLength: 2000,
    maxTitleLength: 100
  }
};

// Função para obter configuração específica
export const getConfig = (path: string) => {
  return path.split('.').reduce((obj, key) => obj?.[key], APP_CONFIG);
};

// Função para verificar se uma categoria é válida
export const isValidCategory = (category: string): boolean => {
  return APP_CONFIG.categories.includes(category);
};

// Função para obter informações do plano
export const getPlanInfo = (planId: string) => {
  const plans = APP_CONFIG.plans;
  return Object.values(plans).find(plan => plan.id === planId);
};

// Função para formatar preço
export const formatPrice = (price: number): string => {
  if (price === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

export default APP_CONFIG;