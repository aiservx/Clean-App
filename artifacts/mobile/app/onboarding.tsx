import React, { useRef, useState } from "react";
import {
  View, Text, StyleSheet, Dimensions, Image, TouchableOpacity,
  Platform, ViewToken, I18nManager, FlatList
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n } from "@/lib/i18n";
import { Feather } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

type ImageSlide = { id: string; type: "image"; image: any };
type VideoSlide = { id: string; type: "video" };
type Slide = ImageSlide | VideoSlide;

const SLIDES: Slide[] = [
  { id: "1", type: "image", image: require("@/assets/images/onboard-1.png") },
  { id: "2", type: "image", image: require("@/assets/images/onboard-2.png") },
  { id: "3", type: "image", image: require("@/assets/images/onboard-3.png") },
  { id: "4", type: "video" },
];

function VideoSlideCard({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[vsCard.container, { backgroundColor: colors.background }]}>
      {/* Gradient bg */}
      <LinearGradient
        colors={["#0F9B62", "#16C47F", "#52E39A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={vsCard.gradientBg}
      />

      {/* Decorative circles */}
      <View style={vsCard.circle1} />
      <View style={vsCard.circle2} />
      <View style={vsCard.circle3} />

      {/* Content */}
      <View style={vsCard.content}>
        {/* Play icon badge */}
        <View style={vsCard.playBadge}>
          <View style={vsCard.playOuter}>
            <View style={vsCard.playInner}>
              <Feather
                name="play"
                size={32}
                color="#16C47F"
                style={{ marginStart: 4 }}
              />
            </View>
          </View>
        </View>

        {/* Step label */}
        <View style={vsCard.stepBadge}>
          <Text style={vsCard.stepText}>
            {I18nManager.isRTL ? "شاهد الآن" : "Watch Now"}
          </Text>
        </View>

        {/* Headline */}
        <Text style={vsCard.headline}>
          {I18nManager.isRTL ? "كيف يعمل\nالتطبيق؟" : "How does\nthe app work?"}
        </Text>

        {/* Sub */}
        <Text style={vsCard.sub}>
          {I18nManager.isRTL
            ? "دليل مرئي خطوة بخطوة\nلاستخدام التطبيق بكل سهولة"
            : "A step-by-step visual guide\nto using the app with ease"}
        </Text>

        {/* Watch button */}
        <TouchableOpacity
          style={vsCard.watchBtn}
          activeOpacity={0.88}
          onPress={() => router.push("/tutorial-video" as any)}
        >
          <Feather name="play-circle" size={18} color="#16C47F" />
          <Text style={vsCard.watchBtnText}>
            {I18nManager.isRTL ? "مشاهدة الفيديو التعليمي" : "Watch Tutorial Video"}
          </Text>
          <Feather
            name={I18nManager.isRTL ? "arrow-left" : "arrow-right"}
            size={16}
            color="#16C47F"
          />
        </TouchableOpacity>

        {/* Feature pills */}
        <View style={vsCard.pills}>
          {(I18nManager.isRTL
            ? ["اختر الخدمة", "احجز موعد", "تتبع مزودك"]
            : ["Pick service", "Book a slot", "Track provider"]
          ).map((label) => (
            <View key={label} style={vsCard.pill}>
              <Text style={vsCard.pillText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

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

  const isLastSlide = activeIndex === SLIDES.length - 1;

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
        renderItem={({ item }) => {
          if (item.type === "image") {
            return (
              <View style={styles.slide}>
                <Image source={(item as ImageSlide).image} style={styles.slideImage} resizeMode="cover" />
              </View>
            );
          }
          return (
            <View style={styles.slide}>
              <VideoSlideCard colors={colors} />
            </View>
          );
        }}
      />

      {/* Bottom controls overlay */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
        {/* Pagination dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex
                      ? i === SLIDES.length - 1
                        ? "#FFF"
                        : colors.primary
                      : "rgba(255,255,255,0.5)",
                },
                i === activeIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* Buttons — hide on video slide if desired */}
        {!isLastSlide && (
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleNext} activeOpacity={0.9} style={{ flex: 1 }}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtn}
              >
                <Text style={styles.nextBtnText}>
                  {activeIndex === SLIDES.length - 2 ? t("start_now") : t("next")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isLastSlide && (
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.9} style={{ flex: 1 }}>
              <LinearGradient
                colors={["#1A2E24", "#16C47F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtn}
              >
                <Text style={styles.nextBtnText}>{t("start_now")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: isLastSlide ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
            {t("skip")}
          </Text>
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

const vsCard = StyleSheet.create({
  container: {
    width,
    height,
    overflow: "hidden",
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  circle1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -80,
    start: -80,
  },
  circle2: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: 60,
    end: -60,
  },
  circle3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(0,0,0,0.08)",
    top: "40%",
    start: "60%",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 160,
    gap: 0,
  },
  playBadge: {
    marginBottom: 24,
  },
  playOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  playInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 16,
  },
  stepText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 13,
    color: "#FFF",
    letterSpacing: 0.5,
  },
  headline: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 36,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 48,
    marginBottom: 14,
  },
  sub: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  watchBtn: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    width: "100%",
    justifyContent: "center",
  },
  watchBtnText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    color: "#16C47F",
  },
  pills: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  pillText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 12,
    color: "#FFF",
  },
});
