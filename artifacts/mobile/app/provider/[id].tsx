import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useBooking } from "@/store/booking";
import { supabase } from "@/lib/supabase";
import { distanceKm, getCurrentResolved } from "@/lib/location";

type ProviderData = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  rating: number;
  experience_years: number;
  hourly_rate: number;
  current_lat: number | null;
  current_lng: number | null;
  bio: string | null;
};

type Review = { id: string; reviewer_name: string; rating: number; comment: string };

export default function ProviderDetail() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fav, setFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const booking = useBooking();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [provRes, me] = await Promise.all([
          supabase
            .from("providers")
            .select("id, rating, experience_years, hourly_rate, current_lat, current_lng, profiles(full_name, avatar_url)")
            .eq("id", id)
            .maybeSingle(),
          getCurrentResolved(),
        ]);
        if (cancelled) return;
        const row: any = provRes.data;
        if (row) {
          const p: ProviderData = {
            id: row.id,
            full_name: row.profiles?.full_name || "فني",
            avatar_url: row.profiles?.avatar_url || null,
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

        // Load reviews
        const { data: revRows } = await supabase
          .from("reviews")
          .select("id, rating, comment, profiles!reviews_user_id_fkey(full_name)")
          .eq("provider_id", id)
          .order("created_at", { ascending: false })
          .limit(5);
        if (!cancelled && revRows) {
          setReviews(revRows.map((r: any) => ({
            id: r.id,
            reviewer_name: r.profiles?.full_name || "عميل",
            rating: Number(r.rating || 5),
            comment: r.comment || "",
          })));
        }
      } catch (e) {
        console.log("[v0] provider detail load failed:", (e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.c, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const p = provider;
  if (!p) {
    return (
      <View style={[styles.c, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.mutedForeground }}>لم يتم العثور على المزود</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary }}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = p.full_name.trim().split(" ").map((s) => s[0]).slice(0, 2).join("");
  const eta = distance != null ? Math.max(3, Math.round((distance / 25) * 60)) : null;

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.primary + "30", "transparent"]} style={[styles.heroBg, { paddingTop: insets.top + 10 }]}>
          <View style={styles.topRow}>
            <TouchableOpacity style={[styles.icon, { backgroundColor: "#FFF" }]} onPress={() => setFav(!fav)}>
              <MaterialCommunityIcons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? colors.danger : colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.icon, { backgroundColor: "#FFF" }]}>
              <Feather name="share-2" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[styles.icon, { backgroundColor: "#FFF" }]} onPress={() => router.back()}>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <Image source={p.avatar_url ? { uri: p.avatar_url } : require("@/assets/images/default-avatar.png")} style={styles.avatar} />
            <View style={styles.verifyBadge}>
              <MaterialCommunityIcons name="check-decagram" size={20} color="#FFF" />
            </View>
            <Text style={[styles.n, { color: colors.foreground }]}>{p.full_name}</Text>
            <Text style={[styles.title, { color: colors.mutedForeground }]}>مزود خدمة</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statV, { color: colors.foreground }]}>{p.rating.toFixed(1)}</Text>
                <Text style={[styles.statL, { color: colors.mutedForeground }]}>التقييم</Text>
              </View>
              <View style={[styles.statSep, { backgroundColor: colors.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statV, { color: colors.foreground }]}>{reviews.length}</Text>
                <Text style={[styles.statL, { color: colors.mutedForeground }]}>التقييمات</Text>
              </View>
              <View style={[styles.statSep, { backgroundColor: colors.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statV, { color: colors.foreground }]}>{p.experience_years}</Text>
                <Text style={[styles.statL, { color: colors.mutedForeground }]}>سنوات خبرة</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Distance & ETA */}
        {distance != null && (
          <View style={[styles.distRow, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.primary} />
              <Text style={[styles.distT, { color: colors.primary }]}>{distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`}</Text>
            </View>
            {eta != null && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#8B5CF6" />
                <Text style={[styles.distT, { color: "#8B5CF6" }]}>~ {eta} دقيقة</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.row, { gap: 10, paddingHorizontal: 16, marginTop: 14 }]}>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.card, flex: 1 }]}>
            <Feather name="message-circle" size={18} color={colors.foreground} />
            <Text style={[styles.actT, { color: colors.foreground }]}>دردشة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.card, flex: 1 }]}>
            <Feather name="phone" size={18} color={colors.foreground} />
            <Text style={[styles.actT, { color: colors.foreground }]}>اتصال</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.card, flex: 1 }]}>
            <Feather name="share-2" size={18} color={colors.foreground} />
            <Text style={[styles.actT, { color: colors.foreground }]}>مشاركة الموقع</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews section */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={[styles.sT, { color: colors.foreground, marginBottom: 0 }]}>التقييمات</Text>
          </View>
          {reviews.length === 0 ? (
            <Text style={[styles.about, { color: colors.mutedForeground }]}>لا توجد تقييمات بعد</Text>
          ) : (
            reviews.map((rv) => (
              <View key={rv.id} style={[styles.review, { backgroundColor: colors.card }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[styles.rN, { color: colors.foreground }]}>{rv.reviewer_name}</Text>
                  <View style={{ flexDirection: "row" }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Feather key={s} name="star" size={11} color={s <= rv.rating ? colors.warning : colors.border} />
                    ))}
                  </View>
                </View>
                {rv.comment ? <Text style={[styles.rT, { color: colors.mutedForeground }]}>{rv.comment}</Text> : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            booking.setCleanerId(id || "");
            router.push("/booking");
          }}
        >
          <Feather name="arrow-left" size={18} color="#FFF" />
          <Text style={styles.bookBtnT}>احجز الآن</Text>
        </TouchableOpacity>
        <View style={styles.priceWrap}>
          <Text style={[styles.priceL, { color: colors.mutedForeground }]}>ابتداءً من</Text>
          <Text style={[styles.priceV, { color: colors.foreground }]}>{p.hourly_rate} <Text style={{ fontSize: 12, color: colors.mutedForeground }}>ر.س</Text></Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  heroBg: { paddingHorizontal: 16, paddingBottom: 18 },
  topRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  heroContent: { alignItems: "center", marginTop: 6 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: "#FFFFFF" },
  verifyBadge: { position: "absolute", bottom: 70, right: "33%", backgroundColor: "#16C47F", borderRadius: 12, padding: 2 },
  n: { fontFamily: "Tajawal_700Bold", fontSize: 20, marginTop: 10 },
  title: { fontFamily: "Tajawal_500Medium", fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12, backgroundColor: "#FFF", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18 },
  statBox: { alignItems: "center" },
  statV: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statL: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 1 },
  statSep: { width: 1, height: 22 },
  distRow: { flexDirection: "row", justifyContent: "center", gap: 24, marginHorizontal: 16, marginTop: 12, paddingVertical: 10, borderRadius: 14 },
  distT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  row: { flexDirection: "row" },
  actBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 11, borderRadius: 14, gap: 6 },
  actT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sT: { fontFamily: "Tajawal_700Bold", fontSize: 14, textAlign: "right", marginBottom: 8 },
  about: { fontFamily: "Tajawal_400Regular", fontSize: 12, textAlign: "right", lineHeight: 18 },
  review: { padding: 12, borderRadius: 14, marginBottom: 8 },
  rN: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  rT: { fontFamily: "Tajawal_400Regular", fontSize: 11, marginTop: 4, textAlign: "right" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  bookBtn: { flex: 1, height: 50, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  bookBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF" },
  priceWrap: { alignItems: "flex-end", marginRight: 12 },
  priceL: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  priceV: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
});
