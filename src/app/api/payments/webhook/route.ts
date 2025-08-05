import { NextRequest, NextResponse } from 'next/server';
import { getPayment } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Processar apenas notificações de pagamento
    if (type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = data.id;
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID not found' }, { status: 400 });
    }

    // Buscar informações do pagamento no Mercado Pago
    const paymentInfo = await getPayment(paymentId.toString());
    if (!paymentInfo) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const externalReference = paymentInfo.external_reference;
    if (!externalReference || !externalReference.startsWith('subscription_')) {
      return NextResponse.json({ received: true });
    }

    // Extrair informações da referência externa
    const [, userId, planId] = externalReference.split('_');
    
    // Buscar a assinatura correspondente
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('status', 'pending')
      .single();

    if (subscriptionError || !subscription) {
      console.error('Assinatura não encontrada:', subscriptionError);
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Atualizar status da assinatura baseado no status do pagamento
    let newStatus = 'pending';
    let shouldUpdateUserPlan = false;

    switch (paymentInfo.status) {
      case 'approved':
        newStatus = 'active';
        shouldUpdateUserPlan = true;
        break;
      case 'rejected':
      case 'cancelled':
        newStatus = 'cancelled';
        break;
      case 'pending':
      case 'in_process':
        newStatus = 'pending';
        break;
      default:
        newStatus = 'pending';
    }

    // Atualizar assinatura
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: newStatus,
        payment_id: paymentId.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Erro ao atualizar assinatura:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    // Se o pagamento foi aprovado, atualizar o plano do usuário
    if (shouldUpdateUserPlan) {
      // Buscar informações do plano
      const { data: plan } = await supabase
        .from('plans')
        .select('slug')
        .eq('id', planId)
        .single();

      if (plan) {
        // Atualizar plano do usuário
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            plan: plan.slug,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (userUpdateError) {
          console.error('Erro ao atualizar plano do usuário:', userUpdateError);
        }

        // Cancelar outras assinaturas ativas do usuário
        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('status', 'active')
          .neq('id', subscription.id);

        if (cancelError) {
          console.error('Erro ao cancelar outras assinaturas:', cancelError);
        }
      }
    }

    console.log(`Webhook processado: Pagamento ${paymentId}, Status: ${newStatus}`);
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Erro no webhook de pagamentos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Permitir apenas POST
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}