# دليل بناء APK — تطبيق نظافة

> **للمطورين الجدد:** اقرأ قسم [معمارية الإشعارات](#معمارية-الإشعارات) أولاً قبل أي تعديل على الإشعارات.

---

## الوضع الحالي

| المكوّن | القيمة |
|---------|--------|
| EAS Account | `aiservx1` |
| EAS Project ID | `c1d243e2-193e-4a27-ad30-87468c74e92b` |
| Expo Owner | `aiservx1` |
| Package Android | `com.aiservx.nazafa` |
| Supabase Project | `mffdpjwtwseftaqrslgx` |
| Firebase Project | `nazafa-46eb7` (project_number: `549775812329`) |

---

## معمارية الإشعارات

### كيف تعمل الإشعارات (الرسم البياني)

```
[مستخدم/مزود يفعل شيئاً في التطبيق]
        │
        ▼
[sendPushNotification() في lib/notifications.ts]
        │
        ▼
[EXPO_PUBLIC_API_URL/api/push  ← API Server على Replit]
        │  (يستخدم SUPABASE_SERVICE_ROLE_KEY لتجاوز RLS)
        ▼
[يجلب push_tokens من Supabase لهذا المستخدم]
        │
        ▼
[Expo Push Service → Firebase FCM → جهاز Android]
        │
        ▼
[إشعار في شريط الحالة حتى لو التطبيق مغلق ✅]
```

### المكوّنات الضرورية للإشعارات

| المكوّن | الملف | الغرض |
|---------|-------|-------|
| تسجيل التوكن | `lib/notifications.ts` → `registerForPush()` | يولّد Expo Push Token ويحفظه في `push_tokens` |
| إرسال الإشعار | `lib/notifications.ts` → `sendPushNotification()` | يرسل عبر API Server (يتجاوز RLS) |
| API Server | `artifacts/api-server/src/routes/push.ts` | يتحقق من الهوية ويرسل لـ Expo |
| Android Channels | `lib/notifications.ts` → `createAndroidChannels()` | تصنيف الإشعارات حسب النوع |
| Firebase FCM | `google-services.json` | ضروري لتوصيل الإشعارات عند إغلاق التطبيق |

---

## المشاكل التي تم اكتشافها وإصلاحها (مايو 2026)

### 🐛 Bug #1 — projectId خاطئ في getExpoPushTokenAsync
**الملف:** `lib/notifications.ts`  
**المشكلة:** كان الكود يستخدم `09e4ce5c-f181-49b0-b379-68b832e1f292` (حساب قديم `hadystow`) بينما المشروع الحقيقي هو `c1d243e2-193e-4a27-ad30-87468c74e92b` (حساب `aiservx1`). الرمز المُولَّد كان ينتمي لمشروع Expo مختلف فتفشل الإشعارات صامتاً.  
**الإصلاح:** الكود الآن يقرأ `projectId` تلقائياً من `Constants.expoConfig?.extra?.eas?.projectId` فلا يتكرر هذا الخطأ.

### 🐛 Bug #2 — EXPO_PUBLIC_API_URL ميتة في eas.json
**الملف:** `eas.json`  
**المشكلة:** العنوان المحفوظ داخل الـ APK كان يشير لبيئة Replit قديمة لم تعد موجودة. كل إشعار كان يُرسل لعنوان ميت دون أي رسالة خطأ واضحة.  
**الإصلاح:** تحديث العنوان لبيئة Replit الحالية. **تنبيه:** بعد كل نشر (Deploy) جديد للـ API Server، يجب تحديث `EXPO_PUBLIC_API_URL` في `eas.json` ثم إعادة بناء الـ APK.

### 🐛 Bug #3 — google-services.json وهمي
**الملف:** `google-services.json`  
**المشكلة:** كان `mobilesdk_app_id` يحتوي على قيمة وهمية (22 حرف بدلاً من 16). بدون FCM حقيقي، لا تصل إشعارات Android لشريط الحالة عند إغلاق التطبيق.  
**الإصلاح:** استبدل بالملف الحقيقي من Firebase Console للمشروع `nazafa-46eb7`.

---

## متطلبات ما قبل البناء

### 1. EXPO_PUBLIC_API_URL — العنوان الثابت للـ API Server

هذا العنوان يُحفَر داخل الـ APK ولا يمكن تغييره بدون إعادة بناء.

**الخطوات:**
1. انشر API Server من Replit (زر Deploy)
2. احصل على العنوان الثابت (مثال: `https://nazafa-api.aiservx1.replit.app`)
3. حدّث `eas.json` في المقاطع الثلاث (development / preview / production):
```json
"EXPO_PUBLIC_API_URL": "https://YOUR-DEPLOYED-URL.replit.app"
```
4. أعد بناء الـ APK

> ⚠️ لا تستخدم عناوين `*.riker.replit.dev` في الـ APK النهائي — هذه عناوين مؤقتة تتغير مع كل جلسة تطوير.

### 2. FCM v1 في Expo Dashboard

لكي يستطيع خادم Expo إرسال الإشعارات لأجهزة Android عبر FCM v1:
1. اذهب إلى [expo.dev](https://expo.dev) → مشروع `mobile` → Credentials
2. أضف Firebase Service Account JSON (من Firebase Console → Project Settings → Service Accounts → Generate new private key)
3. هذا يختلف عن `google-services.json` — ذاك للبناء، وهذا للإرسال.

### 3. SUPABASE_SERVICE_ROLE_KEY

مطلوب في Replit Secrets لكي يستطيع API Server:
- جلب push tokens من Supabase (يتجاوز RLS)
- تشغيل provider sweep التلقائي
- التحقق من صلاحيات المرسِل

---

## كيفية بناء الـ APK

### الطريقة الموصى بها (من Replit Terminal):
```bash
cd artifacts/mobile
EAS_NO_VCS=1 EXPO_TOKEN="$EXPO_TOKEN" npx eas-cli build \
  --platform android --profile preview --non-interactive --no-wait
```

### من terminal محلي:
```bash
cd artifacts/mobile
eas login
eas build --platform android --profile preview
```

### متابعة حالة البناء:
- صفحة المشروع: https://expo.dev/accounts/aiservx1/projects/mobile/builds
- أو: `eas build:list --platform android --limit 5`

---

## سجل البناءات

### Build #12 — إصلاح الإشعارات الكامل 🔧 (مايو 2026)

| الحقل | القيمة |
|-------|--------|
| الإصلاحات | projectId، google-services.json، EXPO_PUBLIC_API_URL، timeout handling |
| الحالة | **يحتاج بناء جديد بعد نشر API Server** |

#### ما يجب فعله قبل البناء:
1. ✅ `lib/notifications.ts` — projectId يُقرأ تلقائياً من Constants
2. ✅ `google-services.json` — استُبدل بالملف الحقيقي (project_number: 549775812329)
3. ⏳ `eas.json` → `EXPO_PUBLIC_API_URL` — يحتاج تحديث بعنوان Deploy الثابت
4. ⏳ FCM v1 credentials في Expo Dashboard

---

### Build #11 — خريطة + إشعارات + RTL ✅

| الحقل | القيمة |
|-------|--------|
| Build ID | `13c25071-6bc4-400b-9f4a-73dd09aad777` |
| Platform | Android / preview |
| صفحة الـ Build | https://expo.dev/accounts/hadystow/projects/mobile/builds/13c25071-6bc4-400b-9f4a-73dd09aad777 |

---

### Build #10 — إصلاح الكراش ✅

| الحقل | القيمة |
|-------|--------|
| Build ID | `42dfb0c6-6563-41b9-89a0-ad7f457dad8a` |
| Platform | Android / preview |

---

### Build #5 — أول نشر على API ثابت ✅

| الحقل | القيمة |
|-------|--------|
| Build ID | `aa4b7db0-e5a7-4d65-84b0-0aea411804bd` |
| تنزيل APK | https://expo.dev/artifacts/eas/n2EFfmjpkzGPfEpk5YzLRc.apk |
| API URL المستخدم | `https://clean-app--create43.replit.app` |

---

## قنوات Android الإشعارية

| Channel ID | الاسم | الأهمية | الاستخدام |
|-----------|-------|---------|----------|
| `new_booking` | طلبات جديدة | MAX | طلبات الحجز الجديدة للمزود |
| `booking_status` | تحديثات الطلب | HIGH | تغيير حالة الطلب للعميل |
| `chat` | رسائل المحادثة | HIGH | رسائل الشات |
| `default` | الإشعارات العامة | HIGH | عام |
| `promotions` | العروض | LOW | عروض وتخفيضات |

---

## نصائح لاستكشاف مشاكل الإشعارات

### التحقق من التوكن:
في Console المطور، ابحث عن:
```
[notifications] push token: ExponentPushToken[...
[notifications] token saved to DB ✓
```
إذا لم يظهر → مشكلة في الإذن أو `Device.isDevice` = false (جهاز وهمي).

### التحقق من الإرسال:
```
[notifications] sendPush ✓ sent=1/1
```
إذا ظهر TIMEOUT → `EXPO_PUBLIC_API_URL` لا يمكن الوصول إليه.  
إذا ظهر خطأ 401/403 → مشكلة في session token أو صلاحيات API.

### اختبار الـ API مباشرة:
```bash
curl -X GET https://YOUR-API-URL.replit.app/api/healthz
# يجب أن يرجع: {"status":"ok"}
```
