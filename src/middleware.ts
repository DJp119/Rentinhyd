import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSecurityHeaders, corsHeaders } from '@/lib/security';
import { verifyAdminSessionCookie, adminCookieName } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
  // Admin gate — fail-closed. Without a valid signed admin cookie, every
  // /admin/:path* request returns 404 (not 401, so the route's existence
  // is not leaked) and never reaches the page's server-side PII queries.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Login endpoint is the only admin route that may run without a session.
    if (request.nextUrl.pathname === '/admin/login') {
      // fall through to security headers + return
    } else {
      const cookie = request.cookies.get(adminCookieName())?.value ?? null;
      const session = await verifyAdminSessionCookie(cookie);
      if (!session) {
        return NextResponse.json(
          { error: 'Not Found' },
          { status: 404, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }
  }

  const response = NextResponse.next();

  // Apply security headers to all responses
  const securityHeaders = getSecurityHeaders();
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // Apply CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin);
    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
    // Vary: Origin so credentialled cross-origin responses are not cached
    // against the wrong origin (prevents confused-deputy cache hits).
    response.headers.append('Vary', 'Origin');

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    // Skip static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};