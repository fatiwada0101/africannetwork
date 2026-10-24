import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { isPrivateIp } from '@/lib/mikrotik';

/**
 * MikroTik Router Heartbeat & Dynamic IP Auto-Updater
 * 
 * Called by MikroTik RouterOS via /tool fetch (on boot & periodic scheduler):
 *   /tool fetch url="https://YOUR-APP/api/mikrotik/heartbeat?secret=xxx" mode=https check-certificate=no keep-result=no
 *
 * When power cuts off and comes back on:
 * 1. Router boots up and hits this endpoint
 * 2. Server extracts router's current public WAN IP
 * 3. Server marks router "online" and updates last_seen_at
 * 4. If router's registered IP address changed (dynamic IP from ISP), auto-updates ip_address
 * 5. Returns 200 OK with server timestamp
 *
 * Auth: secret query param or X-Router-Secret header matching router's polling_secret
 */
export async function GET(request) {
  return handleHeartbeat(request);
}

export async function POST(request) {
  return handleHeartbeat(request);
}

async function handleHeartbeat(request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret') || 
                 request.headers.get('x-router-secret') || 
                 url.searchParams.get('token') || '';

  const cleanSecret = secret.trim();
  if (!cleanSecret) {
    return NextResponse.json({ error: 'Missing secret query parameter' }, { status: 401 });
  }

  try {
    // 1. Look up router by polling_secret
    const { data: router, error: findErr } = await supabaseAdmin
      .from('routers')
      .select('id, name, identity, ip_address, port, status, connection_mode, polling_secret')
      .eq('polling_secret', cleanSecret)
      .maybeSingle();

    if (findErr) throw findErr;

    if (!router) {
      // Also check fallback in app_settings.polling_config
      const { data: appSettings } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('key', 'polling_config')
        .maybeSingle();

      if (appSettings?.value?.secret && appSettings.value.secret === cleanSecret) {
        const now = new Date().toISOString();
        await supabaseAdmin
          .from('app_settings')
          .upsert({
            key: 'polling_last_seen',
            value: { timestamp: now, status: 'online' },
            updated_at: now,
          }, { onConflict: 'key' });

        return NextResponse.json({
          status: 'ok',
          type: 'legacy_global',
          timestamp: now,
        });
      }

      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    // 2. Extract router's current public WAN IP
    const forwardedHeader = request.headers.get('x-forwarded-for');
    const realIpHeader = request.headers.get('x-real-ip');
    const cfIpHeader = request.headers.get('cf-connecting-ip');
    const paramWanIp = url.searchParams.get('wan_ip');

    const incomingIp = (
      paramWanIp ||
      (forwardedHeader ? forwardedHeader.split(',')[0].trim() : '') ||
      realIpHeader ||
      cfIpHeader ||
      ''
    ).trim();

    const now = new Date().toISOString();
    const updates = {
      status: 'online',
      last_seen_at: now,
      updated_at: now,
    };

    let ipUpdated = false;
    let oldIp = router.ip_address;

    // 3. Auto-update IP if router has a dynamic WAN IP that changed
    // Only update if incomingIp is valid, not private, and not the VPS IP (187.7.22.89)
    if (
      incomingIp &&
      !isPrivateIp(incomingIp) &&
      incomingIp !== '127.0.0.1' &&
      incomingIp !== 'localhost' &&
      router.ip_address !== incomingIp &&
      router.ip_address !== '187.7.22.89' // Don't overwrite VPS WireGuard proxy IP
    ) {
      updates.ip_address = incomingIp;
      ipUpdated = true;
      console.log(`[Heartbeat] Router "${router.name}" public IP changed from ${oldIp} to ${incomingIp}. Auto-updated!`);
    }

    // 4. Update router in database
    const { error: updateErr } = await supabaseAdmin
      .from('routers')
      .update(updates)
      .eq('id', router.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      status: 'ok',
      message: 'Heartbeat acknowledged — router marked online',
      router: {
        id: router.id,
        name: router.name,
        status: 'online',
        ip_address: updates.ip_address || router.ip_address,
        ip_updated: ipUpdated,
        previous_ip: ipUpdated ? oldIp : undefined,
      },
      timestamp: now,
    });
  } catch (error) {
    console.error('Heartbeat endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
