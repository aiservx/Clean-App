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

## ⚠️ المشكلة الحرجة — سبب عدم وصول الإشعارات للأجهزة (مايو 2026)

### التشخيص الكامل

بعد تحليل معمّق لكامل منظومة الإشعارات، اتضح أن:

| المكوّن | الحالة | التأثير |
|---------|--------|---------|
| API Server (`hady201.replit.app`) | ✅ يعمل ويرد على `/api/healthz` | لا مشكلة |
| `EXPO_PUBLIC_API_URL` في eas.json | ✅ صحيح ويمكن الوصول إليه | لا مشكلة |
| `google-services.json` | ✅ project_number حقيقي | لا مشكلة |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ مضبوط في Replit Secrets | لا مشكلة |
| منطق الإرسال في `notifications.ts` | ✅ سليم | لا مشكلة |
| **FCM v1 Service Account على Expo** | ❌ **لم يُرفع أبداً** | **السبب الجذري الوحيد** |

### لماذا تتوقف الإشعارات؟

```
التطبيق → API Server → Expo Push API → [هنا تتوقف] → Firebase FCM → Android
                                         ↑
                     Expo يحتاج FCM v1 Service Account
                     لكي يُكمل الإرسال عبر Firebase
                     بدونه: يُرجع Expo "ok" لكن لا يُرسل شيئاً
```

عند إغلاق التطبيق، الإشعارات تسلك المسار: **Expo Push API → Firebase FCM → الجهاز**. منذ يونيو 2024، ألغت Google نظام FCM القديم. الآن يحتاج Expo لمفتاح `FCM v1 Service Account` المرفوع على `expo.dev` لإتمام هذا المسار.

الإشعارات داخل التطبيق (عندما يكون مفتوحاً) تعمل عبر `addNotificationReceivedListener` مباشرةً بدون Firebase — لذلك InAppBanner يظهر أحياناً لكن شريط الحالة لا يُحدَّث.

### الإصلاح — خطوة واحدة يدوية:

**1. احصل على Firebase Service Account JSON:**
- اذهب إلى: https://console.firebase.google.com/project/nazafa-46eb7/settings/serviceaccounts/adminsdk
- اضغط **"Generate new private key"**
- احفظ الملف JSON على جهازك

**2. ارفعه على Expo Dashboard:**
- اذهب إلى: https://expo.dev/accounts/aiservx1/projects/mobile/credentials
- اختر **Android**
- في قسم **"FCM V1 service account key"** اضغط **Upload**
- ارفع ملف JSON الذي حملته في الخطوة السابقة
- احفظ

**3. أعد بناء الـ APK** (مرة أخيرة بعد رفع FCM v1):
```bash
cd artifacts/mobile
EAS_NO_VCS=1 EXPO_TOKEN="ryF839B-JosOAMoO51biATLZrW7XZODwB1PsrES3" npx eas-cli build \
  --platform android --profile preview --non-interactive --no-wait
```

> **ملاحظة:** Build #13 (الجاري الآن) يصلح مشكلة التوكنات القديمة لكن لن تصل الإشعارات بشريط الحالة حتى ترفع FCM v1. بعد الرفع، أعد البناء مرة واحدة إضافية.

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

### 1. EXPO_PUBLIC_API_URL — العنوان الثابت للـ API Server ✅ مكتمل

| البيئة | العنوان المضبوط في `eas.json` |
|--------|-------------------------------|
| development | `https://clean-app--hady201.replit.app` |
| preview | `https://clean-app--hady201.replit.app` |
| production | `https://clean-app--hady201.replit.app` |

> ⚠️ لا تستخدم عناوين `*.riker.replit.dev` في الـ APK — هذه عناوين مؤقتة تتغير مع كل جلسة تطوير. العنوان الثابت أعلاه من Replit Deployments.

### 2. Android Keystore (توقيع الـ APK) ✅ مُهيَّأ

أُضيف `"credentialsSource": "remote"` لكل البيئات الثلاث في `eas.json`. هذا يعني EAS يُدير Keystore تلقائياً على expo.dev ولا تحتاج لرفع ملف `.jks` يدوياً.

**إذا ظهر طلب Keystore عند البناء:**
```bash
# في أول بناء سيسألك EAS: هل تريد إنشاء keystore جديدة؟
# اختر: "Generate new keystore" (الخيار الأول)
# EAS ستحفظها تلقائياً على expo.dev للبنيات المستقبلية
```

### 3. FCM v1 في Expo Dashboard ⏳ خطوة يدوية مطلوبة

لكي تصل الإشعارات لشريط الحالة عند إغلاق التطبيق، يحتاج Expo لصلاحية إرسال FCM v1.

**الخطوات (مرة واحدة فقط):**
1. اذهب إلى [expo.dev/accounts/aiservx1/projects/mobile/credentials](https://expo.dev/accounts/aiservx1/projects/mobile/credentials)
2. اختر **Android** → قسم **FCM V1 service account key**
3. اضغط **Upload** وارفع ملف Service Account JSON من Firebase:
   - Project: `nazafa-46eb7`
   - Client email: `firebase-adminsdk-fbsvc@nazafa-46eb7.iam.gserviceaccount.com`
4. احفظ

> هذا يختلف عن `google-services.json` — ذاك يُحفَر في الـ APK وقت البناء للاتصال بـ FCM، أما ملف Service Account فيستخدمه خادم Expo لإرسال الإشعارات في الخلفية.

### 4. SUPABASE_SERVICE_ROLE_KEY ✅ مضبوط

مطلوب في Replit Secrets لكي يستطيع API Server:
- جلب push tokens من Supabase (يتجاوز RLS)
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

### Build #13 — رفع versionCode إلى 16 + تنظيف التوكنات (مايو 2026)

| الحقل | القيمة |
|-------|--------|
| Build ID | `0646e5c2-6a82-43b9-abc7-b569e7d2188c` |
| Platform | Android / preview |
| الحساب | aiservx1 |
| EAS Project ID | `c1d243e2-193e-4a27-ad30-87468c74e92b` |
| versionCode | **16** (رُفع من 15 لإجبار المستخدمين على إعادة التثبيت وتجديد التوكنات) |
| API URL | `https://clean-app--hady201.replit.app` (ثابت ✅ لا يزال حياً) |
| Keystore | `Build Credentials txt_65s4Tz` (EAS managed ✅) |
| صفحة البناء | https://expo.dev/accounts/aiservx1/projects/mobile/builds/0646e5c2-6a82-43b9-abc7-b569e7d2188c |
| الحالة | **🔄 جارٍ الآن** |

#### الإصلاحات المضمّنة في هذا البناء:
1. ✅ `app.config.ts` → `versionCode: 16` — تحديث إجباري يمسح التوكنات القديمة عند إعادة التثبيت
2. ✅ جميع إصلاحات Build #12 محفوظة

#### ما تبقى (خطوة يدوية — الأهم):
- ⚠️ **FCM v1 Service Account JSON** — بدونه لن تصل الإشعارات في شريط الحالة. انظر القسم "المشكلة الحرجة" أدناه.

---

### Build #12 — إصلاح الإشعارات الكامل ✅ (مايو 2026)

| الحقل | القيمة |
|-------|--------|
| Build ID | `3313c84b-c96f-4f1a-be03-f9f9050d5f58` |
| Platform | Android / preview |
| الحساب | aiservx1 |
| EAS Project ID | `c1d243e2-193e-4a27-ad30-87468c74e92b` |
| API URL | `https://clean-app--hady201.replit.app` (ثابت دائماً ✅) |
| Keystore | `Build Credentials txt_65s4Tz` (EAS managed ✅) |
| صفحة البناء | https://expo.dev/accounts/aiservx1/projects/mobile/builds/3313c84b-c96f-4f1a-be03-f9f9050d5f58 |
| الحالة | ✅ مكتمل |

#### الإصلاحات المضمّنة في هذا البناء:
1. ✅ `lib/notifications.ts` — projectId يُقرأ تلقائياً من Constants (لا hardcoding)
2. ✅ `google-services.json` — الملف الحقيقي (project_number: `549775812329`)
3. ✅ `eas.json` → `EXPO_PUBLIC_API_URL` — `https://clean-app--hady201.replit.app` (ثابت)
4. ✅ `eas.json` → `credentialsSource: "remote"` — EAS يدير Keystore تلقائياً
5. ⏳ FCM v1 Service Account JSON — لم يُرفع بعد (السبب الجذري لعدم وصول الإشعارات)

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
