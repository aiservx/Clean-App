// Single source of truth for promotional content used by:
//   • app/(tabs)/offers.tsx     (hero slider + featured promo cards)
//   • app/referrals.tsx          (refer-a-friend hero)
//   • app/(tabs)/chat.tsx        (AI assistant knowledge base)

import type { ImageSourcePropType } from "react-native";

export type SeasonalPromo = {
  id: string;
  image: ImageSourcePropType;
  badge: string;          // small chip ("عرض رمضان")
  title: string;          // headline ("تنظيف رمضان الكريم")
  subtitle: string;       // 1-line description
  discount: number;       // percent off
  code: string;           // coupon code shown / spoken to AI
  cta: string;            // button label
  textColor: string;      // foreground text color (for overlay)
  badgeBg: string;        // chip background
  badgeText: string;      // chip foreground
  ctaBg: string;          // button background
  ctaText: string;        // button text
  validUntil: string;     // human readable
};

// Seasonal banners (image 1 — used in the Offers page hero slider)
export const SEASONAL_PROMOS: SeasonalPromo[] = [
  {
    id: "ramadan",
    image: require("@/assets/services/seasonal/ramadan.png"),
    badge: "عرض رمضان",
    title: "تنظيف رمضان الكريم",
    subtitle: "جهّز بيتك لاستقبال الشهر الفضيل بأرقى خدمات التنظيف",
    discount: 30,
    code: "RAMADAN30",
    cta: "احجز قبل رمضان",
    textColor: "#FFFFFF",
    badgeBg: "rgba(245, 158, 11, 0.95)",
    badgeText: "#FFFFFF",
    ctaBg: "#F59E0B",
    ctaText: "#0F172A",
    validUntil: "ساري حتى نهاية رمضان",
  },
  {
    id: "summer",
    image: require("@/assets/services/seasonal/summer.png"),
    badge: "عرض الصيف",
    title: "تنظيف الصيف",
    subtitle: "صيانة وتنظيف المكيفات والخزانات بأسعار منعشة",
    discount: 25,
    code: "SUMMER25",
    cta: "استفد الآن",
    textColor: "#0F172A",
    badgeBg: "#0EA5E9",
    badgeText: "#FFFFFF",
    ctaBg: "#0EA5E9",
    ctaText: "#FFFFFF",
    validUntil: "حتى 31 أغسطس",
  },
  {
    id: "autumn",
    image: require("@/assets/services/seasonal/autumn.png"),
    badge: "عرض الخريف",
    title: "تنظيف ما بعد الخريف",
    subtitle: "تنظيف عميق للسجاد والمفروشات قبل البرد",
    discount: 20,
    code: "AUTUMN20",
    cta: "احجز جلسة",
    textColor: "#7C2D12",
    badgeBg: "#EA580C",
    badgeText: "#FFFFFF",
    ctaBg: "#EA580C",
    ctaText: "#FFFFFF",
    validUntil: "حتى 30 نوفمبر",
  },
  {
    id: "winter",
    image: require("@/assets/services/seasonal/winter.png"),
    badge: "عرض الشتاء",
    title: "تنظيف الشتاء",
    subtitle: "تعقيم شامل ضد الجراثيم والفيروسات في موسم البرد",
    discount: 15,
    code: "WINTER15",
    cta: "احجز اليوم",
    textColor: "#0F172A",
    badgeBg: "#2563EB",
    badgeText: "#FFFFFF",
    ctaBg: "#2563EB",
    ctaText: "#FFFFFF",
    validUntil: "حتى 28 فبراير",
  },
  {
    id: "spring",
    image: require("@/assets/services/seasonal/spring.png"),
    badge: "عرض الربيع",
    title: "تنظيف الربيع",
    subtitle: "تنظيف عميق وتلميع شامل لاستقبال موسم جديد",
    discount: 20,
    code: "SPRING20",
    cta: "احجز الباقة",
    textColor: "#9D174D",
    badgeBg: "#EC4899",
    badgeText: "#FFFFFF",
    ctaBg: "#EC4899",
    ctaText: "#FFFFFF",
    validUntil: "حتى 31 مايو",
  },
];

export type FeaturedPromo = {
  id: string;
  image: ImageSourcePropType;
  badge: string;
  title: string;
  subtitle: string;
  discount: number;
  code: string;
  cta: string;
  titleColor: string;
  subColor: string;
  badgeBg: string;
  badgeText: string;
  ctaBg: string;
  ctaText: string;
};

// Featured product banners (image 2 — used in the Offers page promo strip).
// Layout: each banner has empty space on the LEFT and product art on the RIGHT.
// We render the title / discount / CTA inside the empty left area.
export const FEATURED_PROMOS: FeaturedPromo[] = [
  {
    id: "first-order",
    image: require("@/assets/services/promo/green.png"),
    badge: "عرض ترحيبي",
    title: "خصم الطلب الأول",
    subtitle: "وفر على أول حجز لخدمة التنظيف العميق",
    discount: 30,
    code: "WELCOME30",
    cta: "استلم الخصم",
    titleColor: "#FFFFFF",
    subColor: "rgba(255,255,255,0.92)",
    badgeBg: "rgba(255,255,255,0.22)",
    badgeText: "#FFFFFF",
    ctaBg: "#FFFFFF",
    ctaText: "#0E7C5E",
  },
  {
    id: "deep-clean",
    image: require("@/assets/services/promo/blue.png"),
    badge: "تنظيف عميق",
    title: "باقة التطهير الشاملة",
    subtitle: "تطهير وتعقيم الأرضيات والحمامات والمطابخ",
    discount: 25,
    code: "DEEP25",
    cta: "احجز الباقة",
    titleColor: "#FFFFFF",
    subColor: "rgba(255,255,255,0.92)",
    badgeBg: "rgba(255,255,255,0.22)",
    badgeText: "#FFFFFF",
    ctaBg: "#FFFFFF",
    ctaText: "#1D4ED8",
  },
  {
    id: "sofa-vacuum",
    image: require("@/assets/services/promo/purple.png"),
    badge: "تنظيف الكنب",
    title: "تلميع الكنب والسجاد",
    subtitle: "أجهزة بخار احترافية لإزالة البقع والروائح",
    discount: 20,
    code: "SOFA20",
    cta: "احجز فني",
    titleColor: "#FFFFFF",
    subColor: "rgba(255,255,255,0.92)",
    badgeBg: "rgba(255,255,255,0.22)",
    badgeText: "#FFFFFF",
    ctaBg: "#FFFFFF",
    ctaText: "#6D28D9",
  },
  {
    id: "linen-bundle",
    image: require("@/assets/services/promo/orange.png"),
    badge: "باقة المفروشات",
    title: "تنظيف وكي المفروشات",
    subtitle: "وفر على غسيل وكي المفارش والمناشف معاً",
    discount: 15,
    code: "LINEN15",
    cta: "احجز الباقة",
    titleColor: "#FFFFFF",
    subColor: "rgba(255,255,255,0.92)",
    badgeBg: "rgba(255,255,255,0.22)",
    badgeText: "#FFFFFF",
    ctaBg: "#FFFFFF",
    ctaText: "#C2410C",
  },
  {
    id: "quality-guarantee",
    image: require("@/assets/services/promo/teal.png"),
    badge: "ضمان الجودة",
    title: "ضمان رضاك أو نعيد التنظيف",
    subtitle: "إن لم تكن راضياً، نعيد الخدمة مجاناً خلال 24 ساعة",
    discount: 10,
    code: "TRUST10",
    cta: "اعرف المزيد",
    titleColor: "#FFFFFF",
    subColor: "rgba(255,255,255,0.92)",
    badgeBg: "rgba(255,255,255,0.22)",
    badgeText: "#FFFFFF",
    ctaBg: "#FFFFFF",
    ctaText: "#047857",
  },
];

// Refer-a-friend program (single source for the AI + the page header).
export const REFERRAL_PROGRAM = {
  rewardPerFriend: 50,        // SAR earned per referred friend's first order
  friendDiscount: 50,         // SAR discount the new friend gets
  minOrderForReward: 100,     // SAR — the minimum first order to trigger the reward
  hero: {
    image: require("@/assets/services/promo/orange.png"),
    badge: "اربح 50 ر.س",
    title: "ادع صديق واربح 50 ر.س",
    subtitle: "وصديقك يحصل على خصم 50 ر.س على أول طلب",
    cta: "شارك كودك",
  },
};

// ── AI assistant — searchable knowledge entries about all live promotions ──
// The chat KB iterates these and matches the user's question to the right entry.
export type PromoKbEntry = {
  match: RegExp;
  answer: string;
};

const seasonalLines = SEASONAL_PROMOS
  .map((p) => `• ${p.title} — خصم ${p.discount}% بكود ${p.code} (${p.validUntil})`)
  .join("\n");

const featuredLines = FEATURED_PROMOS
  .map((p) => `• ${p.title} — خصم ${p.discount}% بكود ${p.code}`)
  .join("\n");

export const PROMOTIONS_KB: PromoKbEntry[] = [
  {
    match: /(عروض موسم|موسمي|رمضان|الصيف|الشتاء|الخريف|الربيع|seasonal)/i,
    answer: `العروض الموسمية النشطة الآن:\n${seasonalLines}\n\nاكتب اسم العرض لأطبّق لك الكوبون مباشرة.`,
  },
  {
    match: /(عرض|عروض|كوبون|خصم|كود|promo|coupon|discount)/i,
    answer: `الكوبونات النشطة:\n${featuredLines}\n\nوللعروض الموسمية:\n${seasonalLines}\n\nانسخ الكود وألصقه في صفحة الدفع.`,
  },
  {
    match: /(دعو|دعوة|صديق|اصدقاء|أصدقاء|invite|refer|كود الدعوة)/i,
    answer: `نظام دعوة صديق 🤝\n• اربح ${REFERRAL_PROGRAM.rewardPerFriend} ر.س لكل صديق ينضم بكودك ويُكمل أول طلب (≥ ${REFERRAL_PROGRAM.minOrderForReward} ر.س).\n• صديقك يحصل على خصم ${REFERRAL_PROGRAM.friendDiscount} ر.س على أول طلب.\n• المكافأة تُضاف لمحفظتك تلقائياً وتُستخدم في أي حجز.\n\nافتح "العروض" ➜ "دعوة الأصدقاء" لمشاركة كودك.`,
  },
  {
    match: /(محفظ|wallet|رصيد|balance)/i,
    answer: `محفظتك تجمع كل المكافآت: استرداد، عروض، ودعوة الأصدقاء. يمكنك صرفها في أي حجز جديد بدون حد أدنى — تظهر تلقائياً عند الدفع.`,
  },
  {
    match: /(welcome|اول طلب|أول طلب|طلب اول|طلب أول|جديد)/i,
    answer: `لأول طلب لديك:\n• كوبون WELCOME30 — خصم 30% على التنظيف العميق.\n• هدية ترحيبية: 50 ر.س مكافأة في محفظتك بعد إكمال أول طلب.`,
  },
];

// Quick lookup helper — returns any matching answer or null.
export function findPromotionAnswer(text: string): string | null {
  for (const e of PROMOTIONS_KB) {
    if (e.match.test(text)) return e.answer;
  }
  return null;
}
