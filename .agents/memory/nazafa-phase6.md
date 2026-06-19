---
name: Nazafa Phase 6 Features
description: Phase 6 revolutionary features — SOS button, earnings goal, activity stats, promo codes admin page. DEVELOPMENT_PLAN.md at v6.0.
---

# Phase 6 Features (June 2026)

## What was added

### 1. SOS Safety Button — `artifacts/mobile/app/tracking.tsx`
- Red emergency button shown to customers only (not providers) during active non-pending bookings
- Uses `Vibration.vibrate([0, 80, 40, 80])` for physical feedback
- Alert options: call 911, report problem, cancel booking
- Added `sosStyles` StyleSheet at bottom of file
- Requires `Vibration` import from react-native (added alongside existing imports)

### 2. Earnings Goal Widget — `artifacts/mobile/app/(provider)/dashboard.tsx`
- Shows daily earnings target (500 SAR default) with animated progress bar
- Color changes: red (<40%) → amber (<75%) → green (≥75%)
- Dynamic motivational message based on progress
- Inserted after `statsRow`, before `mapWrap` section
- Added `goalStyles` StyleSheet at bottom of file

### 3. Activity Stats Widget — `artifacts/mobile/app/(tabs)/profile.tsx`
- 4-box grid: total spent, CO₂ saved, streak weeks, badges earned
- Badge achievements: 1/5/10/20 completed bookings
- Uses `bookingsCount` already fetched in the component
- Inserted after loyalty points card, before "Saved Addresses"
- Added `actStyles` StyleSheet at bottom of file

### 4. Promo Codes Admin Page — `artifacts/admin/src/pages/PromoCodes.tsx`
- Full CRUD interface for discount codes (mock data, can connect to DB)
- Support for percent (%) and fixed (SAR) discount types
- Usage progress bar, copy-to-clipboard, toggle active/inactive, delete
- Create form modal with: code, type, value, min order, max uses, expiry, description
- Added to admin routing: `artifacts/admin/src/App.tsx` (import + route `/promo-codes`)
- Added to admin sidebar: `artifacts/admin/src/components/Layout.tsx` (التسويق section)

**Why:** Phase 6 goals — SOS for safety (Uber parity), earnings goal for provider retention (Careem parity), activity stats for gamification/loyalty, promo codes for revenue growth.

**TypeScript note:** `EMPTY_FORM` in PromoCodes.tsx must be explicitly typed as `{ type: "percent" | "fixed"; ... }` — using `as const` on `type: "percent"` causes the useState to infer the narrower literal type, breaking the setter.
