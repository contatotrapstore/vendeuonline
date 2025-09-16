"use client";

import { useEffect, useState } from "react";
import { useAuthStore, useStoreData } from "@/store/authStore";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Eye,
  Star,
  MessageCircle,
  Plus,
  BarChart3,
  Settings,
  Users,
  Clock,
  Store,
  Crown,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";

const getQuickActions = (stats) => [
  {
    title: "Adicionar Produto",
    description: "Cadastrar novo produto",
    icon: Plus,
    color: "bg-blue-500",
    href: "/seller/products/new",
  },
  {
    title: "Gerenciar Pedidos",
    description: stats ? `${stats.pendingOrders} pedidos pendentes` : "Carregando...",
    icon: ShoppingCart,
    color: "bg-green-500",
    href: "/seller/orders",
  },
  {
    title: "Meus Planos",
    description: "Gerenciar assinatura",
    icon: Crown,
    color: "bg-yellow-500",
    href: "/seller/plans",
  },
  {
    title: "Ver Analytics",
    description: "Relatórios de vendas",
    icon: BarChart3,
    color: "bg-purple-500",
    href: "/seller/analytics",
  },
  {
    title: "Configurar Loja",
    description: "Personalizar sua loja",
    icon: Settings,
    color: "bg-orange-500",
    href: "/seller/settings",
  },
];

export default function SellerDashboard() {
  const { user, token } = useAuthStore();
  const { storeName, storeId, storeSlug } = useStoreData();

  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticação e tipo de usuário
    if (!user || user.userType !== "seller") {
      window.location.href = "/";
      return;
    }

    loadDashboardData();
  }, [user, token]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Carregar dados em paralelo
      const [statsRes, ordersRes, productsRes] = await Promise.all([
        apiRequest("/api/seller/stats", { token }),
        apiRequest("/api/seller/recent-orders?limit=4", { token }),
        apiRequest("/api/seller/top-products?limit=3", { token }),
      ]);

      // Verificar se as respostas têm formato { success: true, data: ... }
      setStats(statsRes?.data || statsRes);
      setRecentOrders(ordersRes?.data || ordersRes || []);
      setTopProducts(productsRes?.data || productsRes || []);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      // Manter dados vazios em caso de erro
      setStats({
        totalProducts: 0,
        totalOrders: 0,
        monthlyRevenue: 0,
        storeViews: 0,
        averageRating: 0,
        totalReviews: 0,
        pendingOrders: 0,
        lowStockProducts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.userType !== "seller" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se não há stats ainda, mostrar loading
  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "processing":
        return "text-blue-600 bg-blue-100";
      case "shipped":
        return "text-purple-600 bg-purple-100";
      case "delivered":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "processing":
        return "Processando";
      case "shipped":
        return "Enviado";
      case "delivered":
        return "Entregue";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">Painel do Vendedor</h1>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                  <Store className="h-3 w-3 mr-1" />
                  Vendedor
                </div>
              </div>
              <p className="text-gray-600">
                Bem-vindo, {user.name} • {storeName} • Gerencie seus produtos e vendas
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  console.log("🔍 Debug botão Ver minha loja:");
                  console.log("- user:", user);
                  console.log("- seller:", user?.seller);
                  console.log("- store:", user?.seller?.store);
                  console.log("- storeId:", storeId);
                  console.log("- storeSlug:", storeSlug);
                  console.log("- storeName:", storeName);

                  if (storeId) {
                    console.log(`✅ Navegando para: /stores/${storeId}`);
                    window.location.href = `/stores/${storeId}`;
                  } else {
                    console.log("❌ StoreId não encontrado");
                    alert("Sua loja ainda não foi criada. Configure sua loja primeiro.");
                  }
                }}
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Eye className="h-4 w-4" />
                <span>Ver minha loja</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Produtos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
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
                  R$ {stats.monthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Visualizações</p>
                <p className="text-2xl font-bold text-gray-900">{stats.storeViews.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Ações Rápidas</h3>
              </div>
              <div className="p-6 space-y-4">
                {getQuickActions(stats).map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => (window.location.href = action.href)}
                      className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">{action.title}</p>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Store Performance */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Performance da Loja</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 mr-2" />
                    <span className="text-sm text-gray-600">Avaliação</span>
                  </div>
                  <span className="font-medium">{stats.averageRating}/5.0</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageCircle className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="text-sm text-gray-600">Avaliações</span>
                  </div>
                  <span className="font-medium">{stats.totalReviews}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Visualizações</span>
                  </div>
                  <span className="font-medium">{stats.storeViews}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Pedidos Recentes</h3>
                  <button
                    onClick={() => (window.location.href = "/seller/orders")}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver todos →
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900">{order.id}</p>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}
                          >
                            {getOrderStatusText(order.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{order.customer}</p>
                        <p className="text-sm text-gray-500">{order.product}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-medium text-green-600">
                            R$ {order.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {order.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Produtos Mais Vendidos</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.sales} vendas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          R$ {product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p
                          className={`text-sm ${
                            product.stock === 0
                              ? "text-red-600"
                              : product.stock < 10
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        >
                          {product.stock === 0 ? "Sem estoque" : `${product.stock} em estoque`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(stats.pendingOrders > 0 || stats.lowStockProducts > 0) && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.pendingOrders > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center">
                  <ShoppingCart className="h-6 w-6 text-yellow-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Pedidos Pendentes</h4>
                    <p className="text-sm text-yellow-700">
                      Você tem {stats.pendingOrders} pedidos aguardando processamento
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => (window.location.href = "/seller/orders?status=pending")}
                  className="mt-3 text-sm text-yellow-800 hover:text-yellow-900 font-medium"
                >
                  Ver pedidos →
                </button>
              </div>
            )}

            {stats.lowStockProducts > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center">
                  <Package className="h-6 w-6 text-red-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-red-800">Estoque Baixo</h4>
                    <p className="text-sm text-red-700">
                      {stats.lowStockProducts} produtos com estoque baixo ou zerado
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => (window.location.href = "/seller/products?filter=low-stock")}
                  className="mt-3 text-sm text-red-800 hover:text-red-900 font-medium"
                >
                  Ver produtos →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
