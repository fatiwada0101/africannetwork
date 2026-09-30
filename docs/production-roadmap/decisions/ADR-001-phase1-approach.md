# ADR-001: Phase 1 Security Hardening Approach

> **Date**: 2026-09-17  
> **Status**: Proposed  
> **Context**: Security gaps identified in codebase audit

---

## Decision

Start with Phase 1 security hardening before any feature work because:

1. **Real money is at stake** — wallet operations, payment processing
2. **Admin auth is plaintext** — single most critical vulnerability
3. **No rate limiting active** — brute-force attacks possible
4. **No input validation** — XSS/injection vectors open

## Approach

### What we're NOT doing (yet):
- Distributed rate limiting (Upstash Redis) — in-memory is sufficient for current scale
- Full TOTP 2FA — can be added later as opt-in
- Full TypeScript — incremental migration in Phase 5

### What we ARE doing:
- Integrating existing rate-limit library into all routes
- Replacing Basic Auth with JWT + bcrypt sessions
- Adding Zod schema validation on all inputs
- CSRF protection via double-submit cookie pattern

## Consequences

- Admin must re-login after auth migration (expected, one-time)
- Slightly higher response latency from validation layer (~1-2ms)
- JWT secret must be added to environment variables

## References

- [Codebase Audit](../codebase-audit.md)
- [Phase 1 README](../phase-1-security/README.md)
