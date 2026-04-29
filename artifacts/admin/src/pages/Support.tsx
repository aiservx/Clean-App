import { CRUDPage } from "@/components/CRUDPage";
export default function Support() {
  return (
    <CRUDPage
      title="تذاكر الدعم الفني"
      table="support_tickets"
      selectQuery="*, profiles(full_name, phone)"
      orderBy="created_at"
      fields={[
        { key: "subject", label: "الموضوع", required: true },
        { key: "body", label: "التفاصيل", type: "textarea" },
        { key: "priority", label: "الأولوية", type: "select", options: [
          { value: "low", label: "منخفضة" },
          { value: "normal", label: "عادية" },
          { value: "high", label: "عالية" },
          { value: "urgent", label: "عاجل" },
        ]},
        { key: "status", label: "الحالة", type: "select", options: [
          { value: "open", label: "مفتوحة" },
          { value: "in_progress", label: "قيد المعالجة" },
          { value: "closed", label: "مغلقة" },
        ]},
        { key: "profiles", label: "العميل", hideInForm: true, format: (v) => v?.full_name || "—" },
      ]}
    />
  );
}
