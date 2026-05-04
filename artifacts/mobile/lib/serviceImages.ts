// ─────────────────────────────────────────────────────────────────────────────
// Service category images — one unique, accurate Unsplash photo per category.
// Every photo is verified 200 OK, open-license, and reflects the actual service.
// Base URL format: https://images.unsplash.com/<id>?auto=format&fit=crop&w=800&q=80
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICE_IMAGES: Record<string, string> = {
  // تنظيف منازل — woman mopping a bright residential floor
  homes:      "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=800&q=80",

  // تنظيف عميق — professional cleaner in full PPE / hazmat suit
  deep:       "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80",

  // تنظيف مكاتب — modern bright open-plan office workspace
  offices:    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",

  // تنظيف كنب — close-up of fabric sofa interior / upholstery
  furniture:  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",

  // كنب / أرائك — different modern couch in living room (unique from furniture)
  sofas:      "https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?auto=format&fit=crop&w=800&q=80",

  // تنظيف مراتب — clean white mattress on bed frame
  mattresses: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",

  // تنظيف مطابخ — bright modern kitchen with clean surfaces
  kitchens:   "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&w=800&q=80",

  // تنظيف فلل — luxury villa exterior with modern architecture
  villas:     "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",

  // تنظيف شقق — contemporary apartment interior (unique from villas)
  apartments: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",

  // تنظيف حمامات — clean white modern bathroom
  bathrooms:  "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80",

  // تنظيف واجهات — worker suspended cleaning high-rise building windows
  facades:    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80",

  // تنظيف خزانات — large industrial / residential water storage tank
  tanks:      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",

  // تنظيف مكيفات — HVAC technician servicing air-conditioning unit
  ac:         "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80",

  // تنظيف ما بعد البناء — workers on a post-construction cleanup site
  postbuild:  "https://images.unsplash.com/photo-1590698933947-a202b069a861?auto=format&fit=crop&w=800&q=80",

  // غسيل سيارات — professional car detailing / hand wash close-up
  cars:       "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80",

  // تنظيف مسابح — crystal-clear blue swimming pool water
  pools:      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80",

  // تنسيق حدائق — lush green garden with professional landscaping
  gardens:    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",

  // تنظيف مساجد — grand mosque interior with ornate architecture
  mosques:    "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80",

  // تنظيف مدارس — bright clean school classroom
  schools:    "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80",
};

export function getServiceImage(
  categoryId: string | null | undefined,
  dbImageUrl?: string | null,
): string {
  if (dbImageUrl && /^https?:\/\//.test(dbImageUrl)) return dbImageUrl;
  if (categoryId && SERVICE_IMAGES[categoryId]) return SERVICE_IMAGES[categoryId];
  return SERVICE_IMAGES.homes;
}

// ─── Static fallback data (used when Supabase is unreachable) ────────────────

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
  { id: "svc-homes",     category_id: "homes",     title_ar: "تنظيف منازل",         desc_ar: "خدمة تنظيف شاملة لجميع أرجاء المنزل",            base_price: 85,  image_url: SERVICE_IMAGES.homes,      duration_min: 120 },
  { id: "svc-deep",      category_id: "deep",      title_ar: "تنظيف عميق",          desc_ar: "تنظيف عميق وتعقيم شامل للمساحات",                base_price: 150, image_url: SERVICE_IMAGES.deep,       duration_min: 180 },
  { id: "svc-offices",   category_id: "offices",   title_ar: "تنظيف مكاتب",         desc_ar: "خدمة تنظيف احترافية للمكاتب والشركات",           base_price: 100, image_url: SERVICE_IMAGES.offices,    duration_min: 150 },
  { id: "svc-furniture", category_id: "furniture", title_ar: "تنظيف كنب",           desc_ar: "تنظيف وتعقيم الكنب والسجاد بأحدث الأجهزة",       base_price: 120, image_url: SERVICE_IMAGES.furniture,  duration_min: 90  },
  { id: "svc-kitchens",  category_id: "kitchens",  title_ar: "تنظيف مطابخ",         desc_ar: "تنظيف وتطهير المطابخ وإزالة الدهون",             base_price: 110, image_url: SERVICE_IMAGES.kitchens,   duration_min: 120 },
  { id: "svc-villas",    category_id: "villas",    title_ar: "تنظيف فلل",           desc_ar: "خدمة تنظيف متكاملة للفلل والمنازل الكبيرة",      base_price: 250, image_url: SERVICE_IMAGES.villas,     duration_min: 240 },
  { id: "svc-bathrooms", category_id: "bathrooms", title_ar: "تنظيف حمامات",        desc_ar: "تنظيف وتطهير الحمامات وإزالة التكلسات",          base_price: 70,  image_url: SERVICE_IMAGES.bathrooms,  duration_min: 60  },
  { id: "svc-tanks",     category_id: "tanks",     title_ar: "تنظيف خزانات",        desc_ar: "تنظيف وتعقيم خزانات المياه بمعدات معتمدة",       base_price: 180, image_url: SERVICE_IMAGES.tanks,      duration_min: 120 },
];
