import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Platform, ActivityIndicator, Linking, Alert, Share, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useBooking } from "@/store/booking";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { distanceKm, getCurrentResolved } from "@/lib/location";

type ProviderData = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  rating: number;
  experience_years: number;
  hourly_rate: number;
  current_lat: number | null;
  current_lng: number | null;
  bio: string | null;
};
type Review = { id: string; reviewer_name: string; rating: number; comment: string };
type ServiceItem = { id: string; title_ar: string };

const DEFAULT_SERVICES: ServiceItem[] = [
  { id: "s1", title_ar: "تنظيف المنازل" },
  { id: "s2", title_ar: "تنظيف عميق شامل" },
  { id: "s3", title_ar: "تنظيف المطابخ" },
  { id: "s4", title_ar: "تعقيم وتطهير" },
];

const SERVICE_ICONS: Record<string, string> = {
  "تنظيف المنازل": "home",
  "تنظيف عميق شامل": "water",
  "تنظيف المطابخ": "fire",
  "تعقيم وتطهير": "shield-check",
  "تنظيف الفلل": "home-city",
  "تنظيف المكاتب": "office-building",
  "غسيل السجاد": "layers",
  "تنظيف النوافذ": "window-open",
};

export default function ProviderDetail() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fav, setFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const booking = useBooking();
  const { session } = useAuth();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [provRes, me] = await Promise.all([
          supabase
            .from("providers")
            .select("id, rating, experience_years, hourly_rate, current_lat, current_lng, profiles(full_name, avatar_url, phone)")
            .eq("id", id)
            .maybeSingle(),
          getCurrentResolved(),
        ]);
        if (cancelled) return;
        const row: any = provRes.data;
        if (row) {
          const p: ProviderData = {
            id: row.id,
            full_name: row.profiles?.full_name || "مزود خدمة",
            avatar_url: row.profiles?.avatar_url || null,
            phone: row.profiles?.phone || null,
            rating: Number(row.rating || 0),
            experience_years: Number(row.experience_years || 0),
            hourly_rate: Number(row.hourly_rate || 0),
            current_lat: row.current_lat,
            current_lng: row.current_lng,
            bio: null,
          };
          setProvider(p);
          if (me && row.current_lat && row.current_lng) {
            setDistance(distanceKm({ lat: me.lat, lng: me.lng }, { lat: row.current_lat, lng: row.current_lng }));
          }
        }

        // Load reviews (no FK join to avoid schema issues)
        const { data: revRows } = await supabase
          .from("reviews")
          .select("id, rating, comment, user_id")
          .eq("provider_id", id)
          .order("created_at", { ascending: false })
          .limit(5);
        if (!cancelled && revRows) {
          setReviews(revRows.map((r: any) => ({
            id: r.id,
            reviewer_name: "عميل",
            rating: Number(r.rating || 5),
            comment: r.comment || "",
          })));
        }

        // Load services from completed bookings
        const { data: svcRows } = await supabase
          .from("bookings")
          .select("services:service_id(id, title_ar)")
          .eq("provider_id", id)
          .eq("status", "completed")
          .limit(20);
        if (!cancelled && svcRows) {
          const seen = new Set<string>();
          const unique: ServiceItem[] = [];
          for (const b of svcRows as any[]) {
            const s = b.services;
            if (s && !seen.has(s.id)) { seen.add(s.id); unique.push(s); }
          }
          setServices(unique.length > 0 ? unique : DEFAULT_SERVICES);
        } else if (!cancelled) {
          setServices(DEFAULT_SERVICES);
        }
      } catch (e) {
        console.log("[v0] provider detail load failed:", (e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleChat = async () => {
    if (!session?.user) { router.push("/login" as any); return; }
    if (!id) return;
    const provName = provider?.full_name || "مزود الخدمة";
    // Find or create a chat room between user and provider
    const { data: existing } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("provider_id", id)
      .maybeSingle();
    let roomId = existing?.id;
    if (!roomId) {
      const { data: newRoom } = await supabase
        .from("chat_rooms")
        .insert({ user_id: session.user.id, provider_id: id })
        .select("id")
        .maybeSingle();
      roomId = newRoom?.id;
    }
    router.push({ pathname: "/chat-detail", params: { roomId, name: provName } } as any);
  };

  const handleCall = () => {
    if (!provider?.phone) { Alert.alert("لا يوجد رقم هاتف متاح لهذا المزود"); return; }
    Linking.openURL(`tel:${provider.phone}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `مزود خدمة - ${provider?.full_name}`,
        message: `تفضل بالتعرف على مزود الخدمة ${provider?.full_name} — تقييم ${provider?.rating?.toFixed(1)} نجوم على تطبيق نظافة`,
      });
    } catch {}
  };

  if (loading) {
    return (
      <View style={[s.c, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const p = provider;
  if (!p) {
    return (
      <View style={[s.c, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.mutedForeground }}>لم يتم العثور على المزود</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary }}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = p.full_name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("");
  const eta = distance != null ? Math.max(3, Math.round((distance / 25) * 60)) : null;
  const BOTTOM_H = 80 + insets.bottom;

  return (
    <View style={[s.c, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: BOTTOM_H + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient */}
        <LinearGradient
          colors={[colors.primary + "40", colors.accentLight]}
          style={[s.heroBg, { paddingTop: insets.top + 10 }]}
        >
          {/* Top row actions */}
          <View style={s.topRow}>
            <TouchableOpacity style={[s.icon, { backgroundColor: "#FFF" }]} onPress={() => router.back()}>
              <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={20} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[s.icon, { backgroundColor: "#FFF" }]} onPress={handleShare}>
              <Feather name="share-2" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.icon, { backgroundColor: "#FFF" }]} onPress={() => setFav(!fav)}>
              <MaterialCommunityIcons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? colors.danger : colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Provider hero */}
          <View style={s.heroContent}>
            <View style={s.avatarWrap}>
              <Image
                source={p.avatar_url ? { uri: p.avatar_url } : require("@/assets/images/default-avatar.png")}
                style={s.avatar}
              />
              <View style={s.verifyBadge}>
                <MaterialCommunityIcons name="check-decagram" size={20} color="#FFF" />
              </View>
            </View>
            <Text style={[s.name, { color: colors.foreground }]}>{p.full_name}</Text>
            <Text style={[s.title, { color: colors.mutedForeground }]}>مزود خدمة معتمد</Text>

            {/* Stats row */}
            <View style={[s.statsRow, { backgroundColor: "#FFF", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }]}>
              <View style={s.statBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                  <Text style={[s.statV, { color: colors.foreground }]}>{p.rating > 0 ? p.rating.toFixed(1) : "جديد"}</Text>
                </View>
                <Text style={[s.statL, { color: colors.mutedForeground }]}>التقييم</Text>
              </View>
              <View style={[s.statSep, { backgroundColor: colors.border }]} />
              <View style={s.statBox}>
                <Text style={[s.statV, { color: colors.foreground }]}>{reviews.length}+</Text>
                <Text style={[s.statL, { color: colors.mutedForeground }]}>تقييمات</Text>
              </View>
              <View style={[s.statSep, { backgroundColor: colors.border }]} />
              <View style={s.statBox}>
                <Text style={[s.statV, { color: colors.foreground }]}>{p.experience_years}</Text>
                <Text style={[s.statL, { color: colors.mutedForeground }]}>سنوات خبرة</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Distance & ETA */}
        {distance != null && (
          <View style={[s.distRow, { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 12 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[s.distIcon, { backgroundColor: colors.accentLight }]}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.accent} />
              </View>
              <Text style={[s.distT, { color: colors.accent }]}>{distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`}</Text>
            </View>
            {eta != null && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={[s.distIcon, { backgroundColor: colors.accentPurpleLight }]}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={colors.accentPurple} />
                </View>
                <Text style={[s.distT, { color: colors.accentPurple }]}>~ {eta} دقيقة</Text>
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={[s.actRow, { marginHorizontal: 16, marginTop: 12 }]}>
          <TouchableOpacity
            style={[s.actBtn, { backgroundColor: colors.card, flex: 1, borderWidth: 1.5, borderColor: colors.primaryLight }]}
            onPress={handleChat}
            activeOpacity={0.85}
          >
            <Feather name="message-circle" size={18} color={colors.primary} />
            <Text style={[s.actT, { color: colors.primary }]}>دردشة</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actBtn, { backgroundColor: colors.card, flex: 1, borderWidth: 1.5, borderColor: colors.successLight }]}
            onPress={handleCall}
            activeOpacity={0.85}
          >
            <Feather name="phone" size={18} color={colors.success} />
            <Text style={[s.actT, { color: colors.success }]}>اتصال</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actBtn, { backgroundColor: colors.card, flex: 1, borderWidth: 1.5, borderColor: colors.border }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Feather name="share-2" size={18} color={colors.mutedForeground} />
            <Text style={[s.actT, { color: colors.mutedForeground }]}>مشاركة</Text>
          </TouchableOpacity>
        </View>

        {/* Services section */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.foreground }]}>الخدمات المقدمة</Text>
          <View style={s.servicesGrid}>
            {services.map((svc, i) => {
              const icon = SERVICE_ICONS[svc.title_ar] || "broom";
              const bgColors = ["#DBEAFE", "#D7F5E8", "#EDE9FE", "#FEF3C7", "#FFE4E6", "#DCFCE7"];
              const iconColors = [colors.accent, colors.success, colors.accentPurple, "#F59E0B", "#EF4444", "#16C47F"];
              const bg = bgColors[i % bgColors.length];
              const ic = iconColors[i % iconColors.length];
              return (
                <View key={svc.id || i} style={[s.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[s.serviceIconBox, { backgroundColor: bg }]}>
                    <MaterialCommunityIcons name={icon as any} size={22} color={ic} />
                  </View>
                  <Text style={[s.serviceTitle, { color: colors.foreground }]} numberOfLines={2}>{svc.title_ar}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reviews section */}
        <View style={s.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={[s.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>آراء العملاء</Text>
            {reviews.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 }}>
                <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
                <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#92600A" }}>{p.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          {reviews.length === 0 ? (
            <View style={[s.emptyReviews, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons name="star-outline" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyT, { color: colors.mutedForeground }]}>لا توجد تقييمات بعد</Text>
            </View>
          ) : (
            reviews.map((rv) => (
              <View key={rv.id} style={[s.review, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[s.reviewAvatar, { backgroundColor: colors.primaryLight }]}>
                      <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary, fontSize: 12 }}>{rv.reviewer_name.charAt(0)}</Text>
                    </View>
                    <Text style={[s.rN, { color: colors.foreground }]}>{rv.reviewer_name}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((st) => (
                      <MaterialCommunityIcons key={st} name={st <= rv.rating ? "star" : "star-outline"} size={12} color={st <= rv.rating ? "#F59E0B" : colors.border} />
                    ))}
                  </View>
                </View>
                {rv.comment ? <Text style={[s.rT, { color: colors.mutedForeground }]}>{rv.comment}</Text> : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom bar — FIXED layout */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[s.bookBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            booking.setCleanerId(id || "");
            router.push("/booking" as any);
          }}
          activeOpacity={0.88}
        >
          <Text style={s.bookBtnT}>احجز الآن</Text>
          <Feather name={I18nManager.isRTL ? "arrow-left" : "arrow-right"} size={18} color="#FFF" />
        </TouchableOpacity>
        <View style={s.priceWrap}>
          <Text style={[s.priceL, { color: colors.mutedForeground }]}>ابتداءً من</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
            <Text style={[s.priceV, { color: colors.foreground }]}>{p.hourly_rate}</Text>
            <Text style={[s.priceCurr, { color: colors.mutedForeground }]}>ر.س</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1 },
  heroBg: { paddingHorizontal: 16, paddingBottom: 20 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  icon: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  heroContent: { alignItems: "center" },
  avatarWrap: { position: "relative", marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#FFFFFF" },
  verifyBadge: { position: "absolute", bottom: 2, end: 0, backgroundColor: "#16C47F", borderRadius: 12, padding: 2, borderWidth: 2, borderColor: "#FFF" },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 20, textAlign: "center" },
  title: { fontFamily: "Tajawal_500Medium", fontSize: 12, marginTop: 3 },
  statsRow: {
    flexDirection: "row", alignItems: "center", gap: 14, marginTop: 14,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18,
  },
  statBox: { alignItems: "center", minWidth: 60 },
  statV: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statL: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 2 },
  statSep: { width: 1, height: 26 },

  distRow: { flexDirection: "row", justifyContent: "center", gap: 28, padding: 12, borderRadius: 16 },
  distIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  distT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },

  actRow: { flexDirection: "row", gap: 10 },
  actBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 12, borderRadius: 16, gap: 6,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  actT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 12 },

  servicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCard: {
    width: "47%", padding: 14, borderRadius: 18, alignItems: "center", gap: 8,
    borderWidth: 1,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  serviceIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  serviceTitle: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "center" },

  emptyReviews: { padding: 28, borderRadius: 16, alignItems: "center", gap: 8 },
  emptyT: { fontFamily: "Tajawal_500Medium", fontSize: 13 },

  review: { padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  reviewAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rN: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  rT: { fontFamily: "Tajawal_400Regular", fontSize: 12, lineHeight: 18 },

  bottomBar: {
    position: "absolute", bottom: 0, start: 0, end: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: "#F1F5F9",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
    gap: 14,
  },
  priceWrap: { alignItems: "flex-end" },
  priceL: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  priceV: { fontFamily: "Tajawal_700Bold", fontSize: 20 },
  priceCurr: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  bookBtn: {
    flex: 1, height: 52, borderRadius: 18, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  bookBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFF" },
});
