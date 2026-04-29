import { useEffect, useState } from "react";
import { CRUDPage } from "@/components/CRUDPage";
import { supabase } from "@/lib/supabase";

export default function Services() {
  const [cats, setCats] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("service_categories").select("id, title_ar").then(({ data }) => setCats(data ?? []));
  }, []);
  return (
    <CRUDPage
      title="الخدمات"
      subtitle="إدارة الخدمات المعروضة في التطبيق"
      table="services"
      orderBy="sort"
      ascending={true}
      defaultValues={{ is_active: true, base_price: 0, duration_min: 120, sort: 0 }}
      fields={[
        { key: "category_id", label: "التصنيف", type: "select", required: true, options: cats.map((c) => ({ value: c.id, label: c.title_ar })) },
        { key: "title_ar", label: "الاسم (عربي)", required: true },
        { key: "desc_ar", label: "الوصف", type: "textarea" },
        { key: "image_url", label: "رابط الصورة" },
        { key: "base_price", label: "السعر (ر.س)", type: "number", required: true },
        { key: "duration_min", label: "المدة (دقيقة)", type: "number" },
        { key: "sort", label: "الترتيب", type: "number" },
        { key: "is_active", label: "نشط", type: "boolean" },
      ]}
    />
  );
}
