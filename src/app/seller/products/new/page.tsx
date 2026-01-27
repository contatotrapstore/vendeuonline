"use client";

import { logger } from "@/lib/logger";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Plus, Minus } from "lucide-react";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import ImageUploader, { UploadedImage } from "@/components/ui/ImageUploader";
import { DeliveryOptionsEditor } from "@/components/seller/DeliveryOptionsEditor";
import { Link } from "react-router-dom";
import { apiRequest } from "@/lib/api-client";
import { toast } from "sonner";
import { DeliveryOption } from "@/types";

// Funções para formatação de moeda brasileira
const formatCurrencyInput = (value: number): string => {
  if (!value && value !== 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const parseCurrencyInput = (value: string): number => {
  if (!value) return 0;
  // Remove tudo exceto números e vírgula
  const cleaned = value.replace(/[^\d,]/g, '');
  // Troca vírgula por ponto para converter
  const normalized = cleaned.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

const handleCurrencyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Permite: backspace, delete, tab, escape, enter, setas
  if ([8, 46, 9, 27, 13, 37, 38, 39, 40].includes(e.keyCode)) return;
  // Permite Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
  if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) return;
  // Permite: 0-9, vírgula, ponto
  if (!/[\d.,]/.test(e.key)) {
    e.preventDefault();
  }
};

interface ProductForm {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  brand: string;
  model: string;
  condition: "new" | "used" | "refurbished";
  stock: number;
  minStock: number;
  images: UploadedImage[];
  specifications: { key: string; value: string }[];
  // freeShipping removido: Sistema WhatsApp-only
  // weight removido: Sistema WhatsApp-only (acordado via WhatsApp)
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  status: "active" | "inactive" | "draft";
  shippingOptions: string[];
  deliveryOptions: DeliveryOption[];
}

// Categories will be loaded from API

const conditionOptions = [
  { value: "new", label: "Novo" },
  { value: "used", label: "Usado" },
  { value: "refurbished", label: "Recondicionado" },
];

const SHIPPING_OPTIONS = [
  { value: "retirada", label: "Retirada em mãos" },
  { value: "correios", label: "Correios" },
  { value: "transportadora", label: "Transportadora" },
];

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function NewProductPage() {
  const navigate = useNavigate();
  const { createProduct } = useProductStore();
  const { user, token } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🔧 FIX: Estados separados para inputs de preço (permite digitação livre)
  const [priceInput, setPriceInput] = useState('');
  const [originalPriceInput, setOriginalPriceInput] = useState('');

  const [formData, setFormData] = useState<ProductForm>({
    name: "",
    description: "",
    price: 0,
    originalPrice: undefined,
    category: "",
    brand: "",
    model: "",
    condition: "new",
    stock: 0,
    minStock: 5,
    images: [],
    specifications: [{ key: "", value: "" }],
    // freeShipping removido: Sistema WhatsApp-only
    // weight removido: Sistema WhatsApp-only
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
    },
    status: "draft",
    shippingOptions: [],
    deliveryOptions: [],
  });

  useEffect(() => {
    // Verificar autenticação
    if (!user || user.userType !== "seller") {
      navigate("/login");
      return;
    }

    loadCategories();
  }, [user, navigate]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await apiRequest("/api/categories", { token });
      if (response?.data) {
        setCategories(response.data);
      }
    } catch (error) {
      logger.error("Erro ao carregar categorias:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoadingCategories(false);
    }
  };

  const validateForm = (requireImages: boolean = true): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome do produto é obrigatório";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Descrição é obrigatória";
    }

    if (formData.price <= 0) {
      newErrors.price = "Preço deve ser maior que zero";
    }

    if (!formData.category) {
      newErrors.category = "Categoria é obrigatória";
    }

    if (!formData.brand.trim()) {
      newErrors.brand = "Marca é obrigatória";
    }

    // Validar: pelo menos uma opção de entrega (checkboxes OU customizadas)
    const hasShippingOptions = formData.shippingOptions.length > 0;
    const hasDeliveryOptions = formData.deliveryOptions.length > 0 && formData.deliveryOptions.some(opt => opt.name.trim());
    if (!hasShippingOptions && !hasDeliveryOptions) {
      newErrors.shippingOptions = "Selecione ou cadastre pelo menos uma forma de entrega";
    }

    if (formData.stock < 0) {
      newErrors.stock = "Estoque não pode ser negativo";
    }
    if (formData.minStock < 0) {
      newErrors.minStock = "Estoque mínimo não pode ser negativo";
    } else if (formData.stock > 0 && formData.minStock > formData.stock) {
      newErrors.minStock = "Estoque mínimo deve ser menor ou igual ao estoque total";
    }

    // Imagem obrigatória apenas para publicação, não para rascunho
    if (requireImages && formData.images.length === 0) {
      newErrors.images = "Pelo menos uma imagem é obrigatória para publicar";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, status: "draft" | "active") => {
    e.preventDefault();

    // Para publicação (active), exigir imagens. Para rascunho (draft), imagens são opcionais
    const requireImages = status === "active";
    if (!validateForm(requireImages)) {
      toast.error(status === "draft" ? "Preencha os campos obrigatórios" : "Preencha todos os campos para publicar");
      return;
    }

    setIsLoading(true);

    try {
      // Filter out empty specifications
      const cleanSpecs = formData.specifications.filter((spec) => spec.key.trim() && spec.value.trim());
      const imageUrls = formData.images.map((img) => img.url);

      const productData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        categoryId: formData.category,
        brand: formData.brand,
        model: formData.model,
        condition: formData.condition,
        stock: formData.stock,
        weight: formData.weight,
        dimensions: {
          ...formData.dimensions,
          unit: "cm" as const,
        },
        isFeatured: false,
        isActive: status === "active", // Rascunho = false, Publicado = true
        shippingOptions: formData.shippingOptions,
        deliveryOptions: formData.deliveryOptions.filter(opt => opt.name.trim()), // Apenas opções com nome preenchido
        images: formData.images.map((img, index) => ({
          id: `img-${index}`,
          url: img.url,
          alt: formData.name,
          order: index,
        })),
        specifications: cleanSpecs.map((spec) => ({
          name: spec.key,
          value: spec.value,
        })),
      };

      await createProduct(productData);

      // ✅ CORREÇÃO: Toast de sucesso + navegação APENAS se não falhar
      toast.success(status === "draft" ? "Rascunho salvo com sucesso!" : "Produto publicado com sucesso!");

      // Delay para user ver o toast
      await new Promise((resolve) => setTimeout(resolve, 1000));

      navigate("/seller/products");
    } catch (error: any) {
      // ✅ FIX: Parsear erros detalhados de validação
      logger.error("Error creating product:", error);

      // Se o erro tem array de detalhes (validação Zod do backend)
      if (error?.details && Array.isArray(error.details) && error.details.length > 0) {
        // Mapear erros para campos do formulário
        const fieldErrors: Record<string, string> = {};
        error.details.forEach((detail: any) => {
          const field = detail.field;
          const message = detail.message;

          // Mapear nomes de campos do backend para frontend
          if (field === "name") fieldErrors.name = message;
          if (field === "description") fieldErrors.description = message;
          if (field === "price") fieldErrors.price = message;
          if (field === "stock") fieldErrors.stock = message;
          if (field === "categoryId") fieldErrors.category = message;
          if (field === "images") fieldErrors.images = message;
        });

        setErrors(fieldErrors);

        // Toast com resumo dos campos inválidos
        const invalidFields = error.details.map((d: any) => d.field).join(", ");
        toast.error(`Campos inválidos: ${invalidFields}`);
      } else {
        // Erro genérico (não é validação Zod)
        const errorMessage = error instanceof Error ? error.message : "Erro ao criar produto. Tente novamente.";
        toast.error(errorMessage);
      }

      // ✅ CORREÇÃO: NÃO navegar se falhar
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagesChange = (images: UploadedImage[]) => {
    setFormData({ ...formData, images });
  };

  const handleSpecificationChange = (index: number, field: "key" | "value", value: string) => {
    const newSpecs = [...formData.specifications];
    newSpecs[index][field] = value;
    setFormData({ ...formData, specifications: newSpecs });
  };

  const addSpecificationField = () => {
    setFormData({
      ...formData,
      specifications: [...formData.specifications, { key: "", value: "" }],
    });
  };

  const removeSpecificationField = (index: number) => {
    if (formData.specifications.length > 1) {
      const newSpecs = formData.specifications.filter((_, i) => i !== index);
      setFormData({ ...formData, specifications: newSpecs });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/seller/products">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Adicionar Produto</h1>
            <p className="text-gray-600 mt-1">Preencha as informações do seu produto</p>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Informações Básicas</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Ex: iPhone 13 Pro Max 256GB"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: iPhone 15 Pro, Sofá Retrátil"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Descreva seu produto em detalhes..."
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.category ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">{loadingCategories ? "Carregando..." : "Selecione uma categoria"}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marca *</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.brand ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Ex: Apple, Samsung, Nike"
                />
                {errors.brand && <p className="text-red-500 text-sm mt-1">{errors.brand}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condição</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {conditionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estoque *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.stock ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Quantidade disponível"
                />
                {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estoque mínimo para alerta</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minStock: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.minStock ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Ex: 5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quando o estoque atingir esse valor, exibiremos um aviso de “últimas unidades”.
                </p>
                {errors.minStock && <p className="text-red-500 text-sm mt-1">{errors.minStock}</p>}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Preços</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço de Venda *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={priceInput}
                    onChange={(e) => {
                      // 🔧 FIX: Permite digitação livre, sem reformatar durante digitação
                      const value = e.target.value;
                      setPriceInput(value);
                      const numValue = parseCurrencyInput(value);
                      setFormData({ ...formData, price: numValue });
                    }}
                    onBlur={() => {
                      // Formata apenas ao sair do campo
                      if (formData.price > 0) {
                        setPriceInput(formatCurrencyInput(formData.price));
                      }
                    }}
                    onKeyDown={handleCurrencyKeyDown}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="0,00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Use vírgula para decimais (ex: 200.000,00)</p>
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço Original (opcional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={originalPriceInput}
                    onKeyDown={handleCurrencyKeyDown}
                    onChange={(e) => {
                      // 🔧 FIX: Permite digitação livre, sem reformatar durante digitação
                      const value = e.target.value;
                      setOriginalPriceInput(value);
                      const numValue = parseCurrencyInput(value);
                      setFormData({
                        ...formData,
                        originalPrice: numValue > 0 ? numValue : undefined,
                      });
                    }}
                    onBlur={() => {
                      // Formata apenas ao sair do campo
                      if (formData.originalPrice && formData.originalPrice > 0) {
                        setOriginalPriceInput(formatCurrencyInput(formData.originalPrice));
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Para mostrar desconto (preço riscado)</p>
              </div>
            </div>
          </div>

          {/* Shipping Options */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Opções de Entrega *</h2>
            <p className="text-sm text-gray-600 mb-4">
              Escolha as formas de entrega disponíveis para este produto.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SHIPPING_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 border rounded-lg px-4 py-3 cursor-pointer transition ${
                    formData.shippingOptions.includes(option.value)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={formData.shippingOptions.includes(option.value)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev) => ({
                        ...prev,
                        shippingOptions: checked
                          ? [...prev.shippingOptions, option.value]
                          : prev.shippingOptions.filter((opt) => opt !== option.value),
                      }));
                      if (errors.shippingOptions) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.shippingOptions;
                          return next;
                        });
                      }
                    }}
                  />
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.shippingOptions && (
              <p className="text-red-500 text-sm mt-2">{errors.shippingOptions}</p>
            )}

            {/* Custom Delivery Options */}
            <div className="mt-6 pt-6 border-t">
              <DeliveryOptionsEditor
                value={formData.deliveryOptions}
                onChange={(options) => setFormData({ ...formData, deliveryOptions: options })}
                maxOptions={10}
              />
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Imagens do Produto</h2>

            <ImageUploader
              images={formData.images}
              onImagesChange={handleImagesChange}
              maxImages={5}
              folder="products"
            />

            {errors.images && <p className="text-red-500 text-sm mt-4">{errors.images}</p>}

            <p className="text-sm text-gray-500 mt-4">A primeira imagem será usada como imagem principal do produto.</p>
          </div>

          {/* Specifications */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Especificações Técnicas</h2>

            <div className="space-y-4">
              {formData.specifications.map((spec, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) => handleSpecificationChange(index, "key", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Cor, Tamanho, Material"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => handleSpecificationChange(index, "value", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Azul, G, Algodão"
                    />
                  </div>

                  {formData.specifications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSpecificationField(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addSpecificationField}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Adicionar especificação
              </button>
            </div>
          </div>

          {/* Dimensões do Produto (peso e frete grátis removidos - Sistema WhatsApp-only) */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Dimensões do Produto</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dimensões (cm)</label>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="number"
                    min="0"
                    value={formData.dimensions.length}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, length: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Comprimento"
                  />
                  <input
                    type="number"
                    min="0"
                    value={formData.dimensions.width}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, width: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Largura"
                  />
                  <input
                    type="number"
                    min="0"
                    value={formData.dimensions.height}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, height: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Altura"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <Link to="/seller/products">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </Link>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, "draft")}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : "Salvar como Rascunho"}
            </button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, "active")}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Publicando..." : "Publicar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
