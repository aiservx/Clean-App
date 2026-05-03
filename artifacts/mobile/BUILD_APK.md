# بناء ملف APK لتطبيق نظافة

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

## آخر Build ناجح — إصلاحات UX (Build #3) ✅

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
