import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Platform, RefreshControl, Alert, ActivityIndicator, I18nManager, AppState, Modal } from "react-native";
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
import { useRealtimeEvents } from "@/lib/realtimeStore";
import { createNotification } from "@/lib/notifications";

type NearbyOrder = {
  id: string;
  user_id: string | null;
  status: string;
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
  const lastToggleRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<NearbyOrder[]>([]);
  const [stats, setStats] = useState({ today: 0, earnings: 0, rating: 0 });
  const [myLoc, setMyLoc] = useState<ResolvedAddress | null>(null);
  const [mapAnimTrigger, setMapAnimTrigger] = useState(0);
  const [newOrderAlert, setNewOrderAlert] = useState<NearbyOrder | null>(null);
  const [countdown, setCountdown] = useState(300);

  // Ref to read online state inside AppState callback without stale closure
  const onlineRef = useRef(false);
  useEffect(() => { onlineRef.current = online; }, [online]);

  // Stable refs for values used inside Realtime callbacks — prevents channel
  // teardown/rebuild every time myLoc updates (location heartbeat fires every 5s).
  const myLocRef = useRef<ResolvedAddress | null>(null);
  useEffect(() => { myLocRef.current = myLoc; }, [myLoc]);

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
          .select("id, user_id, status, total, scheduled_at, notes, services(title_ar), profiles!bookings_user_id_fkey(full_name, phone), addresses(lat, lng, street, district, city)")
          .or(`and(provider_id.is.null,status.eq.pending),and(provider_id.eq.${uid},status.in.(pending,accepted,on_the_way,in_progress))`)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("bookings")
          .select("total, status, created_at")
          .eq("provider_id", uid)
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("reviews").select("rating").eq("provider_id", uid),
      ]);

      // Only sync DB availability to local state if the user hasn't explicitly toggled
      // within the last 6 seconds (prevents race condition overwriting user intent)
      if (prov?.available !== undefined && Date.now() - lastToggleRef.current > 6000) {
        setOnline(!!prov.available);
      }
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
          user_id: b.user_id ?? null,
          status: b.status || "pending",
          service_title: b.services?.title_ar || "خدمة",
          client_name: b.profiles?.full_name || "عميل",
          client_phone: b.profiles?.phone || null,
          scheduled_at: b.scheduled_at,
          total: Number(b.total || 0),
          notes: b.notes,
          addr_lat: lat,
          addr_lng: lng,
          addr_text: [addr?.street, addr?.district, addr?.city].filter(Boolean).join("، ") || "—",
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
  }, [loadAll]);

  const refreshOrders = useCallback(async () => {
    if (!session?.user) return;
    const uid = session.user.id;
    try {
      const { data: pendingRows } = await supabase
        .from("bookings")
        .select("id, status, total, scheduled_at, notes, services(title_ar), profiles!bookings_user_id_fkey(full_name, phone), addresses(lat, lng, street, district, city)")
        .or(`and(provider_id.is.null,status.eq.pending),and(provider_id.eq.${uid},status.in.(pending,accepted,on_the_way,in_progress))`)
        .order("created_at", { ascending: false })
        .limit(30);
      const ref = myLoc ? { lat: myLoc.lat, lng: myLoc.lng } : null;
      const mapped: NearbyOrder[] = (pendingRows ?? []).map((b: any) => {
        const addr = b.addresses;
        const lat = addr?.lat ?? null;
        const lng = addr?.lng ?? null;
        const d = ref && lat && lng ? distanceKm(ref, { lat, lng }) : null;
        return {
          id: b.id,
          user_id: b.user_id ?? null,
          status: b.status || "pending",
          service_title: b.services?.title_ar || "خدمة",
          client_name: b.profiles?.full_name || "عميل",
          client_phone: b.profiles?.phone || null,
          scheduled_at: b.scheduled_at,
          total: Number(b.total || 0),
          notes: b.notes,
          addr_lat: lat,
          addr_lng: lng,
          addr_text: [addr?.street, addr?.district, addr?.city].filter(Boolean).join("، ") || "—",
          d_km: d,
          eta_min: d != null ? Math.max(5, Math.round((d / 30) * 60)) : null,
        };
      });
      setOrders(mapped);
    } catch {}
  }, [session, myLoc]);

  // Stable ref so the modal channel callback can call refreshOrders without
  // being listed in the channel effect's dependency array (which would
  // cause the channel to tear-down and re-subscribe on every render).
  const refreshOrdersRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => { refreshOrdersRef.current = refreshOrders; }, [refreshOrders]);

  // ── Live refresh via global event dispatcher ───────────────────────────
  useRealtimeEvents(
    (event) => {
      if (event.type === "provider_order_updated" || event.type === "new_booking") {
        console.log("[provider-dashboard] realtime event:", event.type, (event as any).bookingId);
        refreshOrders();
      }
    },
    [refreshOrders],
  );

  // ── In-app new booking notification modal ─────────────────────────────
  // Listens for new pending bookings via Supabase Realtime and shows a modal
  // alert so the provider can view/accept instantly without tapping a push notification.
  useEffect(() => {
    if (!session?.user || !online) return;
    const topic = `provider-new-booking-modal-${session.user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(topic)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bookings",
        filter: "status=eq.pending",
      }, async (payload: any) => {
        const bk = payload.new;
        if (!bk || !onlineRef.current) return;
        try {
          const { data } = await supabase
            .from("bookings")
            .select("id, total, scheduled_at, notes, services(title_ar), profiles!bookings_user_id_fkey(full_name, phone), addresses(lat, lng, street, district, city)")
            .eq("id", bk.id)
            .maybeSingle();
          if (data) {
            const addr = (data as any).addresses;
            const loc = myLocRef.current ? { lat: myLocRef.current.lat, lng: myLocRef.current.lng } : null;
            const lat = addr?.lat ?? null;
            const lng = addr?.lng ?? null;
            const d = loc && lat && lng ? distanceKm(loc, { lat, lng }) : null;
            const mapped: NearbyOrder = {
              id: (data as any).id,
              user_id: bk.user_id ?? null,
              status: "pending",
              service_title: (data as any).services?.title_ar || "خدمة",
              client_name: (data as any).profiles?.full_name || "عميل",
              client_phone: (data as any).profiles?.phone || null,
              scheduled_at: (data as any).scheduled_at,
              total: Number((data as any).total || 0),
              notes: (data as any).notes,
              addr_lat: lat,
              addr_lng: lng,
              addr_text: [addr?.street, addr?.district, addr?.city].filter(Boolean).join("، ") || "—",
              d_km: d,
              eta_min: d != null ? Math.max(5, Math.round((d / 30) * 60)) : null,
            };
            setNewOrderAlert(mapped);
          }
        } catch {}
        refreshOrdersRef.current();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.user?.id, online]);

  // Layer 1: AppState listener — marks provider offline after 2-minute grace period when backgrounded.
  // The grace period prevents accidental offline when briefly switching to notifications or other apps.
  // Force-kill / battery death are handled by Layer 3 (server TTL sweep in providerSweep.ts).
  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    let bgTimer: ReturnType<typeof setTimeout> | null = null;

    const sub = AppState.addEventListener("change", async (nextState) => {
      if ((nextState === "background" || nextState === "inactive") && onlineRef.current) {
        // Grace period: only mark offline after 2 minutes of being in background
        bgTimer = setTimeout(async () => {
          if (onlineRef.current) {
            try {
              await supabase.from("providers").update({
                available: false,
                current_lat: null,
                current_lng: null,
              }).eq("id", uid);
              setOnline(false);
              onlineRef.current = false;
            } catch {}
          }
        }, 2 * 60 * 1000);
      } else if (nextState === "active") {
        // App returned to foreground — cancel the offline timer
        if (bgTimer) {
          clearTimeout(bgTimer);
          bgTimer = null;
        }
      }
    });
    return () => {
      sub.remove();
      if (bgTimer) clearTimeout(bgTimer);
    };
  }, [session]);

  // T020 — Live location broadcast (heartbeat) every 5s while provider is online.
  // Also writes location_updated_at so the server TTL sweep (Layer 3) can detect stale entries.
  useEffect(() => {
    if (!online || !session?.user) return;
    let cancelled = false;
    const uid = session.user.id;
    const tick = async () => {
      try {
        const r = await getCurrentResolved();
        if (cancelled || !r) return;
        await supabase.from("providers").update({
          current_lat: r.lat,
          current_lng: r.lng,
          location_updated_at: new Date().toISOString(),
        }).eq("id", uid);
        setMyLoc(r);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [online, session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const toggleOnline = async (v: boolean) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    lastToggleRef.current = Date.now();
    setOnline(v);
    if (!session?.user) return;
    if (v) {
      const loc = await getCurrentResolved();
      await supabase.from("providers").update({
        available: true,
        current_lat: loc?.lat ?? null,
        current_lng: loc?.lng ?? null,
      }).eq("id", session.user.id);
    } else {
      await supabase.from("providers").update({
        available: false,
        current_lat: null,
        current_lng: null,
      }).eq("id", session.user.id);
    }
  };

  const accept = async (id: string) => {
    if (!session?.user) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Capture order data before optimistic removal (needed for notification)
    const order = orders.find((o) => o.id === id);
    // Optimistically remove from list immediately
    setOrders((prev) => prev.filter((o) => o.id !== id));
    const { error } = await supabase
      .from("bookings")
      .update({ provider_id: session.user.id, status: "accepted" })
      .eq("id", id)
      .in("status", ["pending"]);
    if (error) {
      Alert.alert("خطأ", error.message);
      loadAll(); // restore on error
      return;
    }
    await Promise.all([
      supabase.from("booking_status_log").insert({ booking_id: id, status: "accepted", note: "قبل المزود الطلب" }),
      supabase.from("providers").update({ available: false }).eq("id", session.user.id),
    ]);
    setOnline(false);
    // Notify the client that their booking was accepted
    if (order?.user_id) {
      createNotification(
        order.user_id,
        "booking_accepted",
        "✅ تم قبول طلبك!",
        `المزود قبل طلب ${order.service_title} وسيتوجه إليك قريباً`,
        { bookingId: id },
      );
    }
    Alert.alert("✓ تم القبول", "تم تخصيص الطلب لك");
  };

  const reject = async (id: string) => {
    if (!session?.user) return;
    const order = orders.find((o) => o.id === id);
    Alert.alert("رفض الطلب", "هل أنت متأكد من رفض هذا الطلب؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "رفض",
        style: "destructive",
        onPress: async () => {
          // Update booking status AND set provider_id so push auth check passes
          await supabase.from("bookings")
            .update({ status: "rejected", provider_id: session.user.id })
            .eq("id", id)
            .eq("status", "pending");
          await supabase.from("booking_status_log").insert({ booking_id: id, status: "rejected", note: `رفض المزود الطلب` });
          setOrders((prev) => prev.filter((o) => o.id !== id));
          // Notify the user about rejection
          if (order?.user_id) {
            createNotification(order.user_id, "booking_cancelled", "❌ رُفض طلبك", "رفض المزود طلبك. سنبحث عن مزود آخر متاح.", { bookingId: id });
          }
        },
      },
    ]);
  };

  // ── Auto-reject when 5-min countdown expires ──────────────────────────────
  const handleAutoReject = useCallback(async (bookingId: string, userId: string | null, providerId: string | null) => {
    try {
      // Set provider_id so the shared-booking auth check passes when notifying the user
      await supabase.from("bookings")
        .update({ status: "rejected", ...(providerId ? { provider_id: providerId } : {}) })
        .eq("id", bookingId)
        .eq("status", "pending");
      await supabase.from("booking_status_log").insert({ booking_id: bookingId, status: "rejected", note: "انتهت مهلة الرد التلقائي (5 دقائق)" });
      if (userId) {
        createNotification(userId, "booking_cancelled", "⏱ انتهت مهلة الرد", "لم يرد المزود في الوقت المحدد. سنبحث عن مزود آخر متاح.", { bookingId });
      }
    } catch {}
    setNewOrderAlert(null);
    setCountdown(300);
    setOrders((prev) => prev.filter((o) => o.id !== bookingId));
  }, []);

  // ── 5-minute countdown timer ───────────────────────────────────────────────
  useEffect(() => {
    if (!newOrderAlert) { setCountdown(300); return; }
    const alertId   = newOrderAlert.id;
    const alertUid  = newOrderAlert.user_id;
    const alertProv = session?.user?.id ?? null;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoReject(alertId, alertUid, alertProv);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [newOrderAlert?.id, handleAutoReject, session?.user?.id]);

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
      {/* ── New booking in-app alert modal ─────────────────────────────────── */}
      <Modal visible={!!newOrderAlert} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom + 16, 36) }]}>
            {/* Bell icon */}
            <View style={[styles.modalBellWrap, { backgroundColor: colors.primaryLight }]}>
              <MaterialCommunityIcons name="bell-ring" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>طلب جديد وصلك!</Text>
            {newOrderAlert && (
              <>
                <View style={[styles.modalInfoBox, { backgroundColor: colors.background }]}>
                  <View style={styles.modalRow}>
                    <Feather name="tool" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.modalInfoV, { color: colors.foreground }]}>{newOrderAlert.service_title}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Feather name="user" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.modalInfoV, { color: colors.foreground }]}>{newOrderAlert.client_name}</Text>
                  </View>
                  {newOrderAlert.addr_text !== "—" && (
                    <View style={styles.modalRow}>
                      <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.modalInfoV, { color: colors.foreground }]} numberOfLines={1}>{newOrderAlert.addr_text}</Text>
                    </View>
                  )}
                  {newOrderAlert.eta_min != null && (
                    <View style={styles.modalRow}>
                      <MaterialCommunityIcons name="car-clock" size={13} color={colors.warning} />
                      <Text style={[styles.modalInfoV, { color: colors.warning }]}>~ {newOrderAlert.eta_min} دقيقة</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.modalPrice, { color: colors.primary }]}>{newOrderAlert.total} ر.س</Text>
              </>
            )}

            {/* ── 5-minute countdown ───────────────────────────────────── */}
            <View style={[styles.countdownBox, { backgroundColor: countdown <= 60 ? "#FEF3C7" : colors.muted }]}>
              <MaterialCommunityIcons
                name="timer-outline"
                size={20}
                color={countdown <= 60 ? "#B45309" : colors.mutedForeground}
              />
              <Text style={[styles.countdownT, { color: countdown <= 60 ? "#B45309" : colors.mutedForeground }]}>
                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
              </Text>
              <Text style={[styles.countdownSub, { color: countdown <= 60 ? "#B45309" : colors.mutedForeground }]} numberOfLines={1}>
                {countdown <= 60 ? "⚠️ رفض تلقائي قريباً!" : "متبقية — رفض تلقائي عند الانتهاء"}
              </Text>
            </View>

            <View style={styles.modalBtns}>
              {/* Reject button */}
              <TouchableOpacity
                onPress={async () => {
                  const id  = newOrderAlert?.id;
                  const uid = newOrderAlert?.user_id ?? null;
                  setNewOrderAlert(null);
                  setCountdown(300);
                  const pid = session?.user?.id ?? null;
                  if (id) {
                    // Set provider_id so push auth check passes when notifying user
                    await supabase.from("bookings")
                      .update({ status: "rejected", ...(pid ? { provider_id: pid } : {}) })
                      .eq("id", id)
                      .eq("status", "pending");
                    await supabase.from("booking_status_log").insert({ booking_id: id, status: "rejected", note: "رفض المزود الطلب" });
                    if (uid) createNotification(uid, "booking_cancelled", "❌ رُفض طلبك", "رفض المزود طلبك. سنبحث عن مزود آخر متاح.", { bookingId: id });
                    setOrders((prev) => prev.filter((o) => o.id !== id));
                  }
                }}
                style={[styles.modalDismissBtn, { borderColor: "#EF4444" }]}
              >
                <Text style={[styles.modalDismissT, { color: "#EF4444" }]}>رفض ❌</Text>
              </TouchableOpacity>
              {/* Accept button */}
              <TouchableOpacity
                onPress={async () => {
                  const id = newOrderAlert?.id;
                  setNewOrderAlert(null);
                  setCountdown(300);
                  if (id) await accept(id);
                }}
                style={[styles.modalViewBtn, { backgroundColor: "#16C47F" }]}
              >
                <Feather name="check-circle" size={16} color="#FFF" />
                <Text style={styles.modalViewT}>قبول الطلب ✅</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Image source={profile?.avatar_url ? { uri: profile.avatar_url } : require("@/assets/images/default-avatar.png")} style={styles.avatar} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.greet, { color: colors.mutedForeground }]}>أهلاً 👋</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{firstName}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/provider-notifications")}>
          <View style={[styles.icon, { backgroundColor: colors.card }]}>
            <Feather name="bell" size={18} color={colors.foreground} />
            {orders.length > 0 && <View style={[styles.notifDot, { backgroundColor: colors.danger }]} />}
          </View>
        </TouchableOpacity>
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
            animateTrigger={mapAnimTrigger}
          />
          <View style={[styles.mapBadge, { backgroundColor: "#FFF" }]}>
            <View style={[styles.dot, { backgroundColor: orders.length > 0 ? colors.success : colors.mutedForeground }]} />
            <Text style={[styles.mapBadgeT, { color: colors.foreground }]}>{orders.length} طلبات قريبة</Text>
          </View>

          {/* Manual GPS refresh button */}
          <TouchableOpacity
            onPress={async () => {
              if (!session?.user) return;
              const loc = await getCurrentResolved();
              if (loc) {
                setMyLoc(loc);
                setMapAnimTrigger((t) => t + 1);
                await supabase.from("providers").update({ current_lat: loc.lat, current_lng: loc.lng }).eq("id", session.user.id);
              } else {
                Alert.alert("خطأ", "تعذر الحصول على الموقع — تأكد من تفعيل GPS");
              }
            }}
            style={styles.gpsRefreshBtn}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {/* Location info under map */}
        {myLoc && (
          <View style={[styles.locInfo, { backgroundColor: colors.card }]}>
            <Feather name="map-pin" size={14} color={colors.primary} />
            <Text style={[styles.locText, { color: colors.foreground }]} numberOfLines={1}>{myLoc.formatted}</Text>
          </View>
        )}

        <View style={styles.sectionH}>
          <Text style={[styles.sectionT, { color: colors.foreground }]}>طلبات قريبة منك</Text>
          <TouchableOpacity onPress={() => router.push("/(provider)/bookings" as any)}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
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
            {orders.map((o) => {
              const statusLabels: Record<string, string> = { pending: "بانتظار القبول", accepted: "تم القبول", on_the_way: "في الطريق", arrived: "وصل للموقع", started: "بدأ العمل", in_progress: "جاري التنفيذ" };
              const statusColors: Record<string, string> = { pending: colors.warning, accepted: colors.primary, on_the_way: "#2F80ED", arrived: "#F59E0B", started: "#8B5CF6", in_progress: "#8B5CF6" };
              const isPending = o.status === "pending";
              return (
              <TouchableOpacity
                key={o.id}
                activeOpacity={0.92}
                onPress={() => router.push(`/(provider)/booking-details?id=${o.id}` as any)}
                style={[styles.order, { backgroundColor: colors.card }]}
              >
                <View style={styles.oTop}>
                  <Text style={[styles.oTitle, { color: colors.foreground }]}>{o.service_title}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {!isPending && (
                      <View style={[styles.distBadge, { backgroundColor: (statusColors[o.status] || colors.primary) + "18" }]}>
                        <Text style={[styles.distT, { color: statusColors[o.status] || colors.primary }]}>{statusLabels[o.status] || o.status}</Text>
                      </View>
                    )}
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
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <View style={styles.infoRow}>
                    <Feather name="user" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.oS, { color: colors.foreground }]}>{o.client_name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Feather name="clock" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.oS, { color: colors.foreground }]}>{fmtTime(o.scheduled_at)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.oS, { color: colors.foreground }]} numberOfLines={1}>{o.addr_text}</Text>
                  </View>
                  {o.eta_min != null && (
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="car-clock" size={11} color={colors.warning} />
                      <Text style={[styles.oS, { color: colors.warning }]}>~ {o.eta_min} دقيقة بالسيارة</Text>
                    </View>
                  )}
                </View>

                <View style={styles.oBot}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.priceV, { color: colors.primary }]}>{o.total} ر.س</Text>
                  </View>
                  {isPending ? (
                    <>
                      <TouchableOpacity onPress={() => reject(o.id)} style={[styles.rejectBtn, { borderColor: colors.danger }]}>
                        <Text style={[styles.rejectT, { color: colors.danger }]}>رفض</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => accept(o.id)} style={[styles.acceptBtn, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={12} color="#FFF" />
                        <Text style={styles.acceptT}>قبول</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity onPress={() => router.push(`/(provider)/booking-details?id=${o.id}` as any)} style={[styles.acceptBtn, { backgroundColor: statusColors[o.status] || colors.primary }]}>
                      <Feather name={I18nManager.isRTL ? "arrow-left" : "arrow-right"} size={12} color="#FFF" />
                      <Text style={styles.acceptT}>التفاصيل</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
              );
            })}
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
  notifDot: { position: "absolute", top: 8, start: 9, width: 8, height: 8, borderRadius: 4 },
  greet: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  statusBox: { marginHorizontal: 16, padding: 16, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 },
  statusL: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statusS: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  statC: { flex: 1, padding: 12, borderRadius: 14, alignItems: "center" },
  statI: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statV: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statL: { fontFamily: "Tajawal_500Medium", fontSize: 9, marginTop: 1, textAlign: "center" },
  mapWrap: { marginHorizontal: 16, height: 200, borderRadius: 18, overflow: "hidden", marginBottom: 14, position: "relative" },
  mapBadge: { position: "absolute", top: 10, end: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  mapBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },

  sectionH: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 },
  sectionT: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  seeAll: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  order: { padding: 12, borderRadius: 16, gap: 10 },
  oTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  oTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  distBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  distT: { fontFamily: "Tajawal_700Bold", fontSize: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  oS: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  oBot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  priceV: { fontFamily: "Tajawal_700Bold", fontSize: 15 },
  acceptBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  acceptT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  rejectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalCard: { borderTopStartRadius: 28, borderTopEndRadius: 28, padding: 24, alignItems: "center", gap: 14 },
  modalBellWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, textAlign: "center" },
  modalInfoBox: { width: "100%", padding: 14, borderRadius: 14, gap: 10 },
  modalRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalInfoV: { fontFamily: "Tajawal_500Medium", fontSize: 13, flex: 1 },
  modalPrice: { fontFamily: "Tajawal_700Bold", fontSize: 28 },
  countdownBox: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  countdownT: { fontFamily: "Tajawal_700Bold", fontSize: 24 },
  countdownSub: { fontFamily: "Tajawal_500Medium", fontSize: 11, flex: 1 },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  modalDismissBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  modalDismissT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  modalViewBtn: { flex: 2, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  modalViewT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13 },
  rejectT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  emptyCard: { padding: 32, borderRadius: 16, alignItems: "center", gap: 8 },
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginTop: 8 },
  emptyS: { fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "center" },
  gpsRefreshBtn: {
    position: "absolute",
    bottom: 10,
    start: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  locInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: -6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  locText: { fontFamily: "Tajawal_500Medium", fontSize: 12, flex: 1 },
});
