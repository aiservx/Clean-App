// Maps a service title (Arabic) to a meaningful MaterialCommunityIcons glyph + color.
// Used by chat grid, home cards, services grid for consistent iconography.

export type ServiceVisual = { icon: string; color: string };

const RULES: { match: RegExp; icon: string; color: string }[] = [
  { match: /(عميق|تعقيم|deep)/i,        icon: "shield-check",          color: "#3B82F6" },
  { match: /(فل[لة]|villa)/i,            icon: "home-city",            color: "#8B5CF6" },
  { match: /(مكت[بئ]|office)/i,          icon: "office-building",      color: "#F59E0B" },
  { match: /(شقة|apartment)/i,           icon: "home-modern",          color: "#0EA5E9" },
  { match: /(منزل|بيت|home|house)/i,      icon: "home-heart",           color: "#16C47F" },
  { match: /(كنب|أرائك|sofa)/i,           icon: "sofa-outline",         color: "#EC4899" },
  { match: /(سجاد|carpet|rug)/i,         icon: "rug",                  color: "#A855F7" },
  { match: /(مطبخ|kitchen)/i,            icon: "silverware-fork-knife",color: "#EF4444" },
  { match: /(حمام|دورة المياه|bathroom)/i,icon: "shower",               color: "#06B6D4" },
  { match: /(زجاج|نوافذ|window|glass)/i,  icon: "window-closed-variant",color: "#0EA5E9" },
  { match: /(مكيف|تكييف|ac|hvac)/i,       icon: "air-conditioner",      color: "#14B8A6" },
  { match: /(خزان|tank)/i,               icon: "water",                color: "#0284C7" },
  { match: /(مسبح|pool)/i,               icon: "pool",                 color: "#0EA5E9" },
  { match: /(سيارة|car)/i,               icon: "car-wash",             color: "#84CC16" },
  { match: /(حديقة|landscaping|garden)/i, icon: "flower-tulip",         color: "#22C55E" },
  { match: /(غسيل|laundry|ملابس)/i,       icon: "washing-machine",      color: "#F97316" },
  { match: /(مكافحة|حشرات|pest)/i,        icon: "bug",                  color: "#DC2626" },
  { match: /(نقل|moving)/i,              icon: "truck",                color: "#6366F1" },
];

const FALLBACK: ServiceVisual = { icon: "broom",  color: "#16C47F" };

export function visualForService(title: string | undefined | null): ServiceVisual {
  const t = (title || "").toString();
  for (const r of RULES) {
    if (r.match.test(t)) return { icon: r.icon, color: r.color };
  }
  return FALLBACK;
}

export function iconForService(title: string | undefined | null): string {
  return visualForService(title).icon;
}

export function colorForService(title: string | undefined | null): string {
  return visualForService(title).color;
}
