"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Loader2, RefreshCw, Tag } from "lucide-react";
import { buildApiUrl, getHeaders } from "@/config/api";
import { useAuthStore } from "@/store/authStore";
import { logger } from "@/lib/logger";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  isActive: boolean;
  order?: number;
  productCount?: number;
}

const initialForm = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  order: 0,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function AdminCategoriesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isAdmin = user?.userType === "admin";

  useEffect(() => {
    if (!user) return;

    if (!isAdmin) {
      toast.error("Apenas administradores podem gerenciar categorias.");
      navigate("/");
      return;
    }

    fetchCategories();
  }, [user, isAdmin, navigate]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl("/api/categories"), {
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível carregar as categorias");
      }

      setCategories(data.data || data.categories || []);
    } catch (error) {
      logger.error("Erro ao carregar categorias:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "order" ? Number(value) || 0 : value }));

    if (name === "name" && !form.slug) {
      setForm((prev) => ({
        ...prev,
        name: value,
        slug: slugify(value),
      }));
    }

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Nome é obrigatório";
    }

    if (!form.slug.trim()) {
      nextErrors.slug = "Slug é obrigatório";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const response = await fetch(buildApiUrl("/api/categories"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          slug: slugify(form.slug),
          description: form.description?.trim() || null,
          parentId: form.parentId || null,
          order: form.order || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar categoria");
      }

      toast.success("Categoria criada com sucesso!");
      setForm(initialForm);
      fetchCategories();
    } catch (error) {
      logger.error("Erro ao criar categoria:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar categoria");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCategories = useMemo(() => categories.filter((category) => category.isActive), [categories]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Verificando permissões...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="h-6 w-6 text-blue-600" />
              Categorias
            </h1>
            <p className="text-gray-600">Gerencie as categorias exibidas no marketplace</p>
          </div>
          <button
            onClick={fetchCategories}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova Categoria</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  className={`mt-1 w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Ex: Eletrônicos"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Slug *</label>
                <input
                  type="text"
                  name="slug"
                  value={form.slug}
                  onChange={handleInputChange}
                  className={`mt-1 w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 ${
                    errors.slug ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="eletronicos"
                />
                {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Descrição</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Detalhes que ajudam o comprador a entender esta categoria"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Categoria pai</label>
                <select
                  name="parentId"
                  value={form.parentId}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhuma (categoria raiz)</option>
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Ordem de exibição</label>
                <input
                  type="number"
                  name="order"
                  value={form.order}
                  onChange={handleInputChange}
                  min={0}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar categoria
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Categorias cadastradas</h2>
            <span className="text-sm text-gray-500">{categories.length} itens</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma categoria cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Nome
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Slug
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Ordem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{category.name}</div>
                        {category.description && (
                          <p className="text-sm text-gray-500 line-clamp-1">{category.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{category.slug}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            category.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {category.isActive ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{category.order ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
