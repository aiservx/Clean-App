# نظافة — Arabic RTL Cleaning Services App

تطبيق خدمات التنظيف المنزلي باللغة العربية مع دعم RTL كامل.

---

## البنية / Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo SDK 54 (React Native) |
| Admin Panel | React + Vite |
| API Server | Node.js + Fastify |
| Database | Supabase (PostgreSQL) |
| Push Notifications | Expo Push / FCM |
| Maps | Google Maps (react-native-maps) |
| Fonts | Tajawal (Arabic) |
| Build | EAS Build (Android APK preview) |

---

## هيكل المشروع / Monorepo Layout

```
artifacts/
├── mobile/           # Expo mobile app (user + provider)
│   ├── app/
│   │   ├── (tabs)/   # user tabs: home, bookings, offers, chat, profile
│   │   ├── (provider)/  # provider screens: dashboard, bookings, profile
│   │   ├── ai-assistant.tsx   # AI chatbot booking flow
│   │   ├── offers.tsx → (tabs)/offers.tsx
│   │   └── ...
│   ├── components/
│   │   ├── FloatingTabBar.tsx  # custom RTL bottom nav
│   │   └── ...
│   ├── lib/
│   │   ├── promotions.ts   # single source of truth for promo data
│   │   ├── supabase.ts
│   │   └── notifications.ts
│   ├── hooks/
│   │   └── useColors.ts   # light/dark theme hook
│   ├── constants/
│   │   └── colors.ts
│   └── assets/
│       ├── services/seasonal/   # seasonal offer banner images
│       └── services/promo/      # featured promo banner images
├── api-server/       # Fastify REST API
│   └── src/
│       ├── index.ts
│       └── lib/
│           ├── providerSweep.ts  # auto-offline stale providers + re-online reminders
│           └── logger.ts
└── admin/            # React admin dashboard
```

---

## EAS Build

```bash
# Build Android APK (preview)
cd artifacts/mobile
EAS_NO_VCS=1 EXPO_TOKEN="<token>" npx eas-cli build \
  --platform android --profile preview --non-interactive --no-wait
```

- **Expo Account:** `hadystow`
- **EAS Project ID:** `09e4ce5c-f181-49b0-b379-68b832e1f292`
- **Package:** `com.aiservx.nazafa`
- **Current versionCode:** 12

---

## قاعدة البيانات / Database Schema (Key Tables)

| Table | Description |
|-------|-------------|
| `providers` | مزودو الخدمة — `available`, `current_lat/lng`, `location_updated_at`, `push_token` |
| `bookings` | الحجوزات — `status`, `user_id`, `provider_id`, `service_id` |
| `services` | الخدمات — `title_ar`, `base_price`, `duration_min`, `is_active` |
| `addresses` | عناوين المستخدمين |
| `notifications` | سجل الإشعارات |
| `push_tokens` | رموز FCM للإشعارات |

### Migrations

```sql
-- Provider heartbeat column (required for auto-offline sweep)
ALTER TABLE providers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ DEFAULT now();
```

Migration file: `artifacts/mobile/db/migrations/001_provider_heartbeat.sql`

---

## الميزات / Key Features

### للمستخدم (User)
- تصفح الخدمات + حجز فوري عبر المساعد الذكي
- تتبع الطلب على الخريطة (Google Maps)
- العروض الموسمية + كوبونات قابلة للنسخ
- الإشعارات الفورية لكل مرحلة من مراحل الطلب
- دعم الوضع الداكن (Dark Mode)

### للمزود (Provider)
- لوحة تحكم لإدارة الإتاحة
- قبول/رفض الطلبات
- إنهاء الخدمة + استلام التقييم
- إشعار تلقائي عند انقطاع الاتصال > 8 دقائق
- إشعار تذكيري للعودة للإتاحة بعد 12 ساعة من الغياب

### المساعد الذكي (AI Assistant)
- محادثة عربية + إنجليزية
- تدفق حجز كامل: الخدمة → المزود → العنوان → الهاتف → الفاتورة → التأكيد
- إدخال صوتي (ويب)
- ترتيب الخدمات حسب الطلب في السوق السعودي

---

## متغيرات البيئة / Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | رابط Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح الخادم (Replit Secret) |
| `EXPO_TOKEN` | رمز Expo للبناء |

---

## التشغيل المحلي / Local Development

```bash
# Install all dependencies
pnpm install

# Start API server
pnpm --filter @workspace/api-server run dev

# Start mobile (Expo)
pnpm --filter @workspace/mobile run dev

# Start admin panel
pnpm --filter @workspace/admin run dev
```
