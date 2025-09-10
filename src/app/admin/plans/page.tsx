"use client";

import { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Package,
  Star,
  Shield,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billingPeriod: string;
  maxAds: number;
  maxPhotos: number;
  maxProducts: number;
  maxImages: number;
  maxCategories: number;
  prioritySupport: boolean;
  support: string;
  features: string[];
  isActive: boolean;
  order: number;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch("/api/admin/plans", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar planos");
      }

      const data = await response.json();
      console.log("Plans data received:", data);

      // Garantir que features seja sempre array
      const processedPlans = (data.data || []).map((plan: any) => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || "[]"),
      }));

      setPlans(processedPlans);
    } catch (error: any) {
      setError(error.message);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = (planId: string, field: string, value: any) => {
    setPlans((prev) => prev.map((plan) => (plan.id === planId ? { ...plan, [field]: value } : plan)));
  };

  const updateFeature = (planId: string, index: number, value: string) => {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              features: plan.features.map((feature, i) => (i === index ? value : feature)),
            }
          : plan
      )
    );
  };

  const addFeature = (planId: string) => {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              features: [...plan.features, "Nova funcionalidade"],
            }
          : plan
      )
    );
  };

  const removeFeature = (planId: string, index: number) => {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              features: plan.features.filter((_, i) => i !== index),
            }
          : plan
      )
    );
  };

  const savePlan = async (plan: Plan) => {
    try {
      setSaving(true);

      const token = localStorage.getItem("auth-token");
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: plan.name,
          description: plan.description,
          price: Number(plan.price),
          billingPeriod: plan.billingPeriod,
          maxAds: Number(plan.maxAds),
          maxPhotos: Number(plan.maxPhotos),
          maxProducts: Number(plan.maxProducts),
          maxImages: Number(plan.maxImages),
          maxCategories: Number(plan.maxCategories),
          prioritySupport: plan.prioritySupport,
          support: plan.support,
          features: plan.features.filter((f) => f.trim() !== ""),
          isActive: plan.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar plano");
      }

      toast.success(`Plano ${plan.name} salvo com sucesso!`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAllPlans = async () => {
    try {
      setSaving(true);

      for (const plan of plans) {
        await savePlan(plan);
        // Pequena pausa entre as salvadas
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      toast.success("Todos os planos foram salvos com sucesso!");
      await fetchPlans(); // Recarregar para garantir dados atualizados
    } catch (error: any) {
      toast.error("Erro ao salvar alguns planos");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-lg text-gray-600">Carregando planos...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuração de Planos</h1>
              <p className="text-gray-600">Configure preços, limites e funcionalidades dos planos de assinatura</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={fetchPlans}
                disabled={loading || saving}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
              </button>

              <button
                onClick={saveAllPlans}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{saving ? "Salvando..." : "Salvar Todos"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-red-800 font-medium">Erro ao carregar planos</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button onClick={fetchPlans} className="ml-auto text-red-600 hover:text-red-800">
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Plans Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Plan Header */}
              <div
                className={`p-6 border-b ${plan.name.toLowerCase() === "empresa plus" ? "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200" : "bg-gray-50"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-6 w-6 text-blue-600" />
                    <div>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => updatePlan(plan.id, "name", e.target.value)}
                        className="text-xl font-bold bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
                      />
                      <p className="text-sm text-gray-500">Plano de assinatura</p>
                    </div>
                  </div>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={plan.isActive}
                      onChange={(e) => updatePlan(plan.id, "isActive", e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Ativo</span>
                  </label>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        value={plan.price}
                        onChange={(e) => updatePlan(plan.id, "price", e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Período de Cobrança</label>
                    <select
                      value={plan.billingPeriod}
                      onChange={(e) => updatePlan(plan.id, "billingPeriod", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <textarea
                    value={plan.description}
                    onChange={(e) => updatePlan(plan.id, "description", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Anúncios</label>
                    <input
                      type="number"
                      value={plan.maxAds === -1 ? "" : plan.maxAds}
                      onChange={(e) =>
                        updatePlan(plan.id, "maxAds", e.target.value === "" ? -1 : Number(e.target.value))
                      }
                      placeholder="Ilimitado"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Produtos</label>
                    <input
                      type="number"
                      value={plan.maxProducts === -1 ? "" : plan.maxProducts}
                      onChange={(e) =>
                        updatePlan(plan.id, "maxProducts", e.target.value === "" ? -1 : Number(e.target.value))
                      }
                      placeholder="Ilimitado"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Fotos</label>
                    <input
                      type="number"
                      value={plan.maxPhotos === -1 ? "" : plan.maxPhotos}
                      onChange={(e) =>
                        updatePlan(plan.id, "maxPhotos", e.target.value === "" ? -1 : Number(e.target.value))
                      }
                      placeholder="Ilimitado"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Support */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Suporte</label>
                    <select
                      value={plan.support}
                      onChange={(e) => updatePlan(plan.id, "support", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Nenhum">Nenhum</option>
                      <option value="Email">Email</option>
                      <option value="Chat">Chat</option>
                      <option value="Telefone">Telefone</option>
                      <option value="24/7">24/7 Premium</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={plan.prioritySupport}
                        onChange={(e) => updatePlan(plan.id, "prioritySupport", e.target.checked)}
                        className="rounded"
                      />
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Suporte Prioritário</span>
                    </label>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Funcionalidades</label>
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateFeature(plan.id, index, e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => removeFeature(plan.id, index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addFeature(plan.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Adicionar funcionalidade
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t">
                  <button
                    onClick={() => savePlan(plan)}
                    disabled={saving}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{saving ? "Salvando..." : "Salvar Plano"}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-medium text-gray-900">Configurações Salvas</h3>
                <p className="text-sm text-gray-500">As alterações afetam imediatamente novas assinaturas</p>
              </div>
            </div>

            <button
              onClick={saveAllPlans}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              <span>{saving ? "Salvando Todos..." : "Salvar Todas as Alterações"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
