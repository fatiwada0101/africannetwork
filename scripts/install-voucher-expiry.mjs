// Upgrade only profiles already managed by Voucher Factory. Dry-run by default.
// node --env-file=.env.local scripts/install-voucher-expiry.mjs --router-id=<uuid> [--apply]
import { createRouterExpiryClient } from '../lib/mikrotik.js';
import { installFirstLoginExpiry } from '../lib/router-voucher-expiry.js';
import { FIRST_LOGIN_SCRIPT, EXPIRY_SWEEP_SCRIPT, EXPIRY_SCRIPT_NAME } from '../lib/voucher-expiry.js';
const routerId = process.argv.find(arg => arg.startsWith('--router-id='))?.slice(12);
if (!routerId) throw new Error('An explicit --router-id is required');
const request = await createRouterExpiryClient(routerId);
const profiles = (await request('/ip/hotspot/user/profile')).filter(p => p['on-login']?.includes('# AN voucher expiry v') || p.name.startsWith('an-factory-'));
if (!profiles.length) throw new Error('No managed factory profiles found; nothing to upgrade');
console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', profiles: profiles.map(p => p.name), ntp: (await request('/system/ntp/client')).status }));
if (process.argv.includes('--apply')) {
  for (const profile of profiles) await installFirstLoginExpiry(request, profile.name);
  const updated = await request('/ip/hotspot/user/profile');
  if (profiles.some(p => !updated.find(u => u.name === p.name)?.['on-login'].startsWith(FIRST_LOGIN_SCRIPT))) throw new Error('Login hook verification failed');
  const script = (await request('/system/script')).find(s => s.name === EXPIRY_SCRIPT_NAME);
  if (script?.source !== EXPIRY_SWEEP_SCRIPT) throw new Error('Expiry sweep verification failed');
  const scheduler = (await request('/system/scheduler')).find(s => s.name === EXPIRY_SCRIPT_NAME);
  if (scheduler?.disabled !== 'false' || scheduler.interval !== '10s') throw new Error('Expiry scheduler verification failed');
  console.log('Installed and verified updated login hooks and 10-second expiry scheduler. Existing voucher deadlines were preserved.');
}
