---
name: Nazafa Phase 8 features
description: Smart Cancel, Provider Achievement Badges, User Cashback Wallet, Admin Geo Heatmap — implemented in v8 sprint
---

## Features Added

### Smart Cancellation Flow (`artifacts/mobile/app/cancel.tsx`)
- New dedicated screen instead of Alert dialog
- 6 cancellation reasons with icons
- Retention offer for "retainable" reasons (time/price/provider) — animated pulse card offering 10% off next booking
- If user cancels anyway → generates promo code + notifies provider
- Navigate to it from bookings.tsx: `router.push({ pathname: "/cancel", params: { bookingId, providerId, serviceTitle } })`

### Provider Achievement Badges (`artifacts/mobile/app/provider/[id].tsx`)
- `ProviderBadges` component defined before `export default`
- 8 badge types: 💎 بلاتيني, 🏆 خبير معتمد, ❤️ محبوب, ⭐ الأعلى تقييماً, ⚡ استجابة سريعة, 🥇 نجم نظافة, 🔰 مزود جديد, ✅ موثّق
- Badges computed from: `rating`, `jobs` (completedJobs), `experience` (experience_years)
- Replaces old hardcoded "Smart Badges" section

### User Cashback Wallet (`artifacts/mobile/app/(tabs)/profile.tsx`)
- Card added between loyalty card and activity stats
- Shows 5% cashback on total spent (bookingsCount × 175 × 0.05)
- "جاهز للاستخدام" badge when available ≥ 15 ر.س
- `cashStyles` StyleSheet added at bottom of file

### Admin Geo Heatmap (`artifacts/admin/src/pages/GeoHeatmap.tsx`)
- Route: `/geo-heatmap`, nav label: "الخريطة الحرارية", icon: 🌍 (section: عام)
- Uses `react-leaflet` + `leaflet` (installed via pnpm in artifacts/admin)
- Clusters bookings by 0.04° grid; circle size/color = demand intensity
- KPI cards: total bookings, with coords, coverage%, active zones
- Top 10 areas table with intensity bar
- Filter by: days (7/30/90) + status
- Reads `address_lat`, `address_lng` from bookings table

**Why:** Uber-level geo intelligence for admin to allocate providers intelligently.

## Key Files Changed
- `artifacts/mobile/app/cancel.tsx` — new
- `artifacts/mobile/app/(tabs)/bookings.tsx` — cancelBooking now navigates to /cancel
- `artifacts/mobile/app/provider/[id].tsx` — ProviderBadges component added
- `artifacts/mobile/app/(tabs)/profile.tsx` — cashback widget + cashStyles
- `artifacts/admin/src/pages/GeoHeatmap.tsx` — new
- `artifacts/admin/src/App.tsx` — GeoHeatmap route added
- `artifacts/admin/src/components/Layout.tsx` — geo-heatmap nav item added
- `DEVELOPMENT_PLAN_v8.md` — full v8 roadmap at repo root
