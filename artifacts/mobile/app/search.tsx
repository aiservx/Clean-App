import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Image, I18nManager, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useBooking } from "@/store/booking";
import { getCurrentResolved, distanceKm } from "@/lib/location";

const POPULAR_SERVICES = [
  { t: "تنظيف منازل",  i: "home",      c: "#16C47F" },
  { t: "تنظيف عميق",  i: "water",     c: "#2F80ED" },
  { t: "تنظيف مكاتب", i: "briefcase", c: "#F59E0B" },
  { t: "تنظيف فلل",   i: "home-city", c: "#8B5CF6" },
  { t: "تنظيف مسابح", i: "pool",      c: "#06B6D4" },
  { t: "غسيل سيارات", i: "car",       c: "#EF4444" },
];

type ServiceResult = {
  id: string;
  title_ar: string;
  price: number | null;
  duration_min: number | null;
  category_title?: string;
};

type ProviderResult = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  rating: number;
  experience_years: number;
  hourly_rate: number;
  available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  d_km?: number | null;
};

type FilterKey = "all" | "services" | "providers";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const booking = useBooking();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceResult[]>([]);
  const [providers, setProviders] = useState<ProviderResult[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    getCurrentResolved().then((r) => { if (r) setUserLoc({ lat: r.lat, lng: r.lng }); });
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const runSearch = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setServices([]);
      setProviders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const term = `%${text.trim()}%`;
      const [svcRes, provRes] = await Promise.all([
        supabase
          .from("services")
          .select("id, title_ar, price, duration_min, service_categories(title_ar)")
          .ilike("title_ar", term)
          .eq("active", true)
          .limit(8),
        supabase
          .from("providers")
          .select("id, rating, experience_years, hourly_rate, available, current_lat, current_lng, profiles(full_name, avatar_url)")
          .ilike("profiles.full_name", term)
          .limit(8),
      ]);

      if (svcRes.data) {
        setServices(svcRes.data.map((s: any) => ({
          id: s.id,
          title_ar: s.title_ar,
          price: s.price,
          duration_min: s.duration_min,
          category_title: s.service_categories?.title_ar ?? null,
        })));
      }

      if (provRes.data) {
        const withDist = provRes.data
          .filter((p: any) => p.profiles)
          .map((p: any) => ({
            id: p.id,
            full_name: p.profiles?.full_name ?? "مزود",
            avatar_url: p.profiles?.avatar_url ?? null,
            rating: Number(p.rating || 0),
            experience_years: Number(p.experience_years || 0),
            hourly_rate: Number(p.hourly_rate || 0),
            available: !!p.available,
            current_lat: p.current_lat,
            current_lng: p.current_lng,
            d_km: (userLoc && p.current_lat && p.current_lng)
              ? distanceKm(userLoc, { lat: p.current_lat, lng: p.current_lng })
              : null,
          }));
        setProviders(withDist);
      }
    } catch { }
    setLoading(false);
  }, [userLoc]);

  const handleChange = (text: string) => {
    setQ(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 350);
  };

  const hasResults = services.length > 0 || providers.length > 0;
  const showServices = filter === "all" || filter === "services";
  const showProviders = filter === "all" || filter === "providers";
  const isSearching = q.trim().length >= 2;

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 8, backgroundColor: colors.card }]}>
        <View style={[st.searchRow]}>
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); router.back(); }} style={st.backBtn}>
            <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[st.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="search" size={17} color={colors.mutedForeground} />
            <TextInput
              ref={inputRef}
              placeholder="ابحث عن خدمة أو عامل نظافة..."
              placeholderTextColor={colors.mutedForeground}
              style={[st.input, { color: colors.foreground }]}
              value={q}
              onChangeText={handleChange}
              returnKeyType="search"
              onSubmitEditing={() => runSearch(q)}
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => { setQ(""); setServices([]); setProviders([]); }}>
                <Feather name="x-circle" size={17} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filters}>
          {(["all", "services", "providers"] as FilterKey[]).map((f) => {
            const labels: Record<FilterKey, string> = { all: "الكل", services: "الخدمات", providers: "العمال" };
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[st.chip, active && { backgroundColor: colors.primary }]}
              >
                <Text style={[st.chipT, { color: active ? "#FFF" : colors.mutedForeground }]}>{labels[f]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading */}
        {loading && (
          <View style={st.loadWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[st.loadT, { color: colors.mutedForeground }]}>جارٍ البحث...</Text>
          </View>
        )}

        {/* Search results */}
        {isSearching && !loading && (
          <>
            {/* Services results */}
            {showServices && services.length > 0 && (
              <View style={st.section}>
                <Text style={[st.sectionTitle, { color: colors.foreground }]}>الخدمات</Text>
                {services.map((svc) => (
                  <TouchableOpacity
                    key={svc.id}
                    style={[st.resultRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      booking.setServiceId(svc.id);
                      router.push("/booking" as any);
                    }}
                  >
                    <LinearGradient colors={["#16C47F22", "#16C47F11"]} style={st.resultIcon}>
                      <MaterialCommunityIcons name="broom" size={20} color="#16C47F" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.resultTitle, { color: colors.foreground }]}>{svc.title_ar}</Text>
                      {svc.category_title && (
                        <Text style={[st.resultSub, { color: colors.mutedForeground }]}>{svc.category_title}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {svc.price != null && (
                        <Text style={[st.resultPrice, { color: colors.primary }]}>{svc.price} ر.س</Text>
                      )}
                      {svc.duration_min != null && (
                        <Text style={[st.resultSub, { color: colors.mutedForeground }]}>{svc.duration_min} د</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Provider results */}
            {showProviders && providers.length > 0 && (
              <View style={st.section}>
                <Text style={[st.sectionTitle, { color: colors.foreground }]}>عمال النظافة</Text>
                {providers.map((prov) => (
                  <TouchableOpacity
                    key={prov.id}
                    style={[st.resultRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push({ pathname: "/provider/[id]", params: { id: prov.id } } as any)}
                  >
                    <View style={st.provAvatarWrap}>
                      <Image
                        source={prov.avatar_url ? { uri: prov.avatar_url } : require("@/assets/images/default-avatar.png")}
                        style={st.provAvatar}
                      />
                      {prov.available && <View style={[st.onlineDot, { backgroundColor: "#16C47F" }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.resultTitle, { color: colors.foreground }]}>{prov.full_name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <MaterialCommunityIcons name="star" size={11} color="#F59E0B" />
                          <Text style={[st.resultSub, { color: colors.mutedForeground }]}>{prov.rating.toFixed(1)}</Text>
                        </View>
                        <Text style={[st.resultSub, { color: colors.mutedForeground }]}>·</Text>
                        <Text style={[st.resultSub, { color: colors.mutedForeground }]}>{prov.experience_years} سنة خبرة</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {prov.hourly_rate > 0 && (
                        <Text style={[st.resultPrice, { color: colors.primary }]}>{prov.hourly_rate} ر.س/ساعة</Text>
                      )}
                      {prov.d_km != null && (
                        <Text style={[st.resultSub, { color: colors.mutedForeground }]}>
                          {prov.d_km < 1 ? `${Math.round(prov.d_km * 1000)} م` : `${prov.d_km.toFixed(1)} كم`}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* No results */}
            {!loading && !hasResults && (
              <View style={st.empty}>
                <MaterialCommunityIcons name="magnify-close" size={48} color={colors.border} />
                <Text style={[st.emptyT, { color: colors.mutedForeground }]}>لا توجد نتائج لـ "{q}"</Text>
                <Text style={[st.emptySub, { color: colors.mutedForeground }]}>جرّب كلمات مختلفة أو تصفّح الخدمات</Text>
                <TouchableOpacity
                  style={[st.browseBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => router.push("/services")}
                >
                  <Text style={[st.browseBtnT, { color: colors.primary }]}>تصفّح جميع الخدمات</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Default state — not searching */}
        {!isSearching && (
          <>
            <Text style={[st.sectionTitle, { color: colors.foreground, marginHorizontal: 16, marginBottom: 10 }]}>الأكثر طلباً</Text>
            <View style={st.popularGrid}>
              {POPULAR_SERVICES.map((p) => (
                <TouchableOpacity
                  key={p.t}
                  style={[st.popularCard, { backgroundColor: colors.card }]}
                  onPress={() => {
                    setQ(p.t);
                    handleChange(p.t);
                  }}
                >
                  <View style={[st.popularIcon, { backgroundColor: p.c + "22" }]}>
                    <MaterialCommunityIcons name={p.i as any} size={22} color={p.c} />
                  </View>
                  <Text style={[st.popularT, { color: colors.foreground }]}>{p.t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[st.tipBox, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginTop: 20 }]}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#F59E0B" />
              <Text style={[st.tipT, { color: colors.mutedForeground }]}>
                ابحث عن اسم العامل أو نوع الخدمة مثل "تنظيف مطابخ" أو "سارة"
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  searchRow: { flexDirection: I18nManager.isRTL ? "row" : "row-reverse", alignItems: "center", gap: 10, marginBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, height: 46, borderRadius: 23,
    borderWidth: 1.5,
  },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 14 },
  filters: { flexDirection: I18nManager.isRTL ? "row" : "row-reverse", paddingHorizontal: 4, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100,
    backgroundColor: "#F1F5F9",
  },
  chipT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  loadWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 24 },
  loadT: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
  section: { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 10 },
  resultRow: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center", gap: 12,
    padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 8,
  },
  resultIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  resultTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  resultSub: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  resultPrice: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  provAvatarWrap: { position: "relative" },
  provAvatar: { width: 44, height: 44, borderRadius: 22 },
  onlineDot: { position: "absolute", bottom: 1, end: 1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: "#FFF" },
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 15, textAlign: "center" },
  emptySub: { fontFamily: "Tajawal_400Regular", fontSize: 12, textAlign: "center" },
  browseBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  browseBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  popularGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 16, gap: 10,
  },
  popularCard: {
    width: "47%", flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 16,
  },
  popularIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  popularT: { fontFamily: "Tajawal_700Bold", fontSize: 12, flex: 1 },
  tipBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  tipT: { fontFamily: "Tajawal_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
});
