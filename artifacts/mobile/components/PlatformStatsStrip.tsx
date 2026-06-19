import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, I18nManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

type Stats = { todayBookings: number; activeProviders: number; avgRating: number };

export default function PlatformStatsStrip() {
  const colors = useColors();
  const [stats, setStats] = useState<Stats>({ todayBookings: 0, activeProviders: 0, avgRating: 4.9 });

  useEffect(() => {
    const load = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [bookingsRes, providersRes, ratingRes] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        supabase.from("providers").select("id", { count: "exact", head: true }).eq("available", true),
        supabase.from("providers").select("rating").not("rating", "is", null).limit(100),
      ]);

      const ratings = (ratingRes.data ?? []).map((r: any) => Number(r.rating)).filter(r => r > 0);
      const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 4.9;

      setStats({
        todayBookings: bookingsRes.count ?? 0,
        activeProviders: providersRes.count ?? 0,
        avgRating: Math.min(5, avg),
      });
    };
    load();
  }, []);

  const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

  const items = [
    { icon: "broom", label: `${stats.todayBookings}+ تنظيف اليوم`, color: "#16C47F" },
    { icon: "account-check", label: `${stats.activeProviders} فني نشط`, color: "#3B82F6" },
    { icon: "star", label: `⭐ ${stats.avgRating.toFixed(1)} تقييم`, color: "#F59E0B" },
  ];

  return (
    <View style={[s.strip, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDir }]}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          <View style={s.item}>
            <MaterialCommunityIcons name={item.icon as any} size={14} color={item.color} />
            <Text style={[s.label, { color: colors.mutedForeground }]}>{item.label}</Text>
          </View>
          {i < items.length - 1 && <View style={[s.sep, { backgroundColor: colors.border }]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  strip: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  item: {
    flex: 1, flexDirection: "row", alignItems: "center",
    gap: 5, justifyContent: "center",
  },
  label: { fontFamily: "Tajawal_600SemiBold", fontSize: 11 },
  sep: { width: 1, height: 16, marginHorizontal: 4 },
});
