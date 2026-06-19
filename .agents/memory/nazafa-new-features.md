---
name: Nazafa Phase 1+2 features
description: What has been built in Phase 1 and Phase 2 of the Nazafa cleaning app, and what is planned next.
---

## Phase 1 (Complete)
- Monorepo (pnpm workspaces): mobile (Expo/port 18115), admin (Vite/port 5000), api-server (Express/port 8080)
- RTL Arabic Expo app with Tajawal fonts
- Booking Wizard (4 steps), Real-time tracking, Chat, AI Assistant
- Admin Dashboard (15+ pages), Push Notifications (FCM), Provider Dashboard + Wallet
- Offers/Coupons, Referrals (UI), Themes (light/dark/system)
- Analytics page (recharts), Auto-dispatch API, Dynamic Pricing grid (Admin)

## Phase 2 (Implemented June 2026)
- **ActiveBookingCard** (`components/ActiveBookingCard.tsx`): Uber-style live booking card on home screen, animated pulse, realtime subscription, auto-hides when no active booking
- **ProviderBadges** (`components/ProviderBadge.tsx`): Dynamic badges (متميز ⭐/الأكثر طلباً 🏆/خبير 👑/جديد 🌱) based on rating/bookings/experience
- **PlatformStatsStrip** (`components/PlatformStatsStrip.tsx`): Social proof bar on home — today's bookings, active providers, avg rating, all from live DB
- **Auto Rating Prompt** (bookings.tsx): Realtime subscription → when booking status becomes "completed", auto-navigates to /rating after 1.5s delay
- **Smart Re-book** (bookings.tsx): reorder(item) now shows provider name in confirm dialog and passes service_id + provider_id to booking flow
- **DEVELOPMENT_PLAN.md**: Comprehensive 5-phase roadmap at project root

## Phase 3 (Planned — next week)
- Provider Earnings Charts (recharts)
- Loyalty Points System
- Surge Pricing UI
- Booking Timeline improvements
- Scheduled Reminders (cron via API server)

## Phase 4 (Planned — next month)
- Before/After Photo Upload
- Corporate Accounts B2B
- Subscription Plans (نظافة Gold)

**Why:** Tracking feature progression and avoiding re-implementing already-built features.
**How to apply:** Check this file before starting new features to avoid duplicate work.
