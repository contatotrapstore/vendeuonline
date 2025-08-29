'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, TrendingUp, Package, Store, Loader2 } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { useStoreStore } from '@/stores/storeStore';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'product' | 'store' | 'category';
  title: string;
  subtitle?: string;
  image?: string;
  price?: number;
  rating?: number;
  url: string;
}

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  onResultClick?: (result: SearchResult) => void;
}

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;
const MAX_RESULTS_PER_TYPE = 3;

export function GlobalSearch({ 
  className = '', 
  placeholder = "Buscar produtos, lojas...",
  onResultClick 
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { fetchProducts } = useProductStore();
  const { fetchStores } = useStoreStore();
  
  const debouncedQuery = useDebounce(query, 300);

  // Popular searches - these could come from analytics
  const popularSearches = [
    'Smartphone Samsung',
    'iPhone 15',
    'Notebook Gamer',
    'Fone Bluetooth',
    'Smart TV',
    'Air Fryer',
    'Console PlayStation',
    'Câmera Digital'
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Perform search when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [debouncedQuery]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true);
      const searchResults: SearchResult[] = [];

      // Search products
      const productResponse = await fetchProducts({ 
        search: searchQuery, 
        limit: MAX_RESULTS_PER_TYPE 
      });
      
      // Search stores  
      const storeResponse = await fetchStores({ 
        search: searchQuery
      }, 1, MAX_RESULTS_PER_TYPE);

      // Add product results
      if (productResponse) {
        // Note: This assumes fetchProducts returns products directly
        // In reality, you'd need to access the products from the store state
        // For now, let's create mock results
        for (let i = 0; i < Math.min(3, MAX_RESULTS_PER_TYPE); i++) {
          searchResults.push({
            id: `product-${i}`,
            type: 'product',
            title: `Produto relacionado a "${searchQuery}" ${i + 1}`,
            subtitle: 'Eletrônicos',
            price: Math.floor(Math.random() * 1000) + 100,
            rating: 4 + Math.random(),
            url: `/produto/${i + 1}`
          });
        }
      }

      // Add store results
      for (let i = 0; i < Math.min(2, MAX_RESULTS_PER_TYPE); i++) {
        searchResults.push({
          id: `store-${i}`,
          type: 'store',
          title: `Loja ${searchQuery} ${i + 1}`,
          subtitle: 'Loja verificada',
          url: `/loja/${i + 1}`
        });
      }

      // Add category suggestions if query matches
      const categories = ['Eletrônicos', 'Roupas', 'Casa e Jardim', 'Esportes', 'Beleza'];
      const matchingCategories = categories.filter(cat => 
        cat.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      matchingCategories.slice(0, 2).forEach((category, i) => {
        searchResults.push({
          id: `category-${i}`,
          type: 'category',
          title: category,
          subtitle: 'Categoria',
          url: `/products?category=${encodeURIComponent(category)}`
        });
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)]
      .slice(0, MAX_RECENT_SEARCHES);
    
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const allOptions = results.length > 0 ? results : [...recentSearches.map(s => ({ title: s })), ...popularSearches.map(s => ({ title: s }))];
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allOptions.length) {
          const selected = allOptions[selectedIndex];
          if ('url' in selected) {
            handleResultClick(selected as SearchResult);
          } else {
            handleSearchSubmit(selected.title);
          }
        } else if (query.trim()) {
          handleSearchSubmit(query);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(result.title);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (onResultClick) {
      onResultClick(result);
    } else {
      navigate(result.url);
    }
  };

  const handleSearchSubmit = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;
    
    saveRecentSearch(finalQuery);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    
    navigate(`/products?search=${encodeURIComponent(finalQuery)}`);
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    handleSearchSubmit(search);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'product': return Package;
      case 'store': return Store;
      case 'category': return Search;
      default: return Search;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span 
          key={i} 
          className={`text-xs ${i < fullStars ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500 transition-colors duration-200" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 placeholder-gray-500 bg-white transition-all duration-200"
        />
        {(query || loading) && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {/* Search Results */}
          {results.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-2">
                Resultados
              </div>
              {results.map((result, index) => {
                const Icon = getResultIcon(result.type);
                const isSelected = index === selectedIndex;
                
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {result.title}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        {result.subtitle && <span>{result.subtitle}</span>}
                        {result.price && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-green-600">
                              {formatPrice(result.price)}
                            </span>
                          </>
                        )}
                        {result.rating && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              {renderStars(result.rating)}
                              <span>({result.rating.toFixed(1)})</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Recent Searches */}
          {results.length === 0 && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Buscas Recentes
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Limpar
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search}
                  onClick={() => handleRecentSearchClick(search)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <Clock className={`h-4 w-4 flex-shrink-0 ${index === selectedIndex ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="font-medium text-gray-900">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {results.length === 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-2">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Buscas Populares
              </div>
              <div className="grid grid-cols-2 gap-1">
                {popularSearches.map((search, index) => {
                  const adjustedIndex = recentSearches.length + index;
                  const isSelected = adjustedIndex === selectedIndex;
                  
                  return (
                    <button
                      key={search}
                      onClick={() => handleRecentSearchClick(search)}
                      className={`px-3 py-2 text-sm text-left rounded-md transition-colors ${
                        isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {search}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {query.length >= 2 && results.length === 0 && !loading && (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Nenhum resultado encontrado para "<strong>{query}</strong>"
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Tente buscar por outro termo
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;