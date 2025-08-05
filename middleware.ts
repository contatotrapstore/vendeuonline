import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'

// Rotas que requerem autenticação
const protectedRoutes = [
  '/dashboard',
  '/seller',
  '/buyer',
  '/admin',
  '/profile',
  '/orders',
  '/api/orders',
  '/api/stores',
  '/api/products'
]

// Rotas que requerem tipos específicos de usuário
const roleBasedRoutes = {
  '/seller': ['SELLER', 'ADMIN'],
  '/admin': ['ADMIN'],
  '/buyer': ['BUYER', 'ADMIN'],
  '/api/stores': ['SELLER', 'ADMIN'],
  '/api/products': ['SELLER', 'ADMIN']
}

// Rotas públicas da API que não precisam de autenticação
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/products', // GET público
  '/api/stores' // GET público
]

// Headers de segurança
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;"
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route))
}

function isPublicApiRoute(pathname: string, method: string): boolean {
  // GET requests para produtos e lojas são públicos
  if (method === 'GET' && (pathname.startsWith('/api/products') || pathname.startsWith('/api/stores'))) {
    return true
  }
  
  return publicApiRoutes.some(route => pathname.startsWith(route))
}

function getRequiredRoles(pathname: string): string[] | null {
  for (const [route, roles] of Object.entries(roleBasedRoutes)) {
    if (pathname.startsWith(route)) {
      return roles
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  
  // Criar resposta com headers de segurança
  const response = NextResponse.next()
  
  // Aplicar headers de segurança a todas as respostas
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Verificar se é uma rota da API
  if (pathname.startsWith('/api/')) {
    // Verificar se é uma rota pública da API
    if (isPublicApiRoute(pathname, method)) {
      return response
    }
    
    // Para rotas da API protegidas, verificar autenticação
    try {
      const user = await getUserFromToken(request)
      
      if (!user) {
        return NextResponse.json(
          { error: 'Token de autenticação necessário' },
          { status: 401 }
        )
      }
      
      // Verificar permissões baseadas em role
      const requiredRoles = getRequiredRoles(pathname)
      if (requiredRoles && !requiredRoles.includes(user.type)) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }
      
      // Adicionar informações do usuário aos headers para as API routes
      response.headers.set('x-user-id', user.id)
      response.headers.set('x-user-type', user.type)
      response.headers.set('x-user-email', user.email)
      
      return response
    } catch (error) {
      console.error('Erro na autenticação do middleware:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  }
  
  // Para rotas de páginas, verificar se precisa de autenticação
  if (isProtectedRoute(pathname)) {
    try {
      const user = await getUserFromToken(request)
      
      if (!user) {
        // Redirecionar para login se não autenticado
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
      
      // Verificar permissões baseadas em role
      const requiredRoles = getRequiredRoles(pathname)
      if (requiredRoles && !requiredRoles.includes(user.type)) {
        // Redirecionar para página de acesso negado
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
      
      return response
    } catch (error) {
      console.error('Erro na autenticação do middleware:', error)
      // Em caso de erro, redirecionar para login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  return response
}

// Configurar quais rotas o middleware deve processar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}