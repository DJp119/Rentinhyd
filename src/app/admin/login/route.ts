// src/app/admin/login/route.ts
// POST /admin/login — exchange a bootstrap admin token (from env) for a
// signed admin session cookie. The cookie is then the gate for all other
// /admin/* routes (see middleware.ts).
//
// This is the minimal bootstrapper. Replace with Supabase Auth + is_admin()
// RPC when full sessions land. Until then: rotate ADMIN_BOOTSTRAP_TOKEN
// after first use and keep it server-side only.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionCookie } from '@/lib/admin-auth';
import { constantTimeEqual } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const bootstrap = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!bootstrap || bootstrap.length < 32) {
    return NextResponse.json({ error: 'Admin login not configured' }, { status: 503 });
  }

  let body: { token?: string; adminId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const token = (body.token || '').trim();
  const adminId = (body.adminId || '').trim();
  if (!token || !adminId) {
    return NextResponse.json({ error: 'token and adminId required' }, { status: 400 });
  }

  // Constant-time compare against the bootstrap token
  if (!constantTimeEqual(token, bootstrap)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cookie = await createAdminSessionCookie(adminId);
    const res = NextResponse.json({ success: true });
    res.cookies.set(cookie.name, cookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/admin',
      maxAge: cookie.maxAge,
    });
    return res;
  } catch (_e) {
    return NextResponse.json({ error: 'Failed to mint session' }, { status: 500 });
  }
}

export async function GET() {
  // No informative GET — keep the endpoint's surface minimal
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
