import { EXPIRY_SCRIPT_NAME, FIRST_LOGIN_SCRIPT, EXPIRY_SWEEP_SCRIPT, LOGIN_MARKER } from './voucher-expiry.js';

// request(path, method, body) is injected so the installer is testable without a router.
export async function installFirstLoginExpiry(request, profileName) {
  const resource = await request('/system/resource');
  const [major, minor] = String(resource.version).split('.').map(Number);
  if (major < 7 || (major === 7 && minor < 12) || !major) throw new Error('First-login voucher expiry requires RouterOS 7.12 or later');
  const clock = await request('/system/clock');
  const routerTime = Date.parse(`${clock.date}T${clock.time}${clock['gmt-offset'] || '+00:00'}`);
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(clock.date) || !Number.isFinite(routerTime) || Math.abs(routerTime - Date.now()) > 300000) {
    throw new Error('Synchronize the router clock before generating vouchers');
  }
  const profiles = await request('/ip/hotspot/user/profile');
  const profile = profiles.find(p => p.name === profileName);
  if (!profile) throw new Error(`Hotspot user profile "${profileName}" does not exist`);
  const scripts = await request('/system/script');
  const script = scripts.find(s => s.name === EXPIRY_SCRIPT_NAME);
  if (script && script.source !== EXPIRY_SWEEP_SCRIPT) {
    await request(`/system/script/${encodeURIComponent(script['.id'])}`, 'PATCH', { source: EXPIRY_SWEEP_SCRIPT, policy: 'read,write,test' });
  } else if (!script) {
    await request('/system/script', 'PUT', { name: EXPIRY_SCRIPT_NAME, source: EXPIRY_SWEEP_SCRIPT, policy: 'read,write,test' });
  }
  const schedulers = await request('/system/scheduler');
  const scheduler = schedulers.find(s => s.name === EXPIRY_SCRIPT_NAME);
  const schedule = { interval: '10s', 'on-event': `/system script run ${EXPIRY_SCRIPT_NAME}`, policy: 'read,write,test', disabled: 'false' };
  if (scheduler) await request(`/system/scheduler/${encodeURIComponent(scheduler['.id'])}`, 'PATCH', schedule);
  else await request('/system/scheduler', 'PUT', { name: EXPIRY_SCRIPT_NAME, ...schedule });
  // Preserve unrelated vendor login hooks. Avoid appending a second copy on retries.
  const existing = profile['on-login'] || '';
  if (!existing.includes(LOGIN_MARKER)) {
    await request(`/ip/hotspot/user/profile/${encodeURIComponent(profile['.id'])}`, 'PATCH', { 'on-login': FIRST_LOGIN_SCRIPT + '\n' + existing, 'keepalive-timeout': '2m' });
  }
  // Execute once to expose script syntax/permission errors before issuing vouchers.
  await request('/system/script/run', 'POST', { number: EXPIRY_SCRIPT_NAME });
}
