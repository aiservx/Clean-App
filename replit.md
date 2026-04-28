# Workspace

## Overview

Arabic RTL cleaning services mobile app (نظافة) built with Expo. Pixel-perfect clones of attached design screens with full RTL support, Cairo Arabic typography, and a premium clean aesthetic.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile**: Expo Router with React Native
- **Fonts**: Cairo (Arabic, weights 400/500/600/700)
- **State**: AsyncStorage + React Query
- **Maps**: react-native-maps@1.18.0 (native), styled fallback on web
- **Icons**: @expo/vector-icons (Feather, MaterialCommunityIcons)

## Mobile App Structure

`artifacts/mobile/` — Expo app with the following screens:
- `app/onboarding.tsx` — 3-panel intro carousel
- `app/(tabs)/index.tsx` — Home (map + booking CTA + services scroll)
- `app/(tabs)/bookings.tsx` — My bookings
- `app/(tabs)/offers.tsx` — Offers & promotions
- `app/(tabs)/chat.tsx` — Messages
- `app/(tabs)/profile.tsx` — User profile, addresses, settings
- `app/services.tsx` — Service category selection (2x2 grid)
- `app/booking.tsx` — Date/time/cleaner selection
- `app/tracking.tsx` — Live cleaner tracking with map
- `app/rating.tsx` — 5-star feedback
- `app/payment.tsx` — Payment methods + order summary
- `components/AppMap.tsx` / `AppMap.native.tsx` — Platform-split map wrapper

RTL is forced globally in `app/_layout.tsx` via `I18nManager.forceRTL(true)`.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/mobile run dev` — run Expo dev server (use `restart_workflow` instead)
