import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { I18nManager, Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Lang = "ar" | "en";

type Dict = Record<string, { ar: string; en: string }>;

const DICT: Dict = {
  // ====== common ======
  app_name: { ar: "نظافة", en: "Nadhafa" },
  back: { ar: "رجوع", en: "Back" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  save: { ar: "حفظ", en: "Save" },
  confirm: { ar: "تأكيد", en: "Confirm" },
  next: { ar: "التالي", en: "Next" },
  skip: { ar: "تخطي", en: "Skip" },
  start_now: { ar: "ابدأ الآن", en: "Get Started" },
  see_all: { ar: "عرض الكل", en: "See all" },
  delete: { ar: "حذف", en: "Delete" },
  loading: { ar: "جارٍ التحميل...", en: "Loading..." },
  error: { ar: "خطأ", en: "Error" },
  ok: { ar: "حسناً", en: "OK" },
  yes: { ar: "نعم", en: "Yes" },
  no: { ar: "لا", en: "No" },
  search: { ar: "بحث", en: "Search" },
  use_my_location: { ar: "استخدم موقعي الحالي", en: "Use my current location" },
  no_results: { ar: "لا توجد نتائج", en: "No results" },
  default: { ar: "افتراضي", en: "Default" },

  // ====== onboarding ======
  onb1_small: { ar: "تنظيف احترافي", en: "Professional cleaning" },
  onb1_large: { ar: "لمنزلك", en: "for your home" },
  onb1_sub:   { ar: "خدمات تنظيف احترافية على يد مختصين مدربين بأعلى معايير الجودة",
                en: "Professional cleaning services by trained experts with the highest quality standards" },
  onb2_small: { ar: "احجز بسهولة", en: "Easy booking" },
  onb2_large: { ar: "في أي وقت", en: "anytime" },
  onb2_sub:   { ar: "احجز خدمتك خلال دقائق بسيطة واختر الوقت المناسب ليصلك عامل النظافة",
                en: "Book your service in minutes and choose a time that works for you" },
  onb3_small: { ar: "راحة بالك", en: "Your peace of mind" },
  onb3_large: { ar: "هي أولويتنا", en: "is our priority" },
  onb3_sub:   { ar: "استمتع بمساحة نظيفة ومنظمة ونحن نهتم بالتفاصيل لتعكس هويتك",
                en: "Enjoy a clean, organized space — we handle the details so you can relax" },

  // ====== auth ======
  login_title: { ar: "تسجيل الدخول", en: "Sign in" },
  login_sub:   { ar: "أدخل بياناتك للمتابعة", en: "Enter your details to continue" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  full_name: { ar: "الاسم الكامل", en: "Full name" },
  phone: { ar: "رقم الجوال", en: "Phone number" },
  signin: { ar: "دخول", en: "Sign in" },
  signup: { ar: "إنشاء حساب", en: "Create account" },
  signup_title: { ar: "إنشاء حساب جديد", en: "Create a new account" },
  no_account: { ar: "ليس لديك حساب؟", en: "Don't have an account?" },
  have_account: { ar: "لديك حساب؟", en: "Already have an account?" },
  signup_link: { ar: "إنشاء حساب جديد", en: "Sign up" },
  signin_link: { ar: "تسجيل الدخول", en: "Sign in" },
  browse_as_guest: { ar: "تصفح كزائر", en: "Continue as guest" },
  signin_error: { ar: "خطأ في تسجيل الدخول", en: "Sign in failed" },
  enter_credentials: { ar: "أدخل البريد وكلمة المرور", en: "Enter email and password" },
  account_type: { ar: "نوع الحساب", en: "Account type" },
  customer: { ar: "عميل", en: "Customer" },
  provider: { ar: "مزود خدمة", en: "Service provider" },

  // ====== home ======
  hi_user: { ar: "مرحباً", en: "Hello" },
  welcome: { ar: "مرحباً بك", en: "Welcome" },
  locating: { ar: "جاري تحديد الموقع...", en: "Locating..." },
  set_location: { ar: "حدد موقعك الحالي", en: "Set your location" },
  search_placeholder: { ar: "ابحث عن خدمة أو فني...", en: "Search a service or pro..." },
  services: { ar: "الخدمات", en: "Services" },
  nearby_pros: { ar: "أقرب الفنيين", en: "Nearby pros" },
  no_pros: { ar: "لا يوجد فنيين متاحين قريبين منك حالياً", en: "No pros available near you right now" },
  ai_assistant: { ar: "المساعد الذكي ✨", en: "AI Assistant ✨" },
  ai_assistant_sub: { ar: "اسأل عن أي خدمة وسنساعدك في اختيار الأنسب",
                       en: "Ask about any service and we'll help you choose the best one" },
  per_hour: { ar: "ر.س/ساعة", en: "SAR/hr" },

  // ====== services screen ======
  our_services: { ar: "خدماتنا", en: "Our Services" },
  pick_service: { ar: "اختر الخدمة التي تناسب احتياجك", en: "Pick the service you need" },
  all: { ar: "الكل", en: "All" },
  starts_from: { ar: "ابتداءً من", en: "Starts from" },
  sar: { ar: "ر.س", en: "SAR" },
  no_services_in_cat: { ar: "لا توجد خدمات في هذا التصنيف", en: "No services in this category" },

  // ====== profile ======
  profile_title: { ar: "الملف الشخصي", en: "Profile" },
  profile_sub: { ar: "إدارة حسابك وطلباتك", en: "Manage your account and orders" },
  the_user: { ar: "المستخدم", en: "User" },
  bookings_completed: { ar: "طلب مكتمل", en: "completed orders" },
  my_orders: { ar: "طلباتي", en: "My orders" },
  my_orders_sub: { ar: "إدارة جميع حجوزاتك", en: "Manage all your bookings" },
  favorites: { ar: "المفضلة", en: "Favorites" },
  favorites_sub: { ar: "العمال المفضلين لديك", en: "Your favorite pros" },
  offers: { ar: "العروض", en: "Offers" },
  offers_disc: { ar: "العروض والخصومات", en: "Offers & discounts" },
  offers_disc_sub: { ar: "أحدث العروض الحصرية", en: "Latest exclusive deals" },
  invite_friends: { ar: "دعوة الأصدقاء", en: "Invite friends" },
  invite_friends_sub: { ar: "اربح 50 ر.س لكل صديق", en: "Earn 50 SAR per friend" },
  settings: { ar: "الإعدادات", en: "Settings" },
  settings_sub: { ar: "إدارة الحساب والتنبيهات", en: "Manage account & notifications" },
  help_support: { ar: "المساعدة والدعم", en: "Help & support" },
  help_support_sub: { ar: "تواصل معنا في أي وقت", en: "Contact us anytime" },
  signout_q: { ar: "هل تريد تسجيل الخروج من حسابك؟", en: "Sign out of your account?" },
  signout: { ar: "تسجيل الخروج", en: "Sign out" },
  exit: { ar: "خروج", en: "Sign out" },

  // ====== settings ======
  settings_title: { ar: "الإعدادات", en: "Settings" },
  settings_sub2: { ar: "تخصيص التطبيق وحسابك", en: "Customize app and account" },
  account: { ar: "الحساب", en: "Account" },
  edit_profile: { ar: "تعديل الملف الشخصي", en: "Edit profile" },
  change_password: { ar: "تغيير كلمة المرور", en: "Change password" },
  privacy_security: { ar: "الخصوصية والأمان", en: "Privacy & security" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  push_notifs: { ar: "الإشعارات الفورية", en: "Push notifications" },
  email_notifs: { ar: "إشعارات البريد", en: "Email notifications" },
  sms_notifs: { ar: "رسائل SMS", en: "SMS messages" },
  security: { ar: "الأمان", en: "Security" },
  biometric_login: { ar: "تسجيل الدخول بالبصمة", en: "Biometric sign-in" },
  share_location: { ar: "مشاركة الموقع", en: "Share location" },
  app: { ar: "التطبيق", en: "App" },
  language: { ar: "اللغة", en: "Language" },
  language_arabic: { ar: "العربية", en: "Arabic" },
  language_english: { ar: "الإنجليزية", en: "English" },
  appearance: { ar: "المظهر", en: "Appearance" },
  light_mode: { ar: "فاتح", en: "Light" },
  dark_mode: { ar: "داكن", en: "Dark" },
  system_mode: { ar: "تلقائي (يتبع النظام)", en: "Auto (follow system)" },
  about_app: { ar: "عن التطبيق", en: "About app" },
  delete_account: { ar: "حذف الحساب", en: "Delete account" },
  pick_language: { ar: "اختر اللغة", en: "Choose language" },
  pick_appearance: { ar: "اختر المظهر", en: "Choose appearance" },
  language_change_msg: {
    ar: "ستتم إعادة تشغيل التطبيق لتطبيق اللغة الجديدة.",
    en: "The app will restart to apply the new language.",
  },
  restart_now: { ar: "إعادة التشغيل", en: "Restart now" },

  // ====== address form ======
  new_address: { ar: "عنوان جديد", en: "New address" },
  pin_on_map: { ar: "حدد موقعك على الخريطة", en: "Drop a pin on the map" },
  address_type: { ar: "نوع العنوان", en: "Address type" },
  type_home: { ar: "المنزل", en: "Home" },
  type_work: { ar: "العمل", en: "Work" },
  type_family: { ar: "العائلة", en: "Family" },
  type_other: { ar: "أخرى", en: "Other" },
  address_name: { ar: "اسم العنوان", en: "Address name" },
  address_name_ph: { ar: "مثال: منزل أهلي", en: "e.g. My home" },
  city: { ar: "المدينة", en: "City" },
  address_details: { ar: "تفاصيل العنوان", en: "Address details" },
  address_details_ph: { ar: "حي، شارع، رقم المبنى، رقم الشقة", en: "District, street, building, apt." },
  set_default: { ar: "تعيين كعنوان افتراضي", en: "Set as default address" },
  save_address: { ar: "حفظ العنوان", en: "Save address" },
  detected_address: { ar: "العنوان المكتشف", en: "Detected address" },
  permission_denied: { ar: "تم رفض إذن الموقع", en: "Location permission denied" },
  enable_location: { ar: "فعّل خدمات الموقع للمتابعة", en: "Enable location services to continue" },

  // ====== booking ======
  book_now: { ar: "احجز الآن", en: "Book now" },
  booking_summary: { ar: "ملخص الطلب", en: "Order summary" },
  total: { ar: "الإجمالي", en: "Total" },
};

type Ctx = {
  lang: Lang;
  t: (key: keyof typeof DICT | string, fallback?: string) => string;
  setLang: (l: Lang) => Promise<void>;
  isRTL: boolean;
};

const I18nCtx = createContext<Ctx>({
  lang: "ar",
  t: (k, f) => f ?? String(k),
  setLang: async () => {},
  isRTL: true,
});

const KEY = "app_lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === "ar" || v === "en") setLangState(v);
      // Reconcile RTL direction with stored language.
      // _layout.tsx sets forceRTL(true) unconditionally at module scope
      // (Arabic default for first launch). Here we overwrite with the
      // actual stored preference so the correct direction persists for
      // the next launch.  This runs after module scope, so last-writer-wins.
      const wantRTL = v !== "en"; // default to Arabic if no preference stored
      try {
        I18nManager.allowRTL(wantRTL);
        I18nManager.forceRTL(wantRTL);
      } catch {}
      // Web DOM
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.documentElement.dir = wantRTL ? "rtl" : "ltr";
        document.documentElement.lang = wantRTL ? "ar" : "en";
      }
    });
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const entry = (DICT as any)[key];
      if (entry && entry[lang]) return entry[lang];
      return fallback ?? key;
    },
    [lang]
  );

  const setLang = useCallback(async (l: Lang) => {
    await AsyncStorage.setItem(KEY, l);
    setLangState(l);
    const wantRTL = l === "ar";
    try {
      I18nManager.allowRTL(wantRTL);
      I18nManager.forceRTL(wantRTL);
    } catch {}
    // Web: apply direction via DOM immediately without needing a reload
    if (Platform.OS === "web") {
      if (typeof document !== "undefined") {
        document.documentElement.dir = wantRTL ? "rtl" : "ltr";
        document.documentElement.lang = l;
      }
      return;
    }
    // Native: forceRTL persists and takes effect on next JS bundle load.
    // If current direction doesn't match, prompt restart.
    if (I18nManager.isRTL !== wantRTL) {
      Alert.alert(
        l === "ar" ? "أعد تشغيل التطبيق" : "Restart required",
        l === "ar"
          ? "أغلق التطبيق وأعد فتحه لتطبيق اتجاه الكتابة الجديد."
          : "Close and reopen the app to apply the new writing direction."
      );
    }
  }, []);

  return (
    <I18nCtx.Provider value={{ lang, t, setLang, isRTL: lang === "ar" }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  return useContext(I18nCtx);
}

export function useT() {
  return useContext(I18nCtx).t;
}
