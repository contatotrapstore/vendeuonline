import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSellerOrAdmin, AuthenticatedRequest } from '@/lib/middleware'

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d')
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Estatísticas da loja (apenas proprietário ou admin)
export const GET = requireSellerOrAdmin(async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const { period } = querySchema.parse(Object.fromEntries(searchParams))
    const user = request.user

    if (!id) {
      return NextResponse.json(
        { error: 'ID da loja é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar loja e verificar permissões
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        seller: true
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissões (apenas proprietário ou admin)
    if (user.type !== 'ADMIN' && store.sellerId !== user.seller?.id) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar estatísticas desta loja' },
        { status: 403 }
      )
    }

    // Calcular data de início baseada no período
    const now = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Buscar estatísticas em paralelo
    const [orders, products, reviews, revenue] = await Promise.all([
      // Pedidos no período
      prisma.order.findMany({
        where: {
          storeId: id,
          createdAt: {
            gte: startDate
          }
        },
        include: {
          items: true
        }
      }),
      
      // Produtos ativos
      prisma.product.findMany({
        where: {
          storeId: id,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          salesCount: true,
          images: {
            where: { isMain: true },
            take: 1
          }
        },
        orderBy: {
          salesCount: 'desc'
        },
        take: 10
      }),
      
      // Avaliações no período
      prisma.review.findMany({
        where: {
          storeId: id,
          createdAt: {
            gte: startDate
          }
        }
      }),
      
      // Receita total no período
      prisma.order.aggregate({
        where: {
          storeId: id,
          status: 'DELIVERED',
          createdAt: {
            gte: startDate
          }
        },
        _sum: {
          total: true
        }
      })
    ])

    // Calcular métricas
    const totalOrders = orders.length
    const totalRevenue = revenue._sum.total || 0
    const totalItems = orders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    )
    
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0

    // Agrupar pedidos por status
    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Agrupar vendas por dia (últimos 30 dias para gráfico)
    const salesByDay = []
    const last30Days = new Date()
    last30Days.setDate(now.getDate() - 30)
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(now.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(date)
      nextDate.setDate(date.getDate() + 1)
      
      const dayOrders = orders.filter(order => 
        order.createdAt >= date && order.createdAt < nextDate
      )
      
      const dayRevenue = dayOrders
        .filter(order => order.status === 'DELIVERED')
        .reduce((sum, order) => sum + order.total, 0)
      
      salesByDay.push({
        date: date.toISOString().split('T')[0],
        orders: dayOrders.length,
        revenue: dayRevenue
      })
    }

    // Produtos com baixo estoque (menos de 10 unidades)
    const lowStockProducts = products.filter(product => product.stock < 10)

    const stats = {
      period,
      summary: {
        totalOrders,
        totalRevenue,
        totalItems,
        avgOrderValue,
        avgRating,
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length
      },
      ordersByStatus,
      salesByDay,
      topProducts: products.slice(0, 5),
      lowStockProducts,
      recentReviews: reviews.slice(-5).reverse()
    }

    return NextResponse.json(stats)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao buscar estatísticas da loja:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})