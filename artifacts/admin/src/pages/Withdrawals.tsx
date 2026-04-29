import { CRUDPage } from "@/components/CRUDPage";
export default function Withdrawals() {
  return (
    <CRUDPage
      title="طلبات السحب"
      subtitle="سحب الأرصدة من قبل مقدمي الخدمة"
      table="payouts"
      selectQuery="*, providers(profiles(full_name))"
      orderBy="created_at"
      fields={[
        { key: "provider_id", label: "مقدم الخدمة (UUID)" },
        { key: "amount", label: "المبلغ", type: "number", required: true },
        { key: "status", label: "الحالة", type: "select", options: [
          { value: "pending", label: "قيد المراجعة" },
          { value: "paid", label: "تم التحويل" },
          { value: "failed", label: "فشل" },
        ]},
        { key: "iban", label: "IBAN" },
        { key: "providers", label: "المقدم", hideInForm: true, format: (v) => v?.profiles?.full_name || "—" },
      ]}
    />
  );
}
