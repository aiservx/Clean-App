import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type StatusLog = { id: string; status: string; note: string | null; created_at: string };
type BookingDetail = {
  id: string; status: string; total: number;
  scheduled_at: string | null; payment_method: string | null; notes: string | null; created_at: string;
  services: { title_ar: string; base_price: number; duration_min: number } | null;
  provider: { full_name: string | null; avatar_url: string | null } | null;
  addresses: { street: string | null; district: string | null; city: string | null } | null;
  status_log: StatusLog[];
};

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار", accepted: "مقبول", on_the_way: "في الطريق",
  in_progress: "جاري التنفيذ", completed: "مكتمل", cancelled: "ملغي", rejected: "مرفوض",
};
const STATUS_ICON: Record<string, string> = {
  pending: "clock", accepted: "check-circle", on_the_way: "truck",
  in_progress: "tool", completed: "award", cancelled: "x-circle", rejected: "x-circle",
};
const STATUS_FLOW = ["pending", "accepted", "on_the_way", "in_progress", "completed"];
const FLOW_AR: Record<string, string> = {
  pending: "تم استلام الطلب", accepted: "تأكيد المزود وبدء التحضير",
  on_the_way: "المزود في الطريق إليك", in_progress: "بدء تنفيذ الخدمة", completed: "إنجاز الخدمة",
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "موعد مرن";
  const d = new Date(iso);
  const t = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return `اليوم، ${t}`;
  return `${d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" })} ، ${t}`;
};
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

export default function BookingDetails() {
  const colors = useColors();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    try {
      const [bookingRes, logRes] = await Promise.all([
        supabase.from("bookings").select(`
          id, status, total, scheduled_at, payment_method, notes, created_at,
          services:service_id(title_ar, base_price, duration_min),
          provider:profiles!bookings_provider_id_fkey(full_name, avatar_url),
          addresses:address_id(street, district, city)
        `).eq("id", id).maybeSingle(),
        supabase.from("booking_status_log").select("id, status, note, created_at")
          .eq("booking_id", id).order("created_at", { ascending: true }),
      ]);
      if (bookingRes.data) setBooking({ ...bookingRes.data as any, status_log: logRes.data ?? [] });
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    if (!id) return;
    const ch = supabase.channel(`booking-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "booking_status_log", filter: `booking_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, id]);

  const cancelBooking = () => {
    if (!booking || !session?.user) return;
    Alert.alert("إلغاء الطلب", "هل أنت متأكد من إلغاء هذا الطلب؟", [
      { text: "تراجع", style: "cancel" },
      { text: "إلغاء الطلب", style: "destructive", onPress: async () => {
        await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
        await supabase.from("booking_status_log").insert({ booking_id: booking.id, status: "cancelled", note: "ألغى العميل الطلب" });
        router.back();
      }},
    ]);
  };

  if (loading) return (
    <View style={[styles.c, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  if (!booking) return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="تفاصيل الطلب" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Feather name="alert-circle" size={48} color={colors.mutedForeground} />
        <Text style={[{ fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.foreground, marginTop: 12 }]}>لم يُعثر على الطلب</Text>
      </View>
    </View>
  );

  const isActive = ["pending", "accepted", "on_the_way", "in_progress"].includes(booking.status);
  const isDone = ["completed", "cancelled", "rejected"].includes(booking.status);
  const isCancellable = booking.status === "pending";
  const currentIdx = STATUS_FLOW.indexOf(booking.status);
  const tax = booking.total * 0.15;
  const base = booking.total - tax;
  const addrText = [booking.addresses?.district, booking.addresses?.city].filter(Boolean).join("، ") || booking.addresses?.street || "—";
  const bookingNum = booking.id.split("-")[0].toUpperCase();

  const timeline = STATUS_FLOW.map((step, i) => {
    const log = booking.status_log.find((l) => l.status === step);
    const done = i <= currentIdx && !["cancelled", "rejected"].includes(booking.status);
    return { step, label: FLOW_AR[step], done, active: i === currentIdx && isActive, time: log ? fmtTime(log.created_at) : "—" };
  });

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="تفاصيل الطلب" subtitle={`طلب رقم #${bookingNum}`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        <View style={[styles.statusCard, { backgroundColor: isDone && booking.status !== "completed" ? "#EF4444" : colors.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusL}>الحالة الحالية</Text>
            <Text style={styles.statusT}>{STATUS_AR[booking.status] ?? booking.status}</Text>
            <Text style={styles.statusS}>{fmtDate(booking.scheduled_at)}</Text>
          </View>
          <Feather name={(STATUS_ICON[booking.status] ?? "circle") as any} size={46} color="rgba(255,255,255,0.85)" />
        </View>

        {booking.provider && (
          <View style={[styles.box, { backgroundColor: colors.card }]}>
            <View style={styles.row}>
              <Image source={booking.provider.avatar_url ? { uri: booking.provider.avatar_url } : require("@/assets/images/default-avatar.png")} style={styles.av} />
              <View style={{ flex: 1, marginHorizontal: 10, alignItems: "flex-end" }}>
                <Text style={[styles.n, { color: colors.foreground }]}>{booking.provider.full_name ?? "مزود الخدمة"}</Text>
                <Text style={[styles.s, { color: colors.mutedForeground }]}>مزود خدمة معتمد</Text>
              </View>
              <TouchableOpacity
                style={[styles.icon, { backgroundColor: colors.primaryLight }]}
                onPress={() => router.push(`/chat-detail?name=${encodeURIComponent(booking.provider?.full_name ?? "مزود")}&bookingId=${booking.id}` as any)}
              >
                <Feather name="message-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={[styles.label, { color: colors.foreground }]}>تتبع الطلب</Text>
        <View style={[styles.box, { backgroundColor: colors.card }]}>
          {timeline.map((s, i) => (
            <View key={s.step} style={styles.tlRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tlT, { color: s.done ? colors.foreground : colors.mutedForeground, fontFamily: s.active ? "Tajawal_700Bold" : "Tajawal_500Medium" }]}>{s.label}</Text>
                <Text style={[styles.tlTime, { color: colors.mutedForeground }]}>{s.time}</Text>
              </View>
              <View style={styles.tlIconCol}>
                {i < timeline.length - 1 && <View style={[styles.tlLine, { backgroundColor: timeline[i + 1]?.done ? colors.primary : colors.border }]} />}
                <View style={[styles.tlDot, { backgroundColor: s.done ? colors.primary : colors.border, borderWidth: s.active ? 4 : 0, borderColor: colors.primaryLight }]}>
                  {s.done && <Feather name="check" size={10} color="#FFF" />}
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>تفاصيل الخدمة</Text>
        <View style={[styles.box, { backgroundColor: colors.card }]}>
          {[
            { l: "نوع الخدمة",    v: booking.services?.title_ar ?? "خدمة تنظيف" },
            { l: "التاريخ والوقت", v: fmtDate(booking.scheduled_at) },
            { l: "العنوان",        v: addrText },
            { l: "ملاحظات",        v: booking.notes || "لا توجد" },
            { l: "طريقة الدفع",   v: booking.payment_method === "cash" ? "نقدي" : booking.payment_method === "card" ? "بطاقة" : "—" },
          ].map((d) => (
            <View key={d.l} style={styles.dRow}>
              <Text style={[styles.dV, { color: colors.foreground }]}>{d.v}</Text>
              <Text style={[styles.dL, { color: colors.mutedForeground }]}>{d.l}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>ملخص الفاتورة</Text>
        <View style={[styles.box, { backgroundColor: colors.card }]}>
          {[
            { l: "قيمة الخدمة",  v: `${base.toFixed(0)} ر.س` },
            { l: "ضريبة (15%)", v: `${tax.toFixed(0)} ر.س` },
          ].map((d) => (
            <View key={d.l} style={styles.dRow}>
              <Text style={[styles.dV, { color: colors.foreground }]}>{d.v}</Text>
              <Text style={[styles.dL, { color: colors.mutedForeground }]}>{d.l}</Text>
            </View>
          ))}
          <View style={[styles.dRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
            <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.primary }}>{booking.total.toFixed(0)} ر.س</Text>
            <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 13, color: colors.foreground }}>الإجمالي</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        {isCancellable && (
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelBooking}>
            <Text style={[styles.cancelT, { color: "#EF4444" }]}>إلغاء الطلب</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.trackBtn, { backgroundColor: colors.primary }]}
          onPress={() => isActive ? router.push({ pathname: "/tracking", params: { id: booking.id } } as any) : router.back()}
        >
          {isActive && <Feather name="map-pin" size={16} color="#FFF" />}
          <Text style={styles.trackT}>{isActive ? "تتبع مباشر" : "رجوع"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  statusCard: { padding: 18, borderRadius: 18, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  statusL: { color: "rgba(255,255,255,0.8)", fontFamily: "Tajawal_500Medium", fontSize: 11 },
  statusT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 22, marginVertical: 2 },
  statusS: { color: "rgba(255,255,255,0.95)", fontFamily: "Tajawal_500Medium", fontSize: 12 },
  box: { padding: 14, borderRadius: 16, marginBottom: 10 },
  row: { flexDirection: "row-reverse", alignItems: "center" },
  av: { width: 50, height: 50, borderRadius: 25 },
  n: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  s: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right", marginBottom: 8, marginTop: 6 },
  tlRow: { flexDirection: "row-reverse", alignItems: "flex-start", paddingVertical: 6 },
  tlT: { fontSize: 12, textAlign: "right" },
  tlTime: { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "right", marginTop: 2 },
  tlIconCol: { alignItems: "center", marginLeft: 12, position: "relative", paddingVertical: 4 },
  tlDot: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", zIndex: 1 },
  tlLine: { position: "absolute", top: 18, bottom: -28, width: 2, alignSelf: "center" },
  dRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  dL: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  dV: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24, flexDirection: "row", gap: 10 },
  cancelBtn: { paddingHorizontal: 16, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  trackBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  trackT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13 },
});
