# Workspace

## Overview

Arabic RTL cleaning services mobile app (نظافة) built with Expo + Supabase backend. Full RTL support, Cairo/Tajawal Arabic typography, premium green aesthetic. Includes admin dashboard at `artifacts/admin/` and Express API at `artifacts/api-server/`.

## Recent Fixes (May 2026)

### RTL Layout
- `RatingBottomSheet.tsx`: `textAlign:"right"` fixed
- `tracking.tsx`: toast border changed to `borderRightColor` for RTL
- `help.tsx`, `services.tsx`, `offers.tsx`, `dashboard.tsx`: arrow icons use `I18nManager.isRTL ? "arrow-left" : "arrow-right"`

### Push Notifications
- `booking-details.tsx` (provider advance): sends `review_request` category when status = `completed`
- `bookings.tsx` (customer): cancel button for `pending` bookings → updates DB, logs status, notifies provider via push + in-app notification
- Admin `Bookings.tsx` `notifyUser()`: now routes through API server `/api/push` (uses service role, bypasses RLS); rich localized messages per status
- Admin `Notifications.tsx` broadcast: routes through API server `/api/push/batch`; shows error if request fails

### Admin Dashboard
- All routes registered in `App.tsx`: `/policies`, `/branding`, `/home-builder`, `/commission` → `PoliciesPage`, `BrandingPage`, `HomeBuilderPage`, `CommissionPage` from Settings.tsx
- No direct `exp.host` calls from admin browser (was failing due to RLS on `push_tokens`)

### APK Builds
- Preview APK (5/3/2026 16:34): https://expo.dev/artifacts/eas/39vUWwxq2apDbwEdvYngRW.apk
- Development APK (5/3/2026 17:25): https://expo.dev/artifacts/eas/hs8BE8CVF3Gkzedobekwhe.apk
- New build needed after current session commits to include cancel-booking + notification fixes

## How to run (one-click)

The "Start application" workflow runs `bash scripts/start-all.sh`, which kills any stale processes on ports 8080/18115/23744 and then launches all three services in parallel:

- API server → port 8080
- Admin dashboard → port 23744 (`/admin/`)
- Mobile app (Expo) → port 18115

The artifact-specific workflows (artifacts/mobile: expo, artifacts/admin: web, artifacts/api-server) will show "failed" while Start application is running because they would bind to the same ports — that is expected. Use them only if you stop Start application and want to run a single service.

## Theme + i18n + maps

- **Theme system**: `lib/theme.tsx` provides a `ThemeProvider` with `light` / `dark` / `system` modes, persisted in AsyncStorage. `hooks/useColors` reads from this provider. Both palettes already exist in `constants/colors.ts`. The toggle lives in **Settings → Appearance**.
- **i18n system**: `lib/i18n.tsx` provides `I18nProvider`, `useI18n()` and `useT()` for the `t(key)` function. Languages are `ar` (default) and `en`, persisted in AsyncStorage. Switching language calls `I18nManager.forceRTL(...)` and triggers `expo-updates.reloadAsync()` (or web reload) so layout direction flips correctly. Toggle lives in **Settings → Language**. Translations cover the most-visible screens: onboarding, login, signup, home, services, profile, settings, address-form. Other screens fall back to Arabic until more keys are added to the dictionary in `lib/i18n.tsx`.
- **Maps**: `components/AppMap.tsx` (web) renders real OpenStreetMap tiles with custom markers and polyline overlay. `components/AppMap.native.tsx` uses `react-native-maps`. They're used identically on home, tracking, provider home, provider booking-details, and address-form. Real GPS lookup + reverse geocoding lives in `lib/location.ts` (`getCurrentResolved` uses `expo-location.reverseGeocodeAsync` on native, Nominatim on web). Saved addresses store real `lat`/`lng`/`district`/`region` from the geocoder.

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

- **URL**: `https://mffdpjwtwseftaqrslgx.supabase.co`
- **Env vars**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (set as Replit shared env vars)
- **Auth**: email/password; roles stored in `profiles.role` (user/provider/admin)
- **Key tables**: `profiles`, `providers`, `bookings`, `services`, `addresses`, `payouts`, `notifications`, `reviews`, `push_tokens`
- **Push notifications**: Routed through API server (`POST /api/push`) to bypass Supabase RLS on `push_tokens`. Requires `SUPABASE_SERVICE_ROLE_KEY` secret (set in Replit Secrets) + `EXPO_PUBLIC_API_URL` in eas.json (must be the deployed API server URL — never a dev URL).
- **Admin check**: `is_admin()` function in DB, RLS policies for all tables

## 2026-05-05 — Comprehensive Push + Realtime overhaul

### Push Notifications — Now WhatsApp-grade
| Feature | Before | After |
|---------|--------|-------|
| App closed + tap notification | ❌ Lost | ✅ `getLastNotificationResponseAsync` replays tap on cold start |
| App open foreground banner | ❌ None | ✅ `InAppBanner` component — WhatsApp-style slide-in banner |
| Payment channel | ❌ Missing | ✅ Android `payment` channel with HIGH importance + green LED |
| Deep-link on tap | ✅ Basic | ✅ Full — all types mapped in `navigateForType()` |
| `type` in push payload | ❌ Sometimes missing | ✅ Always embedded by API server + `createNotification()` |
| Provider action buttons | ✅ Accept/Reject | ✅ Same, now routes through shared `handleNotifResponse()` |

**Files changed:** `components/InAppBanner.tsx` (new), `app/_layout.tsx`, `lib/notifications.ts`, `api-server/src/routes/push.ts`

### Realtime Sync — All screens update without manual refresh
| Channel | Subscribes to | Dispatches |
|---------|--------------|-----------|
| `store-bookings-{uid}` | bookings WHERE user_id = uid | `booking_status_changed` |
| `store-notifs-{uid}` | notifications WHERE user_id = uid | `notification_received`, `badge_updated` |
| `store-provider-new` | bookings INSERT (all) | `new_booking` |
| `store-provider-accepted-{uid}` | bookings UPDATE WHERE provider_id = uid (**NEW**) | `provider_booking_changed`, `provider_order_updated` |
| `store-provider-locations` | providers UPDATE (**NEW**) | `provider_location_updated` |
| `store-admin-bookings` | bookings INSERT (all) | `new_booking` |
| `chat-room-{roomId}` | messages INSERT + broadcast | live chat (per-screen) |

**New event types:** `provider_booking_changed`, `provider_location_updated`, `chat_message_received`

Provider bookings screen (`(provider)/bookings.tsx`) now uses `useRealtimeEvents` to auto-reload on `new_booking` / `provider_booking_changed` — no refresh needed.

### Premium Card & Dark Mode Fixes (same session)
- `(tabs)/profile.tsx`: Premium membership card fully redesigned (deep gradient, stats row, CTA)
- `ai-assistant.tsx`: Service + provider cards fixed for dark/light mode (no more hardcoded `#0F172A` / `elevation: 1` black borders)

## Push Notifications — Architecture & Known Bugs Fixed (May 2026)

**Flow:** Mobile app → `sendPushNotification()` → API Server `/api/push` → Expo Push Service → Firebase FCM → Android status bar

**Three bugs were found and fixed (May 2026):**

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Tokens registered to wrong Expo project | `getExpoPushTokenAsync` used hardcoded wrong projectId `09e4ce5c-...` (old account `hadystow`) | Now reads dynamically from `Constants.expoConfig.extra.eas.projectId` |
| All pushes silently failing | `EXPO_PUBLIC_API_URL` in `eas.json` pointed to a dead old Replit dev domain | Updated to current domain; must use stable deployed URL for production APK |
| No status-bar notifications when app is closed | `google-services.json` had a fake `mobilesdk_app_id` (wrong length) | Replaced with real file from Firebase project `nazafa-46eb7` (project_number: `549775812329`) |

**Critical rule for APK builds:** `EXPO_PUBLIC_API_URL` is baked into the APK at build time. Always set it to the **deployed** API server URL (e.g. `https://nazafa.USERNAME.replit.app`), never a `.riker.replit.dev` dev URL. See `artifacts/mobile/BUILD_APK.md` for full details.

**FCM v1 setup (required for background notifications on Android):**
1. `google-services.json` must be real — ✅ done (Firebase project `nazafa-46eb7`)
2. Upload Firebase Service Account JSON to [expo.dev](https://expo.dev) → project → Credentials → FCM v1
3. `SUPABASE_SERVICE_ROLE_KEY` must be set in Replit Secrets — ✅ done

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

## 2026-04-30 — Comprehensive overhaul (v2)

Massive issue-list pass. All 35 tasks (T001–T090) addressed.

### Files of note
- `lib/serviceIcons.ts` — semantic icon + color map for service titles (used by home, services, chat).
- `app/(tabs)/chat.tsx` — fully rewritten smart assistant: voice input (web SpeechRecognition), service grid, real DB providers/services, rule-based KB for orders/refunds/disputes/invoices, autofill address+phone with confirm cards, end-to-end booking flow that inserts a real `bookings` row and routes to `/tracking`.
- `app/(tabs)/home.tsx` — services moved above offers, modern semantic icons, soft coupon-style offer cards, zoomed-in map (delta 0.012), Realtime subscription on `providers`, AI bot card routes to `/(tabs)/chat`.
- `app/(provider)/dashboard.tsx` — 5-second location heartbeat while online (writes `current_lat`/`current_lng` to providers).
- `app/notifications.tsx` — uses real `notifications` table with the `read` boolean (NOT `read_at`).
- `app/payment.tsx` — large wallet glyph card + inline real-text logos (Visa/Mada/Apple Pay/STC Pay/Tamara/Cash); persists `bookings.scheduled_at` + `provider_id`.
- `app/booking.tsx` — real DB providers sorted by distance + dynamic 7-day picker + instant/scheduled toggle.
- `db/schema.sql` — appended trigger `trg_booking_status_notify` that auto-inserts a notification row for both customer and provider on every booking insert / status change. **Run on Supabase manually.**
- `BUILD_APK.md` — full instructions for EAS Build (Replit cannot build APK directly; needs the Expo cloud).

### Realtime architecture
- **Provider** (when "online") writes its GPS to `providers` every 5s.
- **Customer home** subscribes to `postgres_changes` on `providers` → live nearby pins.
- **Tracking page** subscribes to `bookings` (status) + `providers` (location) for the assigned provider.
- **Notifications** subscribe to `notifications` inserts; trigger fans out booking status changes automatically.

### Schema gaps fixed in admin
- `Dashboard.tsx` was selecting `bookings.total_price` but the column is `bookings.total` — fixed.
- Mobile chat.tsx was selecting `services.active`/`services.popularity` (don't exist); switched to `is_active` + `sort` to match schema.

### Free-tier note
- Replit free tier blocks third-party connectors; this build relies only on Supabase (already wired) and Expo OTA. APK builds run on Expo's EAS cloud — see `artifacts/mobile/BUILD_APK.md`.

## 2026-05-03 — Admin Bookings overhaul + push notifications

### Admin Bookings page (`artifacts/admin/src/pages/Bookings.tsx`) — complete rewrite
- **No longer uses generic CRUDPage** — dedicated page with full real-time capabilities
- **Real-time subscription** via `supabase.channel("admin-bookings-live")` — table updates live without refresh
- **Status change workflow**: selecting new status → updates `bookings.status` → inserts `booking_status_log` row → sends Expo push notification to user immediately
- **Push notifications** sent directly to Expo API (`https://exp.host/--/api/v2/push/send`) to all user's push tokens; also inserts in-app `notifications` row
- **Expandable rows** — click any row to see: booking details, full status timeline with timestamps, inline status selector
- **Stats bar**: counts by all status categories (pending / active / completed / cancelled)
- **Filter chips**: filter by status; search by name, service, or booking ID
- **Toast feedback**: shows "✓ الحالة محدّثة" on success with 3.5s auto-dismiss

### Dashboard (`artifacts/admin/src/pages/Dashboard.tsx`)
- Added "عرض الكل ←" link to navigate directly to `/bookings` from the recent bookings table

### APK builds (EAS Cloud)
- Most recent finished APK: `https://expo.dev/artifacts/eas/7iJBTtb4UWLwAaYB6rXxDe.apk` (2026-05-03 14:48)
- EAS project: `dd03c810-2182-47e7-9a0a-823fdcc351b8`, account: `clean-beaton`
- To build: `cd artifacts/mobile && EXPO_TOKEN=<token> npx eas build --platform android --profile preview --non-interactive --no-wait`

## 2026-05-01 — Real data: chat + booking-details + notifications

All remaining hardcoded/fake data replaced with live Supabase queries:

### Chat (fully real data)
- `app/chat-detail.tsx` — uses `chat_rooms` + `messages` tables. Auto-creates a room per booking on first open. Realtime INSERT subscription for live delivery. Empty state shown when no messages. Sends via `messages` insert.
- `app/(provider)/chat.tsx` — queries `chat_rooms` where `provider_id = current user`. Shows last message body + relative timestamp. Falls back to service name + booking status as subtitle. Tap → navigates to `chat-detail` with `roomId`.

### Booking details (fully real data)
- `app/booking-details.tsx` — reads booking by `id` from nav params. Fetches real `booking_status_log` for timeline. Shows real service, address, payment method, notes, provider avatar. Cancel inserts status log row. Track button routes with real `bookingId`. Realtime subscriptions keep card live.
- `app/(tabs)/bookings.tsx` already passes `id: item.id` in nav params — no change needed.

### Provider notifications (fully real data)
- `app/provider-notifications.tsx` — fully rewritten: queries `notifications` table for current user, realtime INSERT channel, mark-one + mark-all-read. Proper empty state.

### Chat rooms migration
- `db/migration_messages.sql` — adds `read` column to existing `messages` table + indexes. Run once in Supabase SQL Editor if not already applied.

### DB schema notes
- `bookings.user_id` = customer (FK `bookings_user_id_fkey`)
- `bookings.provider_id` = provider (FK `bookings_provider_id_fkey`)
- `chat_rooms` links `user_id` + `provider_id` + `booking_id`; messages use `room_id`
