/**
 * In-Memory Rate Limiter for API Routes
 * 
 * Uses a sliding window counter pattern with automatic cleanup.
 * Suitable for Vercel serverless (per-instance memory, resets on cold start).
 * For distributed rate limiting, upgrade to Upstash Redis.
 */

const rateLimitStore = new Map();

// Cleanup stale entries every 60 seconds to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > entry.windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limit check for a given key.
 * 
 * @param {string} key - Unique identifier (e.g., IP, user ID, or route+IP)
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
export function checkRateLimit(key, maxRequests, windowMs) {
  cleanupStaleEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now, windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetMs: windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const resetMs = windowMs - (now - entry.windowStart);
    return { allowed: false, remaining: 0, resetMs };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetMs: windowMs - (now - entry.windowStart),
  };
}

/**
 * Extract client IP from request headers (works on Vercel).
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Apply rate limiting to a request. Returns a Response if rate limited, or null if allowed.
 * 
 * @param {Request} request
 * @param {{ maxRequests?: number, windowMs?: number, keyPrefix?: string }} options
 * @returns {Response|null} - Response with 429 status if rate limited, null if allowed
 */
export function applyRateLimit(request, options = {}) {
  const {
    maxRequests = 30,
    windowMs = 60_000,
    keyPrefix = 'api',
  } = options;

  const ip = getClientIp(request);
  const key = `${keyPrefix}:${ip}`;
  const result = checkRateLimit(key, maxRequests, windowMs);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please slow down.',
        retry_after_ms: result.resetMs,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(result.resetMs / 1000)),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((Date.now() + result.resetMs) / 1000)),
        },
      }
    );
  }

  return null; // Allowed
}

// ── Pre-configured rate limit profiles ──

/** Strict: 5 requests per minute (admin login, password reset) */
export function rateLimitStrict(request) {
  return applyRateLimit(request, { maxRequests: 5, windowMs: 60_000, keyPrefix: 'strict' });
}

/** Standard: 20 requests per minute (general API usage) */
export function rateLimitStandard(request) {
  return applyRateLimit(request, { maxRequests: 20, windowMs: 60_000, keyPrefix: 'standard' });
}

/** Purchase: 10 requests per minute (payment routes) */
export function rateLimitPurchase(request) {
  return applyRateLimit(request, { maxRequests: 10, windowMs: 60_000, keyPrefix: 'purchase' });
}

/** Webhook: 60 requests per minute (Flutterwave webhooks) */
export function rateLimitWebhook(request) {
  return applyRateLimit(request, { maxRequests: 60, windowMs: 60_000, keyPrefix: 'webhook' });
}

/** Admin: 30 requests per minute (super-admin operations) */
export function rateLimitAdmin(request) {
  return applyRateLimit(request, { maxRequests: 30, windowMs: 60_000, keyPrefix: 'admin' });
}
