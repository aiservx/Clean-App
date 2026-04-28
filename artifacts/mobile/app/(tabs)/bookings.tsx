import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { GradientButton } from "@/components/GradientButton";

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>حجوزاتي</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Feather name="calendar" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد حجوزات بعد</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>لم تقم بأي حجوزات لخدمات التنظيف حتى الآن. احجز خدمتك الأولى واستمتع بنظافة مثالية.</Text>
        
        <GradientButton 
          title="احجز خدمة" 
          onPress={() => router.push("/services")} 
          style={styles.btn}
        />
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
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 100, // account for tab bar
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  btn: {
    width: "100%",
  },
});
