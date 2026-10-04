import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Next.js Middleware — Applied to all API routes
 * 
 * Features:
 * 1. Route-based rate limiting with tiered profiles
 * 2. CSRF protection on state-changing endpoints (POST/PUT/DELETE/PATCH)
 * 3. Security headers enhancement
 */

// Rate limit profiles: [maxRequests, windowMs]
const RATE_LIMITS = [
  { pattern: '/api/super-admin/auth', max: 5,  window: 60_000, prefix: 'auth'     },
  { pattern: '/api/purchase',         max: 10, window: 60_000, prefix: 'purchase' },
  { pattern: '/api/wallet',           max: 10, window: 60_000, prefix: 'wallet'   },
  { pattern: '/api/webhook',          max: 60, window: 60_000, prefix: 'webhook'  },
  { pattern: '/api/mikrotik',         max: 20, window: 60_000, prefix: 'mikrotik' },
  { pattern: '/api/super-admin',      max: 30, window: 60_000, prefix: 'admin'    },
  { pattern: '/api/cron',             max: 10, window: 60_000, prefix: 'cron'     },
  { pattern: '/api',                  max: 30, window: 60_000, prefix: 'api'      }, // default fallback
];

// Routes exempt from CSRF protection
const CSRF_EXEMPT_PREFIXES = [
  '/api/webhook',             // Server-to-server (Flutterwave uses verif-hash)
  '/api/cron',                // Vercel cron (uses CRON_SECRET bearer token)
  '/api/mikrotik/polling/route',  // MikroTik polling script (uses polling_secret)
  '/api/settings/public',        // Public read-only settings
  '/api/super-admin/auth',       // Admin login — no csrf cookie exists yet on first login
];

// Methods that don't need CSRF
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function findRateLimit(pathname) {
  for (const rule of RATE_LIMITS) {
    if (pathname.startsWith(rule.pattern)) {
      return rule;
    }
  }
  return RATE_LIMITS[RATE_LIMITS.length - 1]; // default
}

function isCsrfExempt(pathname) {
  return CSRF_EXEMPT_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // ── 1. Rate Limiting ──────────────────────────────────────
  const rule = findRateLimit(pathname);
  const ip = getClientIp(request);
  const key = `${rule.prefix}:${ip}`;
  const result = checkRateLimit(key, rule.max, rule.window);

  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests. Please slow down.',
        retry_after_ms: result.resetMs,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(result.resetMs / 1000)),
          'X-RateLimit-Limit': String(rule.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((Date.now() + result.resetMs) / 1000)),
        },
      }
    );
  }

  // ── 2. CSRF Protection ────────────────────────────────────
  const method = request.method;
  if (!SAFE_METHODS.includes(method) && !isCsrfExempt(pathname)) {
    const csrfCookie = request.cookies.get('csrf_token')?.value;
    const csrfHeader = request.headers.get('X-CSRF-Token');

    // Only enforce CSRF if the cookie exists (set during admin login)
    // This avoids breaking non-admin routes that don't have CSRF cookies yet
    if (csrfCookie && csrfCookie !== csrfHeader) {
      return new NextResponse(
        JSON.stringify({ error: 'CSRF token mismatch' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── 3. Correlation ID & Continue ──────────────────────────
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-correlation-id', correlationId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('X-Correlation-Id', correlationId);
  response.headers.set('X-RateLimit-Limit', String(rule.max));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil((Date.now() + result.resetMs) / 1000)));

  return response;
}

// Only run middleware on API routes
export const config = {
  matcher: '/api/:path*',
};
