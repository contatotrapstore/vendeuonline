import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware'

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  trackingCode: z.string().optional(),
  notes: z.string().optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Buscar pedido por ID
export const GET = requireAuth()(async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const user = request.user

    const where: any = { id: params.id }

    // Filtrar por tipo de usuário
    if (user.type === 'BUYER') {
      where.buyerId = user.id
    } else if (user.type === 'SELLER') {
      where.sellerId = user.seller.id
    } else if (user.type !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const order = await prisma.order.findUnique({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  where: { isMain: true },
                  take: 1
                },
                seller: {
                  select: {
                    id: true,
                    storeName: true
                  }
                }
              }
            }
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true
          }
        },
        shippingAddress: true,
        billingAddress: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// PUT - Atualizar status do pedido
export const PUT = requireAuth()(async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const body = await request.json()
    const validatedData = updateOrderSchema.parse(body)
    const user = request.user

    // Verificar se o pedido existe
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        store: true
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissões
    let canUpdate = false
    
    if (user.type === 'ADMIN') {
      canUpdate = true
    } else if (user.type === 'SELLER' && existingOrder.sellerId === user.seller.id) {
      canUpdate = true
    } else if (user.type === 'BUYER' && existingOrder.buyerId === user.id) {
      // Compradores só podem cancelar pedidos pendentes
      if (validatedData.status === 'CANCELLED' && existingOrder.status === 'PENDING') {
        canUpdate = true
      }
    }

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Validar transições de status
    if (validatedData.status) {
      const validTransitions: Record<string, string[]> = {
        'PENDING': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': ['PROCESSING', 'CANCELLED'],
        'PROCESSING': ['SHIPPED', 'CANCELLED'],
        'SHIPPED': ['DELIVERED'],
        'DELIVERED': ['REFUNDED'],
        'CANCELLED': [],
        'REFUNDED': []
      }

      const allowedStatuses = validTransitions[existingOrder.status] || []
      
      if (!allowedStatuses.includes(validatedData.status)) {
        return NextResponse.json(
          { error: `Não é possível alterar status de ${existingOrder.status} para ${validatedData.status}` },
          { status: 400 }
        )
      }
    }

    // Atualizar pedido
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  where: { isMain: true },
                  take: 1
                }
              }
            }
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        shippingAddress: true,
        billingAddress: true
      }
    })

    // Se o pedido foi cancelado, devolver estoque
    if (validatedData.status === 'CANCELLED' && existingOrder.status !== 'CANCELLED') {
      for (const item of existingOrder.items || []) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity
            },
            salesCount: {
              decrement: item.quantity
            }
          }
        })
      }

      // Atualizar contador de vendas da loja
      await prisma.store.update({
        where: { id: existingOrder.storeId },
        data: {
          salesCount: {
            decrement: 1
          }
        }
      })
    }

    // Criar notificação para o usuário relevante
    const notificationData: any = {
      type: 'ORDER_UPDATED',
      title: 'Status do pedido atualizado',
      message: `Seu pedido #${params.id.slice(-8)} foi atualizado para ${validatedData.status || existingOrder.status}`,
      data: {
        orderId: params.id,
        newStatus: validatedData.status || existingOrder.status
      }
    }

    // Notificar comprador
    if (user.type !== 'BUYER') {
      await prisma.notification.create({
        data: {
          ...notificationData,
          userId: existingOrder.buyerId
        }
      })
    }

    // Notificar vendedor se a atualização foi feita pelo comprador ou admin
    if (user.type !== 'SELLER') {
      const seller = await prisma.seller.findUnique({
        where: { id: existingOrder.sellerId }
      })
      
      if (seller) {
        await prisma.notification.create({
          data: {
            ...notificationData,
            userId: seller.userId,
            title: 'Pedido atualizado',
            message: `O pedido #${params.id.slice(-8)} foi atualizado para ${validatedData.status || existingOrder.status}`
          }
        })
      }
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar pedido:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})