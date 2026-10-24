import { supabaseAdmin } from './supabase-server.js';
import { getHotspotUsers } from './mikrotik.js';
import { readExpiryComment } from './voucher-expiry.js';

export async function syncVoucherDeadline(voucher, routerUser) {
  if (voucher?.expiry_policy !== 'first_login') return voucher;
  const metadata = readExpiryComment(routerUser?.comment);
  if (!metadata?.deadline) return voucher;
  // Never move an already recorded deadline forward during reconciliation.
  const expiresAt = voucher.expires_at && Date.parse(voucher.expires_at) < Date.parse(metadata.expires_at) ? voucher.expires_at : metadata.expires_at;
  const update = { activated_at: voucher.activated_at || metadata.activated_at, expires_at: expiresAt, is_used: true };
  if (Date.parse(expiresAt) <= Date.now()) update.status = 'expired';
  const { error } = await supabaseAdmin.from('vouchers').update(update).eq('id', voucher.id).eq('expiry_policy', 'first_login');
  if (error) throw new Error('Unable to synchronize voucher activation');
  Object.assign(voucher, update);
  return voucher;
}

export async function syncFactoryVoucherDeadlines() {
  const { data: routers, error } = await supabaseAdmin.from('routers').select('id').eq('is_active', true).eq('connection_mode', 'direct');
  if (error) throw new Error(error.message);
  let synced = 0;
  const errors = [];
  for (const routerId of [null, ...(routers || []).map(r => r.id)]) {
    try {
      const users = await getHotspotUsers(routerId);
      const managed = users.filter(u => readExpiryComment(u.comment)?.deadline);
      for (let offset = 0; offset < managed.length; offset += 100) {
        const batch = managed.slice(offset, offset + 100);
        let query = supabaseAdmin.from('vouchers').select('*').eq('expiry_policy', 'first_login').in('voucher_code', batch.map(u => u.name));
        query = routerId ? query.eq('last_router_id', routerId) : query.is('last_router_id', null);
        const { data, error: readError } = await query;
        if (readError) throw new Error(readError.message);
        for (const voucher of data || []) {
          await syncVoucherDeadline(voucher, batch.find(u => u.name === voucher.voucher_code));
          synced++;
        }
      }
    } catch (error) { errors.push(`Router ${routerId || 'default'}: ${error.message}`); }
  }
  return { synced, errors };
}
