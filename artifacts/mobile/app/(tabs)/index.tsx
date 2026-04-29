import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getCurrentResolved, distanceKm, type ResolvedAddress } from "@/lib/location";
import { registerForPush } from "@/lib/notifications";

type Cat = { id: string; title_ar: string; icon: string; color: string; sort: number };
type Provider = {
  id: string;
  rating: number | null;
  experience_years: number | null;
  current_lat: number | null;
  current_lng: number | null;
  available: boolean | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};
type Offer = { id: string; title_ar: string | null; desc_ar: string | null; discount: number | null };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { profile, session } = useAuth();
  const [loc, setLoc] = useState<ResolvedAddress | null>(null);
  const [locating, setLocating] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [offer, setOffer] = useState<Offer | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }, { data: o }] = await Promise.all([
        supabase.from("service_categories").select("*").neq("id", "all").order("sort").limit(8),
        supabase
          .from("providers")
          .select("id, rating, experience_years, current_lat, current_lng, available, profiles(full_name, avatar_url)")
          .eq("status", "approved")
          .limit(10),
        supabase.from("offers").select("*").eq("active", true).limit(1).maybeSingle(),
      ]);
      if (c) setCats(c as any);
      if (p) setProviders(p as any);
      if (o) setOffer(o as any);
      requestLocation();
      if (session?.user) registerForPush(session.user.id);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.card }]} onPress={() => router.push("/(tabs)/offers")}>
              <Feather name="gift" size={18} color={colors.primary} />
              <View style={[styles.notifDot, { backgroundColor: "#EF4444" }]} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.card }]} onPress={() => router.push("/search")}>
              <Feather name="search" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.card }]} onPress={() => requireAuth("/notifications")}>
              <Feather name="bell" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.greeting, { color: colors.foreground }]}>
              {profile?.full_name ? `مرحباً، ${profile.full_name.split(" ")[0]} 👋` : "مرحباً بك 👋"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>كيف يمكننا مساعدتك اليوم؟</Text>
          </View>
        </View>

        {/* Offers Banner */}
        {offer && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/(tabs)/offers")} style={styles.offersBanner}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offersBannerInner}>
              <Feather name="chevron-left" size={20} color="#FFFFFF" />
              <View style={styles.offersBannerContent}>
                <Text style={styles.offersBannerTitle}>{offer.title_ar || "عروض حصرية بانتظارك"}</Text>
                <Text style={styles.offersBannerSub}>{offer.desc_ar || `خصم حتى ${offer.discount || 30}%`}</Text>
              </View>
              <View style={styles.offersBannerIcon}><Feather name="gift" size={22} color="#FFFFFF" /></View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* MAP */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            <AppMap
              style={StyleSheet.absoluteFill}
              region={region}
              markers={nearbyProviders
                .filter((p) => p.current_lat && p.current_lng)
                .map((p) => ({ id: p.id, coordinate: { latitude: p.current_lat!, longitude: p.current_lng! }, color: colors.primary }))}
            />
            <View style={[styles.locationPill, { backgroundColor: colors.card }]}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.locationPillText, { color: colors.foreground }]} numberOfLines={1}>
                {loc?.formatted || (locating ? "جاري تحديد الموقع..." : "حدد موقعك")}
              </Text>
            </View>
            {loc && (
              <View style={styles.userLocationDot}>
                <View style={styles.userLocationPulse} />
                <View style={[styles.userLocationInner, { backgroundColor: colors.accent }]} />
              </View>
            )}
            <TouchableOpacity onPress={requestLocation} style={[styles.gpsBtn, { backgroundColor: colors.card }]}>
              {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => router.push("/services")}><Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text></TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الخدمات</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScroll}>
          {cats.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.85}
              style={[styles.serviceCard, { backgroundColor: colors.card }]}
              onPress={() => router.push({ pathname: "/services", params: { cat: cat.id } } as any)}
            >
              <View style={[styles.svcIconWrap, { backgroundColor: cat.color + "1A" }]}>
                <MaterialCommunityIcons name={cat.icon as any} size={28} color={cat.color} />
              </View>
              <Text style={[styles.serviceTitle, { color: colors.foreground }]} numberOfLines={2}>{cat.title_ar}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cleaners */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => router.push("/services")}><Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text></TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أقرب مزودين منك</Text>
        </View>

        {nearbyProviders.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="account-search-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد مزودين متاحين قريبين منك حالياً</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>جرّب لاحقاً أو وسّع نطاق البحث</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cleanersScroll}>
            {nearbyProviders.slice(0, 8).map((p) => {
              const initials = (p.profiles?.full_name || "؟").trim().split(" ").map((s) => s[0]).slice(0, 2).join("");
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.cleanerCard, { backgroundColor: colors.card }]}
                  onPress={() => router.push({ pathname: "/provider/[id]", params: { id: p.id } } as any)}
                >
                  <View style={[styles.cleanerAvatarMain, { backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 18, color: colors.primary }}>{initials}</Text>
                  </View>
                  <Text style={[styles.cleanerName, { color: colors.foreground }]} numberOfLines={1}>{p.profiles?.full_name || "مزود خدمة"}</Text>
                  <View style={styles.cleanerStats}>
                    <Text style={[styles.cleanerExp, { color: colors.mutedForeground }]}>خبرة {p.experience_years || 0} سنوات</Text>
                    <View style={styles.statDivider} />
                    <View style={styles.ratingRow}>
                      <Text style={[styles.ratingText, { color: colors.foreground }]}>{(p.rating || 0).toFixed(1)}</Text>
                      <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: p.available ? colors.successLight : colors.muted }]}>
                    <Text style={[styles.statusText, { color: p.available ? colors.success : colors.mutedForeground }]}>{p.available ? "متاح الآن" : "غير متاح"}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* AI Bot Card */}
        <TouchableOpacity activeOpacity={0.9} style={styles.botCardWrap} onPress={() => router.push("/help")}>
          <LinearGradient colors={[colors.accent, colors.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.botCard}>
            <View style={styles.botContent}>
              <Text style={styles.botTitle}>المساعد الذكي</Text>
              <Text style={styles.botSub}>اسأل عن أي خدمة وسنساعدك في اختيار الأنسب</Text>
            </View>
            <View style={styles.botIcon}><MaterialCommunityIcons name="robot-happy" size={28} color="#FFF" /></View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  notifDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: "#FFFFFF" },
  headerTitleContainer: { alignItems: "flex-end", flex: 1 },
  greeting: { fontFamily: "Tajawal_700Bold", fontSize: 17 },
  headerSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
  offersBanner: { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, overflow: "hidden", shadowColor: "#16C47F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  offersBannerInner: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  offersBannerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  offersBannerContent: { flex: 1, alignItems: "flex-end" },
  offersBannerTitle: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
  offersBannerSub: { color: "rgba(255,255,255,0.9)", fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  mapSection: { paddingHorizontal: 16, marginBottom: 14 },
  mapContainer: { height: 220, borderRadius: 22, overflow: "hidden", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  locationPill: { position: "absolute", top: 12, alignSelf: "center", flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, gap: 6, maxWidth: "85%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  locationPillText: { fontFamily: "Tajawal_700Bold", fontSize: 12, flex: 1 },
  userLocationDot: { position: "absolute", top: "50%", left: "50%", marginTop: -10, marginLeft: -10, width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  userLocationInner: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#FFFFFF" },
  userLocationPulse: { position: "absolute", width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(47, 128, 237, 0.2)" },
  gpsBtn: { position: "absolute", bottom: 12, left: 12, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17 },
  seeAll: { fontFamily: "Tajawal_600SemiBold", fontSize: 13 },
  servicesScroll: { paddingHorizontal: 12, gap: 12, marginBottom: 14, paddingVertical: 4 },
  serviceCard: { width: 92, height: 108, borderRadius: 18, alignItems: "center", justifyContent: "center", padding: 10, gap: 8, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  svcIconWrap: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  serviceTitle: { fontFamily: "Tajawal_600SemiBold", fontSize: 11, textAlign: "center" },
  cleanersScroll: { paddingHorizontal: 16, gap: 12 },
  cleanerCard: { width: 150, borderRadius: 22, padding: 14, alignItems: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cleanerAvatarMain: { width: 64, height: 64, borderRadius: 32, marginBottom: 10 },
  cleanerName: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 4 },
  cleanerStats: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 10 },
  cleanerExp: { fontFamily: "Tajawal_400Regular", fontSize: 10 },
  statDivider: { width: 1, height: 10, backgroundColor: "#E5E7EB" },
  ratingRow: { flexDirection: "row-reverse", alignItems: "center", gap: 2 },
  ratingText: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  statusText: { fontFamily: "Tajawal_600SemiBold", fontSize: 10 },
  emptyBox: { marginHorizontal: 16, padding: 24, borderRadius: 20, alignItems: "center", gap: 8 },
  emptyText: { fontFamily: "Tajawal_700Bold", fontSize: 14, textAlign: "center" },
  emptyHint: { fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "center" },
  botCardWrap: { marginHorizontal: 16, marginTop: 8, borderRadius: 22, overflow: "hidden", shadowColor: "#2F80ED", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 5 },
  botCard: { flexDirection: "row-reverse", alignItems: "center", padding: 16, gap: 12 },
  botIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  botContent: { flex: 1, alignItems: "flex-end" },
  botTitle: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  botSub: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 12, marginTop: 2 },
});
