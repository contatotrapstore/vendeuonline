// Middleware compatível com Edge Runtime
// Usando apenas Web APIs padrão

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
const roleBasedRoutes: Record<string, string[]> = {
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

// Função simples para decodificar JWT sem bibliotecas externas
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    // Decodificar o payload (segunda parte)
    const payload = parts[1]
    // Adicionar padding se necessário
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4)
    const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

// Verificação básica de token (sem validação de assinatura)
function verifyTokenBasic(token: string): any {
  const payload = decodeJWT(token)
  if (!payload) {
    return null
  }
  
  // Verificar se o token não expirou
  if (payload.exp && payload.exp < Date.now() / 1000) {
    return null
  }
  
  return payload
}

export async function middleware(request: Request) {
  const url = new URL(request.url)
  const pathname = url.pathname
  const method = request.method
  
  // Criar resposta com headers de segurança
  const response = new Response(null, {
    status: 200,
    headers: new Headers()
  })
  
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
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Token de autenticação necessário' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      const token = authHeader.substring(7)
      const payload = verifyTokenBasic(token)
      
      if (!payload || !payload.userId) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Verificar permissões baseadas em role
      const requiredRoles = getRequiredRoles(pathname)
      if (requiredRoles && !requiredRoles.includes(payload.type)) {
        return new Response(
          JSON.stringify({ error: 'Acesso negado' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Adicionar informações do usuário aos headers para as API routes
      response.headers.set('x-user-id', payload.userId)
      response.headers.set('x-user-type', payload.type || '')
      response.headers.set('x-user-email', payload.email || '')
      
      return response
    } catch (error) {
      console.error('Erro na autenticação do middleware:', error)
      return new Response(
        JSON.stringify({ error: 'Erro interno do servidor' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
  
  // Para rotas de páginas, verificar se precisa de autenticação
  if (isProtectedRoute(pathname)) {
    try {
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Redirecionar para login se não autenticado
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return Response.redirect(loginUrl.toString(), 302)
      }
      
      const token = authHeader.substring(7)
      const payload = verifyTokenBasic(token)
      
      if (!payload || !payload.userId) {
        // Redirecionar para login se token inválido
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return Response.redirect(loginUrl.toString(), 302)
      }
      
      // Verificar permissões baseadas em role
      const requiredRoles = getRequiredRoles(pathname)
      if (requiredRoles && !requiredRoles.includes(payload.type)) {
        // Redirecionar para página de acesso negado
        return Response.redirect(new URL('/unauthorized', request.url).toString(), 302)
      }
      
      return response
    } catch (error) {
      console.error('Erro na autenticação do middleware:', error)
      // Em caso de erro, redirecionar para login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return Response.redirect(loginUrl.toString(), 302)
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