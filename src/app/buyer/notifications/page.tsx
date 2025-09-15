"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore, type Notification } from "@/store/notificationStore";
import { Bell, Check, CheckCheck, Filter, Search, Trash2 } from "lucide-react";

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { notifications, unreadCount, isLoading, error, fetchNotifications, markAsRead, markAllAsRead, clearError } =
    useNotificationStore();

  useEffect(() => {
    if (!user || user.userType !== "buyer") {
      window.location.href = "/";
      return;
    }

    fetchNotifications();
  }, [user, fetchNotifications]);

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "SUCCESS":
        return "✅";
      case "WARNING":
        return "⚠️";
      case "ERROR":
        return "❌";
      case "PROMOTION":
        return "🏷️";
      case "SECURITY":
        return "🔒";
      default:
        return "ℹ️";
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "SUCCESS":
        return "border-green-200 bg-green-50";
      case "WARNING":
        return "border-yellow-200 bg-yellow-50";
      case "ERROR":
        return "border-red-200 bg-red-50";
      case "PROMOTION":
        return "border-purple-200 bg-purple-50";
      case "SECURITY":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const filteredNotifications = notifications.filter((notification) => {
    // Filtro por status
    if (filter === "unread" && notification.isRead) return false;
    if (filter === "read" && !notification.isRead) return false;

    // Filtro por tipo
    if (typeFilter !== "all" && notification.type !== typeFilter) return false;

    // Filtro por busca
    if (
      searchQuery &&
      !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !notification.message.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  if (!user || user.userType !== "buyer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? `${unreadCount} não lidas` : "Todas as notificações estão em dia"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Marcar todas como lidas</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar notificações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "unread" | "read")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                <option value="unread">Não lidas</option>
                <option value="read">Lidas</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="sm:w-48">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos os tipos</option>
                <option value="info">Informações</option>
                <option value="promotion">Promoções</option>
                <option value="security">Segurança</option>
                <option value="success">Sucesso</option>
                <option value="warning">Avisos</option>
                <option value="error">Erros</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <p className="text-red-600">{error}</p>
              <button onClick={clearError} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando notificações...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-white border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${
                  notification.isRead ? "opacity-75" : "border-l-4 border-l-blue-500"
                } ${getNotificationColor(notification.type)}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-2xl">{getNotificationIcon(notification.type)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3
                          className={`text-lg font-medium ${notification.isRead ? "text-gray-700" : "text-gray-900"}`}
                        >
                          {notification.title}
                        </h3>
                        <p className={`mt-2 ${notification.isRead ? "text-gray-500" : "text-gray-700"}`}>
                          {notification.message}
                        </p>
                        <p className="text-sm text-gray-400 mt-4">
                          {formatDate(notification.createdAt)}
                          {notification.isRead && notification.readAt && (
                            <span className="ml-2">• Lida em {formatDate(notification.readAt)}</span>
                          )}
                        </p>
                      </div>

                      {/* Status Indicator */}
                      <div className="flex items-center space-x-2">
                        {notification.isRead ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filter !== "all" || typeFilter !== "all"
                  ? "Nenhuma notificação encontrada"
                  : "Nenhuma notificação"}
              </h3>
              <p className="text-gray-500">
                {searchQuery || filter !== "all" || typeFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Você está em dia com todas as suas notificações!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
