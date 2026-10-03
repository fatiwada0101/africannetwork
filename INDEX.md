# African Network project index

Verified from the local working tree on 2026-10-03 (Africa/Lagos).

## Project and workspace

African Network (also called Asuk Tech in older notes) is a Nigerian Wi-Fi hotspot platform: customers buy prepaid internet passes, maintain an NGN wallet, and connect through MikroTik captive portals. Operators manage plans, routers, vouchers, payments, and customer operations through a super-admin dashboard.

The Git repository and runnable app are this `wifi-app/` directory. Its parent contains prototype assets, screenshots, project skills, and a second copy of the documentation. Run application commands from `wifi-app/`.

This index describes the current working tree, including pre-existing uncommitted edits. It is a navigation and onboarding reference, not certification of deployed functionality. No remote database, gateway, router, or deployment was contacted while indexing. Credential values are deliberately omitted.

## Stack and commands

- Next.js **16.3.4**, App Router; React and React DOM **19.2.8** (package.json).
- Most source is JavaScript/JSX. TypeScript **7.0.2** and `types/platform.d.ts` are present; `tsconfig.json` has `allowJs: true`, `strict: false`.
- Supabase provides PostgreSQL, user authentication, RLS, and Realtime.
- MikroTik RouterOS REST integration supports direct access and router polling.
- Flutterwave and Monnify checkout/verification code are present; Paystack has a helper and webhook route. Do not assume these gateways have equivalent checkout support.
- Styling is custom CSS; PDF/export helpers use jsPDF, AutoTable, and xlsx. QR generation uses qrcode; validation uses Zod; admin authentication uses bcryptjs and jsonwebtoken.
- Vercel deployment configuration is in `vercel.json`. PWA support uses `app/manifest.js`, `public/sw.js`, and `public/offline.html`.

Commands: `npm install`, `npm run dev`, `npm run build`, `npm start`, `npm test`. No lint script is defined.

Read [AGENTS.md](AGENTS.md) before application edits; it requires consulting the relevant installed Next.js guide under `node_modules/next/dist/docs/` before writing code.

## Architecture and ownership

- [app/layout.js](app/layout.js): global layout; wraps the UI in AuthProvider, BrandingProvider, and LanguageProvider; loads payment SDKs and registers the service worker.
- [app/context/AuthContext.js](app/context/AuthContext.js): Supabase session lifecycle, user profile/wallet loading, wallet database-change and broadcast subscriptions, focus refresh.
- [app/context/BrandingContext.js](app/context/BrandingContext.js): public runtime settings, branding, palette and theme persistence.
- [app/context/LanguageContext.js](app/context/LanguageContext.js): English, Nigerian Pidgin, Yoruba, Hausa, and Igbo dictionaries.
- [app/components/CheckoutModal.js](app/components/CheckoutModal.js): wallet purchase and gateway checkout, verification calls, voucher presentation.
- [app/super-admin/page.js](app/super-admin/page.js): operator dashboard shell with 21 component files in `app/super-admin/components/`.
- `app/api/`: 60 filesystem API routes; route-specific authorization, validation, and operations.
- [middleware.js](middleware.js): API-wide tiered rate limiting, conditional CSRF checking, correlation IDs and response headers.
- [lib/supabase.js](lib/supabase.js): browser Supabase client. [lib/supabase-server.js](lib/supabase-server.js): lazy service-role client and wallet broadcasts.
- [lib/mikrotik.js](lib/mikrotik.js): router settings, diagnostics, hotspot users/profiles, sessions, connection logs, queued tasks, walled garden, captive portal upload, reboot/restore operations.
- [lib/roaming.js](lib/roaming.js): router resolution by identity/GPS/default, remaining-time helpers, cross-router handoff and session records.
- [lib/scheduler.js](lib/scheduler.js): WAT-based pricing rules. [lib/sms.js](lib/sms.js): Termii delivery and Nigerian phone formatting.
- [lib/reconciliation.js](lib/reconciliation.js): local transaction versus gateway reconciliation. [lib/paystack.js](lib/paystack.js): Paystack operations/signature helper.
- [lib/tenant.js](lib/tenant.js): hostname-based tenant/branding resolution with a primary-tenant fallback.
- [lib/schemas.js](lib/schemas.js): shared Zod schemas and request body validation. [lib/sanitize.js](lib/sanitize.js): sanitization utilities.
- [lib/logger.js](lib/logger.js): structured console logging, field redaction, financial logging. [lib/changeHistory.js](lib/changeHistory.js): settings history and rollback helpers.
- `lib/hotspotTemplates.js`, `lib/receiptGenerator.js`, `lib/voucherCardGenerator.js`, `lib/voucher-utils.js`: captive portal templates, receipts, printable voucher sheets, and voucher/reference generation.

## Main flows

### Wallet purchase

`CheckoutModal` sends an authenticated POST to `/api/purchase`. The server validates the user, reads authoritative plan pricing from `plans`, checks for a recent matching purchase, and calls `adjust_wallet_balance` to deduct funds. It provisions or queues a router user through `createOrQueueHotspotUser`; when the router path fails or is unconfigured, it tries `claim_fallback_voucher`. Failure paths attempt refunds. Successful purchases persist transaction/voucher records and notify the user.

Wallet deduction is atomic at the RPC level; the complete purchase spans multiple database and router operations. The recent-purchase check is not a single atomic transaction across that whole flow.

### Gateway purchase and wallet funding

Checkout callbacks call `/api/purchase/verify-payment`; wallet funding calls `/api/wallet/topup`. These routes load gateway configuration, verify with the selected gateway, and persist the resulting voucher or wallet credit. Flutterwave, Monnify, and Paystack webhook routes provide separate server-to-server processing. Reference checks and database constraints are used for duplicate prevention; live concurrency and callback/webhook races were not exercised during indexing.

### Router access and roaming

Direct mode calls RouterOS from the server. Polling mode queues work in `pending_router_tasks`; the router fetches tasks and reports completion at `/api/mikrotik/polling` using a shared secret. Admin polling setup/script/status routes support deployment and diagnosis. Roaming routes call `lib/roaming.js` to resolve target routers and move a voucher/session while tracking remaining entitlement.

### Operator control

`/super-admin` coordinates modular tabs for finance, plans, branding, gateways, router configuration, hotspot users/profiles, live sessions, health, voucher manufacturing/fallback stock, locations, resellers, support, analytics, tenants, database schema, and history.

## Authentication and request boundaries

- Users: [lib/user-auth.js](lib/user-auth.js) reads `Authorization: Bearer <Supabase access token>` and verifies it with `auth.getUser`. The older skill's cookie-only description does not match this helper.
- Admins: [lib/admin-auth.js](lib/admin-auth.js) implements bcrypt password verification, 24-hour JWT sessions, per-instance login lockout, and legacy Basic Auth compatibility. Inspect the individual route's selected auth helper before changing it.
- CSRF: middleware compares `csrf_token` cookie with `X-CSRF-Token` on mutations only when that cookie exists; selected prefixes are exempt.
- Rate limiting: [lib/rate-limit.js](lib/rate-limit.js) uses a process-local Map; state resets with the instance and is not globally shared.
- Webhooks: provider-specific secrets/signature checks in each handler.
- Cron: both cron handlers check a Bearer secret when `CRON_SECRET` is configured; absence skips that check.
- Polling: secret in query/body, matched against `app_settings.polling_config`.
- Browser queries rely on database RLS. The privileged server client requires explicit route authorization and ownership checks.

## Database map

Versioned SQL is in [supabase/migrations](supabase/migrations); [scripts/schema.sql](scripts/schema.sql) is a separate schema/setup artifact. Compare them before applying database changes.

1. `20260917000001_initial_schema.sql`: `profiles`, `wallets`, `transactions`, `vouchers`, `plans`, `notifications`, `app_settings`, `change_history`, `pending_router_tasks`, `fallback_vouchers`; signup initialization and core RPCs/RLS.
2. `20260917000002_multi_router_roaming.sql`: `locations`, `routers`, `roaming_sessions`, voucher roaming/accounting additions and RLS.
3. `20260917000003_phase3_growth.sql`: `voucher_transfers` and growth-related voucher fields/RLS.
4. `20260917000004_phase4_business.sql`: `referral_rewards`, `reseller_commissions`, `support_tickets`, `push_subscriptions`, profile enhancements, wallet transfer RPC and RLS.
5. `20260917000005_phase5_scale.sql`: `tenants`, tenant-related schema additions, RLS, and primary-tenant seed.
6. `20261003000001_monnify_payment_settlement.sql`: server-owned Monnify orders, atomic wallet settlement, voucher leases/fallback recovery, service-only privileges, and idempotent polling task keys. See [Monnify rollout notes](docs/monnify-integration.md); this migration is not yet applied remotely.

Key RPCs: `handle_new_user`, `adjust_wallet_balance`, `claim_fallback_voucher`, `expire_outdated_vouchers`, `get_admin_stats`, `transfer_wallet_balance`, `settle_monnify_payment`, `claim_monnify_fallback`, `complete_monnify_voucher`.

`app_settings` holds runtime JSON configuration including branding, router access, hotspot settings, admin credentials, payment gateways, and polling. Do not expose private settings through public/client responses. Keep wallet changes in atomic RPCs, source prices from the catalog, and include RLS with schema additions.

## Configuration and operations

Environment variable names referenced by source include:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Application/admin/cron: `NEXT_PUBLIC_APP_URL`, `JWT_SECRET`, `CRON_SECRET`.
- Router defaults: `MIKROTIK_IP`, `MIKROTIK_PORT`, `MIKROTIK_USER`, `MIKROTIK_PASS`, `MIKROTIK_PROTOCOL`, `MIKROTIK_USE_SSL`, `MIKROTIK_HOTSPOT_URL`, `MIKROTIK_WIFI_SSID`.
- Payments: `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`, `MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY`, `MONNIFY_CLIENT_SECRET`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`.
- SMS: `TERMII_API_KEY`. Runtime code also reads `NODE_ENV` and sets `NODE_TLS_REJECT_UNAUTHORIZED` in router operations.

Use `.env.example` as a starting point; runtime settings also come from the database. This list describes source references, not proof that values are configured locally or in production.

`next.config.mjs` defines security/CSP headers and aliases: `/signup` -> `/auth`, `/plans` -> `/packages`, `/passes` -> `/vouchers`, and `/api/mikrotik/test` -> `/api/mikrotik/test-connection`. `/admin` redirects to `/super-admin`.

Current Vercel cron expressions are `0 0 * * *` for voucher expiry and `30 0 * * *` for renewal: daily at 00:00/00:30 UTC (01:00/01:30 WAT). Notes claiming 15-minute/10-minute intervals do not match this checked-in configuration.

## Documentation and validation status

- [docs/production-roadmap/PROGRESS.md](docs/production-roadmap/PROGRESS.md): feature tracker; its body marks all 31 features complete while its opening summary still says phase 4 is active.
- [docs/multi-router-roaming/README.md](docs/multi-router-roaming/README.md): architecture, database, GPS, experience and implementation notes.
- [README.md](README.md): setup guidance, but its Next.js 14 and authentication descriptions are outdated.
- [public/openapi.json](public/openapi.json): currently describes 10 paths, considerably fewer than the 60 implemented route files. [app/docs/page.js](app/docs/page.js) is a custom searchable specification viewer.
- [test/run-all.js](test/run-all.js): `npm test` passed **31/31** on 2026-10-03. Many checks assert source/file presence or sample arithmetic; some exercise real helper functions. Passing does not verify live payments, applied remote migrations, router behavior, end-to-end flows, or full production readiness.
- Test execution warned that the package omits module type and that `JWT_SECRET` was absent from the test process. No environment file was loaded by this test command.
- During the subsequent Monnify fix task, `npm test` passed all 31 existing checks plus 22 Monnify regressions, and the production build passed. Monnify regression tests use actual settlement SQL in isolated PostgreSQL with mocked gateway/router boundaries. Configured Supabase was checked read-only: Monnify is disabled, credentials empty, and the settlement migration absent. See [rollout notes](docs/monnify-integration.md).
- Existing local modifications include payment/settings/UI/schema/test helpers and an untracked Monnify webhook route. Preserve them when starting new work.

## Page inventory

- `/admin` — [app/admin/page.js](app/admin/page.js)
- `/analytics` — [app/analytics/page.js](app/analytics/page.js)
- `/auth` — [app/auth/page.js](app/auth/page.js)
- `/auth/reset-password` — [app/auth/reset-password/page.js](app/auth/reset-password/page.js)
- `/docs` — [app/docs/page.js](app/docs/page.js)
- `/login` — [app/login/page.js](app/login/page.js)
- `/packages` — [app/packages/page.js](app/packages/page.js)
- `/` — [app/page.js](app/page.js)
- `/reseller` — [app/reseller/page.js](app/reseller/page.js)
- `/reseller/signup` — [app/reseller/signup/page.js](app/reseller/signup/page.js)
- `/status` — [app/status/page.js](app/status/page.js)
- `/super-admin` — [app/super-admin/page.js](app/super-admin/page.js)
- `/vouchers` — [app/vouchers/page.js](app/vouchers/page.js)
- `/vouchers/status` — [app/vouchers/status/page.js](app/vouchers/status/page.js)
- `/wallet` — [app/wallet/page.js](app/wallet/page.js)

## API route inventory

Methods below are exported handlers found in source. Authorization and payload contracts are route-specific; follow the linked implementation.

- `GET /api/admin/stats` — [app/api/admin/stats/route.js](app/api/admin/stats/route.js)
- `GET /api/cron/auto-renew` — [app/api/cron/auto-renew/route.js](app/api/cron/auto-renew/route.js)
- `GET /api/cron/expire-vouchers` — [app/api/cron/expire-vouchers/route.js](app/api/cron/expire-vouchers/route.js)
- `GET /api/mikrotik/active-sessions` — [app/api/mikrotik/active-sessions/route.js](app/api/mikrotik/active-sessions/route.js)
- `POST /api/mikrotik/auto-setup` — [app/api/mikrotik/auto-setup/route.js](app/api/mikrotik/auto-setup/route.js)
- `POST /api/mikrotik/create-voucher` — [app/api/mikrotik/create-voucher/route.js](app/api/mikrotik/create-voucher/route.js)
- `GET, POST, DELETE /api/mikrotik/generate-vouchers` — [app/api/mikrotik/generate-vouchers/route.js](app/api/mikrotik/generate-vouchers/route.js)
- `GET, PUT, PATCH, DELETE /api/mikrotik/hotspot-profiles` — [app/api/mikrotik/hotspot-profiles/route.js](app/api/mikrotik/hotspot-profiles/route.js)
- `GET, DELETE, PATCH /api/mikrotik/hotspot-users` — [app/api/mikrotik/hotspot-users/route.js](app/api/mikrotik/hotspot-users/route.js)
- `POST /api/mikrotik/kick-user` — [app/api/mikrotik/kick-user/route.js](app/api/mikrotik/kick-user/route.js)
- `GET, POST /api/mikrotik/logs` — [app/api/mikrotik/logs/route.js](app/api/mikrotik/logs/route.js)
- `GET, POST /api/mikrotik/polling` — [app/api/mikrotik/polling/route.js](app/api/mikrotik/polling/route.js)
- `GET /api/mikrotik/polling/script` — [app/api/mikrotik/polling/script/route.js](app/api/mikrotik/polling/script/route.js)
- `POST /api/mikrotik/polling/setup` — [app/api/mikrotik/polling/setup/route.js](app/api/mikrotik/polling/setup/route.js)
- `GET, POST /api/mikrotik/polling/status` — [app/api/mikrotik/polling/status/route.js](app/api/mikrotik/polling/status/route.js)
- `GET, POST /api/mikrotik/push-login-page` — [app/api/mikrotik/push-login-page/route.js](app/api/mikrotik/push-login-page/route.js)
- `POST /api/mikrotik/reboot` — [app/api/mikrotik/reboot/route.js](app/api/mikrotik/reboot/route.js)
- `POST /api/mikrotik/restore-defaults` — [app/api/mikrotik/restore-defaults/route.js](app/api/mikrotik/restore-defaults/route.js)
- `POST /api/mikrotik/sync-hotspot` — [app/api/mikrotik/sync-hotspot/route.js](app/api/mikrotik/sync-hotspot/route.js)
- `GET /api/mikrotik/system-health` — [app/api/mikrotik/system-health/route.js](app/api/mikrotik/system-health/route.js)
- `GET /api/mikrotik/test-connection` — [app/api/mikrotik/test-connection/route.js](app/api/mikrotik/test-connection/route.js)
- `GET /api/mikrotik/test` — [app/api/mikrotik/test/route.js](app/api/mikrotik/test/route.js)
- `GET, POST, DELETE /api/mikrotik/walled-garden` — [app/api/mikrotik/walled-garden/route.js](app/api/mikrotik/walled-garden/route.js)
- `GET, PATCH, POST /api/notifications` — [app/api/notifications/route.js](app/api/notifications/route.js)
- `POST, DELETE /api/notifications/subscribe` — [app/api/notifications/subscribe/route.js](app/api/notifications/subscribe/route.js)
- `POST /api/payments/monnify/initialize` — [app/api/payments/monnify/initialize/route.js](app/api/payments/monnify/initialize/route.js)
- `POST /api/purchase` — [app/api/purchase/route.js](app/api/purchase/route.js)
- `POST /api/purchase/verify-payment` — [app/api/purchase/verify-payment/route.js](app/api/purchase/verify-payment/route.js)
- `GET, POST /api/referrals` — [app/api/referrals/route.js](app/api/referrals/route.js)
- `GET /api/reseller/commissions` — [app/api/reseller/commissions/route.js](app/api/reseller/commissions/route.js)
- `POST /api/reseller/purchase` — [app/api/reseller/purchase/route.js](app/api/reseller/purchase/route.js)
- `POST /api/reseller/signup` — [app/api/reseller/signup/route.js](app/api/reseller/signup/route.js)
- `GET, POST /api/roaming/check-status` — [app/api/roaming/check-status/route.js](app/api/roaming/check-status/route.js)
- `POST /api/roaming/handoff` — [app/api/roaming/handoff/route.js](app/api/roaming/handoff/route.js)
- `GET /api/settings/public` — [app/api/settings/public/route.js](app/api/settings/public/route.js)
- `GET, PUT /api/settings/scheduler` — [app/api/settings/scheduler/route.js](app/api/settings/scheduler/route.js)
- `GET /api/super-admin/analytics` — [app/api/super-admin/analytics/route.js](app/api/super-admin/analytics/route.js)
- `POST, DELETE /api/super-admin/auth` — [app/api/super-admin/auth/route.js](app/api/super-admin/auth/route.js)
- `GET, POST, PATCH /api/super-admin/change-history` — [app/api/super-admin/change-history/route.js](app/api/super-admin/change-history/route.js)
- `GET, POST, DELETE /api/super-admin/fallback-vouchers` — [app/api/super-admin/fallback-vouchers/route.js](app/api/super-admin/fallback-vouchers/route.js)
- `POST /api/super-admin/finance/reconcile` — [app/api/super-admin/finance/reconcile/route.js](app/api/super-admin/finance/reconcile/route.js)
- `GET /api/super-admin/finance` — [app/api/super-admin/finance/route.js](app/api/super-admin/finance/route.js)
- `GET, POST, PUT, DELETE /api/super-admin/locations` — [app/api/super-admin/locations/route.js](app/api/super-admin/locations/route.js)
- `GET, POST, DELETE /api/super-admin/plans` — [app/api/super-admin/plans/route.js](app/api/super-admin/plans/route.js)
- `GET, PATCH /api/super-admin/resellers` — [app/api/super-admin/resellers/route.js](app/api/super-admin/resellers/route.js)
- `GET, POST, PUT, DELETE /api/super-admin/routers` — [app/api/super-admin/routers/route.js](app/api/super-admin/routers/route.js)
- `GET /api/super-admin/schema` — [app/api/super-admin/schema/route.js](app/api/super-admin/schema/route.js)
- `GET, POST /api/super-admin/settings` — [app/api/super-admin/settings/route.js](app/api/super-admin/settings/route.js)
- `GET /api/super-admin/tenants` — [app/api/super-admin/tenants/route.js](app/api/super-admin/tenants/route.js)
- `GET, POST, PATCH /api/support/tickets` — [app/api/support/tickets/route.js](app/api/support/tickets/route.js)
- `GET, POST /api/tenant/config` — [app/api/tenant/config/route.js](app/api/tenant/config/route.js)
- `POST /api/vouchers/auto-renew` — [app/api/vouchers/auto-renew/route.js](app/api/vouchers/auto-renew/route.js)
- `POST /api/vouchers/gift` — [app/api/vouchers/gift/route.js](app/api/vouchers/gift/route.js)
- `GET /api/vouchers/status` — [app/api/vouchers/status/route.js](app/api/vouchers/status/route.js)
- `GET /api/vouchers/validate` — [app/api/vouchers/validate/route.js](app/api/vouchers/validate/route.js)
- `POST /api/wallet/topup` — [app/api/wallet/topup/route.js](app/api/wallet/topup/route.js)
- `POST /api/wallet/transfer` — [app/api/wallet/transfer/route.js](app/api/wallet/transfer/route.js)
- `POST, GET /api/webhook/flutterwave` — [app/api/webhook/flutterwave/route.js](app/api/webhook/flutterwave/route.js)
- `POST, GET /api/webhook/monnify` — [app/api/webhook/monnify/route.js](app/api/webhook/monnify/route.js)
- `POST /api/webhook/paystack` — [app/api/webhook/paystack/route.js](app/api/webhook/paystack/route.js)
