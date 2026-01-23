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
  // MOBILE BROWSER GUARD (Added from middleware)
  // ============================================
  // const userAgent = request.headers.get('user-agent') || '';
  
  // // 1. Deteksi apakah user menggunakan HP (Android/iOS)
  // const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  
  // // 2. Deteksi apakah request datang dari Aplikasi kita
  // // Relaxed check: Look for 'AlfajrApp' (case insensitive) instead of strict version
  // const isApp = /AlfajrApp/i.test(userAgent);

  // // 3. Cek apakah sedang di halaman download (sudah dihandle bypass/public routes, tapi kita cek explicit utk redirect)
  // const isDownloadPage = pathname.startsWith('/download-app');

  // // LOGIKA: Jika Mobile + Bukan App + Bukan Halaman Download -> Redirect
  // // Note: Static files/API sudah di-return di atas, jadi aman.
  // if (isMobile && !isApp && !isDownloadPage) {
  //   return NextResponse.redirect(new URL('/download-app', request.url));
  // }

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
