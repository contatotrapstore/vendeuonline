'use client';

import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, X, Eye, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useOrderStore, Order } from '@/store/orderStore';

// Configuração de status dos pedidos

const statusConfig = {
  pending: {
    label: 'Aguardando Pagamento',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    icon: Clock
  },
  confirmed: {
    label: 'Confirmado',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: Package
  },
  shipped: {
    label: 'Enviado',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    icon: Truck
  },
  delivered: {
    label: 'Entregue',
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: CheckCircle
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: X
  }
};

export default function BuyerOrdersPage() {
  const {
    orders,
    isLoading,
    error,
    fetchOrders,
    updateOrderStatus,
    addTrackingCode,
    cancelOrder
  } = useOrderStore();
  
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus);

  const getStatusInfo = (status: Order['status']) => {
    return statusConfig[status];
  };

  const handleTrackOrder = (trackingCode: string) => {
    toast.success(`Abrindo rastreamento: ${trackingCode}`);
    // In a real app, this would open tracking page or external service
  };

  const handleContactStore = (storeName: string) => {
    toast.success(`Abrindo chat com ${storeName}`);
    // In a real app, this would open chat or contact form
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Tem certeza que deseja cancelar este pedido?')) {
      try {
        await cancelOrder(orderId, 'Cancelado pelo cliente');
        toast.success('Pedido cancelado com sucesso');
      } catch (error) {
        toast.error('Erro ao cancelar pedido');
      }
    }
  };

  const handleRetryFetch = () => {
    fetchOrders();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Carregando seus pedidos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar pedidos</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleRetryFetch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Meus Pedidos</h1>
          <p className="text-gray-600">{orders.length} pedidos encontrados</p>
        </div>

        {/* Status Filter */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({orders.length})
            </button>
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = orders.filter(order => order.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
            <p className="text-gray-600">Você ainda não fez nenhum pedido com este status.</p>
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
                          {new Date(order.createdAt).toLocaleDateString('pt-BR')} • {order.store?.name || 'Loja'}
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${statusInfo.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        {statusInfo.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        R$ {order.total.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-sm text-gray-600">{order.paymentMethod}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="border-t border-gray-100 pt-4 mb-4">
                    <div className="grid gap-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.product.images[0]?.url || 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=product%20placeholder&image_size=square'}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                            <p className="text-sm text-gray-600">
                              Qtd: {item.quantity} • R$ {item.price.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      {order.trackingCode && (
                        <p className="text-sm text-gray-600">
                          Código: {order.trackingCode}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                          Cancelar
                        </button>
                      )}
                      
                      {order.trackingCode && order.status === 'shipped' && (
                        <button
                          onClick={() => handleTrackOrder(order.trackingCode!)}
                          className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <Truck className="h-4 w-4" />
                          Rastrear
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleContactStore(order.store?.name || 'Loja')}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Contatar Loja
                      </button>
                      
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

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Detalhes do Pedido #{selectedOrder.id}
                  </h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Status and Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Status do Pedido</h3>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusInfo(selectedOrder.status).color}`}>
                        {React.createElement(getStatusInfo(selectedOrder.status).icon, { className: 'h-4 w-4' })}
                        {getStatusInfo(selectedOrder.status).label}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Informações</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Data: {new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}</p>
                        <p>Loja ID: {selectedOrder.storeId}</p>
                        <p>Pagamento: {selectedOrder.paymentMethod}</p>
                        {selectedOrder.trackingCode && (
                          <p>Rastreamento: {selectedOrder.trackingCode}</p>
                        )}
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
                              src={item.product.images[0]?.url || 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=product%20placeholder&image_size=square'}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                            <p className="text-sm text-gray-600">
                              Quantidade: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                            </p>
                            <p className="text-sm text-gray-600">
                              R$ {item.price.toFixed(2).replace('.', ',')} cada
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total do Pedido:</span>
                      <span>R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</span>
                    </div>
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