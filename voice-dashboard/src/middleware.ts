import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public paths (şifre gerektirmeyen)
  const publicPaths = ['/login', '/api/auth/login']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  
  // Static files ve Next.js internal paths
  const isStaticFile = pathname.startsWith('/_next') || 
                       pathname.startsWith('/favicon.ico') ||
                       pathname.match(/\.(jpg|jpeg|png|gif|svg|css|js)$/)
  
  if (isPublicPath || isStaticFile) {
    return NextResponse.next()
  }
  
  // Authentication kontrolü
  const authCookie = request.cookies.get('dashboard_auth')
  
  if (!authCookie || authCookie.value !== 'authenticated') {
    // Kullanıcı giriş yapmamış - Login sayfasına yönlendir
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Giriş yapmış - Devam et
  return NextResponse.next()
}

// Middleware'in çalışacağı path'ler
export const config = {
  matcher: [
    /*
     * Şu path'ler hariç tüm route'ları eşleştir:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

