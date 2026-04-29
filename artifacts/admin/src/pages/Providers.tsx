import { CRUDPage } from "@/components/CRUDPage";
export default function Providers() {
  return (
    <CRUDPage
      title="مقدمو الخدمة"
      subtitle="إدارة الفنيين والمحترفين"
      table="providers"
      selectQuery="*, profiles(full_name, phone, email)"
      orderBy="rating"
      defaultValues={{ status: "pending", available: false, rating: 0, total_jobs: 0, hourly_rate: 50, experience_years: 0 }}
      fields={[
        { key: "id", label: "معرف الحساب (UUID من profiles)", required: true },
        { key: "bio", label: "نبذة", type: "textarea" },
        { key: "status", label: "الحالة", type: "select", options: [
          { value: "pending", label: "قيد المراجعة" },
          { value: "approved", label: "مقبول" },
          { value: "rejected", label: "مرفوض" },
          { value: "suspended", label: "موقوف" },
        ]},
        { key: "available", label: "متاح حالياً", type: "boolean" },
        { key: "hourly_rate", label: "السعر/ساعة", type: "number" },
        { key: "experience_years", label: "سنوات الخبرة", type: "number" },
        { key: "vehicle", label: "المركبة" },
        { key: "plate", label: "اللوحة" },
        { key: "iban", label: "IBAN" },
        { key: "rating", label: "التقييم", type: "number", hideInForm: true },
        { key: "total_jobs", label: "عدد المهام", type: "number", hideInForm: true },
        { key: "profiles", label: "الحساب", hideInForm: true,
          format: (v) => v?.full_name ? <span>{v.full_name} <span className="text-xs text-gray-400">({v.phone || v.email})</span></span> : "—",
        },
      ]}
    />
  );
}
