import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSecurityHeaders, corsHeaders } from '@/lib/security';

export function middleware(request: NextRequest) {
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
    // Skip static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};