import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform , I18nManager} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { distanceKm, getCurrentResolved, type ResolvedAddress } from "@/lib/location";
import { sendPushNotification, createNotification } from "@/lib/notifications";

const STATUS_FLOW: Record<string, { next: string; label: string; icon: string } | null> = {
  pending: { next: "accepted", label: "قبول الطلب", icon: "check-circle" },
  accepted: { next: "on_the_way", label: "بدء التوجه للموقع", icon: "navigation" },
  on_the_way: { next: "in_progress", label: "بدء العمل", icon: "play-circle" },
  in_progress: { next: "completed", label: "إنهاء الطلب", icon: "check-square" },
  completed: null,
  cancelled: null,
  rejected: null,
};

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار القبول",
  accepted: "مقبول",
  on_the_way: "في الطريق",
  in_progress: "جاري التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

const NOTIF_MESSAGES: Record<string, { title: string; body: string }> = {
  accepted: { title: "✅ تم قبول طلبك!", body: "المزود تأكد على طلبك وسيتوجه إليك قريباً" },
  on_the_way: { title: "🚗 المزود في الطريق إليك", body: "استعد! مزود الخدمة متجه نحوك الآن" },
  in_progress: { title: "🧹 بدأت الخدمة", body: "مزود الخدمة وصل وبدأ العمل لديك" },
  completed: { title: "✨ اكتملت الخدمة!", body: "تم إنجاز الخدمة بنجاح. نتمنى أن تكون راضياً!" },
  cancelled: { title: "❌ تم إلغاء طلبك", body: "قام المزود بإلغاء هذا الطلب. يمكنك طلب مزود آخر" },
};

const STATUS_COLOR = (s: string, c: any) =>
  s === "completed" ? c.success : s === "in_progress" ? "#8B5CF6" : s === "on_the_way" ? "#F59E0B" : s === "accepted" ? c.primary : s === "pending" ? "#2F80ED" : c.danger;

export default function ProviderBookingDetails() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [myLoc, setMyLoc] = useState<ResolvedAddress | null>(null);

  const load = useCallback(async () => {
    if (!params.id) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        services(title_ar, base_price, duration_min),
        addresses(*),
        profiles!bookings_user_id_fkey(full_name, phone, avatar_url)
      `)
      .eq("id", params.id)
      .maybeSingle();
    setBooking(data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
    (async () => {
      const r = await getCurrentResolved();
      if (r) setMyLoc(r);
    })();
  }, [load]);

  useEffect(() => {
    if (!params.id) return;
    const topic = `booking-${params.id}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(topic)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `id=eq.${params.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [params.id, load]);

  useEffect(() => {
    if (!session?.user || !booking) return;
    const activeStatuses = ["accepted", "on_the_way", "in_progress"];
    if (!activeStatuses.includes(booking.status)) return;
    let cancelled = false;
    const uid = session.user.id;
    const tick = async () => {
      try {
        const r = await getCurrentResolved();
        if (cancelled || !r) return;
        await supabase.from("providers").update({ current_lat: r.lat, current_lng: r.lng }).eq("id", uid);
        setMyLoc(r);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [session?.user?.id, booking?.id, booking?.status]);

  const advance = async () => {
    if (!booking || !session?.user) return;
    const flow = STATUS_FLOW[booking.status];
    if (!flow) return;
    setBusy(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const update: any = { status: flow.next };
    if (booking.status === "pending") update.provider_id = session.user.id;

    const { error } = await supabase.from("bookings").update(update).eq("id", booking.id);
    if (error) { setBusy(false); return Alert.alert("خطأ", error.message); }

    await supabase.from("booking_status_log").insert({ booking_id: booking.id, status: flow.next, note: flow.label });

    if (flow.next === "accepted") {
      await supabase.from("providers").update({ available: false }).eq("id", session.user.id);
    }
    if (flow.next === "completed") {
      await supabase.from("providers").update({ available: true }).eq("id", session.user.id);
    }

    const notif = NOTIF_MESSAGES[flow.next];
    if (notif && booking.user_id) {
      const notifType = flow.next === "accepted" ? "booking_accepted"
        : flow.next === "on_the_way" ? "booking_on_way"
        : flow.next === "in_progress" ? "booking_started"
        : flow.next === "completed" ? "booking_completed"
        : "booking_accepted";
      sendPushNotification(booking.user_id, notif.title, notif.body, { bookingId: booking.id }, "booking_update");
      createNotification(booking.user_id, notifType, notif.title, notif.body, { bookingId: booking.id });
    }

    setBusy(false);
    if (flow.next === "completed") {
      Alert.alert("✓ تم الإنهاء", "تم إنهاء الطلب بنجاح");
    }
    load();
  };

  const cancel = async () => {
    if (!booking || !session?.user) return;
    Alert.alert(
      "إلغاء الطلب",
      "هل أنت متأكد من إلغاء هذا الطلب؟",
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "إلغاء الطلب",
          style: "destructive",
          onPress: async () => {
            await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
            await supabase.from("booking_status_log").insert({ booking_id: booking.id, status: "cancelled", note: "ألغي بواسطة المزود" });
            await supabase.from("providers").update({ available: true }).eq("id", session.user.id);
            const notif = NOTIF_MESSAGES["cancelled"];
            if (notif && booking.user_id) {
              sendPushNotification(booking.user_id, notif.title, notif.body, { bookingId: booking.id });
              createNotification(booking.user_id, "booking_cancelled", notif.title, notif.body, { bookingId: booking.id });
            }
            router.back();
          },
        },
      ]
    );
  };

  const callClient = () => {
    const ph = booking?.profiles?.phone;
    if (!ph) return Alert.alert("لا يوجد رقم هاتف");
    Linking.openURL(`tel:${ph}`);
  };

  const openChat = () => {
    if (!booking) return;
    const clientName = booking.profiles?.full_name ?? "العميل";
    router.push({
      pathname: "/chat-detail",
      params: { bookingId: booking.id, name: clientName },
    } as any);
  };

  const navigateOnMaps = () => {
    const lat = booking?.addresses?.lat;
    const lng = booking?.addresses?.lng;
    if (!lat || !lng) return Alert.alert("لا يوجد إحداثيات للموقع");
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    Linking.openURL(url!);
  };

  const distance = useMemo(() => {
    if (!booking?.addresses?.lat || !booking?.addresses?.lng || !myLoc) return null;
    return distanceKm({ lat: myLoc.lat, lng: myLoc.lng }, { lat: booking.addresses.lat, lng: booking.addresses.lng });
  }, [booking, myLoc]);

  const eta = distance != null ? Math.max(5, Math.round((distance / 30) * 60)) : null;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 20 }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={colors.mutedForeground} />
        <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.foreground, marginTop: 16 }}>الطلب غير موجود</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 100 }}>
          <Text style={{ color: "#FFF", fontFamily: "Tajawal_700Bold" }}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const flow = STATUS_FLOW[booking.status];
  const stColor = STATUS_COLOR(booking.status, colors);
  const addr = booking.addresses;
  const region = addr?.lat && addr?.lng
    ? { latitude: addr.lat, longitude: addr.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 }
    : { latitude: myLoc?.lat ?? 24.7136, longitude: myLoc?.lng ?? 46.6753, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const markers: any[] = [];
  if (addr?.lat && addr?.lng) markers.push({ id: "client", coordinate: { latitude: addr.lat, longitude: addr.lng }, color: colors.danger });
  if (myLoc) markers.push({ id: "me", coordinate: { latitude: myLoc.lat, longitude: myLoc.lng }, color: colors.primary });

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.hT, { color: colors.foreground }]}>تفاصيل الطلب</Text>
          <Text style={[styles.hS, { color: colors.mutedForeground }]}>#{String(booking.id).slice(0, 8)}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[stColor, stColor + "DD"]} style={styles.statusHero}>
          <View style={styles.statusHeroIcon}>
            <MaterialCommunityIcons
              name={booking.status === "completed" ? "check-decagram" : booking.status === "in_progress" ? "broom" : booking.status === "on_the_way" ? "car" : "clipboard-list"}
              size={44}
              color="#FFF"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusHeroLabel}>الحالة الحالية</Text>
            <Text style={styles.statusHeroTitle}>{STATUS_AR[booking.status]}</Text>
            <Text style={styles.statusHeroSub}>{booking.services?.title_ar}</Text>
          </View>
        </LinearGradient>

        {addr?.lat && addr?.lng && (
          <View style={[styles.mapBox, { backgroundColor: colors.card }]}>
            <AppMap style={StyleSheet.absoluteFill} region={region} markers={markers} />
            <View style={styles.mapOverlay} pointerEvents="none">
              <View style={[styles.distChip, { backgroundColor: "#FFF" }]}>
                <MaterialCommunityIcons name="map-marker-distance" size={14} color={colors.primary} />
                <Text style={[styles.distChipT, { color: colors.foreground }]}>
                  {distance != null ? (distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`) : "—"}
                </Text>
                {eta != null && (
                  <>
                    <View style={{ width: 1, height: 12, backgroundColor: colors.border, marginHorizontal: 4 }} />
                    <MaterialCommunityIcons name="car-clock" size={14} color={colors.warning} />
                    <Text style={[styles.distChipT, { color: colors.foreground }]}>{eta} د</Text>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={navigateOnMaps} style={[styles.navBtn, { backgroundColor: colors.primary }]}>
              <Feather name="navigation" size={14} color="#FFF" />
              <Text style={styles.navBtnT}>افتح في الخرائط</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>بيانات العميل</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={callClient} style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
              <Feather name="phone" size={16} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openChat} style={[styles.iconCircle, { backgroundColor: colors.primaryLight, marginEnd: 6 }]}>
              <Feather name="message-circle" size={16} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{booking.profiles?.full_name || "عميل"}</Text>
              {booking.profiles?.phone && (
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{booking.profiles.phone}</Text>
              )}
            </View>
            <View style={styles.rowAvatar}>
              <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary, fontSize: 18 }}>
                {(booking.profiles?.full_name || "ع").charAt(0)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تفاصيل الخدمة</Text>
          {[
            { l: "الخدمة", v: booking.services?.title_ar || "—" },
            { l: "الموعد", v: booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString("ar-SA") : "غير محدد" },
            { l: "المدة المتوقعة", v: `${booking.services?.duration_min || 120} دقيقة` },
            { l: "العنوان", v: [addr?.street, addr?.district, addr?.city].filter(Boolean).join("، ") || "—" },
            { l: "ملاحظات العميل", v: booking.notes || "لا توجد" },
            { l: "طريقة الدفع", v: booking.payment_method === "cash" ? "نقدي عند الوصول" : booking.payment_method === "card" ? "بطاقة" : booking.payment_method || "نقدي" },
          ].map((d) => (
            <View key={d.l} style={styles.dRow}>
              <Text style={[styles.dL, { color: colors.mutedForeground }]}>{d.l}</Text>
              <Text style={[styles.dV, { color: colors.foreground }]}>{d.v}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الأرباح</Text>
          <View style={styles.dRow}>
            <Text style={[styles.dL, { color: colors.mutedForeground }]}>قيمة الطلب</Text>
            <Text style={[styles.dV, { color: colors.primary, fontSize: 18 }]}>{Number(booking.total).toFixed(2)} ر.س</Text>
          </View>
          <View style={styles.dRow}>
            <Text style={[styles.dL, { color: colors.mutedForeground }]}>صافي حصتك (85%)</Text>
            <Text style={[styles.dV, { color: colors.success }]}>{(Number(booking.total) * 0.85).toFixed(2)} ر.س</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
        {flow ? (
          <>
            <TouchableOpacity onPress={advance} disabled={busy} style={[styles.cta, { backgroundColor: colors.primary }]}>
              <Feather name={flow.icon as any} size={16} color="#FFF" />
              <Text style={styles.ctaT}>{busy ? "جاري..." : flow.label}</Text>
            </TouchableOpacity>
            {booking.status === "pending" ? (
              <TouchableOpacity onPress={cancel} style={[styles.ctaSec, { borderColor: colors.danger }]}>
                <Text style={[styles.ctaSecT, { color: colors.danger }]}>رفض</Text>
              </TouchableOpacity>
            ) : booking.status !== "completed" ? (
              <TouchableOpacity onPress={cancel} style={[styles.ctaSec, { borderColor: colors.danger }]}>
                <Feather name="x" size={14} color={colors.danger} />
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <View style={[styles.completedBox, { backgroundColor: colors.successLight }]}>
            <MaterialCommunityIcons name="check-decagram" size={20} color={colors.success} />
            <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.success, fontSize: 13 }}>
              {booking.status === "completed" ? "تم إنهاء هذا الطلب" : booking.status === "cancelled" ? "تم إلغاء هذا الطلب" : "تم رفض هذا الطلب"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 14, gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hT: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  hS: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  statusHero: { padding: 18, borderRadius: 22, flexDirection: "row", alignItems: "center", marginBottom: 14, minHeight: 110 },
  statusHeroLabel: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 11 },
  statusHeroTitle: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 22, marginTop: 4 },
  statusHeroSub: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 12, marginTop: 4 },
  statusHeroIcon: { width: 70, height: 70, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 18, marginStart: 12 },
  mapBox: { height: 220, borderRadius: 18, overflow: "hidden", marginBottom: 14, position: "relative" },
  mapOverlay: { position: "absolute", top: 12, end: 12, start: 12 },
  distChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, alignSelf: "flex-end", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  distChipT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  navBtn: { position: "absolute", bottom: 12, end: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 100 },
  navBtnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 12 },
  section: { padding: 14, borderRadius: 16, marginBottom: 14 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center" },
  rowAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#16C47F22", alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  rowSub: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  dRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 6, gap: 12 },
  dL: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  dV: { fontFamily: "Tajawal_700Bold", fontSize: 12, flex: 1 },
  bottom: { position: "absolute", bottom: 0, start: 0, end: 0, paddingHorizontal: 16, paddingTop: 12, flexDirection: "row", gap: 10 },
  cta: { flex: 1, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  ctaT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
  ctaSec: { paddingHorizontal: 18, height: 50, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  ctaSecT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  completedBox: { flex: 1, height: 50, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
