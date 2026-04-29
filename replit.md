# Workspace

## Overview

Arabic RTL cleaning services mobile app (نظافة) built with Expo + Supabase backend. Full RTL support, Cairo/Tajawal Arabic typography, premium green aesthetic. Includes admin dashboard at `artifacts/admin/` and Express API at `artifacts/api-server/`.

## How to run (one-click)

The "Start application" workflow runs `bash scripts/start-all.sh`, which kills any stale processes on ports 8080/18115/23744 and then launches all three services in parallel:

- API server → port 8080
- Admin dashboard → port 23744 (`/admin/`)
- Mobile app (Expo) → port 18115

The artifact-specific workflows (artifacts/mobile: expo, artifacts/admin: web, artifacts/api-server) will show "failed" while Start application is running because they would bind to the same ports — that is expected. Use them only if you stop Start application and want to run a single service.

## Routing notes

- `app/index.tsx` is a router-only screen: it routes to `/(tabs)/home` for users/guests and `/(provider)/home` for providers/admins.
- The tab home pages live at `app/(tabs)/home.tsx` and `app/(provider)/home.tsx` (NOT `index.tsx` — keeping them as `home.tsx` avoids a URL collision with `app/index.tsx` which previously caused "page not found" on web).
- `lib/auth.tsx` auto-creates a profile row from `user_metadata` if the DB row is missing, so the app never deadlocks on login/signup.
- `lib/serviceImages.ts` provides curated Unsplash image URLs per service category and a static fallback for categories/services so the UI is never empty when Supabase is unreachable.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile**: Expo Router + React Native (Expo SDK 54)
- **Backend**: Supabase (PostgreSQL + RLS + Auth)
- **Fonts**: Tajawal (Arabic, weights 400/500/600/700)
- **State**: Supabase + React Context (`lib/auth.tsx`)
- **Maps**: react-native-maps@1.18.0 (native), styled fallback on web
- **Icons**: @expo/vector-icons (Feather, MaterialCommunityIcons)
- **Admin**: React + Vite + Tailwind at `artifacts/admin/`

## Supabase

- **URL**: `https://ppokdtzlisaxsrmtwlrb.supabase.co`
- **Env vars**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (in `.replit` userenv)
- **Auth**: email/password; roles stored in `profiles.role` (user/provider/admin)
- **Key tables**: `profiles`, `providers`, `bookings`, `services`, `addresses`, `payouts`, `notifications`, `reviews`
- **Admin check**: `is_admin()` function in DB, RLS policies for all tables

## Mobile App Structure

`artifacts/mobile/` — Expo app:
- `app/onboarding.tsx` — 3-panel intro carousel
- `app/login.tsx` / `app/signup.tsx` — Auth screens
- `app/index.tsx` — Root redirect (checks onboarded → role → route)
- `app/(tabs)/index.tsx` — Home (map + booking CTA + services scroll)
- `app/(tabs)/bookings.tsx` — My bookings
- `app/(tabs)/offers.tsx` — Offers & promotions
- `app/(tabs)/chat.tsx` — Messages
- `app/(tabs)/profile.tsx` — User profile (real data from auth + Supabase)
- `app/(provider)/index.tsx` — Provider home (nearby orders, stats, map)
- `app/(provider)/bookings.tsx` — Provider's accepted bookings
- `app/(provider)/wallet.tsx` — Earnings + transaction history
- `app/(provider)/profile.tsx` — Provider profile
- `app/provider-edit.tsx` — Edit provider profile (saves to Supabase)
- `app/withdraw.tsx` — Withdrawal request screen
- `app/statement.tsx` — Provider earnings statement
- `app/booking.tsx` — Date/time/cleaner selection
- `app/tracking.tsx` — Live cleaner tracking with map
- `app/rating.tsx` — 5-star feedback
- `app/payment.tsx` — Payment methods + order summary
- `components/AppMap.tsx` / `AppMap.native.tsx` — Platform-split map wrapper
- `lib/auth.tsx` — Auth context (session, profile, signIn/signUp/signOut)
- `lib/supabase.ts` — Supabase client

## Admin Dashboard

`artifacts/admin/` — Vite + React admin panel:
- Uses `CRUDPage` component for all CRUD operations
- Tables managed: providers, bookings, services, categories, customers, withdrawals, refunds, notifications
- `CRUDPage.tsx` strips nested objects from update/insert payload
- To run: `pnpm --filter @workspace/admin run dev`

## DB Migration

`artifacts/mobile/db/migration_v2.sql` — adds `services text[]` and `areas text[]` columns to `providers` table. Must be run manually in Supabase SQL editor.

## Known Enum Values

`provider_status_t`: 'pending', 'approved', 'suspended' (no 'rejected')

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/mobile run dev` — run Expo dev server (use `restart_workflow` instead)
- `pnpm --filter @workspace/admin run dev` — run Admin panel

RTL is forced globally in `app/_layout.tsx` via `I18nManager.forceRTL(true)`.
