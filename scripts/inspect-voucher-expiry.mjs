// Read-only diagnosis. Run: node --env-file=.env.local scripts/inspect-voucher-expiry.mjs
import { supabaseAdmin } from '../lib/supabase-server.js';
import { buildMikroTikRequest } from '../lib/mikrotik.js';

const { data: routers, error } = await supabaseAdmin.from('routers').select('id,name').eq('is_active', true);
if (error) throw new Error(error.message);
for (const router of routers || []) {
  const snapshots = {};
  for (const path of ['/system/resource', '/system/clock', '/system/scheduler', '/ip/hotspot/user/profile', '/ip/hotspot/user', '/ip/hotspot/active']) {
    const { url, headers } = await buildMikroTikRequest(`/rest${path}`, router.id);
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      if (!response.ok) { snapshots[path] = { error: response.status }; continue; }
      snapshots[path] = await response.json();
    } catch { snapshots[path] = { error: 'Router connection failed' }; }
  }
  const users = Array.isArray(snapshots['/ip/hotspot/user']) ? snapshots['/ip/hotspot/user'] : [];
  const sessions = Array.isArray(snapshots['/ip/hotspot/active']) ? snapshots['/ip/hotspot/active'] : [];
  const { data: vouchers, error: voucherError } = await supabaseAdmin.from('vouchers').select('voucher_code,duration,status,is_used,expires_at,created_at,last_router_id').not('batch_id', 'is', null);
  if (voucherError) throw new Error(voucherError.message);
  const counts = {};
  const overdue = { matched: 0, enabled: 0, connected: 0 };
  for (const voucher of vouchers || []) {
    if (voucher.last_router_id && voucher.last_router_id !== router.id) continue;
    const user = users.find(u => u.name === voucher.voucher_code);
    if (user && (voucher.status === 'expired' || Date.parse(voucher.expires_at) <= Date.now())) {
      overdue.matched++;
      if (user.disabled !== 'true' && user.disabled !== true) overdue.enabled++;
      if (sessions.some(s => s.user === voucher.voucher_code)) overdue.connected++;
    }
    const key = `${voucher.duration}/${voucher.status}`;
    const group = counts[key] ||= { database: 0, on_router: 0, connected: 0, limits: {} };
    group.database++;
    if (user) { group.on_router++; group.limits[user['limit-uptime'] || 'unset'] = (group.limits[user['limit-uptime'] || 'unset'] || 0) + 1; }
    if (sessions.some(s => s.user === voucher.voucher_code)) group.connected++;
  }
  console.log(JSON.stringify({
    router: router.name, resource: { version: snapshots['/system/resource']?.version, uptime: snapshots['/system/resource']?.uptime },
    clock: snapshots['/system/clock'],
    schedulers: Array.isArray(snapshots['/system/scheduler']) ? snapshots['/system/scheduler'].map(s => ({ name: s.name, interval: s.interval, disabled: s.disabled, run_count: s['run-count'] })) : snapshots['/system/scheduler'],
    profiles: Array.isArray(snapshots['/ip/hotspot/user/profile']) ? snapshots['/ip/hotspot/user/profile'].map(p => ({ name: p.name, keepalive: p['keepalive-timeout'], session_timeout: p['session-timeout'], has_login_hook: !!p['on-login'], managed_expiry: p['on-login']?.includes('AN voucher expiry') })) : snapshots['/ip/hotspot/user/profile'],
    counts, overdue, user_read_error: snapshots['/ip/hotspot/user']?.error,
  }, null, 2));
}
