import { CRUDPage } from "@/components/CRUDPage";
export default function Offers() {
  return (
    <CRUDPage
      title="العروض والخصومات"
      subtitle="عروض البانر الرئيسي في التطبيق"
      table="offers"
      orderBy="created_at"
      defaultValues={{ active: true, discount: 0 }}
      fields={[
        { key: "title_ar", label: "العنوان (عربي)", required: true },
        { key: "desc_ar", label: "الوصف", type: "textarea" },
        { key: "discount", label: "نسبة الخصم %", type: "number" },
        { key: "image_url", label: "صورة البانر" },
        { key: "valid_until", label: "صالح حتى", type: "date" },
        { key: "active", label: "نشط", type: "boolean" },
      ]}
    />
  );
}
