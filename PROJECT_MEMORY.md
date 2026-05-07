# PROJECT_MEMORY.md
# نظافة — Cleaning Services App

> Last updated: 2026-05-07

---

## 1. What This App Is

A **production-grade Arabic RTL mobile cleaning-services marketplace** built for the Saudi market.

- **Users** browse services, chat with an AI assistant, book cleaners, track orders in real-time, and chat with providers.
- **Providers** manage bookings, track earnings, and handle withdrawal requests.
- **Admins** manage everything via a React/Vite dashboard.

---

## 2. Monorepo Structure

```
/
├── artifacts/
│   ├── mobile/          # Expo SDK 54 React Native app  (port 18115)
│   ├── admin/           # React + Vite admin dashboard  (port 23744)
│   ├── api-server/      # Fastify/Express API server    (port 8080)
│   └── mockup-sandbox/  # Vite component preview server
├── db/
│   ├── schema.sql            # Canonical DB schema
│   └── migration_messages.sql
├── scripts/
│   └── start-all.sh
└── PROJECT_MEMORY.md
```

---

## 3. Tech Stack

| Layer | Tech |
|---|---|
| Mobile | Expo SDK 54, React Native, Expo Router |
| Admin | React 18, Vite, Tailwind CSS |
| API | Express (Node 24), TypeScript |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth (username→SHA-256→email hashing) |
| Fonts | Tajawal (400/500/600/700) |
| Maps | react-native-maps (native), OpenStreetMap (web) |
| Icons | @expo/vector-icons (Feather + MaterialCommunityIcons) |
| Notifications | Expo Push + FCM v1 via api-server |
| Package Mgr | pnpm workspaces |

---

## 4. Key Files — Mobile App (`artifacts/mobile/`)

| File | Role |
|---|---|
| `app/_layout.tsx` | Root layout — RTL enforcement, font loading, auth gate |
| `app/index.tsx` | Root redirect → onboarding or tabs |
| `app/(tabs)/home.tsx` | Home screen: map (absolute) + scroll-over content |
| `app/(tabs)/bookings.tsx` | User booking list with real-time status |
| `app/(tabs)/offers.tsx` | Promotions & offers |
| `app/(tabs)/profile.tsx` | User profile settings |
| `app/(provider)/` | Provider-facing screens |
| `app/ai-assistant.tsx` | **AI chat** — booking flow, intent detection, rich cards |
| `app/tracking.tsx` | Live order tracking screen |
| `app/booking-details.tsx` | Booking detail / status timeline |
| `app/chat.tsx` | Per-booking real-time chat with provider |
| `app/payment.tsx` | Payment method selection |
| `lib/auth.tsx` | Supabase auth context + auto profile creation |
| `lib/supabase.ts` | Supabase client |
| `lib/theme.tsx` | Light/dark/system theme |
| `lib/i18n.tsx` | Arabic/English i18n |
| `lib/location.ts` | GPS + reverse geocoding |
| `lib/serviceImages.ts` | Fallback service image URLs |
| `lib/serviceIcons.ts` | Service → icon/color mapping |
| `lib/promotions.ts` | Seasonal promo data + KB entries |
| `lib/notifications.ts` | Push notification helpers |
| `lib/realtimeStore.ts` | Supabase Realtime bookings hook |
| `lib/chatBadge.ts` | Unread chat badge state |
| `constants/colors.ts` | Design token colors |
| `components/AppMap.tsx` | Platform-split map (web: OSM, native: react-native-maps) |
| `components/FloatingTabBar.tsx` | Custom floating bottom tab bar |
| `components/GuestEmpty.tsx` | Guest placeholder for auth-gated screens |

---

## 5. Key Files — API Server (`artifacts/api-server/src/`)

| File | Role |
|---|---|
| `routes/index.ts` | Mounts all routers |
| `routes/health.ts` | `GET /api/health` |
| `routes/auth.ts` | `POST /api/auth/register` |
| `routes/push.ts` | `POST /api/push`, `POST /api/push/batch` |
| `routes/bookings.ts` | `GET /api/bookings/active`, `GET /api/bookings/:id`, `GET /api/bookings/:id/tracking` |
| `routes/tickets.ts` | `POST /api/tickets`, `GET /api/tickets/:id`, `GET /api/tickets/history`, `PATCH /api/tickets/:id` |
| `routes/refunds.ts` | `POST /api/refunds/request`, `GET /api/refunds/:id`, `GET /api/refunds/history`, `PATCH /api/refunds/:id` |
| `lib/logger.ts` | Pino logger |
| `lib/providerSweep.ts` | Provider availability sweep |

---

## 6. Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `profiles` | All users — role: `user` / `provider` / `admin` |
| `providers` | Provider extras: rating, location, available, hourly_rate |
| `services` | Service catalog |
| `bookings` | Core bookings — user_id, provider_id, service_id, status, total |
| `booking_status_log` | Append-only status history per booking |
| `addresses` | Saved user addresses |
| `messages` | Per-booking chat messages |
| `notifications` | In-app notification feed |
| `push_tokens` | Expo push tokens per user |
| `wallet_transactions` | Earnings / withdrawals |
| `withdrawal_requests` | Provider withdrawal requests |
| `support_tickets` | User support tickets (category, description, status) — see `db/migration_tickets_refunds.sql` |
| `refund_requests` | Refund requests (booking_id, amount, reason, status) — see `db/migration_tickets_refunds.sql` |

**Booking statuses (ordered):**
`pending` → `accepted` → `on_the_way` → `in_progress` → `completed` | `cancelled`

---

## 7. AI Assistant — Architecture (`app/ai-assistant.tsx`)

The AI assistant is a **rule-based KB + real DB hybrid** — no external LLM.

### Message Flow
```
User types / taps QuickAction
  → Intent detection (tracking / invoice / booking flow / KB fallback)
  → If tracking intent: fetchActiveTracking() → TrackingData → renderTrackingCard()
  → If invoice intent: fetchLatestInvoice() → InvoiceData → renderInvoiceDetail()
  → If booking keyword: answerFromKb() → text reply
  → else: generic fallback
```

### Card Types (CardType union)
| CardType | Rendered By | Purpose |
|---|---|---|
| `"quick_actions"` | `<QuickActions />` | Initial action chips |
| `"services"` | `renderServiceGrid()` | Service picker grid |
| `"providers"` | `renderProviderCards()` | Horizontal provider cards |
| `"address_confirm"` | `renderConfirmCard()` | Address Y/N confirmation |
| `"phone_confirm"` | `renderConfirmCard()` | Phone Y/N confirmation |
| `"invoice"` | `renderInvoice()` | Pre-booking invoice preview |
| `"confirmation"` | `renderConfirmation()` | Booking success card with **"تتبع الطلب"** button |
| `"tracking_card"` | `renderTrackingCard()` | **Live tracking card** (real DB) |
| `"invoice_card"` | `renderInvoiceDetail()` | **Existing booking invoice** (real DB) |
| `"coupon_card"` | `renderCouponCard()` | Seasonal promo cards with copy-to-clipboard |
| `"support_contact"` | `renderSupportContact()` | Contact channels + inline ticket form |
| `"refund_status_card"` | `renderRefundCard()` | Refund status viewer + submission form |

### Booking Flow Steps (Step enum)
`welcome` → `services` → `service_selected` → `providers` → `provider_selected` → `address` → `phone` → `invoice` → `confirmed` → `qa`

### Real-Data Fetchers
- `fetchActiveTracking()` — latest booking + status log → `TrackingData`
- `fetchLatestInvoice()` — latest booking invoice breakdown → `InvoiceData`
- `fetchRefundStatus()` — latest refund request → `RefundStatusData`
- `pushTrackingCard()` — shows typing indicator, fetches, appends card
- `pushInvoiceCard()` — shows typing indicator, fetches, appends card
- `pushCouponCard()` — shows `SEASONAL_PROMOS` as tappable coupon cards
- `pushSupportContact()` — shows support contact channels + ticket form
- `pushRefundCard()` — shows refund status or submission form

### Voice / TTS System
- **STT**: Web `SpeechRecognition` API (`startVoiceWeb` / `stopVoiceWeb`). On native, shows keyboard mic instruction.
- **TTS**: `expo-speech` — `speakResponse(text, lang)` — speaks bot responses ≤ 250 chars (no card type). Rate 0.82 (ar-SA), 0.9 (en-US). Toggle button in header (volume-high / volume-off icon). Uses `ttsEnabledRef` to avoid stale closure in `addBotMessage` useCallback.
- **Language auto-detection**: `detectLanguage(text)` tests `/[\u0600-\u06FF]/` → `"ar-SA"` else `"en-US"`. Set on every user send + STT transcript.
- **Wave animation**: 5 `Animated.Value` bars (`waveAnims` ref) with `Animated.loop` + staggered timing (200–420ms). Shown in place of input bar when `voiceListening === true`. Red stop button + "جاري الاستماع..." label.
- **Speech stops** on: back navigation, new user send, TTS toggle off, mic stop.

### RTL Header Fix
- `headerInfo: { alignItems: "flex-start" }` — In RTL, `flex-start` = physical RIGHT. Previously `"flex-end"` caused name/status to appear on the wrong (left) side. Fixed.
- Back button now uses `s.headerBackBtn` pill style with frosted glass background.

---

## 8. Push Notifications

- All push calls go through `POST /api/push` (not direct from mobile)
- API server uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS on `push_tokens`
- Auth: JWT verified → ownership check → Expo Push API with retry
- Channels: `new_booking` (30 min TTL), `booking_status`, `payment`, `chat`, `default`
- Batch: `POST /api/push/batch` — admin only (or new_booking proof)

---

## 9. Environment Variables

| Variable | Used By | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile | Public — baked into bundle |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile | Public — baked into bundle |
| `SUPABASE_URL` | API server | Server-side |
| `SUPABASE_ANON_KEY` | API server | Server-side |
| `SUPABASE_SERVICE_ROLE_KEY` | API server | **Secret** — Replit Secrets only |
| `EXPO_PUBLIC_API_URL` | Mobile (APK) | Must be deployed URL for APK builds |

---

## 10. Booking API Routes (api-server)

### `GET /api/bookings/active`
Returns most recent non-cancelled booking for authenticated user with status log and provider location.

**Auth:** `Authorization: Bearer <supabase-jwt>`
**Response:** `{ booking: BookingWithLog | null }`

### `GET /api/bookings/:id`
Returns full booking details. Caller must be user, provider, or admin.

**Response:** `{ booking: { ...fields, status_log, invoice: { basePrice, fee, vat, total } } }`

### `GET /api/bookings/:id/tracking`
Lightweight real-time tracking data: status, provider GPS, latest log.

**Response:** `{ bookingId, status, scheduledAt, providerName, providerLat, providerLng, providerRating, latestLog }`

---

## 11. Admin Dashboard (`artifacts/admin/`)

- React + Vite + Tailwind
- Pages: Dashboard, Bookings, Providers, Services, Customers, Withdrawals, Refunds, Notifications
- `Bookings.tsx` — live booking table with status updates + push notifications
- Connects to Supabase directly (anon key) + API server for push

---

## 12. RTL Design Rules

- Global RTL: `I18nManager.forceRTL(true)` in `app/_layout.tsx`
- All row directions use `I18nManager.isRTL` for `flexDirection`
- Back chevron: `chevron-right` when RTL, `chevron-left` when LTR
- Language switching triggers full app reload

---

## 13. Bug Fixes Log (2026-05-07 — Full Audit)

### Previously Fixed (earlier sessions)
- `AppMap.native.tsx` — props mismatch corrected
- `admin/Refunds.tsx` — wallet deduction on refund approval now inserts payouts row correctly
- `edit-profile.tsx` — city field wired to form state
- `provider/profile.tsx` — `lastToggleRef` guard prevents availability toggle race condition
- `provider-service-area.tsx` — city + district fields linked
- `lib/notifications.ts` — `isProvider` flag, channel mapping, `booking_rejected` type added
- `components/InAppBanner.tsx` — `booking_rejected` type handled correctly

### Fixed in This Session (2026-05-07)
| File | Bug | Fix |
|---|---|---|
| `app/settings.tsx` | Signout button called `router.replace("/onboarding")` without calling `signOut()` — Supabase session stayed alive | Added `useAuth` import; signout now calls `await signOut()` then navigates; wrapped in `Alert.alert` confirmation dialog |
| `app/notifications.tsx` `notifMeta()` | Missing cases for `booking_rejected`, `withdrawal`, `withdrawal_approved` — fell through to generic `bell` icon | Added cases: `booking_rejected` → `x-circle` red, `withdrawal` → `dollar-sign` green, `withdrawal_approved` → `credit-card` green |
| `app/notifications.tsx` `targetForNotif()` | `booking_rejected` was not listed → routing fell through to tracking screen instead of bookings list | Added `booking_rejected` to the `completed/cancelled` → `/(tabs)/bookings` branch |
| `app/referrals.tsx` | Copy button had no `onPress` — tapping it did nothing; `expo-clipboard` not imported | Added `Clipboard.setStringAsync(code)` + 2-second visual feedback (checkmark + green tint); installed `expo-clipboard` package |
| `app/booking-details.tsx` | VAT breakdown used `tax = total × 0.15` (wrong) — over-stated tax, under-stated base | Fixed to `base = total / 1.15`, `tax = total − base` (mathematically correct reverse-VAT) |
| `app/(tabs)/bookings.tsx` | `cancelled` filter (`r.status === "cancelled"`) excluded `rejected` bookings — they appeared in no tab except "الكل", invisible to users | Fixed: filter now includes `r.status === "cancelled" \|\| r.status === "rejected"` |
| `app/(tabs)/bookings.tsx` | `STATUS_AR` map missing `rejected` key — rejected bookings showed blank status label in the list | Added `rejected: "مرفوض"` to `STATUS_AR` |
| `app/(tabs)/bookings.tsx` | `STATUS_COLOR` map missing `rejected` key — rejected bookings showed no status badge colour | Added `rejected: "#EF4444"` to `STATUS_COLOR` |
| `app/rating.tsx` | `submitBtn` and `doneBtn` styles had hardcoded `backgroundColor: "#3B82F6"` — ignored theme/dark-mode `colors.primary` | Applied `{ backgroundColor: colors.primary }` as inline style override on all three `TouchableOpacity` instances |

---

## 14. Development Gotchas

- **APK builds**: `EXPO_PUBLIC_API_URL` baked at build time — always set to deployed URL
- **DB migrations**: `db/migration_v2.sql`, `db/migration_messages.sql`, and `trg_booking_status_notify` trigger must be run manually in Supabase SQL editor
- **RLS**: Push tokens are behind RLS — always send push via API server, never from admin directly
- **Auth username flow**: `POST /api/auth/register` hashes username → fake email for Supabase Auth
- **Map**: Web preview uses OpenStreetMap iframe; native uses `react-native-maps` — split via `.native.tsx`
- **`booking_status_log` table**: Must exist for tracking card to show history. If empty, tracking card still renders with current status only.
- **`support_tickets` + `refund_requests` tables**: Must be created by running `db/migration_tickets_refunds.sql` manually in Supabase SQL editor before ticket/refund features work.
- **expo-speech on web**: `Speech.speak()` is skipped on web (poor Arabic support). TTS only fires on native (iOS/Android). Always guarded with `Platform.OS !== "web"` check.
- **Bookings header**: Now uses `LinearGradient` with stats row (total/active/completed counts). `activeCount` and `completedCount` computed via `useMemo`.
- **Chat header RTL**: `bell` icon is first child in `rowDir` row → appears on physical RIGHT in RTL (start edge). Spacer is last child → physical LEFT.

---

## 14. Feature Completion Status

| Feature | Status |
|---|---|
| Onboarding + Auth | ✅ |
| Home screen (map + services) | ✅ |
| Service booking flow (full) | ✅ |
| Real-time order tracking | ✅ |
| Per-booking chat | ✅ |
| AI assistant — booking flow | ✅ |
| AI assistant — "تتبع الطلب" button on success card | ✅ |
| AI assistant — real DB tracking card | ✅ |
| AI assistant — real DB invoice card | ✅ |
| AI assistant — intent detection (track/invoice) | ✅ |
| AI assistant — coupon cards (SEASONAL_PROMOS) | ✅ |
| AI assistant — support contact + inline ticket form | ✅ |
| AI assistant — refund status viewer + submission | ✅ |
| AI assistant — TTS via expo-speech (ar-SA / en-US) | ✅ |
| AI assistant — voice wave animation (5-bar scaleY) | ✅ |
| AI assistant — language auto-detection (Arabic/English) | ✅ |
| AI assistant — RTL header fix (flex-start, TTS toggle, online dot) | ✅ |
| Bookings — gradient header with stats row | ✅ |
| Chat inbox — RTL bell icon fix | ✅ |
| Support tickets API (POST/GET/PATCH) | ✅ |
| Refunds API (POST/GET/PATCH) | ✅ |
| DB: support_tickets + refund_requests schema | ✅ (manual migration required) |
| Push notifications (full system) | ✅ |
| Provider dashboard | ✅ |
| Admin dashboard | ✅ |
| Offers / promotions | ✅ |
| Wallet / withdrawals (provider) | ✅ |
| API: GET /api/bookings/active | ✅ |
| API: GET /api/bookings/:id | ✅ |
| API: GET /api/bookings/:id/tracking | ✅ |
| APK build pipeline (EAS) | ✅ (see BUILD_APK.md) |
