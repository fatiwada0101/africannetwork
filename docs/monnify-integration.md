# Monnify integration: operation and verification

Updated 2026-10-03 (Africa/Lagos).

## Checkout and settlement

Customer checkout first calls `POST /api/payments/monnify/initialize`. The server creates an order in `monnify_payment_intents` with authoritative amount, purpose, user/guest email, environment, API key identifier, and a plan snapshot. The browser opens the SDK using the returned amount and reference.

Wallet callbacks use `/api/wallet/topup`; voucher callbacks use `/api/purchase/verify-payment`. Both delegate to `lib/monnify.js`. The webhook uses the same settlement path, so successful voucher purchases can fulfill after the browser closes. Callback transaction IDs and metadata do not define entitlement.

Verification authenticates against Monnify and queries by the stored payment reference. It requires `PAID`, matching reference, matching NGN amount, and a provider transaction reference. SQL enforces unique provider references across all orders/purposes. Wallet ledger/balance/order changes commit together. Voucher provisioning uses a two-minute lease and a stored stable code; retries check for an existing router user without resetting its quota. Fallback voucher selection is stored atomically with the order. Router polling tasks have unique order keys.

Failed voucher provisioning leaves a paid order for retry. The browser saves pending references in sessionStorage and exposes a recovery action. Guest references act as unguessable recovery tokens; preserve them privately. A support operator can inspect the order status and reference in Supabase if the original tab/session is gone. Automatic provider webhook retries are finite; persistent infrastructure outages need operator intervention.

Live webhooks require a valid HMAC-SHA512 signature over the raw body with the configured Client Secret. Monnify sandbox webhooks omit signatures: they still require a stored sandbox order and authenticated server-side API verification. The configured environment must match the API key's `MK_PROD_` prefix.

## Required rollout steps

1. Apply `supabase/migrations/20261003000001_monnify_payment_settlement.sql` to the target Supabase project before deploying/enabling this checkout. The same DDL is appended to `scripts/schema.sql` for new installations. It adds a service-only order table, a nullable unique router-task key, and three service-only RPCs. Do not rerun the entire setup schema just to apply this change.
2. Deploy the application changes with the updated CSP and checkout initialization route.
3. In Super Admin, enter matching sandbox API Key, Secret Key, and Contract Code. Enable Monnify, select Sandbox/Test Mode, save its configuration, and save Monnify as the active gateway. For live mode, enter live credentials and the webhook Client Secret before enabling it.
4. Configure Transaction Completion webhook to `https://<your-app-domain>/api/webhook/monnify` in the corresponding Monnify environment. Configure the provider's origin allowlist at trusted hosting/network infrastructure for production, using Monnify's documented origin. Do not trust an arbitrary client-supplied forwarding header as proof of origin.
5. Complete an actual sandbox wallet deposit and voucher purchase. Confirm the gateway result, ledger, wallet delta, and router/queued voucher. Close a checkout before asynchronous payment completion and confirm webhook recovery. Retry callback/webhook and confirm one credit/voucher.

Changing keys/environment while orders are in flight causes verification to stop safely. Resolve outstanding orders before rotating credentials or retain access to the original environment for support recovery.

Read-only setup check on 2026-10-03 found the configured project still using Flutterwave, with Monnify disabled, no Monnify credentials, and this migration absent. No remote schema changes, deployment, or real payment were made during this task.

## Automated validation

`npm test` runs the existing 31 checks and `test/monnify.test.mjs`. `npm run test:monnify` runs the focused suite alone.

The focused suite exercises production handler/helper bodies with injected gateway/router boundaries. It executes the actual settlement migration in PGlite PostgreSQL against table definitions extracted from the baseline migration. It tests signatures, sandbox verification, replay, user/purpose binding, amount/currency checks, failed-credit rollback, duplicate callbacks, browser-independent vouchers, provisioning retries, fallback persistence, leases, privileges, configuration validation, SDK callback/close ordering, router retries, CSRF, and CSP. Local PostgreSQL tests do not establish real network/provider correctness or multi-instance production concurrency performance.

Validation completed: 31 existing checks and 22 focused checks pass; `npm run build` passes. A real sandbox payment remains unverified until the rollout prerequisites above are supplied.

## Provider references

- [Monnify webhook security and sandbox signature behavior](https://developers.monnify.com/docs/webhooks)
- [Monnify web checkout and callback contract](https://developers.monnify.com/docs/collections/one-time-payments/checkout-page)
- [Monnify payment verification quickstart](https://developers.monnify.com/docs/collections/quickstart)
