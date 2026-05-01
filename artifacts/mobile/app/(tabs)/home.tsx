import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Image } from "react-native";
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

// Discount banners placed between every two rows of categories.
// Text is positioned in the empty right-side area of each banner.
type Banner = { img: any; title: string; subtitle: string; cta: string; titleColor: string; subColor: string; ctaBg: string; ctaText: string };
const HOME_OFFER_BANNERS: Banner[] = [
  {
    img: require("@/assets/services/offers/green.png"),
    title: "خصومات الربيع",
    subtitle: "وفر 20% على خدمات التنظيف العميق",
    cta: "احجز الآن",
    titleColor: "#1F6F3E",
    subColor: "#2F7A4D",
    ctaBg: "#2BA15F",
    ctaText: "#FFFFFF",
  },
  {
    img: require("@/assets/services/offers/orange.png"),
    title: "هدية الترحيب",
    subtitle: "كوبون بقيمة 50 ر.س لطلبك الأول",
    cta: "استلم الكوبون",
    titleColor: "#9A5B07",
    subColor: "#A6680E",
    ctaBg: "#F0A53A",
    ctaText: "#FFFFFF",
  },
  {
    img: require("@/assets/services/offers/purple.png"),
    title: "الباقة الشاملة",
    subtitle: "وفر 30% عند طلب 3 خدمات معاً",
    cta: "احجز الباقة",
    titleColor: "#5B2A99",
    subColor: "#6B36A6",
    ctaBg: "#8B5CF6",
    ctaText: "#FFFFFF",
  },
  {
    img: require("@/assets/services/offers/pink.png"),
    title: "تنظيف الكنب والسجاد",
    subtitle: "بخصم 25% لفترة محدودة",
    cta: "استفد الآن",
    titleColor: "#9F2C5A",
    subColor: "#AD3868",
    ctaBg: "#EC4899",
    ctaText: "#FFFFFF",
  },
];

// Soft, coupon-style background colors for offer cards (T043).
const OFFER_PALETTES: { bg: string; border: string; accent: string; text: string }[] = [
  { bg: "#FEF3C7", border: "#FDE68A", accent: "#F59E0B", text: "#92400E" }, // amber
  { bg: "#DBEAFE", border: "#BFDBFE", accent: "#3B82F6", text: "#1E40AF" }, // blue
  { bg: "#FCE7F3", border: "#FBCFE8", accent: "#EC4899", text: "#9D174D" }, // pink
  { bg: "#D1FAE5", border: "#A7F3D0", accent: "#10B981", text: "#065F46" }, // emerald
  { bg: "#EDE9FE", border: "#DDD6FE", accent: "#7C3AED", text: "#5B21B6" }, // violet
];

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
  const { t, isRTL } = useI18n();
  const { profile, session } = useAuth();
  const [loc, setLoc] = useState<ResolvedAddress | null>(null);
  const [locating, setLocating] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  const loadProviders = async () => {
    try {
      const { data } = await supabase
        .from("providers")
        .select("id, rating, experience_years, current_lat, current_lng, available, hourly_rate, profiles(full_name, avatar_url)")
        .eq("status", "approved")
        .eq("available", true)   // show only online providers
        .not("current_lat", "is", null) // must have a real location
        .not("current_lng", "is", null)
        .limit(20);
      if (data) setProviders(data as any);
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
      if (session?.user) {
        try {
          await registerForPush(session.user.id);
        } catch (e) {
          console.log("[v0] Push registration failed:", (e as Error).message);
        }
      }
    })();
  }, [session]);

  // T021 — Realtime subscription: refetch nearby providers whenever any provider row updates.
  // Use a unique topic per mount so a lingering channel from a previous mount (e.g. when the tab
  // is offscreened and reconnected by React) cannot collide and cause `.on()` to be called on an
  // already-subscribed channel ("cannot add postgres_changes callbacks after subscribe()").
  useEffect(() => {
    let cancelled = false;
    const topic = `home-providers-live-${Math.random().toString(36).slice(2, 10)}`;
    const ch = supabase.channel(topic);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "providers" }, () => {
      if (!cancelled) loadProviders();
    });
    ch.subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

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

  const requireAuth = (path: string) => {
    if (!session) router.push("/login");
    else router.push(path as any);
  };

  const mapHeight = Math.max(380, SCREEN_H * 0.55);
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <View style={[styles.container, { backgroundColor: "#F8FAFC" }]}>
      {/* FULLSCREEN MAP BACKGROUND (dark color sits behind the map only) */}
      <View style={[styles.mapBg, { height: mapHeight, backgroundColor: "#0F172A" }]}>
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

        {/* Search — compact iOS-style icon button */}
        <TouchableOpacity activeOpacity={0.95} onPress={() => router.push("/search")} style={styles.searchIconBtn}>
          <BlurView intensity={Platform.OS === "ios" ? 60 : 100} tint="light" style={styles.searchIconBlur}>
            <Feather name="search" size={20} color="#64748B" />
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* GPS button — inside the map, not above the scroll sheet */}
      <TouchableOpacity onPress={requestLocation} style={[styles.gpsBtn, { top: mapHeight - 100, zIndex: 4 }]}>
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

          {/* SERVICES — 2-column grid showing all 18 categories with discount banners between rows */}
          <View style={[styles.sectionHeader]}>
            <TouchableOpacity onPress={() => router.push("/services")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{t("see_all")}</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("services")}</Text>
          </View>

          <View style={styles.catGridWrap}>
            {(() => {
              const blocks: React.ReactNode[] = [];
              const rowsPerBlock = 2;
              const cardsPerRow = 2;
              const cardsPerBlock = rowsPerBlock * cardsPerRow; // 4
              const totalBlocks = Math.ceil(HOME_CATEGORY_CARDS.length / cardsPerBlock);
              for (let b = 0; b < totalBlocks; b++) {
                const slice = HOME_CATEGORY_CARDS.slice(b * cardsPerBlock, (b + 1) * cardsPerBlock);
                blocks.push(
                  <View key={`row-${b}`} style={styles.catGrid}>
                    {slice.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        activeOpacity={0.88}
                        style={styles.catCard}
                        onPress={() => router.push({ pathname: "/services", params: { cat: c.id } } as any)}
                      >
                        <View style={styles.catCardSurface}>
                          <Image source={c.img} style={styles.catCardImage} resizeMode="cover" />
                        </View>
                        <Text style={styles.catCardTitle} numberOfLines={1}>{c.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
                // Insert a discount banner between every two rows of categories
                // (i.e. after each block, except the last one).
                if (b < totalBlocks - 1 && b < HOME_OFFER_BANNERS.length) {
                  const ban = HOME_OFFER_BANNERS[b];
                  blocks.push(
                    <TouchableOpacity
                      key={`ban-${b}`}
                      activeOpacity={0.92}
                      style={styles.banner}
                      onPress={() => router.push("/(tabs)/offers")}
                    >
                      <Image source={ban.img} style={styles.bannerImg} resizeMode="cover" />
                      <View style={styles.bannerTextOverlay} pointerEvents="none">
                        <Text style={[styles.bannerTitle, { color: ban.titleColor }]} numberOfLines={1}>
                          {ban.title}
                        </Text>
                        <Text style={[styles.bannerSub, { color: ban.subColor }]} numberOfLines={2}>
                          {ban.subtitle}
                        </Text>
                        <View style={[styles.bannerCta, { backgroundColor: ban.ctaBg }]}>
                          <Text style={[styles.bannerCtaText, { color: ban.ctaText }]}>{ban.cta}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }
              }
              return blocks;
            })()}
          </View>

          {/* OFFERS (T042: moved below services, T043: soft coupon-style colors) */}
          {offers.length > 0 && (
            <>
              <View style={[styles.sectionHeader]}>
                <TouchableOpacity onPress={() => router.push("/(tabs)/offers")}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>{t("see_all")}</Text>
                </TouchableOpacity>
                <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("offers")}</Text>
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
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
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
                        {/* T043: ticket-style notch + icon */}
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

          {/* PROVIDERS */}
          <View style={[styles.sectionHeader]}>
            <TouchableOpacity onPress={() => router.push("/services")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{t("see_all")}</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("nearby_pros")}</Text>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapBg: { position: "absolute", left: 0, right: 0, top: 0 },
  topFade: { position: "absolute", top: 0, left: 0, right: 0 },

  floatHeader: { position: "absolute", left: 0, right: 0, paddingHorizontal: 14, gap: 12, zIndex: 5 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },

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
    flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 50, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
  },
  searchPlaceholder: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#94A3B8", textAlign: "right" },
  searchAction: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchIconBtn: { borderRadius: 14, overflow: "hidden" },
  searchIconBlur: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
  },

  userLocationDot: { position: "absolute", top: "45%", left: "50%", marginLeft: -12, marginTop: -12, alignItems: "center", justifyContent: "center", width: 24, height: 24 },
  userLocationInner: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: "#fff" },
  userLocationPulse: { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(22,196,127,0.25)" },

  gpsBtn: { position: "absolute", right: 16, borderRadius: 16, overflow: "hidden", zIndex: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  gpsBlur: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },

  sheet: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 14,
    minHeight: 600,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetGrabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 14 },

  offerCard: { width: 290, height: 110, borderRadius: 20, overflow: "hidden" },
  offerInner: { flex: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  offerBadge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginBottom: 6 },
  offerBadgeText: { color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 10 },
  offerTitle: { color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 3 },
  offerSub: { color: "rgba(255,255,255,0.95)", fontFamily: "Tajawal_500Medium", fontSize: 11, lineHeight: 16 },
  discountChip: { backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginTop: 8 },
  discountText: { color: "#0F172A", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  offerIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, marginTop: 6 },
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
    flexDirection: "row",
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
    backgroundColor: "#FFFFFF",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: "#E2E8F0",
    marginBottom: 8,
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

  // Discount banners between rows
  banner: {
    width: "100%",
    aspectRatio: 1528 / 187, // matches source banner aspect ratio
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginVertical: 2,
  },
  bannerImg: {
    width: "100%",
    height: "100%",
  },
  // Text sits in the empty right-half of the banner (RTL layout).
  bannerTextOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: "4%",
    width: "55%",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  bannerTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 13.5,
    textAlign: "right",
  },
  bannerSub: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 10.5,
    textAlign: "right",
    marginTop: 2,
    lineHeight: 14,
  },
  bannerCta: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  bannerCtaText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 10,
  },

  emptyBox: { marginHorizontal: 16, padding: 26, borderRadius: 18, alignItems: "center", gap: 8, backgroundColor: "#fff" },
  emptyText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#64748B", textAlign: "center" },

  provCard: { width: 158, backgroundColor: "#fff", borderRadius: 22, padding: 14, alignItems: "center", shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3, marginBottom: 4, borderWidth: 0.5, borderColor: "#F1F5F9" },
  provAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E0F7EE", alignItems: "center", justifyContent: "center", marginBottom: 10, position: "relative" },
  provInitials: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#16C47F" },
  provDot: { position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#10B981", borderWidth: 2.5, borderColor: "#fff" },
  provName: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A", marginBottom: 4 },
  provMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  provRating: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#0F172A" },
  provDivider: { color: "#CBD5E1", fontSize: 10 },
  provExp: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#64748B" },
  provPrice: { backgroundColor: "#F0FDF4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  provPriceText: { color: "#16C47F", fontFamily: "Tajawal_700Bold", fontSize: 10 },

  botWrap: { marginHorizontal: 16, marginTop: 22, borderRadius: 22, overflow: "hidden", shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 5 },
  botCard: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14, position: "relative", overflow: "hidden" },
  botIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  botContent: { flex: 1, alignItems: "flex-end" },
  botTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  botBadgeAi: { backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  botBadgeAiText: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 10, letterSpacing: 1 },
  botTitle: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  botSub: { color: "rgba(255,255,255,0.92)", fontFamily: "Tajawal_500Medium", fontSize: 11.5, marginTop: 4 },
  botOrbA: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.10)", top: -40, left: -30 },
  botOrbB: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.06)", bottom: -30, right: 60 },
  offerNotch: { position: "absolute", top: -10, bottom: -10, width: 20, alignSelf: "center", left: "55%", borderRadius: 100 },
});
