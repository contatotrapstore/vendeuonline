import { NextRequest, NextResponse } from '@/types/api';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware';
import { z } from 'zod';
import { SellerPlan } from '@prisma/client';

const subscriptionSchema = z.object({
  planId: z.string().min(1, 'ID do plano é obrigatório'),
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BOLETO', 'WHATSAPP']).optional()
});

// GET /api/subscriptions - Buscar assinatura do usuário logado
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const user = authResult.user;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      },
      include: {
        plan: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Criar nova assinatura
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const body = await request.json();
    const validatedData = subscriptionSchema.parse(body);

    // Verificar se o plano existe e está ativo
    const plan = await prisma.plan.findFirst({
      where: {
        id: validatedData.planId,
        isActive: true
      }
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado ou inativo' },
        { status: 404 }
      );
    }

    // Verificar se o usuário já tem uma assinatura ativa
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      }
    });

    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuário já possui uma assinatura ativa'
        },
        { status: 400 }
      );
    }

    // Calcular data de expiração baseada no período do plano
    const now = new Date();
    const endDate = new Date(now);
    
    switch (plan.billingPeriod) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'lifetime':
        endDate.setFullYear(endDate.getFullYear() + 100); // 100 anos para lifetime
        break;
    }

    // Criar assinatura
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: validatedData.planId,
        status: plan.price > 0 ? 'PENDING' : 'ACTIVE', // Plano gratuito fica ativo imediatamente
        endDate,
        paymentMethod: validatedData.paymentMethod
      },
      include: {
        plan: true
      }
    });

    // Se for plano gratuito, atualizar o plano do vendedor
    if (plan.price === 0) {
      await prisma.seller.update({
        where: { userId: user.id },
        data: {
          plan: plan.slug.toUpperCase() as SellerPlan
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: subscription,
        message: plan.price > 0 
          ? 'Assinatura criada. Aguardando pagamento.' 
          : 'Assinatura ativada com sucesso!'
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: error.issues
        },
        { status: 400 }
      );
    }

    console.error('Erro ao criar assinatura:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

// PUT /api/subscriptions - Cancelar assinatura
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const user = authResult.user;

    // Buscar assinatura ativa do usuário
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      }
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma assinatura ativa encontrada' },
        { status: 404 }
      );
    }

    // Cancelar assinatura
    const cancelledSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED'
      },
      include: {
        plan: true
      }
    });

    // Voltar vendedor para plano gratuito
    await prisma.seller.update({
      where: { userId: user.id },
      data: {
        plan: SellerPlan.GRATUITO
      }
    });

    return NextResponse.json({
      success: true,
      data: cancelledSubscription,
      message: 'Assinatura cancelada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}