import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { distanceKm, getCurrentResolved, type ResolvedAddress } from "@/lib/location";
import GuestEmpty from "@/components/GuestEmpty";

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار التأكيد",
  accepted: "تم التأكيد",
  on_the_way: "في الطريق إليك",
  in_progress: "جاري التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

const STATUS_ICON: Record<string, string> = {
  pending: "clock-outline",
  accepted: "check-circle-outline",
  on_the_way: "car",
  in_progress: "broom",
  completed: "check-all",
  cancelled: "close-circle-outline",
  rejected: "alert-circle-outline",
};

type Booking = any;
type LogRow = { id: string; status: string; created_at: string };

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session, profile } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [providerLoc, setProviderLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [myLoc, setMyLoc] = useState<ResolvedAddress | null>(null);
  const [loading, setLoading] = useState(true);

  const isProvider = profile?.role === "provider";

  useEffect(() => {
    if (!session) return;
    (async () => {
      const sel = `*, services(title_ar, base_price), addresses(*), provider:profiles!bookings_provider_id_fkey(full_name, phone), client:profiles!bookings_user_id_fkey(full_name, phone), provider_data:providers!bookings_provider_id_fkey(current_lat, current_lng, vehicle, plate, rating)`;
      let q = supabase.from("bookings").select(sel).order("created_at", { ascending: false }).limit(1);
      if (params.id) q = supabase.from("bookings").select(sel).eq("id", params.id).limit(1);
      else q = q.in("status", ["pending", "accepted", "on_the_way", "in_progress"]);
      if (isProvider) q = q.eq("provider_id", session.user.id);
      else q = q.eq("user_id", session.user.id);
      const { data } = await q.maybeSingle();
      setBooking(data);
      if (data) {
        const { data: l } = await supabase.from("booking_status_log").select("*").eq("booking_id", data.id).order("created_at");
        setLogs((l as any) || []);
        if (data.provider_data?.current_lat && data.provider_data?.current_lng) {
          setProviderLoc({ lat: data.provider_data.current_lat, lng: data.provider_data.current_lng });
        }
      }
      const me = await getCurrentResolved();
      if (me) setMyLoc(me);
      setLoading(false);
    })();
  }, [session, params.id, isProvider]);

  // realtime subscription for provider location + booking status
  useEffect(() => {
    if (!booking) return;
    const ch = supabase
      .channel(`b-${booking.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "providers", filter: `id=eq.${booking.provider_id}` }, (payload: any) => {
        const r = payload.new;
        if (r?.current_lat && r?.current_lng) setProviderLoc({ lat: r.current_lat, lng: r.current_lng });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${booking.id}` }, (payload: any) => {
        setBooking((b: any) => ({ ...b, ...payload.new }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "booking_status_log", filter: `booking_id=eq.${booking.id}` }, (payload: any) => {
        setLogs((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [booking?.id, booking?.provider_id]);

  const dest = useMemo(() => {
    if (booking?.addresses?.lat && booking?.addresses?.lng) return { lat: booking.addresses.lat, lng: booking.addresses.lng };
    if (myLoc) return { lat: myLoc.lat, lng: myLoc.lng };
    return null;
  }, [booking, myLoc]);

  const dKm = useMemo(() => (providerLoc && dest ? distanceKm(providerLoc, dest) : null), [providerLoc, dest]);
  const eta = dKm != null ? Math.max(3, Math.round((dKm / 25) * 60)) : null;

  const region = useMemo(() => {
    const c = providerLoc || dest || { lat: 24.7136, lng: 46.6753 };
    return { latitude: c.lat, longitude: c.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 };
  }, [providerLoc, dest]);

  const updateStatus = async (s: string) => {
    if (!booking) return;
    await supabase.from("bookings").update({ status: s }).eq("id", booking.id);
  };

  const updateMyLocation = async () => {
    const r = await getCurrentResolved();
    if (r && session) await supabase.from("providers").update({ current_lat: r.lat, current_lng: r.lng }).eq("id", session.user.id);
  };

  if (!session) {
    return <GuestEmpty title="تتبع الطلب" subtitle="سجّل دخولك لمتابعة طلبك المباشر" icon="map-marker-path" />;
  }

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!booking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top + 60 }]}>
        <MaterialCommunityIcons name="map-marker-off" size={56} color={colors.mutedForeground} />
        <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.foreground, fontSize: 18, marginTop: 12 }}>لا يوجد طلب نشط</Text>
        <Text style={{ fontFamily: "Tajawal_500Medium", color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>اطلب خدمة لتظهر هنا</Text>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/home" as any)} style={{ marginTop: 18, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}>
          <Text style={{ color: "#FFF", fontFamily: "Tajawal_700Bold" }}>الذهاب للرئيسية</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = booking.status as string;
  const otherParty = isProvider ? booking.client : booking.provider;
  const otherInitials = (otherParty?.full_name || "؟").trim().split(" ").map((s: string) => s[0]).slice(0, 2).join("");

  const markers: any[] = [];
  if (providerLoc) markers.push({ id: "p", coordinate: { latitude: providerLoc.lat, longitude: providerLoc.lng }, color: colors.primary });
  if (dest) markers.push({ id: "d", coordinate: { latitude: dest.lat, longitude: dest.lng }, color: "#EF4444" });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.card }]}>
          <Feather name="phone" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{STATUS_AR[status]}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {isProvider ? "متابعة طلب العميل" : eta != null ? `وصول خلال ~${eta} دقيقة` : "متابعة الطلب"}
          </Text>
        </View>
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.card }]} onPress={() => router.back()}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.etaRow}>
          <View style={[styles.etaHalf, { backgroundColor: colors.accentLight }]}>
            <Text style={[styles.etaSmall, { color: colors.accent }]}>المسافة</Text>
            <Text style={[styles.etaLarge, { color: colors.accent }]}>{dKm != null ? `${dKm.toFixed(1)} كم` : "—"}</Text>
          </View>
          <View style={[styles.etaHalf, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.etaSmall, { color: colors.success }]}>الوقت المتوقع</Text>
            <Text style={[styles.etaLarge, { color: colors.success }]}>{eta != null ? `${eta} دقيقة` : "—"}</Text>
          </View>
        </View>

        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            <AppMap style={StyleSheet.absoluteFill} region={region} markers={markers} polyline={providerLoc && dest ? { coordinates: [{ latitude: providerLoc.lat, longitude: providerLoc.lng }, { latitude: dest.lat, longitude: dest.lng }], color: colors.primary, width: 4 } : undefined} />
            {isProvider && (
              <TouchableOpacity onPress={updateMyLocation} style={[styles.gpsBtn, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.partyCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary }}>{otherInitials}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", marginRight: 12 }}>
            <Text style={[styles.pName, { color: colors.foreground }]}>{otherParty?.full_name || (isProvider ? "العميل" : "مزود الخدمة")}</Text>
            <Text style={[styles.pSub, { color: colors.mutedForeground }]}>
              {isProvider ? booking.client?.phone || "" : booking.provider_data?.vehicle ? `${booking.provider_data.vehicle} • ${booking.provider_data.plate || ""}` : ""}
            </Text>
          </View>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Feather name="message-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.timelineCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.timelineTitle, { color: colors.foreground }]}>تطور الطلب</Text>
          {logs.length === 0 ? (
            <Text style={{ fontFamily: "Tajawal_500Medium", color: colors.mutedForeground, fontSize: 12, textAlign: "right" }}>لم تتم أي تحديثات بعد</Text>
          ) : (
            logs.map((l, i) => (
              <View key={l.id} style={styles.tlRow}>
                <View style={styles.tlLeftCol}>
                  <View style={[styles.tlDot, { backgroundColor: i === logs.length - 1 ? colors.primary : colors.border }]}>
                    <MaterialCommunityIcons name={(STATUS_ICON[l.status] || "circle") as any} size={12} color="#FFF" />
                  </View>
                  {i < logs.length - 1 && <View style={[styles.tlLine, { backgroundColor: colors.border }]} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 16 }}>
                  <Text style={[styles.tlStatus, { color: colors.foreground }]}>{STATUS_AR[l.status]}</Text>
                  <Text style={[styles.tlTime, { color: colors.mutedForeground }]}>{new Date(l.created_at).toLocaleString("ar-SA")}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {isProvider && status !== "completed" && status !== "cancelled" && (
          <View style={styles.actionsRow}>
            {status === "pending" && (
              <>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => updateStatus("accepted")}>
                  <Text style={styles.actionT}>قبول الطلب</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.danger }]} onPress={() => updateStatus("rejected")}>
                  <Text style={styles.actionT}>رفض</Text>
                </TouchableOpacity>
              </>
            )}
            {status === "accepted" && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => updateStatus("on_the_way")}>
                <Text style={styles.actionT}>بدأت الرحلة</Text>
              </TouchableOpacity>
            )}
            {status === "on_the_way" && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => updateStatus("in_progress")}>
                <Text style={styles.actionT}>وصلت وبدأت العمل</Text>
              </TouchableOpacity>
            )}
            {status === "in_progress" && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={() => updateStatus("completed")}>
                <Text style={styles.actionT}>إنهاء الخدمة</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isProvider && status === "completed" && (
          <TouchableOpacity onPress={() => router.push({ pathname: "/rating", params: { id: booking.id } } as any)} style={[styles.actionBtn, { backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 12 }]}>
            <Text style={styles.actionT}>تقييم الخدمة</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  headerTitleContainer: { alignItems: "flex-end" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  headerSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
  etaRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  etaHalf: { flex: 1, padding: 14, borderRadius: 18, alignItems: "flex-end" },
  etaSmall: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginBottom: 4 },
  etaLarge: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  mapSection: { paddingHorizontal: 16, marginBottom: 12 },
  mapContainer: { height: 240, borderRadius: 22, overflow: "hidden", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  gpsBtn: { position: "absolute", bottom: 12, left: 12, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  partyCard: { flexDirection: "row-reverse", alignItems: "center", marginHorizontal: 16, padding: 14, borderRadius: 18, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  pName: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  pSub: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  timelineCard: { marginHorizontal: 16, padding: 16, borderRadius: 18, marginBottom: 12 },
  timelineTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, textAlign: "right", marginBottom: 14 },
  tlRow: { flexDirection: "row-reverse", gap: 10 },
  tlLeftCol: { alignItems: "center", width: 24 },
  tlDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tlLine: { width: 2, flex: 1, marginTop: 2 },
  tlStatus: { fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right" },
  tlTime: { fontFamily: "Tajawal_500Medium", fontSize: 11, textAlign: "right", marginTop: 2 },
  actionsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginTop: 8 },
  actionBtn: { flex: 1, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  actionT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
