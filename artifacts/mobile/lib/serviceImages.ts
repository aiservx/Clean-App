// Curated high-quality, modern, realistic photos for each service category.
// All URLs verified accessible from Unsplash CDN (open license).
// Every category has a unique, accurate image that reflects the actual service.

export const SERVICE_IMAGES: Record<string, string> = {
  // House cleaning — woman mopping clean bright floor
  homes: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=800&q=80",
  // Deep cleaning — worker in PPE gloves disinfecting surface
  deep: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80",
  // Office cleaning — bright modern clean office workspace
  offices: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80",
  // Furniture cleaning — emerald velvet sofa in clean room
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
  // Sofa cleaning — different modern gray sofa (unique from furniture)
  sofas: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80",
  // Mattress cleaning — white clean mattress on bed frame
  mattresses: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
  // Kitchen cleaning — modern white kitchen countertop
  kitchens: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
  // Villa cleaning — luxury villa exterior with pool terrace
  villas: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  // Apartment cleaning — modern minimalist apartment interior
  apartments: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
  // Bathroom cleaning — clean white modern bathroom
  bathrooms: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
  // Facade / window cleaning — worker cleaning building exterior windows
  facades: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80",
  // Water tank cleaning — large industrial water storage tank
  tanks: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",
  // AC cleaning — technician repairing air conditioner unit
  ac: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
  // Post-construction cleanup — construction site cleanup workers
  postbuild: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=800&q=80",
  // Car washing — professional car wash with water spray
  cars: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80",
  // Pool cleaning — crystal blue swimming pool water
  pools: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&q=80",
  // Garden maintenance — lush green garden landscaping
  gardens: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",
  // Mosque cleaning — mosque interior with beautiful architecture
  mosques: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80",
  // School cleaning — clean bright classroom
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
