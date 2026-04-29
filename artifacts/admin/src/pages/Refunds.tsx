import { CRUDPage } from "@/components/CRUDPage";
export default function Refunds() {
  return (
    <CRUDPage
      title="طلبات الاسترداد"
      table="refunds"
      orderBy="created_at"
      fields={[
        { key: "booking_id", label: "رقم الحجز" },
        { key: "amount", label: "المبلغ", type: "number", required: true },
        { key: "reason", label: "السبب", type: "textarea" },
        { key: "status", label: "الحالة", type: "select", options: [
          { value: "pending", label: "قيد المراجعة" },
          { value: "approved", label: "مقبول" },
          { value: "rejected", label: "مرفوض" },
        ]},
      ]}
    />
  );
}
