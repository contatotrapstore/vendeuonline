import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, type = 'text', data } = body;

    // Validações básicas
    if (!to) {
      return NextResponse.json(
        { error: 'Número de telefone é obrigatório' },
        { status: 400 }
      );
    }

    if (!message && type === 'text') {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória para tipo text' },
        { status: 400 }
      );
    }

    // Verificar se o WhatsApp está configurado
    if (!whatsappService.isConfigured()) {
      return NextResponse.json(
        { error: 'WhatsApp não configurado. Verifique as variáveis de ambiente.' },
        { status: 500 }
      );
    }

    // Formatar número de telefone
    const formattedPhone = whatsappService.formatBrazilianPhone(to);

    let result;

    // Processar diferentes tipos de mensagem
    switch (type) {
      case 'text':
        result = await whatsappService.sendTextMessage(formattedPhone, message);
        break;

      case 'order_confirmation':
        if (!data) {
          return NextResponse.json(
            { error: 'Dados do pedido são obrigatórios' },
            { status: 400 }
          );
        }
        result = await whatsappService.sendOrderConfirmation(formattedPhone, data);
        break;

      case 'payment_confirmation':
        if (!data) {
          return NextResponse.json(
            { error: 'Dados do pagamento são obrigatórios' },
            { status: 400 }
          );
        }
        result = await whatsappService.sendPaymentConfirmation(formattedPhone, data);
        break;

      case 'shipping_update':
        if (!data) {
          return NextResponse.json(
            { error: 'Dados do envio são obrigatórios' },
            { status: 400 }
          );
        }
        result = await whatsappService.sendShippingUpdate(formattedPhone, data);
        break;

      case 'pix_instructions':
        if (!data) {
          return NextResponse.json(
            { error: 'Dados do PIX são obrigatórios' },
            { status: 400 }
          );
        }
        result = await whatsappService.sendPixPaymentInstructions(formattedPhone, data);
        break;

      default:
        return NextResponse.json(
          { error: `Tipo de mensagem '${type}' não suportado` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message_id: result.messages?.[0]?.id,
      wa_id: result.contacts?.[0]?.wa_id,
      result
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    
    // Tratar diferentes tipos de erro
    if (error instanceof Error) {
      if (error.message.includes('WhatsApp API Error')) {
        return NextResponse.json(
          { 
            error: 'Erro na API do WhatsApp',
            details: error.message
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// GET - Verificar status da configuração do WhatsApp
export async function GET() {
  try {
    const isConfigured = whatsappService.isConfigured();
    
    return NextResponse.json({
      configured: isConfigured,
      message: isConfigured 
        ? 'WhatsApp Business API configurado' 
        : 'WhatsApp Business API não configurado'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao verificar configuração' },
      { status: 500 }
    );
  }
}