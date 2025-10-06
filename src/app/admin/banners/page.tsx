import { logger } from "@/lib/logger";

"use client";

import { useState, useEffect } from "react";
import { ImageIcon, Plus, Edit, Trash2, Eye, EyeOff, ExternalLink, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildApiUrl } from "@/config/api";

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  position: "HEADER" | "SIDEBAR" | "FOOTER" | "CATEGORY";
  isActive: boolean;
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
  createdAt: string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);

      // Tentar buscar da API real primeiro
      const response = await fetch(buildApiUrl("/api/admin/banners"));

      if (response.ok) {
        const data = await response.json();
        setBanners(data.banners || []);
      } else {
        // Fallback para dados simulados mínimos
        setBanners([
          {
            id: "1",
            title: "Banner Principal",
            description: "Banner de exemplo",
            imageUrl:
              "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20banner%20design&image_size=landscape_16_9",
            targetUrl: "/products",
            position: "HEADER",
            isActive: true,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            clicks: 0,
            impressions: 0,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setError("Erro ao carregar banners");
      logger.error("Erro ao buscar banners:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (bannerId: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/admin/banners/${bannerId}/toggle`), {
        method: "PATCH",
      });

      if (response.ok) {
        setBanners((prev) =>
          prev.map((banner) => (banner.id === bannerId ? { ...banner, isActive: !banner.isActive } : banner))
        );
        toast.success("Status do banner atualizado");
      } else {
        throw new Error("Erro ao atualizar status");
      }
    } catch (err) {
      toast.error("Erro ao atualizar status do banner");
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este banner?")) return;

    try {
      const response = await fetch(buildApiUrl(`/api/admin/banners/${bannerId}`), {
        method: "DELETE",
      });

      if (response.ok) {
        setBanners((prev) => prev.filter((banner) => banner.id !== bannerId));
        toast.success("Banner excluído com sucesso");
      } else {
        throw new Error("Erro ao excluir banner");
      }
    } catch (err) {
      toast.error("Erro ao excluir banner");
    }
  };

  const clearError = () => setError(null);

  const getStatusBadge = (banner: Banner) => {
    const now = new Date();
    const startDate = new Date(banner.startDate);
    const endDate = new Date(banner.endDate);

    if (!banner.isActive) {
      return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">Inativo</span>;
    }

    if (now < startDate) {
      return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Agendado</span>;
    }

    if (now > endDate) {
      return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Expirado</span>;
    }

    return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Ativo</span>;
  };

  const getPositionLabel = (position: string) => {
    const labels = {
      HEADER: "Cabeçalho",
      SIDEBAR: "Barra Lateral",
      FOOTER: "Rodapé",
      CATEGORY: "Categoria",
    };
    return labels[position as keyof typeof labels] || position;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="text-red-800 font-medium">Erro ao carregar banners</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => {
                  clearError();
                  fetchBanners();
                }}
                className="ml-auto bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Carregando banners...</span>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Banners</h1>
            <p className="text-gray-600">Gerencie banners publicitários da plataforma</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Banner
          </button>
        </div>

        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ImageIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total de Banners</p>
                  <p className="text-2xl font-bold text-gray-900">{banners.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Eye className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Banners Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{banners.filter((b) => b.isActive).length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ExternalLink className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total de Cliques</p>
                  <p className="text-2xl font-bold text-gray-900">{banners.reduce((sum, b) => sum + b.clicks, 0)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Agendados</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      banners.filter((b) => {
                        const now = new Date();
                        const startDate = new Date(b.startDate);
                        return b.isActive && now < startDate;
                      }).length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banners Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Banner Image */}
                <div className="aspect-video bg-gray-100 relative">
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2">{getStatusBadge(banner)}</div>
                </div>

                {/* Banner Info */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{banner.title}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {getPositionLabel(banner.position)}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-3">{banner.description}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">Cliques:</span>
                      <span className="font-medium ml-1">{banner.clicks}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Impressões:</span>
                      <span className="font-medium ml-1">{banner.impressions}</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-gray-500 mb-4">
                    <div>Início: {new Date(banner.startDate).toLocaleDateString("pt-BR")}</div>
                    <div>Fim: {new Date(banner.endDate).toLocaleDateString("pt-BR")}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingBanner(banner)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleStatusToggle(banner.id)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-800 p-1 disabled:opacity-50"
                      >
                        {banner.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {banner.isActive && (
                      <div className="text-xs text-green-600 font-medium">
                        CTR: {banner.impressions > 0 ? ((banner.clicks / banner.impressions) * 100).toFixed(2) : 0}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && banners.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum banner encontrado</h3>
            <p className="text-gray-500 mb-4">Comece criando seu primeiro banner publicitário</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Banner
            </button>
          </div>
        )}

        {/* Form Modal Placeholder */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Novo Banner</h2>
              <p className="text-gray-600 mb-4">Formulário de criação de banner será implementado aqui.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
