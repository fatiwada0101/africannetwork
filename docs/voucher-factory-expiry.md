# Voucher Factory: first-login expiry

Policy confirmed by the operator on 2026-10-21: validity starts at the first successful router login and continues while offline. Reconnecting does not renew the voucher. Daily means 24 hours, custom `2d` means 48 hours, weekly means 7 days, and monthly means 30 days.

## Source map

- `app/super-admin/components/VoucherFactoryTab.js`: duration selection, batch requests and printed vouchers.
- `app/api/mikrotik/generate-vouchers/route.js`: validates and normalizes the duration, provisions router users, stores unactivated database records, and reports provisioning/persistence failures.
- `lib/voucher-expiry.js`: shared duration/deadline helpers and RouterOS login/sweep scripts.
- `lib/router-voucher-expiry.js`: checks RouterOS version/clock and installs the login hook and ten-second scheduler.
- `lib/mikrotik.js`: direct provisioning on a dedicated factory profile; router expiry cleanup.
- `lib/voucher-expiry-sync.js`: copies router activation/deadline metadata into Supabase.
- `app/api/vouchers/status/route.js` and `validate/route.js`: use the recorded deadline, target the voucher's router, and never recreate a missing first-login user with fresh validity.
- `app/api/cron/expire-vouchers/route.js`: paginated database reconciliation and retry of router enforcement, regardless of voucher age.
- `supabase/migrations/20261021000001_factory_first_login_expiry.sql`: activation/policy columns and a database sweep that preserves unused first-login stock.

## Why the old cutoffs failed

`limit-uptime` measures connected usage. `keepalive-timeout` detects an unreachable client; extending it to one day does not implement a persistent validity deadline. A short voucher could exhaust connected usage while daily/weekly/monthly vouchers continued across disconnections.

The old factory wrote `expires_at` at generation time, contradicting first-login validity. Database expiry did not itself disconnect router sessions. Cleanup retried only expired records created in the past 48 hours, excluding weekly/monthly records. Duration parsing used substring matches that could confuse `12h` with `2h` and `2 weeks` with one week.

Live diagnosis found factory vouchers marked expired in Supabase still connected on RouterOS 7.19.6. Local Vercel configuration runs expiry reconciliation daily; the separate PostgreSQL sweep only changes database state.

## Enforcement

New factory users have a persistent router comment prefix `ANV1|durationSeconds|deadlineEpochSeconds|`. A zero deadline means unactivated stock. The profile login hook records a deadline once. It is preserved in router configuration across disconnections and reboots. A router scheduler disables due users and removes their active sessions/cookies every ten seconds. Cutoff can lag the deadline by one scheduler interval under normal router load. No browser page or Vercel cron invocation is required for this cutoff.

The router uses its synchronized clock. RouterOS `:tonsec` returns nanoseconds, so the scripts convert to seconds before recording deadlines. Factory profiles retain device and bandwidth settings without inheriting vendor login hooks that might overwrite deadline comments. Connection usage remains capped by `limit-uptime` as an additional limit.

Factory generation currently requires direct router access and RouterOS 7.12+. Polling-mode generation fails explicitly because the old polling agent does not install first-login enforcement. The existing active router uses direct mode. Other purchase flows retain their existing validity policy.

## Rollout and existing vouchers

1. Apply the versioned SQL migration and record it in the existing `public.change_history` audit table; deploy the application changes.
2. Run `node --env-file=.env.local scripts/repair-voucher-expiry.mjs` for a read-only preview.
3. Run with `--apply` to install enforcement and adopt existing factory records. The operator chose to expire older vouchers past their existing database deadline. The repair preserves future deadlines for already-used vouchers and gives still-valid unused stock first-login expiry. It does not revive expired stock or infer a historical first login from accumulated uptime.
4. `--expire-overdue-only --apply` performs only overdue disconnection/disablement without requiring the new schema. It is useful while database migration access is unavailable.
5. Run `scripts/inspect-voucher-expiry.mjs` to compare database expiry against connected/enabled router users.

The repair requires service credentials and router access. Applying SQL through the management API additionally requires a valid `SUPABASE_ACCESS_TOKEN`; the local operator token file is a fallback. No credential values belong in this document or logs.

## Validation

On 2026-10-22, the migration was applied to production and recorded in `public.change_history`. The repair disabled 157 overdue router vouchers; four had already been repaired, and 14 database vouchers had no matching router account. No historical first-login times were invented. All 71 automated checks and the local production build passed.

Production deployment `dpl_7vuauuGwg51KSQgQJtJEUhBe8aTA` is ready at https://wifi-app-seven.vercel.app. Live checks returned homepage 200, missing-code status 400, and unauthenticated expiry cron 401. Router inspection confirmed all 161 matched overdue vouchers disabled and none connected. A temporary voucher created through the production provisioning helper verified a pending 48-hour deadline, the dedicated profile login hook, and the enabled ten-second scheduler; the temporary user was removed. The managed profile and scheduler remain installed for factory use.

`npm run test:expiry` exercises duration boundaries, actual SQL expiry in isolated PostgreSQL, first-login stock, non-extension of deadlines, old-expired cleanup, router installer errors, and factory persistence/rollback behavior. `npm test` includes these cases alongside existing tests.

`scripts/test-router-voucher-expiry.mjs` creates isolated temporary records on the configured direct router. It executes the actual login script for 1h/1d/2d/7d/30d, checks repeat-login preservation, forces elapsed deadlines, and verifies automatic scheduled disablement and unused-stock preservation. It cleans up test records afterward. This validates script execution and scheduling, not a multi-day waiting period or a physical client login.

## Follow-up: 2026-10-24 custom-domain verification

Deployment target: use Vercel project `asuk1/africannetwork` (project ID `prj_RcmTWtAIgDk8bZuT1RQxnf2FOy92`), serving `www.africannetwork.com.ng` and `africannetwork.com.ng`. The local `.vercel/project.json` now points to this project. Do not use the separate `wifi-app` project as proof of deployment to these domains. Re-check the custom domain with `vercel inspect https://www.africannetwork.com.ng --scope asuk1` after each deployment. At verification on October 24, deployment `dpl_8uV9q48FPv2NdRvYrD84UbRcLR2Z` (`africannetwork-pgnjag37v-asuk1.vercel.app`, created 14:46:49 WAT) was Ready, targeted production, and was the deployment returned by inspecting the custom domain.

The operator uses `https://www.africannetwork.com.ng/super-admin`, which belongs to the separate Vercel `africannetwork` project. The October 22 deployment above targeted `wifi-app` only. Factory batches created October 22–23 still had `created_at` policy, plain batch comments, and the default profile without a first-login hook. The running expiry scheduler therefore did not cover them. Read-only inspection found 41 overdue router accounts enabled, including nine connected daily vouchers. NTP was synchronized; this incident was not explained by clock drift.

By the investigation on October 24, both domains served the updated Factory UI; the custom domain had a new production deployment at 14:34 WAT. The targeted repair disabled 41 overdue accounts, adopted three unused weekly vouchers with pending first-login deadlines, and preserved one already-used weekly voucher's existing deadline. Nineteen database records had no matching router account. Verification showed zero enabled or connected overdue accounts. The repair and inspection scripts accept `--router-id=<id>` so a separate polling router does not block a direct-router repair.

A temporary daily voucher was generated through the operator's signed-in Factory UI on the actual custom domain. Its database row had `first_login` policy and no expiry before activation, and its router user had the managed profile. Executing the installed login hook set exactly 86400 seconds of validity and a second execution preserved the deadline. Moving only this test voucher's deadline five seconds ahead demonstrated automatic disablement by the existing production scheduler; the custom-domain validation endpoint returned HTTP 410. The temporary user, database row, and test script were removed. This verifies the live issuance path and automatic scheduler, but does not substitute for a physical client login or waiting a full day.

At the time of that October 24 investigation, clock protection checked only for clearly invalid dates. This limitation prompted the NTP safeguard below.

## October 25: duration audit and synchronized-clock safeguards

The Factory now provides a direct `5h` choice, alongside daily (`1d`), weekly (`7d`), monthly (`30d`) and custom durations. Status and validation share the duration parser, including RouterOS week notation such as `1w` and `4w2d`. Monthly means exactly 30 days, not a calendar month.

The version-2 login hook and sweep read `/system ntp client` on each execution. When its status is not `synchronized`, or the date is clearly invalid, they remove managed voucher sessions/cookies without starting new timers, changing deadlines, or permanently expiring valid users. Once NTP is synchronized, saved deadlines apply again, including hours spent without power. Existing expired users stay disabled. This deliberately makes managed voucher access unavailable while time is untrusted. It relies on NTP reporting accurate synchronization; it is not protection against a false NTP time source or arbitrary manual clock changes while NTP still reports synchronized.

The installer replaces older marked login blocks while preserving unrelated hooks and configures the ten-second scheduler for startup. Upgrade existing managed profiles with `node --env-file=.env.local scripts/install-voucher-expiry.mjs --router-id=<uuid> --apply`; omit `--apply` for a preview. No additional database migration is required. The live African Network router's default and two managed factory profiles were upgraded and source-verified on October 25; existing voucher deadlines were preserved. Inspection found zero enabled or connected overdue factory vouchers.

Validation: all 78 automated checks pass (31 platform checks, 22 payment regressions, 25 voucher-expiry tests). Live isolated RouterOS tests passed for 1h, 5h, 1d, 2d, 7d and 30d, including repeat-login deadline preservation, due-date disablement, automatic scheduling, unused stock, NTP waiting/stopped/local-clock states, invalid dates, and restoration of trusted time. Clock failures were injected into isolated script copies; the real router clock was not changed. These are accelerated deadline tests, not a physical client reboot test or a full 30-day wait.

Production release: deployment `dpl_9gQzpeB6FTS5ianPmV5S1enCzuJV`, created October 25 at 00:30:50 WAT, is Ready in `asuk1/africannetwork`. Its hostname is `africannetwork-blhormd7g-asuk1.vercel.app`; deployment history is https://vercel.com/asuk1/africannetwork/9gQzpeB6FTS5ianPmV5S1enCzuJV. Inspecting `https://www.africannetwork.com.ng` returned this exact deployment, with both custom domains assigned. Local and Vercel production builds passed. Live checks returned admin page 200 with the five-hour option and first-login wording, missing-code validation/status 400, and unauthenticated expiry cron 401. Read-only router inspection also found four connected daily vouchers with saved activation deadlines and none overdue.
