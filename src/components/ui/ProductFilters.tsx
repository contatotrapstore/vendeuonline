'use client';

import { useState } from 'react';
import { Star, X, ChevronDown, ChevronUp } from 'lucide-react';

interface ProductFiltersProps {
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  selectedBrands: string[];
  onBrandsChange: (brands: string[]) => void;
  availableBrands: string[];
  selectedConditions: string[];
  onConditionsChange: (conditions: string[]) => void;
  availableConditions: string[];
  freeShippingOnly: boolean;
  onFreeShippingChange: (value: boolean) => void;
  minRating: number;
  onMinRatingChange: (rating: number) => void;
}

export function ProductFilters({
  priceRange,
  onPriceRangeChange,
  selectedBrands,
  onBrandsChange,
  availableBrands,
  selectedConditions,
  onConditionsChange,
  availableConditions,
  freeShippingOnly,
  onFreeShippingChange,
  minRating,
  onMinRatingChange
}: ProductFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    brands: true,
    conditions: true,
    shipping: true,
    rating: true
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBrandToggle = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      onBrandsChange(selectedBrands.filter(b => b !== brand));
    } else {
      onBrandsChange([...selectedBrands, brand]);
    }
  };

  const handleConditionToggle = (condition: string) => {
    if (selectedConditions.includes(condition)) {
      onConditionsChange(selectedConditions.filter(c => c !== condition));
    } else {
      onConditionsChange([...selectedConditions, condition]);
    }
  };

  const renderStars = (rating: number, interactive = false, onClick?: () => void) => {
    return (
      <div 
        className={`flex items-center gap-1 ${interactive ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const clearAllFilters = () => {
    onPriceRangeChange([0, 10000]);
    onBrandsChange([]);
    onConditionsChange([]);
    onFreeShippingChange(false);
    onMinRatingChange(0);
  };

  const hasActiveFilters = 
    priceRange[0] > 0 || 
    priceRange[1] < 10000 || 
    selectedBrands.length > 0 || 
    selectedConditions.length > 0 || 
    freeShippingOnly || 
    minRating > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Limpar
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Price Range */}
        <div>
          <button
            onClick={() => toggleSection('price')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900">Faixa de Preço</h4>
            {expandedSections.price ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.price && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Mínimo</label>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => onPriceRangeChange([Number(e.target.value), priceRange[1]])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Máximo</label>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10000"
                  />
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
              </div>
              
              {/* Quick price ranges */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  [0, 100],
                  [100, 500],
                  [500, 1000],
                  [1000, 5000]
                ].map(([min, max]) => (
                  <button
                    key={`${min}-${max}`}
                    onClick={() => onPriceRangeChange([min, max])}
                    className={`text-xs px-3 py-2 rounded-md border transition-colors ${
                      priceRange[0] === min && priceRange[1] === max
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {formatPrice(min)} - {formatPrice(max)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Brands */}
        <div>
          <button
            onClick={() => toggleSection('brands')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900">Marcas</h4>
            {expandedSections.brands ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.brands && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {availableBrands.map(brand => (
                <label key={brand} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => handleBrandToggle(brand)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{brand}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Conditions */}
        <div>
          <button
            onClick={() => toggleSection('conditions')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900">Condição</h4>
            {expandedSections.conditions ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.conditions && (
            <div className="mt-4 space-y-2">
              {availableConditions.map(condition => (
                <label key={condition} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedConditions.includes(condition)}
                    onChange={() => handleConditionToggle(condition)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{condition}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Shipping */}
        <div>
          <button
            onClick={() => toggleSection('shipping')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900">Entrega</h4>
            {expandedSections.shipping ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.shipping && (
            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={freeShippingOnly}
                  onChange={(e) => onFreeShippingChange(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Apenas frete grátis</span>
              </label>
            </div>
          )}
        </div>

        {/* Rating */}
        <div>
          <button
            onClick={() => toggleSection('rating')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900">Avaliação</h4>
            {expandedSections.rating ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.rating && (
            <div className="mt-4 space-y-2">
              {[4, 3, 2, 1].map(rating => (
                <button
                  key={rating}
                  onClick={() => onMinRatingChange(rating)}
                  className={`flex items-center gap-2 w-full text-left p-2 rounded-md transition-colors ${
                    minRating === rating
                      ? 'bg-blue-50 border border-blue-300'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {renderStars(rating)}
                  <span className="text-sm text-gray-700">e acima</span>
                </button>
              ))}
              
              {minRating > 0 && (
                <button
                  onClick={() => onMinRatingChange(0)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpar filtro de avaliação
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Filtros ativos:</h5>
          <div className="space-y-2">
            {(priceRange[0] > 0 || priceRange[1] < 10000) && (
              <div className="text-xs text-gray-600">
                Preço: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
              </div>
            )}
            {selectedBrands.length > 0 && (
              <div className="text-xs text-gray-600">
                Marcas: {selectedBrands.join(', ')}
              </div>
            )}
            {selectedConditions.length > 0 && (
              <div className="text-xs text-gray-600">
                Condição: {selectedConditions.join(', ')}
              </div>
            )}
            {freeShippingOnly && (
              <div className="text-xs text-gray-600">
                Apenas frete grátis
              </div>
            )}
            {minRating > 0 && (
              <div className="text-xs text-gray-600">
                Avaliação: {minRating}+ estrelas
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductFilters;