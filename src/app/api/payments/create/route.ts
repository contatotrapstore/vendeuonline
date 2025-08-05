import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';
import { createPaymentSchema } from '@/lib/validation';
import { createPreference } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);
    const { planId, paymentMethod } = validatedData;
    const userId = authResult.user.id;

    // Buscar informações do plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o usuário já tem uma assinatura ativa
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Usuário já possui uma assinatura ativa' },
        { status: 400 }
      );
    }

    // Criar preferência de pagamento no Mercado Pago
    const preferenceData = {
      items: [
        {
          id: plan.id,
          title: `Plano ${plan.name} - Vendeu Online`,
          description: `Assinatura mensal do plano ${plan.name}`,
          unit_price: plan.price,
          quantity: 1,
          currency_id: 'BRL'
        }
      ],
      payer: {
        email: authResult.user.email
      },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: paymentMethod === 'credit_card' ? 12 : 1
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/payment/pending`
      },
      auto_return: 'approved',
      external_reference: `subscription_${userId}_${planId}_${Date.now()}`,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
      metadata: {
        user_id: userId,
        plan_id: planId,
        type: 'subscription'
      }
    };

    const preference = await createPreference(preferenceData);

    if (!preference) {
      return NextResponse.json(
        { error: 'Erro ao criar preferência de pagamento' },
        { status: 500 }
      );
    }

    // Criar registro de assinatura pendente
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        payment_reference: preference.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Erro ao criar assinatura:', subscriptionError);
      return NextResponse.json(
        { error: 'Erro ao criar assinatura' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      subscription_id: subscription.id
    });

  } catch (error) {
    console.error('Erro na API de pagamentos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}