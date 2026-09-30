# 🔍 Codebase Audit — Baseline State

> **Audit Date**: 2026-09-17  
> **Scope**: 50+ source files, 17 API route groups, 10 pages, 10 libraries, full DB schema

---

## ✅ What's Already Solid

| Area | Status | Key Files |
|------|--------|-----------|
| MikroTik REST API integration | ✅ Robust (direct + polling modes) | [`lib/mikrotik.js`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/lib/mikrotik.js) (86KB) |
| Wallet system with atomic RPC | ✅ Race-condition safe | [`scripts/schema.sql`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/scripts/schema.sql) — `adjust_wallet_balance()` |
| Flutterwave card payments | ✅ Idempotent webhooks | `api/webhook/flutterwave/` |
| Fallback voucher pool | ✅ Atomic claims with `FOR UPDATE SKIP LOCKED` | `claim_fallback_voucher()` in schema |
| Super Admin dashboard | ✅ Feature-rich (16 tabs) | [`super-admin/page.js`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/app/super-admin/page.js) (301KB) |
| Real-time wallet balance | ✅ Supabase Realtime | Client-side subscription |
| PWA with service worker | ✅ Installable | `public/sw.js`, [`app/manifest.js`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/app/manifest.js) |
| Security headers | ✅ X-Frame, CORS, CSP, HSTS-lite | [`next.config.mjs`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/next.config.mjs) |
| Dynamic branding & 8 themes | ✅ White-label ready | `app_settings.branding` |
| PDF receipts & voucher cards | ✅ Working | [`lib/receiptGenerator.js`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/lib/receiptGenerator.js), [`lib/voucherCardGenerator.js`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/lib/voucherCardGenerator.js) |
| RLS policies on all 10 tables | ✅ Applied | [`scripts/schema.sql`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/scripts/schema.sql) lines 416-472 |
| Captive portal login page | ✅ Working | [`app/login/`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/app/login/) |
| Voucher expiry cron | ✅ Every 15min | [`api/cron/expire-vouchers/route.js`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/app/api/cron/expire-vouchers/route.js) |
| Rate limit library | ✅ Built (not yet integrated) | [`lib/rate-limit.js`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/lib/rate-limit.js) |
| CSP header | ✅ Fully configured | [`next.config.mjs`](file:///c:/Users/DEEPMIND/Desktop/Asuk%20Tech/wifi-app/next.config.mjs) lines 48-59 |

---

## 🏗️ Architecture Overview

### Tech Stack
- **Framework**: Next.js 16.3.4 (App Router)
- **Runtime**: React 19.2.8
- **Database**: Supabase (PostgreSQL)
- **Payments**: Flutterwave
- **Router**: MikroTik RouterOS (REST API)
- **Hosting**: Vercel (London region `lhr1`)
- **Styling**: 105KB CSS with 8 color palettes

### Database Tables (10)
1. `profiles` — User accounts linked to `auth.users`
2. `wallets` — User balances (CHECK >= 0)
3. `transactions` — Financial ledger
4. `vouchers` — Wi-Fi hotspot vouchers
5. `plans` — Internet packages
6. `notifications` — In-app notifications
7. `app_settings` — KV config store (branding, MikroTik creds, templates)
8. `change_history` — Audit trail with rollback
9. `pending_router_tasks` — Async task queue for polling routers
10. `fallback_vouchers` — Offline voucher pool

### Database Functions (5)
1. `handle_new_user()` — Auto-create profile + wallet on signup
2. `adjust_wallet_balance()` — Atomic balance operations
3. `claim_fallback_voucher()` — Atomic voucher claim with row locking
4. `expire_outdated_vouchers()` — Cleanup expired vouchers
5. `get_admin_stats()` — Real-time analytics aggregation

### API Route Groups (10 directories)
```
api/
├── admin/           — Admin operations
├── cron/            — Scheduled jobs (voucher expiry)
├── mikrotik/        — Router management (test, sync, polling)
├── notifications/   — User notification CRUD
├── purchase/        — Payment & voucher purchase flows
├── settings/        — App settings management
├── super-admin/     — Admin auth, plans, finance, schema, fallback vouchers
├── vouchers/        — Voucher status & management
├── wallet/          — Wallet operations
└── webhook/         — Flutterwave payment webhooks
```

### Key Libraries (11 files)
| File | Size | Purpose |
|------|------|---------|
| `mikrotik.js` | 86KB | Full MikroTik RouterOS REST API client |
| `hotspotTemplates.js` | 34KB | Captive portal HTML template generation |
| `receiptGenerator.js` | 34KB | PDF receipt generation |
| `voucherCardGenerator.js` | 14KB | PDF voucher card generation |
| `changeHistory.js` | 10KB | Audit trail / change tracking |
| `rate-limit.js` | 4KB | In-memory rate limiter with profiles |
| `supabase-server.js` | 3KB | Server-side Supabase client |
| `admin-auth.js` | 2KB | Basic Auth validation (⚠️ plaintext) |
| `user-auth.js` | 1KB | User JWT auth helper |
| `voucher-utils.js` | 1KB | Voucher code generation |
| `supabase.js` | 1KB | Client-side Supabase client |

---

## 🚨 Critical Gaps Identified

### Security (MUST fix before going live)
1. **Admin Auth**: Plaintext password in `app_settings`, Basic Auth with no session tokens
2. **Rate Limiting**: Library exists but NOT integrated into any routes
3. **CSRF**: No tokens on any state-changing endpoints
4. **Input Validation**: Zod installed but no schemas defined
5. **Super Admin Size**: 301KB single file — performance & maintainability risk

### Infrastructure
1. **No structured logging** — all errors go to `console.error`
2. **No database migrations** — single `schema.sql` file
3. **No staging environment** — production credentials only
4. **No automated tests** — zero test files

### User Experience
1. **No SMS/WhatsApp delivery** — voucher codes lost if tab closes
2. **No push notifications** — polling only
3. **No dark mode** — light theme only
4. **No data usage display** — users can't see consumption
5. **No multi-language** — English only

---

## 📐 Dependencies & Versions

```json
{
  "@supabase/supabase-js": "^2.115.0",
  "jspdf": "^4.2.1",
  "jspdf-autotable": "^5.0.8",
  "next": "16.3.4",
  "react": "19.2.8",
  "react-dom": "19.2.8",
  "xlsx": "^0.18.5",
  "zod": "^4.6.5"
}
```
