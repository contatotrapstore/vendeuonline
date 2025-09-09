// Dados mock para lojas - temporário até corrigir Supabase
export const mockStores = [
  {
    id: "store_1",
    name: "TechStore SP",
    slug: "techstore-sp",
    description: "Eletrônicos e tecnologia de qualidade",
    category: "Eletrônicos",
    address: "Rua das Tecnologias, 123",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567",
    phone: "(11) 99999-1111",
    email: "contato@techstore.com",
    website: "https://techstore.com",
    logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop",
    banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=200&fit=crop",
    socialMedia: {
      instagram: "@techstore",
      facebook: "techstore"
    },
    isActive: true,
    isVerified: true,
    rating: 4.8,
    salesCount: 156,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T15:30:00Z",
    seller: {
      id: "seller_1",
      userId: "user_1",
      rating: 4.8,
      totalSales: 156,
      isVerified: true,
      user: {
        id: "user_1",
        name: "João Silva",
        email: "joao@techstore.com",
        phone: "(11) 99999-1111",
        city: "São Paulo",
        state: "SP"
      }
    }
  },
  {
    id: "store_2",
    name: "Moda Bella",
    slug: "moda-bella",
    description: "Roupas femininas e acessórios modernos",
    category: "Moda",
    address: "Av. Fashion, 456",
    city: "Rio de Janeiro",
    state: "RJ",
    zipCode: "20000-123",
    phone: "(21) 88888-2222",
    email: "contato@modabella.com",
    website: "https://modabella.com",
    logo: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200&h=200&fit=crop",
    banner: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=200&fit=crop",
    socialMedia: {
      instagram: "@modabella",
      facebook: "modabella"
    },
    isActive: true,
    isVerified: true,
    rating: 4.6,
    salesCount: 89,
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-18T12:15:00Z",
    seller: {
      id: "seller_2",
      userId: "user_2",
      rating: 4.6,
      totalSales: 89,
      isVerified: true,
      user: {
        id: "user_2",
        name: "Maria Santos",
        email: "maria@modabella.com",
        phone: "(21) 88888-2222",
        city: "Rio de Janeiro",
        state: "RJ"
      }
    }
  },
  {
    id: "store_3",
    name: "Casa & Estilo",
    slug: "casa-estilo",
    description: "Móveis e decoração para sua casa",
    category: "Casa",
    address: "Rua dos Móveis, 789",
    city: "Belo Horizonte",
    state: "MG",
    zipCode: "30000-456",
    phone: "(31) 77777-3333",
    email: "contato@casaestilo.com",
    website: "https://casaestilo.com",
    logo: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop",
    banner: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=200&fit=crop",
    socialMedia: {
      instagram: "@casaestilo",
      facebook: "casaestilo"
    },
    isActive: true,
    isVerified: false,
    rating: 4.3,
    salesCount: 45,
    createdAt: "2024-01-05T14:00:00Z",
    updatedAt: "2024-01-12T09:45:00Z",
    seller: {
      id: "seller_3",
      userId: "user_3",
      rating: 4.3,
      totalSales: 45,
      isVerified: false,
      user: {
        id: "user_3",
        name: "Pedro Costa",
        email: "pedro@casaestilo.com",
        phone: "(31) 77777-3333",
        city: "Belo Horizonte",
        state: "MG"
      }
    }
  },
  {
    id: "store_4",
    name: "AutoPeças Premium",
    slug: "autopecas-premium",
    description: "Peças e acessórios automotivos de qualidade",
    category: "Veículos",
    address: "Av. dos Carros, 321",
    city: "Curitiba",
    state: "PR",
    zipCode: "80000-789",
    phone: "(41) 66666-4444",
    email: "contato@autopecas.com",
    website: "https://autopecas.com",
    logo: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=200&h=200&fit=crop",
    banner: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&h=200&fit=crop",
    socialMedia: {
      instagram: "@autopecas",
      facebook: "autopecas"
    },
    isActive: true,
    isVerified: true,
    rating: 4.9,
    salesCount: 203,
    createdAt: "2023-12-20T16:00:00Z",
    updatedAt: "2024-01-25T11:20:00Z",
    seller: {
      id: "seller_4",
      userId: "user_4",
      rating: 4.9,
      totalSales: 203,
      isVerified: true,
      user: {
        id: "user_4",
        name: "Carlos Oliveira",
        email: "carlos@autopecas.com",
        phone: "(41) 66666-4444",
        city: "Curitiba",
        state: "PR"
      }
    }
  },
  {
    id: "store_5",
    name: "FitSport",
    slug: "fitsport",
    description: "Equipamentos esportivos e suplementos",
    category: "Esportes",
    address: "Rua do Esporte, 654",
    city: "Porto Alegre",
    state: "RS",
    zipCode: "90000-321",
    phone: "(51) 55555-5555",
    email: "contato@fitsport.com",
    website: "https://fitsport.com",
    logo: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
    banner: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=200&fit=crop",
    socialMedia: {
      instagram: "@fitsport",
      facebook: "fitsport"
    },
    isActive: true,
    isVerified: true,
    rating: 4.5,
    salesCount: 78,
    createdAt: "2024-01-01T12:00:00Z",
    updatedAt: "2024-01-15T16:30:00Z",
    seller: {
      id: "seller_5",
      userId: "user_5",
      rating: 4.5,
      totalSales: 78,
      isVerified: true,
      user: {
        id: "user_5",
        name: "Ana Rodrigues",
        email: "ana@fitsport.com",
        phone: "(51) 55555-5555",
        city: "Porto Alegre",
        state: "RS"
      }
    }
  }
];

export const mockUsers = [
  {
    id: "user_1",
    name: "João Silva",
    email: "joao@techstore.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LQ4YNu3PEFf4L1Z8.9JK4ELF5TKvq8JrBN2uC", // 123456
    phone: "(11) 99999-1111",
    city: "São Paulo",
    state: "SP",
    type: "SELLER",
    isVerified: true,
    isActive: true,
    createdAt: "2024-01-15T10:00:00Z"
  },
  {
    id: "user_2",
    name: "Maria Santos", 
    email: "maria@modabella.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LQ4YNu3PEFf4L1Z8.9JK4ELF5TKvq8JrBN2uC", // 123456
    phone: "(21) 88888-2222",
    city: "Rio de Janeiro",
    state: "RJ",
    type: "SELLER",
    isVerified: true,
    isActive: true,
    createdAt: "2024-01-10T08:00:00Z"
  },
  {
    id: "admin_1",
    name: "Admin Sistema",
    email: "admin@vendeuonline.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LQ4YNu3PEFf4L1Z8.9JK4ELF5TKvq8JrBN2uC", // 123456
    phone: "(11) 99999-0000",
    city: "São Paulo",
    state: "SP",
    type: "ADMIN",
    isVerified: true,
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "buyer_1",
    name: "Comprador Teste",
    email: "comprador@teste.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LQ4YNu3PEFf4L1Z8.9JK4ELF5TKvq8JrBN2uC", // 123456
    phone: "(11) 88888-1111",
    city: "São Paulo",
    state: "SP", 
    type: "BUYER",
    isVerified: true,
    isActive: true,
    createdAt: "2024-01-05T12:00:00Z"
  }
];