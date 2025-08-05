import { http, HttpResponse } from 'msw'
import { z } from 'zod'

// Schemas de validação
const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  userType: z.enum(['buyer', 'seller']),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  storeName: z.string().optional(),
  storeDescription: z.string().optional(),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  category: z.string().optional()
})

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

// Simulação de banco de dados em memória
let users: any[] = []
let currentUserId = 1

// Função para gerar token simulado
function generateToken(userId: number) {
  return `mock-token-${userId}-${Date.now()}`
}

// Função para simular hash de senha
function hashPassword(password: string) {
  return `hashed-${password}`
}

// Função para verificar senha
function verifyPassword(password: string, hashedPassword: string) {
  return hashedPassword === `hashed-${password}`
}

export const handlers = [
  // Registro de usuário
  http.post('/api/auth/register', async ({ request }) => {
    try {
      const body = await request.json()
      
      // Validar dados
      const validatedData = registerSchema.parse(body)
      
      // Verificar se email já existe
      const existingUser = users.find(user => user.email === validatedData.email)
      if (existingUser) {
        return HttpResponse.json(
          { error: 'Email já está em uso' },
          { status: 400 }
        )
      }
      
      // Criar novo usuário
      const newUser = {
        id: currentUserId++,
        name: validatedData.name,
        email: validatedData.email,
        password: hashPassword(validatedData.password),
        userType: validatedData.userType,
        phone: validatedData.phone,
        city: validatedData.city,
        state: validatedData.state,
        storeName: validatedData.storeName,
        storeDescription: validatedData.storeDescription,
        cnpj: validatedData.cnpj,
        address: validatedData.address,
        zipCode: validatedData.zipCode,
        category: validatedData.category,
        createdAt: new Date().toISOString(),
        isActive: true
      }
      
      users.push(newUser)
      
      // Gerar token
      const token = generateToken(newUser.id)
      
      // Retornar resposta sem a senha
      const { password, ...userWithoutPassword } = newUser
      
      return HttpResponse.json({
        success: true,
        user: userWithoutPassword,
        token
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return HttpResponse.json(
          { error: 'Dados inválidos', details: error.issues },
          { status: 400 }
        )
      }
      
      return HttpResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  }),
  
  // Login de usuário
  http.post('/api/auth/login', async ({ request }) => {
    try {
      const body = await request.json()
      
      // Validar dados
      const validatedData = loginSchema.parse(body)
      
      // Buscar usuário
      const user = users.find(u => u.email === validatedData.email)
      if (!user) {
        return HttpResponse.json(
          { error: 'Email ou senha incorretos' },
          { status: 401 }
        )
      }
      
      // Verificar senha
      if (!verifyPassword(validatedData.password, user.password)) {
        return HttpResponse.json(
          { error: 'Email ou senha incorretos' },
          { status: 401 }
        )
      }
      
      // Gerar token
      const token = generateToken(user.id)
      
      // Retornar resposta sem a senha
      const { password, ...userWithoutPassword } = user
      
      return HttpResponse.json({
        success: true,
        user: userWithoutPassword,
        token
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return HttpResponse.json(
          { error: 'Dados inválidos', details: error.issues },
          { status: 400 }
        )
      }
      
      return HttpResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  }),
  
  // Verificar token
  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    
    // Extrair ID do usuário do token simulado
    const tokenMatch = token.match(/mock-token-(\d+)-/)
    if (!tokenMatch) {
      return HttpResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }
    
    const userId = parseInt(tokenMatch[1])
    const user = users.find(u => u.id === userId)
    
    if (!user) {
      return HttpResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }
    
    // Retornar usuário sem a senha
    const { password, ...userWithoutPassword } = user
    
    return HttpResponse.json({
      success: true,
      user: userWithoutPassword
    })
  })
]