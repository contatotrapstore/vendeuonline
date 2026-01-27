"use client";

import { useEffect } from "react";
import { useAuthStore, usePermissions } from "@/store/authStore";
import { useAdminStore } from "@/store/adminStore";
import {
  Users,
  Store,
  Package,
  DollarSign,
  Eye,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const { stats, loading, error, fetchDashboardStats, clearError } = useAdminStore();

  // Debug logs removidos para produção

  useEffect(() => {
    // Verificar autenticação e permissões
    if (!user) {
      window.location.href = "/login";
      return;
    }

    // Verificar tipo de usuário (suporta type e userType, case-insensitive)
    const userType = (user.type || user.userType)?.toLowerCase();
    if (userType !== "admin") {
      console.warn("[ADMIN] Access denied - user type:", userType);
      window.location.href = "/";
      return;
    }

    // Carregar estatísticas do dashboard
    fetchDashboardStats();
  }, [user, fetchDashboardStats]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Verificar tipo de usuário (case-insensitive)
  const userType = (user.type || user.userType)?.toLowerCase();
  if (userType !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta área.</p>
          <button onClick={() => (window.location.href = "/")} className="bg-blue-500 text-white px-4 py-2 rounded-lg">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  const handleRefreshStats = () => {
    clearError();
    fetchDashboardStats();
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Mostrar erro se houver
  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-red-800">Erro ao Carregar Dashboard</h3>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleRefreshStats}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Carregando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Administrador
                </div>
              </div>
              <p className="text-gray-600">Bem-vindo, {user.name} • Controle total da plataforma</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefreshStats}
                disabled={loading}
                className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
              </button>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Eye className="h-4 w-4" />
                <span>{stats?.activeUsers || 0} usuários online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-red-800 font-medium">Erro ao carregar dados</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={handleRefreshStats}
                className="ml-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers?.toLocaleString() || "0"}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.buyersCount || 0} compradores, {stats?.sellersCount || 0} vendedores
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Store className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lojas</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalStores || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.activeStores || 0} ativas, {stats?.pendingStores || 0} pendentes
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Produtos</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalProducts?.toLocaleString() || "0"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {stats?.monthlyRevenue?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Métricas Principais</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-900">Assinaturas</h4>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-blue-600">{stats?.activeSubscriptions || 0}</p>
                  <p className="text-sm text-blue-700">de {stats?.totalSubscriptions || 0} total</p>
                </div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h4 className="text-lg font-semibold text-green-900">Taxa de Conversão</h4>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-green-600">{stats?.conversionRate || 0}%</p>
                  <p className="text-sm text-green-700">vendedores ativos</p>
                </div>
              </div>

              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <h4 className="text-lg font-semibold text-yellow-900">Pedidos</h4>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-yellow-600">{stats?.totalOrders || 0}</p>
                  <p className="text-sm text-yellow-700">este mês</p>
                </div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h4 className="text-lg font-semibold text-purple-900">Aprovações</h4>
                <div className="mt-2">
                  <p className="text-2xl font-bold text-purple-600">{stats?.pendingApprovals || 0}</p>
                  <p className="text-sm text-purple-700">pendentes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Distribution */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Distribuição de Usuários</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-900">{stats?.buyersCount || 0}</p>
                    <p className="text-sm text-blue-600">Compradores</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <Store className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-900">{stats?.sellersCount || 0}</p>
                    <p className="text-sm text-green-600">Vendedores</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-900">{stats?.adminsCount || 0}</p>
                    <p className="text-sm text-purple-600">Administradores</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
