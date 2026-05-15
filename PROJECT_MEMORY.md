# PROJECT_MEMORY — نظافة (Nazafa) Cleaning Marketplace

> **للعوامل المستقبلية:** هذا الملف هو المرجع الكامل. اقرأه أولاً قبل أي تعديل.
> آخر تحديث: 2026-05

---

## 1. نظرة عامة

**نظافة** — سوق خدمات تنظيف منازل للسوق السعودي. منصة ثنائية الأطراف (عملاء ↔ مزودو خدمة) مع لوحة إدارة.  
**لغة الواجهة:** عربي RTL أساسي + دعم إنجليزي جزئي.

### الأجزاء الثلاثة:
| الجزء | المسار | المنفذ | الوصول |
|-------|--------|--------|--------|
| موبايل (Expo) | `artifacts/mobile/` | 18115 | dev + APK |
| لوحة الإدارة (React/Vite) | `artifacts/admin/` | **5000** (webview) | `/` → VITE_BASE_URL=/admin/ |
| API Server (Express) | `artifacts/api-server/` | 8080 | `/api/` |

**تشغيل الكل:** `bash scripts/start-all.sh`

---

## 2. بيانات الاعتماد — Supabase (المشروع الجديد)

| المتغير | القيمة |
|---------|--------|
| Project ID | `vbcblxhwnlzbreznfyau` |
| URL | `https://vbcblxhwnlzbreznfyau.supabase.co` |
| ANON KEY (JWT) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY2JseGh3bmx6YnJlem5meWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDU1MTQsImV4cCI6MjA5NDQyMTUxNH0.ie1PHeQajLzAE-zPFFF8eggO7GgOdBadTaGdTAAHcaY` |
| SERVICE ROLE KEY | ← **Replit Secrets** — `SUPABASE_SERVICE_ROLE_KEY` ⚠️ مطلوب للإشعارات |

> المشروع القديم `mffdpjwtwseftaqrslgx` — **لا تستخدمه أبداً**. جميع الملفات حُدِّثت للمشروع الجديد.

### Replit Secrets المضبوطة:
- `EXPO_TOKEN` ✅ — `_b9Mbt2aSKcLloFX8yneFQvA-j-BxURvcnu9INx6`
- `EXPO_PUBLIC_SUPABASE_URL` ✅ — `https://vbcblxhwnlzbreznfyau.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **مطلوب — أضفه من Supabase Dashboard**
- `EXPO_PUBLIC_API_URL` ⚠️ **يُضبط بعد نشر API Server** (يُخبز في APK)

---

## 3. EAS / Expo Build

| الحقل | القيمة |
|-------|--------|
| EAS Account | `aiservx1` |
| EAS Project ID | `c1d243e2-193e-4a27-ad30-87468c74e92b` |
| Package Android | `com.aiservx.nazafa` |
| Bundle iOS | `com.aiservx.nazafa` |
| versionCode الحالي | **21** (رفعه قبل كل build جديد) |
| Keystore | EAS managed: `Build Credentials txt_65s4Tz` |

### أمر البناء (preview APK):
```bash
cd artifacts/mobile
EAS_NO_VCS=1 EXPO_TOKEN="$EXPO_TOKEN" npx eas-cli build \
  --platform android --profile preview --non-interactive --no-wait
```

### قبل أي build:
1. `app.config.ts` → رفع `versionCode`
2. `eas.json` → تحديث `EXPO_PUBLIC_SUPABASE_URL/KEY` (✅ محدَّث للمشروع الجديد)
3. `eas.json` → تحديث `EXPO_PUBLIC_API_URL` لعنوان API Server المنشور

### متابعة البنيات:
https://expo.dev/accounts/aiservx1/projects/mobile/builds

---

## 4. قاعدة البيانات (Supabase PostgreSQL)

### الجداول الأساسية:
| الجدول | الأعمدة المهمة |
|--------|---------------|
| `profiles` | `id, role(user/provider/admin), full_name, phone, email, avatar_url, gender` |
| `providers` | `id→profiles, bio, status(pending/approved/suspended), available, rating, hourly_rate, experience_years, current_lat/lng, service_radius_km, working_hours` |
| `service_categories` | `id, title_ar, icon, color, active` |
| `services` | `id, category_id, title_ar, base_price, duration_min, active` |
| `bookings` | `id, user_id, provider_id, service_id, address_id, status, total, scheduled_at, notes, payment_method, deadline` |
| `booking_status_log` | `id, booking_id, status, note, created_at` |
| `addresses` | `id, user_id, label, street, district, city, lat, lng, is_default` |
| `notifications` | `id, user_id, title, body, type, data(json), read` |
| `push_tokens` | `id, user_id, token, platform` |
| `chat_rooms` | `id, booking_id` |
| `messages` | `id, room_id, sender_id, content, created_at` |
| `payouts` | `id, provider_id, amount, status(pending/paid/failed), iban, method` |
| `withdrawal_requests` | `id, provider_id, amount, status, iban` |
| `refund_requests` | `id, booking_id, user_id, amount, reason, status(pending/approved/rejected)` |
| `support_tickets` | `id, user_id, subject, body, priority, status(open/in_progress/closed)` |
| `reviews` | `id, booking_id, user_id, provider_id, rating, comment` |
| `offers` | `id, title, discount_pct, code, active, expires_at` |
| `app_settings` | `key, value(json), updated_at` — مفاتيح: commission, app_branding, policies, home_builder, ota_config |

### Migrations (بالترتيب):
```
1. artifacts/mobile/db/schema.sql         — الجداول الرئيسية
2. artifacts/mobile/db/migration_v2.sql   — providers: services/areas columns
3. db/migration_service_area.sql          — radius/hours, booking deadline
4. db/migration_tickets_refunds.sql       — support_tickets + refund_requests
5. db/migration_status_v3.sql             — arrived/started statuses + triggers + indexes
```

---

## 5. دورة حياة الحجز (Status Flow)

```
pending → accepted → on_the_way → arrived → started → completed
                                                     ↘ cancelled / rejected
```

| Status | عربي | اللون |
|--------|------|-------|
| `pending` | قيد الانتظار | #F59E0B |
| `accepted` | مقبول | #3B82F6 |
| `on_the_way` | في الطريق | #8B5CF6 |
| `arrived` | وصل للموقع | #F59E0B |
| `started` | بدأ العمل | #8B5CF6 |
| `in_progress` | جاري التنفيذ (legacy) | #2F80ED |
| `completed` | مكتمل | #16C47F |
| `cancelled` | ملغي | #EF4444 |
| `rejected` | مرفوض | #EF4444 |

> `in_progress` موجود كـ fallback من الإصدارات القديمة. الـ flow الجديد: arrived → started.

---

## 6. تطبيق الموبايل (`artifacts/mobile/`)

### هيكل التنقل (Expo Router):
```
app/
├── index.tsx              ← Root: تحقق session→role→onboarded
├── _layout.tsx            ← Root layout: fonts, RTL, push, auth, realtime
├── onboarding.tsx         ← 3 slides
├── login.tsx / signup.tsx ← مصادقة (username→email hash)
│
├── (tabs)/                ← Customer navigation
│   ├── home.tsx           ← خريطة + 18 فئة + banners + NearbyProviderToast
│   ├── bookings.tsx       ← حجوزات العميل (all/active/completed/cancelled)
│   ├── offers.tsx         ← عروض + coupons + banners
│   ├── chat.tsx           ← قائمة محادثات + AI entry
│   └── profile.tsx        ← بيانات المستخدم + إعدادات
│
├── (provider)/            ← Provider navigation
│   ├── dashboard.tsx      ← إحصائيات + خريطة + countdown modal
│   ├── bookings.tsx       ← جديدة/مجدولة/نشطة/مكتملة
│   ├── booking-details.tsx← تفاصيل + تغيير الحالة + خريطة
│   ├── wallet.tsx         ← رصيد + معاملات + سحب
│   ├── chat.tsx           ← محادثات المزود
│   └── profile.tsx        ← بيانات + toggle الإتاحة
│
├── ai-assistant.tsx       ← المساعد الذكي (rule-based + Supabase)
├── booking.tsx            ← استمارة حجز 4 خطوات
├── booking-details.tsx    ← تفاصيل الحجز للعميل + استرداد
├── tracking.tsx           ← تتبع مباشر: خريطة + status log
├── chat-detail.tsx        ← محادثة فردية (Realtime)
├── rating.tsx             ← تقييم بعد الإنجاز
└── ...                    ← شاشات أخرى (payment, search, provider/[id], ...)
```

### المكتبات (`lib/`):
| الملف | الغرض |
|-------|-------|
| `supabase.ts` | Supabase client (AsyncStorage session) — **المشروع الجديد ✅** |
| `auth.tsx` | AuthProvider: session, profile, signIn/signUp/signOut |
| `username.ts` | usernameToEmail() — username→email@users.nazafa.app hash |
| `theme.tsx` | ThemeProvider + useColors() |
| `i18n.tsx` | I18nProvider: AR/EN + t() |
| `notifications.ts` | registerForPush, sendPushNotification, createNotification |
| `realtimeStore.tsx` | RealtimeProvider: useRealtimeBookings, useRealtimeEvents |
| `location.ts` | getCurrentResolved(), distanceKm(), reverse geocoding |
| `chatBadge.tsx` | unread messages badge |
| `notifBadge.tsx` | unread notifications badge |
| `useOTAUpdate.ts` | فحص وتطبيق تحديثات OTA |
| `promotions.ts` | SEASONAL_PROMOS, GRID_PROMO_ROWS |
| `serviceIcons.ts` | iconForService(), colorForService(), imageForService() |

### المكوّنات (`components/`):
- `AppMap.tsx` / `AppMap.native.tsx` — OSM (web) / Google Maps (native)
- `FloatingTabBar.tsx` — شريط تنقل عائم + badges
- `InAppBanner.tsx` — بانر إشعار WhatsApp-style (يعتمد على realtimeEvents، لا على NotificationReceived)
- `RatingBottomSheet.tsx` — نافذة تقييم تلقائية بعد الإنجاز
- `NearbyProviderToast.tsx` — إشعار منبثق للمزودين القريبين
- `GuestEmpty.tsx` / `ErrorBoundary.tsx` / `ScreenHeader.tsx`

---

## 7. لوحة الإدارة (`artifacts/admin/`)

### الصفحات:
| الصفحة | المسار |
|--------|--------|
| Dashboard | `/` — إحصائيات real-time |
| Bookings | `/bookings` — كل الحجوزات + تغيير الحالة + إشعار |
| Providers | `/providers` — CRUD + موافقة/إيقاف |
| Customers | `/customers` — CRUD |
| Services | `/services` — CRUD |
| Categories | `/categories` — CRUD |
| Withdrawals | `/withdrawals` — الموافقة على سحب + إشعار |
| Refunds | `/refunds` — طلبات الاسترداد |
| Offers | `/offers` — CRUD عروض |
| Notifications | `/notifications` — إشعار جماعي (all/users/providers) |
| Support | `/support` — تذاكر دعم |
| Commission | `/commission` — نسبة العمولة (app_settings) |
| Branding | `/branding` — هوية بصرية (app_settings) |
| Policies | `/policies` — سياسات (app_settings) |
| HomeBuilder | `/home-builder` — بناء الصفحة الرئيسية |
| OTA Updates | `/ota-updates` — التحكم بتحديثات OTA |
| Settings | `/settings` — إعدادات عامة |

### تفاصيل تقنية:
- **Router:** Wouter بـ `base="/admin/"`
- **Auth:** `profile.role === "admin"` فقط (email + password مباشرة — لا username hash)
- **Supabase:** `src/lib/supabase.ts` — `VITE_SUPABASE_URL` أو fallback مضمّن (✅ محدَّث)
- **CRUDPage:** مكوّن عام في `src/components/CRUDPage.tsx`
- **API_BASE:** `VITE_API_URL || https://${hostname.replace(/^\d+-/, "8080-")}`

---

## 8. API Server (`artifacts/api-server/`)

### المسارات:
| المسار | الوظيفة |
|--------|---------|
| `GET /api/healthz` | فحص الصحة |
| `POST /api/auth/register` | تسجيل (rate: 5/min) |
| `GET /api/bookings/active` | حجوزات العميل النشطة |
| `GET /api/bookings/:id` | تفاصيل حجز |
| `GET /api/bookings/:id/tracking` | بيانات تتبع + log |
| `POST /api/push` | push لمستخدم (rate: 60/min) |
| `POST /api/push/batch` | push جماعي |
| `POST /api/tickets` | تذكرة دعم |
| `POST /api/refunds` | طلب استرداد |

### المكتبات الداخلية:
- `lib/supabase.ts` — **✅ محدَّث للمشروع الجديد** — verifyJwt(), sbFetch(), isAdminUser()
- `lib/rateLimiter.ts` — حد 5 طلبات/دقيقة (register)، 60/دقيقة (push)
- `lib/providerSweep.ts` — يُعطّل المزودين غير النشطين

---

## 9. منظومة الإشعارات

```
[مستخدم] → sendPushNotification() → POST /api/push (SUPABASE_SERVICE_ROLE_KEY)
         → Expo Push API → FCM v1 → جهاز Android
```

| المكوّن | الحالة |
|---------|--------|
| SUPABASE_SERVICE_ROLE_KEY | ⚠️ غير مضبوط في Replit Secrets |
| EXPO_TOKEN | ✅ |
| google-services.json | ✅ حقيقي (project: nazafa-46eb7, number: 549775812329) |
| FCM v1 Service Account على Expo | ⚠️ يدوي — غير مرفوع بعد |
| Expo projectId | ✅ يُقرأ من Constants.expoConfig |

### ⚠️ لإصلاح إشعارات شريط الحالة (مرة واحدة):
1. https://console.firebase.google.com/project/nazafa-46eb7/settings/serviceaccounts → "Generate new private key"
2. https://expo.dev/accounts/aiservx1/projects/mobile/credentials → Android → FCM V1 → Upload JSON
3. أعد بناء الـ APK

### قنوات Android:
| Channel ID | الأهمية |
|-----------|---------|
| `new_booking` | MAX — طلبات جديدة للمزود |
| `booking_status` | HIGH — تحديثات الطلب للعميل |
| `chat` | HIGH — رسائل المحادثة |
| `promotions` | LOW — عروض |

---

## 10. نقاط مهمة للمطورين

### Username→Email:
```
username "ahmed123" → ahmed123@users.nazafa.app (hash)
```
كل مصادقة المستخدمين تمر عبر `lib/username.ts → usernameToEmail()`. **لا تستخدم Supabase Email Auth مباشرة**.

### RTL:
- `I18nManager.forceRTL(true)` في `app/_layout.tsx`
- استخدم `marginStart/End` بدل `Left/Right`
- Web: `document.documentElement.dir = "rtl"`

### نسبة العمولة:
المزود يحصل على **85%** من قيمة الحجز (`wallet.tsx:59`). العمولة: 15% افتراضي.

### EXPO_PUBLIC_API_URL:
يُخبز في الـ APK وقت البناء. بعد أي Deploy جديد لـ API Server:
1. حدّث `eas.json` → `EXPO_PUBLIC_API_URL`
2. أعد بناء الـ APK

### OTA Updates:
- الصفحة في admin تستخدم project ID قديم `dd03c810`. الصحيح: `c1d243e2-193e-4a27-ad30-87468c74e92b`
- Channel المضبوط في `eas.json` يُحدد من يتلقى التحديث (preview/production)

---

## 11. الثيم والألوان

```js
primary:     "#16C47F"  // أخضر
secondary:   "#7C3AED"  // بنفسجي
danger:      "#EF4444"
warning:     "#F59E0B"
background:  "#F8FAFC" (light) | "#0F172A" (dark)
card:        "#FFFFFF"  (light) | "#1E293B" (dark)
```

---

## 12. المشاكل المعروفة

| المشكلة | الأولوية | الحل |
|---------|---------|------|
| `SUPABASE_SERVICE_ROLE_KEY` غير مضبوط | 🔴 عالية | أضفه لـ Replit Secrets من Supabase Dashboard |
| FCM v1 Service Account غير مرفوع | 🔴 عالية | خطوة يدوية على expo.dev (انظر §9) |
| `EXPO_PUBLIC_API_URL` في `eas.json` = عنوان قديم | 🟡 متوسطة | حدِّثه بعد كل Deploy جديد |
| OTAUpdates.tsx: PROJECT_ID/ACCOUNT قديمان | 🟡 متوسطة | الصفحة تعمل لكن OTA push لن يُرسل للمشروع الصحيح |

---

## 13. مسرد سريع — الملفات الأهم

| الملف | الغرض |
|-------|-------|
| `scripts/start-all.sh` | يشغّل الثلاثة |
| `artifacts/mobile/lib/auth.tsx` | كل منطق المصادقة |
| `artifacts/mobile/lib/notifications.ts` | كل منطق الإشعارات |
| `artifacts/mobile/lib/realtimeStore.tsx` | اشتراكات Supabase Realtime |
| `artifacts/mobile/app/ai-assistant.tsx` | المساعد الذكي (1585 سطر) |
| `artifacts/mobile/app/booking.tsx` | تدفق الحجز (765 سطر) |
| `artifacts/admin/src/components/CRUDPage.tsx` | مكوّن CRUD العام |
| `artifacts/api-server/src/lib/supabase.ts` | Supabase helpers + JWT verify |
| `artifacts/mobile/BUILD_APK.md` | دليل APK شامل |
| `artifacts/mobile/eas.json` | إعدادات EAS build |
| `artifacts/mobile/app.config.ts` | إعدادات Expo |
| `db/migration_status_v3.sql` | آخر migration (arrived/started) |
| `PROJECT_MEMORY.md` | **هذا الملف — المرجع الكامل** |
