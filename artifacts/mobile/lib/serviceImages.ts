// Curated high-quality, modern, calm-toned realistic photos
// for each service category. Hosted on Unsplash (free CDN).
// Images chosen for: clean backgrounds, soft natural light, brand fit.

export const SERVICE_IMAGES: Record<string, string> = {
  // House cleaning — bright clean modern living room
  homes: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80",
  // Deep cleaning — supplies and gloves on calm background
  deep: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
  // Office cleaning — bright modern office desk
  offices: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  // Sofa cleaning — green sofa in a clean room
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
  sofas: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
  // Mattress cleaning
  mattresses: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
  // Kitchen cleaning — clean modern kitchen
  kitchens: "https://images.unsplash.com/photo-1556909114-44e3e7d9eef0?auto=format&fit=crop&w=800&q=80",
  // Villas — exterior with palms
  villas: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80",
  // Apartments
  apartments: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80",
  // Bathrooms
  bathrooms: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80",
  // Facades / windows
  facades: "https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?auto=format&fit=crop&w=800&q=80",
  // Tanks
  tanks: "https://images.unsplash.com/photo-1581281658100-1ae26eb31c13?auto=format&fit=crop&w=800&q=80",
  // AC
  ac: "https://images.unsplash.com/photo-1631545806609-44dadec0f1f5?auto=format&fit=crop&w=800&q=80",
  // Post-construction
  postbuild: "https://images.unsplash.com/photo-1585128792020-803d29415281?auto=format&fit=crop&w=800&q=80",
  // Cars
  cars: "https://images.unsplash.com/photo-1605732440685-ec5b1b7c8086?auto=format&fit=crop&w=800&q=80",
  // Pools
  pools: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80",
  // Gardens
  gardens: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80",
  // Mosques
  mosques: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80",
  // Schools
  schools: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80",
};

export function getServiceImage(categoryId: string | null | undefined, dbImageUrl?: string | null): string {
  if (dbImageUrl && /^https?:\/\//.test(dbImageUrl)) return dbImageUrl;
  if (categoryId && SERVICE_IMAGES[categoryId]) return SERVICE_IMAGES[categoryId];
  return SERVICE_IMAGES.homes;
}

// Fallback static categories used when Supabase is unreachable or empty.
// Mirrors the typical schema: { id, title_ar, icon, color, sort }.
export const FALLBACK_CATEGORIES = [
  { id: "homes",      title_ar: "تنظيف منازل",  icon: "home",                  color: "#16C47F", sort: 1 },
  { id: "deep",       title_ar: "تنظيف عميق",   icon: "shield-check",          color: "#3B82F6", sort: 2 },
  { id: "offices",    title_ar: "تنظيف مكاتب",  icon: "briefcase",             color: "#F59E0B", sort: 3 },
  { id: "furniture",  title_ar: "تنظيف كنب",    icon: "sofa",                  color: "#10B981", sort: 4 },
  { id: "kitchens",   title_ar: "تنظيف مطابخ",  icon: "silverware-fork-knife", color: "#EF4444", sort: 5 },
  { id: "villas",     title_ar: "تنظيف فلل",    icon: "home-city",             color: "#8B5CF6", sort: 6 },
  { id: "bathrooms",  title_ar: "تنظيف حمامات", icon: "shower",                color: "#06B6D4", sort: 7 },
  { id: "tanks",      title_ar: "تنظيف خزانات", icon: "water",                 color: "#0EA5E9", sort: 8 },
];

export const FALLBACK_SERVICES = [
  { id: "svc-homes",     category_id: "homes",     title_ar: "تنظيف منازل",  desc_ar: "خدمة تنظيف شاملة لجميع أرجاء المنزل",  base_price: 85,  image_url: SERVICE_IMAGES.homes,     duration_min: 120 },
  { id: "svc-deep",      category_id: "deep",      title_ar: "تنظيف عميق",   desc_ar: "تنظيف عميق وتعقيم شامل للمساحات",      base_price: 150, image_url: SERVICE_IMAGES.deep,      duration_min: 180 },
  { id: "svc-offices",   category_id: "offices",   title_ar: "تنظيف مكاتب",  desc_ar: "خدمة تنظيف احترافية للمكاتب والشركات", base_price: 100, image_url: SERVICE_IMAGES.offices,   duration_min: 150 },
  { id: "svc-furniture", category_id: "furniture", title_ar: "تنظيف كنب",    desc_ar: "تنظيف وتعقيم الكنب والسجاد بأحدث الأجهزة", base_price: 120, image_url: SERVICE_IMAGES.furniture, duration_min: 90 },
  { id: "svc-kitchens",  category_id: "kitchens",  title_ar: "تنظيف مطابخ",  desc_ar: "تنظيف وتطهير المطابخ وإزالة الدهون",   base_price: 110, image_url: SERVICE_IMAGES.kitchens,  duration_min: 120 },
  { id: "svc-villas",    category_id: "villas",    title_ar: "تنظيف فلل",    desc_ar: "خدمة تنظيف متكاملة للفلل والمنازل الكبيرة", base_price: 250, image_url: SERVICE_IMAGES.villas,    duration_min: 240 },
  { id: "svc-bathrooms", category_id: "bathrooms", title_ar: "تنظيف حمامات", desc_ar: "تنظيف وتطهير الحمامات وإزالة التكلسات",  base_price: 70,  image_url: SERVICE_IMAGES.bathrooms, duration_min: 60 },
  { id: "svc-tanks",     category_id: "tanks",     title_ar: "تنظيف خزانات", desc_ar: "تنظيف وتعقيم خزانات المياه بمعدات معتمدة", base_price: 180, image_url: SERVICE_IMAGES.tanks,     duration_min: 120 },
];
