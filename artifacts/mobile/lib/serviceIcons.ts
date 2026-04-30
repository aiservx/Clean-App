// Maps a service title (Arabic) to a meaningful MaterialCommunityIcons glyph + color,
// AND to a 3D-rendered illustrated PNG used by the home/services cards.
// Used by chat grid, home cards, services grid for consistent iconography.

export type ServiceVisual = { icon: string; color: string; image: any };

// Pre-bundled 3D illustration assets (require() so Metro bundles them at build time)
// Note: 10 freshly generated icons + reuse of existing bucket illustration for less common categories.
const IMG = {
  home:      require("../assets/services/svc-home.png"),
  deep:      require("../assets/services/svc-deep.png"),
  office:    require("../assets/services/svc-office.png"),
  sofa:      require("../assets/services/svc-sofa.png"),
  villa:     require("../assets/services/svc-villa.png"),
  apartment: require("../assets/services/svc-apartment.png"),
  carpet:    require("../assets/services/svc-carpet.png"),
  kitchen:   require("../assets/services/svc-kitchen.png"),
  bathroom:  require("../assets/services/svc-bathroom.png"),
  window:    require("../assets/services/svc-window.png"),
  bucket:    require("../assets/images/illustration-bucket.png"),
  vacuum:    require("../assets/images/illustration-vacuum.png"),
};

const RULES: { match: RegExp; icon: string; color: string; image: any }[] = [
  { match: /(عميق|تعقيم|deep)/i,         icon: "shield-check",          color: "#3B82F6", image: IMG.deep },
  { match: /(فل[لة]|villa)/i,             icon: "home-city",             color: "#8B5CF6", image: IMG.villa },
  { match: /(مكت[بئ]|office)/i,           icon: "office-building",       color: "#F59E0B", image: IMG.office },
  { match: /(شقة|apartment)/i,            icon: "home-modern",           color: "#0EA5E9", image: IMG.apartment },
  { match: /(منزل|بيت|home|house)/i,      icon: "home-heart",            color: "#16C47F", image: IMG.home },
  { match: /(كنب|أرائك|sofa)/i,            icon: "sofa-outline",          color: "#10B981", image: IMG.sofa },
  { match: /(سجاد|carpet|rug)/i,          icon: "rug",                   color: "#A855F7", image: IMG.carpet },
  { match: /(مطبخ|kitchen)/i,             icon: "silverware-fork-knife", color: "#EF4444", image: IMG.kitchen },
  { match: /(حمام|دورة المياه|bathroom)/i, icon: "shower",                color: "#06B6D4", image: IMG.bathroom },
  { match: /(زجاج|نوافذ|window|glass)/i,   icon: "window-closed-variant", color: "#0EA5E9", image: IMG.window },
  { match: /(مكيف|تكييف|ac|hvac)/i,        icon: "air-conditioner",       color: "#14B8A6", image: IMG.window },
  { match: /(خزان|tank)/i,                icon: "water",                 color: "#0284C7", image: IMG.deep },
  { match: /(مسبح|pool)/i,                icon: "pool",                  color: "#0EA5E9", image: IMG.bathroom },
  { match: /(سيارة|car)/i,                icon: "car-wash",              color: "#84CC16", image: IMG.deep },
  { match: /(حديقة|landscaping|garden)/i,  icon: "flower-tulip",          color: "#22C55E", image: IMG.home },
  { match: /(غسيل|laundry|ملابس)/i,        icon: "washing-machine",       color: "#F97316", image: IMG.bathroom },
  { match: /(مكافحة|حشرات|pest)/i,         icon: "bug",                   color: "#DC2626", image: IMG.deep },
  { match: /(نقل|moving)/i,               icon: "truck",                 color: "#6366F1", image: IMG.apartment },
];

const FALLBACK: ServiceVisual = { icon: "broom", color: "#16C47F", image: IMG.bucket };

export function visualForService(title: string | undefined | null): ServiceVisual {
  const t = (title || "").toString();
  for (const r of RULES) {
    if (r.match.test(t)) return { icon: r.icon, color: r.color, image: r.image };
  }
  return FALLBACK;
}

export function iconForService(title: string | undefined | null): string {
  return visualForService(title).icon;
}

export function colorForService(title: string | undefined | null): string {
  return visualForService(title).color;
}

export function imageForService(title: string | undefined | null): any {
  return visualForService(title).image;
}
