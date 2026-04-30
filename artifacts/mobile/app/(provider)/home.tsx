import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Platform, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { distanceKm, getCurrentResolved, type ResolvedAddress } from "@/lib/location";

type NearbyOrder = {
  id: string;
  service_title: string;
  client_name: string;
  client_phone: string | null;
  scheduled_at: string | null;
  total: number;
  notes: string | null;
  addr_lat: number | null;
  addr_lng: number | null;
  addr_text: string;
  d_km: number | null;
  eta_min: number | null;
};

const fmtTime = (iso: string | null) => {
  if (!iso) return "وقت مرن";
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const t = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  return same ? `اليوم ${t}` : d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" }) + ` ${t}`;
};

export default function ProviderHome() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session, profile, signOut } = useAuth();
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<NearbyOrder[]>([]);
  const [stats, setStats] = useState({ today: 0, earnings: 0, rating: 0 });
  const [myLoc, setMyLoc] = useState<ResolvedAddress | null>(null);

  const loadAll = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    const uid = session.user.id;

    try {
      const [{ data: prov }, locRes, { data: pendingRows }, { data: todayRows }, { data: ratingRow }] = await Promise.all([
        supabase.from("providers").select("available, current_lat, current_lng, rating").eq("id", uid).maybeSingle(),
        getCurrentResolved(),
        supabase
          .from("bookings")
          .select("id, status, total, scheduled_at, notes, services(title_ar), profiles!bookings_user_id_fkey(full_name, phone), addresses(lat, lng, street, district, city)")
          .or(`provider_id.is.null,provider_id.eq.${uid}`)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("bookings")
          .select("total, status, created_at")
          .eq("provider_id", uid)
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("reviews").select("rating").eq("provider_id", uid),
      ]);

      if (prov?.available !== undefined) setOnline(!!prov.available);
      if (locRes) {
        setMyLoc(locRes);
        // Update provider current location in DB
        await supabase.from("providers").update({ current_lat: locRes.lat, current_lng: locRes.lng }).eq("id", uid);
      }

      const ref = locRes
        ? { lat: locRes.lat, lng: locRes.lng }
        : prov?.current_lat && prov?.current_lng
        ? { lat: prov.current_lat, lng: prov.current_lng }
        : null;

      const mapped: NearbyOrder[] = (pendingRows ?? []).map((b: any) => {
        const addr = b.addresses;
        const lat = addr?.lat ?? null;
        const lng = addr?.lng ?? null;
        const d = ref && lat && lng ? distanceKm(ref, { lat, lng }) : null;
        return {
          id: b.id,
          service_title: b.services?.title_ar || "خدمة",
          client_name: b.profiles?.full_name || "عميل",
          client_phone: b.profiles?.phone || null,
          scheduled_at: b.scheduled_at,
          total: Number(b.total || 0),
          notes: b.notes,
          addr_lat: lat,
          addr_lng: lng,
          addr_text: [addr?.district, addr?.city].filter(Boolean).join("، ") || addr?.street || "—",
          d_km: d,
          eta_min: d != null ? Math.max(5, Math.round((d / 30) * 60)) : null,
        };
      });

      setOrders(mapped);

      const todayCount = (todayRows ?? []).length;
      const todayEarn = (todayRows ?? []).filter((r: any) => r.status === "completed").reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      const ratings = (ratingRow ?? []).map((r: any) => Number(r.rating || 0)).filter((x: number) => x > 0);
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : Number(prov?.rating || 0);
      setStats({ today: todayCount, earnings: todayEarn, rating: Number(avg.toFixed(1)) });

      setLoading(false);
    } catch (e) {
      console.log("[v0] Error loading provider data:", (e as Error).message);
      setLoading(false);
      // Continue with empty state rather than crashing
      setOrders([]);
      setStats({ today: 0, earnings: 0, rating: 0 });
    }
  }, [session]);

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("provider-pending-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const toggleOnline = async (v: boolean) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOnline(v);
    if (session?.user) {
      await supabase.from("providers").update({ available: v }).eq("id", session.user.id);
    }
  };

  const accept = async (id: string) => {
    if (!session?.user) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { error } = await supabase
      .from("bookings")
      .update({ provider_id: session.user.id, status: "accepted" })
      .eq("id", id)
      .in("status", ["pending"]);
    if (error) return Alert.alert("خطأ", error.message);
    await supabase.from("booking_status_log").insert({ booking_id: id, status: "accepted", note: "قبل المزود الطلب" });
    Alert.alert("✓ تم القبول", "تم تخصيص الطلب لك");
    loadAll();
  };

  const reject = async (id: string) => {
    if (!session?.user) return;
    Alert.alert("رفض الطلب", "هل أنت متأكد من رفض هذا الطلب؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "رفض",
        style: "destructive",
        onPress: async () => {
          // Mark as rejected by this provider — keep available for others by setting null provider
          await supabase.from("booking_status_log").insert({ booking_id: id, status: "rejected", note: `مزود ${session.user.id} رفض` });
          // Remove from list locally
          setOrders((prev) => prev.filter((o) => o.id !== id));
        },
      },
    ]);
  };

  const region = useMemo(
    () => ({
      latitude: myLoc?.lat ?? 24.7136,
      longitude: myLoc?.lng ?? 46.6753,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    [myLoc]
  );

  const markers = useMemo(
    () =>
      orders
        .filter((o) => o.addr_lat && o.addr_lng)
        .map((o) => ({ id: o.id, coordinate: { latitude: o.addr_lat!, longitude: o.addr_lng! }, color: colors.accent })),
    [orders, colors]
  );

  const firstName = profile?.full_name?.split(" ")[0] || "مزود";

  if (!session) {
    return (
      <View style={[styles.c, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 20 }]}>
        <MaterialCommunityIcons name="account-tie" size={64} color={colors.mutedForeground} />
        <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.foreground, marginTop: 16, textAlign: "center" }}>
          سجّل دخولك بحساب مزود
        </Text>
        <TouchableOpacity onPress={() => router.push("/login")} style={{ marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 100 }}>
          <Text style={{ color: "#FFF", fontFamily: "Tajawal_700Bold" }}>تسجيل الدخول</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.push("/provider-notifications")}>
          <View style={[styles.icon, { backgroundColor: colors.card }]}>
            <Feather name="bell" size={18} color={colors.foreground} />
            {orders.length > 0 && <View style={[styles.notifDot, { backgroundColor: colors.danger }]} />}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.greet, { color: colors.mutedForeground }]}>أهلاً 👋</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{firstName}</Text>
        </View>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary, fontSize: 16 }}>{firstName?.charAt(0) || "م"}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <LinearGradient
          colors={online ? [colors.primary, colors.primaryDark] : ["#94A3B8", "#64748B"]}
          style={styles.statusBox}
        >
          <View>
            <Text style={styles.statusL}>{online ? "متاح للعمل" : "غير متاح"}</Text>
            <Text style={styles.statusS}>
              {online ? "يصلك الآن طلبات جديدة" : "غيّر حالتك لاستقبال الطلبات"}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={toggleOnline}
            trackColor={{ true: "rgba(255,255,255,0.3)", false: "rgba(255,255,255,0.2)" }}
            thumbColor="#FFF"
          />
        </LinearGradient>

        <View style={styles.statsRow}>
          {[
            { v: String(stats.today), l: "طلبات اليوم", c: "#16C47F", i: "shopping-bag" },
            { v: stats.earnings.toLocaleString("ar-SA"), l: "أرباح اليوم (ر.س)", c: "#2F80ED", i: "dollar-sign" },
            { v: stats.rating.toFixed(1), l: "تقييمي", c: "#F59E0B", i: "star" },
          ].map((s) => (
            <View key={s.l} style={[styles.statC, { backgroundColor: colors.card }]}>
              <View style={[styles.statI, { backgroundColor: s.c + "22" }]}>
                <Feather name={s.i as any} size={16} color={s.c} />
              </View>
              <Text style={[styles.statV, { color: colors.foreground }]}>{s.v}</Text>
              <Text style={[styles.statL, { color: colors.mutedForeground }]}>{s.l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.mapWrap}>
          <AppMap
            style={StyleSheet.absoluteFill}
            region={region}
            markers={markers}
          />
          <View style={[styles.mapBadge, { backgroundColor: "#FFF" }]}>
            <View style={[styles.dot, { backgroundColor: orders.length > 0 ? colors.success : colors.mutedForeground }]} />
            <Text style={[styles.mapBadgeT, { color: colors.foreground }]}>{orders.length} طلبات قريبة</Text>
          </View>
          {myLoc && (
            <View style={styles.userPin} pointerEvents="none">
              <View style={[styles.userPinPulse, { backgroundColor: colors.primary + "33" }]} />
              <View style={[styles.userPinInner, { backgroundColor: colors.primary }]} />
            </View>
          )}
        </View>

        <View style={styles.sectionH}>
          <TouchableOpacity onPress={() => router.push("/(provider)/bookings" as any)}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionT, { color: colors.foreground }]}>طلبات قريبة منك</Text>
        </View>

        {loading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : orders.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyT, { color: colors.foreground }]}>لا توجد طلبات حالياً</Text>
              <Text style={[styles.emptyS, { color: colors.mutedForeground }]}>سيظهر هنا أي طلب جديد فور إنشائه</Text>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {orders.map((o) => (
              <TouchableOpacity
                key={o.id}
                activeOpacity={0.92}
                onPress={() => router.push(`/(provider)/booking-details?id=${o.id}` as any)}
                style={[styles.order, { backgroundColor: colors.card }]}
              >
                <View style={styles.oTop}>
                  {o.d_km != null ? (
                    <View style={[styles.distBadge, { backgroundColor: colors.accentLight }]}>
                      <MaterialCommunityIcons name="map-marker-distance" size={10} color={colors.accent} />
                      <Text style={[styles.distT, { color: colors.accent }]}>{o.d_km < 1 ? `${Math.round(o.d_km * 1000)} م` : `${o.d_km.toFixed(1)} كم`}</Text>
                    </View>
                  ) : (
                    <View style={[styles.distBadge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.distT, { color: colors.mutedForeground }]}>—</Text>
                    </View>
                  )}
                  <Text style={[styles.oTitle, { color: colors.foreground }]}>{o.service_title}</Text>
                </View>

                <View style={{ gap: 6 }}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.oS, { color: colors.foreground }]}>{o.client_name}</Text>
                    <Feather name="user" size={11} color={colors.mutedForeground} />
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.oS, { color: colors.foreground }]}>{fmtTime(o.scheduled_at)}</Text>
                    <Feather name="clock" size={11} color={colors.mutedForeground} />
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.oS, { color: colors.foreground }]} numberOfLines={1}>{o.addr_text}</Text>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                  </View>
                  {o.eta_min != null && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.oS, { color: colors.warning }]}>~ {o.eta_min} دقيقة بالسيارة</Text>
                      <MaterialCommunityIcons name="car-clock" size={11} color={colors.warning} />
                    </View>
                  )}
                </View>

                <View style={styles.oBot}>
                  <TouchableOpacity onPress={() => accept(o.id)} style={[styles.acceptBtn, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={12} color="#FFF" />
                    <Text style={styles.acceptT}>قبول</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => reject(o.id)} style={[styles.rejectBtn, { borderColor: colors.danger }]}>
                    <Text style={[styles.rejectT, { color: colors.danger }]}>رفض</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={[styles.priceV, { color: colors.primary }]}>{o.total} ر.س</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 14, gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 8, left: 9, width: 8, height: 8, borderRadius: 4 },
  greet: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  statusBox: { marginHorizontal: 16, padding: 16, borderRadius: 18, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  statusL: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statusS: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  statC: { flex: 1, padding: 12, borderRadius: 14, alignItems: "center" },
  statI: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statV: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statL: { fontFamily: "Tajawal_500Medium", fontSize: 9, marginTop: 1, textAlign: "center" },
  mapWrap: { marginHorizontal: 16, height: 200, borderRadius: 18, overflow: "hidden", marginBottom: 14, position: "relative" },
  mapBadge: { position: "absolute", top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  mapBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  userPin: { position: "absolute", left: "50%", top: "50%", marginLeft: -12, marginTop: -12, alignItems: "center", justifyContent: "center" },
  userPinPulse: { position: "absolute", width: 36, height: 36, borderRadius: 18 },
  userPinInner: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#FFF" },
  sectionH: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 },
  sectionT: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  seeAll: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  order: { padding: 12, borderRadius: 16, gap: 10 },
  oTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  oTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  distBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  distT: { fontFamily: "Tajawal_700Bold", fontSize: 10 },
  infoRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  oS: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  oBot: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 4 },
  priceV: { fontFamily: "Tajawal_700Bold", fontSize: 15 },
  acceptBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  acceptT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  rejectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  rejectT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  emptyCard: { padding: 32, borderRadius: 16, alignItems: "center", gap: 8 },
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginTop: 8 },
  emptyS: { fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "center" },
});
