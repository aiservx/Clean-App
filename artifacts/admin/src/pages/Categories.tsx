import { CRUDPage } from "@/components/CRUDPage";
export default function Categories() {
  return (
    <CRUDPage
      title="تصنيفات الخدمات"
      subtitle="نظّم خدماتك في فئات"
      table="service_categories"
      orderBy="sort"
      ascending={true}
      defaultValues={{ sort: 0 }}
      fields={[
        { key: "id", label: "المعرّف (slug)", required: true, placeholder: "house-cleaning" },
        { key: "title_ar", label: "الاسم (عربي)", required: true },
        { key: "icon", label: "الأيقونة (Material Icons)", placeholder: "broom" },
        { key: "color", label: "اللون (Hex)", placeholder: "#16C47F" },
        { key: "sort", label: "الترتيب", type: "number" },
      ]}
    />
  );
}
