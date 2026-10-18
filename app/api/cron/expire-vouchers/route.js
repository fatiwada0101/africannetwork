import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { cleanupExpiredHotspotUsers, syncRouterClockAndNtp, isMikroTikConfigured } from '@/lib/mikrotik';

/**
 * Automated Voucher Expiry & Router Enforcement Cron Job
 * Runs periodically (e.g. every 15 minutes) via Vercel Cron.
 *
 * Performs:
 * 1. Discovers all vouchers that have reached their expiration time (or legacy vouchers without expires_at).
 * 2. Marks vouchers as expired in the database.
 * 3. Actively connects to the MikroTik router:
 *    - KICKS active sessions for all expired vouchers immediately.
 *    - DELETES expired users from /ip/hotspot/user so they cannot reconnect.
 *    - Cleans up users whose uptime exceeded limit-uptime on the router.
 * 4. Verifies router date/time with NTP so router clock never drifts or stays at 1970.
 * 5. Cleans up stale pending tasks and old notifications.
 */
async function processVoucherExpiry(request) {
  // Verify cron secret if configured (Vercel sets Authorization: Bearer <secret>)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow admin auth if called manually from admin dashboard
    const { validateAdminAuth } = await import('@/lib/admin-auth');
    const isAdmin = await validateAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const nowIso = new Date().toISOString();
    const expiredCodes = new Set();

    // 1. Find all active vouchers with expires_at in the past
    const { data: expiredByDate } = await supabaseAdmin
      .from('vouchers')
      .select('id, voucher_code, duration, created_at, status')
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lt('expires_at', nowIso);

    (expiredByDate || []).forEach(v => {
      if (v.voucher_code) expiredCodes.add(v.voucher_code);
    });

    // 2. Catch legacy vouchers where expires_at was NULL but duration elapsed
    // Default to 24h ago if duration unknown, or 1h/7d based on duration
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: legacyExpired } = await supabaseAdmin
      .from('vouchers')
      .select('id, voucher_code, duration, created_at')
      .eq('status', 'active')
      .is('expires_at', null)
      .lt('created_at', oneDayAgo);

    (legacyExpired || []).forEach(v => {
      if (v.voucher_code) expiredCodes.add(v.voucher_code);
    });

    // 3. BRUTEFORCE: Catch ALL active vouchers where created_at + duration has elapsed
    // This is the ultimate safety net — if created_at + actual duration < now, it's expired. Period.
    const durationThresholds = [
      { match: ['1h', '1 hour'], seconds: 3600 },
      { match: ['2h', '2 hour'], seconds: 7200 },
      { match: ['3h', '3 hour'], seconds: 10800 },
      { match: ['6h', '6 hour'], seconds: 21600 },
      { match: ['12h', '12 hour'], seconds: 43200 },
      { match: ['24h', '1d', 'daily', '1 day'], seconds: 86400 },
      { match: ['2d', '2 day'], seconds: 172800 },
      { match: ['3d', '3 day'], seconds: 259200 },
      { match: ['7d', '1w', 'week', '7 day'], seconds: 604800 },
      { match: ['14d', '2w', '2 week'], seconds: 1209600 },
      { match: ['30d', '1m', 'month', '30 day'], seconds: 2592000 },
    ];

    // Fetch all active vouchers and check each one against wall-clock time
    const { data: allActive } = await supabaseAdmin
      .from('vouchers')
      .select('id, voucher_code, duration, profile_name, created_at')
      .eq('status', 'active')
      .eq('is_used', true);

    const now = Date.now();
    (allActive || []).forEach(v => {
      if (!v.created_at || !v.voucher_code) return;
      const createdMs = new Date(v.created_at).getTime();
      const durationKey = (v.duration || v.profile_name || '24h').toLowerCase();

      // Find matching duration
      let maxLifetimeSec = 86400; // default 24h
      for (const t of durationThresholds) {
        if (t.match.some(m => durationKey.includes(m))) {
          maxLifetimeSec = t.seconds;
          break;
        }
      }

      // Add 5 minute grace period
      const deadline = createdMs + (maxLifetimeSec * 1000) + (5 * 60 * 1000);
      if (now > deadline) {
        expiredCodes.add(v.voucher_code);
      }
    });

    // Also include recently expired vouchers from past 48h to clean any lingering router records
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: recentExpired } = await supabaseAdmin
      .from('vouchers')
      .select('voucher_code')
      .eq('status', 'expired')
      .gte('created_at', twoDaysAgo)
      .limit(200);

    (recentExpired || []).forEach(v => {
      if (v.voucher_code) expiredCodes.add(v.voucher_code);
    });

    const expiredList = Array.from(expiredCodes);

    // 3. Update database records to 'expired'
    let dbUpdated = 0;
    if (expiredList.length > 0) {
      const { data: updatedRows } = await supabaseAdmin
        .from('vouchers')
        .update({ status: 'expired', is_used: true })
        .in('voucher_code', expiredList)
        .select('id');
      dbUpdated = updatedRows?.length || 0;
    }

    // Call stored procedure for fallback vouchers cleanup
    await supabaseAdmin.rpc('expire_outdated_vouchers').catch(() => {});

    // 4. MIKROTIK ROUTER ENFORCEMENT: Kick active sessions and delete expired users
    let routerStats = { kickedCount: 0, deletedCount: 0, errors: [] };
    const mikrotikConfigured = await isMikroTikConfigured();

    if (mikrotikConfigured) {
      try {
        routerStats = await cleanupExpiredHotspotUsers(expiredList);

        // Keep router date and clock synchronized with NTP
        await syncRouterClockAndNtp('Africa/Lagos').catch(() => {});
      } catch (routerErr) {
        console.warn('Router cleanup error during expiry cron:', routerErr.message);
        routerStats.errors.push(routerErr.message);
      }
    }

    // 5. Clean up old completed/failed pending router tasks (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: tasksDeleted } = await supabaseAdmin
      .from('pending_router_tasks')
      .delete({ count: 'exact' })
      .in('status', ['completed', 'failed'])
      .lt('created_at', sevenDaysAgo);

    // 6. Clean up old read notifications (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: notifsDeleted } = await supabaseAdmin
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('is_read', true)
      .lt('created_at', thirtyDaysAgo);

    const timestamp = new Date().toISOString();
    console.log(
      `[Cron ${timestamp}] Expiry run complete. DB updated: ${dbUpdated}, Router kicked: ${routerStats.kickedCount}, Router deleted: ${routerStats.deletedCount}`
    );

    return NextResponse.json({
      success: true,
      timestamp,
      vouchers_expired_in_db: dbUpdated,
      router_sessions_kicked: routerStats.kickedCount,
      router_users_deleted: routerStats.deletedCount,
      router_errors: routerStats.errors.length > 0 ? routerStats.errors : undefined,
      tasks_cleaned: tasksDeleted || 0,
      notifications_cleaned: notifsDeleted || 0,
    });
  } catch (error) {
    console.error('Cron expire-vouchers error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return processVoucherExpiry(request);
}

export async function POST(request) {
  return processVoucherExpiry(request);
}

