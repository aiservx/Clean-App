# بناء ملف APK لتطبيق نظافة

## Build #10 — جارٍ الآن 🔄 (الإصلاح الحقيقي للكراش)

| الحقل | القيمة |
|-------|--------|
| Build ID | `42dfb0c6-6563-41b9-89a0-ad7f457dad8a` |
| Platform | Android |
| Profile | **preview** |
| Status | **in progress** |
| صفحة الـ Build | https://expo.dev/accounts/hadystow/projects/mobile/builds/42dfb0c6-6563-41b9-89a0-ad7f457dad8a |

### الإصلاحات في Build #10
- `AppMap.android.tsx` — ملف جديد كلياً: بديل آمن 100% بدون Google Maps على Android (كان يُغلق التطبيق بشكل native لا يمكن إيقافه)
- `_layout.tsx` — حذف `Updates.reloadAsync()` الذي كان يُغلق التطبيق على مشاريع EAS الجديدة

---

## Build #9 — ✅ اكتمل (إصلاح جزئي)

| الحقل | القيمة |
|-------|--------|
| Build ID | `1acb56eb-ec85-44e3-8638-677c3c7dc93c` |
| Platform | Android |
| Profile | **preview** |
| Status | **in progress** |
| الحساب | hadystow |
| EAS Project ID | `09e4ce5c-f181-49b0-b379-68b832e1f292` |
| صفحة الـ Build | https://expo.dev/accounts/hadystow/projects/mobile/builds/1acb56eb-ec85-44e3-8638-677c3c7dc93c |

### الإصلاحات في Build #9
- `AppMap.native.tsx` — تغليف MapView بـ ErrorBoundary لمنع crash من Google Maps
- `notifications.ts` — تصحيح projectId للحساب الجديد `hadystow`
- `app.config.ts` — إعادة إضافة `expo-updates` مع URL المشروع الجديد
- `eas.json` — تحديث `EXPO_PUBLIC_API_URL` للـ domain الحالي

---

## Build #8 — ✅ اكتمل (hadystow)

| الحقل | القيمة |
|-------|--------|
| Build ID | `a8ef00e3-ef82-4394-8cce-3812c685d6c5` |
| Platform | Android |
| Profile | **preview** |
| Status | **finished** |
| الحساب | hadystow |
| EAS Project ID | `09e4ce5c-f181-49b0-b379-68b832e1f292` |
| صفحة الـ Build | https://expo.dev/accounts/hadystow/projects/mobile/builds/a8ef00e3-ef82-4394-8cce-3812c685d6c5 |

---

## آخر Build ناجح — Development Client (Build #7) ✅

| الحقل | القيمة |
|-------|--------|
| Build ID | `85383fd5-da5a-4bfd-a359-f35294215b6d` |
| Platform | Android |
| Profile | **development** |
| Status | **finished** |
| SDK Version | 54.0.0 |
| Runtime Version | 1.0.0 |
| Version | 1.0.0 (versionCode 2) |
| Started | 5/3/2026, 5:14 PM |
| Finished | 5/3/2026, 5:25 PM |
| **تنزيل APK** | **https://expo.dev/artifacts/eas/hs8BE8CVF3Gkzedobekwhe.apk** |
| صفحة الـ Build | https://expo.dev/accounts/clean-beaton/projects/mobile/builds/85383fd5-da5a-4bfd-a359-f35294215b6d |

### ملاحظات هذا البناء
- نوع البناء: **Development Client** (يدعم Expo Dev Tools وتحديثات فورية)
- تم تثبيت `expo-dev-client@6.0.21` بالإصدار المتوافق مع SDK 54
- `EXPO_PUBLIC_API_URL` يشير إلى: `https://10252f24-0ba5-48e4-9528-e9243ecba660-00-3fvtassaapdy7.spock.replit.dev`
- **ملاحظة**: هذا الـ APK يتطلب أن يكون Replit شغّالاً للاتصال بـ API. للإنتاج انشر API Server أولاً.

---

## Build #6 — فشل البناء (errored)

| الحقل | القيمة |
|-------|--------|
| Build ID | `cd45afd9-a497-4db6-a722-93687f99da39` |
| Status | **errored** — `expo-dev-menu@55.0.26` غير متوافق مع SDK 54 |

---

## آخر Build ناجح ✅

| الحقل | القيمة |
|-------|--------|
| Build ID | `cf43488d-3d9e-40d5-b339-f5b5840f5c47` |
| Platform | Android |
| Profile | preview |
| Status | **finished** |
| SDK Version | 54.0.0 |
| Runtime Version | 1.0.0 |
| Version | 1.0.0 (versionCode 2) |
| Started | 5/3/2026, 4:34 AM |
| Finished | 5/3/2026, 5:12 AM |
| **تنزيل APK** | **https://expo.dev/artifacts/eas/rArctytyRmDaRsPXmWUUJT.apk** |
| صفحة الـ Build | https://expo.dev/accounts/clean-beaton/projects/mobile/builds/cf43488d-3d9e-40d5-b339-f5b5840f5c47 |

---

## Build #2 — إصلاحات الإشعارات ✅

| الحقل | القيمة |
|-------|--------|
| Build ID | `f5875d74-d9b4-40fd-b667-5d5ff777b572` |
| Status | **finished** |
| **تنزيل APK** | **https://expo.dev/artifacts/eas/wjuUSBtbsXAb25kFSxG753.apk** |
| صفحة الـ Build | https://expo.dev/accounts/clean-beaton/projects/mobile/builds/f5875d74-d9b4-40fd-b667-5d5ff777b572 |

---

## آخر Build ناجح — إصلاحات إنتاجية شاملة (Build #5) ✅

| الحقل | القيمة |
|-------|--------|
| Build ID | `aa4b7db0-e5a7-4d65-84b0-0aea411804bd` |
| Platform | Android |
| Profile | preview |
| Status | **finished** |
| **تنزيل APK** | **https://expo.dev/artifacts/eas/n2EFfmjpkzGPfEpk5YzLRc.apk** |
| صفحة الـ Build | https://expo.dev/accounts/clean-beaton/projects/mobile/builds/aa4b7db0-e5a7-4d65-84b0-0aea411804bd |

### الإصلاحات في Build #5
- `EXPO_PUBLIC_API_URL` ثابت لجميع البيئات (dev/preview/production): `https://clean-app--create43.replit.app`
- إزالة fallback Supabase من notifications.ts — كل الإشعارات عبر API Server فقط
- RTL يُفعَّل فوراً عند أول تثبيت بدون الحاجة لإعادة تشغيل ثانية (expo-updates reload)
- Onboarding: `inverted={I18nManager.isRTL}` لبدء الشرائح من اليمين
- Push retry: 3 محاولات مع exponential backoff في api-server
- API Server deployed on stable infrastructure: `https://clean-app--create43.replit.app`

## Build #4 — فشل البناء (errored)

| الحقل | القيمة |
|-------|--------|
| Build ID | `5fc311a9-e4e8-4de8-8d30-36029b56698d` |
| Status | **errored** — `newArchEnabled: false` غير متوافق مع RN 0.81 |

---

## آخر Build مكتمل — إصلاحات UX (Build #3) ✅

| الحقل | القيمة |
|-------|--------|
| Build ID | `6a09d2fb-c4e1-4c23-91b4-4bfebcecb7c0` |
| Platform | Android |
| Profile | preview |
| Status | **finished** |
| **تنزيل APK** | **https://expo.dev/artifacts/eas/e6ssjwVAqwVzh4nj99Us35.apk** |
| صفحة الـ Build | https://expo.dev/accounts/clean-beaton/projects/mobile/builds/6a09d2fb-c4e1-4c23-91b4-4bfebcecb7c0 |

### الإصلاحات الإضافية في Build #3
- لوحة المزود: الطلب يختفي فور الموافقة (optimistic update)
- الطلبات الجديدة تظهر فوراً بدون تحديث (realtimeStore dep fix)
- زر GPS يحرّك الخريطة في كل ضغطة (animateTrigger prop)
- صفحة التتبع: زر الرجوع يوجّه للتبويب الصحيح
- قائمة الرسائل (عميل + مزود): تُحدَّث عند التركيز وعند وصول رسالة جديدة

---

## الإصلاحات المطبّقة (تتضمنها الـ builds الجديدة)

| المشكلة | الإصلاح |
|---------|--------|
| `EXPO_PUBLIC_API_URL` مفقود | أُضيف إلى `eas.json` (development + preview) |
| Mark as Read لا يعمل | أُضيفت سياسة UPDATE على جدول notifications |
| إشعارات المزودين الجدد تُحظر (403) | أُصلح `callerMayNotify` يسمح new_booking → available providers |
| لوحة الأدمن لا ترسل Push | تستدعي الآن Expo Push API مباشرة |
| التوكن يبقى بعد الخروج | يُحذف push token قبل signOut |

---

## كيفية إعادة البناء

### من الـ terminal المحلي:
```bash
cd artifacts/mobile
eas login   # مرة واحدة
eas build --platform android --profile preview
```

### من Replit (عبر EAS_NO_VCS):
```bash
cd artifacts/mobile
EAS_NO_VCS=1 EXPO_TOKEN="$EXPO_TOKEN" npx eas-cli build \
  --platform android --profile preview --non-interactive
```

---

## ملاحظة حول EXPO_PUBLIC_API_URL

القيمة الحالية في `eas.json` هي dev domain. لـ APK إنتاجي مستقر:
1. انشر API Server عبر Replit Deployments للحصول على URL ثابت
2. غيّر `EXPO_PUBLIC_API_URL` في `eas.json` للـ URL الثابت
3. أعد البناء

وتأكد أن `SUPABASE_SERVICE_ROLE_KEY` مضبوط في Replit Secrets للـ API Server.
