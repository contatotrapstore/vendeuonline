'use client';

import { useState } from 'react';
import { Clock, Eye, ShoppingCart, Heart, Trash2, Filter, Calendar, Star } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface ViewHistoryItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  seller: string;
  rating: number;
  reviews: number;
  category: string;
  inStock: boolean;
  viewedAt: string;
  viewCount: number;
  lastViewDuration: number; // em segundos
}

const mockHistory: ViewHistoryItem[] = [
  {
    id: '1',
    productId: 'prod-1',
    name: 'iPhone 14 Pro Max 256GB Space Black',
    price: 7999.99,
    originalPrice: 8999.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=iphone%2014%20pro%20max%20space%20black%20product%20photo&image_size=square',
    seller: 'TechStore Erechim',
    rating: 4.8,
    reviews: 127,
    category: 'Eletrônicos',
    inStock: true,
    viewedAt: '2024-01-25T14:30:00Z',
    viewCount: 5,
    lastViewDuration: 180
  },
  {
    id: '2',
    productId: 'prod-2',
    name: 'MacBook Air M2 13" 256GB Midnight',
    price: 9999.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=macbook%20air%20m2%20midnight%20laptop%20product%20photo&image_size=square',
    seller: 'Apple Store Erechim',
    rating: 4.9,
    reviews: 89,
    category: 'Eletrônicos',
    inStock: true,
    viewedAt: '2024-01-25T10:15:00Z',
    viewCount: 3,
    lastViewDuration: 240
  },
  {
    id: '3',
    productId: 'prod-3',
    name: 'Tênis Nike Air Max 270 Preto/Branco',
    price: 299.99,
    originalPrice: 399.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=nike%20air%20max%20270%20black%20white%20sneakers%20product%20photo&image_size=square',
    seller: 'SportShop',
    rating: 4.6,
    reviews: 234,
    category: 'Roupas',
    inStock: false,
    viewedAt: '2024-01-24T16:45:00Z',
    viewCount: 2,
    lastViewDuration: 90
  },
  {
    id: '4',
    productId: 'prod-4',
    name: 'Smart TV Samsung 55" 4K Crystal UHD',
    price: 2499.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung%2055%20inch%204k%20crystal%20uhd%20smart%20tv%20product%20photo&image_size=square',
    seller: 'Eletro Erechim',
    rating: 4.7,
    reviews: 156,
    category: 'Eletrônicos',
    inStock: true,
    viewedAt: '2024-01-24T09:20:00Z',
    viewCount: 1,
    lastViewDuration: 120
  },
  {
    id: '5',
    productId: 'prod-5',
    name: 'Sofá 3 Lugares Retrátil e Reclinável',
    price: 1899.99,
    originalPrice: 2299.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20reclining%20sofa%203%20seats%20furniture%20product%20photo&image_size=square',
    seller: 'Móveis Erechim',
    rating: 4.5,
    reviews: 78,
    category: 'Móveis',
    inStock: true,
    viewedAt: '2024-01-23T19:30:00Z',
    viewCount: 4,
    lastViewDuration: 300
  },
  {
    id: '6',
    productId: 'prod-6',
    name: 'Fone de Ouvido Sony WH-1000XM4',
    price: 899.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=sony%20wh1000xm4%20wireless%20headphones%20product%20photo&image_size=square',
    seller: 'AudioTech',
    rating: 4.8,
    reviews: 312,
    category: 'Eletrônicos',
    inStock: true,
    viewedAt: '2024-01-23T11:15:00Z',
    viewCount: 2,
    lastViewDuration: 150
  }
];

const categories = ['Todos', 'Eletrônicos', 'Roupas', 'Móveis', 'Casa', 'Veículos'];
const timeFilters = [
  { value: 'all', label: 'Todo o período' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
  { value: '3months', label: 'Últimos 3 meses' }
];

export default function BuyerHistoryPage() {
  const [history, setHistory] = useState<ViewHistoryItem[]>(mockHistory);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const removeFromHistory = (itemId: string) => {
    setHistory(prev => prev.filter(item => item.id !== itemId));
    toast.success('Item removido do histórico');
  };

  const clearAllHistory = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
      setHistory([]);
      toast.success('Histórico limpo com sucesso');
    }
  };

  const addToCart = (item: ViewHistoryItem) => {
    if (!item.inStock) {
      toast.error('Produto fora de estoque');
      return;
    }
    toast.success(`${item.name} adicionado ao carrinho`);
  };

  const addToWishlist = (item: ViewHistoryItem) => {
    toast.success(`${item.name} adicionado à lista de desejos`);
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const viewed = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - viewed.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    
    return viewed.toLocaleDateString('pt-BR');
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const filterByTime = (item: ViewHistoryItem) => {
    if (timeFilter === 'all') return true;
    
    const now = new Date();
    const viewed = new Date(item.viewedAt);
    const diffInDays = Math.floor((now.getTime() - viewed.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (timeFilter) {
      case 'today':
        return diffInDays === 0;
      case 'week':
        return diffInDays <= 7;
      case 'month':
        return diffInDays <= 30;
      case '3months':
        return diffInDays <= 90;
      default:
        return true;
    }
  };

  const filteredHistory = history
    .filter(item => selectedCategory === 'Todos' || item.category === selectedCategory)
    .filter(filterByTime)
    .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());

  const totalViews = history.reduce((sum, item) => sum + item.viewCount, 0);
  const avgViewDuration = history.length > 0 
    ? Math.round(history.reduce((sum, item) => sum + item.lastViewDuration, 0) / history.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Visualização</h1>
            <p className="text-gray-600">
              {filteredHistory.length} {filteredHistory.length === 1 ? 'produto visualizado' : 'produtos visualizados'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
            
            {history.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Limpar Histórico
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Visualizações</p>
                <p className="text-2xl font-bold text-gray-900">{totalViews}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tempo Médio</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(avgViewDuration)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Produtos Únicos</p>
                <p className="text-2xl font-bold text-gray-900">{history.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período
                </label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {timeFilters.map(filter => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* History Items */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {history.length === 0 ? 'Nenhum produto visualizado ainda' : 'Nenhum item encontrado'}
            </h3>
            <p className="text-gray-500 mb-6">
              {history.length === 0 
                ? 'Comece explorando nossos produtos para ver seu histórico aqui'
                : 'Tente alterar os filtros para ver mais resultados'
              }
            </p>
            <Link 
              href="/products"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Explorar Produtos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {!item.inStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white text-xs font-medium">Fora de Estoque</span>
                      </div>
                    )}
                    {item.originalPrice && (
                      <div className="absolute top-1 left-1 bg-red-500 text-white px-1 py-0.5 rounded text-xs font-medium">
                        -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Link 
                          href={`/products/${item.productId}`}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {item.name}
                        </Link>
                        <p className="text-sm text-gray-600">{item.seller}</p>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => addToWishlist(item)}
                          className="p-2 border border-gray-300 rounded hover:bg-gray-50 hover:text-red-500"
                          title="Adicionar à lista de desejos"
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!item.inStock}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          {item.inStock ? 'Adicionar ao Carrinho' : 'Indisponível'}
                        </button>
                        
                        <button
                          onClick={() => removeFromHistory(item.id)}
                          className="p-2 border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                          title="Remover do histórico"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < Math.floor(item.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">({item.reviews} avaliações)</span>
                      <span className="text-xs text-gray-400 mx-2">•</span>
                      <span className="text-xs text-gray-600">{item.category}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-gray-900">
                            R$ {item.price.toFixed(2).replace('.', ',')}
                          </span>
                          {item.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">
                              R$ {item.originalPrice.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Visualizado {getTimeAgo(item.viewedAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.viewCount} {item.viewCount === 1 ? 'visualização' : 'visualizações'} • 
                          Tempo: {formatDuration(item.lastViewDuration)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}