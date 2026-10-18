import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * MikroTik Polling API — consumed by the RouterOS polling script.
 * 
 * Supports both:
 * 1. Per-router secrets (matching a router in the `routers` table)
 * 2. Legacy global secret in `app_settings.polling_config`
 * 
 * GET  /api/mikrotik/polling?action=fetch&secret=xxx  — Fetch pending tasks
 * POST /api/mikrotik/polling                           — Report task completion
 */

async function validatePollingSecret(request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret') || '';

  // Also check POST body for secret
  let bodySecret = '';
  if (request.method === 'POST') {
    try {
      const cloned = request.clone();
      const body = await cloned.json();
      bodySecret = body.secret || '';
    } catch {}
  }

  const providedSecret = (secret || bodySecret).trim();
  if (!providedSecret) return { valid: false, router: null };

  try {
    // 1. Check routers table for per-router secret
    const { data: router, error: routerErr } = await supabaseAdmin
      .from('routers')
      .select('id, name, identity, location_id, status, polling_secret')
      .eq('polling_secret', providedSecret)
      .maybeSingle();

    if (!routerErr && router) {
      return { valid: true, router };
    }

    // 2. Fallback to app_settings global polling_config
    const { data: appSettings } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'polling_config')
      .maybeSingle();

    if (appSettings?.value?.secret && appSettings.value.secret === providedSecret) {
      return { valid: true, router: null };
    }

    return { valid: false, router: null };
  } catch (err) {
    console.error('Validation error in polling secret:', err);
    return { valid: false, router: null };
  }
}

/**
 * GET — Fetch pending tasks for the router to process
 * Returns up to 5 pending tasks, marks them as 'processing'
 */
export async function GET(request) {
  const auth = await validatePollingSecret(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Invalid polling secret' }, { status: 401 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const now = new Date().toISOString();

  if (action === 'heartbeat') {
    // Record heartbeat on the specific router or global app_settings
    if (auth.router) {
      await supabaseAdmin
        .from('routers')
        .update({ status: 'online', last_seen_at: now, updated_at: now })
        .eq('id', auth.router.id);
    } else {
      await supabaseAdmin
        .from('app_settings')
        .upsert({
          key: 'polling_last_seen',
          value: { timestamp: now, status: 'online' },
          updated_at: now,
        }, { onConflict: 'key' });
    }

    return NextResponse.json({ status: 'ok', timestamp: now, router: auth.router?.name || 'legacy' });
  }

  try {
    // Fetch pending tasks:
    // If specific router polling: fetch tasks scoped to this router_id OR unassigned (router_id is null)
    // If legacy polling: fetch all pending tasks
    let query = supabaseAdmin
      .from('pending_router_tasks')
      .select('*')
      .eq('status', 'pending');

    if (auth.router) {
      query = query.or(`router_id.eq.${auth.router.id},router_id.is.null`);
    }

    const { data: tasks, error } = await query
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      // Record heartbeat even when no tasks
      if (auth.router) {
        await supabaseAdmin
          .from('routers')
          .update({ status: 'online', last_seen_at: now, updated_at: now })
          .eq('id', auth.router.id);
      } else {
        await supabaseAdmin
          .from('app_settings')
          .upsert({
            key: 'polling_last_seen',
            value: { timestamp: now, status: 'online', pending: 0 },
            updated_at: now,
          }, { onConflict: 'key' });
      }

      return NextResponse.json({ tasks: [], count: 0 });
    }

    // Mark them as 'processing' to prevent double-pickup
    const taskIds = tasks.map(t => t.id);
    await supabaseAdmin
      .from('pending_router_tasks')
      .update({ status: 'processing', updated_at: now })
      .in('id', taskIds);

    // Record heartbeat
    if (auth.router) {
      await supabaseAdmin
        .from('routers')
        .update({ status: 'online', last_seen_at: now, updated_at: now })
        .eq('id', auth.router.id);
    } else {
      await supabaseAdmin
        .from('app_settings')
        .upsert({
          key: 'polling_last_seen',
          value: { timestamp: now, status: 'online', pending: tasks.length },
          updated_at: now,
        }, { onConflict: 'key' });
    }

    // Return tasks in a format the RouterOS script can parse
    const simplifiedTasks = tasks.map(t => ({
      id: t.id,
      type: t.task_type,
      code: t.payload?.code || '',
      password: t.payload?.password || '',
      profile: t.payload?.profile || 'default',
      limit_uptime: t.payload?.limitUptime || '1d',
      comment: t.payload?.comment || '',
      shared_users: String(t.payload?.shared_users || '1'),
      rate_limit: t.payload?.rate_limit || '',
    }));

    return NextResponse.json({ tasks: simplifiedTasks, count: simplifiedTasks.length });
  } catch (error) {
    console.error('Polling fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

/**
 * POST — Router reports task completion
 * Body: { secret, task_id, status: 'completed'|'failed', result?, error_message? }
 * Can also handle batch: { secret, results: [{ task_id, status, result?, error_message? }] }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const auth = await validatePollingSecret(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Invalid polling secret' }, { status: 401 });
  }

  const now = new Date().toISOString();

  try {
    // Handle batch results
    const results = body.results || [{ task_id: body.task_id, status: body.status, result: body.result, error_message: body.error_message }];

    const processed = [];

    for (const item of results) {
      if (!item.task_id) continue;

      const isSuccess = item.status === 'completed';
      const updateData = {
        status: isSuccess ? 'completed' : 'failed',
        result: item.result || null,
        error_message: item.error_message || null,
        completed_at: now,
        updated_at: now,
        attempts: 1,
      };

      const { error: updateErr } = await supabaseAdmin
        .from('pending_router_tasks')
        .update(updateData)
        .eq('id', item.task_id);

      if (updateErr) {
        console.error(`Failed to update task ${item.task_id}:`, updateErr);
        continue;
      }

      processed.push({ task_id: item.task_id, status: updateData.status });
    }

    // Record heartbeat
    if (auth.router) {
      await supabaseAdmin
        .from('routers')
        .update({ status: 'online', last_seen_at: now, updated_at: now })
        .eq('id', auth.router.id);
    } else {
      await supabaseAdmin
        .from('app_settings')
        .upsert({
          key: 'polling_last_seen',
          value: {
            timestamp: now,
            status: 'online',
            last_completed: processed.length,
          },
          updated_at: now,
        }, { onConflict: 'key' });
    }

    return NextResponse.json({ success: true, processed: processed.length, results: processed });
  } catch (error) {
    console.error('Polling completion error:', error);
    return NextResponse.json({ error: 'Failed to process results' }, { status: 500 });
  }
}
