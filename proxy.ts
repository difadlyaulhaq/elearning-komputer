// middleware.ts (ROOT PROJECT) - Next.js Middleware Guard
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login', 
  '/forgot-password',
  '/download-app', 
  '/blocked', // CRITICAL: Allow blocked page access
];

// API routes that should bypass proxy completely
const PUBLIC_API_ROUTES = [
  '/api/auth/session',
  '/api/auth/logout',
  '/api/auth/check',
  '/api/admin',
  '/api/auth/login-native',
];

// Routes that are only accessible when NOT authenticated
const GUEST_ONLY_ROUTES = [
  '/login',
  '/forgot-password',
];

// Admin routes prefix
const ADMIN_ROUTES = '/admin';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const url = request.nextUrl.clone();

  // ============================================
  // 0. API SECURITY GUARD (Anti-Direct Access)
  // ============================================
  if (pathname.startsWith('/api/')) {
    const isAllowedOrigin =
      origin.includes('elearningalfajrumroh.com') ||
      origin.includes('elearninginternasionalkomp.web.id') ||
      origin.includes('localhost') ||
      referer.includes('elearningalfajrumroh.com') ||
      referer.includes('elearninginternasionalkomp.web.id') ||
      referer.includes('localhost');
    // Block if request comes from outside the app (e.g., Postman or other sites)
    // but allow during development if needed. 
    // Note: Some native app requests might not have origin/referer, so be careful.
    const isNativeApp = userAgent.toLowerCase().includes('alfajrapp');
    
    if (!isAllowedOrigin && !isNativeApp && process.env.NODE_ENV === 'production') {
      return new NextResponse(JSON.stringify({ error: 'Direct API access is prohibited.' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // ============================================
  // 1. BYPASS FOR PUBLIC API ROUTES & STATIC FILES
  // ============================================
  
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|apk|ico)$/)) {
    return NextResponse.next();
  }

  // ============================================
  // MOBILE BROWSER GUARD (Enhanced)
  // ============================================
  
  // 1. Detect Native App (Bypass all mobile blocks)
  const isNativeApp = userAgent.toLowerCase().includes('alfajrapp');
  
  // 2. Detect Mobile Browsers
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isMobile = isAndroid || isIOS || /Mobile|WebOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // Guard Logic
  if (!isNativeApp && isMobile) {
    // Android redirects to download page
    if (isAndroid && pathname !== '/download-app') {
      url.pathname = '/download-app';
      return NextResponse.redirect(url);
    }
    
    // iOS and others redirect to blocked
    if (!isAndroid && pathname !== '/blocked' && pathname !== '/download-app') {
      url.pathname = '/blocked';
      return NextResponse.redirect(url);
    }
  }

  // ============================================
  // AUTHENTICATION & ACCESS CONTROL
  // ============================================
  
  const authToken = request.cookies.get('auth_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;
  
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.includes(pathname);
  const isAdminRoute = pathname.startsWith(ADMIN_ROUTES);

  // 1. HANDLE PUBLIC ROUTES
  if (isPublicRoute) {
    if (isGuestOnlyRoute && authToken) {
      return redirectBasedOnRole(userRole, request.url);
    }
    return NextResponse.next();
  }

  // 2. CHECK AUTHENTICATION
  if (!authToken) {
    return redirectToLogin(request.url, pathname);
  }

  // 3. ROLE-BASED ACCESS CONTROL
  if (isAdminRoute) {
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/learning/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 4. ROOT PATH REDIRECT
  if (pathname === '/') {
    return redirectBasedOnRole(userRole, request.url);
  }

  return NextResponse.next();
}

function redirectToLogin(originalUrl: string, currentPath: string) {
  const loginUrl = new URL('/login', originalUrl);
  if (!currentPath.startsWith('/api/')) {
    loginUrl.searchParams.set('redirect', currentPath);
  }
  return NextResponse.redirect(loginUrl);
}

function redirectBasedOnRole(role: string | undefined, originalUrl: string) {
  const redirectUrl = role === 'admin' 
    ? new URL('/admin/dashboard', originalUrl)
    : new URL('/learning/dashboard', originalUrl);
  
  return NextResponse.redirect(redirectUrl);
}

// Matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - internasionalkomputer-elearning.apk (direct download)
     */
    '/((?!_next/static|_next/image|favicon.ico|internasionalkomputer-elearning.apk).*)',
  ],
};
