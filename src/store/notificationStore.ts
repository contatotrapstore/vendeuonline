import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get, put } from '@/lib/api-client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promotion' | 'security';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  data?: any;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearError: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,

      fetchNotifications: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const data = await get('/notifications');
          const notifications = data.notifications || [];
          const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
          
          set({ 
            notifications,
            unreadCount,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao buscar notificações',
            isLoading: false 
          });
        }
      },

      markAsRead: async (id: string) => {
        try {
          await put(`/notifications/${id}/read`);
          
          const { notifications } = get();
          const updatedNotifications = notifications.map(notification =>
            notification.id === id 
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification
          );
          
          const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
          
          set({ 
            notifications: updatedNotifications,
            unreadCount
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao marcar notificação como lida'
          });
        }
      },

      markAllAsRead: async () => {
        const { notifications } = get();
        const unreadNotifications = notifications.filter(n => !n.isRead);
        
        try {
          // Marcar todas as não lidas como lidas
          await Promise.all(
            unreadNotifications.map(notification => 
              put(`/notifications/${notification.id}/read`)
            )
          );
          
          const updatedNotifications = notifications.map(notification => ({
            ...notification,
            isRead: true,
            readAt: notification.readAt || new Date().toISOString()
          }));
          
          set({ 
            notifications: updatedNotifications,
            unreadCount: 0
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Erro ao marcar todas como lidas'
          });
        }
      },

      clearError: () => set({ error: null }),

      addNotification: (notification) => {
        const { notifications, unreadCount } = get();
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          isRead: false
        };
        
        set({
          notifications: [newNotification, ...notifications],
          unreadCount: unreadCount + 1
        });
      }
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({ 
        notifications: state.notifications,
        unreadCount: state.unreadCount 
      })
    }
  )
);