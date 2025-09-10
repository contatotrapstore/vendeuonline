"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  ShoppingCart,
  Heart,
  Package,
  MapPin,
  Star,
  Clock,
  Truck,
  CreditCard,
  Eye,
  Search,
  Filter,
  Bell,
  User,
} from "lucide-react";

// Dados mock para o dashboard do comprador
const buyerStats = {
  totalOrders: 12,
  favoriteProducts: 8,
  totalSpent: 2450.8,
  pendingDeliveries: 2,
  completedOrders: 10,
  savedStores: 5,
};

const recentOrders = [
  {
    id: "#1234",
    store: "Tech Store",
    product: "Smartphone Samsung Galaxy",
    value: 899.9,
    status: "shipped",
    estimatedDelivery: "2024-01-25",
    image:
      "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=smartphone%20samsung%20galaxy%20modern%20sleek%20design&image_size=square",
  },
  {
    id: "#1233",
    store: "Audio Pro",
    product: "Fone de Ouvido Bluetooth",
    value: 199.9,
    status: "processing",
    estimatedDelivery: "2024-01-28",
    image:
      "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=bluetooth%20headphones%20wireless%20modern%20black&image_size=square",
  },
  {
    id: "#1232",
    store: "Gadgets Plus",
    product: "Carregador Portátil",
    value: 89.9,
    status: "delivered",
    estimatedDelivery: "2024-01-20",
    image:
      "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=portable%20power%20bank%20charger%20white%20modern&image_size=square",
  },
];

const favoriteProducts = [
  {
    id: 1,
    name: "Notebook Dell Inspiron",
    store: "Tech Store",
    price: 2499.9,
    originalPrice: 2899.9,
    discount: 14,
    rating: 4.5,
    image:
      "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=dell%20inspiron%20laptop%20silver%20modern%20sleek&image_size=square",
  },
  {
    id: 2,
    name: 'Smart TV 55" 4K',
    store: "Eletrônicos BR",
    price: 1899.9,
    originalPrice: 2199.9,
    discount: 14,
    rating: 4.7,
    image:
      "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=smart%20tv%2055%20inch%204k%20modern%20black%20screen&image_size=square",
  },
  {
    id: 3,
    name: "Tênis Nike Air Max",
    store: "Sports World",
    price: 399.9,
    originalPrice: 499.9,
    discount: 20,
    rating: 4.8,
    image:
      "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=nike%20air%20max%20sneakers%20white%20blue%20modern&image_size=square",
  },
];

const recommendedProducts = [
  {
    id: 4,
    name: "Mouse Gamer RGB",
    store: "Gamer Zone",
    price: 129.9,
    rating: 4.6,
    image:
      "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=gaming%20mouse%20rgb%20lights%20black%20modern&image_size=square",
  },
  {
    id: 5,
    name: "Camiseta Polo",
    store: "Fashion Store",
    price: 79.9,
    rating: 4.3,
    image:
      "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=polo%20shirt%20navy%20blue%20cotton%20classic&image_size=square",
  },
  {
    id: 6,
    name: 'Livro "Clean Code"',
    store: "Livraria Tech",
    price: 89.9,
    rating: 4.9,
    image:
      "https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=clean%20code%20book%20programming%20white%20cover&image_size=square",
  },
];

export default function BuyerDashboard() {
  const { user } = useAuthStore();

  useEffect(() => {
    // Verificar autenticação e tipo de usuário
    if (!user || user.userType !== "buyer") {
      window.location.href = "/";
    }
  }, [user]);

  if (!user || user.userType !== "buyer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getOrderStatusColor = (status: string) => {
    switch (status) {
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
                <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                  <User className="h-3 w-3 mr-1" />
                  Comprador
                </div>
              </div>
              <p className="text-gray-600">Bem-vindo, {user.name} • Explore produtos e gerencie suas compras</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800">
                <Bell className="h-4 w-4" />
                <span>Notificações</span>
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
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{buyerStats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Favoritos</p>
                <p className="text-2xl font-bold text-gray-900">{buyerStats.favoriteProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Gasto</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {buyerStats.totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Truck className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Entregas Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{buyerStats.pendingDeliveries}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Pedidos Recentes</h3>
                  <button
                    onClick={() => (window.location.href = "/buyer/orders")}
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
                      className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <img src={order.image} alt={order.product} className="w-16 h-16 object-cover rounded-lg" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900">{order.id}</p>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}
                          >
                            {getOrderStatusText(order.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{order.product}</p>
                        <p className="text-sm text-gray-500">{order.store}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-medium text-green-600">
                            R$ {order.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          {order.status !== "delivered" && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Truck className="h-3 w-3 mr-1" />
                              Entrega: {new Date(order.estimatedDelivery).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Products */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recomendados para Você</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                      <h4 className="font-medium text-gray-900 mb-1 text-sm">{product.name}</h4>
                      <p className="text-xs text-gray-500 mb-2">{product.store}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-green-600 text-sm">
                          R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 mr-1" />
                          <span className="text-xs text-gray-600">{product.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Ações Rápidas</h3>
              </div>
              <div className="p-6 space-y-4">
                <button
                  onClick={() => (window.location.href = "/buscar")}
                  className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Search className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="font-medium text-gray-900">Buscar Produtos</span>
                </button>

                <button
                  onClick={() => (window.location.href = "/buyer/wishlist")}
                  className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Heart className="h-5 w-5 text-red-600 mr-3" />
                  <span className="font-medium text-gray-900">Meus Favoritos</span>
                </button>

                <button
                  onClick={() => (window.location.href = "/buyer/orders")}
                  className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Package className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="font-medium text-gray-900">Meus Pedidos</span>
                </button>

                <button
                  onClick={() => (window.location.href = "/buyer/profile")}
                  className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <MapPin className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium text-gray-900">Meu Perfil</span>
                </button>
              </div>
            </div>

            {/* Favorite Products */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Produtos Favoritos</h3>
                  <button
                    onClick={() => (window.location.href = "/buyer/wishlist")}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver todos →
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {favoriteProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.store}</p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-green-600 text-sm">
                              R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            {product.discount > 0 && (
                              <span className="text-xs text-red-600 bg-red-100 px-1 rounded">-{product.discount}%</span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-400 mr-1" />
                            <span className="text-xs text-gray-600">{product.rating}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Alerts */}
        {buyerStats.pendingDeliveries > 0 && (
          <div className="mt-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center">
                <Truck className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h4 className="font-medium text-blue-800">Entregas a Caminho</h4>
                  <p className="text-sm text-blue-700">
                    Você tem {buyerStats.pendingDeliveries} produtos sendo entregues
                  </p>
                </div>
              </div>
              <button
                onClick={() => (window.location.href = "/buyer/orders?status=shipped")}
                className="mt-3 text-sm text-blue-800 hover:text-blue-900 font-medium"
              >
                Rastrear entregas →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
