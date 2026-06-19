---
name: Nazafa Phase 4 features
description: Smart search, Surge Banner, Quick Rebook, Subscription Plans, Provider Badges — implementation notes
---

## Phase 4 Features (June 2026)

### Smart Search (search.tsx)
- Full rewrite — was hardcoded static data, now live Supabase queries
- Debounced 350ms. Searches `services.title_ar` + `providers.profiles.full_name` via `.ilike()`
- Filter chips: all / services / providers
- BookingState has no `setServiceId` — use `setCleanerId` or navigate directly to `/booking`

### Surge Pricing Banner (home.tsx)
- State: `surgeMultiplier` fetched from `EXPO_PUBLIC_API_URL + /api/pricing/dynamic`
- Shows orange/red LinearGradient banner when `surgeMultiplier > 1.05`
- Percentage shown: `Math.round((multiplier - 1) * 100)%`

### Quick Rebook Section (home.tsx)
- State: `recentBookings` — last 4 completed bookings, deduped by service title
- Fetched in same useEffect as surge, gated on `session?.user?.id`
- Horizontal scroll cards with 🧹 icon + service name + total + "احجز مجدداً" chip

### Subscription Plans Screen (subscription-plans.tsx)
- New file — 3 plans: أساسية 199/mo, بريميوم 349/mo, VIP 599/mo
- Monthly/yearly billing toggle (yearly shows per-month price + savings)
- Linked from profile.tsx via green banner above Premium Membership card
- `handleSubscribe` shows Alert "قادم قريباً" — needs payment gateway integration

### Provider Smart Badges (provider/[id].tsx)
- `completedJobs` state: count query from bookings where status=completed
- Badges: ⭐ Highest Rated (rating ≥ 4.8), ⚡ Fast Response (experience ≥ 3yr), 🏆 Expert (jobs > 50), 🆕 New (jobs=0 and exp ≤ 1yr), ✅ Verified (always)
- Stats row now shows completedJobs count instead of review count

**Why:** These bring the app to Uber/Handy level in terms of UX completeness. All TypeScript clean (pnpm exec tsc --noEmit returns zero errors).
