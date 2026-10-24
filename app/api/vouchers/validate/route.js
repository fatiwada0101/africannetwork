import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { isMikroTikConfigured, getHotspotUsers, createHotspotUser } from '@/lib/mikrotik';
import { readExpiryComment, durationSeconds } from '@/lib/voucher-expiry';
import { syncVoucherDeadline } from '@/lib/voucher-expiry-sync';

/**
 * GET /api/vouchers/validate?code=XXXX
 *
 * Voucher validation for the captive portal login page.
 * Checks whether a voucher code exists and is still active.
 * If the voucher exists in Supabase but NOT on the MikroTik router
 * (e.g. fallback pool vouchers, or router was offline during purchase),
 * it will auto-provision the hotspot user on MikroTik so the
 * subsequent captive portal form POST succeeds (prevents 501 errors).
 *
 * Does NOT return full telemetry — use /api/vouchers/status for that.
 *
 * Returns:
 *   200: { valid: true, plan_name, ... }
 *   400: { valid: false, error: 'Missing code' }
 *   404: { valid: false, error: 'Not found' }
 *   410: { valid: false, error: 'Expired' }
 *   500: { valid: false, error: 'Server error' }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim();

    if (!code) {
      return NextResponse.json({
        valid: false,
        error: 'Please enter a voucher code.',
      }, { status: 400 });
    }

    const routerIdParam = searchParams.get('router_id')?.trim();

    // 1. Check Supabase vouchers table
    const { data: dbVoucher } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('voucher_code', code)
      .maybeSingle();

    const targetRouterId = dbVoucher?.last_router_id || routerIdParam || null;

    // 2. Check MikroTik for this user (needed for both DB and non-DB paths)
    const configured = await isMikroTikConfigured();
    let routerUser = null;

    if (configured || targetRouterId) {
      try {
        const users = await getHotspotUsers(targetRouterId);
        routerUser = users.find((u) => u.name === code);
      } catch (e) {
        console.warn('Router user lookup during validation (non-fatal):', e.message);
      }
    }

    // 3. If found in DB
    if (dbVoucher) {
      if (dbVoucher.expiry_policy === 'first_login') {
        const metadata = readExpiryComment(routerUser?.comment);
        if (metadata) await syncVoucherDeadline(dbVoucher, routerUser);
        const expired = dbVoucher.status === 'expired' || (dbVoucher.expires_at && Date.parse(dbVoucher.expires_at) <= Date.now()) || routerUser?.disabled === 'true' || routerUser?.disabled === true;
        if (expired) return NextResponse.json({ valid: false, is_expired: true, code, error: 'This voucher has expired. Please purchase a new plan.' }, { status: 410 });
        // Never recreate a missing first-login user: its unsynced deadline may
        // already have elapsed, and re-creation would grant a fresh allowance.
        if (!metadata) return NextResponse.json({ valid: false, code, error: 'Unable to verify the router voucher deadline. Please contact support.' }, { status: 503 });
        return NextResponse.json({ valid: true, code, plan_name: dbVoucher.profile_name, is_used: !!metadata.deadline, expires_at: dbVoucher.expires_at, expiry_policy: 'first_login', source: 'router' });
      }
      // If explicitly flagged as expired in DB
      if (dbVoucher.status === 'expired') {
        return NextResponse.json({
          valid: false,
          error: 'This voucher has expired. Please purchase a new plan.',
          code,
          plan_name: dbVoucher.profile_name,
          is_expired: true,
        }, { status: 410 });
      }

      // If an explicit expiration timestamp was recorded and has passed
      if (dbVoucher.expires_at && new Date(dbVoucher.expires_at).getTime() < Date.now()) {
        return NextResponse.json({
          valid: false,
          error: 'This voucher has expired. Please purchase a new plan.',
          code,
          plan_name: dbVoucher.profile_name,
          is_expired: true,
        }, { status: 410 });
      }

      // If voucher has been used, check MikroTik router for actual remaining uptime
      if (dbVoucher.is_used) {
        if (routerUser && routerUser['limit-uptime'] && routerUser.uptime) {
          const limitSec = parseDurationToSeconds(routerUser['limit-uptime']);
          const usedSec = parseDurationToSeconds(routerUser.uptime);
          if (limitSec > 0 && usedSec >= limitSec) {
            return NextResponse.json({
              valid: false,
              error: 'This voucher has expired. Please purchase a new plan.',
              code,
              plan_name: dbVoucher.profile_name,
              is_expired: true,
            }, { status: 410 });
          }
        }

        // BRUTEFORCE wall-clock check: if created_at + duration has elapsed, it's expired. Period.
        if (dbVoucher.created_at) {
          const createdMs = new Date(dbVoucher.created_at).getTime();
          const durationKey = (dbVoucher.duration || dbVoucher.profile_name || '24h').toLowerCase();
          let maxLifetimeSec = 86400; // default 24h
          if (durationKey.includes('1h') || durationKey.includes('1 hour')) maxLifetimeSec = 3600;
          else if (durationKey.includes('2h') || durationKey.includes('2 hour')) maxLifetimeSec = 7200;
          else if (durationKey.includes('3h') || durationKey.includes('3 hour')) maxLifetimeSec = 10800;
          else if (durationKey.includes('6h') || durationKey.includes('6 hour')) maxLifetimeSec = 21600;
          else if (durationKey.includes('12h') || durationKey.includes('12 hour')) maxLifetimeSec = 43200;
          else if (durationKey.includes('7d') || durationKey.includes('week')) maxLifetimeSec = 604800;
          else if (durationKey.includes('30d') || durationKey.includes('month')) maxLifetimeSec = 2592000;
          else if (durationKey.includes('3d')) maxLifetimeSec = 259200;
          else if (durationKey.includes('2d')) maxLifetimeSec = 172800;
          else if (durationKey.includes('14d') || durationKey.includes('2w')) maxLifetimeSec = 1209600;

          // 5 minute grace period
          const deadline = createdMs + (maxLifetimeSec * 1000) + (5 * 60 * 1000);
          if (Date.now() > deadline) {
            // Also mark as expired in DB
            supabaseAdmin.from('vouchers').update({ status: 'expired' }).eq('voucher_code', code).then(() => {}).catch(() => {});
            return NextResponse.json({
              valid: false,
              error: 'This voucher has expired. Please purchase a new plan.',
              code,
              plan_name: dbVoucher.profile_name,
              is_expired: true,
            }, { status: 410 });
          }
        }
      }

      // ── KEY FIX: Ensure voucher exists on MikroTik router before returning valid ──
      // If the voucher is in Supabase but NOT on the router (fallback pool, or router
      // was offline during purchase), auto-provision it now so the captive portal
      // form POST won't return 501 "Not Implemented".
      if (configured && !routerUser) {
        try {
          // Determine duration from DB voucher or plan
          const uptimeMap = {
            '1h': '1h', '3h': '3h', '24h': '1d',
            '3d': '3d', '7d': '7d', '30d': '30d',
          };

          let limitUptime = '1d'; // default 24h
          const durationStr = dbVoucher.duration || '';
          if (uptimeMap[durationStr]) {
            limitUptime = uptimeMap[durationStr];
          } else if (dbVoucher.profile_name) {
            // Try to infer from plan name
            const planLower = dbVoucher.profile_name.toLowerCase();
            if (planLower.includes('1 hour') || planLower.includes('1h')) limitUptime = '1h';
            else if (planLower.includes('3 hour') || planLower.includes('3h')) limitUptime = '3h';
            else if (planLower.includes('6 hour') || planLower.includes('6h')) limitUptime = '6h';
            else if (planLower.includes('12 hour') || planLower.includes('12h')) limitUptime = '12h';
            else if (planLower.includes('7 day') || planLower.includes('7d') || planLower.includes('week')) limitUptime = '7d';
            else if (planLower.includes('30 day') || planLower.includes('30d') || planLower.includes('month')) limitUptime = '30d';
            else if (planLower.includes('3 day') || planLower.includes('3d')) limitUptime = '3d';
          }

          // Look up plan details for speed/device limits
          let planDevices = 1;
          let planUploadSpeed = '12M';
          let planDownloadSpeed = '12M';
          let expiryMode = 'elapsed';

          try {
            const { data: planData } = await supabaseAdmin
              .from('plans')
              .select('devices, upload_speed, download_speed, duration')
              .eq('name', dbVoucher.profile_name)
              .maybeSingle();

            if (planData) {
              planDevices = Number(planData.devices) || 1;
              planUploadSpeed = planData.upload_speed || '12M';
              planDownloadSpeed = planData.download_speed || '12M';
              if (planData.duration && uptimeMap[planData.duration]) {
                limitUptime = uptimeMap[planData.duration];
              }
            }
          } catch (e) {
            // Plan lookup non-fatal
          }

          // Check global hotspot settings
          try {
            const { data: hsData } = await supabaseAdmin
              .from('app_settings')
              .select('value')
              .eq('key', 'hotspot_settings')
              .maybeSingle();

            if (hsData?.value) {
              if (!hsData.value.sharing_enabled && !(planDevices > 1)) planDevices = 1;
              expiryMode = hsData.value.expiry_mode || 'elapsed';
            }
          } catch (e) {}

          const rateLimit = `${planUploadSpeed}/${planDownloadSpeed}`;

          console.log(`Auto-provisioning voucher ${code} on MikroTik (was in Supabase but missing from router)`);
          await createHotspotUser({
            code,
            password: code,
            profile: dbVoucher.profile_name || 'default',
            limitUptime,
            comment: `Auto-provisioned: ${dbVoucher.profile_name} (₦${dbVoucher.price || 0})`,
            shared_users: planDevices,
            rate_limit: rateLimit,
            expiry_mode: expiryMode,
            routerId: targetRouterId,
          });
          console.log(`✅ Auto-provisioned voucher ${code} on MikroTik successfully`);
        } catch (provisionErr) {
          // Log but don't block — the voucher is still valid in Supabase.
          // The MikroTik form POST may still work if the router accepts the credentials.
          console.warn(`Auto-provision of voucher ${code} on MikroTik failed (non-fatal):`, provisionErr.message);
        }
      }

      // Voucher exists and is active/ready to connect
      return NextResponse.json({
        valid: true,
        code: dbVoucher.voucher_code,
        plan_name: dbVoucher.profile_name,
        data_limit: dbVoucher.data_limit || null,
        is_used: !!dbVoucher.is_used,
      });
    }

    // 4. Not in Supabase — check MikroTik hotspot users (pre-generated vouchers)
    if (routerUser) {
      // Check if the user has remaining uptime
      if (routerUser['limit-uptime'] && routerUser.uptime) {
        const limitSec = parseDurationToSeconds(routerUser['limit-uptime']);
        const usedSec = parseDurationToSeconds(routerUser.uptime);
        if (limitSec > 0 && usedSec >= limitSec) {
          return NextResponse.json({
            valid: false,
            error: 'This voucher has expired. Please purchase a new plan.',
            code,
            is_expired: true,
          }, { status: 410 });
        }
      }

      return NextResponse.json({
        valid: true,
        code,
        plan_name: routerUser.profile || 'Wi-Fi Hotspot Pass',
        source: 'router',
      });
    }

    // 5. Not found anywhere
    return NextResponse.json({
      valid: false,
      error: 'This voucher code was not found. Please double-check your code or purchase a new plan.',
      code,
    }, { status: 404 });
  } catch (err) {
    console.error('Voucher validation error:', err);
    return NextResponse.json({
      valid: false,
      error: 'Could not validate voucher code. Please try again.',
    }, { status: 500 });
  }
}

// Helper: parse MikroTik uptime/duration strings like "1h30m20s", "1d2h", "45m" into seconds
function parseDurationToSeconds(str) {
  return durationSeconds(str);
}
