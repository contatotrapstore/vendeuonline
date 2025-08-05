import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import { supabase } from '@/lib/supabase';
import { getPayment } from '@/lib/mercadopago';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscription_id');
    const paymentId = searchParams.get('payment_id');
    const userId = authResult.user.id;

    if (!subscriptionId && !paymentId) {
      return NextResponse.json(
        { error: 'subscription_id ou payment_id é obrigatório' },
        { status: 400 }
      );
    }

    let subscription;

    if (subscriptionId) {
      // Buscar assinatura por ID
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans (
            id,
            name,
            slug,
            price,
            features
          )
        `)
        .eq('id', subscriptionId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Assinatura não encontrada' },
          { status: 404 }
        );
      }

      subscription = data;
    } else if (paymentId) {
      // Buscar assinatura por payment_id
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans (
            id,
            name,
            slug,
            price,
            features
          )
        `)
        .eq('payment_id', paymentId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Assinatura não encontrada' },
          { status: 404 }
        );
      }

      subscription = data;
    }

    // Se há payment_id, buscar informações atualizadas do Mercado Pago
    let paymentInfo = null;
    if (subscription.payment_id) {
      try {
        paymentInfo = await getPayment(subscription.payment_id);
      } catch (error) {
        console.error('Erro ao buscar pagamento no Mercado Pago:', error);
      }
    }

    // Verificar se o status precisa ser atualizado
    if (paymentInfo && paymentInfo.status) {
      let newStatus = subscription.status;
      
      switch (paymentInfo.status) {
        case 'approved':
          if (subscription.status === 'pending') {
            newStatus = 'active';
          }
          break;
        case 'rejected':
        case 'cancelled':
          if (subscription.status === 'pending') {
            newStatus = 'cancelled';
          }
          break;
      }

      // Atualizar status se necessário
      if (newStatus !== subscription.status) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (!updateError) {
          subscription.status = newStatus;
        }
      }
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plans,
        expires_at: subscription.expires_at,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at
      },
      payment: paymentInfo ? {
        id: paymentInfo.id,
        status: paymentInfo.status,
        status_detail: paymentInfo.status_detail,
        payment_method_id: paymentInfo.payment_method_id,
        payment_type_id: paymentInfo.payment_type_id,
        transaction_amount: paymentInfo.transaction_amount,
        date_created: paymentInfo.date_created,
        date_approved: paymentInfo.date_approved
      } : null
    });

  } catch (error) {
    console.error('Erro na API de status de pagamentos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}