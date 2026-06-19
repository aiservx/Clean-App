---
name: Nazafa analytics, dispatch & Phase 2 features
description: All new features added across Phase 1 and Phase 2 sessions
---

## Phase 1 Features
- Analytics page (recharts) — /analytics
- Auto-dispatch API — /api/dispatch/suggest + /api/dispatch/auto-assign
- Analytics API — /api/analytics/*
- Enhanced Dashboard with sparklines + mini revenue chart

## Phase 2 Features (current session)

### Admin Dashboard New Pages
- **DynamicPricing.tsx** (`/dynamic-pricing`) — 24h × 7d interactive pricing grid, multiplier presets, peak preset auto-fill, save to `app_settings` table
- **API** `pricing.ts` — GET /api/pricing/config + GET /api/pricing/multiplier (reads current hour's multiplier)

### Admin Dashboard Rewrites
- **Notifications.tsx** — completely rewritten: 8 quick templates, phone preview, send history tab, target selector buttons, char counter
- **Providers.tsx** — completely rewritten: rich card grid (avatar, stars, stats bar, location badge, batch select), approve/suspend with push notification, batch actions, pending approval alert banner
- **Bookings.tsx** — enhanced: 🤖 auto-dispatch button on pending bookings (calls /api/dispatch/suggest, shows modal with provider details), CSV export (UTF-8 BOM for Arabic), date range filter

### Navigation
- **Layout.tsx sidebar** — grouped nav with section headers (عام / الكتالوج / المستخدمون / العمليات / التسويق / الدعم / الإعدادات)
- Added Dynamic Pricing (⚡) to nav under "عام" section

## Architecture Notes
- DynamicPricing saves to `app_settings` table keyed `dynamic_pricing` — mobile app can read `/api/pricing/multiplier` at booking time to show adjusted price
- Auto-dispatch modal shows top-1 provider from scoring algo (proximity 40% + rating 30% + acceptance 20% + load 10%)
- CSV export uses UTF-8 BOM prefix (\uFEFF) for proper Arabic display in Excel
