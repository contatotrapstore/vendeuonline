'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  User, 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useSubscriptionStore, Subscription } from '@/store/subscriptionStore';
import { usePlanStore } from '@/store/planStore';

export default function AdminSubscriptionsPage() {
  const {
    subscriptions,
    loading,
    error,
    filters,
    pagination,
    fetchSubscriptions,
    updateSubscriptionStatus,
    cancelSubscription,
    renewSubscription,
    setFilters,
    clearError
  } = useSubscriptionStore();
  
  const { plans, fetchPlans } = usePlanStore();

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, [fetchSubscriptions, fetchPlans]);

  const handleStatusChange = async (subscriptionId: string, newStatus: Subscription['status']) => {
    try {
      await updateSubscriptionStatus(subscriptionId, newStatus);
      toast.success('Status da assinatura atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    if (confirm('Tem certeza que deseja cancelar esta assinatura?')) {
      try {
        await cancelSubscription(subscriptionId);
        toast.success('Assinatura cancelada');
      } catch (error) {
        toast.error('Erro ao cancelar assinatura');
      }
    }
  };

  const handleRenew = async (subscriptionId: string) => {
    try {
      await renewSubscription(subscriptionId);
      toast.success('Assinatura renovada');
    } catch (error) {
      toast.error('Erro ao renovar assinatura');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
      PENDING: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      ACTIVE: 'Ativa',
      CANCELLED: 'Cancelada',
      EXPIRED: 'Expirada',
      PENDING: 'Pendente'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      PAID: 'Pago',
      PENDING: 'Pendente',
      FAILED: 'Falhou'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchSubscriptions(page);
    }
  };

  // Calcular estatísticas
  const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const activeCount = subscriptions.filter(sub => sub.status === 'ACTIVE').length;
  const expiredCount = subscriptions.filter(sub => sub.status === 'EXPIRED').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Assinaturas</h1>
              <p className="text-gray-600">Gerencie todas as assinaturas da plataforma</p>
            </div>
            <button
              onClick={() => {
                clearError();
                fetchSubscriptions();
              }}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Assinaturas</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.totalCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Assinaturas Ativas</p>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Expiradas</p>
                <p className="text-2xl font-bold text-gray-900">{expiredCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-red-800 font-medium">Erro ao carregar assinaturas</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => {
                  clearError();
                  fetchSubscriptions();
                }}
                className="ml-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="ACTIVE">Ativa</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="EXPIRED">Expirada</option>
              <option value="PENDING">Pendente</option>
            </select>

            {/* Plan Filter */}
            <select
              value={filters.planId}
              onChange={(e) => setFilters({ planId: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Planos</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>

            {/* Payment Status Filter */}
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ paymentStatus: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Status do Pagamento</option>
              <option value="PAID">Pago</option>
              <option value="PENDING">Pendente</option>
              <option value="FAILED">Falhou</option>
            </select>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center space-x-3">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="text-gray-600">Carregando assinaturas...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">Nenhuma assinatura encontrada</p>
                        <p className="text-sm">Tente ajustar os filtros de busca</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {subscription.user?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {subscription.user?.email || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {subscription.plan?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        R$ {subscription.plan?.price?.toFixed(2) || '0,00'} / {subscription.plan?.billingPeriod === 'MONTHLY' ? 'mês' : 'ano'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(subscription.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(subscription.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {subscription.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>Início: {new Date(subscription.startDate).toLocaleDateString('pt-BR')}</div>
                        <div>Fim: {new Date(subscription.endDate).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {subscription.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCancel(subscription.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {subscription.status === 'EXPIRED' && (
                          <button
                            onClick={() => handleRenew(subscription.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Renovar"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <select
                          value={subscription.status}
                          onChange={(e) => handleStatusChange(subscription.id, e.target.value as Subscription['status'])}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="ACTIVE">Ativa</option>
                          <option value="CANCELLED">Cancelada</option>
                          <option value="EXPIRED">Expirada</option>
                          <option value="PENDING">Pendente</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && subscriptions.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Próximo
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">
                      {((pagination.currentPage - 1) * pagination.pageSize) + 1}
                    </span>{' '}
                    até{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{pagination.totalCount}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage >= pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}