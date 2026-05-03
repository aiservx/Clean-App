# بناء ملف APK لتطبيق نظافة

> الطريقة الرسمية والمدعومة من Expo هي عبر **EAS Build** السحابي —
> يبني على خوادم Expo ويُعيد لك ملف `.apk` جاهز للتنزيل.

---

## الحالة الراهنة للإشعارات (بعد الإصلاحات)

| المكوّن | الحالة |
|---------|--------|
| EXPO_PUBLIC_API_URL في eas.json | ✅ مضاف |
| سياسة UPDATE للإشعارات (Mark as Read) | ✅ مضافة |
| تفويض notifyAvailableProviders | ✅ مُصلح (يسمح new_booking → available providers) |
| إشعارات لوحة الأدمن كـ Push | ✅ مُصلح (يستدعي Expo Push مباشرة) |
| تنظيف Push Token عند الخروج | ✅ مُصلح |
| RPC get_push_tokens_for_users | ✅ مضاف للـ schema |

---

## الخطوات لبناء APK

### 1) أدوات مطلوبة (مرة واحدة)

```bash
npm i -g eas-cli
eas login
```

### 2) تحديث EXPO_PUBLIC_API_URL (مهم!)

في `artifacts/mobile/eas.json`، تأكد أن `EXPO_PUBLIC_API_URL` يشير
إلى API server المنشور. القيمة الحالية هي للـ dev domain — غيّرها
لرابط الـ deployment الثابت إن وُجد:

```json
"EXPO_PUBLIC_API_URL": "https://YOUR-DEPLOYED-API-SERVER-URL"
```

### 3) بناء APK للاختبار (preview)

```bash
cd artifacts/mobile
EXPO_TOKEN=your_token eas build --platform android --profile preview --non-interactive
```

أو بدون `--non-interactive` للتفاعل مع الأسئلة:

```bash
eas build --platform android --profile preview
```

سيظهر رابط تنزيل خلال 10–20 دقيقة على:
`https://expo.dev/accounts/clean-beaton/projects/mobile/builds`

### 4) بناء AAB لـ Google Play

```bash
eas build --platform android --profile production
```

---

## ملاحظات مهمة

- إن واجهت خطأ "Invalid keystore" في أول مرة، اختر **"Generate new keystore"**
  حين يسألك EAS — يحدث مرة واحدة فقط.
- `SUPABASE_SERVICE_ROLE_KEY` يجب أن يكون مضبوطاً في API Server
  (Replit Secrets) ليتمكن push.ts من تجاوز RLS.
- بعد تحديث eas.json بـ EXPO_PUBLIC_API_URL الصحيح، أعد بناء APK.

---

## آخر build ناجح

تم بدء build عبر EAS في:
`https://expo.dev/accounts/clean-beaton/projects/mobile/builds/f5875d74-d9b4-40fd-b667-5d5ff777b572`

