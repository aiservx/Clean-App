import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";

const SERVICES = [
  { id: "1", title: "تنظيف منازل", image: require("@/assets/images/illustration-sofa.png") },
  { id: "2", title: "تنظيف عميق", image: require("@/assets/images/illustration-vacuum.png") },
  { id: "3", title: "تنظيف مكاتب", image: require("@/assets/images/illustration-office.png") },
  { id: "4", title: "تنظيف كنب", image: require("@/assets/images/illustration-armchair.png") },
];

const CLEANERS = [
  { id: "1", name: "فاطمة أحمد", rating: "4.9", exp: "5", image: require("@/assets/images/cleaner-fatima.png") },
  { id: "2", name: "سارة محمد", rating: "4.8", exp: "3", image: require("@/assets/images/cleaner-sara.png") },
  { id: "3", name: "نورة علي", rating: "4.7", exp: "4", image: require("@/assets/images/cleaner-noura.png") },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.iconCircle} onPress={() => router.push("/(tabs)/offers")}>
            <View>
              <Feather name="gift" size={20} color={colors.primary} />
              <View style={[styles.notifDot, { backgroundColor: "#EF4444" }]} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.greeting, { color: colors.foreground }]}>👋 مرحباً، أحمد</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>كيف يمكننا مساعدتك اليوم؟</Text>
          </View>
          <TouchableOpacity style={styles.iconCircle}>
            <Feather name="menu" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Offers Banner -> entry to offers screen */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(tabs)/offers")}
          style={styles.offersBanner}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.offersBannerInner}
          >
            <Feather name="chevron-left" size={20} color="#FFFFFF" />
            <View style={styles.offersBannerContent}>
              <Text style={styles.offersBannerTitle}>عروض حصرية بانتظارك</Text>
              <Text style={styles.offersBannerSub}>خصم حتى 30% + كوبونات مجانية</Text>
            </View>
            <View style={styles.offersBannerIcon}>
              <Feather name="gift" size={22} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="tune-variant" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن خدمة تنظيف..."
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
            />
            <Feather name="search" size={20} color={colors.mutedForeground} />
          </View>
        </View>

        {/* MAP Card */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            <AppMap
              style={StyleSheet.absoluteFill}
              region={{
                latitude: 24.7136,
                longitude: 46.6753,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
            />
            
            {/* Custom Markers Overlays */}
            <View style={[styles.cleanerPin, { top: "30%", right: "40%" }]}>
              <Image source={require("@/assets/images/cleaner-fatima.png")} style={styles.pinAvatar} />
              <View style={[styles.pinTail, { borderTopColor: colors.primary }]} />
            </View>
            <View style={[styles.cleanerPin, { top: "50%", right: "20%" }]}>
              <Image source={require("@/assets/images/cleaner-sara.png")} style={styles.pinAvatar} />
              <View style={[styles.pinTail, { borderTopColor: colors.primary }]} />
            </View>
            <View style={[styles.cleanerPin, { top: "60%", right: "60%" }]}>
              <Image source={require("@/assets/images/cleaner-noura.png")} style={styles.pinAvatar} />
              <View style={[styles.pinTail, { borderTopColor: colors.primary }]} />
            </View>

            {/* Current Location Pill */}
            <View style={[styles.locationPill, { backgroundColor: colors.card }]}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={styles.locationPillText}>حي النخيل، الرياض</Text>
              <Text style={[styles.locationPillLabel, { color: colors.mutedForeground }]}>موقعك الحالي</Text>
            </View>

            {/* User Location Dot */}
            <View style={styles.userLocationDot}>
              <View style={styles.userLocationPulse} />
              <View style={[styles.userLocationInner, { backgroundColor: colors.accent }]} />
            </View>

            <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>خدماتنا</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesScroll}
        >
          {SERVICES.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.serviceCard, { backgroundColor: colors.card }]}
              onPress={() => router.push("/services")}
            >
              <Image source={item.image} style={styles.serviceImage} resizeMode="contain" />
              <Text style={[styles.serviceTitle, { color: colors.foreground }]}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cleaners Section */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عمال نظافة بالقرب منك</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cleanersScroll}
        >
          {CLEANERS.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.cleanerCard, { backgroundColor: colors.card }]}>
              <TouchableOpacity style={styles.heartBtn}>
                <Feather name="heart" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
              
              <Image source={item.image} style={styles.cleanerAvatarMain} />
              
              <Text style={[styles.cleanerName, { color: colors.foreground }]}>{item.name}</Text>
              
              <View style={styles.cleanerStats}>
                <Text style={[styles.cleanerExp, { color: colors.mutedForeground }]}>خبرة {item.exp} سنوات</Text>
                <View style={styles.statDivider} />
                <View style={styles.ratingRow}>
                  <Text style={[styles.ratingText, { color: colors.foreground }]}>{item.rating}</Text>
                  <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
                </View>
              </View>

              <View style={[styles.statusPill, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>متاح الآن</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
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
  headerTitleContainer: {
    alignItems: "flex-end",
  },
  greeting: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 13,
  },
  notifDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  offersBanner: {
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#16C47F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  offersBannerInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  offersBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  offersBannerContent: {
    flex: 1,
    alignItems: "flex-end",
  },
  offersBannerTitle: {
    color: "#FFFFFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
  },
  offersBannerSub: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Tajawal_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 14,
  },
  searchContainer: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    marginRight: 12,
  },
  filterBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mapSection: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  mapContainer: {
    height: 260,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  cleanerPin: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#16C47F",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pinAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  pinTail: {
    position: "absolute",
    bottom: -10,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  locationPill: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationPillLabel: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 11,
  },
  locationPillText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 12,
  },
  userLocationDot: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  userLocationInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userLocationPulse: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(47, 128, 237, 0.2)",
  },
  gpsBtn: {
    position: "absolute",
    bottom: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
  },
  seeAll: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 14,
  },
  servicesScroll: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 14,
  },
  serviceCard: {
    width: 100,
    height: 120,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  serviceImage: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  serviceTitle: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 12,
    textAlign: "center",
  },
  cleanersScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  cleanerCard: {
    width: 160,
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  heartBtn: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  cleanerAvatarMain: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 12,
  },
  cleanerName: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 14,
    marginBottom: 4,
  },
  cleanerStats: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  cleanerExp: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    height: 10,
    backgroundColor: "#E5E7EB",
  },
  ratingRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 11,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 10,
  },
});
