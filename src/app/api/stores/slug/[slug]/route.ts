import { NextRequest, NextResponse } from '@/types/api'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    slug: string
  }
}

// GET - Buscar loja por slug
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = params

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug da loja é obrigatório' },
        { status: 400 }
      )
    }

    const store = await prisma.store.findUnique({
      where: { 
        slug,
        isActive: true 
      },
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
            rating: true,
            totalSales: true,
            plan: true,
            // isVerified: true, // Campo removido do select
            user: {
              select: {
                name: true,
                email: true,
                createdAt: true
              }
            }
          }
        },
        products: {
          where: { isActive: true },
          include: {
            images: {
              where: { isMain: true },
              take: 1
            },
            category: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                reviews: true
              }
            }
          },
          orderBy: {
            salesCount: 'desc'
          },
          take: 20
        },
        reviews: {
          include: {
            user: {
              select: {
                name: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            products: {
              where: { isActive: true }
            },
            orders: true,
            reviews: true
          }
        }
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Calcular estatísticas
    const avgRating = await prisma.review.aggregate({
      where: { storeId: store.id },
      _avg: {
        rating: true
      }
    })

    const storeWithStats = {
      ...store,
      avgRating: avgRating._avg.rating || 0,
      totalProducts: store._count?.products || 0,
      totalOrders: store._count?.orders || 0,
      totalReviews: store._count?.reviews || 0
    }

    return NextResponse.json(storeWithStats)
  } catch (error) {
    console.error('Erro ao buscar loja por slug:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}