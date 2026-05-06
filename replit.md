# نظافة - Cleaning Services App

A mobile app for Arabic RTL cleaning services, connecting users with providers, built with Expo and Supabase.

## Run & Operate

To start all services:
`bash scripts/start-all.sh`

This command launches:
- API server: `http://localhost:8080`
- Admin dashboard: `http://localhost:23744/admin/`
- Mobile app (Expo): `http://localhost:18115`

Environment Variables (set as Replit shared env vars):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for push notifications, set in Replit Secrets)
- `EXPO_PUBLIC_API_URL` (must be deployed API server URL for APK builds)

Key commands:
- Typecheck: `pnpm run typecheck`

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Package Manager**: pnpm
- **TypeScript**: 5.9
- **Mobile**: Expo Router + React Native (Expo SDK 54)
- **Backend**: Supabase (PostgreSQL + RLS + Auth)
- **Database**: PostgreSQL
- **ORM**: _Populate as you build_
- **Validation**: _Populate as you build_
- **Build Tool (Admin)**: Vite
- **Fonts**: Tajawal (Arabic)
- **State Management**: Supabase + React Context (`lib/auth.tsx`)
- **Maps**: `react-native-maps` (native), OpenStreetMap (web)
- **Icons**: `@expo/vector-icons`
- **Admin**: React + Vite + Tailwind CSS

## Where things live

- **Mobile App**: `artifacts/mobile/`
  - Root redirect logic: `app/index.tsx`
  - User-facing tabs: `app/(tabs)/`
  - Provider-facing screens: `app/(provider)/`
  - Platform-split map component: `components/AppMap.tsx`, `components/AppMap.native.tsx`
  - Authentication logic: `lib/auth.tsx`
  - Supabase client: `lib/supabase.ts`
  - Theme system: `lib/theme.tsx`
  - i18n system: `lib/i18n.tsx`
  - Location services: `lib/location.ts`
  - Service image defaults: `lib/serviceImages.ts`
- **Admin Dashboard**: `artifacts/admin/`
  - Dedicated Bookings page: `artifacts/admin/src/pages/Bookings.tsx`
- **API Server**: `artifacts/api-server/`
  - Push notification endpoint: `api-server/src/routes/push.ts`
- **Database Schema**: `db/schema.sql` (also `artifacts/mobile/db/migration_v2.sql`, `db/migration_messages.sql` for manual runs)
- **Colors**: `constants/colors.ts`
- **Service Icons**: `lib/serviceIcons.ts`
- **FCM Configuration**: `google-services.json` (in `artifacts/mobile/`)
- **APK Build Instructions**: `artifacts/mobile/BUILD_APK.md`

## Architecture decisions

- **Push Notifications via API Server**: Push notifications are routed through the API server to bypass Supabase RLS, using the `SUPABASE_SERVICE_ROLE_KEY`. This ensures reliable notification delivery regardless of user RLS policies.
- **RTL-first Design**: Global RTL enforcement via `I18nManager.forceRTL(true)` in `app/_layout.tsx` ensures consistent Arabic layout direction. Language switching triggers an app reload for correct layout adjustments.
- **Realtime for Core Features**: Supabase Realtime is extensively used for bookings, provider location tracking, and notifications to provide a live, responsive user experience without manual refreshes.
- **Dynamic Profile Creation**: `lib/auth.tsx` automatically creates a profile row from `user_metadata` on login/signup, preventing deadlocks if a profile is missing.
- **Robust Error Handling for UI Assets**: `lib/serviceImages.ts` provides static fallback image URLs for service categories, ensuring the UI is never empty even if Supabase is unreachable.

## Product

- **User-facing App**: Onboarding, authentication (login/signup), home screen with map and services, booking management, offers, chat, user profile.
- **Provider-facing App**: Home dashboard, booking management, wallet/earnings, profile management, withdrawal requests, earnings statements.
- **Admin Dashboard**: Comprehensive CRUD operations for providers, bookings, services, categories, customers, withdrawals, refunds, and notifications. Real-time booking management with status updates and push notifications.
- **Chat System**: Real-time per-booking chat rooms between users and providers, including a smart assistant with voice input and rule-based knowledge.
- **AI Assistant**: Rule-based KB + real DB hybrid. Booking flow (services→providers→address→phone→invoice→confirmed). Intent detection for tracking/invoice queries fetches live Supabase data and renders rich inline cards (TrackingCard, InvoiceCard). Confirmation card has a primary "تتبع الطلب" gradient button.
- **Location & Mapping**: Real-time GPS lookup, reverse geocoding, and map display for service tracking, provider location, and address selection.
- **Push Notifications**: Comprehensive system including background notifications, in-app banners, deep linking, and localized rich messages for various events (e.g., booking status changes).
- **Internationalization**: Full Arabic (default) and English support with RTL layout management.
- **Theme Support**: Light, dark, and system theme modes, persisted locally.
- **Bookings API**: `GET /api/bookings/active`, `GET /api/bookings/:id`, `GET /api/bookings/:id/tracking` — JWT-authed, ownership-checked, returns status log + invoice breakdown.

## User preferences

- _Populate as you build_

## Gotchas

- **APK Build API URL**: `EXPO_PUBLIC_API_URL` is baked into the APK at build time. Always set it to the **deployed** API server URL, never a development URL.
- **Manual DB Migrations**: Some schema changes (`migration_v2.sql`, `migration_messages.sql`, `trg_booking_status_notify` trigger) require manual execution in the Supabase SQL editor.
- **Supabase RLS**: Push notifications are routed through the API server to bypass RLS on `push_tokens`. Direct calls from the admin dashboard to `exp.host` previously failed due to RLS.
- **Free-tier limitations**: Replit free tier blocks third-party connectors; the app relies only on Supabase and Expo OTA. APK builds occur on Expo's EAS cloud.

## Pointers

- **Expo Documentation**: [https://docs.expo.dev/](https://docs.expo.dev/)
- **Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)
- **React Native Documentation**: [https://reactnative.dev/docs/getting-started](https://reactnative.dev/docs/getting-started)
- **Expo Router**: [https://expo.github.io/router/](https://expo.github.io/router/)
- **FCM Setup for Expo**: [https://docs.expo.dev/push-notifications/sending-notifications/#fcm-v1-setup](https://docs.expo.dev/push-notifications/sending-notifications/#fcm-v1-setup)
- **EAS Build Instructions**: `artifacts/mobile/BUILD_APK.md`
- **Expo Push Notifications**: [https://docs.expo.dev/push-notifications/overview/](https://docs.expo.dev/push-notifications/overview/)