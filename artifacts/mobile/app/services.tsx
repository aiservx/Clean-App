import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import FloatingTabBar from "@/components/FloatingTabBar";
import { useBooking, type ServiceItem } from "@/store/booking";

const CATEGORIES = [
  { id: "all", title: "الكل", icon: "grid" },
  { id: "homes", title: "المنازل", icon: "home" },
  { id: "offices", title: "المكاتب", icon: "briefcase" },
  { id: "furniture", title: "الأثاث", icon: "package" },
  { id: "others", title: "أخرى", icon: "more-horizontal" },
] as const;

const SERVICES_GRID: (ServiceItem & { category: string })[] = [
  {
    id: "1",
    title: "تنظيف منازل",
    price: 85,
    desc: "خدمة تنظيف شاملة لجميع أرجاء المنزل",
    image: require("@/assets/images/service-home-1.jpg"),
    color: "#16C47F",
    category: "homes",
  },
  {
    id: "2",
    title: "تنظيف عميق",
    price: 150,
    desc: "تنظيف عميق وتعقيم شامل للمساحات",
    image: require("@/assets/images/service-deep-2.jpg"),
    color: "#2F80ED",
    category: "homes",
  },
  {
    id: "3",
    title: "تنظيف مكاتب",
    price: 100,
    desc: "خدمة تنظيف احترافية للمكاتب والشركات",
    image: require("@/assets/images/service-office-3.jpg"),
    color: "#F59E0B",
    category: "offices",
  },
  {
    id: "4",
    title: "تنظيف كنب",
    price: 120,
    desc: "تنظيف وتعقيم الكنب والسجاد بأحدث الأجهزة",
    image: require("@/assets/images/service-sofa-4.jpg"),
    color: "#EC4899",
    category: "furniture",
  },
  {
    id: "5",
    title: "تنظيف مطابخ",
    price: 110,
    desc: "تنظيف وتطهير المطابخ وإزالة الدهون",
    image: require("@/assets/images/service-kitchen-5.jpg"),
    color: "#8B5CF6",
    category: "homes",
  },
  {
    id: "6",
    title: "تنظيف فلل",
    price: 250,
    desc: "خدمة تنظيف متكاملة للفلل والمنازل الكبيرة",
    image: require("@/assets/images/service-villa-6.jpg"),
    color: "#16C47F",
    category: "homes",
  },
];

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const booking = useBooking();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    if (activeCategory === "all") return SERVICES_GRID;
    return SERVICES_GRID.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  const onSelectService = (svc: ServiceItem) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    booking.setService(svc);
    router.push("/booking");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.iconCircle}>
          <Feather name="headphones" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>خدماتنا</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            اختر الخدمة التي تناسب احتياجك
          </Text>
        </View>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name="chevron-right" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  setActiveCategory(cat.id);
                }}
                activeOpacity={0.85}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.categoryText, { color: isActive ? "#FFFFFF" : colors.foreground }]}>
                  {cat.title}
                </Text>
                <Feather
                  name={cat.icon as any}
                  size={16}
                  color={isActive ? "#FFFFFF" : colors.mutedForeground}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Services Grid */}
        <View style={styles.grid}>
          {filtered.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, { backgroundColor: colors.card }]}
              onPress={() => onSelectService(service)}
              activeOpacity={0.85}
            >
              <View style={styles.imageWrap}>
                <Image source={service.image} style={styles.serviceImage} resizeMode="cover" />
                <View style={[styles.categoryIndicator, { backgroundColor: "#FFFFFF" }]}>
                  <Feather
                    name={service.category === "homes" ? "home" : service.category === "offices" ? "briefcase" : "package"}
                    size={12}
                    color={service.color}
                  />
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.serviceTitle, { color: colors.foreground }]}>{service.title}</Text>
                <Text style={[styles.serviceDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {service.desc}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={[styles.arrowBtn, { backgroundColor: colors.primaryLight }]}>
                    <Feather name="arrow-left" size={14} color={colors.primary} />
                  </View>
                  <Text style={[styles.priceText, { color: colors.foreground }]}>
                    ابتداءً من{" "}
                    <Text style={{ color: colors.primary, fontFamily: "Cairo_700Bold" }}>{service.price}</Text> رس
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <FloatingTabBar active="services" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitleContainer: { alignItems: "flex-end" },
  headerTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  headerSubtitle: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  categoriesScroll: { paddingHorizontal: 24, gap: 12, marginBottom: 24, paddingVertical: 4 },
  categoryPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryText: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", paddingHorizontal: 16, gap: 12 },
  serviceCard: {
    width: "48%",
    borderRadius: 24,
    overflow: "hidden",
    padding: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrap: {
    width: "100%",
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  categoryIndicator: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceImage: { width: "100%", height: "100%" },
  cardContent: { alignItems: "flex-end" },
  serviceTitle: { fontFamily: "Cairo_700Bold", fontSize: 15, marginBottom: 4 },
  serviceDesc: { fontFamily: "Cairo_400Regular", fontSize: 11, marginBottom: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" },
  arrowBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  priceText: { fontFamily: "Cairo_500Medium", fontSize: 11 },
});
