'use client';

import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, X, Eye, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  store: {
    name: string;
    id: string;
  };
  createdAt: Date;
  estimatedDelivery?: Date;
  trackingCode?: string;
  paymentMethod: string;
}

// Mock orders data
const mockOrders: Order[] = [
  {
    id: 'ORD001',
    status: 'delivered',
    total: 4299.99,
    items: [
      {
        id: '1',
        name: 'Samsung Galaxy S24 Ultra 256GB',
        price: 4299.99,
        quantity: 1,
        image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=samsung%20galaxy%20s24%20ultra&image_size=square'
      }
    ],
    store: {
      name: 'TechStore Premium',
      id: 'store1'
    },
    createdAt: new Date('2024-01-15'),
    estimatedDelivery: new Date('2024-01-20'),
    trackingCode: 'BR123456789',
    paymentMethod: 'PIX'
  },
  {
    id: 'ORD002',
    status: 'shipped',
    total: 1899.99,
    items: [
      {
        id: '4',
        name: 'Smart TV LG 55" 4K UHD',
        price: 1899.99,
        quantity: 1,
        image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=lg%20smart%20tv%2055%20inch&image_size=square'
      }
    ],
    store: {
      name: 'LG Electronics',
      id: 'store2'
    },
    createdAt: new Date('2024-01-20'),
    estimatedDelivery: new Date('2024-01-27'),
    trackingCode: 'BR987654321',
    paymentMethod: 'Cartão de Crédito'
  },
  {
    id: 'ORD003',
    status: 'confirmed',
    total: 699.98,
    items: [
      {
        id: '5',
        name: 'Tênis Nike Air Max 270',
        price: 399.99,
        quantity: 1,
        image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=nike%20air%20max%20270%20sneakers&image_size=square'
      },
      {
        id: '6',
        name: 'Cafeteira Nespresso Essenza Mini',
        price: 299.99,
        quantity: 1,
        image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=nespresso%20essenza%20mini%20coffee%20machine&image_size=square'
      }
    ],
    store: {
      name: 'Nike Store',
      id: 'store3'
    },
    createdAt: new Date('2024-01-22'),
    estimatedDelivery: new Date('2024-01-29'),
    paymentMethod: 'PIX'
  },
  {
    id: 'ORD004',
    status: 'pending',
    total: 2199.99,
    items: [
      {
        id: '3',
        name: 'Notebook Dell Inspiron 15 3000',
        price: 2199.99,
        quantity: 1,
        image: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=dell%20inspiron%20laptop&image_size=square'
      }
    ],
    store: {
      name: 'Dell Store',
      id: 'store4'
    },
    createdAt: new Date('2024-01-25'),
    estimatedDelivery: new Date('2024-02-05'),
    paymentMethod: 'Boleto Bancário'
  }
];

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const loadOrders = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrders(mockOrders);
      setIsLoading(false);
    };
    
    loadOrders();
  }, []);

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

  const handleCancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' as const }
        : order
    ));
    toast.success('Pedido cancelado com sucesso');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid gap-6">
              {[1, 2, 3].map(i => (
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
                          {order.createdAt.toLocaleDateString('pt-BR')} • {order.store.name}
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
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
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
                      {order.estimatedDelivery && (
                        <p className="text-sm text-gray-600">
                          Entrega prevista: {order.estimatedDelivery.toLocaleDateString('pt-BR')}
                        </p>
                      )}
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
                        onClick={() => handleContactStore(order.store.name)}
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
                        <p>Data: {selectedOrder.createdAt.toLocaleDateString('pt-BR')}</p>
                        <p>Loja: {selectedOrder.store.name}</p>
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
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
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