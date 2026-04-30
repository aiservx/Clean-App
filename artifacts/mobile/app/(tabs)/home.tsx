import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Image, ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getCurrentResolved, distanceKm, type ResolvedAddress } from "@/lib/location";
import { registerForPush } from "@/lib/notifications";
import { FALLBACK_CATEGORIES } from "@/lib/serviceImages";
import { useI18n } from "@/lib/i18n";

const SERVICE_CARD_DATA: Record<string, { image: ImageSourcePropType; bgColor: string }> = {
  homes:     { image: require("@/assets/images/illustration-vacuum.png"), bgColor: "#D1FAE5" },
  deep:      { image: require("@/assets/images/illustration-bucket.png"), bgColor: "#DBEAFE" },
  offices:   { image: require("@/assets/images/illustration-office.png"), bgColor: "#FEF3C7" },
  furniture: { image: require("@/assets/images/illustration-armchair.png"), bgColor: "#FCE7F3" },
  kitchens:  { image: require("@/assets/images/illustration-bucket.png"), bgColor: "#FFF7ED" },
  villas:    { image: require("@/assets/images/illustration-vacuum.png"), bgColor: "#EDE9FE" },
  bathrooms: { image: require("@/assets/images/illustration-bucket.png"), bgColor: "#ECFEFF" },
  tanks:     { image: require("@/assets/images/illustration-bucket.png"), bgColor: "#E0F2FE" },
};

const { height: SCREEN_H } = Dimensions.get("window");

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

  useEffect(() => {
    (async () => {
      try {
        const [catsRes, provRes, offersRes] = await Promise.all([
          supabase.from("service_categories").select("*").order("sort").limit(8),
          supabase
            .from("providers")
            .select("id, rating, experience_years, current_lat, current_lng, available, hourly_rate, profiles(full_name, avatar_url)")
            .eq("status", "approved")
            .limit(10),
          supabase.from("offers").select("*").eq("active", true).limit(5),
        ]);
        const dbCats = (catsRes.data || []) as Cat[];
        // Fall back to static categories so the home page is never empty
        setCats(dbCats.length > 0 ? dbCats : (FALLBACK_CATEGORIES as any));
        if (provRes.data) setProviders(provRes.data as any);
        if (offersRes.data) setOffers(offersRes.data as any);
      } catch {
        setCats(FALLBACK_CATEGORIES as any);
      }
      requestLocation();
      if (session?.user) {
        try {
          await registerForPush(session.user.id);
        } catch (e) {
          console.log("[v0] Push registration failed:", (e as Error).message);
        }
      }
    })();
  }, [session]);

  const requestLocation = async () => {
    setLocating(true);
    const r = await getCurrentResolved();
    if (r) setLoc(r);
    setLocating(false);
  };

  const region = useMemo(
    () => ({
      latitude: loc?.lat ?? 24.7136,
      longitude: loc?.lng ?? 46.6753,
      latitudeDelta: 0.025,
      longitudeDelta: 0.025,
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

  const requireAuth = (path: string) => {
    if (!session) router.push("/login");
    else router.push(path as any);
  };

  const mapHeight = Math.max(380, SCREEN_H * 0.55);
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <View style={[styles.container, { backgroundColor: "#0F172A" }]}>
      {/* FULLSCREEN MAP BACKGROUND */}
      <View style={[styles.mapBg, { height: mapHeight }]}>
        <AppMap
          style={StyleSheet.absoluteFill}
          region={region}
          markers={nearbyProviders
            .filter((p) => p.current_lat && p.current_lng)
            .map((p) => ({ id: p.id, coordinate: { latitude: p.current_lat!, longitude: p.current_lng! }, color: colors.primary }))}
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
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Search bar floating */}
        <TouchableOpacity activeOpacity={0.95} onPress={() => router.push("/search")} style={styles.searchWrap}>
          <BlurView intensity={Platform.OS === "ios" ? 60 : 100} tint="light" style={styles.searchBlur}>
            <Feather name="search" size={18} color="#64748B" />
            <Text style={styles.searchPlaceholder}>{t("search_placeholder")}</Text>
            <View style={[styles.searchAction, { backgroundColor: colors.primary }]}>
              <Ionicons name="options-outline" size={16} color="#fff" />
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* GPS button on map */}
      <TouchableOpacity onPress={requestLocation} style={[styles.gpsBtn, { top: insets.top + 175 }]}>
        <BlurView intensity={Platform.OS === "ios" ? 70 : 100} tint="light" style={styles.gpsBlur}>
          {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />}
        </BlurView>
      </TouchableOpacity>

      {/* SCROLLABLE SHEET on top */}
      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ paddingTop: mapHeight - 28, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* SHEET */}
        <View style={styles.sheet}>
          <View style={styles.sheetGrabber} />

          {/* OFFERS */}
          {offers.length > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              style={{ marginBottom: 18, marginTop: 4 }}
            >
              {offers.map((o, idx) => (
                <TouchableOpacity key={o.id} activeOpacity={0.9} onPress={() => router.push("/(tabs)/offers")} style={styles.offerCard}>
                  <LinearGradient
                    colors={idx % 2 === 0 ? ["#16C47F", "#0EA968"] : ["#3B82F6", "#1E40AF"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.offerInner}
                  >
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <View style={styles.offerBadge}>
                        <Text style={styles.offerBadgeText}>عرض</Text>
                      </View>
                      <Text style={styles.offerTitle} numberOfLines={1}>{o.title_ar}</Text>
                      <Text style={styles.offerSub} numberOfLines={2}>{o.desc_ar}</Text>
                      {!!o.discount && (
                        <View style={styles.discountChip}>
                          <Text style={styles.discountText}>خصم {o.discount}%</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.offerIcon}>
                      <Feather name="gift" size={28} color="#fff" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* SERVICES */}
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => router.push("/services")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{t("see_all")}</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>{t("services")}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
            style={{ marginBottom: 22 }}
          >
            {cats.slice(0, 8).map((cat) => {
              const cardData = SERVICE_CARD_DATA[cat.id];
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.88}
                  style={styles.svcCard}
                  onPress={() => router.push({ pathname: "/services", params: { cat: cat.id } } as any)}
                >
                  <View style={[styles.svcCardImageWrap, { backgroundColor: cardData?.bgColor || "#F1F5F9" }]}>
                    {cardData ? (
                      <Image source={cardData.image} style={styles.svcCardImage} resizeMode="contain" />
                    ) : (
                      <MaterialCommunityIcons name={(cat.icon as any) || "broom"} size={36} color={cat.color || "#16C47F"} />
                    )}
                  </View>
                  <Text style={styles.svcCardTitle} numberOfLines={1}>{cat.title_ar}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* PROVIDERS */}
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => router.push("/services")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{t("see_all")}</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>{t("nearby_pros")}</Text>
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
                      <Text style={styles.provInitials}>{initials}</Text>
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

          {/* AI BOT */}
          <TouchableOpacity activeOpacity={0.92} style={styles.botWrap} onPress={() => router.push("/help")}>
            <LinearGradient colors={["#7C3AED", "#4F46E5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.botCard}>
              <View style={styles.botContent}>
                <Text style={styles.botTitle}>{t("ai_assistant")}</Text>
                <Text style={styles.botSub}>{t("ai_assistant_sub")}</Text>
              </View>
              <View style={styles.botIcon}>
                <MaterialCommunityIcons name="robot-happy" size={30} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function shade(hex: string, percent: number) {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map((c) => parseInt(c, 16));
  const f = (n: number) => Math.max(0, Math.min(255, Math.round(n + (n * percent) / 100)));
  return `#${[f(r), f(g), f(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapBg: { position: "absolute", left: 0, right: 0, top: 0 },
  topFade: { position: "absolute", top: 0, left: 0, right: 0 },

  floatHeader: { position: "absolute", left: 0, right: 0, paddingHorizontal: 14, gap: 12, zIndex: 5 },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },

  headerIconBtn: { borderRadius: 14, overflow: "hidden" },
  iconBlur: {
    width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)",
  },
  notifDot: { position: "absolute", top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", borderWidth: 1, borderColor: "#fff" },

  greetingBlur: {
    flex: 1, height: 44, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)",
    alignItems: "flex-end", overflow: "hidden",
  },
  greetingText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A" },
  greetingSub: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#475569", marginTop: 1 },

  searchWrap: { borderRadius: 18, overflow: "hidden" },
  searchBlur: {
    flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 50, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
  },
  searchPlaceholder: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#94A3B8", textAlign: "right" },
  searchAction: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  userLocationDot: { position: "absolute", top: "45%", left: "50%", marginLeft: -12, marginTop: -12, alignItems: "center", justifyContent: "center", width: 24, height: 24 },
  userLocationInner: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: "#fff" },
  userLocationPulse: { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(22,196,127,0.25)" },

  gpsBtn: { position: "absolute", left: 16, borderRadius: 14, overflow: "hidden", zIndex: 6 },
  gpsBlur: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.85)" },

  sheet: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    minHeight: 600,
  },
  sheetGrabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 14 },

  offerCard: { width: 290, height: 110, borderRadius: 20, overflow: "hidden" },
  offerInner: { flex: 1, padding: 14, flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  offerBadge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginBottom: 6 },
  offerBadgeText: { color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 10 },
  offerTitle: { color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 3 },
  offerSub: { color: "rgba(255,255,255,0.95)", fontFamily: "Tajawal_500Medium", fontSize: 11, lineHeight: 16 },
  discountChip: { backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginTop: 8 },
  discountText: { color: "#0F172A", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  offerIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },

  sectionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, marginTop: 6 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#0F172A" },
  seeAll: { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  svcCard: {
    width: 140,
    alignItems: "center",
    marginBottom: 4,
  },
  svcCardImageWrap: {
    width: 128,
    height: 115,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  svcCardImage: { width: 80, height: 80 },
  svcCardTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 13.5,
    color: "#1E293B",
    textAlign: "center",
  },

  emptyBox: { marginHorizontal: 16, padding: 26, borderRadius: 18, alignItems: "center", gap: 8, backgroundColor: "#fff" },
  emptyText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#64748B", textAlign: "center" },

  provCard: { width: 158, backgroundColor: "#fff", borderRadius: 22, padding: 14, alignItems: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginBottom: 4 },
  provAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E0F7EE", alignItems: "center", justifyContent: "center", marginBottom: 10, position: "relative" },
  provInitials: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#16C47F" },
  provDot: { position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#10B981", borderWidth: 2.5, borderColor: "#fff" },
  provName: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A", marginBottom: 4 },
  provMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginBottom: 8 },
  provRating: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#0F172A" },
  provDivider: { color: "#CBD5E1", fontSize: 10 },
  provExp: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#64748B" },
  provPrice: { backgroundColor: "#F0FDF4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  provPriceText: { color: "#16C47F", fontFamily: "Tajawal_700Bold", fontSize: 10 },

  botWrap: { marginHorizontal: 16, marginTop: 22, borderRadius: 22, overflow: "hidden", shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 5 },
  botCard: { flexDirection: "row-reverse", alignItems: "center", padding: 16, gap: 14 },
  botIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  botContent: { flex: 1, alignItems: "flex-end" },
  botTitle: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  botSub: { color: "rgba(255,255,255,0.9)", fontFamily: "Tajawal_500Medium", fontSize: 11.5, marginTop: 3 },
});
