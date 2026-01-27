"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  Search,
  Filter,
  Store,
  User,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Ban,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { useStoreManagementStore, StoreInfo } from "@/store/storeManagementStore";

export default function AdminStoresPage() {
  const {
    stores,
    loading,
    error,
    filters,
    pagination,
    fetchStores,
    approveStore,
    rejectStore,
    suspendStore,
    activateStore,
    setFilters,
    clearError,
  } = useStoreManagementStore();

  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleApprove = async (storeId: string) => {
    if (confirm("Tem certeza que deseja aprovar esta loja?")) {
      try {
        await approveStore(storeId);
        toast.success("Loja aprovada com sucesso");
      } catch (error) {
        toast.error("Erro ao aprovar loja");
      }
    }
  };

  const handleReject = async (storeId: string) => {
    const reason = prompt("Motivo da rejeição (opcional):");
    if (reason !== null) {
      // Usuário não cancelou
      try {
        await rejectStore(storeId, reason || undefined);
        toast.success("Loja rejeitada");
      } catch (error) {
        toast.error("Erro ao rejeitar loja");
      }
    }
  };

  const handleSuspend = async (storeId: string) => {
    const reason = prompt("Motivo da suspensão:");
    if (reason) {
      try {
        await suspendStore(storeId, reason);
        toast.success("Loja suspensa");
      } catch (error) {
        toast.error("Erro ao suspender loja");
      }
    }
  };

  const handleActivate = async (storeId: string) => {
    if (confirm("Tem certeza que deseja ativar esta loja?")) {
      try {
        await activateStore(storeId);
        toast.success("Loja ativada");
      } catch (error) {
        toast.error("Erro ao ativar loja");
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      SUSPENDED: "bg-red-100 text-red-800",
      REJECTED: "bg-gray-100 text-gray-800",
    };

    const labels = {
      ACTIVE: "Ativa",
      PENDING: "Pendente",
      SUSPENDED: "Suspensa",
      REJECTED: "Rejeitada",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchStores(page);
    }
  };

  // Calcular estatísticas (dos stores filtrados na tela, não do total)
  const activeCount = stores.filter((store) => store.status === "ACTIVE").length;
  const pendingCount = stores.filter((store) => store.status === "PENDING").length;
  const suspendedCount = stores.filter((store) => store.status === "SUSPENDED").length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Lojas</h1>
              <p className="text-gray-600">Gerencie aprovações e status das lojas</p>
            </div>
            <button
              onClick={() => {
                clearError();
                fetchStores();
              }}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Lojas</p>
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
                <p className="text-sm font-medium text-gray-500">Ativas</p>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Suspensas</p>
                <p className="text-2xl font-bold text-gray-900">{suspendedCount}</p>
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
                <h3 className="text-red-800 font-medium">Erro ao carregar lojas</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => {
                  clearError();
                  fetchStores();
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome da loja..."
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
              <option value="PENDING">Pendente</option>
              <option value="SUSPENDED">Suspensa</option>
              <option value="REJECTED">Rejeitada</option>
            </select>

            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => setFilters({ category: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as Categorias</option>
              <option value="electronics">Eletrônicos</option>
              <option value="fashion">Moda</option>
              <option value="home">Casa e Jardim</option>
              <option value="sports">Esportes</option>
            </select>
          </div>
        </div>

        {/* Stores Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proprietário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produtos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criada em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center space-x-3">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="text-gray-600">Carregando lojas...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && stores.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Store className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">Nenhuma loja encontrada</p>
                        <p className="text-sm">Tente ajustar os filtros de busca</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  stores.map((store) => (
                    <tr key={store.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {store.logo ? (
                              <img className="h-10 w-10 rounded-lg object-cover" src={store.logo} alt={store.name} />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <Store className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{store.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {store.description || "Sem descrição"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{store.user?.name || "N/A"}</div>
                        <div className="text-sm text-gray-500">{store.user?.email || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(store.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-gray-400 mr-1" />
                          {store._count?.products || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(store.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {store.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleApprove(store.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Aprovar"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleReject(store.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Rejeitar"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {store.status === "ACTIVE" && (
                            <button
                              onClick={() => handleSuspend(store.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Suspender"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          {store.status === "SUSPENDED" && (
                            <button
                              onClick={() => handleActivate(store.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Ativar"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedStore(store);
                              setShowDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && stores.length > 0 && (
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
                    Mostrando{" "}
                    <span className="font-medium">{(pagination.currentPage - 1) * pagination.pageSize + 1}</span> até{" "}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)}
                    </span>{" "}
                    de <span className="font-medium">{pagination.totalCount}</span> resultados
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
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
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

        {/* Modal de Detalhes da Loja */}
        {showDetailsModal && selectedStore && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Detalhes da Loja</h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Logo */}
                  {selectedStore.logo && (
                    <div className="flex justify-center mb-4">
                      <img
                        src={selectedStore.logo}
                        alt={selectedStore.name}
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    </div>
                  )}

                  {/* Informações Básicas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Nome da Loja</p>
                      <p className="font-medium">{selectedStore.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedStore.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Proprietário</p>
                      <p className="font-medium">{selectedStore.user?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-sm">{selectedStore.user?.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Produtos</p>
                      <p className="font-medium">{selectedStore._count?.products || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Data de Criação</p>
                      <p className="font-medium">
                        {new Date(selectedStore.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {/* Descrição */}
                  {selectedStore.description && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Descrição</p>
                      <p className="text-gray-700">{selectedStore.description}</p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Fechar
                    </button>
                    {selectedStore.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => {
                            handleApprove(selectedStore.id);
                            setShowDetailsModal(false);
                          }}
                          className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => {
                            handleReject(selectedStore.id);
                            setShowDetailsModal(false);
                          }}
                          className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
