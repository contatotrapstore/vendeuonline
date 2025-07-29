'use client';

import { useState } from 'react';
import { Star, MapPin, Phone, Mail, MessageCircle, Package, Users, Calendar, Shield, Filter, Grid, List, Heart } from 'lucide-react';
import { APP_CONFIG } from '@/config/app';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  inStock: boolean;
}

interface StoreDetails {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  location: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  image: string;
  coverImage: string;
  verified: boolean;
  plan: string;
  joinedDate: string;
  responseTime: string;
  deliveryOptions: string[];
  paymentMethods: string[];
  businessHours: { [key: string]: string };
  policies: {
    returns: string;
    warranty: string;
    shipping: string;
  };
}

const mockStore: StoreDetails = {
  id: '1',
  name: 'TechStore Erechim',
  description: 'Especializada em eletrônicos e tecnologia com os melhores preços da região. Oferecemos produtos de qualidade com garantia e suporte técnico especializado.',
  category: 'Eletrônicos',
  rating: 4.8,
  reviewCount: 156,
  productCount: 89,
  location: 'Centro, Erechim',
  address: 'Rua Sete de Setembro, 123 - Centro, Erechim - RS',
  phone: '(54) 3321-1234',
  email: 'contato@techstoreerechim.com.br',
  whatsapp: '5554999887766',
  image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=modern_electronics_store_front_blue_purple_theme&image_size=square',
  coverImage: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=electronics_store_interior_modern_technology_displays&image_size=landscape_16_9',
  verified: true,
  plan: 'Premium',
  joinedDate: '2023-03-15',
  responseTime: '2 horas',
  deliveryOptions: ['Retirada no Local', 'Entrega Local', 'Correios'],
  paymentMethods: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto'],
  businessHours: {
    'Segunda': '08:00 - 18:00',
    'Terça': '08:00 - 18:00',
    'Quarta': '08:00 - 18:00',
    'Quinta': '08:00 - 18:00',
    'Sexta': '08:00 - 18:00',
    'Sábado': '08:00 - 12:00',
    'Domingo': 'Fechado'
  },
  policies: {
    returns: 'Aceitamos devoluções em até 7 dias para produtos com defeito.',
    warranty: 'Todos os produtos possuem garantia do fabricante.',
    shipping: 'Entrega grátis para compras acima de R$ 200 na região de Erechim.'
  }
};

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Smartphone Samsung Galaxy A54',
    price: 1299.99,
    originalPrice: 1499.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung_galaxy_smartphone_modern_sleek_design&image_size=square',
    rating: 4.7,
    reviewCount: 23,
    category: 'Eletrônicos',
    inStock: true
  },
  {
    id: '2',
    name: 'Notebook Lenovo IdeaPad 3',
    price: 2499.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=lenovo_laptop_notebook_modern_professional&image_size=square',
    rating: 4.5,
    reviewCount: 18,
    category: 'Eletrônicos',
    inStock: true
  },
  {
    id: '3',
    name: 'Fone Bluetooth JBL Tune 510BT',
    price: 199.99,
    originalPrice: 249.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=jbl_bluetooth_headphones_wireless_modern&image_size=square',
    rating: 4.8,
    reviewCount: 45,
    category: 'Eletrônicos',
    inStock: false
  },
  {
    id: '4',
    name: 'Smart TV LG 50" 4K',
    price: 1899.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=lg_smart_tv_4k_modern_television_display&image_size=square',
    rating: 4.6,
    reviewCount: 12,
    category: 'Eletrônicos',
    inStock: true
  }
];

export default function StorePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('products');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredProducts = mockProducts
    .filter(product => categoryFilter === 'all' || product.category === categoryFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.reviewCount - a.reviewCount;
      }
    });

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'Básico': return 'bg-gray-100 text-gray-700';
      case 'Profissional': return 'bg-blue-100 text-blue-700';
      case 'Premium': return 'bg-purple-100 text-purple-700';
      case 'Empresarial': return 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <div className="relative">
        <div className="h-64 bg-gradient-to-br from-blue-600 to-purple-600">
          <img
            src={mockStore.coverImage}
            alt={mockStore.name}
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
              <div className="w-24 h-24 bg-white rounded-2xl p-2 shadow-lg">
                <img
                  src={mockStore.image}
                  alt={mockStore.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              
              <div className="flex-1 text-white">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold">{mockStore.name}</h1>
                  {mockStore.verified && (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    getPlanBadgeColor(mockStore.plan)
                  }`}>
                    {mockStore.plan}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{mockStore.rating}</span>
                    <span className="text-gray-300">({mockStore.reviewCount} avaliações)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Package className="h-4 w-4" />
                    <span>{mockStore.productCount} produtos</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{mockStore.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Loja</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                    <p className="text-gray-600 text-sm">{mockStore.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Contato</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{mockStore.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{mockStore.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{mockStore.address}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tempo de Resposta</h4>
                    <p className="text-gray-600 text-sm">{mockStore.responseTime}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Membro desde</h4>
                    <p className="text-gray-600 text-sm">
                      {new Date(mockStore.joinedDate).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                
                {/* Contact Buttons */}
                <div className="mt-6 space-y-3">
                  <a
                    href={`https://wa.me/${mockStore.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>WhatsApp</span>
                  </a>
                  
                  <button className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors">
                    <Mail className="h-5 w-5" />
                    <span>Enviar E-mail</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="bg-white rounded-2xl shadow-lg mb-8">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'products', name: 'Produtos', count: mockStore.productCount },
                      { id: 'about', name: 'Sobre' },
                      { id: 'reviews', name: 'Avaliações', count: mockStore.reviewCount },
                      { id: 'policies', name: 'Políticas' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.name}
                        {tab.count && (
                          <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {/* Products Tab */}
                  {activeTab === 'products' && (
                    <div>
                      {/* Filters */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
                        <div className="flex items-center space-x-4">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="popular">Mais Popular</option>
                            <option value="price-low">Menor Preço</option>
                            <option value="price-high">Maior Preço</option>
                            <option value="rating">Melhor Avaliação</option>
                            <option value="name">Nome A-Z</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${
                              viewMode === 'grid' 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <Grid className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${
                              viewMode === 'list' 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <List className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Products Grid */}
                      <div className={viewMode === 'grid' 
                        ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' 
                        : 'space-y-4'
                      }>
                        {filteredProducts.map(product => (
                          <Link key={product.id} href={`/products/${product.id}`}>
                            <div className={`bg-gray-50 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer ${
                              viewMode === 'list' ? 'flex' : ''
                            }`}>
                              <div className={viewMode === 'list' ? 'w-32 flex-shrink-0' : ''}>
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className={`w-full object-cover ${
                                    viewMode === 'list' ? 'h-full' : 'h-48'
                                  }`}
                                />
                              </div>
                              
                              <div className="p-4 flex-1">
                                <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                  {product.name}
                                </h4>
                                
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                    <span className="text-sm font-medium">{product.rating}</span>
                                    <span className="text-sm text-gray-500">({product.reviewCount})</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-lg font-bold text-blue-600">
                                        R$ {product.price.toFixed(2)}
                                      </span>
                                      {product.originalPrice && (
                                        <span className="text-sm text-gray-500 line-through">
                                          R$ {product.originalPrice.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-xs ${
                                      product.inStock ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {product.inStock ? 'Em estoque' : 'Fora de estoque'}
                                    </span>
                                  </div>
                                  
                                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                    <Heart className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* About Tab */}
                  {activeTab === 'about' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sobre a Loja</h3>
                        <p className="text-gray-700 leading-relaxed">{mockStore.description}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Horário de Funcionamento</h4>
                        <div className="grid md:grid-cols-2 gap-2">
                          {Object.entries(mockStore.businessHours).map(([day, hours]) => (
                            <div key={day} className="flex justify-between py-2 px-3 bg-gray-50 rounded">
                              <span className="font-medium">{day}</span>
                              <span className="text-gray-600">{hours}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Opções de Entrega</h4>
                        <div className="flex flex-wrap gap-2">
                          {mockStore.deliveryOptions.map(option => (
                            <span key={option} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Formas de Pagamento</h4>
                        <div className="flex flex-wrap gap-2">
                          {mockStore.paymentMethods.map(method => (
                            <span key={method} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reviews Tab */}
                  {activeTab === 'reviews' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Avaliações dos Clientes</h3>
                      <p className="text-gray-600">Seção de avaliações em desenvolvimento...</p>
                    </div>
                  )}

                  {/* Policies Tab */}
                  {activeTab === 'policies' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Política de Devolução</h4>
                        <p className="text-gray-700">{mockStore.policies.returns}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Garantia</h4>
                        <p className="text-gray-700">{mockStore.policies.warranty}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Entrega</h4>
                        <p className="text-gray-700">{mockStore.policies.shipping}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}