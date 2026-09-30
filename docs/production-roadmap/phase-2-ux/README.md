# Phase 2: 🟠 Infrastructure & UX (Week 3-4)

> **Timeline**: Week 3-4  
> **Priority**: High — Production stability & developer experience  
> **Status**: 🟡 Partially Done (cron job complete)  
> **Depends on**: Phase 1 complete

---

## Checklist

| # | Feature | Status | Effort | Impact |
|---|---------|--------|--------|--------|
| 2.1 | [Voucher Expiry Cron](./2.1-voucher-expiry-cron.md) | ✅ Done | — | — |
| 2.2 | [Structured Logging](./2.2-structured-logging.md) | ⬜ | Medium | Debugging, monitoring |
| 2.3 | [DB Migration Versioning](./2.3-db-migrations.md) | ⬜ | Small | Safer schema changes |
| 2.4 | [Environment Separation](./2.4-environment-separation.md) | ⬜ | Medium | Safer deployments |
| 2.5 | [Super Admin Split](./2.5-super-admin-split.md) | ⬜ | Large | Performance, maintainability |
| 2.6 | [SMS Voucher Delivery](./2.6-sms-voucher-delivery.md) | ⬜ | Medium | User retention |
| 2.7 | [Dark Mode](./2.7-dark-mode.md) | ⬜ | Medium | User preference |

---

## Implementation Order

1. **2.5 Super Admin Split** — Unblocks all future admin features, reduces deploy size
2. **2.2 Structured Logging** — Enables debugging everything else
3. **2.3 DB Migrations** — Safer schema changes for upcoming features
4. **2.4 Environment Separation** — Test safely before deploying
5. **2.7 Dark Mode** — Quick UX win
6. **2.6 SMS Delivery** — Requires external API signup (Africa's Talking / Termii)

---

## Key Decisions Needed

- **Logging provider**: Sentry vs LogTail vs Axiom?
- **SMS provider**: Africa's Talking vs Termii vs Twilio? (Nigeria-focused)
- **Super admin split**: Tab-per-file or group-by-domain?
