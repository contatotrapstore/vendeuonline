import { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
import jwt from 'jsonwebtoken'

const createStoreSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  address: z.string().min(5, 'Endereço é obrigatório'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  zipCode: z.string().min(8, 'CEP inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
  whatsapp: z.string().optional(),
  website: z.string().url().optional(),
  category: z.string().min(2, 'Categoria é obrigatória'),
  socialMedia: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional()
  }).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional()
})

const querySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('12'),
  search: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  isVerified: z.string().transform(val => val === 'true').optional(),
  sortBy: z.enum(['name', 'rating', 'createdAt', 'salesCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Função para verificar token JWT
function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return decoded
  } catch {
    return null
  }
}

// Função para obter usuário autenticado
async function getAuthenticatedUser(req: VercelRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  if (!decoded) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: {
      seller: {
        include: {
          store: true
        }
      }
    }
  })

  return user
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      // Listar lojas com filtros e paginação
      const query = querySchema.parse(req.query)

      const where: any = {
        isActive: true
      }

      // Filtros
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { category: { contains: query.search, mode: 'insensitive' } }
        ]
      }

      if (query.category) {
        where.category = { contains: query.category, mode: 'insensitive' }
      }

      if (query.city) {
        where.city = { contains: query.city, mode: 'insensitive' }
      }

      if (query.state) {
        where.state = { contains: query.state, mode: 'insensitive' }
      }

      if (query.isVerified !== undefined) {
        where.isVerified = query.isVerified
      }

      // Ordenação
      const orderBy: any = {}
      orderBy[query.sortBy] = query.sortOrder

      // Paginação
      const skip = (query.page - 1) * query.limit

      const [stores, total] = await Promise.all([
        prisma.store.findMany({
          where,
          include: {
            seller: {
              select: {
                id: true,
                storeName: true,
                rating: true,
                totalSales: true
              }
            },
            products: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                price: true,
                images: {
                  where: { isMain: true },
                  take: 1
                }
              },
              take: 4,
              orderBy: {
                salesCount: 'desc'
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
          },
          orderBy,
          skip,
          take: query.limit
        }),
        prisma.store.count({ where })
      ])

      const totalPages = Math.ceil(total / query.limit)

      return res.status(200).json({
        stores,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1
        }
      })
    }

    if (req.method === 'POST') {
      // Criar nova loja (apenas vendedores)
      const user = await getAuthenticatedUser(req)
      if (!user) {
        return res.status(401).json({ error: 'Token inválido ou expirado' })
      }

      if (!user.seller) {
        return res.status(403).json({ error: 'Acesso negado. Apenas vendedores podem criar lojas.' })
      }

      const validatedData = createStoreSchema.parse(req.body)

      // Verificar se o vendedor já tem uma loja
      const existingStore = await prisma.store.findUnique({
        where: { sellerId: user.seller.id }
      })

      if (existingStore) {
        return res.status(400).json({ error: 'Vendedor já possui uma loja' })
      }

      // Gerar slug único
      const baseSlug = validatedData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      let slug = baseSlug
      let counter = 1
      
      while (await prisma.store.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      // Criar loja
      const store = await prisma.store.create({
        data: {
          ...validatedData,
          slug,
          sellerId: user.seller.id,
          socialMedia: validatedData.socialMedia || {}
        },
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

      return res.status(201).json(store)
    }

    return res.status(405).json({ error: 'Método não permitido' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.issues
      })
    }

    console.error('Erro na API de lojas:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}