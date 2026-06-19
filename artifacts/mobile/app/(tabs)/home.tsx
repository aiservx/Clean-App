import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Image, I18nManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
// Safe BlurView: falls back to a translucent View on Android to avoid native crashes
import { BlurView as ExpoBlurView } from "expo-blur";
const BlurView = Platform.OS === "android"
  ? ({ style, children }: any) => <View style={[style, { backgroundColor: "rgba(255,255,255,0.85)" }]}>{children}</View>
  : ExpoBlurView;
import { router } from "expo-router";
import AppMap from "@/components/AppMap";
import ActiveBookingCard from "@/components/ActiveBookingCard";
import PlatformStatsStrip from "@/components/PlatformStatsStrip";
import NearbyProviderToast, { type ToastProvider } from "@/components/NearbyProviderToast";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getCurrentResolved, distanceKm, type ResolvedAddress } from "@/lib/location";
import { useNotifBadge } from "@/lib/notifBadge";
import { FALLBACK_CATEGORIES } from "@/lib/serviceImages";
import { useI18n } from "@/lib/i18n";
import { iconForService, colorForService, imageForService } from "../../lib/serviceIcons";

// 18 category cards (3D illustrations) shown in a 2-column grid in the home services section.
// Order mirrors the attached design grid exactly (top-to-bottom, right-to-left in RTL).
// Names match the existing service categories on the home page.
const HOME_CATEGORY_CARDS: { id: string; title: string; img: any }[] = [
  { id: "homes",      title: "تنظيف منازل",     img: require("@/assets/services/cards/house.png") },
  { id: "deep",       title: "تنظيف عميق",      img: require("@/assets/services/cards/bucket.png") },
  { id: "offices",    title: "تنظيف مكاتب",     img: require("@/assets/services/cards/office.png") },
  { id: "villas",     title: "تنظيف فلل",       img: require("@/assets/services/cards/villa.png") },
  { id: "apartments", title: "تنظيف شقق",       img: require("@/assets/services/cards/apartment.png") },
  { id: "furniture",  title: "تنظيف كنب",       img: require("@/assets/services/cards/sofa.png") },
  { id: "mattresses", title: "تنظيف مفروشات",   img: require("@/assets/services/cards/mattress.png") },
  { id: "kitchens",   title: "تنظيف مطابخ",     img: require("@/assets/services/cards/kitchen.png") },
  { id: "bathrooms",  title: "تنظيف حمامات",    img: require("@/assets/services/cards/bathroom.png") },
  { id: "facades",    title: "تنظيف واجهات",    img: require("@/assets/services/cards/window.png") },
  { id: "tanks",      title: "تنظيف خزانات",    img: require("@/assets/services/cards/tank.png") },
  { id: "ac",         title: "تنظيف مكيفات",    img: require("@/assets/services/cards/ac.png") },
  { id: "postbuild",  title: "ما بعد البناء",   img: require("@/assets/services/cards/postbuild.png") },
  { id: "cars",       title: "غسيل سيارات",     img: require("@/assets/services/cards/car.png") },
  { id: "pools",      title: "تنظيف مسابح",     img: require("@/assets/services/cards/pool.png") },
  { id: "gardens",    title: "تنسيق حدائق",     img: require("@/assets/services/cards/garden.png") },
  { id: "mosques",    title: "تنظيف مساجد",     img: require("@/assets/services/cards/mosque.png") },
  { id: "schools",    title: "تنظيف مدارس",     img: require("@/assets/services/cards/school.png") },
];

// Home banners — promotional cards (Ramadan is always last)
const HOME_OFFER_BANNERS: { src: any; ar: number }[] = [
  { src: require("@/assets/images/banners/home_new_0.png"), ar: 887 / 317 },
  { src: require("@/assets/images/banners/home_new_1.png"), ar: 887 / 324 },
  { src: require("@/assets/images/banners/home_new_2.png"), ar: 887 / 314 },
  { src: require("@/assets/images/banners/home_new_3.png"), ar: 887 / 330 },
  { src: require("@/assets/images/banners/home_new_4.png"), ar: 887 / 305 },
];
const HOME_BANNER_AR = 887 / 330;

// Per-category soft background colors for the service card illustrations
const CAT_BG: Record<string, string> = {
  homes:      "#E8F5EE",
  deep:       "#EDE9FE",
  offices:    "#DBEAFE",
  villas:     "#FEF3C7",
  apartments: "#FCE7F3",
  furniture:  "#F0FDF4",
  mattresses: "#FFF7ED",
  kitchens:   "#E0F2FE",
  bathrooms:  "#F5F3FF",
  facades:    "#ECFDF5",
  tanks:      "#EFF6FF",
  ac:         "#FDF4FF",
  postbuild:  "#FFFBEB",
  cars:       "#F0F9FF",
  pools:      "#E0F7FA",
  gardens:    "#F0FDF4",
  mosques:    "#FFF7ED",
  schools:    "#EDE9FE",
};

// Soft, coupon-style background colors for offer cards (T043).
const OFFER_PALETTES: { bg: string; border: string; accent: string; text: string }[] = [
  { bg: "#FEF3C7", border: "#FDE68A", accent: "#F59E0B", text: "#92400E" }, // amber
  { bg: "#DBEAFE", border: "#BFDBFE", accent: "#3B82F6", text: "#1E40AF" }, // blue
  { bg: "#FCE7F3", border: "#FBCFE8", accent: "#EC4899", text: "#9D174D" }, // pink
  { bg: "#D1FAE5", border: "#A7F3D0", accent: "#10B981", text: "#065F46" }, // emerald
  { bg: "#EDE9FE", border: "#DDD6FE", accent: "#7C3AED", text: "#5B21B6" }, // violet
];

const { width: SW, height: SCREEN_H } = Dimensions.get("window");
const CONTENT_W = SW - 32;

type Cat = { id: string; title_ar: string; icon: string; color: string; sort: number };
type Provider = {
  id: string;
  rating: number | null;
  experience_years: number | null;
  current_lat: number | null;
  current_lng: number | null;
  available: boolean | null;
  hourly_rate: number | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};
type Offer = { id: string; title_ar: string | null; desc_ar: string | null; discount: number | null };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const { profile, session } = useAuth();
  const [loc, setLoc] = useState<ResolvedAddress | null>(null);
  const [locating, setLocating] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [nearbyToast, setNearbyToast] = useState<ToastProvider | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.0);
  const [recentBookings, setRecentBookings] = useState<{ id: string; service_title: string; total: number }[]>([]);
  const knownNearbyIds = useRef<Set<string>>(new Set());
  const hasInitialLoad = useRef(false);
  const providerScrollRef = useRef<any>(null);
  const { unreadCount: notifUnread } = useNotifBadge();

  const loadProviders = async () => {
    try {
      // Layer 4: only show providers whose heartbeat is fresh (≤ 8 min old).
      // Falls back to basic query if location_updated_at column doesn't exist yet.
      const cutoff = new Date(Date.now() - 8 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("providers")
        .select("id, rating, experience_years, current_lat, current_lng, available, hourly_rate, profiles(full_name, avatar_url)")
        .eq("available", true)
        .not("current_lat", "is", null)
        .not("current_lng", "is", null)
        .gte("location_updated_at", cutoff)
        .limit(20);

      if (error) {
        // Column not yet migrated — fall back to the unfiltered query
        const { data: fallback } = await supabase
          .from("providers")
          .select("id, rating, experience_years, current_lat, current_lng, available, hourly_rate, profiles(full_name, avatar_url)")
          .eq("available", true)
          .not("current_lat", "is", null)
          .not("current_lng", "is", null)
          .limit(20);
        if (fallback) setProviders(fallback as any);
      } else if (data) {
        setProviders(data as any);
      }
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const [catsRes, offersRes] = await Promise.all([
          supabase.from("service_categories").select("*").order("sort").limit(8),
          supabase.from("offers").select("*").eq("active", true).limit(5),
        ]);
        const dbCats = (catsRes.data || []) as Cat[];
        // Fall back to static categories so the home page is never empty
        setCats(dbCats.length > 0 ? dbCats : (FALLBACK_CATEGORIES as any));
        if (offersRes.data) setOffers(offersRes.data as any);
      } catch {
        setCats(FALLBACK_CATEGORIES as any);
      }
      await loadProviders();
      requestLocation();
    })();
  }, [session]);

  // T021 — Realtime subscription: refetch nearby providers whenever any provider row updates.
  useEffect(() => {
    let cancelled = false;
    const topic = `home-providers-live-${Math.random().toString(36).slice(2, 10)}`;
    const ch = supabase.channel(topic);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "providers" }, (payload: any) => {
      if (cancelled) return;
      // Immediately drop providers that went offline or cleared their location
      const row = payload.new;
      if (row && (!row.available || row.current_lat == null || row.current_lng == null)) {
        setProviders((prev) => prev.filter((p) => p.id !== row.id));
      }
      loadProviders();
    });
    ch.subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  // Polling fallback: refresh provider locations every 5s in case Realtime
  // is unavailable or silently disconnected.
  useEffect(() => {
    const id = setInterval(loadProviders, 5_000);
    return () => clearInterval(id);
  }, []);

  // Active booking — load + subscribe for live Uber-style card
  useEffect(() => {
    if (!session?.user) { setActiveBooking(null); return; }
    const uid = session.user.id;
    const ACTIVE = ["pending", "accepted", "on_the_way", "arrived", "started", "in_progress"];

    const loadActive = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, status, total, scheduled_at, services(title_ar), providers!bookings_provider_id_fkey(profiles(full_name, avatar_url))")
        .eq("user_id", uid)
        .in("status", ACTIVE)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setActiveBooking({
          id: data.id,
          status: data.status,
          total: data.total,
          scheduled_at: data.scheduled_at,
          service_title: (data.services as any)?.title_ar ?? "خدمة تنظيف",
          provider_name: (data.providers as any)?.profiles?.full_name ?? null,
          provider_avatar: (data.providers as any)?.profiles?.avatar_url ?? null,
        });
      } else {
        setActiveBooking(null);
      }
    };

    loadActive();

    const ch = supabase
      .channel(`active-booking-home-${uid}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "bookings",
        filter: `user_id=eq.${uid}`,
      }, () => loadActive())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [session?.user?.id]);

  // Fetch surge pricing multiplier + recent completed bookings
  useEffect(() => {
    // Surge pricing
    (async () => {
      try {
        const EXPO_API = process.env.EXPO_PUBLIC_API_URL ?? "";
        const res = await fetch(`${EXPO_API}/api/pricing/dynamic`).catch(() => null);
        if (res?.ok) {
          const json = await res.json().catch(() => null);
          const entries: { multiplier: number }[] = json?.data ?? json?.pricing ?? [];
          if (entries.length > 0) {
            const max = Math.max(...entries.map((e: any) => Number(e.multiplier ?? 1)));
            setSurgeMultiplier(max);
          }
        }
      } catch { }
    })();

    // Recent completed bookings for Quick Rebook
    if (!session?.user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("bookings")
          .select("id, total, services(title_ar)")
          .eq("user_id", session.user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(4);
        if (data && data.length > 0) {
          const seen = new Set<string>();
          const unique: { id: string; service_title: string; total: number }[] = [];
          for (const b of data as any[]) {
            const title = b.services?.title_ar ?? "خدمة تنظيف";
            if (!seen.has(title)) {
              seen.add(title);
              unique.push({ id: b.id, service_title: title, total: Number(b.total ?? 0) });
            }
          }
          setRecentBookings(unique.slice(0, 3));
        }
      } catch { }
    })();
  }, [session?.user?.id]);

  // Auto-advance home banner — simple index swap, works on web + native
  useEffect(() => {
    const id = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % HOME_OFFER_BANNERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const [mapAnimTrigger, setMapAnimTrigger] = useState(0);

  const requestLocation = async () => {
    setLocating(true);
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoc((prev) => prev ?? {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            street: null, district: null, city: null, region: null, country: null,
            formatted: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          });
          setMapAnimTrigger((t) => t + 1);
        },
        () => {},
        { timeout: 6000, maximumAge: 60000 }
      );
    }
    const r = await getCurrentResolved();
    if (r) {
      setLoc(r);
      setMapAnimTrigger((t) => t + 1);
    }
    setLocating(false);
  };

  const region = useMemo(
    () => ({
      latitude: loc?.lat ?? 24.7136,
      longitude: loc?.lng ?? 46.6753,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }),
    [loc]
  );

  const nearbyProviders = useMemo(() => {
    if (!loc) return providers;
    return providers
      .map((p) => ({
        ...p,
        d: p.current_lat && p.current_lng ? distanceKm({ lat: loc.lat, lng: loc.lng }, { lat: p.current_lat, lng: p.current_lng }) : null,
      }))
      .filter((p) => (p as any).d == null || (p as any).d <= 30)
      .sort((a: any, b: any) => (a.d ?? 99) - (b.d ?? 99));
  }, [providers, loc]);

  // Detect new providers entering within 5km and trigger toast notification
  useEffect(() => {
    if (!loc) return;
    const within5km = nearbyProviders.filter((p: any) => p.d != null && p.d <= 5);

    if (!hasInitialLoad.current) {
      // First load — seed the known set without showing any toast
      hasInitialLoad.current = true;
      within5km.forEach((p) => knownNearbyIds.current.add(p.id));
      return;
    }

    // Check for providers that just entered 5km radius
    for (const p of within5km) {
      if (!knownNearbyIds.current.has(p.id)) {
        setNearbyToast({
          id: p.id,
          name: p.profiles?.full_name || "مزود",
          distanceKm: (p as any).d,
        });
        break; // show one toast at a time
      }
    }

    // Update known set
    const newSet = new Set<string>(within5km.map((p) => p.id));
    knownNearbyIds.current = newSet;
  }, [nearbyProviders, loc]);

  const requireAuth = (path: string) => {
    if (!session) router.push("/login");
    else router.push(path as any);
  };

  const mapHeight = Math.max(380, SCREEN_H * 0.55);
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <View style={[styles.container, { backgroundColor: "#F8FAFC" }]}>
      {/* INTERACTIVE MAP — fixed-height block so native MapView receives touch events
          (previously this was absolutely positioned which caused the ScrollView to
          intercept all pan/zoom gestures before they reached the native map) */}
      <View style={{ height: mapHeight, backgroundColor: "#0F172A", overflow: "hidden" }}>
        <AppMap
          style={StyleSheet.absoluteFill}
          region={region}
          scrollEnabled={true}
          zoomEnabled={true}
          animateTrigger={mapAnimTrigger}
          markers={nearbyProviders
            .filter((p) => p.current_lat && p.current_lng)
            .map((p) => ({
              id: p.id,
              coordinate: { latitude: p.current_lat!, longitude: p.current_lng! },
              color: colors.primary,
              avatarUrl: p.profiles?.avatar_url ?? null,
              title: p.profiles?.full_name ?? undefined,
            }))}
          onMarkerPress={(id) => {
            const prov = nearbyProviders.find((p) => p.id === id) ?? null;
            setSelectedProvider(prov);
          }}
        />
        {/* User location dot */}
        {loc && (
          <View style={styles.userLocationDot} pointerEvents="none">
            <View style={styles.userLocationPulse} />
            <View style={[styles.userLocationInner, { backgroundColor: colors.primary }]} />
          </View>
        )}
        {/* Soft top fade for header readability */}
        <LinearGradient
          colors={["rgba(15,23,42,0.55)", "rgba(15,23,42,0)"]}
          style={[styles.topFade, { height: insets.top + 130 }]}
          pointerEvents="none"
        />

        {/* Provider info card — modern design shown when a marker is tapped */}
        {selectedProvider && (
          <View style={styles.provInfoCard}>
            {/* Header strip */}
            <LinearGradient colors={[colors.primary + "18", colors.primary + "06"]} style={styles.provInfoGrad}>
              <View style={styles.provInfoRow}>
                <View style={{ flex: 1, alignItems: colAlign }}>
                  {/* Online badge */}
                  <View style={styles.provOnlineBadge}>
                    <View style={styles.provOnlineDot} />
                    <Text style={styles.provOnlineTxt}>متاح الآن</Text>
                  </View>
                  <Text style={styles.provInfoName} numberOfLines={1}>{selectedProvider.profiles?.full_name || "فني"}</Text>
                  {/* Rating + exp */}
                  <View style={{ flexDirection: rowDir, alignItems: "center", gap: 8, marginTop: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                      <Text style={[styles.provInfoMeta, { color: "#F59E0B", fontFamily: "Tajawal_700Bold" }]}>{(selectedProvider.rating || 0).toFixed(1)}</Text>
                    </View>
                    <View style={styles.provMetaDivider} />
                    <Text style={styles.provInfoMeta}>{selectedProvider.experience_years || 0} سنة خبرة</Text>
                  </View>
                  {/* Distance + ETA */}
                  {loc && selectedProvider.current_lat && selectedProvider.current_lng && (() => {
                    const d = distanceKm({ lat: loc.lat, lng: loc.lng }, { lat: selectedProvider.current_lat, lng: selectedProvider.current_lng });
                    const eta = Math.max(3, Math.round((d / 25) * 60));
                    return (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
                        <View style={[styles.provChip, { backgroundColor: colors.primaryLight }]}>
                          <MaterialCommunityIcons name="map-marker-distance" size={11} color={colors.primary} />
                          <Text style={[styles.provChipT, { color: colors.primary }]}>{d < 1 ? `${Math.round(d * 1000)} م` : `${d.toFixed(1)} كم`}</Text>
                        </View>
                        <View style={[styles.provChip, { backgroundColor: "#EDE9FE" }]}>
                          <MaterialCommunityIcons name="clock-fast" size={11} color="#7C3AED" />
                          <Text style={[styles.provChipT, { color: "#7C3AED" }]}>~{eta} د</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
                <View style={styles.provAvatarWrap}>
                  <Image source={selectedProvider.profiles?.avatar_url ? { uri: selectedProvider.profiles.avatar_url } : require("@/assets/images/default-avatar.png")} style={styles.provInfoAvatar} />
                  <View style={[styles.provVerifiedBadge, { backgroundColor: colors.primary }]}>
                    <MaterialCommunityIcons name="check-decagram" size={12} color="#FFF" />
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Action buttons */}
            <View style={styles.provInfoActions}>
              <TouchableOpacity onPress={() => setSelectedProvider(null)} style={styles.provInfoDismiss}>
                <Feather name="x" size={15} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  setSelectedProvider(null);
                  router.push({ pathname: "/provider/[id]", params: { id: selectedProvider.id } } as any);
                }}
                style={[styles.provInfoBookBtn, { backgroundColor: colors.primary, flex: 1 }]}
              >
                <Feather name="calendar" size={14} color="#FFF" />
                <Text style={styles.provInfoBookText}>احجز الآن</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* GPS button — inside the map area */}
        <TouchableOpacity onPress={requestLocation} style={[styles.gpsBtn, { position: "absolute", bottom: 40, end: 16 }]}>
          <BlurView intensity={Platform.OS === "ios" ? 70 : 100} tint="light" style={styles.gpsBlur}>
            {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />}
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* FLOATING HEADER */}
      <View style={[styles.floatHeader, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.push("/(tabs)/offers")} style={styles.headerIconBtn}>
            <BlurView intensity={Platform.OS === "ios" ? 60 : 100} tint="light" style={styles.iconBlur}>
              <Feather name="gift" size={18} color={colors.primary} />
              <View style={styles.notifDot} />
            </BlurView>
          </TouchableOpacity>

          <BlurView intensity={Platform.OS === "ios" ? 60 : 100} tint="light" style={styles.greetingBlur}>
            <Text style={styles.greetingText} numberOfLines={1}>
              {firstName ? `${t("hi_user")} ${firstName} 👋` : `${t("welcome")} 👋`}
            </Text>
            <Text style={styles.greetingSub} numberOfLines={1}>
              {loc?.formatted ? loc.formatted : locating ? t("locating") : t("set_location")}
            </Text>
          </BlurView>

          <TouchableOpacity onPress={() => requireAuth("/notifications")} style={styles.headerIconBtn}>
            <BlurView intensity={Platform.OS === "ios" ? 60 : 100} tint="light" style={styles.iconBlur}>
              <Feather name="bell" size={18} color="#0F172A" />
              {notifUnread > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeT}>{notifUnread > 9 ? "9+" : notifUnread}</Text>
                </View>
              )}
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Search — compact iOS-style icon button */}
        <TouchableOpacity activeOpacity={0.95} onPress={() => router.push("/search")} style={styles.searchIconBtn}>
          <BlurView intensity={Platform.OS === "ios" ? 60 : 100} tint="light" style={styles.searchIconBlur}>
            <Feather name="search" size={20} color="#64748B" />
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Nearby provider toast notification */}
      <NearbyProviderToast
        provider={nearbyToast}
        onDismiss={() => setNearbyToast(null)}
        onPress={() => providerScrollRef.current?.scrollTo({ y: 99999, animated: true })}
      />

      {/* SHEET CONTAINER — fixed below the map so the map always stays visible.
          Only the inner ScrollView content scrolls; the sheet itself never slides
          up to cover the map. */}
      <View style={{ flex: 1, marginTop: -28 }}>
        <View style={[styles.sheet, { flex: 1 }]}>
          <View style={styles.sheetGrabber} />
          <ScrollView
            ref={providerScrollRef}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            showsVerticalScrollIndicator={false}
          >

          {/* ACTIVE BOOKING CARD — Uber-style live trip card */}
          <ActiveBookingCard booking={activeBooking} />

          {/* SURGE PRICING BANNER — shows when multiplier > 1 */}
          {surgeMultiplier > 1.05 && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/booking" as any)}
              style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 14, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#F59E0B", "#EF4444"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flexDirection: rowDir, alignItems: "center", padding: 12, gap: 10 }}
              >
                <Text style={{ fontSize: 20 }}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#FFF" }}>
                    الطلب مرتفع الآن — أسعار أعلى بـ {Math.round((surgeMultiplier - 1) * 100)}%
                  </Text>
                  <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>
                    احجز الآن أو انتظر انخفاض الطلب
                  </Text>
                </View>
                <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={16} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* QUICK REBOOK — personalized from completed bookings */}
          {recentBookings.length > 0 && (
            <>
              <View style={[styles.sectionHeader]}>
                <Text style={styles.sectionTitle}>احجز مجدداً</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/bookings" as any)}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }}
                style={{ marginBottom: 14 }}
              >
                {recentBookings.map((rb) => (
                  <TouchableOpacity
                    key={rb.id}
                    activeOpacity={0.88}
                    onPress={() => requireAuth("/booking")}
                    style={{
                      backgroundColor: colors.card, borderRadius: 18, padding: 14,
                      minWidth: 140, maxWidth: 160,
                      shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
                      gap: 8,
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                      <MaterialCommunityIcons name="broom" size={20} color={colors.primary} />
                    </View>
                    <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 12, color: colors.foreground }} numberOfLines={2}>{rb.service_title}</Text>
                    {rb.total > 0 && (
                      <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 11, color: colors.mutedForeground }}>{rb.total} ر.س</Text>
                    )}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Feather name="refresh-cw" size={10} color={colors.primary} />
                      <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 10, color: colors.primary }}>احجز مجدداً</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* PLATFORM STATS STRIP — social proof */}
          <PlatformStatsStrip />

          {/* PROMO BANNERS — single image swapper, works on web + native */}
          <View style={{ marginHorizontal: 16, marginBottom: 18 }}>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => router.push("/(tabs)/offers")}
              style={{ width: "100%", aspectRatio: HOME_BANNER_AR, borderRadius: 16, overflow: "hidden" }}
            >
              <Image
                source={HOME_OFFER_BANNERS[bannerIdx].src}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            {/* Pagination dots */}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 8 }}>
              {HOME_OFFER_BANNERS.map((_, idx) => (
                <View
                  key={idx}
                  style={{
                    height: 6,
                    width: idx === bannerIdx ? 20 : 6,
                    borderRadius: 3,
                    backgroundColor: idx === bannerIdx ? colors.primary : colors.border,
                  }}
                />
              ))}
            </View>
          </View>

          {/* SERVICES — clean 2-column grid, no banners between rows */}
          <View style={[styles.sectionHeader]}>
            <Text style={[styles.sectionTitle, { }]}>{t("services")}</Text>
            <TouchableOpacity onPress={() => router.push("/services")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{t("see_all")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.catGridWrap}>
            {Array.from({ length: Math.ceil(HOME_CATEGORY_CARDS.length / 2) }, (_, rowIdx) => {
              const pair = HOME_CATEGORY_CARDS.slice(rowIdx * 2, rowIdx * 2 + 2);
              return (
                <View key={`row-${rowIdx}`} style={styles.catGrid}>
                  {pair.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.88}
                      style={styles.catCard}
                      onPress={() => router.push({ pathname: "/services", params: { cat: c.id } } as any)}
                    >
                      <View style={[styles.catCardSurface, { backgroundColor: CAT_BG[c.id] ?? "#F0F9FF" }]}>
                        <Image source={c.img} style={styles.catCardImage} resizeMode="contain" />
                      </View>
                      <Text style={styles.catCardTitle} numberOfLines={1}>{c.title}</Text>
                    </TouchableOpacity>
                  ))}
                  {pair.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              );
            })}
          </View>

          {/* OFFERS (T042: moved below services, T043: soft coupon-style colors) */}
          {offers.length > 0 && (
            <>
              <View style={[styles.sectionHeader]}>
                <Text style={[styles.sectionTitle, { }]}>{t("offers")}</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/offers")}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>{t("see_all")}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                style={{ marginBottom: 18, marginTop: 4 }}
              >
                {offers.map((o, idx) => {
                  const p = OFFER_PALETTES[idx % OFFER_PALETTES.length];
                  return (
                    <TouchableOpacity
                      key={o.id}
                      activeOpacity={0.92}
                      onPress={() => router.push("/(tabs)/offers")}
                      style={[styles.offerCard, { backgroundColor: p.bg, borderColor: p.border, borderWidth: 1 }]}
                    >
                      <View style={styles.offerInner}>
                        <View style={{ flex: 1 }}>
                          <View style={[styles.offerBadge, { backgroundColor: p.accent + "22" }]}>
                            <Text style={[styles.offerBadgeText, { color: p.text }]}>عرض</Text>
                          </View>
                          <Text style={[styles.offerTitle, { color: p.text }]} numberOfLines={1}>{o.title_ar}</Text>
                          <Text style={[styles.offerSub, { color: p.text + "CC" }]} numberOfLines={2}>{o.desc_ar}</Text>
                          {!!o.discount && (
                            <View style={[styles.discountChip, { backgroundColor: p.accent }]}>
                              <Text style={[styles.discountText, { color: "#FFF" }]}>خصم {o.discount}%</Text>
                            </View>
                          )}
                        </View>
                        <View style={[styles.offerNotch, { backgroundColor: "#F8FAFC" }]} pointerEvents="none" />
                        <View style={[styles.offerIcon, { backgroundColor: p.accent + "22" }]}>
                          <Feather name="gift" size={26} color={p.accent} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* INVITE FRIENDS BANNER */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={{ marginHorizontal: 16, marginBottom: 18, borderRadius: 18, overflow: "hidden" }}
            onPress={() => router.push("/referrals" as any)}
          >
            <Image
              source={require("@/assets/images/invite_friends_banner.png")}
              style={{ width: CONTENT_W, aspectRatio: 1378 / 563, borderRadius: 18 }}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* PROVIDERS */}
          <View style={[styles.sectionHeader]}>
            <Text style={[styles.sectionTitle, { }]}>{t("nearby_pros")}</Text>
            <TouchableOpacity onPress={() => router.push("/services")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{t("see_all")}</Text>
            </TouchableOpacity>
          </View>

          {nearbyProviders.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="account-search-outline" size={42} color="#94A3B8" />
              <Text style={styles.emptyText}>{t("no_pros")}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {nearbyProviders.slice(0, 8).map((p) => {
                const initials = (p.profiles?.full_name || "؟").trim().split(" ").map((s) => s[0]).slice(0, 2).join("");
                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.9}
                    style={styles.provCard}
                    onPress={() => router.push({ pathname: "/provider/[id]", params: { id: p.id } } as any)}
                  >
                    <View style={styles.provAvatar}>
                      <Image source={p.profiles?.avatar_url ? { uri: p.profiles.avatar_url } : require("@/assets/images/default-avatar.png")} style={{ width: 54, height: 54, borderRadius: 27 }} />
                      {p.available && <View style={styles.provDot} />}
                    </View>
                    <Text style={styles.provName} numberOfLines={1}>{p.profiles?.full_name || "فني"}</Text>
                    <View style={styles.provMeta}>
                      <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.provRating}>{(p.rating || 0).toFixed(1)}</Text>
                      <Text style={styles.provDivider}>•</Text>
                      <Text style={styles.provExp}>{p.experience_years || 0} سنة</Text>
                    </View>
                    {!!p.hourly_rate && (
                      <View style={styles.provPrice}>
                        <Text style={styles.provPriceText}>{Number(p.hourly_rate)} {t("per_hour")}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* AI BOT — T044: route to chat tab (smart assistant), with light-friendly contrast on the gradient */}
          <TouchableOpacity activeOpacity={0.92} style={styles.botWrap} onPress={() => requireAuth("/(tabs)/chat")}>
            <LinearGradient colors={["#8B5CF6", "#6366F1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.botCard}>
              {/* Decorative orbs for premium feel */}
              <View style={styles.botOrbA} pointerEvents="none" />
              <View style={styles.botOrbB} pointerEvents="none" />
              <View style={styles.botContent}>
                <View style={styles.botTitleRow}>
                  <View style={styles.botBadgeAi}><Text style={styles.botBadgeAiText}>AI</Text></View>
                  <Text style={styles.botTitle}>{t("ai_assistant")}</Text>
                </View>
                <Text style={styles.botSub}>{t("ai_assistant_sub")}</Text>
              </View>
              <View style={styles.botIcon}>
                <MaterialCommunityIcons name="robot-happy" size={30} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);
const colAlign = I18nManager.isRTL ? ("flex-start" as const) : ("flex-end" as const);

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapBg: { start: 0, end: 0, top: 0 },
  topFade: { position: "absolute", top: 0, start: 0, end: 0 },

  floatHeader: { position: "absolute", start: 0, end: 0, paddingHorizontal: 14, gap: 12, zIndex: 5 },
  headerRow: { flexDirection: rowDir, alignItems: "center", gap: 8 },

  headerIconBtn: { borderRadius: 14, overflow: "hidden" },
  iconBlur: {
    width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)",
  },
  notifDot: { position: "absolute", top: 9, end: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", borderWidth: 1, borderColor: "#fff" },
  notifBadge: { position: "absolute", top: 6, end: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5, borderColor: "#FFF" },
  notifBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 9, color: "#FFF", lineHeight: 13 },

  greetingBlur: {
    flex: 1, height: 44, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)",
    alignItems: colAlign, overflow: "hidden",
  },
  greetingText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A" },
  greetingSub: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#475569", marginTop: 1 },

  searchWrap: { borderRadius: 18, overflow: "hidden" },
  searchBlur: {
    flexDirection: rowDir, alignItems: "center", gap: 10, paddingHorizontal: 14, height: 50, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
  },
  searchPlaceholder: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#94A3B8" },
  searchAction: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchIconBtn: { borderRadius: 14, overflow: "hidden" },
  searchIconBlur: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
  },

  userLocationDot: { position: "absolute", top: "45%", start: "50%", marginStart: -12, marginTop: -12, alignItems: "center", justifyContent: "center", width: 24, height: 24 },
  userLocationInner: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: "#fff" },
  userLocationPulse: { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(22,196,127,0.25)" },

  provInfoCard: {
    position: "absolute",
    bottom: 90,
    start: 12,
    end: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
    zIndex: 10,
  },
  provInfoGrad: { padding: 14 },
  provInfoRow: { flexDirection: rowDir, alignItems: "flex-start", gap: 12 },
  provAvatarWrap: { position: "relative" },
  provInfoAvatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, borderColor: "#FFF" },
  provVerifiedBadge: { position: "absolute", bottom: 0, end: 0, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FFF" },
  provOnlineBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  provOnlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#16C47F" },
  provOnlineTxt: { fontFamily: "Tajawal_600SemiBold", fontSize: 10, color: "#16C47F" },
  provInfoName: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#0F172A" },
  provInfoMeta: { fontFamily: "Tajawal_500Medium", fontSize: 11, color: "#64748B" },
  provMetaDivider: { width: 1, height: 10, backgroundColor: "#E2E8F0" },
  provChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  provChipT: { fontFamily: "Tajawal_700Bold", fontSize: 10 },
  provInfoActions: { flexDirection: rowDir, alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  provInfoDismiss: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  provInfoBookBtn: {
    flexDirection: rowDir,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
  },
  provInfoBookText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#FFF" },

  gpsBtn: { position: "absolute", end: 16, borderRadius: 16, overflow: "hidden", zIndex: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  gpsBlur: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },

  sheet: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetGrabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 14 },

  offerCard: { width: 290, height: 110, borderRadius: 20, overflow: "hidden" },
  offerInner: { flex: 1, padding: 14, flexDirection: rowDir, alignItems: "center", gap: 12 },
  offerBadge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginBottom: 6 },
  offerBadgeText: { color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 10 },
  offerTitle: { color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 3 },
  offerSub: { color: "rgba(255,255,255,0.95)", fontFamily: "Tajawal_500Medium", fontSize: 11, lineHeight: 16 },
  discountChip: { backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginTop: 8 },
  discountText: { color: "#0F172A", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  offerIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },

  sectionHeader: { flexDirection: rowDir, justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, marginTop: 6 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#0F172A" },
  seeAll: { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  svcCard: {
    width: 104,
    alignItems: "center",
    marginBottom: 6,
  },
  svcCardSurface: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 0.5,
    borderColor: "#E2E8F0",
  },
  svcCardImage: {
    width: 72,
    height: 72,
  },
  svcCardTitle: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 12,
    color: "#334155",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // 2-column category grid (matches the attached design layout)
  catGridWrap: {
    paddingHorizontal: 16,
    marginBottom: 22,
    gap: 14,
  },
  catGrid: {
    flexDirection: rowDir,
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  catCard: {
    width: "48%",
    alignItems: "center",
  },
  catCardSurface: {
    width: "100%",
    aspectRatio: 1.55,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  catCardImage: {
    width: "100%",
    height: "100%",
  },
  catCardTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 12.5,
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  emptyBox: { marginHorizontal: 16, padding: 26, borderRadius: 18, alignItems: "center", gap: 8, backgroundColor: "#fff" },
  emptyText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#64748B", textAlign: "center" },

  provCard: { width: 158, backgroundColor: "#fff", borderRadius: 22, padding: 14, alignItems: "center", shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3, marginBottom: 4, borderWidth: 0.5, borderColor: "#F1F5F9" },
  provAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E0F7EE", alignItems: "center", justifyContent: "center", marginBottom: 10, position: "relative" },
  provInitials: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#16C47F" },
  provDot: { position: "absolute", bottom: 2, end: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#10B981", borderWidth: 2.5, borderColor: "#fff" },
  provName: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A", marginBottom: 4 },
  provMeta: { flexDirection: rowDir, alignItems: "center", gap: 4, marginBottom: 8 },
  provRating: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#0F172A" },
  provDivider: { color: "#CBD5E1", fontSize: 10 },
  provExp: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#64748B" },
  provPrice: { backgroundColor: "#F0FDF4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  provPriceText: { color: "#16C47F", fontFamily: "Tajawal_700Bold", fontSize: 10 },

  botWrap: { marginHorizontal: 16, marginTop: 22, borderRadius: 22, overflow: "hidden", shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 5 },
  botCard: { flexDirection: rowDir, alignItems: "center", padding: 16, gap: 14, position: "relative", overflow: "hidden" },
  botIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  botContent: { flex: 1, alignItems: colAlign },
  botTitleRow: { flexDirection: rowDir, alignItems: "center", gap: 8 },
  botBadgeAi: { backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  botBadgeAiText: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 10, letterSpacing: 1 },
  botTitle: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  botSub: { color: "rgba(255,255,255,0.92)", fontFamily: "Tajawal_500Medium", fontSize: 11.5, marginTop: 4 },
  botOrbA: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.10)", top: -40, start: -30 },
  botOrbB: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.06)", bottom: -30, end: 60 },
  offerNotch: { position: "absolute", top: -10, bottom: -10, width: 20, alignSelf: "center", start: "55%", borderRadius: 100 },
});
