# 🌐 Smart Multi-Router Roaming & Location Platform

> **System Blueprint**: ISP-Grade Centralized Session Accounting, GPS Location Management, and Seamless Wi-Fi Roaming across multiple MikroTik Routers.

---

## Executive Summary

Asuk Tech is evolving from a single-router hotspot controller into an **ISP-grade, multi-location Wi-Fi platform**. Users can purchase an internet voucher at **Location A** (e.g., Campus Library) and seamlessly continue using their remaining time and data allowance when they walk into **Location B** (e.g., Student Center) or **Location C** (e.g., Cafeteria), without purchasing a new pass or losing session continuity.

Administrators manage an unlimited fleet of MikroTik routers from a single unified dashboard, assigning each router to a physical location with precise **GPS coordinates**, **coverage radius**, and **geofencing** powered by Google Maps / Mapbox APIs.

---

## 🏛️ System Architecture Overview

```
                          ┌─────────────────────────────────────┐
                          │         ASUK TECH CLOUD             │
                          │   (Next.js App + Supabase DB)       │
                          │                                     │
                          │  • Central Voucher Ledger           │
                          │  • Unified Session Accounting       │
                          │  • Geolocation Engine (Haversine)   │
                          │  • Cross-Router Task Dispatcher     │
                          └──────────────────┬──────────────────┘
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             │                               │                               │
             ▼                               ▼                               ▼
  ┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
  │   ROUTER 1: HQ      │         │  ROUTER 2: ANNEX    │         │  ROUTER 3: BRANCH   │
  │  Identity: Asuk-HQ  │         │ Identity: Asuk-Anx  │         │ Identity: Asuk-Br   │
  │  GPS: 6.5244, 3.3792│         │ GPS: 6.6018, 3.3515 │         │ GPS: 6.4531, 3.4211 │
  │  Radius: 150m       │         │ Radius: 100m        │         │ Radius: 200m        │
  └──────────┬──────────┘         └──────────┬──────────┘         └──────────┬──────────┘
             │                               │                               │
             ▼                               ▼                               ▼
       [User Surfs]  ───────────────►  [User Moves]  ───────────────►  [User Resumes]
       Location A                        Location B                      Location C
    (Uses 1h of 3h)                   (Picks up 2h left)              (Finishes pass)
```

---

## 📑 Detailed Architecture Documentation

| Document | Focus Area |
|---|---|
| [**01. Architecture & Roaming Sync**](./01-architecture-and-sync.md) | Centralized accounting, session ledger, router sync (Direct & Polling), handoff mechanics |
| [**02. Database Schema & Migrations**](./02-database-schema.md) | Tables (`locations`, `routers`, `roaming_sessions`), voucher schema enhancements |
| [**03. GPS & Location Management**](./03-gps-and-location-management.md) | Google Maps / Mapbox integration, GPS radius geofencing, multi-signal location resolution |
| [**04. User Roaming Experience**](./04-user-roaming-experience.md) | User UX flow, captive portal CNA compatibility, zero-loss remaining time resumption |
| [**05. Implementation Phases**](./05-implementation-phases.md) | 4-phase rollout plan, milestones, test scenarios, and verification criteria |

---

## 🎯 Core Technical Guarantees

1. **True Time Preservation**: Time consumed is tracked centrally down to the second across all routers. A 24-hour pass used for 3 hours at Location A has exactly 21 hours remaining when connecting at Location B.
2. **Dual-Signal Location Resolution**: Captive portal URLs inject router identity (`?router=$(identity)`), providing 100% reliable hardware location detection even if user denies mobile GPS permission.
3. **No Double-Spending**: When a roaming handoff occurs, any stale session at the prior location is forcefully terminated (`kickActiveSession`), preventing concurrent use by unauthorized third parties.
4. **NAT/Cloud Friendly**: Supports both direct public IP routers (REST HTTPS) and private behind-NAT routers (automated RouterOS polling agent).
