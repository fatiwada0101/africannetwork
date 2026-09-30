# Phase 3: 🟡 Growth Features (Month 2)

> **Timeline**: Month 2  
> **Priority**: High — User engagement & business expansion  
> **Status**: ⬜ Not Started  
> **Depends on**: Phase 1 + Phase 2 complete

---

## Checklist

| # | Feature | Status | Effort | Impact |
|---|---------|--------|--------|--------|
| 3.1 | [Data Usage Tracking](./3.1-data-usage-tracking.md) | ⬜ | Medium | Users see data consumption |
| 3.2 | [Push Notifications](./3.2-push-notifications.md) | ⬜ | Medium | Native push via service worker |
| 3.3 | [Voucher Sharing](./3.3-voucher-sharing.md) | ⬜ | Medium | Gift vouchers, QR codes |
| 3.4 | [Multi-Language (i18n)](./3.4-multi-language.md) | ⬜ | Large | Pidgin, Hausa, Yoruba, Igbo |
| 3.5 | [Multi-Router Support](./3.5-multi-router.md) | ⬜ | Large | Multiple MikroTik routers |
| 3.6 | [Paystack Fallback](./3.6-paystack-fallback.md) | ⬜ | Medium | Payment gateway redundancy |
| 3.7 | [Auto-Renew Subscriptions](./3.7-auto-renew.md) | ⬜ | Medium | Recurring wallet deductions |

---

## Key Decisions Needed

- **Multi-router**: How to handle plan→router assignment?
- **Paystack**: Run alongside Flutterwave or auto-failover?
- **i18n**: `next-intl` vs custom lightweight solution?
