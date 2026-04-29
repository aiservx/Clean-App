import { CRUDPage } from "@/components/CRUDPage";
export default function Customers() {
  return (
    <CRUDPage
      title="العملاء والحسابات"
      subtitle="إدارة جميع المستخدمين"
      table="profiles"
      orderBy="created_at"
      fields={[
        { key: "full_name", label: "الاسم الكامل" },
        { key: "phone", label: "الجوال" },
        { key: "email", label: "البريد", hideInForm: true },
        { key: "role", label: "الدور", type: "select", options: [
          { value: "user", label: "عميل" },
          { value: "provider", label: "مقدم خدمة" },
          { value: "admin", label: "مدير" },
        ]},
        { key: "created_at", label: "تاريخ التسجيل", type: "date", hideInForm: true },
      ]}
    />
  );
}
