"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface FilterOptions {
  categories: string[];
  brands: string[];
  conditions: string[];
  priceRange: [number, number];
}

interface ActiveFilters {
  search: string;
  categories: string[];
  brands: string[];
  conditions: string[];
  priceRange: [number, number];
  sortBy: string;
  inStock: boolean;
  freeShipping: boolean;
}

interface ProductFiltersProps {
  options: FilterOptions;
  onFiltersChange: (filters: ActiveFilters) => void;
  totalProducts?: number;
  loading?: boolean;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Mais Relevantes" },
  { value: "price_asc", label: "Menor Preço" },
  { value: "price_desc", label: "Maior Preço" },
  { value: "newest", label: "Mais Recentes" },
  { value: "best_seller", label: "Mais Vendidos" },
  { value: "rating", label: "Melhor Avaliados" },
];

export default function ProductFilters({
  options,
  onFiltersChange,
  totalProducts = 0,
  loading = false,
}: ProductFiltersProps) {
  const [filters, setFilters] = useState<ActiveFilters>({
    search: "",
    categories: [],
    brands: [],
    conditions: [],
    priceRange: options.priceRange,
    sortBy: "relevance",
    inStock: false,
    freeShipping: false,
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof ActiveFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: "categories" | "brands" | "conditions", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((item) => item !== value) : [...prev[key], value],
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      categories: [],
      brands: [],
      conditions: [],
      priceRange: options.priceRange,
      sortBy: "relevance",
      inStock: false,
      freeShipping: false,
    });
  };

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case "search":
        updateFilter("search", "");
        break;
      case "category":
        if (value) toggleArrayFilter("categories", value);
        break;
      case "brand":
        if (value) toggleArrayFilter("brands", value);
        break;
      case "condition":
        if (value) toggleArrayFilter("conditions", value);
        break;
      case "inStock":
        updateFilter("inStock", false);
        break;
      case "freeShipping":
        updateFilter("freeShipping", false);
        break;
      case "priceRange":
        updateFilter("priceRange", options.priceRange);
        break;
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    count += filters.categories.length;
    count += filters.brands.length;
    count += filters.conditions.length;
    if (filters.inStock) count++;
    if (filters.freeShipping) count++;
    if (filters.priceRange[0] !== options.priceRange[0] || filters.priceRange[1] !== options.priceRange[1]) count++;
    return count;
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Busca */}
      <div>
        <Label htmlFor="search">Buscar Produtos</Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            id="search"
            placeholder="Digite o nome do produto..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Ordenação */}
      <div>
        <Label>Ordenar por</Label>
        <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Faixa de Preço */}
      <div>
        <Label>Faixa de Preço</Label>
        <div className="mt-4 space-y-4">
          <Slider
            value={filters.priceRange}
            onValueChange={(value) => updateFilter("priceRange", value as [number, number])}
            max={options.priceRange[1]}
            min={options.priceRange[0]}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>R$ {filters.priceRange[0]}</span>
            <span>R$ {filters.priceRange[1]}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Categorias */}
      {options.categories.length > 0 && (
        <div>
          <Label>Categorias</Label>
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
            {options.categories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category}`}
                  checked={filters.categories.includes(category)}
                  onCheckedChange={() => toggleArrayFilter("categories", category)}
                />
                <Label htmlFor={`category-${category}`} className="text-sm font-normal cursor-pointer">
                  {category}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marcas */}
      {options.brands.length > 0 && (
        <div>
          <Label>Marcas</Label>
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
            {options.brands.map((brand) => (
              <div key={brand} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand}`}
                  checked={filters.brands.includes(brand)}
                  onCheckedChange={() => toggleArrayFilter("brands", brand)}
                />
                <Label htmlFor={`brand-${brand}`} className="text-sm font-normal cursor-pointer">
                  {brand}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Condições */}
      {options.conditions.length > 0 && (
        <div>
          <Label>Condição</Label>
          <div className="mt-3 space-y-2">
            {options.conditions.map((condition) => (
              <div key={condition} className="flex items-center space-x-2">
                <Checkbox
                  id={`condition-${condition}`}
                  checked={filters.conditions.includes(condition)}
                  onCheckedChange={() => toggleArrayFilter("conditions", condition)}
                />
                <Label htmlFor={`condition-${condition}`} className="text-sm font-normal cursor-pointer">
                  {condition}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Filtros Adicionais */}
      <div>
        <Label>Filtros Adicionais</Label>
        <div className="mt-3 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="inStock"
              checked={filters.inStock}
              onCheckedChange={(checked) => updateFilter("inStock", checked)}
            />
            <Label htmlFor="inStock" className="text-sm font-normal cursor-pointer">
              Apenas em estoque
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="freeShipping"
              checked={filters.freeShipping}
              onCheckedChange={(checked) => updateFilter("freeShipping", checked)}
            />
            <Label htmlFor="freeShipping" className="text-sm font-normal cursor-pointer">
              Frete grátis
            </Label>
          </div>
        </div>
      </div>

      {/* Botão Limpar Filtros */}
      {getActiveFiltersCount() > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          Limpar Filtros
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header com resultados e filtros ativos */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${totalProducts} produtos encontrados`}
          </span>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary">
              {getActiveFiltersCount()} filtro{getActiveFiltersCount() > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Botão de filtros para mobile */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filtros ativos */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Busca: {filters.search}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("search")} />
            </Badge>
          )}
          {filters.categories.map((category) => (
            <Badge key={category} variant="secondary" className="gap-1">
              {category}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("category", category)} />
            </Badge>
          ))}
          {filters.brands.map((brand) => (
            <Badge key={brand} variant="secondary" className="gap-1">
              {brand}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("brand", brand)} />
            </Badge>
          ))}
          {filters.conditions.map((condition) => (
            <Badge key={condition} variant="secondary" className="gap-1">
              {condition}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("condition", condition)} />
            </Badge>
          ))}
          {filters.inStock && (
            <Badge variant="secondary" className="gap-1">
              Em estoque
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("inStock")} />
            </Badge>
          )}
          {filters.freeShipping && (
            <Badge variant="secondary" className="gap-1">
              Frete grátis
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("freeShipping")} />
            </Badge>
          )}
          {(filters.priceRange[0] !== options.priceRange[0] || filters.priceRange[1] !== options.priceRange[1]) && (
            <Badge variant="secondary" className="gap-1">
              R$ {filters.priceRange[0]} - R$ {filters.priceRange[1]}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("priceRange")} />
            </Badge>
          )}
        </div>
      )}

      {/* Filtros para desktop */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FilterContent />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
