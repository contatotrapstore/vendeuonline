'use client';

import { useState } from 'react';
import { 
  Star, 
  X, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Truck, 
  Shield,
  Calendar,
  Tag,
  Package,
  Zap,
  Filter
} from 'lucide-react';

export interface AdvancedFiltersState {
  priceRange: [number, number];
  selectedBrands: string[];
  selectedConditions: string[];
  selectedCategories: string[];
  selectedLocations: string[];
  freeShippingOnly: boolean;
  fastDeliveryOnly: boolean;
  minRating: number;
  hasWarranty: boolean;
  hasReturns: boolean;
  inStock: boolean;
  onSale: boolean;
  recentlyAdded: boolean; // Last 7 days
  sellersOnly: string[]; // Specific sellers
  priceHistory: 'stable' | 'rising' | 'falling' | 'any';
  availability: 'all' | 'in_stock' | 'pre_order' | 'back_order';
  ageRange: string; // For products with age restrictions
  size: string[];
  color: string[];
  material: string[];
  weight: [number, number]; // Min/max weight
  dimensions: {
    length: [number, number];
    width: [number, number]; 
    height: [number, number];
  };
}

interface AdvancedProductFiltersProps {
  filters: AdvancedFiltersState;
  onFiltersChange: (filters: Partial<AdvancedFiltersState>) => void;
  availableOptions: {
    brands: string[];
    categories: string[];
    locations: string[];
    conditions: string[];
    sellers: string[];
    sizes: string[];
    colors: string[];
    materials: string[];
  };
  className?: string;
}

const CONDITIONS = [
  { value: 'new', label: 'Novo', icon: '✨' },
  { value: 'used', label: 'Usado', icon: '🔄' },
  { value: 'refurbished', label: 'Recondicionado', icon: '🔧' },
  { value: 'open_box', label: 'Caixa Aberta', icon: '📦' }
];

const PRICE_HISTORY_OPTIONS = [
  { value: 'any', label: 'Qualquer' },
  { value: 'falling', label: 'Preço Caindo' },
  { value: 'stable', label: 'Preço Estável' },
  { value: 'rising', label: 'Preço Subindo' }
];

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'in_stock', label: 'Em Estoque' },
  { value: 'pre_order', label: 'Pré-Venda' },
  { value: 'back_order', label: 'Sob Encomenda' }
];

const QUICK_PRICE_RANGES = [
  { label: 'Até R$ 50', range: [0, 50] as [number, number] },
  { label: 'R$ 50 - R$ 100', range: [50, 100] as [number, number] },
  { label: 'R$ 100 - R$ 500', range: [100, 500] as [number, number] },
  { label: 'R$ 500 - R$ 1.000', range: [500, 1000] as [number, number] },
  { label: 'R$ 1.000+', range: [1000, 10000] as [number, number] }
];

export function AdvancedProductFilters({ 
  filters, 
  onFiltersChange, 
  availableOptions,
  className = '' 
}: AdvancedProductFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    categories: true,
    brands: false,
    conditions: true,
    location: false,
    shipping: true,
    rating: true,
    features: false,
    specifications: false,
    advanced: false
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(price);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleArrayToggle = <T,>(
    array: T[], 
    item: T, 
    callback: (newArray: T[]) => void
  ) => {
    if (array.includes(item)) {
      callback(array.filter(i => i !== item));
    } else {
      callback([...array, item]);
    }
  };

  const renderStars = (rating: number, interactive = false, onClick?: () => void) => {
    return (
      <div 
        className={`flex items-center gap-1 ${interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
        onClick={onClick}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 transition-colors ${
              i < rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300 hover:text-yellow-200'
            }`}
          />
        ))}
        {rating > 0 && <span className="text-sm text-gray-600 ml-1">{rating}+ estrelas</span>}
      </div>
    );
  };

  const clearAllFilters = () => {
    onFiltersChange({
      priceRange: [0, 10000],
      selectedBrands: [],
      selectedConditions: [],
      selectedCategories: [],
      selectedLocations: [],
      freeShippingOnly: false,
      fastDeliveryOnly: false,
      minRating: 0,
      hasWarranty: false,
      hasReturns: false,
      inStock: false,
      onSale: false,
      recentlyAdded: false,
      sellersOnly: [],
      priceHistory: 'any',
      availability: 'all',
      size: [],
      color: [],
      material: [],
      weight: [0, 100],
      dimensions: {
        length: [0, 1000],
        width: [0, 1000],
        height: [0, 1000]
      }
    });
  };

  const hasActiveFilters = 
    filters.priceRange[0] > 0 || 
    filters.priceRange[1] < 10000 || 
    filters.selectedBrands.length > 0 || 
    filters.selectedConditions.length > 0 || 
    filters.selectedCategories.length > 0 ||
    filters.selectedLocations.length > 0 ||
    filters.freeShippingOnly || 
    filters.fastDeliveryOnly ||
    filters.minRating > 0 ||
    filters.hasWarranty ||
    filters.hasReturns ||
    filters.inStock ||
    filters.onSale ||
    filters.recentlyAdded ||
    filters.sellersOnly.length > 0 ||
    filters.priceHistory !== 'any' ||
    filters.availability !== 'all' ||
    filters.size.length > 0 ||
    filters.color.length > 0 ||
    filters.material.length > 0;

  const activeFiltersCount = [
    filters.selectedBrands.length,
    filters.selectedConditions.length,
    filters.selectedCategories.length,
    filters.selectedLocations.length,
    filters.size.length,
    filters.color.length,
    filters.material.length,
    filters.sellersOnly.length,
    ...[
      filters.priceRange[0] > 0 || filters.priceRange[1] < 10000 ? 1 : 0,
      filters.freeShippingOnly ? 1 : 0,
      filters.fastDeliveryOnly ? 1 : 0,
      filters.minRating > 0 ? 1 : 0,
      filters.hasWarranty ? 1 : 0,
      filters.hasReturns ? 1 : 0,
      filters.inStock ? 1 : 0,
      filters.onSale ? 1 : 0,
      filters.recentlyAdded ? 1 : 0,
      filters.priceHistory !== 'any' ? 1 : 0,
      filters.availability !== 'all' ? 1 : 0
    ]
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="h-4 w-4" />
            Limpar Tudo
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Quick Price Filters */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Faixas de Preço Rápidas</h4>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PRICE_RANGES.map((range) => {
              const isActive = filters.priceRange[0] === range.range[0] && 
                               filters.priceRange[1] === range.range[1];
              return (
                <button
                  key={range.label}
                  onClick={() => onFiltersChange({ priceRange: range.range })}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    isActive 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Price Range */}
        <div>
          <button
            onClick={() => toggleSection('price')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900">Faixa Personalizada</h4>
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
                    value={filters.priceRange[0]}
                    onChange={(e) => onFiltersChange({ 
                      priceRange: [Number(e.target.value), filters.priceRange[1]] 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="R$ 0"
                  />
                </div>
                <span className="text-gray-500 mt-6">até</span>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Máximo</label>
                  <input
                    type="number"
                    value={filters.priceRange[1]}
                    onChange={(e) => onFiltersChange({ 
                      priceRange: [filters.priceRange[0], Number(e.target.value)] 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="R$ 10.000"
                  />
                </div>
              </div>
              <div className="text-center text-sm text-gray-500">
                {formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}
              </div>
            </div>
          )}
        </div>

        {/* Categories */}
        <div>
          <button
            onClick={() => toggleSection('categories')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900">Categorias</h4>
            <div className="flex items-center gap-2">
              {filters.selectedCategories.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {filters.selectedCategories.length}
                </span>
              )}
              {expandedSections.categories ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </div>
          </button>
          
          {expandedSections.categories && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {availableOptions.categories.map((category) => (
                <label key={category} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.selectedCategories.includes(category)}
                    onChange={() => handleArrayToggle(
                      filters.selectedCategories, 
                      category, 
                      (newCategories) => onFiltersChange({ selectedCategories: newCategories })
                    )}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 flex-1">{category}</span>
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
            <div className="flex items-center gap-2">
              {filters.selectedConditions.length > 0 && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {filters.selectedConditions.length}
                </span>
              )}
              {expandedSections.conditions ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </div>
          </button>
          
          {expandedSections.conditions && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {CONDITIONS.map((condition) => {
                const isSelected = filters.selectedConditions.includes(condition.value);
                return (
                  <button
                    key={condition.value}
                    onClick={() => handleArrayToggle(
                      filters.selectedConditions,
                      condition.value,
                      (newConditions) => onFiltersChange({ selectedConditions: newConditions })
                    )}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                      isSelected
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <span>{condition.icon}</span>
                    {condition.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Features & Benefits */}
        <div>
          <button
            onClick={() => toggleSection('features')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900">Características</h4>
            {expandedSections.features ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.features && (
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.freeShippingOnly}
                  onChange={(e) => onFiltersChange({ freeShippingOnly: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Truck className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">Frete Grátis</span>
              </label>

              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.fastDeliveryOnly}
                  onChange={(e) => onFiltersChange({ fastDeliveryOnly: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Zap className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-gray-700">Entrega Rápida</span>
              </label>

              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasWarranty}
                  onChange={(e) => onFiltersChange({ hasWarranty: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-700">Com Garantia</span>
              </label>

              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onSale}
                  onChange={(e) => onFiltersChange({ onSale: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Tag className="h-4 w-4 text-red-600" />
                <span className="text-sm text-gray-700">Em Promoção</span>
              </label>

              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => onFiltersChange({ inStock: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Package className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">Em Estoque</span>
              </label>

              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.recentlyAdded}
                  onChange={(e) => onFiltersChange({ recentlyAdded: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-gray-700">Adicionado Recentemente</span>
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
            <h4 className="font-medium text-gray-900">Avaliação Mínima</h4>
            {expandedSections.rating ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.rating && (
            <div className="mt-4 space-y-2">
              {[5, 4, 3, 2, 1, 0].map((rating) => (
                <div
                  key={rating}
                  onClick={() => onFiltersChange({ minRating: rating })}
                  className={`p-2 rounded-md cursor-pointer transition-colors ${
                    filters.minRating === rating
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {renderStars(rating, true)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location */}
        {availableOptions.locations.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('location')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-600" />
                <h4 className="font-medium text-gray-900">Localização</h4>
              </div>
              <div className="flex items-center gap-2">
                {filters.selectedLocations.length > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                    {filters.selectedLocations.length}
                  </span>
                )}
                {expandedSections.location ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </button>
            
            {expandedSections.location && (
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {availableOptions.locations.map((location) => (
                  <label key={location} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.selectedLocations.includes(location)}
                      onChange={() => handleArrayToggle(
                        filters.selectedLocations, 
                        location, 
                        (newLocations) => onFiltersChange({ selectedLocations: newLocations })
                      )}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{location}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Brands */}
        {availableOptions.brands.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('brands')}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="font-medium text-gray-900">Marcas</h4>
              <div className="flex items-center gap-2">
                {filters.selectedBrands.length > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                    {filters.selectedBrands.length}
                  </span>
                )}
                {expandedSections.brands ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </button>
            
            {expandedSections.brands && (
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {availableOptions.brands.map((brand) => (
                  <label key={brand} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.selectedBrands.includes(brand)}
                      onChange={() => handleArrayToggle(
                        filters.selectedBrands, 
                        brand, 
                        (newBrands) => onFiltersChange({ selectedBrands: newBrands })
                      )}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{brand}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdvancedProductFilters;