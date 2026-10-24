// Dry run by default. --apply installs the reviewed migration, repairs factory
// records using existing deadlines, and enables the router-local expiry sweep.
import { readFile } from 'node:fs/promises';
import { Agent, fetch as verifiedFetch } from 'undici';
import { supabaseAdmin } from '../lib/supabase-server.js';
import { getHotspotUsers, getActiveSessions, routerExpiryRequest, ensureFirstLoginExpiry, createRouterExpiryClient } from '../lib/mikrotik.js';
import { durationSeconds, expiryComment, readExpiryComment, EXPIRY_SCRIPT_NAME } from '../lib/voucher-expiry.js';

const apply = process.argv.includes('--apply');
const overdueOnly = process.argv.includes('--expire-overdue-only');
const selectedRouterId = process.argv.find(arg => arg.startsWith('--router-id='))?.slice('--router-id='.length);
const migration = '20261021000001';
const dispatcher = new Agent({ connect: { rejectUnauthorized: true } });
let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  // Local operator credential file (outside the Git repo); never print its contents.
  const localCredentials = await readFile(new URL('../../supabase access tokens.txt', import.meta.url), 'utf8').catch(() => '');
  token = localCredentials.match(/sbp_[a-zA-Z0-9]+/)?.[0];
}
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
async function sql(query, readOnly = true) {
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required to apply the database migration');
  const response = await verifiedFetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, read_only: readOnly }), dispatcher, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(`Database management request failed (${response.status}): ${String(detail.message || detail.error || 'No details').slice(0, 700)}`);
  }
  return response.json();
}
const { error: columnError } = await supabaseAdmin.from('vouchers').select('expiry_policy,activated_at').limit(1);
const installed = columnError ? [] : [migration];
let routerQuery = supabaseAdmin.from('routers').select('id,name,connection_mode').eq('is_active', true);
if (selectedRouterId) routerQuery = routerQuery.eq('id', selectedRouterId);
const { data: routers, error: routerError } = await routerQuery;
if (routerError) throw new Error(routerError.message);
if (!routers.length) throw new Error('No matching active router found');
if (routers.some(r => r.connection_mode !== 'direct')) throw new Error('Repair supports active direct routers only');
const snapshots = [];
for (const router of routers) {
  const request = await createRouterExpiryClient(router.id);
  snapshots.push({ router, request, users: await request('/ip/hotspot/user'), sessions: await request('/ip/hotspot/active') });
}
const vouchers = [];
for (let offset = 0; ; offset += 500) {
  const { data, error } = await supabaseAdmin.from('vouchers').select('*').not('batch_id', 'is', null).order('id').range(offset, offset + 499);
  if (error) throw new Error(error.message);
  vouchers.push(...data);
  if (data.length < 500) break;
}
const actions = [];
const counts = { expired: 0, pending_first_login: 0, preserve_deadline: 0, already_managed: 0, missing_router: 0, unknown_deadline: 0 };
for (const voucher of vouchers) {
  if (selectedRouterId && voucher.last_router_id && voucher.last_router_id !== selectedRouterId) continue;
  const matches = snapshots.flatMap(s => s.users.filter(u => u.name === voucher.voucher_code).map(user => ({ ...s, user })));
  if (matches.length > 1) throw new Error('Ambiguous duplicate voucher on multiple routers; manual review required');
  if (!matches.length) { counts.missing_router++; continue; }
  const match = matches[0];
  const metadata = readExpiryComment(match.user.comment);
  if (metadata && voucher.status === 'expired' && match.user.disabled === 'true' && !match.sessions.some(s => s.user === match.user.name)) { counts.already_managed++; continue; }
  if (metadata && voucher.expiry_policy === 'first_login' && (!metadata.deadline || metadata.deadline * 1000 > Date.now())) { counts.already_managed++; continue; }
  if (!durationSeconds(voucher.duration)) { counts.unknown_deadline++; continue; }
  const connected = match.sessions.some(s => s.user === match.user.name);
  const used = durationSeconds(match.user.uptime) > 0 || connected || voucher.is_used;
  let kind;
  if (voucher.status === 'expired' || (voucher.expires_at && Date.parse(voucher.expires_at) <= Date.now())) kind = 'expired';
  else if (!used) kind = 'pending_first_login';
  else if (voucher.expires_at) kind = 'preserve_deadline';
  else { counts.unknown_deadline++; continue; }
  counts[kind]++;
  actions.push({ ...match, voucher, kind });
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', overdueOnly, migrationColumnsPresent: installed.length > 0, counts }, null, 2));
if (!apply) process.exit(0);

if (!installed.length && !overdueOnly) {
  const source = await readFile(new URL(`../supabase/migrations/${migration}_factory_first_login_expiry.sql`, import.meta.url), 'utf8');
  await sql(`BEGIN; ${source}
    INSERT INTO public.change_history(category,action,summary) VALUES ('database','migration','20261021000001: Factory voucher first-login expiry and safe expiry sweep');
    COMMIT;`, false);
  console.log('Database migration applied and recorded in existing change_history');
}

const readyProfiles = new Set();
let changed = 0;
for (const action of actions) {
  const { voucher, user, router, kind, sessions, request } = action;
  if (overdueOnly && kind !== 'expired') continue;
  // Existing factory users with vendor hooks require individual review. The
  // default profile on this installation has no vendor login hook.
  const profileKey = `${router.id}/${user.profile || 'default'}`;
  if (kind !== 'expired' && !readyProfiles.has(profileKey)) {
    const profiles = await request('/ip/hotspot/user/profile');
    const profile = profiles.find(p => p.name === (user.profile || 'default'));
    if (profile?.['on-login'] && !profile['on-login'].includes('# AN voucher expiry v1')) throw new Error('Existing vendor login hook needs review before adoption');
    await ensureFirstLoginExpiry(user.profile || 'default', router.id);
    readyProfiles.add(profileKey);
  }
  const deadline = kind === 'pending_first_login' ? null : voucher.expires_at || new Date(Date.now() - 60000).toISOString();
  await request(`/ip/hotspot/user/${encodeURIComponent(user['.id'])}`, 'PATCH', {
    comment: readExpiryComment(user.comment) ? user.comment : expiryComment(voucher.duration, user.comment || '', deadline),
    ...(kind === 'expired' ? { disabled: 'true' } : {}),
  });
  if (kind === 'expired') {
    for (const session of sessions.filter(s => s.user === user.name)) {
      await request(`/ip/hotspot/active/${encodeURIComponent(session['.id'])}`, 'DELETE');
    }
  }
  const update = kind === 'pending_first_login'
    ? { expiry_policy: 'first_login', activated_at: null, expires_at: null, last_router_id: router.id }
    : kind === 'expired' ? { status: 'expired', is_used: true } : {};
  if (Object.keys(update).length) {
    const { error } = await supabaseAdmin.from('vouchers').update(update).eq('id', voucher.id);
    if (error) throw new Error('Router repaired but database update failed; rerun reconciliation');
  }
  changed++;
  if (changed % 20 === 0) console.log(`Repaired ${changed} router vouchers`);
}
for (const { router } of snapshots) {
  if ([...readyProfiles].some(key => key.startsWith(router.id + '/'))) await routerExpiryRequest('/system/script/run', 'POST', { number: EXPIRY_SCRIPT_NAME }, router.id);
}
console.log(JSON.stringify({ repaired: changed, counts }));
await dispatcher.close();
