import { NextResponse } from 'next/server';
import { createOrQueueHotspotUser, deleteHotspotUser, getHotspotUsers } from '@/lib/mikrotik';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateAdminAuth, unauthorizedResponse } from '@/lib/admin-auth';
import { validateBody, voucherGenerateSchema } from '@/lib/schemas';
import { durationSeconds } from '@/lib/voucher-expiry';

function parseDataLimitToBytes(limit) {
  if (!limit || limit === 'unlimited') return null;
  const str = String(limit).trim().toUpperCase();
  const num = parseFloat(str);
  if (isNaN(num)) return null;

  if (str.includes('GB')) return Math.round(num * 1024 * 1024 * 1024);
  if (str.includes('MB')) return Math.round(num * 1024 * 1024);
  if (str.includes('KB')) return Math.round(num * 1024);
  return Math.round(num);
}

/**
 * GET — Retrieve batch history or vouchers for a specific batch
 * Query params: ?batch_id=...
 */
export async function GET(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id')?.trim();
    const filterRouterId = searchParams.get('router_id')?.trim();

    if (batchId) {
      // Return all vouchers for this specific batch
      const { data: vouchers, error } = await supabaseAdmin
        .from('vouchers')
        .select('*')
        .eq('batch_id', batchId)
        .order('serial_number', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ success: true, batch_id: batchId, vouchers: vouchers || [] });
    }

    // Return summary list of recent batches
    let query = supabaseAdmin
      .from('vouchers')
      .select('batch_id, profile_name, price, data_limit, created_at, is_used, status, last_router_id, origin_location_id')
      .not('batch_id', 'is', null);

    if (filterRouterId) {
      query = query.eq('last_router_id', filterRouterId);
    }

    const { data: batches, error } = await query
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    // Group by batch_id
    const batchMap = new Map();
    (batches || []).forEach(v => {
      if (!batchMap.has(v.batch_id)) {
        batchMap.set(v.batch_id, {
          batch_id: v.batch_id,
          plan_name: v.profile_name,
          price: Number(v.price) || 0,
          data_limit: v.data_limit || 'Unlimited',
          created_at: v.created_at,
          router_id: v.last_router_id || null,
          location_id: v.origin_location_id || null,
          total: 0,
          used: 0,
          available: 0,
        });
      }
      const b = batchMap.get(v.batch_id);
      b.total++;
      if (v.is_used || v.status === 'expired') {
        b.used++;
      } else {
        b.available++;
      }
    });

    const recentBatches = Array.from(batchMap.values()).slice(0, 20);
    return NextResponse.json({ success: true, batches: recentBatches });
  } catch (error) {
    console.error('Batch history query error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch batch history', details: error.message }, { status: 500 });
  }
}

/**
 * POST — Advanced Bulk Voucher Generation
 */
export async function POST(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const { data: body, error: validationError } = await validateBody(voucherGenerateSchema, request);
    if (validationError) return validationError;

    const {
      quantity = 1,
      prefix = '',
      code_format = 'numbers_only',
      code_length = 5,
      profile = 'default',
      expiry_type = 'daily',
      custom_duration,
      data_limit = 'unlimited',
      price = 0,
      plan_name = 'Generated Voucher',
      devices = 1,
      upload_speed = '12M',
      download_speed = '12M',
      router_id = null,
      location_id = null,
    } = body;

    const count = Math.min(Math.max(Number(quantity) || 1, 1), 100);
    const codeLen = Math.min(Math.max(Number(code_length) || 5, 5), 12);
    const cleanPrefix = typeof prefix === 'string' ? prefix.trim().toUpperCase() : '';

    // Map expiry_type to RouterOS uptime format
    const expiryMap = {
      '1h': '1h',
      '3h': '3h',
      '5h': '5h',
      '6h': '6h',
      '12h': '12h',
      'daily': '1d',
      'weekly': '7d',
      'monthly': '30d',
      'custom': custom_duration || '1d',
    };

    const rawDuration = expiryMap[expiry_type];
    const durationSec = durationSeconds(rawDuration);
    if (!durationSec || durationSec > 366 * 86400) {
      return NextResponse.json({ error: 'Choose a valid duration, for example 24h, 2d, 7d or 30d (maximum 366 days).' }, { status: 400 });
    }
    const limitUptime = durationSec % 86400 === 0 ? `${durationSec / 86400}d` : durationSec % 3600 === 0 ? `${durationSec / 3600}h` : `${durationSec}s`;
    // Verify migration availability before provisioning any router users.
    const { error: schemaError } = await supabaseAdmin.from('vouchers').select('expiry_policy,activated_at').limit(1);
    if (schemaError) return NextResponse.json({ error: 'Apply the first-login voucher expiry migration before generating vouchers.' }, { status: 503 });

    const expiryLabels = {
      '1h': '1 Hour',
      '3h': '3 Hours',
      '5h': '5 Hours',
      '6h': '6 Hours',
      '12h': '12 Hours',
      'daily': '1 Day',
      'weekly': '7 Days',
      'monthly': '30 Days',
      'custom': custom_duration || 'Custom',
    };
    const expiryLabel = expiryLabels[expiry_type] || expiry_type;

    // Parse bytes quota for RouterOS limit-bytes-total
    const limitBytesTotal = parseDataLimitToBytes(data_limit);

    // Check global hotspot settings for sharing and expiry mode
    let effectiveDevices = Number(devices) || 1;
    let expiryMode = 'elapsed';
    let hotspotUrl = 'asuktech.net';
    let effectiveLocationId = location_id || null;

    if (router_id) {
      try {
        const { data: r } = await supabaseAdmin
          .from('routers')
          .select('id, name, dns_name, location_id')
          .eq('id', router_id)
          .maybeSingle();
        if (r) {
          if (r.dns_name) hotspotUrl = r.dns_name.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
          if (r.location_id && !effectiveLocationId) effectiveLocationId = r.location_id;
        }
      } catch (e) {}
    }

    try {
      const { data: hsData } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('key', 'hotspot_settings')
        .maybeSingle();
      if (hsData?.value) {
        if (!hsData.value.sharing_enabled && !(effectiveDevices > 1)) effectiveDevices = 1;
        expiryMode = hsData.value.expiry_mode || 'elapsed';
      }

      if (!router_id) {
        const { data: mtData } = await supabaseAdmin
          .from('app_settings')
          .select('value')
          .eq('key', 'mikrotik')
          .maybeSingle();
        if (mtData?.value?.hotspot_url) {
          hotspotUrl = mtData.value.hotspot_url.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
        }
      }
    } catch (e) {}

    // Choose charset based on format
    let charSet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // alphanumeric (no ambiguous 0/O, 1/I)
    if (code_format === 'numbers_only') {
      charSet = '0123456789';
    } else if (code_format === 'letters_only') {
      charSet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    }

    const usedCodes = new Set();
    const generateCode = () => {
      let code, attempts = 0;
      do {
        code = cleanPrefix;
        for (let i = 0; i < codeLen; i++) {
          code += charSet.charAt(Math.floor(Math.random() * charSet.length));
        }
        attempts++;
      } while (usedCodes.has(code) && attempts < 30);
      usedCodes.add(code);
      return code;
    };

    // Unique Batch Tag (e.g. BATCH-20260908-7K2M)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randTag = Math.random().toString(36).substring(2, 6).toUpperCase();
    const batchId = `BATCH-${dateStr}-${randTag}`;

    const results = [];
    const errors = [];
    const factorySetupCache = new Set();

    // Create vouchers sequentially to avoid overwhelming router
    for (let i = 0; i < count; i++) {
      const code = generateCode();
      const serialNum = i + 1;
      const cleanDataLabel = data_limit && data_limit !== 'unlimited' ? ` • ${data_limit}` : '';

      try {
        const routerResult = await createOrQueueHotspotUser({
          code,
          password: code,
          profile: profile !== 'default' ? profile : undefined,
          limitUptime,
          comment: `Batch: ${plan_name} (${expiryLabel}${cleanDataLabel}) [${batchId} #${serialNum}] — ₦${price}`,
          shared_users: effectiveDevices,
          rate_limit: `${upload_speed}/${download_speed}`,
          expiry_mode: expiryMode,
          limit_bytes_total: limitBytesTotal,
          routerId: router_id,
          expiryPolicy: 'first_login',
          factorySetupCache,
        });

        // Insert into Supabase vouchers table
        const { data: insertedVoucher, error: insertError } = await supabaseAdmin
          .from('vouchers')
          .insert({
            voucher_code: code,
            profile_name: plan_name,
            price: Number(price),
            is_used: false,
            duration: limitUptime,
            expiry_policy: 'first_login',
            activated_at: null,
            expires_at: null,
            status: 'active',
            batch_id: batchId,
            data_limit: data_limit || 'unlimited',
            serial_number: serialNum,
            last_router_id: router_id || null,
            origin_location_id: effectiveLocationId || null,
          })
          .select('id')
          .single();
        if (insertError) {
          if (routerResult.routerId) await deleteHotspotUser(routerResult.routerId, router_id).catch(() => {});
          throw new Error('Voucher could not be saved in the database. Router rollback was attempted; check router users before retrying.');
        }

        const cleanHotspot = hotspotUrl || 'asuktech.net';
        const qrUrl = `http://${cleanHotspot}/login?code=${encodeURIComponent(code)}`;

        results.push({
          id: insertedVoucher?.id || null,
          code,
          serial_number: serialNum,
          router_id: routerResult.routerId,
          target_router_id: router_id,
          profile: routerResult.profile,
          expiry: expiryLabel,
          data_limit: data_limit || 'Unlimited',
          price: Number(price),
          batch_id: batchId,
          qr_url: qrUrl,
        });
      } catch (err) {
        errors.push({
          code,
          serial_number: serialNum,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: results.length > 0,
      ...(results.length === 0 ? { error: errors[0]?.error || 'No vouchers were created' } : {}),
      batch_id: batchId,
      generated: results.length,
      failed: errors.length,
      vouchers: results,
      errors: errors.length > 0 ? errors : undefined,
      expiry_type,
      expiry_label: expiryLabel,
      limit_uptime: limitUptime,
      expiry_policy: 'first_login',
      data_limit: data_limit || 'Unlimited',
      hotspot_url: hotspotUrl,
    }, { status: results.length > 0 ? 200 : 502 });
  } catch (error) {
    console.error('Bulk voucher generation error:', error.message);
    return NextResponse.json(
      { error: 'Failed to generate vouchers', details: error.message },
      { status: 502 }
    );
  }
}

/**
 * DELETE — Delete individual voucher or entire batch
 * Body: { voucher_id: "uuid" } or { batch_id: "BATCH-..." } and optionally { router_id: "uuid" }
 */
export async function DELETE(request) {
  if (!(await validateAdminAuth(request))) return unauthorizedResponse();

  try {
    const { voucher_id, batch_id, router_id } = await request.json();

    if (!voucher_id && !batch_id) {
      return NextResponse.json({ error: 'Either voucher_id or batch_id is required' }, { status: 400 });
    }

    // Fetch voucher codes and their target router to remove from the correct router
    let voucherCodes = [];
    let targetRouterId = router_id || null;
    if (batch_id) {
      const { data: batchVouchers } = await supabaseAdmin
        .from('vouchers')
        .select('id, voucher_code, last_router_id')
        .eq('batch_id', batch_id);
      voucherCodes = (batchVouchers || []).map(v => v.voucher_code).filter(Boolean);
      if (!targetRouterId && batchVouchers?.[0]?.last_router_id) {
        targetRouterId = batchVouchers[0].last_router_id;
      }
    } else {
      const { data: single } = await supabaseAdmin
        .from('vouchers')
        .select('id, voucher_code, last_router_id')
        .eq('id', voucher_id)
        .maybeSingle();
      if (single?.voucher_code) voucherCodes = [single.voucher_code];
      if (!targetRouterId && single?.last_router_id) targetRouterId = single.last_router_id;
    }

    // Best-effort: remove from MikroTik router (target the correct one)
    let routerRemoved = 0;
    if (voucherCodes.length > 0) {
      try {
        const routerUsers = await getHotspotUsers(targetRouterId || undefined);
        for (const code of voucherCodes) {
          const user = (routerUsers || []).find(u => u.name === code);
          if (user && user['.id']) {
            try {
              await deleteHotspotUser(user['.id'], targetRouterId || undefined);
              routerRemoved++;
            } catch {}
          }
        }
      } catch (e) {
        console.warn('Router cleanup skipped (offline?):', e.message);
      }
    }

    // Delete from Supabase
    let dbDeleted = 0;
    if (batch_id) {
      const { data, error } = await supabaseAdmin
        .from('vouchers')
        .delete()
        .eq('batch_id', batch_id)
        .select('id');
      if (error) throw error;
      dbDeleted = data?.length || 0;
    } else {
      const { data, error } = await supabaseAdmin
        .from('vouchers')
        .delete()
        .eq('id', voucher_id)
        .select('id');
      if (error) throw error;
      dbDeleted = data?.length || 0;
    }

    return NextResponse.json({
      success: true,
      deleted: dbDeleted,
      router_removed: routerRemoved,
      batch_id: batch_id || undefined,
      voucher_id: voucher_id || undefined,
    });
  } catch (error) {
    console.error('Voucher delete error:', error.message);
    return NextResponse.json(
      { error: 'Failed to delete vouchers', details: error.message },
      { status: 500 }
    );
  }
}
