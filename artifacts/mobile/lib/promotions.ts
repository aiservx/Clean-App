import type { ImageSourcePropType } from "react-native";

export type SeasonalPromo = {
  id: string;
  image: ImageSourcePropType;
  badge: string;
  title: string;
  subtitle: string;
  discount: number;
  code: string;
  cta: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  ctaBg: string;
  ctaText: string;
  validUntil: string;
};

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

// ─── Individual cropped banner images ────────────────────────────────────────
// seasonal_banner_[0-3] → promo-offers-3.png (853×1843, 4 rows each ~461px)
// featured_banner_[0-3] → promo-offers-4.png rows 0-3 (793×1983, 6 rows each ~330px)
// featured_banner_[4-5] → promo-offers-4.png rows 4-5

export const SEASONAL_PROMOS: SeasonalPromo[] = [
  {
    id: "national-day",
    image: require("@/assets/images/banners/seasonal_banner_0.png"),
    badge: "اليوم الوطني",
    title: "عروض اليوم الوطني السعودي",
    subtitle: "احتفل بوطنك مع خصومات حصرية على خدمات التنظيف",
    discount: 25, code: "SAUDI25", cta: "احجز بالخصم",
    textColor: "#FFFFFF", badgeBg: "rgba(0,124,60,0.9)", badgeText: "#FFFFFF",
    ctaBg: "#007C3C", ctaText: "#FFFFFF", validUntil: "حتى 23 سبتمبر",
  },
  {
    id: "school",
    image: require("@/assets/images/banners/seasonal_banner_1.png"),
    badge: "العودة للمدارس",
    title: "العودة للمدارس بنظافة تتفوق",
    subtitle: "جهّز بيئة مثالية للأطفال مع خدمات التنظيف الاحترافية",
    discount: 20, code: "SCHOOL20", cta: "احجز الآن",
    textColor: "#FFFFFF", badgeBg: "rgba(29,78,216,0.9)", badgeText: "#FFFFFF",
    ctaBg: "#1D4ED8", ctaText: "#FFFFFF", validUntil: "حتى 30 سبتمبر",
  },
  {
    id: "hajj",
    image: require("@/assets/images/banners/seasonal_banner_2.png"),
    badge: "موسم الحج",
    title: "موسم الحج .. راحة وصفاء",
    subtitle: "خدمات تنظيف متكاملة لاستقبال حجاج بيت الله الحرام",
    discount: 15, code: "HAJJ15", cta: "احجز خدمتك",
    textColor: "#0F172A", badgeBg: "rgba(245,158,11,0.9)", badgeText: "#0F172A",
    ctaBg: "#D4A017", ctaText: "#0F172A", validUntil: "طوال موسم الحج",
  },
  {
    id: "eid-adha",
    image: require("@/assets/images/banners/seasonal_banner_3.png"),
    badge: "عيد الأضحى",
    title: "عيد الأضحى المبارك .. بيتك أجمل",
    subtitle: "جهّز منزلك لاستقبال العيد بخدمات التنظيف المميزة",
    discount: 22, code: "ADHA22", cta: "احجز للعيد",
    textColor: "#0F172A", badgeBg: "rgba(232,185,140,0.9)", badgeText: "#0F172A",
    ctaBg: "#C9956C", ctaText: "#FFFFFF", validUntil: "أيام العيد",
  },
  {
    id: "ramadan",
    image: require("@/assets/images/banners/featured_banner_0.png"),
    badge: "عرض رمضان",
    title: "نظافة بيتك .. راحة لروحك في رمضان",
    subtitle: "خدمات تنظيف متكاملة لبيتك",
    discount: 30, code: "RAMADAN30", cta: "احجز قبل رمضان",
    textColor: "#FFFFFF", badgeBg: "rgba(22,196,127,0.9)", badgeText: "#FFFFFF",
    ctaBg: "#16C47F", ctaText: "#FFFFFF", validUntil: "ساري حتى نهاية رمضان",
  },
  {
    id: "spring",
    image: require("@/assets/images/banners/featured_banner_1.png"),
    badge: "عرض الربيع",
    title: "نظافة الربيع لبداية جديدة",
    subtitle: "خدمات تنظيف عميق لمنزل صحي ومنعش",
    discount: 20, code: "SPRING20", cta: "احجز الباقة",
    textColor: "#0F172A", badgeBg: "rgba(14,165,233,0.9)", badgeText: "#FFFFFF",
    ctaBg: "#0EA5E9", ctaText: "#FFFFFF", validUntil: "حتى 31 مايو",
  },
  {
    id: "eid",
    image: require("@/assets/images/banners/featured_banner_2.png"),
    badge: "العيد",
    title: "عيدك أحلى ونظافة بيتك علينا",
    subtitle: "استمتع بالعيد ونحن نهتم بالتنظيف",
    discount: 18, code: "EID18", cta: "احجز للعيد",
    textColor: "#FFFFFF", badgeBg: "rgba(109,40,217,0.9)", badgeText: "#FFFFFF",
    ctaBg: "#7C3AED", ctaText: "#FFFFFF", validUntil: "أيام العيد",
  },
  {
    id: "summer",
    image: require("@/assets/images/banners/featured_banner_3.png"),
    badge: "عرض الصيف",
    title: "صيف نظيف لحياة أجمل",
    subtitle: "خدمات تنظيف للحفاظ على النظافة طوال الصيف",
    discount: 25, code: "SUMMER25", cta: "استفد الآن",
    textColor: "#0F172A", badgeBg: "rgba(245,158,11,0.9)", badgeText: "#0F172A",
    ctaBg: "#F59E0B", ctaText: "#0F172A", validUntil: "حتى 31 أغسطس",
  },
];

export const FEATURED_PROMOS: FeaturedPromo[] = [
  {
    id: "school-back",
    image: require("@/assets/images/banners/featured_banner_4.png"),
    badge: "العام الدراسي", title: "استعد للعام الدراسي ببيت نظيف وصحي",
    subtitle: "نظافة وتعقيم شامل لحماية عائلتك",
    discount: 15, code: "STUDY15", cta: "احجز الباقة",
    titleColor: "#FFFFFF", subColor: "rgba(255,255,255,0.9)",
    badgeBg: "rgba(255,255,255,0.2)", badgeText: "#FFFFFF",
    ctaBg: "#FFFFFF", ctaText: "#0E8C65",
  },
  {
    id: "national-day-2",
    image: require("@/assets/images/banners/featured_banner_5.png"),
    badge: "اليوم الوطني", title: "دام عزك يا وطن .. عروض اليوم الوطني",
    subtitle: "احتفل بوطنك مع خدمات حصرية على التنظيف",
    discount: 25, code: "SAUDI25B", cta: "احجز الآن",
    titleColor: "#FFFFFF", subColor: "rgba(255,255,255,0.9)",
    badgeBg: "rgba(255,255,255,0.2)", badgeText: "#FFFFFF",
    ctaBg: "#FFFFFF", ctaText: "#007C3C",
  },
];

// Grid items from promo-offers-5.png (rows 1-3, each row = 2 cells)
export const GRID_PROMO_ROWS = [
  {
    id: "grid-r1", code: "SEASON20",
    left:  require("@/assets/images/banners/grid_banner_r1_c0.png"),
    right: require("@/assets/images/banners/grid_banner_r1_c1.png"),
  },
  {
    id: "grid-r2", code: "RAIN18",
    left:  require("@/assets/images/banners/grid_banner_r2_c0.png"),
    right: require("@/assets/images/banners/grid_banner_r2_c1.png"),
  },
  {
    id: "grid-r3", code: "WEEK12",
    left:  require("@/assets/images/banners/grid_banner_r3_c0.png"),
    right: require("@/assets/images/banners/grid_banner_r3_c1.png"),
  },
];

export const REFERRAL_PROGRAM = {
  rewardPerFriend: 50,
  friendDiscount: 50,
  minOrderForReward: 100,
};

export type PromoKbEntry = { match: RegExp; answer: string };

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

export function findPromotionAnswer(text: string): string | null {
  for (const e of PROMOTIONS_KB) {
    if (e.match.test(text)) return e.answer;
  }
  return null;
}
