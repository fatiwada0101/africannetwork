import { NextResponse } from 'next/server';
import {
  getActiveSessions,
  kickActiveSession,
  getHotspotUsers,
  deleteHotspotUser,
  buildMikroTikRequest,
} from '@/lib/mikrotik';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateAdminAuth, unauthorizedResponse } from '@/lib/admin-auth';

/**
 * Clear all hotspot cookies on the router.
 * Cookies allow users to auto-reconnect by MAC address without re-entering a voucher.
 * Removing them forces everyone to re-authenticate through the captive portal.
 */
async function clearHotspotCookies(routerId) {
  const { url, headers } = await buildMikroTikRequest('/rest/ip/hotspot/cookie', routerId);

  // Fetch all cookies
  const listRes = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!listRes.ok) return { cleared: 0, error: `List cookies failed: ${listRes.status}` };

  const cookies = await listRes.json();
  if (!Array.isArray(cookies) || cookies.length === 0) return { cleared: 0 };

  let cleared = 0;
  for (const cookie of cookies) {
    if (!cookie['.id']) continue;
    try {
      const deleteUrl = `${url}/${encodeURIComponent(cookie['.id'])}`;
      const delRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (delRes.ok) cleared++;
    } catch {}
  }
  return { cleared };
}

/**
 * POST — Nuclear option: Purge ALL free/unauthorized connections on a router.
 *
 * This does THREE things to ensure users can't reconnect without a voucher:
 *  1. Clears all MikroTik hotspot cookies (prevents MAC auto-reconnect)
 *  2. Kicks all active sessions (disconnects everyone immediately)
 *  3. Removes hotspot users that don't have a matching valid voucher in the database
 *     (removes "free" users like the default user, or users created before auto-config)
 *
 * Body: { router_id?: "uuid" }
 */
export async function POST(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const routerId = body.router_id || undefined;

    const results = {
      cookies_cleared: 0,
      sessions_kicked: 0,
      sessions_failed: 0,
      users_removed: 0,
      users_kept: 0,
      users_failed: 0,
    };

    // ── Step 1: Clear ALL hotspot cookies ─────────────────────
    // Cookies allow MAC-based auto-reconnect without voucher PIN
    try {
      const cookieResult = await clearHotspotCookies(routerId);
      results.cookies_cleared = cookieResult.cleared || 0;
    } catch (err) {
      console.warn('Cookie clear warning:', err.message);
    }

    // ── Step 2: Kick ALL active sessions ─────────────────────
    try {
      const sessions = await getActiveSessions(routerId);
      if (sessions && sessions.length > 0) {
        for (const session of sessions) {
          try {
            await kickActiveSession(session['.id'], routerId);
            results.sessions_kicked++;
          } catch {
            results.sessions_failed++;
          }
        }
      }
    } catch (err) {
      console.warn('Session kick warning:', err.message);
    }

    // ── Step 3: Remove unauthorized hotspot users from the router ──
    // Keep only users whose name matches an active (unused) voucher in our database
    try {
      const routerUsers = await getHotspotUsers(routerId);
      if (routerUsers && routerUsers.length > 0) {
        // Get all valid voucher codes from our database
        const { data: validVouchers } = await supabaseAdmin
          .from('vouchers')
          .select('voucher_code')
          .eq('status', 'active')
          .eq('is_used', false);

        const validCodes = new Set(
          (validVouchers || []).map(v => v.voucher_code).filter(Boolean)
        );

        for (const user of routerUsers) {
          const username = user.name || '';
          // Skip the "default-trial" user that MikroTik may need
          if (!user['.id']) continue;

          // Keep this user if their username matches a valid voucher in our database
          if (validCodes.has(username)) {
            results.users_kept++;
            continue;
          }

          // Otherwise remove this unauthorized/free user from the router
          try {
            await deleteHotspotUser(user['.id'], routerId);
            results.users_removed++;
          } catch {
            results.users_failed++;
          }
        }
      }
    } catch (err) {
      console.warn('User cleanup warning:', err.message);
    }

    const totalActions = results.cookies_cleared + results.sessions_kicked + results.users_removed;
    const message = totalActions === 0
      ? 'Router is already clean — no free users found'
      : `Purged ${results.sessions_kicked} sessions, ${results.cookies_cleared} cookies, ${results.users_removed} unauthorized users`;

    return NextResponse.json({
      success: true,
      message,
      ...results,
    });
  } catch (error) {
    console.error('Kick all sessions error:', error.message);
    return NextResponse.json(
      { error: 'Failed to purge sessions', details: error.message },
      { status: 502 }
    );
  }
}
