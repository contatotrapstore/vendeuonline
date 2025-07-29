'use client';

import { useState } from 'react';
import { Heart, Trash2, ShoppingCart, Eye, Share2, Filter, Grid, List, Star } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface WishlistItem {
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
  addedAt: string;
  priceHistory: { date: string; price: number }[];
}

const mockWishlist: WishlistItem[] = [
  {
    id: '1',
    productId: 'prod-1',
    name: 'iPhone 14 Pro Max 256GB',
    price: 7999.99,
    originalPrice: 8999.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=iphone%2014%20pro%20max%20product%20photo&image_size=square',
    seller: 'TechStore Erechim',
    rating: 4.8,
    reviews: 127,
    category: 'Eletrônicos',
    inStock: true,
    addedAt: '2024-01-15',
    priceHistory: [
      { date: '2024-01-15', price: 8999.99 },
      { date: '2024-01-20', price: 8499.99 },
      { date: '2024-01-25', price: 7999.99 }
    ]
  },
  {
    id: '2',
    productId: 'prod-2',
    name: 'MacBook Air M2 13" 256GB',
    price: 9999.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=macbook%20air%20m2%20laptop%20product%20photo&image_size=square',
    seller: 'Apple Store Erechim',
    rating: 4.9,
    reviews: 89,
    category: 'Eletrônicos',
    inStock: true,
    addedAt: '2024-01-10',
    priceHistory: [
      { date: '2024-01-10', price: 9999.99 }
    ]
  },
  {
    id: '3',
    productId: 'prod-3',
    name: 'Tênis Nike Air Max 270',
    price: 299.99,
    originalPrice: 399.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=nike%20air%20max%20270%20sneakers%20product%20photo&image_size=square',
    seller: 'SportShop',
    rating: 4.6,
    reviews: 234,
    category: 'Roupas',
    inStock: false,
    addedAt: '2024-01-08',
    priceHistory: [
      { date: '2024-01-08', price: 399.99 },
      { date: '2024-01-18', price: 299.99 }
    ]
  },
  {
    id: '4',
    productId: 'prod-4',
    name: 'Smart TV Samsung 55" 4K',
    price: 2499.99,
    image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung%2055%20inch%204k%20smart%20tv%20product%20photo&image_size=square',
    seller: 'Eletro Erechim',
    rating: 4.7,
    reviews: 156,
    category: 'Eletrônicos',
    inStock: true,
    addedAt: '2024-01-05',
    priceHistory: [
      { date: '2024-01-05', price: 2499.99 }
    ]
  }
];

const categories = ['Todos', 'Eletrônicos', 'Roupas', 'Casa', 'Veículos'];
const sortOptions = [
  { value: 'recent', label: 'Adicionados recentemente' },
  { value: 'price-low', label: 'Menor preço' },
  { value: 'price-high', label: 'Maior preço' },
  { value: 'name', label: 'Nome A-Z' },
  { value: 'rating', label: 'Melhor avaliação' }
];

export default function BuyerWishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(mockWishlist);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);

  const removeFromWishlist = (itemId: string) => {
    setWishlist(prev => prev.filter(item => item.id !== itemId));
    toast.success('Item removido da lista de desejos');
  };

  const addToCart = (item: WishlistItem) => {
    if (!item.inStock) {
      toast.error('Produto fora de estoque');
      return;
    }
    toast.success(`${item.name} adicionado ao carrinho`);
  };

  const shareItem = (item: WishlistItem) => {
    if (navigator.share) {
      navigator.share({
        title: item.name,
        text: `Confira este produto: ${item.name}`,
        url: `/products/${item.productId}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/products/${item.productId}`);
      toast.success('Link copiado para a área de transferência');
    }
  };

  const getPriceChange = (item: WishlistItem) => {
    if (item.priceHistory.length < 2) return null;
    const current = item.priceHistory[item.priceHistory.length - 1].price;
    const previous = item.priceHistory[item.priceHistory.length - 2].price;
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  const filteredAndSortedItems = wishlist
    .filter(item => selectedCategory === 'Todos' || item.category === selectedCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'recent':
        default:
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Lista de Desejos</h1>
            <p className="text-gray-600">
              {wishlist.length} {wishlist.length === 1 ? 'item salvo' : 'itens salvos'}
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
            
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
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
                  Ordenar por
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Wishlist Items */}
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {selectedCategory === 'Todos' ? 'Sua lista de desejos está vazia' : `Nenhum item encontrado em ${selectedCategory}`}
            </h3>
            <p className="text-gray-500 mb-6">
              {selectedCategory === 'Todos' 
                ? 'Adicione produtos que você gostaria de comprar mais tarde'
                : 'Tente alterar os filtros ou explorar outras categorias'
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
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {filteredAndSortedItems.map((item) => {
              const priceChange = getPriceChange(item);
              
              return viewMode === 'grid' ? (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-100">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {!item.inStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-medium">Fora de Estoque</span>
                      </div>
                    )}
                    {item.originalPrice && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                        -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{item.name}</h3>
                    
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < Math.floor(item.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">({item.reviews})</span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{item.seller}</p>
                    
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          R$ {item.price.toFixed(2).replace('.', ',')}
                        </span>
                        {item.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            R$ {item.originalPrice.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                      {priceChange && (
                        <div className={`text-xs ${priceChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {priceChange < 0 ? '↓' : '↑'} {Math.abs(priceChange).toFixed(1)}% desde que adicionou
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.inStock}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        {item.inStock ? 'Adicionar' : 'Indisponível'}
                      </button>
                      
                      <button
                        onClick={() => shareItem(item)}
                        className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        <Share2 className="h-3 w-3" />
                      </button>
                      
                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="p-2 border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
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
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => addToCart(item)}
                            disabled={!item.inStock}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            {item.inStock ? 'Adicionar' : 'Indisponível'}
                          </button>
                          
                          <button
                            onClick={() => shareItem(item)}
                            className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Share2 className="h-3 w-3" />
                          </button>
                          
                          <button
                            onClick={() => removeFromWishlist(item.id)}
                            className="p-2 border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
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
                        <span className="text-xs text-gray-500">({item.reviews})</span>
                        <span className="text-xs text-gray-400 mx-2">•</span>
                        <span className="text-xs text-gray-600">{item.seller}</span>
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
                            {item.originalPrice && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
                              </span>
                            )}
                          </div>
                          {priceChange && (
                            <div className={`text-xs ${priceChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {priceChange < 0 ? '↓' : '↑'} {Math.abs(priceChange).toFixed(1)}% desde que adicionou
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Adicionado em {new Date(item.addedAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}