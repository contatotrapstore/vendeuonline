import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware';

// GET /api/plans/[id] - Buscar plano por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      }
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...plan,
        activeSubscriptions: plan._count.subscriptions
      }
    });
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/plans/[id] - Deletar plano (apenas admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação e permissão de admin
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const user = authResult.user;
    if (user.type !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Verificar se o plano existe
    const existingPlan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      }
    });

    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se há assinaturas ativas
    if (existingPlan._count.subscriptions > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não é possível deletar um plano com assinaturas ativas'
        },
        { status: 400 }
      );
    }

    await prisma.plan.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Plano deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar plano:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}