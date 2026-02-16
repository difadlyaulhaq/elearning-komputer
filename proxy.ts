// proxy.ts (ROOT PROJECT) - Next.js 16 Proxy Convention
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login', 
  '/forgot-password',
  '/download-app', // Allow access to download page
];

// API routes that should bypass proxy completely
const PUBLIC_API_ROUTES = [
  '/api/auth/session',
  '/api/auth/logout',
  '/api/auth/check',
  '/api/admin',
  '/api/auth/login-native', // Allow native login API
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
  
  // ============================================
  // 0. BYPASS FOR API ROUTES & STATIC FILES
  // ============================================
  
  // 1. Bypass API Routes yang publik
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 2. Bypass file statis (APK, gambar, dll) secara manual agar tidak error regex
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|apk|ico)$/)) {
    return NextResponse.next();
  }
  
  // ============================================
  // MOBILE BROWSER GUARD (Server-side)
  // ============================================
  const userAgent = request.headers.get('user-agent');
  const url = request.nextUrl.clone();

  // List of keywords to detect mobile devices
  const mobileKeywords = [
    'Android', 'iPhone', 'iPod', 'BlackBerry', 'Windows Phone', 'Mobile',
    // Add more specific keywords if necessary, but avoid 'iPad' here as it's often desktop-like
  ];

  const isMobile = userAgent && mobileKeywords.some(keyword => userAgent.includes(keyword));

  // If mobile and not already on the blocked page, redirect to blocked
  if (isMobile && url.pathname !== '/blocked' && url.pathname !== '/download-app') {
    url.pathname = '/blocked';
    return NextResponse.redirect(url);
  }

  // Get authentication cookies
  const authToken = request.cookies.get('auth_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;
  
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.includes(pathname);
  const isAdminRoute = pathname.startsWith(ADMIN_ROUTES);

  // ============================================
  // 1. HANDLE PUBLIC ROUTES
  // ============================================
  if (isPublicRoute) {
    if (isGuestOnlyRoute && authToken) {
      return redirectBasedOnRole(userRole, request.url);
    }
    return NextResponse.next();
  }

  // ============================================
  // 2. CHECK AUTHENTICATION
  // ============================================
  if (!authToken) {
    return redirectToLogin(request.url, pathname);
  }

  // ============================================
  // 3. ROLE-BASED ACCESS CONTROL
  // ============================================
  if (isAdminRoute) {
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/learning/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // ============================================
  // 4. ROOT PATH REDIRECT
  // ============================================
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

// Matcher configuration yang lebih sederhana dan aman
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
