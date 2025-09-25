/**
 * 🚨 EMERGENCY MOCK DATA - Fallback para manter site funcionando
 *
 * Mock data temporário para quando TODAS as outras estratégias falharem
 * Mantém o site operacional enquanto resolvemos problemas de banco/API
 */

console.log("🚨 [EMERGENCY-MOCK] Inicializando dados mockados de emergência...");

/**
 * Mock data para planos
 */
export function getMockPlans() {
  console.log("🚨 [MOCK-PLANS] Retornando dados mockados");
  return [
    {
      id: "1",
      name: "Gratuito",
      description: "Ideal para começar",
      price: 0,
      currency: "BRL",
      adLimit: 5,
      photoLimit: 3,
      features: ["5 anúncios grátis", "3 fotos por anúncio", "Suporte básico"],
      isActive: true,
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "Básico",
      description: "Para vendedores iniciantes",
      price: 29.9,
      currency: "BRL",
      adLimit: 20,
      photoLimit: 5,
      features: ["20 anúncios", "5 fotos por anúncio", "Destaque nos resultados"],
      isActive: true,
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "3",
      name: "Premium",
      description: "Para vendedores profissionais",
      price: 59.9,
      currency: "BRL",
      adLimit: 100,
      photoLimit: 10,
      features: ["100 anúncios", "10 fotos por anúncio", "Destaque premium", "Estatísticas avançadas"],
      isActive: true,
      order: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Mock data para produtos
 */
export function getMockProducts() {
  console.log("🚨 [MOCK-PRODUCTS] Retornando dados mockados");
  return [
    {
      id: "1",
      title: "iPhone 14 Pro Max 512GB",
      description: "iPhone 14 Pro Max em perfeito estado, 512GB de armazenamento, cor Roxo Profundo.",
      price: 7999.99,
      currency: "BRL",
      category: "Eletrônicos",
      condition: "Novo",
      isActive: true,
      images: [
        {
          id: "1",
          url: "/images/placeholder-product.jpg",
          alt: "iPhone 14 Pro Max",
          order: 1,
        },
      ],
      store: {
        id: "1",
        name: "TrapStore Tech",
        description: "Loja especializada em eletrônicos premium",
        isActive: true,
        seller: {
          id: "1",
          user: {
            id: "1",
            name: "João Silva",
            email: "joao@trapstore.com",
          },
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "MacBook Air M2 512GB",
      description: "MacBook Air com chip M2, 512GB SSD, 16GB RAM. Ideal para trabalho e estudos.",
      price: 12999.99,
      currency: "BRL",
      category: "Computadores",
      condition: "Novo",
      isActive: true,
      images: [
        {
          id: "2",
          url: "/images/placeholder-product.jpg",
          alt: "MacBook Air M2",
          order: 1,
        },
      ],
      store: {
        id: "1",
        name: "TrapStore Tech",
        description: "Loja especializada em eletrônicos premium",
        isActive: true,
        seller: {
          id: "1",
          user: {
            id: "1",
            name: "João Silva",
            email: "joao@trapstore.com",
          },
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "AirPods Pro 2ª Geração",
      description: "AirPods Pro de 2ª geração com cancelamento ativo de ruído e áudio espacial.",
      price: 2299.99,
      currency: "BRL",
      category: "Áudio",
      condition: "Novo",
      isActive: true,
      images: [
        {
          id: "3",
          url: "/images/placeholder-product.jpg",
          alt: "AirPods Pro 2ª Geração",
          order: 1,
        },
      ],
      store: {
        id: "1",
        name: "TrapStore Tech",
        description: "Loja especializada em eletrônicos premium",
        isActive: true,
        seller: {
          id: "1",
          user: {
            id: "1",
            name: "João Silva",
            email: "joao@trapstore.com",
          },
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Mock data para lojas
 */
export function getMockStores() {
  console.log("🚨 [MOCK-STORES] Retornando dados mockados");
  return [
    {
      id: "1",
      name: "TrapStore Tech",
      description: "Loja especializada em eletrônicos premium e gadgets de última geração.",
      logoUrl: "/images/placeholder-store.jpg",
      bannerUrl: "/images/placeholder-banner.jpg",
      isActive: true,
      seller: {
        id: "1",
        businessName: "TrapStore Tecnologia LTDA",
        document: "12.345.678/0001-00",
        user: {
          id: "1",
          name: "João Silva",
          email: "joao@trapstore.com",
          phone: "(11) 99999-9999",
          city: "São Paulo",
          state: "SP",
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "ModaStyle Boutique",
      description: "Moda feminina e masculina com as últimas tendências.",
      logoUrl: "/images/placeholder-store.jpg",
      bannerUrl: "/images/placeholder-banner.jpg",
      isActive: true,
      seller: {
        id: "2",
        businessName: "ModaStyle Comércio LTDA",
        document: "98.765.432/0001-00",
        user: {
          id: "2",
          name: "Maria Santos",
          email: "maria@modastyle.com",
          phone: "(11) 88888-8888",
          city: "Rio de Janeiro",
          state: "RJ",
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Mock data para configurações de tracking
 */
export function getMockTrackingConfigs() {
  console.log("🚨 [MOCK-TRACKING] Retornando dados mockados");
  return {
    google_analytics_id: {
      value: "GA_MEASUREMENT_ID",
      isActive: true,
      isConfigured: false,
    },
    facebook_pixel_id: {
      value: "",
      isActive: false,
      isConfigured: false,
    },
    hotjar_id: {
      value: "",
      isActive: false,
      isConfigured: false,
    },
  };
}

/**
 * Mock data para estatísticas admin
 */
export function getMockAdminStats() {
  console.log("🚨 [MOCK-ADMIN] Retornando dados mockados");
  return {
    totalUsers: 156,
    totalProducts: 89,
    totalStores: 23,
    totalOrders: 234,
  };
}

console.log("✅ [EMERGENCY-MOCK] Mock data inicializado com sucesso");

export default {
  getMockPlans,
  getMockProducts,
  getMockStores,
  getMockTrackingConfigs,
  getMockAdminStats,
};
