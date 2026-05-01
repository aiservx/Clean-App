import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { KeyboardAvoidingView as RNKeyboardAvoidingView } from "react-native";
let KeyboardAvoidingView: any;
try {
  KeyboardAvoidingView = require("react-native-keyboard-controller").KeyboardAvoidingView;
} catch {
  KeyboardAvoidingView = RNKeyboardAvoidingView;
}
import { supabase } from "@/lib/supabase";

const TAGS = [
  { label: "الاهتمام بالتفاصيل", icon: "checkbox-marked-outline" },
  { label: "الالتزام بالوقت", icon: "clock-outline" },
  { label: "التعامل الراقي", icon: "heart-outline" },
  { label: "جودة التنظيف", icon: "auto-fix" },
];

export default function RatingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [providerName, setProviderName] = useState("");
  const [providerAvatar, setProviderAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!params.bookingId) return;
    supabase
      .from("bookings")
      .select("provider:profiles!bookings_provider_id_fkey(full_name, avatar_url)")
      .eq("id", params.bookingId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.provider) {
          setProviderName((data.provider as any).full_name || "");
          setProviderAvatar((data.provider as any).avatar_url || null);
        }
      });
  }, [params.bookingId]);

  const ratingLabels = ["", "سيء جداً", "سيء", "متوسط", "ممتاز", "رائع"];

  const handleSubmit = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)/home" as any);
  };

  const toggleTag = (i: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelectedTags((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.root, { backgroundColor: "#F8FAFC" }]}>
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={s.hIcon}>
            <Feather name="help-circle" size={20} color="#1E293B" />
          </TouchableOpacity>
          <View style={s.hCenter}>
            <Text style={s.hTitle}>تقييم الخدمة</Text>
            <Text style={s.hSub}>كيف كانت تجربتك اليوم؟</Text>
          </View>
          <TouchableOpacity style={s.hIcon} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <LinearGradient colors={["#EDE9FE", "#F0F4FF"]} style={s.profileCard}>
            {providerAvatar ? (
              <Image source={{ uri: providerAvatar }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, { backgroundColor: "#7C3AED22", alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontFamily: "Tajawal_700Bold", color: "#7C3AED", fontSize: 28 }}>{(providerName || "م").charAt(0)}</Text>
              </View>
            )}
            <Text style={s.name}>{providerName || "مزود الخدمة"}</Text>
            <Text style={s.role}>مزود خدمة</Text>
          </LinearGradient>

          {/* Rating Section */}
          <Text style={s.ratingHeading}>{providerName ? `قيم تجربتك مع ${providerName.split(" ")[0]}` : "قيم تجربتك"}</Text>
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRating(star);
                }}
              >
                <MaterialCommunityIcons
                  name={star <= rating ? "star" : "star-outline"}
                  size={52}
                  color={star <= rating ? "#F59E0B" : "#CBD5E1"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.ratingLabel}>{ratingLabels[rating]}</Text>

          {/* Comment Section */}
          <View style={s.commentSection}>
            <Text style={s.sectionTitle}>شاركنا رأيك</Text>
            <View style={s.commentBox}>
              <TextInput
                style={s.input}
                placeholder="اكتب ملاحظاتك عن الخدمة. رأيك يساعدنا في تقديم تجربة أفضل لك في المستقبل."
                placeholderTextColor="#94A3B8"
                multiline
                textAlign="right"
                textAlignVertical="top"
                value={comment}
                onChangeText={(t) => t.length <= 500 && setComment(t)}
                maxLength={500}
              />
              <View style={s.commentFooter}>
                <Text style={s.charCount}>{comment.length}/500</Text>
                <TouchableOpacity>
                  <Feather name="edit-2" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Tags */}
          <View style={s.tagsSection}>
            <Text style={s.sectionTitle}>ما الذي أعجبك في الخدمة؟</Text>
            <View style={s.tagsGrid}>
              {TAGS.map((tag, i) => {
                const sel = selectedTags.includes(i);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => toggleTag(i)}
                    style={[s.tag, sel && { backgroundColor: "#DBEAFE", borderColor: "#3B82F6" }]}
                  >
                    <MaterialCommunityIcons name={tag.icon as any} size={18} color={sel ? "#3B82F6" : "#64748B"} />
                    <Text style={[s.tagText, sel && { color: "#3B82F6" }]}>{tag.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Trust Banner */}
          <View style={s.trustBanner}>
            <View style={s.trustContent}>
              <Text style={s.trustTitle}>تقييمك يهمنا</Text>
              <View style={s.trustDescRow}>
                <MaterialCommunityIcons name="star-four-points" size={12} color="#F59E0B" />
                <Text style={s.trustDesc}>نحرص على تقديم أفضل الخدمات بناءً على ملاحظاتك</Text>
              </View>
            </View>
            <View style={s.trustIconWrap}>
              <MaterialCommunityIcons name="shield-check" size={36} color="#16C47F" />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleSubmit} style={s.submitBtn}>
            <Text style={s.submitText}>إرسال التقييم</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/home" as any)} style={s.skipRow}>
            <Feather name="chevron-left" size={16} color="#94A3B8" />
            <Text style={s.skipText}>تخطي التقييم</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  hIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  hCenter: { flex: 1, alignItems: "center" },
  hTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#1E293B" },
  hSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#94A3B8", marginTop: 2 },

  profileCard: { marginHorizontal: 24, borderRadius: 28, padding: 28, alignItems: "center", marginBottom: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: "#FFF", marginBottom: 10 },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#1E293B" },
  role: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#64748B", marginTop: 2 },

  ratingHeading: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#1E293B", textAlign: "center", marginBottom: 14 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 6 },
  ratingLabel: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#16C47F", textAlign: "center", marginBottom: 20 },

  commentSection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#1E293B", textAlign: "right", marginBottom: 10 },
  commentBox: { backgroundColor: "#FFF", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 14, minHeight: 120 },
  input: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: "#1E293B", minHeight: 80, textAlignVertical: "top" },
  commentFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  charCount: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#94A3B8" },

  tagsSection: { paddingHorizontal: 20, marginBottom: 16 },
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#E2E8F0" },
  tagText: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, color: "#64748B" },

  trustBanner: { marginHorizontal: 20, borderRadius: 20, backgroundColor: "#F0FDF4", padding: 16, flexDirection: "row-reverse", alignItems: "center", marginBottom: 16 },
  trustContent: { flex: 1, alignItems: "flex-end" },
  trustTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#1E293B", marginBottom: 4 },
  trustDescRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  trustDesc: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "#64748B" },
  trustIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginLeft: 12 },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 8 },
  submitBtn: { height: 56, borderRadius: 16, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  submitText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  skipRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 12 },
  skipText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#94A3B8" },
});
