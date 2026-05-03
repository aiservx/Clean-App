import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, Platform, ViewToken, I18nManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n } from "@/lib/i18n";
import { FlatList } from "react-native";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  { id: "1", image: require("@/assets/images/onboard-1.png") },
  { id: "2", image: require("@/assets/images/onboard-2.png") },
  { id: "3", image: require("@/assets/images/onboard-3.png") },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex < SLIDES.length - 1) {
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
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        inverted={I18nManager.isRTL}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        style={styles.scrollView}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={item.image} style={styles.slideImage} resizeMode="cover" />
          </View>
        )}
      />

      {/* Bottom controls overlay */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
        {/* Pagination dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === activeIndex ? colors.primary : "rgba(255,255,255,0.5)" }, i === activeIndex && styles.activeDot]} />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleNext} activeOpacity={0.9} style={{ flex: 1 }}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>{activeIndex === SLIDES.length - 1 ? t("start_now") : t("next")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>{t("skip")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  slide: { width, height, justifyContent: "center", alignItems: "center" },
  slideImage: { width, height, position: "absolute", top: 0, start: 0 },
  controls: { position: "absolute", bottom: 0, start: 0, end: 0, paddingHorizontal: 24 },
  pagination: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activeDot: { width: 24 },
  footer: { flexDirection: "row", marginBottom: 12 },
  nextBtn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nextBtnText: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { fontFamily: "Tajawal_600SemiBold", fontSize: 14 },
});
