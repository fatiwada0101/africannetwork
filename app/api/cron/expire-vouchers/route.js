import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Automated Voucher Expiry Cron Job
 * Runs every 15 minutes via Vercel Cron to expire outdated vouchers.
 * 
 * Vercel cron jobs call this with a GET request.
 * Protected by CRON_SECRET to prevent unauthorized triggers.
 */
export async function GET(request) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Expire outdated fallback vouchers and main vouchers
    await supabaseAdmin.rpc('expire_outdated_vouchers');

    // 2. Clean up old completed/failed pending router tasks (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: tasksDeleted } = await supabaseAdmin
      .from('pending_router_tasks')
      .delete({ count: 'exact' })
      .in('status', ['completed', 'failed'])
      .lt('created_at', sevenDaysAgo);

    // 3. Clean up old read notifications (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: notifsDeleted } = await supabaseAdmin
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('is_read', true)
      .lt('created_at', thirtyDaysAgo);

    const timestamp = new Date().toISOString();
    console.log(`[Cron ${timestamp}] Expiry job complete. Tasks cleaned: ${tasksDeleted || 0}, Old notifications cleaned: ${notifsDeleted || 0}`);

    return NextResponse.json({
      success: true,
      timestamp,
      tasks_cleaned: tasksDeleted || 0,
      notifications_cleaned: notifsDeleted || 0,
    });
  } catch (error) {
    console.error('Cron expire-vouchers error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
