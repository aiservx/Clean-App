import React from "react";
import { View, Text, StyleSheet, I18nManager } from "react-native";

type Badge = {
  label: string;
  bg: string;
  text: string;
  emoji: string;
};

function getBadges(rating: number, totalBookings: number, experienceYears: number): Badge[] {
  const badges: Badge[] = [];

  if (rating >= 4.8) {
    badges.push({ label: "متميز", bg: "#FEF3C7", text: "#92400E", emoji: "⭐" });
  }
  if (totalBookings >= 50) {
    badges.push({ label: "الأكثر طلباً", bg: "#EDE9FE", text: "#5B21B6", emoji: "🏆" });
  }
  if (experienceYears >= 5) {
    badges.push({ label: "خبير", bg: "#DBEAFE", text: "#1D4ED8", emoji: "👑" });
  }
  if (totalBookings < 10 && experienceYears < 2) {
    badges.push({ label: "جديد", bg: "#DCFCE7", text: "#166534", emoji: "🌱" });
  }

  return badges.slice(0, 2);
}

type Props = {
  rating: number;
  totalBookings?: number;
  experienceYears?: number;
  size?: "sm" | "md";
};

export default function ProviderBadges({ rating, totalBookings = 0, experienceYears = 0, size = "sm" }: Props) {
  const badges = getBadges(rating, totalBookings, experienceYears);
  if (badges.length === 0) return null;

  const isSmall = size === "sm";

  return (
    <View style={[s.row, { flexDirection: I18nManager.isRTL ? "row" : "row-reverse" }]}>
      {badges.map((b) => (
        <View key={b.label} style={[s.badge, { backgroundColor: b.bg }, isSmall && s.badgeSm]}>
          <Text style={[s.badgeText, { color: b.text }, isSmall && s.badgeTextSm]}>
            {b.emoji} {b.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: {
    fontFamily: "Tajawal_700Bold", fontSize: 11,
  },
  badgeTextSm: { fontSize: 10 },
});
