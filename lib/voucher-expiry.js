// One duration parser for database deadlines, RouterOS counters and factory input.
// RouterOS 'm' means minutes; a monthly voucher is explicitly 30d.
export function durationSeconds(value) {
  const text = String(value ?? '').trim().toLowerCase();
  const aliases = { daily: 86400, weekly: 604800, monthly: 2592000 };
  if (aliases[text]) return aliases[text];
  if (/^\d+$/.test(text)) return Number(text);
  const clock = text.match(/^(?:(\d+)w)?\s*(?:(\d+)d)?\s*(\d+):(\d{2}):(\d{2})$/);
  if (clock) return Number(clock[1] || 0) * 604800 + Number(clock[2] || 0) * 86400 + Number(clock[3]) * 3600 + Number(clock[4]) * 60 + Number(clock[5]);
  const units = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
  const normalized = text.replace(/weeks?/g, 'w').replace(/days?/g, 'd').replace(/hours?/g, 'h').replace(/minutes?/g, 'm').replace(/seconds?/g, 's').replace(/\s+/g, '');
  if (!/^(?:\d+[wdhms])+$/.test(normalized)) return 0;
  return [...normalized.matchAll(/(\d+)([wdhms])/g)].reduce((sum, m) => sum + Number(m[1]) * units[m[2]], 0);
}

export function calculateExpiresAt(duration, fromDate = new Date()) {
  const seconds = durationSeconds(duration);
  const start = new Date(fromDate).getTime();
  if (!seconds || !Number.isFinite(start)) throw new Error('Invalid voucher duration or start date');
  return new Date(start + seconds * 1000).toISOString();
}

// Router-owned persistent metadata. A zero deadline means never activated.
export function expiryComment(duration, comment = '', expiresAt = null) {
  const seconds = durationSeconds(duration);
  if (!seconds || seconds > 366 * 86400) throw new Error('Voucher duration must be between 1 second and 366 days');
  const deadline = expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : 0;
  if (!Number.isSafeInteger(deadline) || deadline < 0) throw new Error('Invalid voucher deadline');
  return `ANV1|${seconds}|${deadline}|${comment}`;
}

export function readExpiryComment(comment) {
  const match = String(comment || '').match(/^ANV1\|(\d+)\|(\d+)\|/);
  if (!match) return null;
  const seconds = Number(match[1]);
  const deadline = Number(match[2]);
  if (!Number.isSafeInteger(seconds) || seconds <= 0 || seconds > 366 * 86400 || !Number.isSafeInteger(deadline) || deadline > 100000000000) return null;
  return { seconds, deadline, activated_at: deadline ? new Date((deadline - seconds) * 1000).toISOString() : null, expires_at: deadline ? new Date(deadline * 1000).toISOString() : null };
}

export function voucherDeadline(voucher) {
  if (voucher.expires_at) return Date.parse(voucher.expires_at);
  if (voucher.expiry_policy === 'first_login') return null;
  const seconds = durationSeconds(voucher.duration);
  return seconds && voucher.created_at ? Date.parse(voucher.created_at) + seconds * 1000 : null;
}

export const EXPIRY_SCRIPT_NAME = 'an-voucher-expiry-v1';
export const LOGIN_MARKER = '# AN voucher expiry v2';

// Read NTP directly on every execution. RouterOS global variables are not
// reliably shared between REST, scheduler and HotSpot execution contexts.
// After reboot, no activation/expiry decision is allowed until NTP is trusted.
export const CLOCK_GUARD_SCRIPT = `:local anNow ([:tonsec [:timestamp]] / 1000000000)
:local anClockReady false
:local anNtpStatus ""
:do { :set anNtpStatus [/system ntp client get status] } on-error={}
:if (($anNtpStatus = "synchronized") && ($anNow >= 1704067200)) do={
  :set anClockReady true
}`;

// Persist the deadline once, on successful authentication. No HTTP callback,
// session uptime, database availability, or subsequent login can reset it.
export const FIRST_LOGIN_SCRIPT = `${LOGIN_MARKER}
:local anId [/ip hotspot user find where name=$user]
:if ([:len $anId] > 0) do={
  :local anComment [/ip hotspot user get $anId comment]
  :if ([:pick $anComment 0 5] = "ANV1|") do={
    :local anSep [:find $anComment "|" 5]
    :local anEnd [:find $anComment "|" ($anSep + 1)]
    :local anSeconds [:tonum [:pick $anComment 5 $anSep]]
    :local anDeadline [:tonum [:pick $anComment ($anSep + 1) $anEnd]]
    ${CLOCK_GUARD_SCRIPT}
    :if ($anClockReady = false) do={
      /ip hotspot active remove [find where user=$user]
      /ip hotspot cookie remove [find where user=$user]
      :error "Voucher login requires synchronized router clock"
    }
    :if ($anDeadline = 0) do={
      :set anDeadline ($anNow + $anSeconds)
      /ip hotspot user set $anId comment=("ANV1|" . $anSeconds . "|" . $anDeadline . "|" . [:pick $anComment ($anEnd + 1) [:len $anComment]])
    }
    :if ($anNow >= $anDeadline) do={
      :if ([/ip hotspot user get $anId disabled] = false) do={ /ip hotspot user set $anId disabled=yes }
      /ip hotspot active remove [find where user=$user]
      /ip hotspot cookie remove [find where user=$user]
    }
  }
}
# End AN voucher expiry v2`;

// Disabled records retain the deadline across reboot and allow DB reconciliation.
// Runs every 10 seconds, including while clients are offline. Never starts a timer.
export const EXPIRY_SWEEP_SCRIPT = `${CLOCK_GUARD_SCRIPT}
:foreach anId in=[/ip hotspot user find] do={
  :local anComment [/ip hotspot user get $anId comment]
  :if ([:pick $anComment 0 5] = "ANV1|") do={
    :local anSep [:find $anComment "|" 5]
    :local anEnd [:find $anComment "|" ($anSep + 1)]
    :local anDeadline [:tonum [:pick $anComment ($anSep + 1) $anEnd]]
    :local anUser [/ip hotspot user get $anId name]
    :if ($anClockReady = false) do={
      /ip hotspot active remove [find where user=$anUser]
      /ip hotspot cookie remove [find where user=$anUser]
    } else={
    :if (($anDeadline > 0) && ($anNow >= $anDeadline)) do={
      :if ([/ip hotspot user get $anId disabled] = false) do={ /ip hotspot user set $anId disabled=yes }
      /ip hotspot active remove [find where user=$anUser]
      /ip hotspot cookie remove [find where user=$anUser]
    }
    }
  }
}`;
