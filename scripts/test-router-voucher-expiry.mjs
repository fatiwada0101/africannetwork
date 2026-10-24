// Isolated RouterOS smoke test. Creates only uniquely named test records and
// removes them in finally. Does not change customer users, profiles or sessions.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../lib/supabase-server.js';
import { routerExpiryRequest } from '../lib/mikrotik.js';
import { FIRST_LOGIN_SCRIPT, EXPIRY_SWEEP_SCRIPT, expiryComment, readExpiryComment, durationSeconds } from '../lib/voucher-expiry.js';

const { data: routers, error } = await supabaseAdmin.from('routers').select('id').eq('is_active', true).eq('connection_mode', 'direct');
if (error) throw new Error(error.message);
if (routers?.length !== 1) throw new Error('Smoke test requires exactly one active direct router');
const routerId = routers[0].id;
const request = (path, method, body) => routerExpiryRequest(path, method, body, routerId);
const prefix = `an-test-expiry-${randomBytes(5).toString('hex')}`;
const created = [];
async function add(path, body) {
  const value = await request(path, 'PUT', body);
  assert.ok(value['.id'], `Created ${path} must return an id`);
  created.push(`${path}/${encodeURIComponent(value['.id'])}`);
  return value;
}
try {
  const sweepName = `${prefix}-sweep`;
  const sweep = EXPIRY_SWEEP_SCRIPT.replace('/ip hotspot user find]', `/ip hotspot user find where name~"^${prefix}"]`);
  await add('/system/script', { name: sweepName, source: sweep, policy: 'read,write,test' });
  const profile = await add('/ip/hotspot/user/profile', { name: prefix, 'on-login': FIRST_LOGIN_SCRIPT, 'keepalive-timeout': '2m' });
  for (const [i, duration] of ['1h', '1d', '2d', '7d', '30d'].entries()) {
    const name = `${prefix}-${i}`;
    const user = await add('/ip/hotspot/user', { name, password: randomBytes(24).toString('hex'), profile: prefix, disabled: 'true', comment: expiryComment(duration, 'isolated smoke test'), 'limit-uptime': duration });
    const scriptName = `${prefix}-login-${i}`;
    await add('/system/script', { name: scriptName, source: `:local user "${name}"\n${FIRST_LOGIN_SCRIPT}`, policy: 'read,write,test' });
    await request('/system/script/run', 'POST', { number: scriptName });
    const first = await request(`/ip/hotspot/user/${encodeURIComponent(user['.id'])}`);
    const metadata = readExpiryComment(first.comment);
    if (!metadata?.deadline) {
      console.log(JSON.stringify({ testRecordShape: Object.keys(first), comment: first.comment, record: Array.isArray(first) ? first.map(u => ({ comment: u.comment, disabled: u.disabled })) : undefined }));
      const logs = await request('/log');
      console.log(JSON.stringify(logs.filter(l => String(l.topics).includes('script')).slice(-8).map(l => ({ topics: l.topics, message: l.message }))));
    }
    assert.ok(metadata?.deadline, `${duration}: first-login script must persist deadline`);
    assert.ok(Math.abs(metadata.deadline - durationSeconds(duration) - Date.now() / 1000) < 15, `${duration}: correct first-login epoch`);
    await request('/system/script/run', 'POST', { number: scriptName });
    const second = await request(`/ip/hotspot/user/${encodeURIComponent(user['.id'])}`);
    assert.equal(readExpiryComment(second.comment).deadline, metadata.deadline, `${duration}: repeat login must not reset deadline`);
    await request(`/ip/hotspot/user/${encodeURIComponent(user['.id'])}`, 'PATCH', { disabled: 'false', comment: expiryComment(duration, 'isolated smoke test', new Date((metadata.deadline - metadata.seconds - 60) * 1000)) });
    await request('/system/script/run', 'POST', { number: sweepName });
    const expired = await request(`/ip/hotspot/user/${encodeURIComponent(user['.id'])}`);
    assert.equal(expired.disabled, 'true', `${duration}: elapsed deadline disables login`);
    console.log(`${duration}: first-login deadline, repeat-login preservation, and expiry enforcement passed`);
  }
  const stock = await add('/ip/hotspot/user', { name: `${prefix}-stock`, password: randomBytes(24).toString('hex'), profile: prefix, comment: expiryComment('30d', 'unused stock') });
  await request('/system/script/run', 'POST', { number: sweepName });
  assert.equal((await request(`/ip/hotspot/user/${encodeURIComponent(stock['.id'])}`)).disabled, 'false');
  const timed = await add('/ip/hotspot/user', { name: `${prefix}-timed`, password: randomBytes(24).toString('hex'), profile: prefix, comment: expiryComment('1h', 'scheduler smoke test', new Date(Date.now() + 3000)) });
  await add('/system/scheduler', { name: prefix, interval: '5s', 'on-event': `/system script run ${sweepName}`, policy: 'read,write,test' });
  await new Promise(resolve => setTimeout(resolve, 20000));
  assert.equal((await request(`/ip/hotspot/user/${encodeURIComponent(timed['.id'])}`)).disabled, 'true');
  console.log('Unused stock preserved; automatic scheduler cutoff passed');
} finally {
  for (const path of created.reverse()) {
    try { await request(path, 'DELETE'); } catch (error) { console.error(`Test cleanup failed at ${path}: ${error.message}`); process.exitCode = 1; }
  }
}
