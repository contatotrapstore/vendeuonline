import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import { supabase } from "../lib/supabase-client.js";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger.js";


const router = express.Router();

// Middleware de autenticação
// Middleware removido - usando middleware centralizado

// GET /api/account/profile - Buscar perfil do usuário
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

    const profile = {
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      city: user.city || "",
      state: user.state || "",
      avatar: user.avatar || null,
      isVerified: user.isVerified || false,
      bio: user.bio || "",
      cpf: user.cpf || "",
      birthDate: user.birthDate || "",
      notifications: {
        email: user.emailNotifications !== undefined ? user.emailNotifications : true,
        sms: user.smsNotifications !== undefined ? user.smsNotifications : false,
        push: user.pushNotifications !== undefined ? user.pushNotifications : true,
      },
      privacy: {
        showProfile: user.showProfile !== undefined ? user.showProfile : true,
        showContact: user.showContact !== undefined ? user.showContact : false,
      },
      ...additionalData,
    };

    logger.info("✅ Perfil montado com sucesso");

    res.json({
      success: true,
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

// PUT /api/account/profile - Atualizar perfil do usuário
router.put("/profile", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, city, state, avatar, bio, cpf, birthDate, notifications, privacy } = req.body;

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
        emailNotifications: notifications?.email,
        smsNotifications: notifications?.sms,
        pushNotifications: notifications?.push,
        showProfile: privacy?.showProfile,
        showContact: privacy?.showContact,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (userError) {
      logger.error("Erro ao atualizar usuário:", userError);
      throw userError;
    }

    res.json({
      success: true,
      message: "Perfil atualizado com sucesso",
      profile: updatedUser,
    });
  } catch (error) {
    logger.error("Erro ao atualizar perfil:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// GET /api/sellers/subscription - Buscar assinatura do vendedor
router.get("/sellers/subscription", authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (user.type !== "SELLER") {
      return res.status(403).json({
        error: "Acesso negado. Apenas vendedores podem acessar assinaturas.",
      });
    }

    // Buscar dados do vendedor com plano
    const { data: seller, error } = await supabase
      .from("sellers")
      .select(
        `
        *,
        plan:plans(*),
        subscriptions(
          *,
          plan:plans(*)
        )
      `
      )
      .eq("userId", user.id)
      .single();

    if (error) {
      logger.error("Erro ao buscar vendedor:", error);
      throw error;
    }

    // Buscar assinatura ativa
    const activeSubscription = seller.subscriptions?.find(
      (sub) => sub.status === "ACTIVE" || sub.status === "TRIALING"
    );

    let subscription = null;
    if (activeSubscription) {
      subscription = {
        id: activeSubscription.id,
        planId: activeSubscription.planId,
        plan: activeSubscription.plan,
        status: activeSubscription.status.toLowerCase(),
        startDate: activeSubscription.startDate,
        endDate: activeSubscription.endDate,
        autoRenew: activeSubscription.autoRenew,
        paymentMethod: activeSubscription.paymentMethod || "Cartão de Crédito",
      };
    } else if (seller.plan) {
      // Se não há assinatura ativa, usar plano padrão do vendedor
      subscription = {
        id: `default-${seller.id}`,
        planId: seller.planId,
        plan: seller.plan,
        status: "active",
        startDate: user.createdAt,
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
        paymentMethod: seller.plan.price === 0 ? "Gratuito" : "Não configurado",
      };
    }

    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    logger.error("Erro ao buscar assinatura:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// POST /api/sellers/upgrade - Fazer upgrade de plano
router.post("/sellers/upgrade", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { planId } = req.body;

    if (user.type !== "SELLER") {
      return res.status(403).json({
        error: "Acesso negado. Apenas vendedores podem fazer upgrade.",
      });
    }

    if (!planId) {
      return res.status(400).json({
        error: "ID do plano é obrigatório",
      });
    }

    // Buscar o plano
    const { data: plan, error: planError } = await supabase.from("plans").select("*").eq("id", planId).single();

    if (planError || !plan) {
      return res.status(404).json({
        error: "Plano não encontrado",
      });
    }

    // Buscar dados do vendedor
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("*")
      .eq("userId", user.id)
      .single();

    if (sellerError || !seller) {
      return res.status(404).json({
        error: "Vendedor não encontrado",
      });
    }

    // Se é plano gratuito, atualizar diretamente
    if (plan.price === 0) {
      const { error: updateError } = await supabase
        .from("sellers")
        .update({
          planId: planId,
          updatedAt: new Date().toISOString(),
        })
        .eq("userId", user.id);

      if (updateError) {
        throw updateError;
      }

      return res.json({
        success: true,
        message: "Plano atualizado com sucesso",
      });
    }

    // Para planos pagos, usar nossa API de pagamentos
    const paymentUrl = `${process.env.APP_URL}/seller/checkout?planId=${planId}`;

    res.json({
      success: true,
      message: "Redirecionando para pagamento",
      paymentUrl,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
      },
    });
  } catch (error) {
    logger.error("Erro ao fazer upgrade:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

export default router;
