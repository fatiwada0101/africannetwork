// Isolated RouterOS smoke test. Creates only uniquely named test records and
// removes them in finally. Does not change customer users, profiles or sessions.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../lib/supabase-server.js';
import { createRouterExpiryClient } from '../lib/mikrotik.js';
import { FIRST_LOGIN_SCRIPT, EXPIRY_SWEEP_SCRIPT, expiryComment as productionComment, readExpiryComment as readProductionComment, durationSeconds } from '../lib/voucher-expiry.js';
const expiryComment = (...args) => productionComment(...args).replace(/^ANV1\|/, 'ANT1|');
const readExpiryComment = comment => readProductionComment(comment?.replace(/^ANT1\|/, 'ANV1|'));

const { data: routers, error } = await supabaseAdmin.from('routers').select('id').eq('is_active', true).eq('connection_mode', 'direct');
if (error) throw new Error(error.message);
if (routers?.length !== 1) throw new Error('Smoke test requires exactly one active direct router');
const routerId = routers[0].id;
const request = await createRouterExpiryClient(routerId);
const prefix = `an-test-expiry-${randomBytes(5).toString('hex')}`;
// Keep the production scheduler from touching isolated test records.
const isolate = source => source.replaceAll('ANV1|', 'ANT1|');
const login = isolate(FIRST_LOGIN_SCRIPT);
const created = [];
async function add(path, body) {
  const value = await request(path, 'PUT', body);
  assert.ok(value['.id'], `Created ${path} must return an id`);
  created.push(`${path}/${encodeURIComponent(value['.id'])}`);
  return value;
}
try {
  const sweepName = `${prefix}-sweep`;
  const sweep = isolate(EXPIRY_SWEEP_SCRIPT).replace('/ip hotspot user find]', `/ip hotspot user find where name~"^${prefix}"]`);
  await add('/system/script', { name: sweepName, source: sweep, policy: 'read,write,test' });
  const profile = await add('/ip/hotspot/user/profile', { name: prefix, 'on-login': login, 'keepalive-timeout': '2m' });
  for (const [i, duration] of ['1h', '5h', '1d', '2d', '7d', '30d'].entries()) {
    const name = `${prefix}-${i}`;
    const user = await add('/ip/hotspot/user', { name, password: randomBytes(24).toString('hex'), profile: prefix, disabled: 'true', comment: expiryComment(duration, 'isolated smoke test'), 'limit-uptime': duration });
    const scriptName = `${prefix}-login-${i}`;
    await add('/system/script', { name: scriptName, source: `:local user "${name}"\n${login}`, policy: 'read,write,test' });
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
  // Inject bad clock readings only into isolated test script copies. Never
  // change the live router clock/NTP settings or customer users.
  const nowLine = ':local anNow ([:tonsec [:timestamp]] / 1000000000)';
  const scenarios = [
    ['ntp-waiting', s => s.replace('[/system ntp client get status]', '"waiting"')],
    ['ntp-stopped', s => s.replace('[/system ntp client get status]', '"stopped"')],
    ['ntp-local-clock', s => s.replace('[/system ntp client get status]', '"using-local-clock"')],
    ['invalid-date', s => s.replace(nowLine, ':local anNow 0')],
  ];
  // Stop only the isolated test scheduler so it cannot race the guard checks.
  const testScheduler = (await request('/system/scheduler')).find(s => s.name === prefix);
  await request(`/system/scheduler/${encodeURIComponent(testScheduler['.id'])}`, 'PATCH', { disabled: 'true' });
  const due = await add('/ip/hotspot/user', { name: `${prefix}-guard`, password: randomBytes(24).toString('hex'), profile: prefix, comment: expiryComment('7d', 'clock guard test', new Date(Date.now() - 60000)) });
  for (const [label, transform] of scenarios) {
    const guardSweep = `${prefix}-${label}-sweep`;
    await add('/system/script', { name: guardSweep, source: transform(sweep), policy: 'read,write,test' });
    await request('/system/script/run', 'POST', { number: guardSweep });
    assert.equal((await request(`/ip/hotspot/user/${encodeURIComponent(due['.id'])}`)).disabled, 'false', `${label}: never permanently expire on untrusted time`);
    const guardLogin = `${prefix}-${label}-login`;
    await add('/system/script', { name: guardLogin, source: `:local user "${stock.name}"\n${transform(login)}`, policy: 'read,write,test' });
    await request('/system/script/run', 'POST', { number: guardLogin }).catch(() => {});
    assert.equal(readExpiryComment((await request(`/ip/hotspot/user/${encodeURIComponent(stock['.id'])}`)).comment).deadline, 0, `${label}: must not activate stock`);
    console.log(`${label}: activation and permanent expiry withheld`);
  }
  await request('/system/script/run', 'POST', { number: sweepName });
  assert.equal((await request(`/ip/hotspot/user/${encodeURIComponent(due['.id'])}`)).disabled, 'true');
  console.log('Restored trusted clock: overdue voucher automatically eligible for expiry again');
} finally {
  for (const path of created.reverse()) {
    try { await request(path, 'DELETE'); } catch (error) { console.error(`Test cleanup failed at ${path}: ${error.message}`); process.exitCode = 1; }
  }
}
