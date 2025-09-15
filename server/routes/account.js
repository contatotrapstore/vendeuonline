import express from "express";
import { supabase } from "../lib/supabase-client.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac';
    const decoded = jwt.verify(token, jwtSecret);
    
    console.log('🔐 Autenticando usuário:', decoded.userId);
    
    // Buscar dados atualizados do usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      console.error('❌ Erro ao buscar usuário:', error);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    console.log('✅ Usuário autenticado:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    res.status(401).json({ error: 'Token inválido' });
  }
};

// GET /api/account/profile - Buscar perfil do usuário
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = req.user;
    console.log('👤 Buscando perfil para usuário:', user.email);

    // Buscar dados adicionais baseados no tipo de usuário
    let additionalData = {};

    if (user.type === 'SELLER') {
      console.log('🏪 Buscando dados do vendedor...');
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select(`*`)
        .eq('userId', user.id)
        .single();

      if (sellerError) {
        console.error('❌ Erro ao buscar dados do vendedor:', sellerError);
      } else if (seller) {
        console.log('✅ Dados do vendedor encontrados:', seller.storeName);
        additionalData.seller = seller;
      }
    } else if (user.type === 'BUYER') {
      console.log('🛒 Buscando dados do comprador...');
      const { data: buyer, error: buyerError } = await supabase
        .from('buyers')
        .select('*')
        .eq('userId', user.id)
        .single();

      if (buyerError) {
        console.error('❌ Erro ao buscar dados do comprador:', buyerError);
      } else if (buyer) {
        console.log('✅ Dados do comprador encontrados');
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
      ...additionalData
    };

    console.log('✅ Perfil montado com sucesso');

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('❌ Erro ao buscar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// PUT /api/account/profile - Atualizar perfil do usuário
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      phone,
      city,
      state,
      avatar,
      bio,
      cpf,
      birthDate,
      notifications,
      privacy
    } = req.body;

    // Atualizar dados principais do usuário
    const { data: updatedUser, error: userError } = await supabase
      .from('users')
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
        updatedAt: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (userError) {
      console.error('Erro ao atualizar usuário:', userError);
      throw userError;
    }

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      profile: updatedUser
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/sellers/subscription - Buscar assinatura do vendedor
router.get('/sellers/subscription', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (user.type !== 'SELLER') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas vendedores podem acessar assinaturas.'
      });
    }

    // Buscar dados do vendedor com plano
    const { data: seller, error } = await supabase
      .from('sellers')
      .select(`
        *,
        plan:plans(*),
        subscriptions(
          *,
          plan:plans(*)
        )
      `)
      .eq('userId', user.id)
      .single();

    if (error) {
      console.error('Erro ao buscar vendedor:', error);
      throw error;
    }

    // Buscar assinatura ativa
    const activeSubscription = seller.subscriptions?.find(sub => 
      sub.status === 'ACTIVE' || sub.status === 'TRIALING'
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
        paymentMethod: activeSubscription.paymentMethod || "Cartão de Crédito"
      };
    } else if (seller.plan) {
      // Se não há assinatura ativa, usar plano padrão do vendedor
      subscription = {
        id: `default-${seller.id}`,
        planId: seller.planId,
        plan: seller.plan,
        status: 'active',
        startDate: user.createdAt,
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
        paymentMethod: seller.plan.price === 0 ? "Gratuito" : "Não configurado"
      };
    }

    res.json({
      success: true,
      subscription
    });

  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/sellers/upgrade - Fazer upgrade de plano
router.post('/sellers/upgrade', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { planId } = req.body;

    if (user.type !== 'SELLER') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas vendedores podem fazer upgrade.'
      });
    }

    if (!planId) {
      return res.status(400).json({
        error: 'ID do plano é obrigatório'
      });
    }

    // Buscar o plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({
        error: 'Plano não encontrado'
      });
    }

    // Buscar dados do vendedor
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (sellerError || !seller) {
      return res.status(404).json({
        error: 'Vendedor não encontrado'
      });
    }

    // Se é plano gratuito, atualizar diretamente
    if (plan.price === 0) {
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ 
          planId: planId,
          updatedAt: new Date().toISOString()
        })
        .eq('userId', user.id);

      if (updateError) {
        throw updateError;
      }

      return res.json({
        success: true,
        message: 'Plano atualizado com sucesso'
      });
    }

    // Para planos pagos, retornar URL de pagamento mock
    // Em produção, aqui seria integrado com ASAAS ou outro gateway
    const paymentUrl = `https://checkout.example.com/plan/${planId}?user=${user.id}`;

    res.json({
      success: true,
      message: 'Redirecionando para pagamento',
      paymentUrl,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price
      }
    });

  } catch (error) {
    console.error('Erro ao fazer upgrade:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

export default router;