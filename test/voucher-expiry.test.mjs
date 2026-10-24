import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import { durationSeconds, calculateExpiresAt, expiryComment, readExpiryComment, voucherDeadline, FIRST_LOGIN_SCRIPT, EXPIRY_SWEEP_SCRIPT } from '../lib/voucher-expiry.js';
import { installFirstLoginExpiry } from '../lib/router-voucher-expiry.js';
import { z } from 'zod';

const read = file => fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8');
async function load(file, deps, names) {
  const source = (await read(file)).replace(/^import[\s\S]*?;\s*$/gm, '').replace(/^export /gm, '');
  return vm.runInNewContext(`(()=>{${source}\nreturn {${names.join(',')}};})()`, { console, Date, URL, process: { env: {} }, ...deps }, { filename: file });
}

for (const [duration, seconds] of [['1h', 3600], ['5h', 18000], ['12h', 43200], ['24h', 86400], ['1d', 86400], ['2d', 172800], ['7d', 604800], ['14d', 1209600], ['30d', 2592000], ['2 weeks', 1209600], ['1w2d03:04:05', 788645]]) {
  test(`${duration}: deadline is exactly the allowance after first login`, () => {
    const start = '2026-10-21T10:00:00.000Z';
    assert.equal(durationSeconds(duration), seconds);
    assert.equal(Date.parse(calculateExpiresAt(duration, start)) - Date.parse(start), seconds * 1000);
    const metadata = readExpiryComment(expiryComment(duration, 'Batch', calculateExpiresAt(duration, start)));
    assert.equal(metadata.activated_at, start);
    assert.equal(metadata.seconds, seconds);
  });
}

test('duration parsing rejects ambiguous input instead of silently issuing daily vouchers', () => {
  for (const duration of ['forever', '-2d', '2d; /system reboot', 'Day plan']) assert.equal(durationSeconds(duration), 0);
  assert.equal(durationSeconds('1m'), 60);
  assert.equal(durationSeconds('monthly'), 2592000);
  assert.equal(readExpiryComment('ANV1|0|123|'), null);
});

test('factory stock has no deadline before first login, regardless of creation age', () => {
  const metadata = readExpiryComment(expiryComment('30d', 'stock'));
  assert.equal(metadata.activated_at, null);
  assert.equal(metadata.expires_at, null);
  assert.equal(voucherDeadline({ expiry_policy: 'first_login', duration: '30d', created_at: '2020-01-01' }), null);
});

test('deadline reconciliation never extends a recorded deadline or revives expired vouchers', async () => {
  let saved;
  const query = { update(v) { saved = v; return this; }, eq() { return this; }, then(resolve) { return Promise.resolve({ error: null }).then(resolve); } };
  const { syncVoucherDeadline } = await load('lib/voucher-expiry-sync.js', { supabaseAdmin: { from: () => query }, readExpiryComment }, ['syncVoucherDeadline']);
  const early = '2026-01-01T00:00:00.000Z';
  const voucher = { id: '1', expiry_policy: 'first_login', status: 'expired', expires_at: early };
  await syncVoucherDeadline(voucher, { comment: expiryComment('7d', '', '2027-01-01T00:00:00Z') });
  assert.equal(saved.expires_at, early);
  assert.equal(voucher.status, 'expired');
});

test('actual SQL sweep leaves unused stock alone and expires activated 1h/1d/2d/7d/30d vouchers', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE vouchers(id TEXT PRIMARY KEY, status TEXT DEFAULT 'active', is_used BOOLEAN DEFAULT false, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE fallback_vouchers(status TEXT, is_used BOOLEAN, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ);`);
    const sql = await read('supabase/migrations/20261021000001_factory_first_login_expiry.sql');
    await db.exec(sql);
    await db.exec(sql); // safe to re-apply
    await db.exec("INSERT INTO vouchers(id,expiry_policy,created_at) VALUES ('stock','first_login',NOW()-INTERVAL '90 days');");
    for (const duration of ['1h', '5h', '1d', '2d', '7d', '30d']) {
      await db.query("INSERT INTO vouchers(id,expiry_policy,activated_at,expires_at) VALUES ($1,'first_login', NOW()-make_interval(secs=>$2),NOW()-INTERVAL '1 second')", [duration, durationSeconds(duration)]);
    }
    await db.exec("INSERT INTO vouchers(id,expiry_policy,expires_at) VALUES ('future','first_login',NOW()+INTERVAL '1 day'); SELECT expire_outdated_vouchers();");
    const rows = (await db.query('SELECT id,status FROM vouchers')).rows;
    assert.equal(rows.find(r => r.id === 'stock').status, 'active');
    assert.equal(rows.find(r => r.id === 'future').status, 'active');
    assert.equal(rows.filter(r => r.status === 'expired').length, 6);
  } finally { await db.close(); }
});

test('installer awaits scheduler and login hook, preserves vendor hook, and propagates router failures', async () => {
  const writes = [];
  const iso = new Date().toISOString();
  const get = {
    '/system/resource': { version: '7.19.6 (stable)' },
    '/system/ntp/client': { status: 'synchronized' },
    '/system/clock': { date: iso.slice(0, 10), time: iso.slice(11, 19), 'gmt-offset': '+00:00' },
    '/ip/hotspot/user/profile': [{ '.id': '*1', name: 'factory', 'on-login': ':log info "existing"' }],
    '/system/script': [], '/system/scheduler': [],
  };
  await installFirstLoginExpiry(async (path, method = 'GET', body) => {
    if (method === 'GET') return get[path];
    writes.push({ path, body }); return {};
  }, 'factory');
  assert.ok(writes.find(w => w.path === '/system/script').body.source === EXPIRY_SWEEP_SCRIPT);
  assert.ok(writes.find(w => w.path.includes('/profile/')).body['on-login'].startsWith(FIRST_LOGIN_SCRIPT));
  assert.ok(writes.find(w => w.path.includes('/profile/')).body['on-login'].endsWith(':log info "existing"'));
  assert.equal(writes.find(w => w.path === '/system/scheduler').body['start-time'], 'startup');
  get['/ip/hotspot/user/profile'][0]['on-login'] = '# AN voucher expiry v1\nold code\n# End AN voucher expiry v1\n:log info "existing"';
  writes.length = 0;
  await installFirstLoginExpiry(async (path, method = 'GET', body) => {
    if (method === 'GET') return get[path];
    writes.push({ path, body }); return {};
  }, 'factory');
  const upgraded = writes.find(w => w.path.includes('/profile/')).body['on-login'];
  assert.ok(upgraded.startsWith(FIRST_LOGIN_SCRIPT));
  assert.ok(!upgraded.includes('old code'));
  assert.ok(upgraded.endsWith(':log info "existing"'));
  await assert.rejects(installFirstLoginExpiry(async (path, method = 'GET') => {
    if (method === 'GET') return get[path];
    throw new Error('Router write denied');
  }, 'factory'), /denied/);
});

test('installer refuses unsynchronized NTP without any writes', async () => {
  const iso = new Date().toISOString();
  for (const status of ['waiting', 'stopped', 'using-local-clock']) {
    await assert.rejects(installFirstLoginExpiry(async (path, method = 'GET') => {
      assert.equal(method, 'GET');
      if (path === '/system/resource') return { version: '7.19.6' };
      if (path === '/system/clock') return { date: iso.slice(0, 10), time: iso.slice(11, 19), 'gmt-offset': '+00:00' };
      return { status };
    }, 'factory'), /synchronize/);
  }
});

test('installer refuses an invalid or badly skewed router clock before writing', async () => {
  for (const clock of [{ date: '1970-01-01', time: '00:00:00' }, { date: '2026-10-21', time: 'bad' }]) {
    await assert.rejects(installFirstLoginExpiry(async path => path === '/system/resource' ? { version: '7.19.6' } : clock, 'factory'), /clock/);
  }
});

test('cron retries old expired weekly/monthly vouchers without expiring pending factory stock', async () => {
  const vouchers = [
    { voucher_code: 'weekly', status: 'expired', duration: '7d', created_at: '2020-01-01' },
    { voucher_code: 'monthly', status: 'expired', duration: '30d', created_at: '2020-01-01' },
    { voucher_code: 'stock', status: 'active', duration: '1d', created_at: '2020-01-01', expiry_policy: 'first_login' },
  ];
  let cleaned;
  const query = { select() { return this; }, order() { return this; }, range() { return Promise.resolve({ data: vouchers }); }, update() { return this; }, in() { return this; }, delete() { return this; }, lt() { return this; }, eq() { return this; }, then(resolve) { return Promise.resolve({ data: [], count: 0 }).then(resolve); } };
  const { GET } = await load('app/api/cron/expire-vouchers/route.js', {
    NextResponse: { json: (v, o) => Response.json(v, o) }, voucherDeadline,
    validateAdminAuth: async () => true,
    syncFactoryVoucherDeadlines: async () => ({ synced: 0, errors: [] }),
    supabaseAdmin: { from: () => query, rpc: async () => ({}) },
    cleanupExpiredHotspotUsers: async codes => { cleaned = codes; return { kickedCount: 0, deletedCount: 0, errors: [] }; },
    syncRouterClockAndNtp: async () => {}, isMikroTikConfigured: async () => true,
  }, ['GET']);
  const response = await GET(new Request('https://example.test/cron'));
  assert.equal(response.status, 200);
  assert.deepEqual(Array.from(cleaned).sort(), ['monthly', 'weekly']);
});

test('factory handler provisions first-login vouchers, normalizes 2 days and leaves expiry unset', async () => {
  const schemas = await load('lib/schemas.js', { z }, ['validateBody', 'voucherGenerateSchema']);
  let inserted, provisioned, rollback = 0, insertFail = false;
  const query = {
    select() { return this; }, eq() { return this; }, limit() { return Promise.resolve({ data: [], error: null }); },
    maybeSingle() { return Promise.resolve({ data: { value: { expiry_mode: 'elapsed' } } }); },
    insert(value) { inserted = value; return this; },
    single() { return Promise.resolve(insertFail ? { error: { message: 'insert failed' } } : { data: { id: 'saved' } }); },
  };
  const { POST } = await load('app/api/mikrotik/generate-vouchers/route.js', {
    ...schemas, durationSeconds, NextResponse: { json: (v, o) => Response.json(v, o) },
    validateAdminAuth: async () => true, supabaseAdmin: { from: () => query },
    createOrQueueHotspotUser: async opts => { provisioned = opts; return { routerId: '*test', profile: 'factory' }; },
    deleteHotspotUser: async () => { rollback++; },
  }, ['POST']);
  const req = () => new Request('https://example.test/api/mikrotik/generate-vouchers', { method: 'POST', body: JSON.stringify({ quantity: 1, expiry_type: 'custom', custom_duration: '2 days' }) });
  assert.equal((await POST(req())).status, 200);
  assert.equal(provisioned.limitUptime, '2d');
  assert.equal(provisioned.expiryPolicy, 'first_login');
  assert.equal(inserted.expires_at, null);
  assert.equal(inserted.activated_at, null);
  for (const [expiry_type, duration] of [['5h', '5h'], ['daily', '1d'], ['weekly', '7d'], ['monthly', '30d']]) {
    const response = await POST(new Request('https://example.test/factory', { method: 'POST', body: JSON.stringify({ quantity: 1, expiry_type }) }));
    assert.equal(response.status, 200);
    assert.equal(provisioned.limitUptime, duration);
    assert.equal(inserted.duration, duration);
    assert.equal(inserted.expiry_policy, 'first_login');
    assert.equal(inserted.expires_at, null);
  }
  insertFail = true;
  const failure = await POST(req());
  assert.equal(failure.status, 502);
  assert.equal((await failure.json()).success, false);
  assert.equal(rollback, 1);
});

for (const duration of ['5h', '1d', '2d', '7d', '30d']) {
  test(`${duration}: actual status/validation handlers preserve pending stock and reject elapsed offline deadlines`, async () => {
    const voucher = { id: 'test', voucher_code: 'TEST', profile_name: 'Test', duration, expiry_policy: 'first_login', status: 'active', is_used: false, created_at: '2020-01-01', expires_at: null };
    const user = { '.id': '*test', name: 'TEST', disabled: 'false', comment: expiryComment(duration), uptime: '0s', 'limit-uptime': duration === '7d' ? '1w' : duration === '30d' ? '4w2d' : duration };
    let updates, connected = false, kicked = 0;
    const query = { select() { return this; }, eq() { return this; }, update(value) { updates = value; return this; }, maybeSingle: async () => ({ data: voucher }), then(resolve) { Object.assign(voucher, updates); return Promise.resolve({ error: null }).then(resolve); } };
    const supabaseAdmin = { from: () => query };
    const { syncVoucherDeadline } = await load('lib/voucher-expiry-sync.js', { supabaseAdmin, readExpiryComment }, ['syncVoucherDeadline']);
    const deps = {
      NextResponse: { json: (v, o) => Response.json(v, o) }, supabaseAdmin, syncVoucherDeadline, durationSeconds, readExpiryComment,
      isMikroTikConfigured: async () => true, getHotspotUsers: async () => [user],
      getActiveSessions: async () => connected ? [{ '.id': '*session', user: 'TEST', uptime: '1m' }] : [],
      kickActiveSession: async () => { kicked++; },
      deleteHotspotUser: async () => { throw new Error('Must retain first-login deadline'); },
      createHotspotUser: async () => { throw new Error('Must not recreate a first-login voucher'); },
    };
    const status = await load('app/api/vouchers/status/route.js', deps, ['GET']);
    const validate = await load('app/api/vouchers/validate/route.js', deps, ['GET']);
    const req = () => new Request('https://example.test/?code=TEST');
    const pending = await (await status.GET(req())).json();
    assert.equal(pending.seconds_remaining, durationSeconds(duration));
    assert.equal(voucher.expires_at, null);
    const deadline = new Date(Date.now() + durationSeconds(duration) * 1000).toISOString();
    user.comment = expiryComment(duration, '', deadline);
    assert.equal((await validate.GET(req())).status, 200);
    assert.equal(voucher.expires_at, new Date(Math.floor(Date.parse(deadline) / 1000) * 1000).toISOString());
    const saved = voucher.expires_at;
    await status.GET(req());
    assert.equal(voucher.expires_at, saved);
    user.comment = expiryComment(duration, '', new Date(Date.now() - 60000));
    connected = true;
    assert.equal((await status.GET(req())).status, 410);
    assert.equal(kicked, 1);
    assert.equal((await validate.GET(req())).status, 410);
    assert.equal(voucher.status, 'expired');
  });
}
