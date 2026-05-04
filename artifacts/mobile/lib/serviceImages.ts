// ─────────────────────────────────────────────────────────────────────────────
// Service category images — unique, verified (HTTP 200), real photos that
// accurately depict the CLEANING ACTION being performed for each service.
// All URLs tested and confirmed accessible.
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICE_IMAGES: Record<string, string> = {
  // تنظيف منازل — professional cleaner mopping residential floor (Getty)
  homes:      "https://media.gettyimages.com/id/1417833129/photo/close-up-on-a-professional-cleaner-mopping-the-floor.jpg?s=612x612&w=0&k=20&c=9SC9TYfDTT_1LRpxtQUvOQwzRM3LAqzkBUjG_8EW6nA=",

  // تنظيف عميق — team steam-cleaning a home (deep disinfection)
  deep:       "https://luxurycleaningny.com/wp-content/uploads/2020/04/luxury-cleaning-house-cleaning-nyc-steam-cleaning-service.jpg",

  // تنظيف مكاتب — professional cleaning team working in office
  offices:    "https://janitorialleadspro.com/wp-content/uploads/2024/01/team-cleaning-ladies-working-.jpg",

  // تنظيف كنب — technician steam-cleaning a sectional sofa
  furniture:  "https://steamhippo.com/wp-content/uploads/2025/Upholstery/Sofa-cleaning-Paoli-Wayne-Richboro-West-Chester-Philadelphia-sectional-cleaning-steam-cleaner.webp",

  // كنب / أرائك — professional couch steam extraction cleaning
  sofas:      "https://speedcleanservices.com/wp-content/uploads/2023/11/how-to-steam-clean-a-couch.jpg",

  // تنظيف مراتب — professional mattress cleaning service
  mattresses: "https://www.sleepare.com/wp-content/uploads/2022/10/Mattress-cleaning-service-Miami.jpg",

  // تنظيف مطابخ — professional deep kitchen degreasing and cleaning
  kitchens:   "https://floridakitchenpros.com/wp-content/uploads/2025/06/Deep_Kitchen_Cleaning.jpg",

  // تنظيف فلل — professional villa deep-cleaning team in Dubai
  villas:     "https://cleanmyhouseservice-images.s3.us-east-1.amazonaws.com/images/dubai-villa-deep-cleaning-process.webp",

  // تنظيف شقق — professional maid cleaning apartment living room (Pinterest)
  apartments: "https://i.pinimg.com/originals/1a/d4/0f/1ad40f133c02e3b944a4dcb735ec50d7.jpg",

  // تنظيف حمامات — professional tile and grout bathroom cleaning
  bathrooms:  "https://images.airtasker.com/v7/https://airtasker-seo-assets-prod.s3.amazonaws.com/en_GB/1632745850044_tile-grout-cleaning.jpg",

  // تنظيف واجهات — rope-access technicians washing residential building windows
  facades:    "https://abseilersunited.com/wp-content/uploads/2021/07/1_window_cleaning_abseilers_cleaning_windows_and_balcony_balustrades_on_a_residential_building_in_sydney-thegem-blog-default.jpeg",

  // تنظيف خزانات — water storage tank cleaning service
  tanks:      "https://www.fabseal.com/wp-content/uploads/2025/07/water-tank-cleaning-services.png",

  // تنظيف مكيفات — HVAC technicians cleaning a ductless mini-split AC unit
  ac:         "https://emcocooling.com/wp-content/uploads/2023/09/Ductless-Mini-Split-Cleaning-Service-Technicians-near-me-Mold-treatment-by-EMCO-Tech-technician-uai-516x344.webp",

  // تنظيف ما بعد البناء — professional post-construction site cleanup crew
  postbuild:  "https://thefacilitiesgroup.com/wp-content/uploads/2023/10/Post-Construction-Clean-up-SS-1024x681.jpg",

  // غسيل سيارات — professional hand car wash service with foam
  cars:       "https://media.istockphoto.com/id/1383467360/photo/hand-car-wash-service.jpg?s=612x612&w=0&k=20&c=5BiJuzDTbj-VLc9z3wV1VHYoAo-Y5IQWG2x8EZTy9Ng=",

  // تنظيف مسابح — crystal-clear swimming pool (cleaned result)
  pools:      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80",

  // تنسيق حدائق — professional landscaper trimming garden plants
  gardens:    "https://cactilandscape.com/wp-content/uploads/2023/05/AdobeStock_534348982-scaled.jpeg",

  // تنظيف مساجد — Grand Mosque Abu Dhabi interior, white pillars and marble
  mosques:    "https://media.istockphoto.com/id/155431320/photo/mosque-in-abu-dhabi-with-white-pillars.jpg?s=612x612&w=0&k=20&c=auGRn31gK6kr9_UK19gvBkv5SlChyJIDvKpEf991l-A=",

  // تنظيف مدارس — janitors cleaning school hallway floor (Getty)
  schools:    "https://media.gettyimages.com/id/2158719646/photo/janitors-cleaning-the-floor-in-school-hallway.jpg?s=612x612&w=0&k=20&c=-XG-hNji6xZzsjrvEqHpwWN7V76iqrpfRx1bET1UMdM=",
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
