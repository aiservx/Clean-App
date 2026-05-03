import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, I18nManager } from "react-native";
import { Feather, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  holder_name: string;
  is_default: boolean;
};

const BRAND_COLORS: Record<string, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  mada: "#16C47F",
  default: "#374151",
};

const OTHER = [
  { id: "apple", t: "Apple Pay", i: null as null, c: "#000" },
  { id: "stc", t: "STC Pay", i: "smartphone" as const, c: "#4F008C" },
  { id: "mada", t: "مدى", i: "credit-card" as const, c: "#16C47F" },
];

export default function PaymentMethods() {
  const colors = useColors();
  const { session } = useAuth();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("payment_methods")
        .select("id, brand, last4, holder_name, is_default")
        .eq("user_id", session.user.id)
        .order("is_default", { ascending: false });
      setCards((data as SavedCard[]) ?? []);
    } catch {
      setCards([]);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { loadCards(); }, [loadCards]);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="وسائل الدفع" subtitle="إدارة بطاقاتك وطرق الدفع" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.foreground }]}>البطاقات المحفوظة</Text>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
        ) : cards.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card }]}>
            <Feather name="credit-card" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد بطاقات محفوظة</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>أضف بطاقة للدفع السريع</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {cards.map((c) => (
              <View key={c.id} style={[styles.card, { backgroundColor: BRAND_COLORS[c.brand] ?? BRAND_COLORS.default }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.cardBrand}>{c.brand.toUpperCase()}</Text>
                  {c.is_default && (
                    <View style={styles.defBadge}>
                      <Text style={styles.defT}>افتراضي</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardNum}>**** **** **** {c.last4}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View>
                    <Text style={styles.cardLabel}>اسم حامل البطاقة</Text>
                    <Text style={styles.cardName}>{c.holder_name}</Text>
                  </View>
                  <TouchableOpacity><Feather name="more-horizontal" size={20} color="#FFF" /></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={[styles.addBtn, { borderColor: colors.primary }]} onPress={() => router.push("/payment-form")}>
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.addT, { color: colors.primary }]}>إضافة بطاقة جديدة</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.foreground, marginTop: 18 }]}>طرق الدفع الأخرى</Text>
        <View style={{ gap: 10 }}>
          {OTHER.map((o) => (
            <TouchableOpacity key={o.id} style={[styles.row, { backgroundColor: colors.card }]}>
              <View style={[styles.icon, { backgroundColor: o.c + "22" }]}>
                {o.id === "apple" ? <FontAwesome name="apple" size={18} color={o.c} /> : <Feather name={o.i as any} size={18} color={o.c} />}
              </View>
              <Text style={[styles.rowT, { color: colors.foreground, flex: 1, marginHorizontal: 12 }]}>{o.t}</Text>
              <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.row, { backgroundColor: colors.card }]}>
            <View style={[styles.icon, { backgroundColor: "#F59E0B22" }]}>
              <MaterialCommunityIcons name="cash" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.rowT, { color: colors.foreground, flex: 1, marginHorizontal: 12 }]}>الدفع عند الاستلام</Text>
            <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 10 },
  card: { padding: 18, borderRadius: 18, height: 170, justifyContent: "space-between" },
  cardBrand: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 18, fontStyle: "italic" },
  cardNum: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 19, letterSpacing: 2, textAlign: "center" },
  cardLabel: { color: "rgba(255,255,255,0.6)", fontFamily: "Tajawal_500Medium", fontSize: 9 },
  cardName: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13 },
  defBadge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  defT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 10 },
  addBtn: { borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, marginTop: 12 },
  addT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14 },
  rowT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 32, borderRadius: 18, gap: 8 },
  emptyText: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  emptyHint: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
});
