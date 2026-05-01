import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Animated, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { distanceKm, getCurrentResolved, type ResolvedAddress } from "@/lib/location";
import GuestEmpty from "@/components/GuestEmpty";

const STEPS = ["pending", "accepted", "on_the_way", "in_progress", "completed"] as const;
type StatusKey = typeof STEPS[number] | "cancelled" | "rejected";

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار التأكيد",
  accepted: "تم التأكيد",
  on_the_way: "في الطريق إليك",
  in_progress: "جاري التنفيذ",
  completed: "مكتمل ✓",
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

const STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B",
  accepted: "#3B82F6",
  on_the_way: "#8B5CF6",
  in_progress: "#10B981",
  completed: "#10B981",
  cancelled: "#EF4444",
  rejected: "#EF4444",
};

type Booking = any;
type LogRow = { id: string; status: string; created_at: string };

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.9, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);
  return (
    <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: color, opacity, transform: [{ scale }] }} />
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, borderWidth: 2, borderColor: "#FFF" }} />
    </View>
  );
}

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
  const prevStatusRef = useRef<string | null>(null);

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
      prevStatusRef.current = data?.status ?? null;
      if (data) {
        const { data: l } = await supabase
          .from("booking_status_log")
          .select("*")
          .eq("booking_id", data.id)
          .order("created_at");
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

  useEffect(() => {
    if (!booking) return;
    const topic = `tracking-${booking.id}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(topic)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "providers", filter: `id=eq.${booking.provider_id}` }, (payload: any) => {
        const r = payload.new;
        if (r?.current_lat && r?.current_lng) setProviderLoc({ lat: r.current_lat, lng: r.current_lng });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${booking.id}` }, (payload: any) => {
        const newStatus = payload.new?.status;
        setBooking((b: any) => ({ ...b, ...payload.new }));
        if (newStatus && newStatus !== prevStatusRef.current && !isProvider) {
          prevStatusRef.current = newStatus;
          Alert.alert(
            "📦 تحديث الطلب",
            `حالة طلبك الآن: ${STATUS_AR[newStatus] ?? newStatus}`,
            [{ text: "حسناً" }]
          );
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "booking_status_log", filter: `booking_id=eq.${booking.id}` }, (payload: any) => {
        setLogs((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [booking?.id, booking?.provider_id, isProvider]);

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
    const [, logRes] = await Promise.all([
      supabase.from("bookings").update({ status: s }).eq("id", booking.id),
      supabase.from("booking_status_log").insert({ booking_id: booking.id, status: s, created_at: new Date().toISOString() }),
    ]);
    // Optimistically update local state
    setBooking((b: any) => ({ ...b, status: s }));
    if (!logRes.error) {
      setLogs((prev) => [...prev, { id: `opt-${Date.now()}`, status: s, created_at: new Date().toISOString() }]);
    }
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

  const status = booking.status as StatusKey;
  const statusColor = STATUS_COLOR[status] ?? colors.primary;
  const isTerminal = status === "completed" || status === "cancelled" || status === "rejected";
  const stepIndex = STEPS.indexOf(status as any);
  const otherParty = isProvider ? booking.client : booking.provider;
  const otherInitials = (otherParty?.full_name || "؟").trim().split(" ").map((s: string) => s[0]).slice(0, 2).join("");

  const markers: any[] = [];
  if (providerLoc) markers.push({ id: "p", coordinate: { latitude: providerLoc.lat, longitude: providerLoc.lng }, color: colors.primary });
  if (dest) markers.push({ id: "d", coordinate: { latitude: dest.lat, longitude: dest.lng }, color: "#EF4444" });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <Feather name="phone" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{STATUS_AR[status]}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {isProvider ? "متابعة طلب العميل" : eta != null ? `وصول خلال ~${eta} دقيقة` : "متابعة الطلب"}
          </Text>
        </View>
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.muted }]} onPress={() => router.back()}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {!isTerminal && (
        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { backgroundColor: statusColor, width: `${((stepIndex + 1) / STEPS.length) * 100}%` }]} />
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ETA cards */}
        <View style={styles.etaRow}>
          <View style={[styles.etaHalf, { backgroundColor: colors.accentLight }]}>
            <MaterialCommunityIcons name="map-marker-distance" size={18} color={colors.accent} />
            <Text style={[styles.etaSmall, { color: colors.accent }]}>المسافة</Text>
            <Text style={[styles.etaLarge, { color: colors.accent }]}>{dKm != null ? `${dKm.toFixed(1)} كم` : "—"}</Text>
          </View>
          <View style={[styles.etaHalf, { backgroundColor: colors.successLight }]}>
            <MaterialCommunityIcons name="clock-fast" size={18} color={colors.success} />
            <Text style={[styles.etaSmall, { color: colors.success }]}>الوقت المتوقع</Text>
            <Text style={[styles.etaLarge, { color: colors.success }]}>{eta != null ? `${eta} د` : "—"}</Text>
          </View>
          <View style={[styles.etaHalf, { backgroundColor: statusColor + "20" }]}>
            <MaterialCommunityIcons name={(STATUS_ICON[status] || "circle-outline") as any} size={18} color={statusColor} />
            <Text style={[styles.etaSmall, { color: statusColor }]}>الحالة</Text>
            <Text style={[styles.etaStatus, { color: statusColor }]} numberOfLines={1}>{STATUS_AR[status]}</Text>
          </View>
        </View>

        {/* Map */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            <AppMap
              style={StyleSheet.absoluteFill}
              region={region}
              markers={markers}
              polyline={providerLoc && dest
                ? { coordinates: [{ latitude: providerLoc.lat, longitude: providerLoc.lng }, { latitude: dest.lat, longitude: dest.lng }], color: statusColor, width: 4 }
                : undefined}
            />
            {isProvider && (
              <TouchableOpacity onPress={updateMyLocation} style={[styles.gpsBtn, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Other party card */}
        <View style={[styles.partyCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary, fontSize: 16 }}>{otherInitials}</Text>
          </View>
          <View style={{ flex: 1, marginRight: 12, alignItems: "flex-end" }}>
            <Text style={[styles.pName, { color: colors.foreground }]}>{otherParty?.full_name || (isProvider ? "العميل" : "مزود الخدمة")}</Text>
            <Text style={[styles.pSub, { color: colors.mutedForeground }]}>
              {isProvider ? otherParty?.phone || "" : booking.provider_data?.vehicle ? `${booking.provider_data.vehicle} • ${booking.provider_data.plate || ""}` : ""}
            </Text>
          </View>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Feather name="message-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.timelineTitle, { color: colors.foreground }]}>المخطط الزمني للطلب</Text>

          {/* Steps progress */}
          <View style={styles.stepsRow}>
            {STEPS.map((step, i) => {
              const done = stepIndex >= i;
              const isCurrent = stepIndex === i && !isTerminal;
              const sc = STATUS_COLOR[step] ?? colors.primary;
              return (
                <React.Fragment key={step}>
                  <View style={styles.stepCol}>
                    {isCurrent ? (
                      <PulseDot color={sc} />
                    ) : (
                      <View style={[styles.stepDot, { backgroundColor: done ? sc : colors.muted }]}>
                        {done && <Feather name="check" size={10} color="#FFF" />}
                      </View>
                    )}
                    <Text style={[styles.stepLabel, { color: done ? sc : colors.mutedForeground }]} numberOfLines={2}>
                      {STATUS_AR[step]}
                    </Text>
                  </View>
                  {i < STEPS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: stepIndex > i ? STATUS_COLOR[step] : colors.border }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Log entries */}
          {logs.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.logTitle, { color: colors.mutedForeground }]}>سجل التحديثات</Text>
              {logs.map((l, i) => (
                <View key={l.id} style={styles.tlRow}>
                  <View style={styles.tlLeftCol}>
                    <View style={[styles.tlDot, { backgroundColor: i === logs.length - 1 ? (STATUS_COLOR[l.status] ?? colors.primary) : colors.border }]}>
                      <MaterialCommunityIcons name={(STATUS_ICON[l.status] || "circle") as any} size={11} color="#FFF" />
                    </View>
                    {i < logs.length - 1 && <View style={[styles.tlLine, { backgroundColor: colors.border }]} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 12 }}>
                    <Text style={[styles.tlStatus, { color: STATUS_COLOR[l.status] ?? colors.foreground }]}>{STATUS_AR[l.status] ?? l.status}</Text>
                    <Text style={[styles.tlTime, { color: colors.mutedForeground }]}>{new Date(l.created_at).toLocaleString("ar-SA")}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Provider action buttons */}
        {isProvider && status !== "completed" && status !== "cancelled" && status !== "rejected" && (
          <View style={styles.actionsRow}>
            {status === "pending" && (
              <>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => updateStatus("accepted")}>
                  <Feather name="check" size={16} color="#FFF" />
                  <Text style={styles.actionT}>قبول الطلب</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#EF4444", flex: 0.45 }]} onPress={() => updateStatus("rejected")}>
                  <Feather name="x" size={16} color="#FFF" />
                  <Text style={styles.actionT}>رفض</Text>
                </TouchableOpacity>
              </>
            )}
            {status === "accepted" && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]} onPress={() => updateStatus("on_the_way")}>
                <MaterialCommunityIcons name="car" size={18} color="#FFF" />
                <Text style={styles.actionT}>بدأت الرحلة</Text>
              </TouchableOpacity>
            )}
            {status === "on_the_way" && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#10B981" }]} onPress={() => updateStatus("in_progress")}>
                <MaterialCommunityIcons name="broom" size={18} color="#FFF" />
                <Text style={styles.actionT}>وصلت وبدأت العمل</Text>
              </TouchableOpacity>
            )}
            {status === "in_progress" && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#10B981" }]} onPress={() => updateStatus("completed")}>
                <MaterialCommunityIcons name="check-all" size={18} color="#FFF" />
                <Text style={styles.actionT}>إنهاء الخدمة</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isProvider && status === "completed" && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/rating", params: { id: booking.id } } as any)}
            style={[styles.actionBtn, { backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 12 }]}
          >
            <MaterialCommunityIcons name="star" size={18} color="#FFF" />
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
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.06)" },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15 },
  headerSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 11, marginTop: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  progressBar: { height: 4 },
  progressFill: { height: 4, borderRadius: 2 },
  etaRow: { flexDirection: "row", paddingHorizontal: 12, gap: 8, marginTop: 12, marginBottom: 12 },
  etaHalf: { flex: 1, padding: 12, borderRadius: 16, alignItems: "center", gap: 3 },
  etaSmall: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  etaLarge: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  etaStatus: { fontFamily: "Tajawal_700Bold", fontSize: 10, textAlign: "center" },
  mapSection: { paddingHorizontal: 14, marginBottom: 12 },
  mapContainer: { height: 220, borderRadius: 20, overflow: "hidden" },
  gpsBtn: { position: "absolute", bottom: 12, left: 12, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  partyCard: { flexDirection: "row-reverse", alignItems: "center", marginHorizontal: 14, padding: 14, borderRadius: 18, marginBottom: 12, gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  pName: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  pSub: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  timelineCard: { marginHorizontal: 14, padding: 16, borderRadius: 18, marginBottom: 12 },
  timelineTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, textAlign: "right", marginBottom: 16 },
  stepsRow: { flexDirection: "row-reverse", alignItems: "flex-start" },
  stepCol: { alignItems: "center", flex: 1 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepLabel: { fontFamily: "Tajawal_500Medium", fontSize: 9, marginTop: 5, textAlign: "center" },
  stepLine: { flex: 1, height: 2, marginTop: 11 },
  logTitle: { fontFamily: "Tajawal_700Bold", fontSize: 11, textAlign: "right", marginBottom: 10 },
  tlRow: { flexDirection: "row-reverse", gap: 10 },
  tlLeftCol: { alignItems: "center", width: 22 },
  tlDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  tlLine: { width: 2, flex: 1, marginTop: 2 },
  tlStatus: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "right" },
  tlTime: { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "right", marginTop: 1 },
  actionsRow: { flexDirection: "row", paddingHorizontal: 14, gap: 10, marginTop: 8 },
  actionBtn: { flex: 1, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  actionT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
