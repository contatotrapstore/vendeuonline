'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Package, 
  Store, 
  User, 
  Eye, 
  Edit, 
  Trash2, 
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Ban,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { buildApiUrl, getHeaders } from '@/config/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categoryId: string;
  isActive: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  approvedAt?: string;
  stock: number;
  createdAt: string;
  store: {
    id: string;
    name: string;
  };
  seller: {
    user: {
      name: string;
      email: string;
    };
  };
}

interface ProductFilters {
  search: string;
  status: string;
  category: string;
  storeId: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    status: 'all',
    category: 'all',
    storeId: 'all'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 20
  });

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const authHeaders = getHeaders();
      if (!authHeaders.Authorization) {
        throw new Error('Token não encontrado');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      // Adicionar filtros se especificados
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.storeId !== 'all') params.append('storeId', filters.storeId);

      const response = await fetch(buildApiUrl(`/api/admin/products?${params.toString()}`), {
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar produtos');
      }

      const data = await response.json();
      setProducts(data.data || []);
      setPagination({
        currentPage: data.pagination?.page || 1,
        totalPages: data.pagination?.totalPages || 1,
        totalCount: data.pagination?.total || 0,
        pageSize: data.pagination?.limit || 20
      });
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      setError(error.message || 'Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleStatusChange = async (productId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const authHeaders = getHeaders();
      if (!authHeaders.Authorization) throw new Error('Token não encontrado');

      const response = await fetch(buildApiUrl(`/api/admin/products/${productId}/status`), {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      // Atualizar localmente (converter para isActive)
      const isActive = newStatus.toLowerCase() === 'active';
      setProducts(prev => prev.map(product => 
        product.id === productId ? { ...product, isActive } : product
      ));
      
      toast.success('Status atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleApprovalChange = async (productId: string, approvalStatus: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('Token não encontrado');

      const response = await fetch(`/api/admin/products/${productId}/approval`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approvalStatus, rejectionReason })
      });

      if (!response.ok) throw new Error('Erro ao atualizar aprovação');

      // Atualizar localmente
      setProducts(prev => prev.map(product => 
        product.id === productId ? { 
          ...product, 
          approvalStatus,
          rejectionReason: approvalStatus === 'REJECTED' ? rejectionReason : undefined,
          approvedAt: approvalStatus === 'APPROVED' ? new Date().toISOString() : undefined
        } : product
      ));
      
      toast.success(`Produto ${approvalStatus === 'APPROVED' ? 'aprovado' : 'rejeitado'} com sucesso`);
    } catch (error) {
      toast.error('Erro ao atualizar aprovação');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) throw new Error('Token não encontrado');

        const response = await fetch(`/api/admin/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Erro ao excluir produto');

        // Remover localmente
        setProducts(prev => prev.filter(product => product.id !== productId));
        toast.success('Produto excluído com sucesso');
      } catch (error) {
        toast.error('Erro ao excluir produto');
      }
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    const styles = {
      true: 'bg-green-100 text-green-800',
      false: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      true: 'Ativo',
      false: 'Inativo'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[String(isActive) as keyof typeof styles]}`}>
        {labels[String(isActive) as keyof typeof labels]}
      </span>
    );
  };

  const getApprovalBadge = (approvalStatus: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      PENDING: 'Pendente',
      APPROVED: 'Aprovado',
      REJECTED: 'Rejeitado'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[approvalStatus as keyof typeof styles]}`}>
        {labels[approvalStatus as keyof typeof labels]}
      </span>
    );
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchProducts(page);
    }
  };

  const handleFilterChange = (newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    fetchProducts(1);
  };

  // Calcular estatísticas
  const activeCount = products.filter(p => p.isActive === true).length;
  const pendingApprovalCount = products.filter(p => p.approvalStatus === 'PENDING').length;
  const approvedCount = products.filter(p => p.approvalStatus === 'APPROVED').length;
  const rejectedCount = products.filter(p => p.approvalStatus === 'REJECTED').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Produtos</h1>
              <p className="text-gray-600">Gerencie todos os produtos da plataforma</p>
            </div>
            <button
              onClick={() => fetchProducts()}
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
                <p className="text-sm font-medium text-gray-500">Total de Produtos</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.totalCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendente Aprovação</p>
                <p className="text-2xl font-bold text-gray-900">{pendingApprovalCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aprovados</p>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rejeitados</p>
                <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
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
                <h3 className="text-red-800 font-medium">Erro ao carregar produtos</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  fetchProducts();
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
                placeholder="Buscar produtos..."
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ status: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendente Aprovação</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Rejeitados</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange({ category: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as Categorias</option>
              <option value="electronics">Eletrônicos</option>
              <option value="fashion">Moda</option>
              <option value="home">Casa e Jardim</option>
              <option value="sports">Esportes</option>
              <option value="books">Livros</option>
              <option value="automotive">Automotivo</option>
            </select>

            {/* Store Filter */}
            <select
              value={filters.storeId}
              onChange={(e) => handleFilterChange({ storeId: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as Lojas</option>
              {/* Adicionar opções de lojas dinamicamente */}
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aprovação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center space-x-3">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="text-gray-600">Carregando produtos...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">Nenhum produto encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros de busca</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {product.images && product.images[0] ? (
                            <img className="h-10 w-10 rounded-lg object-cover" src={product.images[0]} alt={product.name} />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{product.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{product.categoryId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.store.name}</div>
                      <div className="text-sm text-gray-500">{product.seller.user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                        R$ {product.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(product.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {getApprovalBadge(product.approvalStatus)}
                        {product.approvalStatus === 'PENDING' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleApprovalChange(product.id, 'APPROVED')}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                              title="Aprovar produto"
                            >
                              ✓ Aprovar
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Motivo da rejeição (opcional):');
                                handleApprovalChange(product.id, 'REJECTED', reason || undefined);
                              }}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                              title="Rejeitar produto"
                            >
                              ✗ Rejeitar
                            </button>
                          </div>
                        )}
                        {product.rejectionReason && (
                          <div className="text-xs text-red-600" title={product.rejectionReason}>
                            {product.rejectionReason.length > 20 ? product.rejectionReason.substring(0, 20) + '...' : product.rejectionReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={product.stock <= 0 ? 'text-red-600 font-medium' : ''}>
                        {product.stock} unidades
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <select
                          value={product.isActive ? 'active' : 'inactive'}
                          onChange={(e) => handleStatusChange(product.id, e.target.value as any)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </select>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination (similar to stores page) */}
          {!loading && products.length > 0 && (
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