import { NextRequest, NextResponse } from 'next/server';
import { getPayment } from '@/lib/mercadopago';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook recebido:', body);

    // Verificar se é uma notificação de pagamento
    if (body.type === 'payment') {
      const paymentId = body.data?.id;
      
      if (!paymentId) {
        return NextResponse.json(
          { error: 'ID do pagamento não encontrado' },
          { status: 400 }
        );
      }

      // Buscar detalhes do pagamento
      const paymentDetails = await getPayment(paymentId);
      
      console.log('Detalhes do pagamento:', {
        id: paymentDetails.id,
        status: paymentDetails.status,
        external_reference: paymentDetails.external_reference,
        transaction_amount: paymentDetails.transaction_amount
      });

      // Aqui você pode atualizar o status do pedido no seu banco de dados
      // baseado no status do pagamento
      switch (paymentDetails.status) {
        case 'approved':
          console.log(`Pagamento ${paymentId} aprovado`);
          // Atualizar pedido como pago
          await updateOrderStatus(paymentDetails.external_reference, 'paid');
          break;
          
        case 'pending':
          console.log(`Pagamento ${paymentId} pendente`);
          // Manter pedido como pendente
          await updateOrderStatus(paymentDetails.external_reference, 'pending');
          break;
          
        case 'rejected':
        case 'cancelled':
          console.log(`Pagamento ${paymentId} rejeitado/cancelado`);
          // Marcar pedido como cancelado
          await updateOrderStatus(paymentDetails.external_reference, 'cancelled');
          break;
          
        default:
          console.log(`Status desconhecido: ${paymentDetails.status}`);
      }
    }

    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função para atualizar status do pedido
// Esta é uma implementação simulada - você deve implementar
// a lógica real para atualizar no seu banco de dados
async function updateOrderStatus(
  externalReference: string | undefined, 
  status: 'paid' | 'pending' | 'cancelled'
) {
  if (!externalReference) {
    console.log('External reference não encontrado');
    return;
  }

  try {
    // Aqui você implementaria a atualização no banco de dados
    // Por exemplo, usando Prisma:
    // await prisma.order.update({
    //   where: { id: externalReference },
    //   data: { status }
    // });
    
    console.log(`Pedido ${externalReference} atualizado para status: ${status}`);
    
    // Você também pode enviar notificações por email, SMS, etc.
    if (status === 'paid') {
      // Enviar email de confirmação
      // await sendOrderConfirmationEmail(externalReference);
    }
    
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
  }
}

// Método GET para verificação de saúde do webhook
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Webhook endpoint funcionando' 
  });
}