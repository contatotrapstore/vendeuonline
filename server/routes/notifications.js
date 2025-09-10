import { Router } from "express";
import prisma from "../lib/prisma.js";
import { createClient } from "@supabase/supabase-js";

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const router = Router();

// Função helper para criar notificação no banco
const createNotification = async (userId, title, message, type = 'INFO', data = null) => {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type.toUpperCase(),
        data: data ? JSON.stringify(data) : null
      }
    });
  } catch (error) {
    console.warn('⚠️ Prisma falhou, usando fallback Supabase para criar notificação:', error.message);
    
    // Fallback para Supabase
    try {
      const { data: notification, error: supabaseError } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          message,
          type: type.toUpperCase(),
          data: data ? JSON.stringify(data) : null,
          is_read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      return notification;
    } catch (supabaseError) {
      console.error('❌ Erro ao criar notificação no Supabase:', supabaseError);
      return null;
    }
  }
};

// Get all notifications for the current user
router.get("/", async (req, res) => {
  try {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: req.user?.id || "demo-user"
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 50
      });

      res.json({
        success: true,
        notifications
      });
    } catch (prismaError) {
      console.warn("⚠️ Prisma falhou, usando fallback Supabase para buscar notificações:", prismaError.message);
      
      // Fallback para Supabase
      const { data: notifications, error: supabaseError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', req.user?.id || "demo-user")
        .order('created_at', { ascending: false })
        .limit(50);

      if (supabaseError) throw supabaseError;

      // Converter campos para formato esperado pelo frontend
      const formattedNotifications = (notifications || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        readAt: n.read_at,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
        data: n.data
      }));

      res.json({
        success: true,
        notifications: formattedNotifications
      });
    }
  } catch (error) {
    console.error("❌ Erro ao buscar notificações:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar notificações"
    });
  }
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const readAt = new Date().toISOString();
    
    try {
      await prisma.notification.update({
        where: {
          id: id,
          userId: req.user?.id || "demo-user"
        },
        data: {
          isRead: true,
          readAt
        }
      });

      res.json({
        success: true,
        message: "Notificação marcada como lida"
      });
    } catch (prismaError) {
      console.warn("⚠️ Prisma falhou, usando fallback Supabase para marcar como lida:", prismaError.message);
      
      // Fallback para Supabase
      const { error: supabaseError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: readAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', req.user?.id || "demo-user");

      if (supabaseError) throw supabaseError;

      res.json({
        success: true,
        message: "Notificação marcada como lida"
      });
    }
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
    try {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: req.user?.id || "demo-user",
          isRead: false
        }
      });

      res.json({
        success: true,
        unreadCount
      });
    } catch (prismaError) {
      console.warn("⚠️ Prisma falhou, usando fallback Supabase para contar notificações:", prismaError.message);
      
      // Fallback para Supabase
      const { count, error: supabaseError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user?.id || "demo-user")
        .eq('is_read', false);

      if (supabaseError) throw supabaseError;

      res.json({
        success: true,
        unreadCount: count || 0
      });
    }
  } catch (error) {
    console.error("❌ Erro ao contar notificações não lidas:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao contar notificações",
      unreadCount: 0
    });
  }
});

export default router;