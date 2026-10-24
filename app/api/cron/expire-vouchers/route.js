import { NextResponse } from 'next/server';
import { voucherDeadline } from '@/lib/voucher-expiry';
import { syncFactoryVoucherDeadlines } from '@/lib/voucher-expiry-sync';
import { supabaseAdmin } from '@/lib/supabase-server';
import { cleanupExpiredHotspotUsers, syncRouterClockAndNtp } from '@/lib/mikrotik';
import { validateAdminAuth } from '@/lib/admin-auth';

/**
 * Automated Voucher Expiry & Router Enforcement Cron Job
 * Daily reconciliation via Vercel Cron; factory cutoffs run locally on the router every 10 seconds.
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

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    // Also allow admin auth if called manually from admin dashboard
    const isAdmin = await validateAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const expiredCodes = new Set();

    const synchronization = await syncFactoryVoucherDeadlines();
    // Paginate all records: weekly/monthly vouchers are older than 48 hours
    // when they expire. Keep retrying router enforcement regardless of age.
    for (let offset = 0; ; offset += 500) {
      const { data: vouchers, error } = await supabaseAdmin.from('vouchers')
        .select('id,voucher_code,status,duration,created_at,expires_at,expiry_policy')
        .order('id').range(offset, offset + 499);
      if (error) throw new Error(error.message);
      for (const voucher of vouchers || []) {
        const deadline = voucherDeadline(voucher);
        if (voucher.status === 'expired' || (deadline !== null && deadline <= Date.now())) expiredCodes.add(voucher.voucher_code);
      }
      if (!vouchers || vouchers.length < 500) break;
    }
    const expiredList = Array.from(expiredCodes);

    // 3. Update database records to 'expired'
    let dbUpdated = 0;
    for (let offset = 0; offset < expiredList.length; offset += 200) {
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('vouchers')
        .update({ status: 'expired', is_used: true })
        .in('voucher_code', expiredList.slice(offset, offset + 200))
        .select('id');
      if (updateError) throw new Error(updateError.message);
      dbUpdated += updatedRows?.length || 0;
    }

    // Call stored procedure for fallback vouchers cleanup
    const { error: expiryError } = await supabaseAdmin.rpc('expire_outdated_vouchers');
    if (expiryError) throw new Error(expiryError.message);

    // 4. MIKROTIK ROUTER ENFORCEMENT: Kick active sessions and delete expired users
    let routerStats = { kickedCount: 0, deletedCount: 0, errors: [] };
    try {
      routerStats = await cleanupExpiredHotspotUsers(expiredList);

      // Keep router date and clock synchronized with NTP
      await syncRouterClockAndNtp('Africa/Lagos').catch(() => {});
    } catch (routerErr) {
      console.warn('Router cleanup error during expiry cron:', routerErr.message);
      routerStats.errors.push(routerErr.message);
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
      success: routerStats.errors.length === 0 && synchronization.errors.length === 0,
      timestamp,
      vouchers_expired_in_db: dbUpdated,
      activation_sync: synchronization,
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

