"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, AlertCircle } from "lucide-react";

/**
 * PÁGINA TEMPORARIAMENTE DESABILITADA
 *
 * Esta página será reativada quando o checkout online for implementado.
 * Atualmente, as vendas são finalizadas via WhatsApp.
 *
 * Para reativar: restaurar o código original de BuyerOrdersPage
 */

export default function BuyerOrdersPage() {
  const navigate = useNavigate();

  // Redirecionar para home após 3 segundos
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Package className="h-8 w-8 text-blue-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Página em Desenvolvimento
        </h1>

        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="text-sm font-medium text-yellow-900 mb-2">
              Checkout em Desenvolvimento
            </p>
            <p className="text-sm text-yellow-700">
              No momento, as vendas são finalizadas via WhatsApp com cada loja.
              Em breve teremos checkout online completo com acompanhamento de pedidos!
            </p>
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          Redirecionando para a página inicial...
        </p>

        <button
          onClick={() => navigate("/")}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Voltar para Home
        </button>

        <div className="mt-6 text-sm text-gray-500">
          <p>Para comprar produtos:</p>
          <p className="font-medium text-gray-700 mt-1">
            Navegue pelos produtos e entre em contato diretamente com a loja via WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
}

/*
===========================================
CÓDIGO ORIGINAL (COMENTADO PARA REATIVAR FUTURAMENTE)
===========================================

"use client";

import React, { useState, useEffect } from "react";
import { Package, Truck, CheckCircle, Clock, X, Eye, MessageCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useOrderStore, Order } from "@/store/orderStore";

const statusConfig = {
  pending: {
    label: "Aguardando Pagamento",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmado",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: Package,
  },
  shipped: {
    label: "Enviado",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    icon: Truck,
  },
  delivered: {
    label: "Entregue",
    color: "text-green-600 bg-green-50 border-green-200",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelado",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: X,
  },
};

export default function BuyerOrdersPage() {
  const { orders, isLoading, error, fetchOrders, updateOrderStatus, addTrackingCode, cancelOrder } = useOrderStore();

  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = selectedStatus === "all" ? orders : orders.filter((order) => order.status === selectedStatus);

  const getStatusInfo = (status: Order["status"]) => {
    return statusConfig[status];
  };

  const handleTrackOrder = (trackingCode: string) => {
    toast.success(`Abrindo rastreamento: ${trackingCode}`);
  };

  const handleContactStore = (storeName: string) => {
    toast.success(`Abrindo chat com ${storeName}`);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm("Tem certeza que deseja cancelar este pedido?")) {
      try {
        await cancelOrder(orderId, "Cancelado pelo cliente");
        toast.success("Pedido cancelado com sucesso");
      } catch (error) {
        toast.error("Erro ao cancelar pedido");
      }
    }
  };

  // ... resto do código original ...
}
*/
