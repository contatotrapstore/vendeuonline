import { createClient } from "@supabase/supabase-js";

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper para criar notificações automáticas
export const createNotification = async (userId, title, message, type = 'INFO', data = null) => {
  try {
    const { data: notification, error } = await supabase
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

    if (error) throw error;
    console.log('✅ Notificação criada no Supabase:', notification);
    return notification;
  } catch (error) {
    console.error('❌ Erro ao criar notificação:', error);
    return null;
  }
};

// Notificações automáticas para eventos do sistema
export const notificationTemplates = {
  // Login
  userLogin: (userName) => ({
    title: "Bem-vindo de volta!",
    message: `Olá ${userName}, você fez login com sucesso na Vendeu Online.`,
    type: "SUCCESS"
  }),

  // Novos pedidos
  newOrder: (orderNumber, storeName) => ({
    title: "Novo pedido recebido!",
    message: `Você recebeu um novo pedido #${orderNumber} na loja ${storeName}.`,
    type: "ORDER"
  }),

  orderStatusUpdate: (orderNumber, status) => {
    const statusMessages = {
      CONFIRMED: "confirmado",
      PROCESSING: "em preparação",
      SHIPPED: "enviado",
      DELIVERED: "entregue",
      CANCELLED: "cancelado"
    };
    
    return {
      title: "Status do pedido atualizado",
      message: `Seu pedido #${orderNumber} foi ${statusMessages[status] || status.toLowerCase()}.`,
      type: status === "DELIVERED" ? "SUCCESS" : "ORDER"
    };
  },

  // Pagamentos
  paymentApproved: (orderNumber, amount) => ({
    title: "Pagamento aprovado!",
    message: `O pagamento de R$ ${amount.toFixed(2)} do pedido #${orderNumber} foi aprovado.`,
    type: "SUCCESS"
  }),

  paymentFailed: (orderNumber) => ({
    title: "Pagamento rejeitado",
    message: `O pagamento do pedido #${orderNumber} foi rejeitado. Verifique os dados de pagamento.`,
    type: "ERROR"
  }),

  // Produtos
  productApproved: (productName) => ({
    title: "Produto aprovado!",
    message: `Seu produto "${productName}" foi aprovado e já está disponível na loja.`,
    type: "SUCCESS"
  }),

  productRejected: (productName, reason) => ({
    title: "Produto rejeitado",
    message: `Seu produto "${productName}" foi rejeitado. Motivo: ${reason}`,
    type: "ERROR"
  }),

  lowStock: (productName, stock) => ({
    title: "Estoque baixo",
    message: `O produto "${productName}" está com estoque baixo (${stock} unidades).`,
    type: "WARNING"
  }),

  // Sistema
  systemMaintenance: (startTime, endTime) => ({
    title: "Manutenção programada",
    message: `O sistema entrará em manutenção das ${startTime} às ${endTime}.`,
    type: "SYSTEM"
  }),

  // Promoções
  promotionAlert: (title, discount) => ({
    title: `Promoção: ${title}`,
    message: `Aproveite ${discount}% de desconto em produtos selecionados!`,
    type: "PROMOTION"
  })
};

// Middleware para criar notificações automáticas
export const autoNotify = {
  onLogin: async (userId, userName) => {
    try {
      const template = notificationTemplates.userLogin(userName);
      return await createNotification(userId, template.title, template.message, template.type);
    } catch (error) {
      console.warn('⚠️ Falha ao criar notificação de login, continuando sem ela:', error.message);
      return null;
    }
  },

  onNewOrder: async (sellerId, orderNumber, storeName) => {
    const template = notificationTemplates.newOrder(orderNumber, storeName);
    return await createNotification(sellerId, template.title, template.message, template.type);
  },

  onOrderStatusUpdate: async (buyerId, orderNumber, status) => {
    const template = notificationTemplates.orderStatusUpdate(orderNumber, status);
    return await createNotification(buyerId, template.title, template.message, template.type);
  },

  onPaymentApproved: async (buyerId, orderNumber, amount) => {
    const template = notificationTemplates.paymentApproved(orderNumber, amount);
    return await createNotification(buyerId, template.title, template.message, template.type);
  },

  onPaymentFailed: async (buyerId, orderNumber) => {
    const template = notificationTemplates.paymentFailed(orderNumber);
    return await createNotification(buyerId, template.title, template.message, template.type);
  },

  onProductApproved: async (sellerId, productName) => {
    const template = notificationTemplates.productApproved(productName);
    return await createNotification(sellerId, template.title, template.message, template.type);
  },

  onProductRejected: async (sellerId, productName, reason) => {
    const template = notificationTemplates.productRejected(productName, reason);
    return await createNotification(sellerId, template.title, template.message, template.type);
  },

  onLowStock: async (sellerId, productName, stock) => {
    const template = notificationTemplates.lowStock(productName, stock);
    return await createNotification(sellerId, template.title, template.message, template.type);
  }
};