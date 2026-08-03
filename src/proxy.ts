// src/proxy.ts
// Security headers and CORS proxy for Edge Runtime (Next.js 16+)

import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_ORIGIN = 'https://rentinhyderabad.in';
const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers on all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.resend.com https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com;"
  );

  // CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    if (origin === ALLOWED_ORIGIN) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
      response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};