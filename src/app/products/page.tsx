'use client';

import { useState, useEffect, Suspense } from 'react';
import { Search, Filter, Grid, List, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductFilters } from '@/components/ui/ProductFilters';
import { useProductStore } from '@/store/productStore';

const categories = [
  'Todos',
  'Eletrônicos',
  'Imóveis',
  'Veículos',
  'Roupas',
  'Comida',
  'Serviços',
  'Emprego',
  'Móveis'
];

const sortOptions = [
  { value: 'relevance', label: 'Mais Relevantes' },
  { value: 'price_asc', label: 'Menor Preço' },
  { value: 'price_desc', label: 'Maior Preço' },
  { value: 'rating', label: 'Melhor Avaliação' },
  { value: 'newest', label: 'Mais Recentes' },
  { value: 'popular', label: 'Mais Populares' }
];

export default function ProductsPage() {
  const {
    filteredProducts,
    filters,
    setFilters,
    resetFilters,
    products
  } = useProductStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const productsPerPage = 12;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

  // Get unique brands and conditions from all products
  const availableBrands = Array.from(new Set(products.map(p => p.brand))).sort();
  const availableConditions = Array.from(new Set(products.map(p => p.condition))).sort();

  const handleSearch = (searchTerm: string) => {
    setFilters({ search: searchTerm });
  };

  const handleCategoryChange = (category: string) => {
    setFilters({ category });
  };

  const handleSortChange = (sortBy: string) => {
    setFilters({ sortBy: sortBy as any });
  };

  const handleClearFilters = () => {
    resetFilters();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Produtos</h1>
          <p className="text-gray-600">Encontre os melhores produtos de vendedores verificados</p>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar produtos, lojas ou marcas..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <select
                value={filters.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="lg:w-48">
              <select
                value={filters.sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" />
              Filtros
            </button>

            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 ${
                  viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 border-l border-gray-300 ${
                  viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <Suspense fallback={
                <div className="bg-white rounded-lg p-6 shadow-sm border">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              }>
                <ProductFilters
                  priceRange={[filters.minPrice, filters.maxPrice]}
                  onPriceRangeChange={(range) => setFilters({ minPrice: range[0], maxPrice: range[1] })}
                  selectedBrands={filters.brands}
                  onBrandsChange={(brands) => setFilters({ brands })}
                  availableBrands={availableBrands}
                  selectedConditions={filters.conditions}
                  onConditionsChange={(conditions) => setFilters({ conditions })}
                  availableConditions={availableConditions}
                  freeShippingOnly={filters.freeShippingOnly}
                  onFreeShippingChange={(freeShippingOnly) => setFilters({ freeShippingOnly })}
                  minRating={filters.minRating}
                  onMinRatingChange={(minRating) => setFilters({ minRating })}
                />
              </Suspense>
            </div>
          )}

          {/* Products Grid/List */}
          <div className="flex-1">
            {/* Results Info */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                Mostrando {startIndex + 1}-{Math.min(startIndex + productsPerPage, filteredProducts.length)} de {filteredProducts.length} produtos
              </p>
              
              {/* Quick clear filters if any active */}
              {(filters.search || 
                filters.category !== 'Todos' || 
                filters.minPrice > 0 || 
                filters.maxPrice < 10000 || 
                filters.brands.length > 0 || 
                filters.conditions.length > 0 || 
                filters.freeShippingOnly || 
                filters.minRating > 0) && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>

            {/* Products */}
            {currentProducts.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
              }>
                {currentProducts.map(product => (
                  <Suspense key={product.id} fallback={
                    <div className="bg-white rounded-lg shadow-sm border animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  }>
                    <ProductCard
                      product={product}
                      viewMode={viewMode}
                      onAddToCart={(product) => {
                        // TODO: Implementar adicionar ao carrinho
                        console.log('Adicionar ao carrinho:', product.name);
                      }}
                      onToggleWishlist={(product) => {
                        // TODO: Implementar lista de desejos
                        console.log('Toggle wishlist:', product.name);
                      }}
                    />
                  </Suspense>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
                <p className="text-gray-600 mb-4">Tente ajustar os filtros ou buscar por outros termos</p>
                <button
                  onClick={handleClearFilters}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-12">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Anterior
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 border rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}