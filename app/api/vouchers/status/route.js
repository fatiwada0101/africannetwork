import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getActiveSessions, getHotspotUsers, isMikroTikConfigured, kickActiveSession, deleteHotspotUser, calculateExpiresAt } from '@/lib/mikrotik';
import { durationSeconds, readExpiryComment } from '@/lib/voucher-expiry';
import { syncVoucherDeadline } from '@/lib/voucher-expiry-sync';

// Helper: parse MikroTik uptime or duration strings like "1h30m20s", "1d2h", "45m", "30s" into total seconds
function parseDurationToSeconds(str) {
  if (!str) return 0;
  if (typeof str === 'number') return str;

  let totalSeconds = 0;
  const days = str.match(/(\d+)d/);
  const hours = str.match(/(\d+)h/);
  const mins = str.match(/(\d+)m/);
  const secs = str.match(/(\d+)s/);

  if (days) totalSeconds += parseInt(days[1], 10) * 86400;
  if (hours) totalSeconds += parseInt(hours[1], 10) * 3600;
  if (mins) totalSeconds += parseInt(mins[1], 10) * 60;
  if (secs) totalSeconds += parseInt(secs[1], 10);

  // Fallback for simple integer seconds
  if (totalSeconds === 0 && !isNaN(str)) {
    totalSeconds = parseInt(str, 10);
  }

  return totalSeconds;
}

// Helper: format seconds to "HH:MM:SS" or "Xd Xh Xm"
function formatSeconds(secs) {
  if (secs <= 0) return '00:00:00';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  if (d > 0) {
    return `${d}d ${h}h ${m}m`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Helper: format bytes to MB / GB
function formatBytes(bytes) {
  const num = Number(bytes) || 0;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Helper: parse human data limit string (e.g. '5GB', '10GB', '500MB') into bytes
function parseDataLimitToBytes(limitStr) {
  if (!limitStr) return null;
  const s = String(limitStr).trim().toUpperCase();
  if (s.includes('UNLIMITED') || s === '0') return null;
  const gb = s.match(/(\d+(\.\d+)?)\s*GB/);
  if (gb) return Math.round(parseFloat(gb[1]) * 1024 * 1024 * 1024);
  const mb = s.match(/(\d+(\.\d+)?)\s*MB/);
  if (mb) return Math.round(parseFloat(mb[1]) * 1024 * 1024);
  const num = parseInt(s, 10);
  return isNaN(num) ? null : num;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim();

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Missing voucher code parameter' }, { status: 400 });
    }

    // 1. Cross-reference Supabase vouchers table
    const { data: dbVoucher } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('voucher_code', code)
      .maybeSingle();

    // 2. Query MikroTik router if configured
    let routerSession = null;
    let routerUser = null;
    let routerOnline = false;

    const targetRouterId = dbVoucher?.last_router_id || null;
    const configured = targetRouterId || await isMikroTikConfigured();
    if (configured) {
      try {
        // Query active hotspot sessions
        const sessions = await getActiveSessions(targetRouterId);
        routerOnline = true;
        routerSession = sessions.find((s) => s.user === code);

        // If not in active sessions, query hotspot users to find historical uptime & limit
        if (!routerSession || dbVoucher?.expiry_policy === 'first_login') {
          try {
            const users = await getHotspotUsers(targetRouterId);
            routerUser = users.find((u) => u.name === code);
          } catch (e) {
            // Hotspot user lookup non-fatal
          }
        }
      } catch (err) {
        console.warn('MikroTik API error during voucher status lookup:', err.message);
      }
    }

    if (dbVoucher?.expiry_policy === 'first_login') await syncVoucherDeadline(dbVoucher, routerUser);

    // 3. VALIDATION: If voucher not found anywhere, return explicit invalid response
    if (!dbVoucher && !routerSession && !routerUser) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid voucher code. Please check your code and try again.',
        code,
      }, { status: 404 });
    }

    // 4. Compute telemetry
    const isConnected = !!routerSession;
    let uptimeSeconds = 0;
    let limitUptimeSeconds = durationSeconds(dbVoucher?.duration) || 86400;
    let secondsRemaining = null;
    let bytesIn = 0;
    let bytesOut = 0;
    let ipAddress = null;
    let macAddress = null;
    let planName = dbVoucher?.profile_name || 'Wi-Fi Hotspot Pass';

    if (routerSession) {
      uptimeSeconds = parseDurationToSeconds(routerSession.uptime);
      bytesIn = Number(routerSession['bytes-in']) || 0;
      bytesOut = Number(routerSession['bytes-out']) || 0;
      ipAddress = routerSession.address || null;
      macAddress = routerSession['mac-address'] || null;

      if (routerSession['session-time-left']) {
        secondsRemaining = parseDurationToSeconds(routerSession['session-time-left']);
      }
    } else if (routerUser) {
      uptimeSeconds = parseDurationToSeconds(routerUser.uptime);
      bytesIn = Number(routerUser['bytes-in']) || 0;
      bytesOut = Number(routerUser['bytes-out']) || 0;

      if (routerUser['limit-uptime']) {
        limitUptimeSeconds = parseDurationToSeconds(routerUser['limit-uptime']);
        secondsRemaining = Math.max(0, limitUptimeSeconds - uptimeSeconds);
      }
    }

    const totalDurationSec = durationSeconds(dbVoucher?.duration) || 86400;

    if (!limitUptimeSeconds) limitUptimeSeconds = totalDurationSec;

    // Fallback calculation if router does not specify remaining time
    if (secondsRemaining === null) {
      if (dbVoucher && !dbVoucher.is_used && uptimeSeconds === 0) {
        // Unused voucher — 100% of duration remains and has not expired!
        secondsRemaining = totalDurationSec;
        uptimeSeconds = 0;
      } else if (dbVoucher?.expires_at) {
        const expiresAt = new Date(dbVoucher.expires_at).getTime();
        secondsRemaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      } else if (dbVoucher?.is_used && dbVoucher?.created_at) {
        const createdAt = new Date(dbVoucher.created_at).getTime();
        const elapsedSec = Math.floor((Date.now() - createdAt) / 1000);
        secondsRemaining = Math.max(0, totalDurationSec - elapsedSec);
        if (uptimeSeconds === 0) uptimeSeconds = Math.min(elapsedSec, totalDurationSec);
      } else {
        secondsRemaining = totalDurationSec;
      }
    }

    if (dbVoucher?.expiry_policy === 'first_login') {
      const metadata = readExpiryComment(routerUser?.comment);
      // Wall-clock entitlement takes precedence over connected-time telemetry.
      secondsRemaining = dbVoucher.expires_at ? Math.max(0, Math.ceil((Date.parse(dbVoucher.expires_at) - Date.now()) / 1000)) : limitUptimeSeconds;
      if (!metadata && !dbVoucher.expires_at && dbVoucher.status !== 'expired') {
        return NextResponse.json({ valid: false, error: 'Unable to verify the router voucher deadline. Please retry.' }, { status: 503 });
      }
      if (routerUser?.disabled === 'true' || routerUser?.disabled === true) secondsRemaining = 0;
    }
    const isUsed = !!(dbVoucher?.is_used || uptimeSeconds > 0 || isConnected);
    if (isUsed && dbVoucher && !dbVoucher.is_used && dbVoucher.expiry_policy !== 'first_login') {
      const updates = { is_used: true };
      if (!dbVoucher.expires_at) {
        updates.expires_at = calculateExpiresAt(dbVoucher.duration || dbVoucher.profile_name || '24h');
      }
      supabaseAdmin
        .from('vouchers')
        .update(updates)
        .eq('voucher_code', code)
        .then(() => {})
        .catch(() => {});
    }

    const totalSeconds = limitUptimeSeconds || 86400;
    const percentRemaining = Math.max(0, Math.min(100, Math.round((secondsRemaining / totalSeconds) * 100)));
    const isExpired = (dbVoucher?.status === 'expired') || routerUser?.disabled === 'true' || routerUser?.disabled === true || (secondsRemaining <= 0 && isUsed);
    const isExpiringSoon = !isExpired && isUsed && (secondsRemaining < 1800 || percentRemaining <= 25); // < 30m or < 25%

    // 5. VALIDATION: If voucher is expired, disconnect from router and return explicit expired response
    if (isExpired) {
      // Disconnect user session if currently active on router
      if (isConnected && routerSession && routerSession['.id']) {
        await kickActiveSession(routerSession['.id'], targetRouterId).catch((e) => {
          console.warn(`Could not kick expired session ${code}:`, e.message);
        });
      }
      // Remove user record from router so they cannot re-authenticate
      if (routerUser && routerUser['.id'] && dbVoucher?.expiry_policy !== 'first_login') {
        await deleteHotspotUser(routerUser['.id'], targetRouterId).catch((e) => {
          console.warn(`Could not delete expired user ${code}:`, e.message);
        });
      }

      // Mark status as expired in DB
      if (dbVoucher && dbVoucher.status !== 'expired') {
        supabaseAdmin
          .from('vouchers')
          .update({ status: 'expired' })
          .eq('voucher_code', code)
          .then(() => {})
          .catch(() => {});
      }

      return NextResponse.json({
        valid: false,
        error: 'This voucher has expired. Please purchase a new plan.',
        code,
        plan_name: planName,
        is_expired: true,
        is_used: isUsed,
        seconds_remaining: 0,
        formatted_time_left: '00:00:00',
      }, { status: 410 });
    }

    const totalBytes = bytesIn + bytesOut;
    const rawLimit = dbVoucher?.bytes_limit || parseDataLimitToBytes(dbVoucher?.data_limit);
    const bytesLimit = rawLimit || null;
    const percentDataUsed = bytesLimit ? Math.min(100, Math.round((totalBytes / bytesLimit) * 100)) : null;
    const isDataLow = percentDataUsed !== null && percentDataUsed >= 80;

    return NextResponse.json({
      valid: true,
      success: true,
      code,
      plan_name: planName,
      price: dbVoucher?.price || null,
      is_connected: isConnected,
      is_used: isUsed,
      is_expired: isExpired,
      is_expiring_soon: isExpiringSoon,
      seconds_remaining: secondsRemaining,
      formatted_time_left: formatSeconds(secondsRemaining),
      uptime_seconds: uptimeSeconds,
      formatted_uptime: formatSeconds(uptimeSeconds),
      limit_uptime_seconds: limitUptimeSeconds,
      percent_remaining: percentRemaining,
      bytes_in: bytesIn,
      bytes_out: bytesOut,
      total_bytes: totalBytes,
      download_formatted: formatBytes(bytesIn),
      upload_formatted: formatBytes(bytesOut),
      total_data_formatted: formatBytes(totalBytes),
      bytes_limit: bytesLimit,
      bytes_limit_formatted: bytesLimit ? formatBytes(bytesLimit) : 'Unlimited',
      percent_data_used: percentDataUsed,
      is_data_low: isDataLow,
      ip_address: ipAddress,
      mac_address: macAddress,
      router_online: routerOnline,
      created_at: dbVoucher?.created_at || null,
      activated_at: dbVoucher?.activated_at || null,
      expires_at: dbVoucher?.expires_at || null,
      expiry_policy: dbVoucher?.expiry_policy || 'created_at',
    });
  } catch (err) {
    console.error('Error fetching voucher session status:', err);
    return NextResponse.json({ valid: false, error: 'Failed to retrieve voucher status: ' + err.message }, { status: 500 });
  }
}
