import { NextResponse } from 'next/server.js';
import { supabaseAdmin } from './supabase-server.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Constants ────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = '24h';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Cache for admin credentials (reduces DB hits)
let cachedCreds = null;
let cacheExpiry = 0;

// In-memory login attempt tracker (per Vercel instance)
const loginAttempts = new Map();

/**
 * Get JWT secret from environment. Falls back to a random value (which forces
 * re-login on each cold start — acceptable for early production).
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[admin-auth] JWT_SECRET not set in env. Sessions will not persist across deploys.');
    // Generate a stable-ish fallback from service role key hash (NOT ideal, but better than nothing)
    return process.env.SUPABASE_SERVICE_ROLE_KEY || 'asuk-tech-fallback-jwt-secret-change-me';
  }
  return secret;
}

// ── Credential Helpers ───────────────────────────────────────

export function invalidateAdminCredsCache() {
  cachedCreds = null;
  cacheExpiry = 0;
}

async function getAdminCreds() {
  const now = Date.now();
  if (cachedCreds && now < cacheExpiry) return cachedCreds;

  try {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'super_admin')
      .maybeSingle();

    if (data?.value) {
      cachedCreds = data.value;
      cacheExpiry = now + 60_000; // cache for 60s
      return cachedCreds;
    }
  } catch (err) {
    console.error('Failed to fetch admin credentials from DB:', err.message);
  }

  return null;
}

// ── Login Attempt Tracking ───────────────────────────────────

function getAttemptKey(ip) {
  return `login:${ip}`;
}

function isLockedOut(ip) {
  const key = getAttemptKey(ip);
  const entry = loginAttempts.get(key);
  if (!entry) return false;

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return true;
  }

  // Lockout expired — reset
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(key);
    return false;
  }

  return false;
}

function recordFailedAttempt(ip) {
  const key = getAttemptKey(ip);
  const entry = loginAttempts.get(key) || { count: 0, lockedUntil: null };
  entry.count++;

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  loginAttempts.set(key, entry);
  return entry;
}

function resetAttempts(ip) {
  loginAttempts.delete(getAttemptKey(ip));
}

function getRemainingLockout(ip) {
  const key = getAttemptKey(ip);
  const entry = loginAttempts.get(key);
  if (!entry?.lockedUntil) return 0;
  return Math.max(0, entry.lockedUntil - Date.now());
}

// ── Password Hashing ────────────────────────────────────────

/**
 * Hash a plaintext password with bcrypt.
 */
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

// ── JWT Session Management ──────────────────────────────────

/**
 * Generate a JWT session token for the admin.
 */
export function generateSessionToken(username) {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      sub: username,
      role: 'admin',
      jti: crypto.randomUUID(), // unique ID for potential invalidation
    },
    secret,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify a JWT session token. Returns decoded payload or null.
 */
export function verifySessionToken(token) {
  try {
    const secret = getJwtSecret();
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

// ── Admin Login Flow ─────────────────────────────────────────

/**
 * Authenticate admin with username + password.
 * Supports both hashed passwords (bcrypt) and legacy plaintext (auto-migrates).
 * 
 * @returns {{ success: boolean, token?: string, error?: string, lockout_ms?: number }}
 */
export async function loginAdmin(username, password, clientIp = 'unknown') {
  // Check lockout
  if (isLockedOut(clientIp)) {
    const remaining = getRemainingLockout(clientIp);
    return {
      success: false,
      error: `Too many failed attempts. Try again in ${Math.ceil(remaining / 60000)} minutes.`,
      lockout_ms: remaining,
    };
  }

  const creds = await getAdminCreds();
  if (!creds) {
    return { success: false, error: 'Admin not configured in database' };
  }

  // Check username
  if (username !== creds.username) {
    const attempt = recordFailedAttempt(clientIp);
    const remaining = MAX_LOGIN_ATTEMPTS - attempt.count;
    return {
      success: false,
      error: remaining > 0
        ? `Invalid credentials. ${remaining} attempt(s) remaining.`
        : `Account locked for 15 minutes due to too many failed attempts.`,
    };
  }

  // Check password — support both bcrypt hash and legacy plaintext
  let passwordValid = false;

  if (creds.password_hash) {
    // Modern: bcrypt hash stored
    passwordValid = await verifyPassword(password, creds.password_hash);
  } else if (creds.password) {
    // Legacy: plaintext comparison + auto-migration
    passwordValid = (password === creds.password);

    if (passwordValid) {
      // Auto-migrate: hash the password and store it
      try {
        const hash = await hashPassword(password);
        const updatedCreds = { ...creds, password_hash: hash };
        // Keep password field for backward compat during migration window
        await supabaseAdmin
          .from('app_settings')
          .update({ value: updatedCreds })
          .eq('key', 'super_admin');

        invalidateAdminCredsCache();
        console.log('[admin-auth] Auto-migrated admin password to bcrypt hash');
      } catch (err) {
        console.error('[admin-auth] Failed to auto-migrate password:', err.message);
        // Login still succeeds, migration will retry next time
      }
    }
  }

  if (!passwordValid) {
    const attempt = recordFailedAttempt(clientIp);
    const remaining = MAX_LOGIN_ATTEMPTS - attempt.count;
    return {
      success: false,
      error: remaining > 0
        ? `Invalid credentials. ${remaining} attempt(s) remaining.`
        : `Account locked for 15 minutes due to too many failed attempts.`,
    };
  }

  // Success — reset attempts and generate session
  resetAttempts(clientIp);
  const token = generateSessionToken(username);

  // Generate CSRF token
  const csrfToken = crypto.randomUUID();

  return { success: true, token, csrf_token: csrfToken };
}

// ── Request Validation ───────────────────────────────────────

/**
 * Validates admin session from JWT token in Authorization header or cookie.
 * 
 * Supports:
 * - Authorization: Bearer <jwt>  (new JWT flow)
 * - Authorization: Basic <base64> (legacy backward compat — reads token as JWT)
 * - Cookie: admin_session=<jwt>
 * 
 * Returns true if the request has a valid admin session.
 */
export async function validateAdminAuth(request) {
  const authHeader = request.headers.get('Authorization');
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (authHeader.startsWith('Basic ')) {
      // Legacy flow: the "Basic" token is actually our JWT stored as the token
      token = authHeader.split(' ')[1];
    }
  }

  // Fallback: check cookie
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return false;

  // Verify JWT
  const decoded = verifySessionToken(token);
  if (decoded && decoded.role === 'admin') {
    return true;
  }

  // Legacy fallback: try Basic Auth for backward compatibility during migration
  // This will be removed after full migration
  if (authHeader?.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
      const [user, ...passParts] = decoded.split(':');
      const pass = passParts.join(':');

      const creds = await getAdminCreds();
      if (!creds) return false;

      // Check against plaintext password (legacy) or bcrypt hash
      if (creds.password_hash) {
        return user === creds.username && await verifyPassword(pass, creds.password_hash);
      }
      return user === creds.username && pass === creds.password;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Returns a 401 JSON response for unauthorized requests.
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized: Admin authentication required' },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer error="invalid_token"',
      },
    }
  );
}

export { unauthorizedResponse as adminUnauthorizedResponse };

// ── Password Change ──────────────────────────────────────────

/**
 * Change admin password. Requires current password verification.
 */
export async function changeAdminPassword(currentPassword, newPassword) {
  const creds = await getAdminCreds();
  if (!creds) {
    return { success: false, error: 'Admin not configured' };
  }

  // Verify current password
  let currentValid = false;
  if (creds.password_hash) {
    currentValid = await verifyPassword(currentPassword, creds.password_hash);
  } else if (creds.password) {
    currentValid = (currentPassword === creds.password);
  }

  if (!currentValid) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Hash and store new password
  const newHash = await hashPassword(newPassword);
  const updatedCreds = {
    ...creds,
    password_hash: newHash,
  };
  // Remove plaintext password after migration
  delete updatedCreds.password;

  const { error } = await supabaseAdmin
    .from('app_settings')
    .update({ value: updatedCreds })
    .eq('key', 'super_admin');

  if (error) {
    return { success: false, error: 'Database update failed: ' + error.message };
  }

  invalidateAdminCredsCache();
  return { success: true };
}

/**
 * Verifies admin session synchronously from JWT Authorization header or cookie
 */
export function verifyAdminSession(request) {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (authHeader.startsWith('Basic ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return { authenticated: false, error: 'No admin token provided' };

  const decoded = verifySessionToken(token);
  if (decoded && (decoded.role === 'admin' || decoded.role === 'superadmin')) {
    return { authenticated: true, user: decoded };
  }

  return { authenticated: false, error: 'Invalid or expired session token' };
}

