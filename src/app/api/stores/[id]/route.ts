import { ApiRequest as NextRequest, ApiResponse as NextResponse } from '@/types/api'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSeller, requireSellerOrAdmin, AuthenticatedRequest } from '@/lib/middleware'

const updateStoreSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').optional(),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  address: z.string().min(5, 'Endereço é obrigatório').optional(),
  city: z.string().min(2, 'Cidade é obrigatória').optional(),
  state: z.string().min(2, 'Estado é obrigatório').optional(),
  zipCode: z.string().min(8, 'CEP inválido').optional(),
  phone: z.string().min(10, 'Telefone inválido').optional(),
  email: z.string().email('Email inválido').optional(),
  whatsapp: z.string().optional(),
  website: z.string().url().optional(),
  category: z.string().min(2, 'Categoria é obrigatória').optional(),
  socialMedia: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional()
  }).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  isActive: z.boolean().optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Buscar loja por ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID da loja é obrigatório' },
        { status: 400 }
      )
    }

    const store = await prisma.store.findUnique({
      where: { 
        id,
        isActive: true 
      },
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
            rating: true,
            totalSales: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true
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
                name: true
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
      where: { storeId: id },
      _avg: {
        rating: true
      }
    })

    const storeWithStats = {
      ...store,
      avgRating: avgRating._avg.rating || 0,
      totalProducts: (store as any)._count.products,
      totalOrders: (store as any)._count.orders,
      totalReviews: (store as any)._count.reviews
    }

    return NextResponse.json(storeWithStats)
  } catch (error) {
    console.error('Erro ao buscar loja:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar loja (apenas proprietário ou admin)
const updateStoreHandler = async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const { id } = params
    const body = await request.json()
    const validatedData = updateStoreSchema.parse(body)
    const user = request.user

    if (!id) {
      return NextResponse.json(
        { error: 'ID da loja é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar loja existente
    const existingStore = await prisma.store.findUnique({
      where: { id },
      include: {
        seller: true
      }
    })

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissões (apenas proprietário ou admin)
    if (user.type !== 'ADMIN' && existingStore.sellerId !== user.seller?.id) {
      return NextResponse.json(
        { error: 'Sem permissão para atualizar esta loja' },
        { status: 403 }
      )
    }

    // Se o nome mudou, gerar novo slug
    let updateData: any = { ...validatedData }
    
    if (validatedData.name && validatedData.name !== existingStore.name) {
      const baseSlug = validatedData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      let slug = baseSlug
      let counter = 1
      
      while (await prisma.store.findFirst({ 
        where: { 
          slug,
          id: { not: id }
        } 
      })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }
      
      updateData.slug = slug
    }

    // Atualizar loja
    const updatedStore = await prisma.store.update({
      where: { id },
      data: updateData,
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
            rating: true,
            totalSales: true
          }
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

    return NextResponse.json(updatedStore)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar loja:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Desativar loja (soft delete - apenas proprietário ou admin)
const deleteStoreHandler = async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const { id } = params
    const user = request.user

    if (!id) {
      return NextResponse.json(
        { error: 'ID da loja é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar loja existente
    const existingStore = await prisma.store.findUnique({
      where: { id },
      include: {
        seller: true
      }
    })

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissões (apenas proprietário ou admin)
    if (user.type !== 'ADMIN' && existingStore.sellerId !== user.seller?.id) {
      return NextResponse.json(
        { error: 'Sem permissão para deletar esta loja' },
        { status: 403 }
      )
    }

    // Soft delete - desativar loja e produtos
    await prisma.$transaction([
      // Desativar loja
      prisma.store.update({
        where: { id },
        data: { isActive: false }
      }),
      // Desativar todos os produtos da loja
      prisma.product.updateMany({
        where: { storeId: id },
        data: { isActive: false }
      })
    ])

    return NextResponse.json(
      { message: 'Loja desativada com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao deletar loja:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Exports com middleware de autenticação
export const PUT = requireSellerOrAdmin((request: AuthenticatedRequest) => {
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 1]
  return updateStoreHandler(request, { params: { id } })
})

export const DELETE = requireSellerOrAdmin((request: AuthenticatedRequest) => {
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 1]
  return deleteStoreHandler(request, { params: { id } })
})