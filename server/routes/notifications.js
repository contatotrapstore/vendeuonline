import { Router } from "express";
import { supabase } from "../lib/supabase-client.js";

const router = Router();

// Função helper para criar notificação no Supabase
const createNotification = async (userId, title, message, type = 'INFO', data = null) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        userId: userId,
        title,
        message,
        type: type.toUpperCase(),
        data: data ? JSON.stringify(data) : null,
        isRead: false,
        createdAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return notification;
  } catch (error) {
    console.error('❌ Erro ao criar notificação:', error);
    return null;
  }
};

// Get all notifications for the current user
router.get("/", async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', req.user?.userId || req.user?.id || "demo-user")
      .order('createdAt', { ascending: false })
      .limit(50);

    if (error) {
      console.warn("❌ Erro ao buscar notificações no Supabase:", error);
      return res.json({
        success: true,
        notifications: []
      });
    }

    // Converter campos para formato esperado pelo frontend
    const formattedNotifications = (notifications || []).map(n => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      readAt: n.readAt,
      createdAt: n.createdAt,
      data: n.data
    }));

    res.json({
      success: true,
      notifications: formattedNotifications
    });
  } catch (error) {
    console.error("❌ Erro ao buscar notificações:", error);
    res.json({
      success: true,
      notifications: []
    });
  }
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const readAt = new Date().toISOString();
    
    const { error } = await supabase
      .from('notifications')
      .update({
        isRead: true,
        readAt: readAt
      })
      .eq('id', id)
      .eq('userId', req.user?.id || "demo-user");

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: "Notificação marcada como lida"
    });
  } catch (error) {
    console.error("❌ Erro ao marcar notificação como lida:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao marcar notificação como lida"
    });
  }
});

// Get unread count
router.get("/unread-count", async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user?.id || "demo-user")
      .eq('is_read', false);

    if (error) {
      console.warn("❌ Erro ao contar notificações no Supabase:", error);
      return res.json({
        success: true,
        unreadCount: 0
      });
    }

    res.json({
      success: true,
      unreadCount: count || 0
    });
  } catch (error) {
    console.error("❌ Erro ao contar notificações:", error);
    res.json({
      success: true,
      unreadCount: 0
    });
  }
});

export default router;