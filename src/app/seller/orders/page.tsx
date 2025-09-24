import { logger } from "@/lib/logger";

"use client";

import React, { useState, useEffect } from "react";
import { Package, Truck, CheckCircle, Clock, X, Eye, Edit, Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { useOrderStore, Order } from "@/store/orderStore";

const statusConfig = {
  pending: {
    label: "Aguardando Pagamento",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    icon: Clock,
    actions: ["confirm", "cancel"],
  },
  confirmed: {
    label: "Confirmado",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: Package,
    actions: ["process", "cancel"],
  },
  processing: {
    label: "Preparando",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    icon: Package,
    actions: ["ship"],
  },
  shipped: {
    label: "Enviado",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    icon: Truck,
    actions: ["deliver"],
  },
  delivered: {
    label: "Entregue",
    color: "text-green-600 bg-green-50 border-green-200",
    icon: CheckCircle,
    actions: [],
  },
  cancelled: {
    label: "Cancelado",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: X,
    actions: [],
  },
  refunded: {
    label: "Reembolsado",
    color: "text-gray-600 bg-gray-50 border-gray-200",
    icon: X,
    actions: [],
  },
};

const actionLabels = {
  confirm: "Confirmar Pedido",
  process: "Iniciar Preparação",
  ship: "Marcar como Enviado",
  deliver: "Marcar como Entregue",
  cancel: "Cancelar Pedido",
};

export default function SellerOrdersPage() {
  const { orders, isLoading, error, updateOrderStatus, addTrackingCode, cancelOrder, clearError } = useOrderStore();

  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [orderToTrack, setOrderToTrack] = useState<Order | null>(null);

  // Usa os pedidos já filtrados pela API do vendedor
  const storeOrders = orders || [];

  useEffect(() => {
    // Buscar pedidos do seller usando endpoint correto
    const fetchSellerOrders = async () => {
      try {
        const token = localStorage.getItem("auth-token");
        if (!token) {
          useOrderStore.setState({
            orders: [],
            isLoading: false,
            error: "Faça login para ver seus pedidos",
          });
          return;
        }

        useOrderStore.setState({ isLoading: true, error: null });

        const response = await fetch("/api/seller/orders", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Sessão expirada. Por favor, faça login novamente.");
          }
          throw new Error(`Erro ao buscar pedidos: ${response.status}`);
        }

        const data = await response.json();

        // Garantir que sempre temos arrays vazios como fallback
        const orders = Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];

        useOrderStore.setState({
          orders: orders,
          pagination: data?.pagination || {
            page: 1,
            limit: 20,
            total: orders.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
          isLoading: false,
          error: null,
        });
      } catch (err) {
        logger.error("Erro ao buscar pedidos:", err);
        const errorMessage = err instanceof Error ? err.message : "Erro ao carregar pedidos do vendedor";
        useOrderStore.setState({
          orders: [],
          error: errorMessage,
          isLoading: false,
        });
      }
    };

    fetchSellerOrders();
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const filteredOrders = storeOrders.filter((order) => {
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    const matchesSearch =
      searchTerm === "" ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some((item) => item.product.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const getStatusInfo = (status: Order["status"]) => {
    return statusConfig[status];
  };

  const handleStatusUpdate = async (orderId: string, newStatus: Order["status"]) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Status atualizado para: ${statusConfig[newStatus].label}`);
    } catch (error) {
      toast.error("Erro ao atualizar status do pedido");
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm("Tem certeza que deseja cancelar este pedido?")) {
      try {
        await cancelOrder(orderId, "Cancelado pelo vendedor");
        toast.success("Pedido cancelado com sucesso");
      } catch (error) {
        toast.error("Erro ao cancelar pedido");
      }
    }
  };

  const handleAddTracking = async () => {
    if (!orderToTrack || !trackingCode.trim()) {
      toast.error("Código de rastreamento é obrigatório");
      return;
    }

    try {
      await addTrackingCode(orderToTrack.id, trackingCode.trim());
      toast.success("Código de rastreamento adicionado com sucesso");
      setShowTrackingModal(false);
      setTrackingCode("");
      setOrderToTrack(null);
    } catch (error) {
      toast.error("Erro ao adicionar código de rastreamento");
    }
  };

  const openTrackingModal = (order: Order) => {
    setOrderToTrack(order);
    setTrackingCode(order.trackingCode || "");
    setShowTrackingModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estado de erro não relacionado ao login
  if (error && !error.includes("login")) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <X className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">Erro ao carregar pedidos</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Pedidos</h1>
            <p className="text-gray-600 mt-1">{filteredOrders.length} pedidos encontrados</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar por ID do pedido ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStatus("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStatus === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Todos ({storeOrders.length})
              </button>
              {Object.entries(statusConfig).map(([status, config]) => {
                const count = storeOrders.filter((order) => order.status === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedStatus === status
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {config.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
            <p className="text-gray-600">
              {searchTerm
                ? "Nenhum pedido corresponde aos critérios de busca."
                : "Você ainda não recebeu nenhum pedido."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border p-6">
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Pedido #{order.id}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString("pt-BR")} • {order.paymentMethod}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${statusInfo.color}`}
                      >
                        <StatusIcon className="h-4 w-4" />
                        {statusInfo.label}
                      </div>
                      {order.paymentStatus === "paid" && (
                        <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Pago</div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        R$ {order.total.toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                        {order.items.length === 1 ? "item" : "itens"}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="border-t border-gray-100 pt-4 mb-4">
                    <div className="grid gap-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.product.images[0]?.url || "/assets/default-product.svg"}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                            <p className="text-sm text-gray-600">
                              Qtd: {item.quantity} • R$ {item.price.toFixed(2).replace(".", ",")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Info */}
                  {order.shippingAddress && (
                    <div className="border-t border-gray-100 pt-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Endereço de Entrega</h4>
                      <p className="text-sm text-gray-600">
                        {order.shippingAddress.street}, {order.shippingAddress.number}
                        {order.shippingAddress.complement && `, ${order.shippingAddress.complement}`}
                        <br />
                        {order.shippingAddress.neighborhood}, {order.shippingAddress.city} -{" "}
                        {order.shippingAddress.state}
                        <br />
                        CEP: {order.shippingAddress.zipCode}
                      </p>
                      {order.trackingCode && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Código de Rastreamento:</strong> {order.trackingCode}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Order Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      {order.estimatedDelivery && (
                        <p className="text-sm text-gray-600">
                          Entrega prevista: {new Date(order.estimatedDelivery).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status Actions */}
                      {statusInfo.actions.map((action) => {
                        if (action === "cancel") {
                          return (
                            <button
                              key={action}
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                            >
                              Cancelar
                            </button>
                          );
                        }

                        if (action === "ship") {
                          return (
                            <button
                              key={action}
                              onClick={() => openTrackingModal(order)}
                              className="px-4 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium flex items-center gap-2"
                            >
                              <Truck className="h-4 w-4" />
                              Enviar
                            </button>
                          );
                        }

                        const nextStatus = {
                          confirm: "confirmed",
                          process: "processing",
                          deliver: "delivered",
                        }[action] as Order["status"];

                        return (
                          <button
                            key={action}
                            onClick={() => handleStatusUpdate(order.id, nextStatus)}
                            className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                          >
                            {actionLabels[action as keyof typeof actionLabels]}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tracking Code Modal */}
        {showTrackingModal && orderToTrack && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Adicionar Código de Rastreamento</h2>
                <button onClick={() => setShowTrackingModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Pedido #{orderToTrack.id}</p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código de Rastreamento</label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Ex: BR123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTrackingModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddTracking}
                    disabled={!trackingCode.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Confirmar Envio
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Detalhes do Pedido #{selectedOrder.id}</h2>
                  <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Status and Payment */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Status do Pedido</h3>
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusInfo(selectedOrder.status).color}`}
                      >
                        {React.createElement(getStatusInfo(selectedOrder.status).icon, { className: "h-4 w-4" })}
                        {getStatusInfo(selectedOrder.status).label}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Pagamento</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Método: {selectedOrder.paymentMethod}</p>
                        <p>
                          Status:
                          <span
                            className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                              selectedOrder.paymentStatus === "paid"
                                ? "bg-green-100 text-green-800"
                                : selectedOrder.paymentStatus === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {selectedOrder.paymentStatus === "paid"
                              ? "Pago"
                              : selectedOrder.paymentStatus === "failed"
                                ? "Falhou"
                                : "Pendente"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customer and Shipping */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Informações do Pedido</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Data: {new Date(selectedOrder.createdAt).toLocaleDateString("pt-BR")}</p>
                        <p>Última atualização: {new Date(selectedOrder.updatedAt).toLocaleDateString("pt-BR")}</p>
                        {selectedOrder.estimatedDelivery && (
                          <p>
                            Entrega prevista: {new Date(selectedOrder.estimatedDelivery).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                        {selectedOrder.deliveredAt && (
                          <p>Entregue em: {new Date(selectedOrder.deliveredAt).toLocaleDateString("pt-BR")}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Endereço de Entrega</h3>
                      <div className="text-sm text-gray-600">
                        <p>
                          {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.number}
                        </p>
                        {selectedOrder.shippingAddress.complement && <p>{selectedOrder.shippingAddress.complement}</p>}
                        <p>{selectedOrder.shippingAddress.neighborhood}</p>
                        <p>
                          {selectedOrder.shippingAddress.city} - {selectedOrder.shippingAddress.state}
                        </p>
                        <p>CEP: {selectedOrder.shippingAddress.zipCode}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Itens do Pedido</h3>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={item.product.images[0]?.url || "/assets/default-product.svg"}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                            <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                            </p>
                            <p className="text-sm text-gray-600">R$ {item.price.toFixed(2).replace(".", ",")} cada</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>R$ {selectedOrder.subtotal.toFixed(2).replace(".", ",")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Frete:</span>
                        <span>R$ {selectedOrder.shippingCost.toFixed(2).replace(".", ",")}</span>
                      </div>

                      <div className="flex justify-between text-lg font-semibold border-t pt-2">
                        <span>Total:</span>
                        <span>R$ {selectedOrder.total.toFixed(2).replace(".", ",")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Observações</h3>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
