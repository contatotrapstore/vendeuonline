"use client";
import React, { useState, useEffect } from "react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billing_period: string;
  max_ads: number;
  max_photos: number;
  max_products: number;
  max_images: number;
  max_categories: number;
  priority_support: boolean;
  support: string;
  features: string[];
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

const AdminPricing = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/plans");
      if (!response.ok) {
        throw new Error("Erro ao carregar planos");
      }
      const data = await response.json();
      setPlans(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleSave = async (planData: Partial<Plan>) => {
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : "/api/admin/plans";

      const method = editingPlan ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar plano");
      }

      await fetchPlans();
      setShowForm(false);
      setEditingPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const handleToggleActive = async (planId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status do plano");
      }

      await fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const formatLimit = (value: number) => {
    return value === -1 ? "Ilimitado" : value.toString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Gerenciar Planos</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Gerenciar Planos</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">❌ {error}</p>
          <button onClick={fetchPlans} className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciar Planos</h1>
        <button
          onClick={() => {
            setEditingPlan(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Novo Plano
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total de Planos</div>
          <div className="text-2xl font-bold text-blue-600">{plans.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Planos Ativos</div>
          <div className="text-2xl font-bold text-green-600">{plans.filter((p) => p.is_active).length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Plano Mais Caro</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatPrice(Math.max(...plans.map((p) => p.price)))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Planos Gratuitos</div>
          <div className="text-2xl font-bold text-gray-600">{plans.filter((p) => p.price === 0).length}</div>
        </div>
      </div>

      {/* Plans List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Lista de Planos</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Limites
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suporte
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                        <div className="text-sm text-gray-500">{plan.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatPrice(plan.price)}</div>
                    <div className="text-sm text-gray-500">
                      {plan.billing_period === "monthly" ? "Mensal" : "Anual"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Produtos: {formatLimit(plan.max_products)}</div>
                    <div>Anúncios: {formatLimit(plan.max_ads)}/mês</div>
                    <div>Fotos: {formatLimit(plan.max_photos)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{plan.support}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(plan.id, plan.is_active)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        plan.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {plan.is_active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEdit(plan)} className="text-blue-600 hover:text-blue-900 mr-4">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Form Modal */}
      {showForm && (
        <PlanForm
          plan={editingPlan}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingPlan(null);
          }}
        />
      )}
    </div>
  );
};

// Plan Form Component
interface PlanFormProps {
  plan: Plan | null;
  onSave: (planData: Partial<Plan>) => void;
  onCancel: () => void;
}

const PlanForm: React.FC<PlanFormProps> = ({ plan, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: plan?.name || "",
    description: plan?.description || "",
    price: plan?.price || 0,
    billing_period: plan?.billing_period || "monthly",
    max_ads: plan?.max_ads || 0,
    max_photos: plan?.max_photos || 0,
    max_products: plan?.max_products || 0,
    support: plan?.support || "",
    is_active: plan?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{plan ? "Editar Plano" : "Novo Plano"}</h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <select
                value={formData.billing_period}
                onChange={(e) => setFormData({ ...formData, billing_period: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Produtos</label>
              <input
                type="number"
                value={formData.max_products}
                onChange={(e) => setFormData({ ...formData, max_products: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="-1 = ilimitado"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Anúncios</label>
              <input
                type="number"
                value={formData.max_ads}
                onChange={(e) => setFormData({ ...formData, max_ads: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="-1 = ilimitado"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Fotos</label>
              <input
                type="number"
                value={formData.max_photos}
                onChange={(e) => setFormData({ ...formData, max_photos: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="-1 = ilimitado"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Suporte</label>
            <input
              type="text"
              value={formData.support}
              onChange={(e) => setFormData({ ...formData, support: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Ex: Email + Chat"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Plano ativo
            </label>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {plan ? "Atualizar" : "Criar"} Plano
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPricing;
