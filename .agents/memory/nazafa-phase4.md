---
name: Nazafa Phase 4+5 features
description: What was built in Phase 4 and Phase 5 of the Nazafa app
---

## Phase 4 (completed)
- Smart search (real Supabase full-text), Surge Banner (home), Quick Rebook, Subscription Plans screen, Provider Smart Badges
- Smart Search: debounced 350ms, searches `services.title_ar` + `providers.profiles.full_name` via `.ilike()`. Filter chips: all / services / providers.
- Surge Banner: fetches from `EXPO_PUBLIC_API_URL + /api/pricing/dynamic`, shows when `surgeMultiplier > 1.05`
- Quick Rebook: last 4 completed bookings deduped by service, horizontal scroll
- Subscription Plans: 3 tiers (199/349/599 ر.س/mo), linked from profile.tsx
- Provider Smart Badges: ⭐ highest rated (≥4.8), ⚡ fast (exp ≥ 3yr), 🏆 expert (jobs >50), ✅ verified

## Phase 5 (completed June 2026)
- `artifacts/mobile/components/SkeletonLoader.tsx` — shimmer animation: SkeletonBox, SkeletonCard, SkeletonProviderCard, SkeletonBookingCard, SkeletonServiceCard, SkeletonProfileHeader
- `artifacts/mobile/app/tip.tsx` — Tip screen (إكرامية): amount chips (5/10/15/20 ر.س), custom input, success animation. Triggered via `showTipAfter` param on rating screen.
- `artifacts/mobile/components/ProviderQuickView.tsx` — Bottom sheet on map marker tap: provider details + book button
- `artifacts/mobile/app/booking-success.tsx` — Celebration screen: confetti, booking summary, track/home buttons
- `artifacts/mobile/app/(tabs)/home.tsx` — "المزودون المميزون" horizontal section: skeleton loading + sorted provider cards with badges and quick-book. Styles: topProvCard, topProvAvatarWrap, topProvAvatar, topProvAvatarFallback, topProvInitial, topProvOnline, topProvBadge, topProvBadgeText, topProvName, topProvRatingRow, topProvRating, topProvDist, topProvRate, topProvBookBtn, topProvBookText.
- `artifacts/mobile/app/(tabs)/bookings.tsx` — Skeleton loading replaces ActivityIndicator; rating flow passes `showTipAfter: "1"` param
- `artifacts/mobile/app/_layout.tsx` — Registered `tip` and `booking-success` screens
- `artifacts/api-server/src/routes/pricing.ts` — Added `/api/pricing/dynamic` route (alias for mobile app calls)
- `DEVELOPMENT_PLAN.md` — updated to v5.0, Phase 5 marked ✅ complete

**Why:** Phase 5 closed the gap vs Uber/Careem: skeleton loading, tip flow, booking success celebration, provider quick view, top providers section.
