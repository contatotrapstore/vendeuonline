interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

class WhatsAppService {
  private baseUrl: string;
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  }

  private async sendRequest(endpoint: string, data: any): Promise<WhatsAppResponse> {
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    const data = {
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''), // Remove caracteres não numéricos
      type: 'text',
      text: {
        body: message
      }
    };

    return this.sendRequest(`${this.phoneNumberId}/messages`, data);
  }

  async sendOrderConfirmation(to: string, orderData: {
    orderId: string;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    paymentMethod: string;
  }): Promise<WhatsAppResponse> {
    const itemsList = orderData.items
      .map(item => `• ${item.name} (${item.quantity}x) - R$ ${item.price.toFixed(2)}`)
      .join('\n');

    const message = `🎉 *Pedido Confirmado!*

Olá ${orderData.customerName}!

Seu pedido #${orderData.orderId} foi confirmado com sucesso!

📦 *Itens do pedido:*
${itemsList}

💰 *Total:* R$ ${orderData.total.toFixed(2)}
💳 *Pagamento:* ${orderData.paymentMethod}

📱 Em breve você receberá informações sobre o envio.

Obrigado por comprar conosco! 🛒`;

    return this.sendTextMessage(to, message);
  }

  async sendPaymentConfirmation(to: string, paymentData: {
    orderId: string;
    customerName: string;
    amount: number;
    paymentMethod: string;
  }): Promise<WhatsAppResponse> {
    const message = `✅ *Pagamento Confirmado!*

Olá ${paymentData.customerName}!

Recebemos o pagamento do seu pedido #${paymentData.orderId}.

💰 *Valor:* R$ ${paymentData.amount.toFixed(2)}
💳 *Método:* ${paymentData.paymentMethod}

🚚 Agora vamos preparar seu pedido para envio!

Obrigado pela confiança! 🙏`;

    return this.sendTextMessage(to, message);
  }

  async sendShippingUpdate(to: string, shippingData: {
    orderId: string;
    customerName: string;
    trackingCode?: string;
    carrier?: string;
    estimatedDelivery?: string;
  }): Promise<WhatsAppResponse> {
    let message = `📦 *Pedido Enviado!*

Olá ${shippingData.customerName}!

Seu pedido #${shippingData.orderId} foi enviado!`;

    if (shippingData.trackingCode) {
      message += `

🔍 *Código de rastreamento:* ${shippingData.trackingCode}`;
    }

    if (shippingData.carrier) {
      message += `
📮 *Transportadora:* ${shippingData.carrier}`;
    }

    if (shippingData.estimatedDelivery) {
      message += `
📅 *Previsão de entrega:* ${shippingData.estimatedDelivery}`;
    }

    message += `

🏠 Acompanhe a entrega e fique atento!

Qualquer dúvida, estamos aqui! 📱`;

    return this.sendTextMessage(to, message);
  }

  async sendPixPaymentInstructions(to: string, pixData: {
    customerName: string;
    orderId: string;
    amount: number;
    qrCode: string;
    expirationTime?: string;
  }): Promise<WhatsAppResponse> {
    let message = `💳 *Pagamento PIX*

Olá ${pixData.customerName}!

Para finalizar seu pedido #${pixData.orderId}, realize o pagamento PIX:

💰 *Valor:* R$ ${pixData.amount.toFixed(2)}

🔗 *Código PIX:*
${pixData.qrCode}

📱 Copie o código acima e cole no seu app do banco ou escaneie o QR Code no site.`;

    if (pixData.expirationTime) {
      message += `

⏰ *Válido até:* ${pixData.expirationTime}`;
    }

    message += `

✅ Após o pagamento, você receberá a confirmação automaticamente!

Dúvidas? Estamos aqui para ajudar! 🤝`;

    return this.sendTextMessage(to, message);
  }

  async sendCustomMessage(to: string, message: string): Promise<WhatsAppResponse> {
    return this.sendTextMessage(to, message);
  }

  // Método para verificar se o WhatsApp está configurado
  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  // Método para formatar número de telefone brasileiro
  formatBrazilianPhone(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Se não tem código do país, adiciona 55 (Brasil)
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return '55' + cleaned.substring(1);
    }
    
    if (cleaned.length === 11) {
      return '55' + cleaned;
    }
    
    if (cleaned.length === 10) {
      return '55' + cleaned;
    }
    
    // Se já tem código do país
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return cleaned;
    }
    
    return cleaned;
  }
}

// Instância singleton
export const whatsappService = new WhatsAppService();

// Funções de conveniência
export const sendOrderConfirmation = (to: string, orderData: any) => 
  whatsappService.sendOrderConfirmation(to, orderData);

export const sendPaymentConfirmation = (to: string, paymentData: any) => 
  whatsappService.sendPaymentConfirmation(to, paymentData);

export const sendShippingUpdate = (to: string, shippingData: any) => 
  whatsappService.sendShippingUpdate(to, shippingData);

export const sendPixPaymentInstructions = (to: string, pixData: any) => 
  whatsappService.sendPixPaymentInstructions(to, pixData);

export const sendCustomMessage = (to: string, message: string) => 
  whatsappService.sendCustomMessage(to, message);

export default whatsappService;