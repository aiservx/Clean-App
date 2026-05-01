import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: any;
  onRight?: () => void;
  showBack?: boolean;
};

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRight,
  showBack = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      {rightIcon ? (
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.card }]} onPress={onRight}>
          <Feather name={rightIcon} size={18} color={colors.foreground} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {showBack ? (
        <TouchableOpacity
          style={[styles.iconCircle, { backgroundColor: colors.card }]}
          onPress={onBack ?? (() => router.back())}
        >
          <Feather name="chevron-right" size={20} color={colors.foreground} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  titleWrap: { alignItems: "center", flex: 1 },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  subtitle: { fontFamily: "Tajawal_400Regular", fontSize: 11, marginTop: 1 },
});
