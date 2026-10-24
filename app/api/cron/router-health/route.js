import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getMikroTikConfigForRouter, sanitizeMikroTikConfig } from '@/lib/mikrotik';
import { validateAdminAuth } from '@/lib/admin-auth';

/**
 * Router Health Check Cron Job
 * 
 * Periodically pings all active routers and updates their status in the database.
 * This ensures that routers which come back online after a power cut are automatically
 * detected and their status is updated without requiring manual admin intervention.
 *
 * Supports two connection modes:
 * - "direct": Pings the router REST API directly
 * - "polling": Checks if the last heartbeat was recent (within 5 minutes)
 *
 * GET /api/cron/router-health
 * Auth: Vercel CRON_SECRET bearer token OR admin JWT
 */
export async function GET(request) {
  // Verify cron secret or admin auth
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    const isAdmin = await validateAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = { checked: 0, online: 0, offline: 0, errors: [], details: [] };

  try {
    // Fetch all active routers
    const { data: routers, error: fetchErr } = await supabaseAdmin
      .from('routers')
      .select('id, name, identity, ip_address, port, username, password, use_ssl, connection_mode, status, last_seen_at, dns_name')
      .eq('is_active', true);

    if (fetchErr) throw fetchErr;
    if (!routers || routers.length === 0) {
      return NextResponse.json({ success: true, message: 'No active routers to check', ...results });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    for (const router of routers) {
      results.checked++;
      const routerDetail = { id: router.id, name: router.name, previousStatus: router.status };

      try {
        if (router.connection_mode === 'polling') {
          // For polling-mode routers, check if we received a heartbeat recently (within 5 minutes)
          const lastSeen = router.last_seen_at ? new Date(router.last_seen_at) : null;
          const staleCutoffMs = 5 * 60 * 1000; // 5 minutes

          if (lastSeen && (now - lastSeen) < staleCutoffMs) {
            // Recent heartbeat — router is online
            if (router.status !== 'online') {
              await supabaseAdmin
                .from('routers')
                .update({ status: 'online', updated_at: nowIso })
                .eq('id', router.id);
            }
            routerDetail.newStatus = 'online';
            routerDetail.method = 'heartbeat';
            results.online++;
          } else {
            // Stale heartbeat — mark offline
            if (router.status !== 'offline') {
              await supabaseAdmin
                .from('routers')
                .update({ status: 'offline', updated_at: nowIso })
                .eq('id', router.id);
            }
            routerDetail.newStatus = 'offline';
            routerDetail.method = 'heartbeat-stale';
            results.offline++;
          }
        } else {
          // Direct mode: actually ping the router REST API
          const config = await getMikroTikConfigForRouter(router.id);
          const cleanIp = (config.ip || '').replace(/\/+$/, '');
          const url = `${config.protocol}://${cleanIp}:${config.port}/rest/system/resource`;
          const authStr = Buffer.from(`${config.user}:${config.pass}`).toString('base64');

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          try {
            const res = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authStr}`,
              },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              // Router is online — update status and metadata
              await supabaseAdmin
                .from('routers')
                .update({
                  status: 'online',
                  last_seen_at: nowIso,
                  model: data['board-name'] || data.platform || router.model || 'MikroTik Router',
                  ros_version: data.version || router.ros_version || 'RouterOS v7+',
                  updated_at: nowIso,
                })
                .eq('id', router.id);

              routerDetail.newStatus = 'online';
              routerDetail.method = 'rest-api';
              routerDetail.uptime = data.uptime || null;
              results.online++;
            } else {
              clearTimeout(timeoutId);
              // Router responded but with an error (auth fail, etc.)
              if (router.status !== 'offline') {
                await supabaseAdmin
                  .from('routers')
                  .update({ status: 'offline', updated_at: nowIso })
                  .eq('id', router.id);
              }
              routerDetail.newStatus = 'offline';
              routerDetail.method = 'rest-api';
              routerDetail.error = `HTTP ${res.status}`;
              results.offline++;
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            // Network error, timeout, etc.
            if (router.status !== 'offline') {
              await supabaseAdmin
                .from('routers')
                .update({ status: 'offline', updated_at: nowIso })
                .eq('id', router.id);
            }
            routerDetail.newStatus = 'offline';
            routerDetail.method = 'rest-api';
            routerDetail.error = fetchError.name === 'AbortError' ? 'Timeout (8s)' : fetchError.message;
            results.offline++;
          }
        }
      } catch (routerErr) {
        routerDetail.newStatus = 'error';
        routerDetail.error = routerErr.message;
        results.errors.push({ router: router.name, error: routerErr.message });
        results.offline++;
      }

      results.details.push(routerDetail);
    }

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
      ...results,
    });
  } catch (error) {
    console.error('Router health check cron error:', error);
    return NextResponse.json({ success: false, error: error.message, ...results }, { status: 500 });
  }
}
