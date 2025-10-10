"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { Product } from "@/types";
import { Link } from "react-router-dom";
import { apiRequest } from "@/lib/api-client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import ImageUploader, { UploadedImage } from "@/components/ui/ImageUploader";

interface ProductForm {
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  category: string;
  stock: number;
  images: UploadedImage[];
  specifications: { key: string; value: string }[];
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: "cm" | "m";
  };
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchProductById, updateProduct } = useProductStore();
  const { user, token } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ProductForm>({
    name: "",
    description: "",
    price: 0,
    comparePrice: undefined,
    category: "",
    stock: 0,
    images: [],
    specifications: [],
    weight: 0,
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      unit: "cm",
    },
    isActive: true,
  });

  useEffect(() => {
    // Verificar autenticação
    if (!user || user.userType !== "seller") {
      navigate("/login");
      return;
    }

    loadProduct();
    loadCategories();
  }, [id, user, navigate]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await fetchProductById(id as string);

      if (!data) {
        toast.error("Produto não encontrado");
        navigate("/seller/products");
        return;
      }

      setProduct(data);

      // Pré-preencher formulário com dados do produto
      setFormData({
        name: data.name || "",
        description: data.description || "",
        price: data.price || 0,
        comparePrice: data.comparePrice || undefined,
        category: typeof data.category === "string" ? data.category : data.category?.id || "",
        stock: data.stock || 0,
        images: data.images?.map((img: any) => ({
          publicId: img.id,
          url: img.url,
          alt: img.alt || data.name,
          isMain: img.isMain || false,
          order: img.order || 0,
          width: 800,
          height: 600,
          format: "jpg",
          size: 0,
        })) || [],
        specifications: data.specifications?.map((spec: any) => ({
          key: spec.name,
          value: spec.value,
        })) || [],
        weight: data.weight || 0,
        dimensions: data.dimensions || {
          length: 0,
          width: 0,
          height: 0,
          unit: "cm",
        },
        isActive: data.isActive !== undefined ? data.isActive : true,
      });
    } catch (error) {
      logger.error("Erro ao carregar produto:", error);
      toast.error("Erro ao carregar produto");
      navigate("/seller/products");
    } finally {
      setLoading(false);
    }
  };

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

  const validateForm = (): boolean => {
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

    if (formData.stock < 0) {
      newErrors.stock = "Estoque não pode ser negativo";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDimensionChange = (dimension: "length" | "width" | "height", value: string) => {
    setFormData((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: parseFloat(value) || 0,
      },
    }));
  };

  const handleSpecificationChange = (index: number, field: "key" | "value", value: string) => {
    setFormData((prev) => {
      const newSpecs = [...prev.specifications];
      newSpecs[index] = { ...newSpecs[index], [field]: value };
      return { ...prev, specifications: newSpecs };
    });
  };

  const addSpecification = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key: "", value: "" }],
    }));
  };

  const removeSpecification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  const handleImagesChange = (images: UploadedImage[]) => {
    setFormData((prev) => ({ ...prev, images }));
    if (errors.images) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.images;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setIsSubmitting(true);

      // Preparar dados para envio
      const updates = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        comparePrice: formData.comparePrice,
        categoryId: formData.category,
        stock: formData.stock,
        weight: formData.weight,
        dimensions: formData.dimensions,
        isActive: formData.isActive,
        images: formData.images.map((img, idx) => ({
          id: img.publicId,
          url: img.url,
          alt: formData.name,
          isMain: idx === 0,
          order: idx,
        })),
        specifications: formData.specifications
          .filter((spec) => spec.key && spec.value)
          .map((spec) => ({
            name: spec.key,
            value: spec.value,
          })),
      };

      await updateProduct(id as string, updates);

      toast.success("Produto atualizado com sucesso!");
      navigate("/seller/products");
    } catch (error) {
      logger.error("Erro ao atualizar produto:", error);
      toast.error("Erro ao atualizar produto. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando produto...</p>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
            Produto Não Encontrado
          </h1>
          <p className="text-gray-600 text-center mb-6">
            O produto que você está tentando editar não foi encontrado.
          </p>
          <Link to="/seller/products">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Voltar para Produtos
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/seller/products">
            <button className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Voltar
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Editar Produto</h1>
          <p className="text-gray-600 mt-2">Atualize as informações do seu produto</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Informações Básicas</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: iPhone 13 Pro Max 256GB"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Descreva seu produto em detalhes..."
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.category ? "border-red-500" : "border-gray-300"
                    }`}
                    disabled={loadingCategories}
                  >
                    <option value="">{loadingCategories ? "Carregando..." : "Selecione uma categoria"}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estoque *
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="Quantidade disponível"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.stock ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Preços</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço de Venda *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                </div>
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço Original (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    name="comparePrice"
                    value={formData.comparePrice || ""}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Para mostrar desconto (preço riscado)</p>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Imagens do Produto</h2>
            <ImageUploader
              maxImages={5}
              images={formData.images}
              onImagesChange={handleImagesChange}
            />
            {errors.images && <p className="text-red-500 text-sm mt-2">{errors.images}</p>}
            <p className="text-xs text-gray-500 mt-2">
              A primeira imagem será usada como imagem principal do produto.
            </p>
          </div>

          {/* Specifications */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Especificações Técnicas</h2>

            <div className="space-y-3">
              {formData.specifications.map((spec, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => handleSpecificationChange(index, "key", e.target.value)}
                    placeholder="Ex: Cor, Tamanho, Material"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => handleSpecificationChange(index, "value", e.target.value)}
                    placeholder="Ex: Azul, G, Algodão"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecification(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSpecification}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              + Adicionar especificação
            </button>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Informações de Envio</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensões (cm)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    value={formData.dimensions.length}
                    onChange={(e) => handleDimensionChange("length", e.target.value)}
                    min="0"
                    step="0.1"
                    placeholder="Comprimento"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={formData.dimensions.width}
                    onChange={(e) => handleDimensionChange("width", e.target.value)}
                    min="0"
                    step="0.1"
                    placeholder="Largura"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={formData.dimensions.height}
                    onChange={(e) => handleDimensionChange("height", e.target.value)}
                    min="0"
                    step="0.1"
                    placeholder="Altura"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Status do Produto</h2>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Produto ativo (visível na loja)</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/seller/products" className="flex-1">
              <button
                type="button"
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
