# 04. User Roaming Experience

> **End-to-End User Journey**: How users seamlessly roam across physical locations without purchasing duplicate passes or losing remaining time.

---

## 1. The Roaming Journey (Step-by-Step)

### Scene 1: Initial Purchase at Location A (e.g., Campus Library)
1. User arrives at Location A, connects to **"Asuk Tech Wi-Fi"**.
2. Captive portal opens: user clicks **"Buy a Data Plan"**.
3. Selects **"1 Day Unlimited (24 Hours)"** for ₦500.
4. Pays via Wallet balance or Flutterwave card.
5. Voucher `ASUK-8921-X9` is generated and provisioned on **Router A** with `limitUptime = 24h`.
6. User browses for **3 hours**. Accumulated usage: 3h. Remaining: 21h.
7. User leaves the library.

---

### Scene 2: Arrival at Location B (e.g., Student Cafeteria)
1. User enters the cafeteria and connects to **"Asuk Tech Wi-Fi"** (served by **Router B**).
2. Captive portal opens.
3. The Asuk Tech PWA / web app immediately queries `/api/roaming/check-status`:
   - Inspects `user_id` (if logged in) or device `mac` / stored session tokens.
   - **Active Voucher Detected!**
     - Code: `ASUK-8921-X9`
     - Plan: `1 Day Unlimited`
     - Time Remaining: `21 hours 00 mins`
     - Origin: `Campus Library`
     - Current Location: `Student Cafeteria (Detected)`
4. The user sees a high-impact, welcoming UI banner:
   ```
   ┌───────────────────────────────────────────────────────────┐
   │  👋 Welcome to Asuk Tech - Student Cafeteria              │
   │                                                           │
   │  You have an active pass with 21 hours remaining!         │
   │  [⚡ Resume Surfing Now]                                  │
   │                                                           │
   │  Want to use a different code? [Enter Another Voucher]    │
   └───────────────────────────────────────────────────────────┘
   ```
5. User taps **"Resume Surfing Now"**:
   - The app calls `/api/roaming/handoff` with `{ voucher_code: "ASUK-8921-X9", target_router: "Asuk-Cafeteria" }`.
   - Cloud terminates any stale session at Router A.
   - Cloud provisions `ASUK-8921-X9` on Router B with `limitUptime = 21h`.
   - Submits credentials to Router B's `$(link-login-only)` automatically.
   - User is connected within 1.5 seconds!

---

## 2. Captive Portal Mini-Browser (CNA) Handling

Operating systems (iOS CNA, Android Captive Portal, Windows WISPr) open restricted web views before granting network connectivity.

- **Zero-Friction Fast Path**:
  - The login form on every router includes a hidden JavaScript bridge.
  - If a user previously saved their voucher on that phone (in cookies or localStorage), the captive portal page can offer 1-tap resumption without typing the 12-character code again.
- **Manual Entry Fallback**:
  - If the user uses a new device or cleared cookies, they simply type `ASUK-8921-X9` into the voucher code input.
  - Router B submits this to the central platform for roaming validation.
  - The platform provisions the remaining time and logs the user in.

---

## 3. Real-Time Balance & Roaming Widget in User App

In the user app dashboard (`/status` and `/`):
- **Live Roaming Indicator**: Displays current connected router and location name:
  `📍 Connected at: Annex Cafe (Router #3)`
- **Dynamic Time Countdown**: Centrally computed time remaining that ticks down accurately regardless of how many times the user switches locations.
- **Location Coverage Map**: Interactive map showing all active hotspots in the city with distances from user's current GPS location.
