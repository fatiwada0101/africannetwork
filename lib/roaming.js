import { supabaseAdmin } from './supabase-server.js';
import { logger } from './logger.js';
import {
  createHotspotUser,
  kickActiveSession,
  queueRouterTask,
  sanitizeMikroTikConfig
} from './mikrotik.js';

/**
 * Earth radius in meters for Haversine calculations.
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculate distance in meters between two GPS coordinates using the Haversine formula.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Convert human duration (e.g. '1h', '3h', '24h', '1d', '7d', '30d') to seconds.
 */
export function durationToSeconds(durationStr) {
  if (!durationStr) return 86400; // Default 24h
  const s = String(durationStr).trim().toLowerCase();
  if (s.endsWith('h')) {
    const hours = parseInt(s.slice(0, -1), 10);
    return isNaN(hours) ? 86400 : hours * 3600;
  }
  if (s.endsWith('d')) {
    const days = parseInt(s.slice(0, -1), 10);
    return isNaN(days) ? 86400 : days * 86400;
  }
  if (s.endsWith('m')) {
    const mins = parseInt(s.slice(0, -1), 10);
    return isNaN(mins) ? 3600 : mins * 60;
  }
  const num = parseInt(s, 10);
  return isNaN(num) ? 86400 : num;
}

/**
 * Convert seconds into RouterOS limitUptime string (e.g. 7200 -> '2h', 5400 -> '1h30m').
 */
export function secondsToMikrotikUptime(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '1m';
  const days = Math.floor(totalSeconds / 86400);
  const remainderAfterDays = totalSeconds % 86400;
  const hours = Math.floor(remainderAfterDays / 3600);
  const remainderAfterHours = remainderAfterDays % 3600;
  const minutes = Math.floor(remainderAfterHours / 60);
  const seconds = remainderAfterHours % 60;

  let result = '';
  if (days > 0) result += `${days}d`;
  if (hours > 0) result += `${hours}h`;
  if (minutes > 0) result += `${minutes}m`;
  if (seconds > 0 && days === 0 && hours === 0) result += `${seconds}s`;

  return result || '1m';
}

/**
 * Format remaining seconds into user-friendly text (e.g. '21 hours 15 mins').
 */
export function formatRemainingTime(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return 'Expired';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours} hr${hours !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Resolve which router a client is connecting through using Multi-Signal Resolution:
 * 1. Router Identity tag (?router=Asuk-R1-HQ from captive portal)
 * 2. GPS Coordinates (within coverage radius of location)
 * 3. Fallback to default/primary router
 */
export async function resolveConnectingRouter({ routerIdentity, clientIp, lat, lon } = {}) {
  try {
    // 1. Primary Signal: RouterOS Identity Tag
    if (routerIdentity && typeof routerIdentity === 'string') {
      const cleanIdentity = routerIdentity.trim();
      const { data: matchedRouter } = await supabaseAdmin
        .from('routers')
        .select('*, locations(*)')
        .or(`identity.eq.${cleanIdentity},name.ilike.%${cleanIdentity}%`)
        .eq('is_active', true)
        .maybeSingle();

      if (matchedRouter) {
        return {
          router: matchedRouter,
          location: matchedRouter.locations,
          resolutionMethod: 'identity_tag',
          confidence: 1.0,
        };
      }
    }

    // 2. Secondary Signal: GPS Proximity to Known Location
    if (lat !== undefined && lon !== undefined && lat !== null && lon !== null) {
      const numLat = parseFloat(lat);
      const numLon = parseFloat(lon);

      if (!isNaN(numLat) && !isNaN(numLon)) {
        const { data: locations } = await supabaseAdmin
          .from('locations')
          .select('*, routers(*)')
          .eq('is_active', true);

        if (locations && locations.length > 0) {
          let closestLocation = null;
          let minDistance = Infinity;

          for (const loc of locations) {
            const dist = calculateDistanceMeters(numLat, numLon, Number(loc.latitude), Number(loc.longitude));
            if (dist < minDistance) {
              minDistance = dist;
              closestLocation = { ...loc, distanceMeters: dist };
            }
          }

          if (closestLocation && minDistance <= (closestLocation.coverage_radius_meters || 150)) {
            const router = (closestLocation.routers || []).find((r) => r.is_active) || closestLocation.routers?.[0];
            return {
              router: router || null,
              location: closestLocation,
              resolutionMethod: 'gps_geofence',
              distanceMeters: minDistance,
              confidence: 0.9,
            };
          }
        }
      }
    }

    // 3. Tertiary Signal: Single Default Active Router
    const { data: defaultRouter } = await supabaseAdmin
      .from('routers')
      .select('*, locations(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (defaultRouter) {
      return {
        router: defaultRouter,
        location: defaultRouter.locations,
        resolutionMethod: 'default_fallback',
        confidence: 0.5,
      };
    }

    return null;
  } catch (err) {
    logger.error('Error resolving connecting router:', { error: err.message });
    return null;
  }
}

/**
 * Check whether a user or device has an active roamable voucher and remaining balance.
 */
export async function checkRoamingStatus({ userId, clientMac, targetRouterId } = {}) {
  try {
    let query = supabaseAdmin
      .from('vouchers')
      .select('*, origin_loc:origin_location_id(name), last_loc:last_location_id(name), last_router:last_router_id(name, identity)')
      .eq('status', 'active');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (clientMac) {
      query = query.eq('current_mac', clientMac);
    } else {
      return { hasActiveVoucher: false };
    }

    const { data: vouchers, error } = await query
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !vouchers || vouchers.length === 0) {
      return { hasActiveVoucher: false };
    }

    const voucher = vouchers[0];

    // Compute remaining seconds if not explicitly set
    let remainingSeconds = voucher.remaining_uptime_seconds;
    if (remainingSeconds === null || remainingSeconds === undefined) {
      const totalSec = durationToSeconds(voucher.duration);
      const usedSec = voucher.total_uptime_seconds || 0;
      remainingSeconds = Math.max(0, totalSec - usedSec);
    }

    // Check if expired
    if (remainingSeconds <= 0) {
      await supabaseAdmin
        .from('vouchers')
        .update({ status: 'expired', remaining_uptime_seconds: 0 })
        .eq('id', voucher.id);
      return { hasActiveVoucher: false, expired: true };
    }

    // Check if handoff is needed to target router
    const requiresHandoff = Boolean(targetRouterId && voucher.last_router_id && voucher.last_router_id !== targetRouterId);

    return {
      hasActiveVoucher: true,
      voucher: {
        id: voucher.id,
        voucher_code: voucher.voucher_code,
        profile_name: voucher.profile_name,
        duration: voucher.duration,
        remainingSeconds,
        remainingFormatted: formatRemainingTime(remainingSeconds),
        originLocation: voucher.origin_loc?.name || 'Main Hub',
        lastLocation: voucher.last_loc?.name || null,
        lastRouter: voucher.last_router?.name || null,
        lastRouterId: voucher.last_router_id,
      },
      requiresHandoff,
      canRoam: Boolean(voucher.roaming_enabled !== false),
    };
  } catch (err) {
    logger.error('Error checking roaming status:', { error: err.message, userId, clientMac });
    return { hasActiveVoucher: false, error: err.message };
  }
}

/**
 * Execute a roaming handoff:
 * 1. Preemption: Kicks any lingering session on the prior router.
 * 2. Dynamic Provisioning: Provisions the voucher on target router with adjusted limitUptime.
 * 3. Session Ledger: Records handoff in `roaming_sessions` and updates voucher.
 */
export async function executeRoamingHandoff({ voucherCode, targetRouterId, clientMac, clientIp } = {}) {
  try {
    if (!voucherCode || !targetRouterId) {
      throw new Error('Voucher code and target router ID are required for roaming handoff');
    }

    // 1. Fetch voucher
    const { data: voucher, error: vErr } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('voucher_code', voucherCode)
      .eq('status', 'active')
      .maybeSingle();

    if (vErr || !voucher) {
      throw new Error('Active voucher not found');
    }

    if (voucher.roaming_enabled === false) {
      throw new Error('Roaming is not enabled for this voucher');
    }

    // 2. Fetch target router
    const { data: targetRouter, error: rErr } = await supabaseAdmin
      .from('routers')
      .select('*, locations(*)')
      .eq('id', targetRouterId)
      .maybeSingle();

    if (rErr || !targetRouter) {
      throw new Error('Target router not found');
    }

    // 3. Compute remaining seconds
    let remainingSeconds = voucher.remaining_uptime_seconds;
    if (remainingSeconds === null || remainingSeconds === undefined) {
      const totalSec = durationToSeconds(voucher.duration);
      const usedSec = voucher.total_uptime_seconds || 0;
      remainingSeconds = Math.max(0, totalSec - usedSec);
    }

    if (remainingSeconds <= 0) {
      await supabaseAdmin
        .from('vouchers')
        .update({ status: 'expired', remaining_uptime_seconds: 0 })
        .eq('id', voucher.id);
      throw new Error('Voucher has expired (0 seconds remaining)');
    }

    const limitUptime = secondsToMikrotikUptime(remainingSeconds);

    // 4. Preemption & Anti-Sharing: Close stale session on prior router
    const previousRouterId = voucher.last_router_id;
    if (previousRouterId && previousRouterId !== targetRouterId) {
      try {
        const { data: prevRouter } = await supabaseAdmin
          .from('routers')
          .select('*')
          .eq('id', previousRouterId)
          .maybeSingle();

        if (prevRouter) {
          if (prevRouter.connection_mode === 'direct' && prevRouter.ip_address) {
            // Kick session on previous router directly
            await kickActiveSession(voucher.voucher_code).catch(() => {});
          } else {
            // Queue kick task for polling router
            await queueRouterTask('kick_hotspot_user', { username: voucher.voucher_code }).catch(() => {});
          }
        }

        // Mark previous active session in ledger as handed_off
        await supabaseAdmin
          .from('roaming_sessions')
          .update({ status: 'handed_off', session_end: new Date().toISOString() })
          .eq('voucher_code', voucherCode)
          .eq('status', 'active');
      } catch (kickErr) {
        logger.warn('Non-fatal error kicking previous router session:', { error: kickErr.message });
      }
    }

    // 5. Provision voucher on target router with adjusted limitUptime
    if (targetRouter.connection_mode === 'polling') {
      await queueRouterTask('create_hotspot_user', {
        code: voucher.voucher_code,
        password: voucher.voucher_code,
        profile: voucher.profile_name || 'default',
        limitUptime,
        comment: `Roaming: ${targetRouter.locations?.name || targetRouter.name} (rem: ${remainingSeconds}s)`,
        shared_users: 1,
        router_id: targetRouter.id,
      });
    } else {
      // Direct REST mode
      await createHotspotUser({
        code: voucher.voucher_code,
        password: voucher.voucher_code,
        profile: voucher.profile_name || 'default',
        limitUptime,
        comment: `Roaming: ${targetRouter.locations?.name || targetRouter.name} (rem: ${remainingSeconds}s)`,
        shared_users: 1,
      });
    }

    // 6. Record new session in roaming_sessions ledger
    const { data: newSession } = await supabaseAdmin
      .from('roaming_sessions')
      .insert({
        voucher_id: voucher.id,
        voucher_code: voucher.voucher_code,
        router_id: targetRouter.id,
        location_id: targetRouter.location_id,
        user_mac: clientMac || 'unknown',
        user_ip: clientIp || '192.168.88.2',
        status: 'active',
      })
      .select()
      .single();

    // 7. Update voucher state
    await supabaseAdmin
      .from('vouchers')
      .update({
        last_router_id: targetRouter.id,
        last_location_id: targetRouter.location_id,
        current_mac: clientMac || voucher.current_mac,
        remaining_uptime_seconds: remainingSeconds,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', voucher.id);

    logger.financial('ROAMING_HANDOFF_SUCCESS', {
      voucher_code: voucherCode,
      from_router: previousRouterId,
      to_router: targetRouter.id,
      location: targetRouter.locations?.name,
      remaining_uptime: limitUptime,
    });

    return {
      success: true,
      voucher_code: voucher.voucher_code,
      limit_uptime: limitUptime,
      remaining_seconds: remainingSeconds,
      remaining_formatted: formatRemainingTime(remainingSeconds),
      target_location: targetRouter.locations?.name || targetRouter.name,
      session_id: newSession?.id,
    };
  } catch (err) {
    logger.error('Roaming handoff failed:', { error: err.message, voucherCode, targetRouterId });
    throw err;
  }
}
