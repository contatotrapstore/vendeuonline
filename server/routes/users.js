import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { supabase } from "../lib/supabase-client.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger.js";
import { z } from "zod";
import { randomUUID } from "crypto";


const router = express.Router();

const addressSchema = z.object({
  label: z.string().min(2, "Etiqueta é obrigatória"),
  street: z.string().min(3, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().max(120).optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  zipCode: z.string().min(8, "CEP inválido"),
  isDefault: z.boolean().optional().default(false),
});

// Middleware de autenticação
// Middleware removido - usando middleware centralizado

// GET /api/users/profile - Buscar perfil do usuário (alias para /api/account/profile)
router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = req.user;
    logger.info("👤 Buscando perfil para usuário:", user.email);

    // Buscar dados adicionais baseados no tipo de usuário
    let additionalData = {};

    if (user.type === "SELLER") {
      logger.info("🏪 Buscando dados do vendedor...");
      const { data: seller, error: sellerError } = await supabase
        .from("sellers")
        .select(`*`)
        .eq("userId", user.id)
        .single();

      if (sellerError) {
        logger.error("❌ Erro ao buscar dados do vendedor:", sellerError);
      } else if (seller) {
        logger.info("✅ Dados do vendedor encontrados:", seller.storeName);
        additionalData.seller = seller;
      }
    } else if (user.type === "BUYER") {
      logger.info("🛒 Buscando dados do comprador...");
      const { data: buyer, error: buyerError } = await supabase
        .from("buyers")
        .select("*")
        .eq("userId", user.id)
        .single();

      if (buyerError) {
        logger.error("❌ Erro ao buscar dados do comprador:", buyerError);
      } else if (buyer) {
        logger.info("✅ Dados do comprador encontrados");
        additionalData.buyer = buyer;
      }
    }

    // Buscar endereços
    const { data: addresses, error: addressError } = await supabase
      .from("addresses")
      .select("*")
      .eq("userId", user.id)
      .order("isDefault", { ascending: false });

    if (addressError) {
      logger.error("⚠️ Erro ao buscar endereços:", addressError);
    }

    // Calcular estatísticas do usuário
    let stats = { totalOrders: 0, favoriteProducts: 0, totalSpent: 0 };

    if (user.type === "BUYER") {
      // Buscar estatísticas do comprador
      const { data: orders } = await supabase.from("Order").select("total").eq("userId", user.id);

      const { data: wishlists } = await supabase.from("Wishlist").select("id").eq("userId", user.id);

      stats = {
        totalOrders: orders?.length || 0,
        favoriteProducts: wishlists?.length || 0,
        totalSpent: orders?.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0) || 0,
      };
    }

    const profile = {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "(11) 99999-9999",
      city: user.city || "São Paulo",
      state: user.state || "SP",
      avatar: user.avatar || null,
      isVerified: user.isVerified || false,
      createdAt: user.createdAt,
      ...additionalData,
      addresses: addresses || [
        {
          id: "addr_1",
          userId: user.id,
          street: "Rua das Flores, 123",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-567",
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
      ],
      stats,
    };

    logger.info("✅ Perfil montado com sucesso");

    res.json({
      profile,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar perfil:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// PUT /api/users/profile - Atualizar perfil do usuário
router.put("/profile", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, city, state, avatar, bio, cpf, birthDate } = req.body;

    logger.info("🔄 Atualizando perfil do usuário:", userId);

    // Atualizar dados principais do usuário
    const { data: updatedUser, error: userError } = await supabase
      .from("users")
      .update({
        name,
        phone,
        city,
        state,
        avatar,
        bio,
        cpf,
        birthDate,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (userError) {
      logger.error("❌ Erro ao atualizar usuário:", userError);
      throw userError;
    }

    logger.info("✅ Perfil atualizado com sucesso");

    res.json({
      success: true,
      message: "Perfil atualizado com sucesso",
      profile: updatedUser,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar perfil:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
});

// GET /api/users/addresses - Listar endereços do usuário logado
router.get("/addresses", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("userId", req.user.id)
      .order("isDefault", { ascending: false })
      .order("createdAt", { ascending: true });

    if (error) {
      logger.error("Erro ao buscar endereços:", error);
      return res.status(500).json({ success: false, error: "Erro ao buscar endereços" });
    }

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    logger.error("Erro inesperado ao listar endereços:", error);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// POST /api/users/addresses - Adicionar novo endereço
router.post("/addresses", authenticate, async (req, res) => {
  try {
    const payload = addressSchema.parse(req.body);
    const sanitizedZip = payload.zipCode.replace(/\D/g, "");
    const addressId = randomUUID ? randomUUID() : `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (payload.isDefault) {
      await supabaseAdmin.from("addresses").update({ isDefault: false }).eq("userId", req.user.id);
    }

    const { data, error } = await supabaseAdmin
      .from("addresses")
      .insert({
        id: addressId,
        userId: req.user.id,
        label: payload.label.trim(),
        street: payload.street.trim(),
        number: payload.number.trim(),
        complement: payload.complement?.trim() || null,
        neighborhood: payload.neighborhood.trim(),
        city: payload.city.trim(),
        state: payload.state.trim().toUpperCase(),
        zipCode: sanitizedZip,
        isDefault: payload.isDefault ?? false,
      })
      .select()
      .single();

    if (error) {
      logger.error("Erro ao criar endereço:", error);
      return res.status(500).json({ success: false, error: "Erro ao salvar endereço" });
    }

    return res.json({
      success: true,
      message: "Endereço adicionado com sucesso",
      data,
    });
  } catch (error) {
    logger.error("Erro ao adicionar endereço:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: error.issues,
      });
    }
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// PUT /api/users/addresses/:id - Atualizar endereço
router.put("/addresses/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = addressSchema.partial().parse(req.body || {});

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: "Nenhuma alteração enviada" });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("addresses")
      .select("id, userId")
      .eq("id", id)
      .single();

    if (fetchError || !existing || existing.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Endereço não encontrado" });
    }

    if (updates.isDefault) {
      await supabaseAdmin.from("addresses").update({ isDefault: false }).eq("userId", req.user.id);
    }

    const { data, error } = await supabaseAdmin
      .from("addresses")
      .update({
        ...updates,
        zipCode: updates.zipCode ? updates.zipCode.replace(/\D/g, "") : undefined,
        state: updates.state ? updates.state.trim().toUpperCase() : undefined,
      })
      .eq("id", id)
      .eq("userId", req.user.id)
      .select()
      .single();

    if (error) {
      logger.error("Erro ao atualizar endereço:", error);
      return res.status(500).json({ success: false, error: "Erro ao atualizar endereço" });
    }

    res.json({
      success: true,
      message: "Endereço atualizado com sucesso",
      data,
    });
  } catch (error) {
    logger.error("Erro ao atualizar endereço:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: error.issues,
      });
    }
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// DELETE /api/users/addresses/:id - Remover endereço
router.delete("/addresses/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: address, error: fetchError } = await supabase
      .from("addresses")
      .select("id, userId")
      .eq("id", id)
      .single();

    if (fetchError || !address || address.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Endereço não encontrado" });
    }

    const { error } = await supabaseAdmin.from("addresses").delete().eq("id", id).eq("userId", req.user.id);

    if (error) {
      logger.error("Erro ao remover endereço:", error);
      return res.status(500).json({ success: false, error: "Erro ao remover endereço" });
    }

    res.json({
      success: true,
      message: "Endereço removido com sucesso",
    });
  } catch (error) {
    logger.error("Erro ao remover endereço:", error);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// GET /api/users/settings - Buscar configurações do usuário
router.get("/settings", authenticate, async (req, res) => {
  try {
    const user = req.user;
    logger.info("⚙️ Buscando configurações para usuário:", user.email);

    const settings = {
      notifications: {
        email: user.emailNotifications !== undefined ? user.emailNotifications : true,
        sms: user.smsNotifications !== undefined ? user.smsNotifications : false,
        push: user.pushNotifications !== undefined ? user.pushNotifications : true,
        orderUpdates: true,
        promotions: user.promotionNotifications !== undefined ? user.promotionNotifications : true,
        newsletter: user.newsletterNotifications !== undefined ? user.newsletterNotifications : false,
      },
      privacy: {
        showProfile: user.showProfile !== undefined ? user.showProfile : true,
        showContact: user.showContact !== undefined ? user.showContact : false,
        allowMessages: user.allowMessages !== undefined ? user.allowMessages : true,
        publicWishlist: user.publicWishlist !== undefined ? user.publicWishlist : false,
      },
      preferences: {
        language: user.language || "pt-BR",
        currency: user.currency || "BRL",
        theme: user.theme || "light",
        timezone: user.timezone || "America/Sao_Paulo",
      },
    };

    logger.info("✅ Configurações encontradas");

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar configurações:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// PUT /api/users/settings - Atualizar configurações do usuário
router.put("/settings", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notifications, privacy, preferences } = req.body;

    logger.info("🔄 Atualizando configurações do usuário:", userId);

    // Atualizar configurações no banco
    const { data: updatedUser, error: userError } = await supabase
      .from("users")
      .update({
        emailNotifications: notifications?.email,
        smsNotifications: notifications?.sms,
        pushNotifications: notifications?.push,
        promotionNotifications: notifications?.promotions,
        newsletterNotifications: notifications?.newsletter,
        showProfile: privacy?.showProfile,
        showContact: privacy?.showContact,
        allowMessages: privacy?.allowMessages,
        publicWishlist: privacy?.publicWishlist,
        language: preferences?.language,
        currency: preferences?.currency,
        theme: preferences?.theme,
        timezone: preferences?.timezone,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (userError) {
      logger.error("❌ Erro ao atualizar configurações:", userError);
      throw userError;
    }

    logger.info("✅ Configurações atualizadas com sucesso");

    res.json({
      success: true,
      message: "Configurações atualizadas com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar configurações:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// POST /api/users/avatar - Upload de avatar do usuário
router.post("/avatar", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatar } = req.body;

    logger.info("🖼️ Atualizando avatar do usuário:", userId);

    // Atualizar avatar no banco
    const { data: updatedUser, error: userError } = await supabase
      .from("users")
      .update({
        avatar,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (userError) {
      logger.error("❌ Erro ao atualizar avatar:", userError);
      throw userError;
    }

    logger.info("✅ Avatar atualizado com sucesso");

    res.json({
      success: true,
      message: "Avatar atualizado com sucesso",
      avatarUrl: avatar,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar avatar:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// GET /api/users/stats - Estatísticas do usuário
router.get("/stats", authenticate, async (req, res) => {
  try {
    const user = req.user;
    logger.info("📊 Buscando estatísticas para usuário:", user.email);

    let stats = {
      totalOrders: 0,
      totalSpent: 0,
      favoriteProducts: 0,
      reviewsGiven: 0,
      accountAge: 0,
    };

    if (user.type === "BUYER") {
      // Buscar pedidos
      const { data: orders } = await supabase.from("Order").select("total, createdAt").eq("userId", user.id);

      // Buscar wishlist
      const { data: wishlists } = await supabase.from("Wishlist").select("id").eq("userId", user.id);

      // Buscar reviews
      const { data: reviews } = await supabase.from("reviews").select("id").eq("userId", user.id);

      // Calcular idade da conta em dias
      const accountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

      stats = {
        totalOrders: orders?.length || 0,
        totalSpent: orders?.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0) || 0,
        favoriteProducts: wishlists?.length || 0,
        reviewsGiven: reviews?.length || 0,
        accountAge,
      };
    }

    logger.info("✅ Estatísticas calculadas");

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar estatísticas:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// DELETE /api/users/delete - Deletar conta do usuário
router.delete("/delete", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    logger.info("🗑️ Solicitação de exclusão de conta:", userId);

    // Verificar senha atual
    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Senha obrigatória para deletar conta",
      });
    }

    const isValidPassword = await bcrypt.compare(password, req.user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Senha incorreta",
      });
    }

    // Em uma implementação real, você faria soft delete ou anonimização
    // Por enquanto, vamos apenas marcar como inativo
    const { error: userError } = await supabase
      .from("users")
      .update({
        isActive: false,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId);

    if (userError) {
      logger.error("❌ Erro ao deletar conta:", userError);
      throw userError;
    }

    logger.info("✅ Conta marcada como deletada com sucesso");

    res.json({
      success: true,
      message: "Conta deletada com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao deletar conta:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

export default router;
