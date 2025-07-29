'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Store, Users, Package, Clock, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStoreStore } from '@/stores/storeStore';
import { Store as StoreType } from '@/types';

const Stores = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { stores, loading, fetchStores } = useStoreStore();

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || store.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'Todas as Categorias' },
    { value: 'electronics', label: 'Eletrônicos' },
    { value: 'clothing', label: 'Moda e Vestuário' },
    { value: 'food', label: 'Alimentação' },
    { value: 'home', label: 'Casa e Decoração' },
    { value: 'services', label: 'Serviços' },
    { value: 'beauty', label: 'Beleza e Cuidados' }
  ];

  const StoreCard = ({ store }: { store: StoreType }) => (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <div className="relative">
        <img
          src={store.banner || 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=store%20banner%20erechim%20marketplace&image_size=landscape_16_9'}
          alt={store.name}
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute -bottom-6 left-4">
          <img
            src={store.logo || 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=store%20logo&image_size=square'}
            alt={store.name}
            className="w-12 h-12 rounded-full border-4 border-white shadow-lg"
          />
        </div>
        {store.isVerified && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
            <Star className="h-3 w-3 fill-current" />
            <span>Verificada</span>
          </div>
        )}
      </div>
      
      <div className="pt-8 p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">{store.name}</h3>
            <p className="text-gray-600 text-sm line-clamp-2">{store.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{store.address}, {store.city} - {store.state}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Package className="h-4 w-4" />
            <span>{store.productCount || 0} produtos</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="font-semibold">{store.rating || 4.5}</span>
              <span className="text-gray-500 text-sm">(24 avaliações)</span>
            </div>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
            {store.category}
          </span>
        </div>

        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center space-x-1 text-green-600">
            <Clock className="h-4 w-4" />
            <span>Aberto agora</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-600">
            <Users className="h-4 w-4" />
            <span>+100 clientes</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Link
            to={`/store/${store.id}`}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
          >
            Visitar Loja
          </Link>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Phone className="h-4 w-4 text-gray-600" />
          </button>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Mail className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6">
                  <div className="h-32 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded mb-4"></div>
                  <div className="h-6 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lojas Parceiras</h1>
          <p className="text-gray-600">Conheça as melhores lojas de Erechim e região</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stores.length}+</div>
            <div className="text-sm text-gray-600">Lojas Ativas</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">4.8</div>
            <div className="text-sm text-gray-600">Avaliação Média</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">500+</div>
            <div className="text-sm text-gray-600">Produtos</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">1000+</div>
            <div className="text-sm text-gray-600">Clientes Ativos</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar lojas por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-gray-600">
            Mostrando {filteredStores.length} de {stores.length} lojas
          </p>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map(store => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>

        {/* Empty State */}
        {filteredStores.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma loja encontrada</h3>
            <p className="text-gray-600">Tente ajustar os filtros ou buscar por outros termos.</p>
          </div>
        )}

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 mt-12 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Quer abrir sua loja no Vendeu Online?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Junte-se a centenas de empreendedores de Erechim e região. 
            Crie sua loja online e alcance mais clientes!
          </p>
          <Link
            to="/pricing"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center space-x-2"
          >
            <Store className="h-5 w-5" />
            <span>Criar Minha Loja</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Stores;