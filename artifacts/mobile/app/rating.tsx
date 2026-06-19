import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Platform, ActivityIndicator, Animated, I18nManager,
} from "react-native";
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
import { useAuth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// ── Constants ─────────────────────────────────────────────────────────────────
const TAGS = [
  { label: "الاهتمام بالتفاصيل", icon: "checkbox-marked-outline" },
  { label: "الالتزام بالوقت",    icon: "clock-outline" },
  { label: "التعامل الراقي",     icon: "heart-outline" },
  { label: "جودة التنظيف",       icon: "auto-fix" },
  { label: "احترافية عالية",     icon: "account-star-outline" },
  { label: "معدات نظيفة",        icon: "broom" },
];

const RATING_LABELS = ["", "سيء جداً", "سيء", "متوسط", "ممتاز", "رائع جداً 🌟"];

type SubCategory = { key: string; label: string; icon: string };
const SUB_CATEGORIES: SubCategory[] = [
  { key: "punctuality",    label: "الالتزام بالوقت",   icon: "clock-outline" },
  { key: "quality",        label: "جودة التنظيف",       icon: "auto-fix" },
  { key: "cleanliness",    label: "النظافة الشخصية",    icon: "water-outline" },
  { key: "communication",  label: "التواصل",             icon: "message-outline" },
];

type TipOption = { key: string; label: string; pct: number | null };
const TIP_OPTIONS: TipOption[] = [
  { key: "0",    label: "لا",   pct: 0 },
  { key: "5",    label: "5%",   pct: 5 },
  { key: "10",   label: "10%",  pct: 10 },
  { key: "15",   label: "15%",  pct: 15 },
  { key: "custom", label: "مخصص", pct: null },
];

// ── SubCategory mini star row ─────────────────────────────────────────────────
function SubRating({ item, value, onChange }: { item: SubCategory; value: number; onChange: (v: number) => void }) {
  return (
    <View style={sub.row}>
      <View style={sub.label}>
        <MaterialCommunityIcons name={item.icon as any} size={16} color="#64748B" />
        <Text style={sub.labelText}>{item.label}</Text>
      </View>
      <View style={sub.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(star);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <MaterialCommunityIcons
              name={star <= value ? "star" : "star-outline"}
              size={24}
              color={star <= value ? "#F59E0B" : "#CBD5E1"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const sub = StyleSheet.create({
  row: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  label: { flexDirection: I18nManager.isRTL ? "row" : "row-reverse", alignItems: "center", gap: 6 },
  labelText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#334155" },
  stars: { flexDirection: "row", gap: 2 },
});

// ── Tip Selector ──────────────────────────────────────────────────────────────
function TipSelector({
  bookingTotal,
  selectedKey,
  onSelect,
  customAmount,
  onCustomChange,
}: {
  bookingTotal: number;
  selectedKey: string;
  onSelect: (k: string) => void;
  customAmount: string;
  onCustomChange: (v: string) => void;
}) {
  const tipAmount =
    selectedKey === "custom"
      ? parseFloat(customAmount) || 0
      : (TIP_OPTIONS.find((o) => o.key === selectedKey)?.pct ?? 0) / 100 * bookingTotal;

  return (
    <View style={tip.container}>
      <View style={tip.header}>
        <MaterialCommunityIcons name="hand-coin-outline" size={18} color="#F59E0B" />
        <Text style={tip.title}>إكرامية للفني</Text>
        {tipAmount > 0 && (
          <View style={tip.badge}>
            <Text style={tip.badgeText}>{tipAmount.toFixed(0)} ر.س</Text>
          </View>
        )}
      </View>
      <Text style={tip.sub}>اختياري — شجّع الفني بإكرامية على عمله الرائع</Text>
      <View style={tip.row}>
        {TIP_OPTIONS.map((opt) => {
          const sel = selectedKey === opt.key;
          const amount = opt.pct !== null ? (opt.pct / 100 * bookingTotal).toFixed(0) : null;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                onSelect(opt.key);
              }}
              style={[tip.chip, sel && tip.chipSel]}
            >
              <Text style={[tip.chipLabel, sel && tip.chipLabelSel]}>{opt.label}</Text>
              {amount !== null && amount !== "0" && (
                <Text style={[tip.chipSub, sel && { color: "#FFF" }]}>{amount} ر.س</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedKey === "custom" && (
        <View style={tip.customRow}>
          <Text style={tip.customLabel}>أدخل المبلغ (ر.س)</Text>
          <TextInput
            style={tip.customInput}
            keyboardType="numeric"
            placeholder="مثلاً: 20"
            placeholderTextColor="#94A3B8"
            value={customAmount}
            onChangeText={(v) => onCustomChange(v.replace(/[^0-9]/g, ""))}
            maxLength={4}
          />
        </View>
      )}
    </View>
  );
}

const tip = StyleSheet.create({
  container: { marginHorizontal: 20, marginBottom: 16, backgroundColor: "#FFFBEB", borderRadius: 20, padding: 16 },
  header: { flexDirection: I18nManager.isRTL ? "row" : "row-reverse", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#1E293B", flex: 1 },
  badge: { backgroundColor: "#F59E0B", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#FFF" },
  sub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#92400E", marginBottom: 12 },
  row: { flexDirection: I18nManager.isRTL ? "row" : "row-reverse", gap: 8, flexWrap: "wrap" },
  chip: {
    flex: 1, minWidth: 60, borderRadius: 12, borderWidth: 1.5, borderColor: "#FDE68A",
    backgroundColor: "#FFF", alignItems: "center", paddingVertical: 8, paddingHorizontal: 6,
  },
  chipSel: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  chipLabel: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#92400E" },
  chipLabelSel: { color: "#FFF" },
  chipSub: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#92400E", marginTop: 2 },
  customRow: { flexDirection: I18nManager.isRTL ? "row" : "row-reverse", alignItems: "center", gap: 12, marginTop: 10 },
  customLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#92400E" },
  customInput: {
    flex: 1, height: 44, backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1.5,
    borderColor: "#FDE68A", paddingHorizontal: 14, fontFamily: "Tajawal_700Bold",
    fontSize: 16, color: "#1E293B", textAlign: "center",
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function RatingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ bookingId?: string; id?: string; total?: string }>();
  const bookingId = params.bookingId || params.id;
  const bookingTotal = parseFloat(params.total || "0") || 120;

  const [rating, setRating] = useState(4);
  const [subRatings, setSubRatings] = useState<Record<string, number>>({
    punctuality: 4, quality: 4, cleanliness: 4, communication: 4,
  });
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tipKey, setTipKey] = useState("0");
  const [customTip, setCustomTip] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerAvatar, setProviderAvatar] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const successScale = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!bookingId || !session?.user) return;
    (async () => {
      const { data: bk } = await supabase
        .from("bookings")
        .select("provider_id, provider:profiles!bookings_provider_id_fkey(full_name, avatar_url)")
        .eq("id", bookingId)
        .maybeSingle();
      if (bk) {
        setProviderId(bk.provider_id ?? null);
        setProviderName((bk.provider as any)?.full_name || "");
        setProviderAvatar((bk.provider as any)?.avatar_url || null);
      }
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (existing) setAlreadyRated(true);
    })();
  }, [bookingId, session]);

  const showSuccess = () => {
    setDone(true);
    Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSubmit = async () => {
    if (!session?.user || !bookingId || !providerId || submitting || alreadyRated) return;
    setSubmitting(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tagText = selectedTags.map((i) => TAGS[i].label).join("، ");
    const subText = SUB_CATEGORIES
      .map((c) => `${c.label}: ${"⭐".repeat(subRatings[c.key] ?? 4)}`)
      .join("، ");
    const fullComment = [comment.trim(), tagText, subText].filter(Boolean).join("\n") || null;

    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      provider_id: providerId,
      user_id: session.user.id,
      rating,
      comment: fullComment,
    });

    if (error) {
      console.log("[rating] insert error:", error.message);
      setSubmitting(false);
      return;
    }

    const { data: allRatings } = await supabase
      .from("reviews")
      .select("rating")
      .eq("provider_id", providerId);
    if (allRatings?.length) {
      const avg = allRatings.reduce((s, r) => s + Number(r.rating), 0) / allRatings.length;
      await supabase.from("providers").update({ rating: Math.round(avg * 10) / 10 }).eq("id", providerId);
    }

    const tipAmount =
      tipKey === "custom"
        ? parseFloat(customTip) || 0
        : (TIP_OPTIONS.find((o) => o.key === tipKey)?.pct ?? 0) / 100 * bookingTotal;

    const notifTitle = "⭐ تقييم جديد!";
    const notifBody =
      `حصلت على ${rating} نجوم${tipAmount > 0 ? ` + إكرامية ${tipAmount.toFixed(0)} ر.س` : ""}` +
      (comment.trim() ? ` — "${comment.trim().slice(0, 50)}"` : "");
    createNotification(providerId, "review_received", notifTitle, notifBody, { bookingId });

    setSubmitting(false);
    showSuccess();
  };

  const toggleTag = (i: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelectedTags((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const setSubRating = (key: string, value: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubRatings((prev) => ({ ...prev, [key]: value }));
    const avg = Math.round(
      Object.values({ ...subRatings, [key]: value }).reduce((a, b) => a + b, 0) /
      SUB_CATEGORIES.length
    );
    setRating(Math.max(1, Math.min(5, avg)));
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={[s.root, { backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" }]}>
        <Animated.View style={{ transform: [{ scale: successScale }], alignItems: "center" }}>
          <View style={s.successCircle}>
            <MaterialCommunityIcons name="check-decagram" size={72} color="#16C47F" />
          </View>
          <Text style={s.successTitle}>شكراً على تقييمك!</Text>
          <Text style={s.successSub}>رأيك يساعدنا على تحسين الخدمة لك ولغيرك</Text>
          <View style={s.starsRowSmall}>
            {[1, 2, 3, 4, 5].map((n) => (
              <MaterialCommunityIcons key={n} name={n <= rating ? "star" : "star-outline"} size={28} color={n <= rating ? "#F59E0B" : "#CBD5E1"} />
            ))}
          </View>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/home" as any)} style={[s.doneBtn, { backgroundColor: colors.primary }]}>
            <Text style={s.doneBtnT}>العودة للرئيسية</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Already Rated ───────────────────────────────────────────────────────────
  if (alreadyRated) {
    return (
      <View style={[s.root, { backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <MaterialCommunityIcons name="star-check" size={72} color="#F59E0B" />
        <Text style={s.successTitle}>قيّمت هذه الخدمة سابقاً</Text>
        <Text style={[s.successSub, { marginBottom: 24 }]}>شكراً لمشاركتك رأيك!</Text>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/home" as any)} style={[s.doneBtn, { backgroundColor: colors.primary }]}>
          <Text style={s.doneBtnT}>العودة للرئيسية</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.root, { backgroundColor: "#F8FAFC" }]}>
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={s.hIcon} onPress={() => router.replace("/(tabs)/home" as any)}>
            <Feather name="x" size={20} color="#1E293B" />
          </TouchableOpacity>
          <View style={s.hCenter}>
            <Text style={s.hTitle}>تقييم الخدمة</Text>
            <Text style={s.hSub}>كيف كانت تجربتك اليوم؟</Text>
          </View>
          <View style={s.hIcon} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
          {/* Provider Card */}
          <LinearGradient colors={["#EDE9FE", "#F0F4FF"]} style={s.profileCard}>
            <Image
              source={providerAvatar ? { uri: providerAvatar } : require("@/assets/images/default-avatar.png")}
              style={s.avatar}
            />
            <Text style={s.name}>{providerName || "مزود الخدمة"}</Text>
            <Text style={s.role}>مزود خدمة معتمد ✓</Text>
          </LinearGradient>

          {/* Overall Stars */}
          <Text style={s.ratingHeading}>
            {providerName ? `قيّم تجربتك مع ${providerName.split(" ")[0]}` : "قيّم تجربتك"}
          </Text>
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRating(star);
                  const newSubs: Record<string, number> = {};
                  SUB_CATEGORIES.forEach((c) => { newSubs[c.key] = star; });
                  setSubRatings(newSubs);
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={star <= rating ? "star" : "star-outline"}
                  size={56}
                  color={star <= rating ? "#F59E0B" : "#CBD5E1"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.ratingLabel, { color: rating >= 4 ? "#16C47F" : rating === 3 ? "#F59E0B" : "#EF4444" }]}>
            {RATING_LABELS[rating]}
          </Text>

          {/* Sub-Category Ratings */}
          <View style={s.subSection}>
            <Text style={s.sectionTitle}>تقييم تفصيلي</Text>
            <View style={[s.subCard, { backgroundColor: "#FFF" }]}>
              {SUB_CATEGORIES.map((item, idx) => (
                <View key={item.key} style={idx === SUB_CATEGORIES.length - 1 ? { paddingVertical: 10 } : {}}>
                  <SubRating
                    item={item}
                    value={subRatings[item.key] ?? 4}
                    onChange={(v) => setSubRating(item.key, v)}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Comment */}
          <View style={s.commentSection}>
            <Text style={s.sectionTitle}>شاركنا رأيك</Text>
            <View style={s.commentBox}>
              <TextInput
                style={s.input}
                placeholder="اكتب ملاحظاتك عن الخدمة…"
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                value={comment}
                onChangeText={(t) => t.length <= 500 && setComment(t)}
                maxLength={500}
              />
              <View style={s.commentFooter}>
                <Text style={s.charCount}>{comment.length}/500</Text>
              </View>
            </View>
          </View>

          {/* Tags */}
          <View style={s.tagsSection}>
            <Text style={s.sectionTitle}>ما الذي أعجبك؟</Text>
            <View style={s.tagsGrid}>
              {TAGS.map((tag, i) => {
                const sel = selectedTags.includes(i);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => toggleTag(i)}
                    activeOpacity={0.8}
                    style={[s.tag, sel && { backgroundColor: "#DBEAFE", borderColor: "#3B82F6" }]}
                  >
                    <MaterialCommunityIcons name={tag.icon as any} size={18} color={sel ? "#3B82F6" : "#64748B"} />
                    <Text style={[s.tagText, sel && { color: "#3B82F6" }]}>{tag.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tip */}
          <TipSelector
            bookingTotal={bookingTotal}
            selectedKey={tipKey}
            onSelect={setTipKey}
            customAmount={customTip}
            onCustomChange={setCustomTip}
          />

          {/* Trust Banner */}
          <View style={s.trustBanner}>
            <View style={s.trustContent}>
              <Text style={s.trustTitle}>تقييمك يهمنا</Text>
              <View style={s.trustDescRow}>
                <MaterialCommunityIcons name="star-four-points" size={12} color="#F59E0B" />
                <Text style={s.trustDesc}>نحرص على تحسين خدماتنا بناءً على ملاحظاتك</Text>
              </View>
            </View>
            <View style={s.trustIconWrap}>
              <MaterialCommunityIcons name="shield-check" size={36} color="#16C47F" />
            </View>
          </View>
        </ScrollView>

        {/* Submit Bar */}
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSubmit}
            disabled={submitting}
            style={[s.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.7 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.submitText}>إرسال التقييم</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/home" as any)} style={s.skipRow}>
            <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={16} color="#94A3B8" />
            <Text style={s.skipText}>تخطي التقييم</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  hIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  hCenter: { flex: 1, alignItems: "center" },
  hTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#1E293B" },
  hSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#94A3B8", marginTop: 2 },

  profileCard: {
    marginHorizontal: 24, borderRadius: 28, padding: 28,
    alignItems: "center", marginBottom: 20,
  },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: "#FFF", marginBottom: 10 },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#1E293B" },
  role: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#64748B", marginTop: 2 },

  ratingHeading: {
    fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#1E293B",
    textAlign: "center", marginBottom: 14,
  },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 6 },
  starsRowSmall: { flexDirection: "row", gap: 4, marginBottom: 24, marginTop: 8 },
  ratingLabel: { fontFamily: "Tajawal_700Bold", fontSize: 18, textAlign: "center", marginBottom: 20 },

  subSection: { paddingHorizontal: 20, marginBottom: 16 },
  subCard: { borderRadius: 20, padding: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },

  commentSection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#1E293B", marginBottom: 10 },
  commentBox: {
    backgroundColor: "#FFF", borderRadius: 20, borderWidth: 1,
    borderColor: "#E2E8F0", padding: 14, minHeight: 100,
  },
  input: {
    fontFamily: "Tajawal_400Regular", fontSize: 13, color: "#1E293B",
    minHeight: 70, textAlignVertical: "top",
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  commentFooter: { flexDirection: "row", justifyContent: "flex-start", alignItems: "center", marginTop: 6 },
  charCount: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#94A3B8" },

  tagsSection: { paddingHorizontal: 20, marginBottom: 16 },
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#E2E8F0",
  },
  tagText: { fontFamily: "Tajawal_600SemiBold", fontSize: 12, color: "#64748B" },

  trustBanner: {
    marginHorizontal: 20, borderRadius: 20, backgroundColor: "#F0FDF4",
    padding: 16, flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center", marginBottom: 16,
  },
  trustContent: { flex: 1, alignItems: I18nManager.isRTL ? "flex-end" : "flex-start" },
  trustTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#1E293B", marginBottom: 4 },
  trustDescRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustDesc: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "#64748B" },
  trustIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#DCFCE7",
    alignItems: "center", justifyContent: "center", marginStart: 12,
  },

  bottomBar: {
    position: "absolute", bottom: 0, start: 0, end: 0,
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 8,
  },
  submitBtn: {
    height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  submitText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  skipRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 12 },
  skipText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#94A3B8" },

  successCircle: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: "#DCFCE7",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  successTitle: { fontFamily: "Tajawal_700Bold", fontSize: 22, color: "#1E293B", textAlign: "center" },
  successSub: {
    fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#64748B",
    textAlign: "center", marginTop: 6, marginBottom: 16, paddingHorizontal: 32,
  },
  doneBtn: {
    marginTop: 12, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 16,
  },
  doneBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFF" },
});
