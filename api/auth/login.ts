import { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

function generateToken(payload: any): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret'
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

function createAuthResponse(user: any, token: string) {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type,
      city: user.city,
      state: user.state,
      phone: user.phone,
      buyer: user.buyer,
      seller: user.seller,
      admin: user.admin
    },
    token
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { email, password } = loginSchema.parse(req.body)

    // Buscar usuário por email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        buyer: true,
        seller: {
          include: {
            store: true
          }
        },
        admin: true
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Gerar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      type: user.type
    })

    return res.status(200).json(createAuthResponse(user, token))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.issues
      })
    }

    console.error('Erro no login:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  } finally {
    await prisma.$disconnect()
  }
}