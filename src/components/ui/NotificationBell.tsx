import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useNotificationStore, type Notification } from "@/store/notificationStore";
import { useAuthStore } from "@/store/authStore";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();

  useEffect(() => {
    if (!user) return;

    // Fetch inicial
    fetchNotifications();

    // Polling inteligente: buscar notificações a cada 30 segundos
    // Apenas quando a aba está ativa (para economizar recursos)
    let interval: NodeJS.Timeout;

    const startPolling = () => {
      interval = setInterval(() => {
        if (!document.hidden) {
          fetchNotifications();
        }
      }, 30000); // 30 segundos (reduzido de 5s para evitar rate limiting)
    };

    startPolling();

    // Pausar polling quando aba fica inativa
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchNotifications(); // Fetch ao voltar para aba
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

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
      case "ORDER":
        return "📦";
      case "PAYMENT":
        return "💳";
      case "SYSTEM":
        return "⚙️";
      default:
        return "ℹ️";
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "SUCCESS":
        return "text-green-600 bg-green-50";
      case "WARNING":
        return "text-yellow-600 bg-yellow-50";
      case "ERROR":
        return "text-red-600 bg-red-50";
      case "PROMOTION":
        return "text-purple-600 bg-purple-50";
      case "SECURITY":
        return "text-blue-600 bg-blue-50";
      case "ORDER":
        return "text-indigo-600 bg-indigo-50";
      case "PAYMENT":
        return "text-emerald-600 bg-emerald-50";
      case "SYSTEM":
        return "text-slate-600 bg-slate-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Agora há pouco";
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`;
    } else {
      return date.toLocaleDateString("pt-BR");
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Notificações</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Carregando...</p>
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition-colors ${
                        notification.isRead ? "hover:bg-gray-50" : "bg-blue-50 hover:bg-blue-100"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${getNotificationColor(notification.type)}`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p
                              className={`text-sm font-medium ${notification.isRead ? "text-gray-900" : "text-gray-900"}`}
                            >
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${notification.isRead ? "text-gray-500" : "text-gray-700"}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">{formatDate(notification.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">Nenhuma notificação</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = "/buyer/notifications";
                  }}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Ver todas as notificações
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
