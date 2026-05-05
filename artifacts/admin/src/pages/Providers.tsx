import { useEffect, useState, useCallback } from "react";
import { CRUDPage } from "@/components/CRUDPage";
import { supabase } from "@/lib/supabase";

export default function Providers() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [providerIds, setProviderIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const [{ data: profs }, { data: provs }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, email, role").order("created_at", { ascending: false }),
      supabase.from("providers").select("id"),
    ]);
    setProfiles(profs ?? []);
    setProviderIds(new Set((provs ?? []).map((p: any) => p.id)));
  }, []);

  useEffect(() => {
    loadData();
    // Realtime: reload when providers or profiles change
    const ch = supabase
      .channel("admin-providers-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "providers" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  const profileOptions = profiles
    .filter((p) => !providerIds.has(p.id))
    .map((p) => ({
      value: p.id,
      label: `${p.full_name || "بدون اسم"} — ${p.phone || p.email || "—"} (${p.role || "user"})`,
    }));

  return (
    <CRUDPage
      title="مقدمو الخدمة"
      subtitle="إدارة الفنيين والمحترفين"
      table="providers"
      selectQuery="*, profiles(full_name, phone, email)"
      orderBy="rating"
      defaultValues={{ status: "pending", available: false, rating: 0, total_jobs: 0, hourly_rate: 50, experience_years: 0 }}
      fields={[
        {
          key: "id",
          label: "اختر الحساب من قائمة المستخدمين",
          required: true,
          type: "select",
          options: profileOptions,
          placeholder: profileOptions.length === 0 ? "لا يوجد مستخدمون متاحون — أضف مستخدماً أولاً من صفحة المستخدمين" : undefined,
        },
        { key: "bio", label: "نبذة", type: "textarea" },
        { key: "status", label: "الحالة", type: "select", options: [
          { value: "pending", label: "قيد المراجعة" },
          { value: "approved", label: "مقبول" },
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
