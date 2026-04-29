import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import FloatingTabBar from "@/components/FloatingTabBar";
import { useBooking, type ServiceItem } from "@/store/booking";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

type Cat = { id: string; title_ar: string; icon: string; color: string };
type Svc = { id: string; category_id: string | null; title_ar: string; desc_ar: string | null; base_price: number; image_url: string | null; duration_min: number };

// Soft pastel gradient for image area per category
const PALETTE: Record<string, [string, string]> = {
  homes: ["#D7F5E8", "#B3E8CC"],
  deep: ["#DCEBFF", "#B6D2FF"],
  offices: ["#FEF3C7", "#FCD68A"],
  villas: ["#EDE9FE", "#D5C9FB"],
  apartments: ["#CFFAFE", "#A4EAF1"],
  furniture: ["#FCE7F3", "#F8BFD9"],
  mattresses: ["#FCE7F3", "#FCC2DC"],
  kitchens: ["#FEE2E2", "#FCA5A5"],
  bathrooms: ["#E0F2FE", "#BAE0FB"],
  facades: ["#D1FAE5", "#A7F3D0"],
  tanks: ["#DBEAFE", "#BFDBFE"],
  ac: ["#CFFAFE", "#A5F3FC"],
  postbuild: ["#F3E8FF", "#E9D5FF"],
  cars: ["#FEF9C3", "#FDE68A"],
  pools: ["#CCFBF1", "#99F6E4"],
  gardens: ["#ECFCCB", "#D9F99D"],
  mosques: ["#DCFCE7", "#BBF7D0"],
  schools: ["#EDE9FE", "#DDD6FE"],
};

const CAT_ICON_MAP: Record<string, string> = {
  homes: "home", deep: "shield-check", offices: "briefcase", villas: "home-city",
  apartments: "home-modern", furniture: "sofa", mattresses: "bed", kitchens: "silverware-fork-knife",
  bathrooms: "shower", facades: "window-closed", tanks: "water", ac: "air-conditioner",
  postbuild: "hammer-wrench", cars: "car-wash", pools: "pool", gardens: "flower",
  mosques: "mosque", schools: "school",
};

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const booking = useBooking();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ cat?: string }>();
  const [activeCategory, setActiveCategory] = useState<string>(params.cat || "all");
  const [cats, setCats] = useState<Cat[]>([{ id: "all", title_ar: "الكل", icon: "grid", color: "#16C47F" } as any]);
  const [services, setServices] = useState<Svc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("service_categories").select("*").order("sort"),
        supabase.from("services").select("*").eq("is_active", true).order("sort"),
      ]);
      if (c) setCats(c as any);
      if (s) setServices(s as any);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return services;
    return services.filter((s) => s.category_id === activeCategory);
  }, [services, activeCategory]);

  const onSelectService = (svc: Svc) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (!session) {
      router.push("/login");
      return;
    }
    const cat = cats.find((c) => c.id === svc.category_id);
    booking.setService({
      id: svc.id,
      title: svc.title_ar,
      price: Number(svc.base_price),
      desc: svc.desc_ar || "",
      image: require("@/assets/images/illustration-sofa.png"),
      color: cat?.color || colors.primary,
    });
    router.push("/booking");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.card }]} onPress={() => router.push("/help")}>
          <Feather name="headphones" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>خدماتنا</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>اختر الخدمة التي تناسب احتياجك</Text>
        </View>
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.card }]} onPress={() => router.back()}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {cats.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync(); setActiveCategory(cat.id); }}
                activeOpacity={0.85}
                style={[styles.categoryPill, { backgroundColor: isActive ? colors.primary : colors.card, borderColor: isActive ? colors.primary : colors.border }]}
              >
                <Text style={[styles.categoryText, { color: isActive ? "#FFFFFF" : colors.foreground }]}>{cat.title_ar}</Text>
                <MaterialCommunityIcons name={(cat.icon as any) || "grid"} size={14} color={isActive ? "#FFFFFF" : colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <View style={styles.grid}>
            {filtered.map((service) => {
              const cat = cats.find((c) => c.id === service.category_id);
              const palette = PALETTE[service.category_id || ""] || ["#F1F5F9", "#E2E8F0"];
              const icon = CAT_ICON_MAP[service.category_id || ""] || "broom";
              return (
                <TouchableOpacity key={service.id} style={[styles.serviceCard, { backgroundColor: colors.card }]} onPress={() => onSelectService(service)} activeOpacity={0.9}>
                  <LinearGradient colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.imageWrap}>
                    <MaterialCommunityIcons name={icon as any} size={56} color={cat?.color || colors.primary} style={{ opacity: 0.85 }} />
                    <View style={[styles.categoryIndicator, { backgroundColor: "#FFFFFF" }]}>
                      <MaterialCommunityIcons name={(cat?.icon as any) || "tag"} size={12} color={cat?.color || colors.primary} />
                    </View>
                  </LinearGradient>
                  <View style={styles.cardContent}>
                    <Text style={[styles.serviceTitle, { color: colors.foreground }]} numberOfLines={1}>{service.title_ar}</Text>
                    <Text style={[styles.serviceDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{service.desc_ar}</Text>
                    <View style={styles.cardFooter}>
                      <View style={[styles.arrowBtn, { backgroundColor: colors.primary }]}>
                        <Feather name="arrow-left" size={14} color="#FFF" />
                      </View>
                      <Text style={[styles.priceText, { color: colors.foreground }]}>
                        ابتداءً من <Text style={{ color: colors.primary, fontFamily: "Tajawal_700Bold" }}>{Number(service.base_price)}</Text> ر.س
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && (
              <View style={{ width: "100%", alignItems: "center", padding: 40 }}>
                <Text style={{ fontFamily: "Tajawal_500Medium", color: colors.mutedForeground }}>لا توجد خدمات في هذا التصنيف</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <FloatingTabBar active="services" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  headerTitleContainer: { alignItems: "flex-end" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17 },
  headerSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
  categoriesScroll: { paddingHorizontal: 16, gap: 10, marginBottom: 14, paddingVertical: 4 },
  categoryPill: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, gap: 6, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  categoryText: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", paddingHorizontal: 12, gap: 12 },
  serviceCard: { width: "47%", borderRadius: 22, overflow: "hidden", padding: 0, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  imageWrap: { width: "100%", height: 130, alignItems: "center", justifyContent: "center", position: "relative" },
  categoryIndicator: { position: "absolute", top: 10, left: 10, width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardContent: { padding: 12, alignItems: "flex-end" },
  serviceTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 4 },
  serviceDesc: { fontFamily: "Tajawal_400Regular", fontSize: 11, marginBottom: 10, textAlign: "right", minHeight: 28 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" },
  arrowBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  priceText: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
});
