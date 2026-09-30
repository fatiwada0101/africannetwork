import { NextResponse } from 'next/server';
import { loginAdmin, changeAdminPassword } from '@/lib/admin-auth';
import { getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/super-admin/auth
 * 
 * Admin login endpoint.
 * Rate limited to 5 attempts/min by middleware.
 * Returns JWT session token + CSRF token on success.
 * Enforces account lockout after 5 failed attempts (15 min).
 */
export async function POST(request) {
  // Rate limiting is now handled by middleware.js (strict: 5/min)

  try {
    const body = await request.json();
    const { username, password, action } = body;

    // ── Password Change Flow ──
    if (action === 'change_password') {
      const { current_password, new_password } = body;

      if (!current_password || !new_password) {
        return NextResponse.json(
          { error: 'Both current_password and new_password are required' },
          { status: 400 }
        );
      }

      if (new_password.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters' },
          { status: 400 }
        );
      }

      const result = await changeAdminPassword(current_password, new_password);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Password changed successfully' });
    }

    // ── Login Flow ──
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables on server');
      return NextResponse.json({
        error: 'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in Vercel Environment Variables.',
      }, { status: 500 });
    }

    const clientIp = getClientIp(request);
    const result = await loginAdmin(username, password, clientIp);

    if (!result.success) {
      const status = result.lockout_ms ? 429 : 401;
      const response = NextResponse.json({ error: result.error }, { status });
      if (result.lockout_ms) {
        response.headers.set('Retry-After', String(Math.ceil(result.lockout_ms / 1000)));
      }
      return response;
    }

    // Success — set JWT in cookie + return token
    const response = NextResponse.json({
      success: true,
      token: result.token,
      csrf_token: result.csrf_token,
    });

    // Set HttpOnly session cookie
    response.cookies.set('admin_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    // Set CSRF token cookie (readable by client JS for double-submit)
    response.cookies.set('csrf_token', result.csrf_token, {
      httpOnly: false, // Must be readable by client JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/auth
 * 
 * Admin logout — clears session cookies.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });

  // Clear session cookies
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('csrf_token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
