"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  UserPlus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  Store,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useUserStore, type User as UserType } from "@/store/userStore";
import UserFormModal from "@/components/admin/UserFormModal";
import { useModal } from "@/components/ui/Modal";

export default function AdminUsersPage() {
  const { users, loading, error, filters, fetchUsers, createUser, updateUser, updateUserStatus, deleteUser, setFilters, clearError } =
    useUserStore();

  const createModal = useModal();
  const editModal = useModal();
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  // Carregar usuários ao montar o componente
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "all" || user.status === filters.status;
    const matchesType = filters.userType === "all" || user.userType === filters.userType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleStatusChange = async (userId: string, newStatus: "active" | "inactive") => {
    try {
      await updateUserStatus(userId, newStatus);
      toast.success(`Status do usuário atualizado para ${newStatus === "active" ? "ativo" : "inativo"}`);
    } catch (error) {
      toast.error("Erro ao atualizar status do usuário");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        await deleteUser(userId);
        toast.success("Usuário excluído com sucesso");
      } catch (error) {
        toast.error("Erro ao excluir usuário");
      }
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await createUser(userData);
      toast.success("Usuário criado com sucesso!");
      createModal.closeModal();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
      throw error;
    }
  };

  const handleEditUser = async (userData: any) => {
    if (!selectedUser) return;
    try {
      await updateUser(selectedUser.id, userData);
      toast.success("Usuário atualizado com sucesso!");
      editModal.closeModal();
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar usuário");
      throw error;
    }
  };

  const openEditModal = (user: UserType) => {
    setSelectedUser(user);
    editModal.openModal();
  };

  const handleSearchChange = (value: string) => {
    setFilters({ search: value });
  };

  const handleStatusFilterChange = (value: string) => {
    setFilters({ status: value });
  };

  const handleTypeFilterChange = (value: string) => {
    setFilters({ userType: value });
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case "admin":
        return <Shield className="h-4 w-4 text-purple-600" />;
      case "seller":
        return <Store className="h-4 w-4 text-blue-600" />;
      case "buyer":
        return <User className="h-4 w-4 text-green-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status === "active" ? "Ativo" : status === "inactive" ? "Inativo" : "Pendente"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Usuários</h1>
          <p className="text-gray-600">Gerencie todos os usuários da plataforma Vendeu Online</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-red-800 font-medium">Erro ao carregar usuários</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => {
                  clearError();
                  fetchUsers();
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
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="pending">Pendente</option>
            </select>

            {/* Type Filter */}
            <select
              value={filters.userType}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="all">Todos os Tipos</option>
              <option value="buyer">Comprador</option>
              <option value="seller">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>

            <button
              onClick={createModal.openModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estatísticas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Login
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
                        <span className="text-gray-600">Carregando usuários...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">Nenhum usuário encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros de busca</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getUserTypeIcon(user.userType)}
                          <span className="text-sm text-gray-900 capitalize">
                            {user.userType === "buyer"
                              ? "Comprador"
                              : user.userType === "seller"
                                ? "Vendedor"
                                : "Administrador"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.userType === "seller" && user.subscription?.plan?.name
                            ? user.subscription.plan.name
                            : user.userType === "seller"
                              ? <span className="text-gray-400">Sem plano</span>
                              : <span className="text-gray-400">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {user.storeCount !== undefined && <div>Lojas: {user.storeCount}</div>}
                          <div>Pedidos: {user.orderCount || 0}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("pt-BR") : "Nunca"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                            title="Editar usuário"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {user.status === "active" ? (
                            <button
                              onClick={() => handleStatusChange(user.id, "inactive")}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={loading}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(user.id, "active")}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={loading}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Usuários Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter((u) => u.status === "active").length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Store className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Vendedores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter((u) => u.userType === "seller").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <XCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{users.filter((u) => u.status === "pending").length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <UserFormModal
          isOpen={createModal.isOpen}
          onClose={createModal.closeModal}
          onSubmit={handleCreateUser}
          mode="create"
        />

        <UserFormModal
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          onSubmit={handleEditUser}
          user={selectedUser}
          mode="edit"
        />
      </div>
    </div>
  );
}
