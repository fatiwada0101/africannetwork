# Asuk Tech Wi-Fi Hotspot & Wallet — Agent Rules

## Project Identity

This is a **Next.js 16** white-label Wi-Fi hotspot management platform for Nigerian ISPs.
**Currency**: Nigerian Naira (₦ / NGN). **Payment**: Flutterwave. **Router**: MikroTik.

## Critical Rules

1. **Financial safety**: NEVER directly UPDATE wallet balances. Always use the `adjust_wallet_balance()` RPC function for atomic operations.
2. **Auth patterns**: Admin routes use `validateAdminAuth(request)` from `lib/admin-auth.js`. User routes use `validateUserAuth(request)` from `lib/user-auth.js`.
3. **Service role key**: NEVER expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code or `NEXT_PUBLIC_*` env vars.
4. **RLS required**: Every new database table MUST have Row Level Security enabled with appropriate policies.
5. **Super admin monolith**: The file `app/super-admin/page.js` is 301KB / 6324 lines. Do NOT add more code to it. New admin features should be separate component files.
6. **Idempotent migrations**: All SQL migrations must use `IF NOT EXISTS` / `IF EXISTS` for idempotency.
7. **Rate limiting**: All API routes are rate-limited via `middleware.js`. No need for per-route rate limit imports.
8. **Error handling**: Always wrap API handlers in try/catch. Return structured JSON errors with appropriate HTTP status codes.

## Available Skills

When working on this codebase, check these skills for context:
- `supabase-credentials` — Access tokens and project identification
- `supabase-migrations` — How to apply database schema changes
- `asuk-tech-project-context` — Full architecture and conventions reference
- `api-route-development` — Templates for creating API routes
- `production-roadmap` — Feature backlog and implementation tracking

## Key File Locations

| Purpose | Path |
|---------|------|
| Database schema | `scripts/schema.sql` |
| Admin auth library | `lib/admin-auth.js` |
| Supabase client | `lib/supabase-server.js` |
| Zod validation | `lib/schemas.js` |
| Rate limiting | `middleware.js` |
| Production roadmap | `docs/production-roadmap/PROGRESS.md` |
| Environment vars | `.env.local` |
