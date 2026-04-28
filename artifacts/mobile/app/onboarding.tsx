import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { GradientButton } from "@/components/GradientButton";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const ONBOARDING_DATA = [
  {
    title: "تنظيف احترافي لمنزلك",
    subtitle: "نقدم لك أفضل خدمات التنظيف المنزلي بأعلى معايير الجودة والاحترافية",
    image: require("@/assets/images/illustration-sofa.png"),
  },
  {
    title: "أفضل المعدات والمواد",
    subtitle: "نستخدم أحدث المعدات ومواد التنظيف الآمنة والفعالة لضمان نظافة مثالية",
    image: require("@/assets/images/illustration-bucket.png"),
  },
  {
    title: "فريق عمل مدرب وموثوق",
    subtitle: "نختار بعناية أفضل الكفاءات لضمان تقديم خدمة تلبي توقعاتك",
    image: require("@/assets/images/illustration-armchair.png"),
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };

  const handleNext = () => {
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.brandContainer}>
          <Text style={[styles.brandText, { color: colors.primary }]}>نظافة</Text>
          <Feather name="home" size={24} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {ONBOARDING_DATA.map((item, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.imageContainer}>
              <Image source={item.image} style={styles.image} resizeMode="contain" />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === activeIndex ? colors.primary : colors.border },
                index === activeIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <GradientButton
          title="إبدأ الآن"
          onPress={handleNext}
          style={styles.button}
        />
        
        <Text style={[styles.loginText, { color: colors.mutedForeground }]}>
          لديك حساب؟ <Text style={{ color: colors.primary, fontFamily: "Cairo_600SemiBold" }}>تسجيل الدخول</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  imageContainer: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  button: {
    marginBottom: 16,
  },
  loginText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
