import { CRUDPage } from "@/components/CRUDPage";
export default function Bookings() {
  return (
    <CRUDPage
      title="الحجوزات"
      subtitle="جميع الطلبات والمواعيد"
      table="bookings"
      selectQuery="*, profiles!bookings_user_id_fkey(full_name, phone), services(title_ar)"
      orderBy="created_at"
      fields={[
        { key: "id", label: "المعرّف", hideInForm: true, format: (v) => <span className="font-mono text-xs">#{String(v).slice(0,8)}</span> },
        { key: "profiles", label: "العميل", hideInForm: true, format: (v) => v?.full_name || "—" },
        { key: "services", label: "الخدمة", hideInForm: true, format: (v) => v?.title_ar || "—" },
        { key: "scheduled_at", label: "موعد الخدمة", type: "date" },
        { key: "total", label: "المبلغ (ر.س)", type: "number" },
        { key: "status", label: "الحالة", type: "select", options: [
          { value: "pending", label: "قيد الانتظار" },
          { value: "accepted", label: "مقبول" },
          { value: "on_the_way", label: "في الطريق" },
          { value: "in_progress", label: "جاري التنفيذ" },
          { value: "completed", label: "مكتمل" },
          { value: "cancelled", label: "ملغي" },
        ]},
        { key: "payment_method", label: "طريقة الدفع" },
        { key: "notes", label: "ملاحظات", type: "textarea" },
      ]}
    />
  );
}
