import { NextResponse } from 'next/server';
import { syncRouterClockAndNtp, buildMikroTikRequest, getMikroTikConfig, getMikroTikConfigForRouter } from '@/lib/mikrotik';
import { validateAdminAuth, unauthorizedResponse } from '@/lib/admin-auth';

/**
 * GET /api/mikrotik/sync-clock — Query the router's internal clock and date
 */
export async function GET(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const routerId = searchParams.get('router_id');
    const config = routerId ? await getMikroTikConfigForRouter(routerId) : await getMikroTikConfig();
    if (!config.isConfigured) {
      return NextResponse.json({ success: false, error: 'Router not configured' }, { status: 400 });
    }

    const { url, headers } = await buildMikroTikRequest('/rest/system/clock', routerId);
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ success: false, error: `Router returned ${res.status}: ${text}` }, { status: 502 });
    }

    const clockData = await res.json();
    const routerDate = clockData.date || '';
    const routerTime = clockData.time || '';
    const timeZone = clockData['time-zone-name'] || '';

    // Check if router date is in the 1970s or earlier than 2024 (reset after power loss)
    const yearMatch = routerDate.match(/\b(19\d\d|20[0-1]\d|202[0-3])\b/);
    const isOutdated = Boolean(yearMatch || routerDate.includes('1970'));

    return NextResponse.json({
      success: true,
      clock: {
        date: routerDate,
        time: routerTime,
        time_zone: timeZone,
        is_outdated_or_1970: isOutdated,
      },
      warning: isOutdated
        ? '⚠️ Router date has reset (often 1970). Run clock sync so vouchers and SSL expire accurately.'
        : undefined,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/mikrotik/sync-clock — Synchronize router clock with NTP and Cloud Time
 */
export async function POST(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const timeZone = body.time_zone || 'Africa/Lagos';
    const routerId = body.router_id || null;

    const result = await syncRouterClockAndNtp(timeZone, routerId);

    return NextResponse.json({
      success: result.success,
      clock: result.clock,
      details: result.results,
      message: result.success
        ? `Router clock synchronized! Date: ${result.clock?.date || 'synced'} ${result.clock?.time || ''}`
        : 'Failed to synchronize clock',
    });
  } catch (error) {
    console.error('Sync clock error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
