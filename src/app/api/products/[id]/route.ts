import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSeller, AuthenticatedRequest } from '@/lib/middleware'

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(10).optional(),
  price: z.number().positive().optional(),
  comparePrice: z.number().positive().optional(),
  categoryId: z.string().optional(),
  subcategory: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  sku: z.string().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive()
  }).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string(),
    isMain: z.boolean().default(false)
  })).optional(),
  specifications: z.array(z.object({
    name: z.string(),
    value: z.string()
  })).optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Buscar produto por ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const product = await prisma.product.findUnique({
      where: {
        id: params.id,
        isActive: true
      },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        specifications: true,
        category: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            rating: true,
            reviewCount: true
          }
        },
        seller: {
          select: {
            id: true,
            storeName: true,
            rating: true
          }
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Erro ao buscar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar produto (apenas o vendedor proprietário)
export const PUT = requireSeller(async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const body = await request.json()
    const validatedData = updateProductSchema.parse(body)
    const user = request.user

    // Verificar se o produto existe e pertence ao vendedor
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: true,
        specifications: true
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    if (existingProduct.sellerId !== user.seller.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verificar categoria se fornecida
    if (validatedData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: validatedData.categoryId }
      })

      if (!category) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 404 }
        )
      }
    }

    // Preparar dados de atualização
    const updateData: any = {
      ...validatedData
    }

    // Remover campos que serão tratados separadamente
    delete updateData.images
    delete updateData.specifications

    // Atualizar produto
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        specifications: true,
        category: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    // Atualizar imagens se fornecidas
    if (validatedData.images) {
      // Deletar imagens existentes
      await prisma.productImage.deleteMany({
        where: { productId: params.id }
      })

      // Criar novas imagens
      await prisma.productImage.createMany({
        data: validatedData.images.map((img, index) => ({
          productId: params.id,
          url: img.url,
          alt: img.alt,
          order: index,
          isMain: img.isMain
        }))
      })
    }

    // Atualizar especificações se fornecidas
    if (validatedData.specifications) {
      // Deletar especificações existentes
      await prisma.productSpecification.deleteMany({
        where: { productId: params.id }
      })

      // Criar novas especificações
      await prisma.productSpecification.createMany({
        data: validatedData.specifications.map(spec => ({
          productId: params.id,
          name: spec.name,
          value: spec.value
        }))
      })
    }

    // Buscar produto atualizado com relacionamentos
    const finalProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        specifications: true,
        category: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    return NextResponse.json(finalProduct)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// DELETE - Deletar produto (apenas o vendedor proprietário)
export const DELETE = requireSeller(async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const user = request.user

    // Verificar se o produto existe e pertence ao vendedor
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    if (existingProduct.sellerId !== user.seller.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Soft delete - marcar como inativo
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    // Atualizar contador de produtos da loja
    await prisma.store.update({
      where: { id: existingProduct.storeId },
      data: {
        productCount: {
          decrement: 1
        }
      }
    })

    return NextResponse.json(
      { message: 'Produto removido com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao deletar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})