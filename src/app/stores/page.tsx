'use client';

import { useState } from 'react';
import { Search, MapPin, Star, Users, Package, Filter, Grid, List } from 'lucide-react';
import { APP_CONFIG } from '@/config/app';
import { Link } from 'react-router-dom';

interface Store {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  location: string;
  image: string;
  verified: boolean;
  plan: string;
  joinedDate: string;
}

const mockStores: Store[] = [
  {
    id: '1',
    name: 'TechStore Erechim',
    description: 'Especializada em eletrônicos e tecnologia com os melhores preços da região.',
    category: 'Eletrônicos',
    rating: 4.8,
    reviewCount: 156,
    productCount: 89,
    location: 'Centro, Erechim',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=modern_electronics_store_front_blue_purple_theme&image_size=square',
    verified: true,
    plan: 'Premium',
    joinedDate: '2023-03-15'
  },
  {
    id: '2',
    name: 'Casa & Decoração',
    description: 'Móveis e decoração para transformar sua casa em um lar aconchegante.',
    category: 'Móveis',
    rating: 4.6,
    reviewCount: 89,
    productCount: 124,
    location: 'Bairro Progresso, Erechim',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=furniture_home_decor_store_cozy_interior&image_size=square',
    verified: true,
    plan: 'Profissional',
    joinedDate: '2023-01-20'
  },
  {
    id: '3',
    name: 'Moda Feminina Elegante',
    description: 'Roupas femininas modernas e elegantes para todas as ocasiões.',
    category: 'Roupas',
    rating: 4.9,
    reviewCount: 203,
    productCount: 67,
    location: 'Centro, Erechim',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=elegant_womens_clothing_boutique_fashion_store&image_size=square',
    verified: true,
    plan: 'Empresarial',
    joinedDate: '2022-11-10'
  },
  {
    id: '4',
    name: 'AutoPeças RS',
    description: 'Peças automotivas originais e acessórios para seu veículo.',
    category: 'Veículos',
    rating: 4.5,
    reviewCount: 78,
    productCount: 156,
    location: 'Industrial, Erechim',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=automotive_parts_store_garage_professional&image_size=square',
    verified: false,
    plan: 'Básico',
    joinedDate: '2023-06-05'
  },
  {
    id: '5',
    name: 'Sabores da Terra',
    description: 'Produtos alimentícios artesanais e orgânicos direto do produtor.',
    category: 'Comida',
    rating: 4.7,
    reviewCount: 134,
    productCount: 45,
    location: 'Rural, Erechim',
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=organic_food_market_fresh_products_artisanal&image_size=square',
    verified: true,
    plan: 'Profissional',
    joinedDate: '2023-02-28'
  }
];

export default function StoresPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('rating');

  const filteredStores = mockStores
    .filter(store => {
      const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           store.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || store.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'products':
          return b.productCount - a.productCount;
        case 'reviews':
          return b.reviewCount - a.reviewCount;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
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
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Lojas Parceiras
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              Descubra as melhores lojas e vendedores de {APP_CONFIG.region.fullName}
            </p>
          </div>
        </div>
      </div>

      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters and Search */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar lojas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas as Categorias</option>
                  {APP_CONFIG.categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="rating">Melhor Avaliação</option>
                  <option value="products">Mais Produtos</option>
                  <option value="reviews">Mais Avaliações</option>
                  <option value="name">Nome A-Z</option>
                </select>
              </div>
            </div>

            {/* View Mode and Results */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600">
                {filteredStores.length} loja{filteredStores.length !== 1 ? 's' : ''} encontrada{filteredStores.length !== 1 ? 's' : ''}
              </p>
              
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
          </div>

          {/* Stores Grid/List */}
          {filteredStores.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhuma loja encontrada
              </h3>
              <p className="text-gray-600">
                Tente ajustar seus filtros de busca.
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-8' 
              : 'space-y-6'
            }>
              {filteredStores.map(store => (
                <Link key={store.id} to={`/stores/${store.id}`}>
                  <div className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}>
                    <div className={viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}>
                      <img
                        src={store.image}
                        alt={store.name}
                        className={`w-full object-cover ${
                          viewMode === 'list' ? 'h-full' : 'h-48'
                        }`}
                      />
                    </div>
                    
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {store.name}
                            </h3>
                            {store.verified && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            getPlanBadgeColor(store.plan)
                          }`}>
                            {store.plan}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {store.description}
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="font-medium">{store.rating}</span>
                            <span>({store.reviewCount})</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Package className="h-4 w-4" />
                            <span>{store.productCount} produtos</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{store.location}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-gray-500">
                            Desde {new Date(store.joinedDate).toLocaleDateString('pt-BR', {
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            {store.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Call to Action */}
          <div className="mt-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">
              Quer vender no {APP_CONFIG.name}?
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Junte-se às melhores lojas de {APP_CONFIG.region.fullName} e alcance milhares de clientes. 
              Comece com 30 dias grátis!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Ver Planos
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
              >
                Criar Conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}