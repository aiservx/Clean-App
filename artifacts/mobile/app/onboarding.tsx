import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ImageBackground, TouchableOpacity, Platform, ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n } from "@/lib/i18n";
import { FlatList } from "react-native";

const { width } = Dimensions.get("window");

const SLIDE_KEYS = [
  { id: "1", small: "onb1_small", large: "onb1_large", sub: "onb1_sub", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80", icon: "auto-fix" },
  { id: "2", small: "onb2_small", large: "onb2_large", sub: "onb2_sub", image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80", icon: "calendar-check" },
  { id: "3", small: "onb3_small", large: "onb3_large", sub: "onb3_sub", image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80", icon: "shield-check" },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const ONBOARDING_DATA = SLIDE_KEYS.map((s) => ({
    id: s.id,
    smallTitle: t(s.small),
    largeTitle: t(s.large),
    subtitle: t(s.sub),
    image: s.image,
    icon: s.icon,
  }));

  const handleNext = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex < ONBOARDING_DATA.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      AsyncStorage.setItem("onboarded", "1").then(() => router.replace("/login"));
    }
  };

  const handleSkip = () => {
    AsyncStorage.setItem("onboarded", "1").then(() => router.replace("/login"));
  };

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={handleSkip}><Text style={[styles.skipText, { color: colors.primary }]}>{t("skip")}</Text></TouchableOpacity>
        <View style={styles.brandContainer}>
          <Text style={[styles.brandText, { color: colors.foreground }]}>{t("app_name")}</Text>
          <View style={[styles.homeIconContainer, { backgroundColor: colors.primary }]}>
            <Feather name="home" size={16} color="#FFFFFF" />
          </View>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={ONBOARDING_DATA}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        style={styles.scrollView}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <ImageBackground source={{ uri: item.image }} style={styles.imageArea} imageStyle={styles.imageStyle} resizeMode="cover">
                <LinearGradient
                  colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.15)", "rgba(255,255,255,0.55)"]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={22} color="#FFFFFF" />
                </View>
              </ImageBackground>
              <View style={styles.contentContainer}>
                <View style={styles.titleRow}>
                  <Text style={[styles.smallTitle, { color: colors.mutedForeground }]}>{item.smallTitle}</Text>
                  <Text style={[styles.largeTitle, { color: colors.primary }]}>{item.largeTitle}</Text>
                </View>
                <View style={styles.descriptionRow}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
                </View>
              </View>
              <View style={styles.pagination}>
                {ONBOARDING_DATA.map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: i === activeIndex ? colors.primary : colors.border }, i === activeIndex && styles.activeDot]} />
                ))}
              </View>
              <View style={styles.footer}>
                <TouchableOpacity onPress={handleNext} activeOpacity={0.9} style={{ flex: 1 }}>
                  <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
                    <Text style={styles.nextBtnText}>{activeIndex === ONBOARDING_DATA.length - 1 ? t("start_now") : t("next")}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, zIndex: 10 },
  skipText: { fontFamily: "Tajawal_600SemiBold", fontSize: 16 },
  brandContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandText: { fontFamily: "Tajawal_700Bold", fontSize: 20 },
  homeIconContainer: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  scrollView: { flex: 1 },
  slide: { width, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flex: 1 },
  card: { flex: 1, borderRadius: 32, overflow: "hidden", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
  imageArea: { height: 360, width: "100%", justifyContent: "flex-end", alignItems: "flex-start", padding: 16, backgroundColor: "#F1F5F9" },
  imageStyle: { borderBottomLeftRadius: 80, borderBottomRightRadius: 80 },
  iconBadge: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowColor: "#16C47F", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  contentContainer: { padding: 24, alignItems: "flex-end" },
  titleRow: { alignItems: "flex-end", marginBottom: 16 },
  smallTitle: { fontFamily: "Tajawal_600SemiBold", fontSize: 16, marginBottom: -4 },
  largeTitle: { fontFamily: "Tajawal_700Bold", fontSize: 32 },
  descriptionRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 4 },
  subtitle: { flex: 1, fontFamily: "Tajawal_400Regular", fontSize: 15, textAlign: "right", lineHeight: 24 },
  pagination: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 8, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activeDot: { width: 24 },
  footer: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 24, alignItems: "center", gap: 12 },
  nextBtn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nextBtnText: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
});
