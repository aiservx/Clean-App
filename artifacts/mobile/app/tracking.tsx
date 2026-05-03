import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Animated, Alert, Linking, I18nManager,
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

/* ─── In-app Status Toast ─────────────────────────────────────── */
function StatusToast({
  status, color, onDismiss,
}: { status: string; color: string; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-120)).current;
  const STATUS_ICON_MAP: Record<string, string> = {
    accepted: "check-circle-outline", on_the_way: "car", in_progress: "broom",
    completed: "check-all", cancelled: "close-circle-outline", rejected: "alert-circle-outline",
  };
  const STATUS_AR_TOAST: Record<string, string> = {
    pending: "بانتظار التأكيد", accepted: "تم تأكيد طلبك ✓",
    on_the_way: "المزود في الطريق إليك 🚗", in_progress: "جاري تنفيذ الخدمة 🔧",
    completed: "اكتملت الخدمة بنجاح ✨", cancelled: "تم إلغاء الطلب", rejected: "تم رفض الطلب",
  };
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    const t = setTimeout(() => {
      Animated.timing(slide, { toValue: -120, duration: 300, useNativeDriver: true }).start(onDismiss);
    }, 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={[toastStyles.wrap, { top: insets.top + 8, transform: [{ translateY: slide }] }]}>
      <View style={[toastStyles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
        <View style={[toastStyles.iconBox, { backgroundColor: color + "20" }]}>
          <MaterialCommunityIcons name={(STATUS_ICON_MAP[status] || "bell-outline") as any} size={22} color={color} />
        </View>
        <View style={{ flex: 1, marginEnd: 10 }}>
          <Text style={toastStyles.title}>تحديث الطلب</Text>
          <Text style={[toastStyles.body, { color }]}>{STATUS_AR_TOAST[status] ?? status}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Feather name="x" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
const toastStyles = StyleSheet.create({
  wrap: { position: "absolute", start: 16, end: 16, zIndex: 999 },
  card: { backgroundColor: "#FFF", borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 8,
  },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#94A3B8" },
  body: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginTop: 2 },
});

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
  const params = useLocalSearchParams<{ id?: string; bookingId?: string }>();

  const bookingId = params.id || params.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [providerLoc, setProviderLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [myLoc, setMyLoc] = useState<ResolvedAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // In-app status toast
  const [statusToast, setStatusToast] = useState<{ status: string; color: string } | null>(null);

  const isProvider = profile?.role === "provider";

  const loadBooking = async (): Promise<Booking | null> => {
    if (!session?.user) return null;

    // Simple select - no cross-table FK joins that might not exist
    const sel = `
      id, status, total, scheduled_at, created_at, user_id, provider_id, notes, payment_method,
      services:service_id(title_ar, base_price),
      addresses:address_id(street, district, city, lat, lng),
      provider:profiles!bookings_provider_id_fkey(id, full_name, phone, avatar_url),
      client:profiles!bookings_user_id_fkey(full_name, phone, avatar_url)
    `;

    let q = supabase.from("bookings").select(sel);

    if (bookingId) {
      q = q.eq("id", bookingId) as any;
    } else {
      // No specific booking → fetch the latest active one
      q = q.in("status", ["pending", "accepted", "on_the_way", "in_progress"]).order("created_at", { ascending: false }) as any;
    }

    if (isProvider) {
      q = q.eq("provider_id", session.user.id) as any;
    } else {
      q = q.eq("user_id", session.user.id) as any;
    }

    const { data, error } = await (q as any).limit(1).maybeSingle();

    if (error) {
      console.log("[v0] tracking query error:", error.message);
      return null;
    }

    if (!data) return null;

    // Fetch provider location separately (no FK needed, just by id)
    if (data.provider_id) {
      try {
        const { data: pd } = await supabase
          .from("providers")
          .select("current_lat, current_lng, vehicle, plate, rating")
          .eq("id", data.provider_id)
          .maybeSingle();
        if (pd) (data as any).provider_data = pd;
      } catch {}
    }

    return data;
  };

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    (async () => {
      try {
        const data = await loadBooking();
        setBooking(data);
        prevStatusRef.current = data?.status ?? null;
        if (data) {
          try {
            const { data: l } = await supabase
              .from("booking_status_log")
              .select("id, status, created_at, note")
              .eq("booking_id", data.id)
              .order("created_at");
            setLogs((l as any) || []);
          } catch {}
          if (data.provider_data?.current_lat && data.provider_data?.current_lng) {
            setProviderLoc({ lat: data.provider_data.current_lat, lng: data.provider_data.current_lng });
          }
        }
      } catch (e) {
        console.log("[v0] tracking load failed:", (e as Error).message);
        setLoadError("تعذّر تحميل بيانات الطلب");
      } finally {
        try {
          const me = await getCurrentResolved();
          if (me) setMyLoc(me);
        } catch {}
        setLoading(false);
      }
    })();
  }, [session?.user?.id, bookingId, isProvider]);

  useEffect(() => {
    if (!booking?.id) return;
    const topic = `tracking-bk-${booking.id}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(topic)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "providers", filter: `id=eq.${booking.provider_id}` },
        (payload: any) => {
          try {
            const r = payload.new;
            if (r?.current_lat && r?.current_lng) setProviderLoc({ lat: r.current_lat, lng: r.current_lng });
          } catch {}
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${booking.id}` },
        (payload: any) => {
          try {
            const newStatus = payload.new?.status;
            setBooking((b: any) => b ? { ...b, ...payload.new } : b);
            if (newStatus && newStatus !== prevStatusRef.current && !isProvider) {
              prevStatusRef.current = newStatus;
              setStatusToast({ status: newStatus, color: STATUS_COLOR[newStatus] ?? "#16C47F" });
            }
            if (newStatus === "accepted") {
              loadBooking().then((d) => { if (d) setBooking(d); }).catch(() => {});
            }
          } catch {}
        }
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_status_log", filter: `booking_id=eq.${booking.id}` },
        (payload: any) => {
          try { setLogs((prev) => [...prev, payload.new]); } catch {}
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [booking?.id, booking?.provider_id, isProvider]);

  useEffect(() => {
    if (!isProvider || !booking || !session?.user) return;
    if (!["accepted", "on_the_way", "in_progress"].includes(booking.status)) return;
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
  }, [isProvider, booking?.id, booking?.status, session?.user?.id]);

  const dest = useMemo(() => {
    if (booking?.addresses?.lat && booking?.addresses?.lng)
      return { lat: booking.addresses.lat, lng: booking.addresses.lng };
    if (myLoc) return { lat: myLoc.lat, lng: myLoc.lng };
    return null;
  }, [booking, myLoc]);

  // Live distance from provider to customer destination
  const dKm = useMemo(
    () => (providerLoc && dest ? distanceKm(providerLoc, dest) : null),
    [providerLoc, dest],
  );

  // ETA: 25 km/h average urban speed in Saudi Arabia
  const eta = dKm != null ? Math.max(3, Math.round((dKm / 25) * 60)) : null;

  // Format distance for display
  const dStr = useMemo(() => {
    if (dKm == null) return null;
    return dKm < 1 ? `${Math.round(dKm * 1000)} م` : `${dKm.toFixed(1)} كم`;
  }, [dKm]);

  // Map region: fit both provider and destination
  const region = useMemo(() => {
    if (providerLoc && dest) {
      const midLat = (providerLoc.lat + dest.lat) / 2;
      const midLng = (providerLoc.lng + dest.lng) / 2;
      const latDelta = Math.max(0.03, Math.abs(providerLoc.lat - dest.lat) * 1.6);
      const lngDelta = Math.max(0.03, Math.abs(providerLoc.lng - dest.lng) * 1.6);
      return { latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
    }
    const c = providerLoc || dest || myLoc || { lat: 24.7136, lng: 46.6753 };
    return { latitude: (c as any).lat, longitude: (c as any).lng, latitudeDelta: 0.04, longitudeDelta: 0.04 };
  }, [providerLoc, dest, myLoc]);

  // Map markers: animated provider + static customer destination
  const mapMarkers = useMemo(() => {
    const markers: any[] = [];
    if (providerLoc) {
      markers.push({
        id: "provider",
        coordinate: { latitude: providerLoc.lat, longitude: providerLoc.lng },
        color: "#10B981",
        title: "موقع المزود",
        avatarUrl: booking?.provider?.avatar_url ?? null,
        animated: true,
      });
    }
    if (dest) {
      markers.push({
        id: "destination",
        coordinate: { latitude: dest.lat, longitude: dest.lng },
        color: "#3B82F6",
        title: "موقعك",
        animated: false,
      });
    }
    return markers;
  }, [providerLoc, dest, booking?.provider?.avatar_url]);

  // Route polyline between provider and destination
  const polyline = useMemo(() => {
    if (!providerLoc || !dest) return undefined;
    return {
      coordinates: [
        { latitude: providerLoc.lat, longitude: providerLoc.lng },
        { latitude: dest.lat, longitude: dest.lng },
      ],
      color: "#10B981",
      width: 4,
    };
  }, [providerLoc, dest]);

  const callOtherParty = () => {
    try {
      const phone = isProvider ? booking?.client?.phone : booking?.provider?.phone;
      if (!phone) { Alert.alert("لا يوجد رقم هاتف متاح"); return; }
      Linking.openURL(`tel:${phone}`);
    } catch {}
  };

  const openChat = () => {
    if (!booking) return;
    router.push({
      pathname: "/chat-detail",
      params: { bookingId: booking.id, name: isProvider ? (booking.client?.full_name ?? "العميل") : (booking.provider?.full_name ?? "مزود الخدمة") },
    } as any);
  };

  if (!session) {
    return <GuestEmpty title="تتبع الطلب" subtitle="سجّل دخولك لمتابعة طلبك المباشر" icon="map-marker-path" />;
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ fontFamily: "Tajawal_500Medium", color: colors.mutedForeground, marginTop: 12, fontSize: 13 }}>جاري التحميل…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <MaterialCommunityIcons name="wifi-off" size={56} color={colors.mutedForeground} />
        <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.foreground, fontSize: 16, marginTop: 16, textAlign: "center" }}>{loadError}</Text>
        <TouchableOpacity onPress={() => { setLoadError(null); setLoading(true); }} style={{ marginTop: 18, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}>
          <Text style={{ color: "#FFF", fontFamily: "Tajawal_700Bold" }}>إعادة المحاولة</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Tajawal_500Medium" }}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!booking) {
    if (bookingId) {
      // Had a specific ID but didn't find it → show error
      return (
        <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top + 60 }]}>
          <MaterialCommunityIcons name="file-search-outline" size={56} color={colors.mutedForeground} />
          <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.foreground, fontSize: 16, marginTop: 12, textAlign: "center" }}>تعذّر تحميل الطلب</Text>
          <Text style={{ fontFamily: "Tajawal_500Medium", color: colors.mutedForeground, fontSize: 13, marginTop: 6, textAlign: "center" }}>قد يكون الطلب قد انتهى أو تغيرت بياناتك</Text>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/bookings" as any)} style={{ marginTop: 18, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}>
            <Text style={{ color: "#FFF", fontFamily: "Tajawal_700Bold" }}>عرض الحجوزات</Text>
          </TouchableOpacity>
        </View>
      );
    }
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

  const status = (booking.status ?? "pending") as StatusKey;
  const statusColor = STATUS_COLOR[status] ?? colors.primary;
  const isTerminal = status === "completed" || status === "cancelled" || status === "rejected";
  const isPending = status === "pending";
  const stepIndex = STEPS.indexOf(status as any);
  const otherParty = isProvider ? booking.client : booking.provider;
  const otherInitials = (otherParty?.full_name || "؟").trim().split(" ").map((s: string) => s[0]).slice(0, 2).join("");

  // mapMarkers and polyline are computed above via useMemo (animated provider + static dest)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* In-app status toast */}
      {statusToast && (
        <StatusToast
          key={statusToast.status}
          status={statusToast.status}
          color={statusToast.color}
          onDismiss={() => setStatusToast(null)}
        />
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.muted }]} onPress={callOtherParty}>
          <Feather name="phone" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{STATUS_AR[status]}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {isPending && !isProvider
              ? "جاري البحث عن مزود قريب…"
              : eta != null
                ? `وصول خلال ~${eta} دقيقة`
                : isProvider ? "متابعة طلب العميل" : "متابعة الطلب"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconCircle, { backgroundColor: colors.muted }]}
          onPress={() => isProvider
            ? router.replace("/(provider)/dashboard" as any)
            : router.replace("/(tabs)/bookings" as any)
          }
        >
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {!isTerminal && (
        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { backgroundColor: statusColor, width: `${((stepIndex + 1) / STEPS.length) * 100}%` as any }]} />
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {isPending && !isProvider && (
          <View style={[styles.pendingBanner, { backgroundColor: "#FFF8E7", borderColor: "#F59E0B" }]}>
            <ActivityIndicator color="#F59E0B" size="small" />
            <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#92600A", marginEnd: 10 }}>
              يتم الآن البحث عن أقرب مزود خدمة… سيتم إشعارك فور القبول
            </Text>
          </View>
        )}

        {/* ETA cards */}
        <View style={styles.etaRow}>
          <View style={[styles.etaHalf, { backgroundColor: colors.accentLight }]}>
            <MaterialCommunityIcons name="map-marker-distance" size={18} color={colors.accent} />
            <Text style={[styles.etaSmall, { color: colors.accent }]}>المسافة</Text>
            <Text style={[styles.etaLarge, { color: colors.accent }]}>{dStr ?? "—"}</Text>
          </View>
          <View style={[styles.etaHalf, { backgroundColor: colors.successLight }]}>
            <MaterialCommunityIcons name="clock-fast" size={18} color={colors.success} />
            <Text style={[styles.etaSmall, { color: colors.success }]}>الوقت المتوقع</Text>
            <Text style={[styles.etaLarge, { color: colors.success }]}>{eta != null ? `${eta} د` : "—"}</Text>
          </View>
          <View style={[styles.etaHalf, { backgroundColor: statusColor + "20" }]}>
            <MaterialCommunityIcons name={(STATUS_ICON[status] || "circle-outline") as any} size={18} color={statusColor} />
            <Text style={[styles.etaSmall, { color: statusColor }]}>الحالة</Text>
            <Text style={[styles.etaStatus, { color: statusColor }]} numberOfLines={2}>{STATUS_AR[status]}</Text>
          </View>
        </View>

        {/* Map — uses animated provider marker + polyline route */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            <AppMap
              style={StyleSheet.absoluteFill}
              region={region}
              markers={mapMarkers}
              polyline={polyline}
            />
            {isProvider && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const r = await getCurrentResolved();
                    if (r && session) await supabase.from("providers").update({ current_lat: r.lat, current_lng: r.lng }).eq("id", session.user.id);
                  } catch {}
                }}
                style={[styles.gpsBtn, { backgroundColor: colors.card }]}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Other party card */}
        <View style={[styles.partyCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.successLight }]} onPress={callOtherParty}>
            <Feather name="phone" size={18} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.primaryLight, marginStart: 8 }]} onPress={openChat}>
            <Feather name="message-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={[styles.pName, { color: colors.foreground }]}>
              {otherParty?.full_name || (isProvider ? "العميل" : isPending ? "جاري البحث عن مزود…" : "مزود الخدمة")}
            </Text>
            <Text style={[styles.pSub, { color: colors.mutedForeground }]}>
              {isProvider
                ? (otherParty?.phone || "")
                : (booking.provider_data?.vehicle ? `${booking.provider_data.vehicle} • ${booking.provider_data.plate || ""}` : "")}
            </Text>
          </View>
          <View style={[styles.avatarBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary, fontSize: 16 }}>{otherInitials || "؟"}</Text>
          </View>
        </View>

        {/* Unified Vertical Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <Text style={[styles.timelineTitle, { color: colors.foreground, marginBottom: 0 }]}>المخطط الزمني</Text>
            {isTerminal && (
              <View style={[styles.termBadge, { backgroundColor: (statusColor + "20") }]}>
                <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 10, color: statusColor }}>{STATUS_AR[status]}</Text>
              </View>
            )}
          </View>

          {STEPS.map((step, i) => {
            const done = stepIndex >= i;
            const isCurrent = stepIndex === i && !isTerminal;
            const sc = STATUS_COLOR[step] ?? colors.primary;
            const logEntry = logs.find((l) => l.status === step);
            const isLast = i === STEPS.length - 1;
            return (
              <View key={step} style={styles.vtRow}>
                {/* Left: connector line */}
                <View style={{ alignItems: "center", width: 32 }}>
                  {isCurrent ? (
                    <PulseDot color={sc} />
                  ) : (
                    <View style={[
                      styles.vtDot,
                      { backgroundColor: done ? sc : colors.muted, borderColor: done ? sc : colors.border }
                    ]}>
                      {done && <Feather name="check" size={11} color="#FFF" />}
                    </View>
                  )}
                  {!isLast && (
                    <View style={[styles.vtConnector, { backgroundColor: done && stepIndex > i ? sc : colors.border }]} />
                  )}
                </View>
                {/* Right: content */}
                <View style={[styles.vtContent, !isLast && { paddingBottom: 20 }]}>
                  <Text style={[styles.vtLabel, { color: done ? (isCurrent ? sc : colors.foreground) : colors.mutedForeground }]}>
                    {STATUS_AR[step]}
                  </Text>
                  {logEntry ? (
                    <Text style={[styles.vtTime, { color: colors.mutedForeground }]}>
                      {new Date(logEntry.created_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                    </Text>
                  ) : isCurrent ? (
                    <Text style={[styles.vtTime, { color: sc }]}>الآن</Text>
                  ) : !done ? (
                    <Text style={[styles.vtTime, { color: colors.border }]}>قيد الانتظار</Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {/* Cancelled / rejected state */}
          {(status === "cancelled" || status === "rejected") && (
            <View style={styles.vtRow}>
              <View style={{ alignItems: "center", width: 32 }}>
                <View style={[styles.vtDot, { backgroundColor: STATUS_COLOR[status], borderColor: STATUS_COLOR[status] }]}>
                  <MaterialCommunityIcons name={status === "cancelled" ? "close" : "alert" as any} size={11} color="#FFF" />
                </View>
              </View>
              <View style={styles.vtContent}>
                <Text style={[styles.vtLabel, { color: STATUS_COLOR[status] }]}>{STATUS_AR[status]}</Text>
                {logs.find((l) => l.status === status) && (
                  <Text style={[styles.vtTime, { color: colors.mutedForeground }]}>
                    {new Date(logs.find((l) => l.status === status)!.created_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Rating button for completed bookings — triggers the global RatingBottomSheet */}
        {!isProvider && status === "completed" && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/rating", params: { bookingId: booking.id } } as any)}
            style={[styles.actionBtn, { backgroundColor: "#F59E0B", marginHorizontal: 16, marginTop: 4, marginBottom: 12 }]}
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
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.06)",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15 },
  headerSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 11, marginTop: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  progressBar: { height: 4 },
  progressFill: { height: 4, borderRadius: 2 },
  pendingBanner: { flexDirection: "row", alignItems: "center", margin: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  etaRow: { flexDirection: "row", paddingHorizontal: 12, gap: 8, marginTop: 12, marginBottom: 12 },
  etaHalf: { flex: 1, padding: 12, borderRadius: 16, alignItems: "center", gap: 3 },
  etaSmall: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  etaLarge: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  etaStatus: { fontFamily: "Tajawal_700Bold", fontSize: 10, textAlign: "center" },
  mapSection: { paddingHorizontal: 14, marginBottom: 12 },
  mapContainer: { height: 220, borderRadius: 20, overflow: "hidden" },
  gpsBtn: { position: "absolute", bottom: 12, start: 12, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  partyCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, padding: 14, borderRadius: 18, marginBottom: 12, gap: 8 },
  avatarBox: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  pName: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  pSub: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  timelineCard: { marginHorizontal: 14, padding: 16, borderRadius: 18, marginBottom: 12 },
  timelineTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 16 },
  termBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  vtRow: { flexDirection: "row", gap: 12 },
  vtDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  vtConnector: { width: 2, flex: 1, minHeight: 16, marginTop: 2, borderRadius: 1 },
  vtContent: { flex: 1, paddingTop: 2 },
  vtLabel: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  vtTime: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  actionBtn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  actionT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
