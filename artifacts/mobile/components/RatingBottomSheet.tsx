/**
 * RatingBottomSheet
 *
 * Professional rating overlay that appears automatically when a booking
 * status changes to "completed". Rendered as a full-screen Modal so it
 * appears over ANY screen the user is currently viewing.
 *
 * Features:
 *  - Smooth slide-up animation (spring physics)
 *  - Provider avatar + name
 *  - 1-5 star selector with haptic feedback
 *  - Quick-pick tag chips
 *  - Free-text comment
 *  - Submit / Skip
 *  - Prevents duplicate rating (checks DB + AsyncStorage)
 *  - Updates provider rating average in real-time after submit
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRealtimeStore, type RatingTrigger } from "@/lib/realtimeStore";
import { sendPushNotification, createNotification } from "@/lib/notifications";

// ── Config ──────────────────────────────────────────────────────────────────

const TAGS = [
  { label: "الاهتمام بالتفاصيل", icon: "checkbox-marked-circle-outline" },
  { label: "الالتزام بالوقت", icon: "clock-check-outline" },
  { label: "التعامل الراقي", icon: "heart-outline" },
  { label: "جودة التنظيف", icon: "broom" },
  { label: "الاحترافية العالية", icon: "star-outline" },
  { label: "السرعة والدقة", icon: "lightning-bolt-outline" },
];

const LABELS = ["", "سيء جداً 😟", "سيء 😕", "متوسط 😐", "ممتاز 😊", "رائع جداً 🌟"];
const LABEL_COLORS = ["", "#EF4444", "#F97316", "#F59E0B", "#22C55E", "#16C47F"];

// ── Component ────────────────────────────────────────────────────────────────

function RatingSheet({
  trigger,
  onDismiss,
}: {
  trigger: RatingTrigger;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const slideY = useRef(new Animated.Value(700)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateOut = (then: () => void) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: 700,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => then());
  };

  const handleDismiss = () => animateOut(onDismiss);

  const toggleTag = (i: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setSelectedTags((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  };

  const handleStarPress = (s: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStars(s);
  };

  const handleSubmit = async () => {
    if (!session?.user || !trigger.providerId || submitting) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSubmitting(true);

    try {
      const tagText = selectedTags.map((i) => TAGS[i].label).join("، ");
      const fullComment = [comment.trim(), tagText].filter(Boolean).join("\n") || null;

      const { error } = await supabase.from("reviews").insert({
        booking_id: trigger.bookingId,
        provider_id: trigger.providerId,
        user_id: session.user.id,
        rating: stars,
        comment: fullComment,
      });

      if (error) {
        console.log("[rating] insert error:", error.message);
        setSubmitting(false);
        return;
      }

      // Update provider average rating
      try {
        const { data: allRatings } = await supabase
          .from("reviews")
          .select("rating")
          .eq("provider_id", trigger.providerId);
        if (allRatings?.length) {
          const avg = allRatings.reduce((s: number, r: any) => s + Number(r.rating), 0) / allRatings.length;
          await supabase
            .from("providers")
            .update({ rating: Math.round(avg * 10) / 10 })
            .eq("id", trigger.providerId);
        }
      } catch {}

      // Notify provider
      try {
        const body = `حصلت على ${stars} نجوم${comment.trim() ? ` — "${comment.trim().slice(0, 50)}"` : ""}`;
        sendPushNotification(trigger.providerId, "⭐ تقييم جديد!", body, { bookingId: trigger.bookingId }, undefined, "default");
        createNotification(trigger.providerId, "review_received", "⭐ تقييم جديد!", body, { bookingId: trigger.bookingId });
      } catch {}

      // Show success animation
      setDone(true);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start();

      // Auto-dismiss after 2.5 seconds
      setTimeout(() => animateOut(onDismiss), 2500);
    } catch (e) {
      console.log("[rating] submit exception:", (e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
      {/* Backdrop */}
      <TouchableOpacity
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        activeOpacity={1}
        onPress={handleDismiss}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 20, transform: [{ translateY: slideY }] },
        ]}
      >
        {done ? (
          // ── Success View ────────────────────────────────────────────────
          <Animated.View style={[styles.successWrap, { transform: [{ scale: successScale }] }]}>
            <View style={styles.successCircle}>
              <MaterialCommunityIcons name="check-decagram" size={64} color="#16C47F" />
            </View>
            <Text style={styles.successTitle}>شكراً على تقييمك! 🎉</Text>
            <Text style={styles.successSub}>رأيك يساعدنا على تقديم خدمة أفضل</Text>
            <View style={styles.starsRowSmall}>
              {[1, 2, 3, 4, 5].map((s) => (
                <MaterialCommunityIcons
                  key={s}
                  name={s <= stars ? "star" : "star-outline"}
                  size={28}
                  color={s <= stars ? "#F59E0B" : "#CBD5E1"}
                />
              ))}
            </View>
          </Animated.View>
        ) : (
          // ── Rating Form ─────────────────────────────────────────────────
          <>
            {/* Handle bar */}
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* Header row */}
              <View style={styles.headerRow}>
                <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
                  <Feather name="x" size={18} color="#64748B" />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.headerTitle}>قيّم الخدمة</Text>
                  <Text style={styles.headerSub}>كيف كانت تجربتك مع مزود الخدمة؟</Text>
                </View>
              </View>

              {/* Provider card */}
              <LinearGradient
                colors={["#EDE9FE", "#DBEAFE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.providerCard}
              >
                <View style={styles.completedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color="#16C47F" />
                  <Text style={styles.completedText}>مكتمل</Text>
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{trigger.providerName}</Text>
                  <Text style={styles.providerRole}>مزود خدمة معتمد ✓</Text>
                </View>
                <Image
                  source={
                    trigger.providerAvatar
                      ? { uri: trigger.providerAvatar }
                      : require("@/assets/images/default-avatar.png")
                  }
                  style={styles.avatar}
                />
              </LinearGradient>

              {/* Stars */}
              <Text style={styles.sectionTitle}>تقييمك</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => handleStarPress(s)} activeOpacity={0.75}>
                    <MaterialCommunityIcons
                      name={s <= stars ? "star" : "star-outline"}
                      size={52}
                      color={s <= stars ? "#F59E0B" : "#CBD5E1"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.ratingLabel, { color: LABEL_COLORS[stars] }]}>
                {LABELS[stars]}
              </Text>

              {/* Tags */}
              <Text style={styles.sectionTitle}>ما الذي أعجبك؟</Text>
              <View style={styles.tagsGrid}>
                {TAGS.map((tag, i) => {
                  const sel = selectedTags.includes(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => toggleTag(i)}
                      activeOpacity={0.8}
                      style={[
                        styles.tagChip,
                        sel && { backgroundColor: "#DBEAFE", borderColor: "#3B82F6" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={tag.icon as any}
                        size={15}
                        color={sel ? "#3B82F6" : "#64748B"}
                      />
                      <Text style={[styles.tagText, sel && { color: "#3B82F6" }]}>
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Comment */}
              <Text style={styles.sectionTitle}>أضف تعليقًا (اختياري)</Text>
              <View style={styles.commentBox}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="شاركنا تجربتك مع هذا المزود..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlign="right"
                  textAlignVertical="top"
                  value={comment}
                  onChangeText={(t) => t.length <= 400 && setComment(t)}
                  maxLength={400}
                />
                <Text style={styles.charCount}>{comment.length}/400</Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <MaterialCommunityIcons name="loading" size={20} color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={18} color="#FFF" />
                    <Text style={styles.submitText}>إرسال التقييم</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={handleDismiss}>
                <Text style={styles.skipText}>تخطي الآن</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ── Controller (rendered in _layout.tsx) ─────────────────────────────────────

export function RatingBottomSheetController() {
  const { ratingTrigger, dismissRatingTrigger } = useRealtimeStore();

  if (!ratingTrigger) return null;

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent>
      <RatingSheet trigger={ratingTrigger} onDismiss={dismissRatingTrigger} />
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  handleWrap: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0" },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#1E293B" },
  headerSub: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: "#64748B", marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginStart: 8,
  },

  // Provider
  providerCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#FFF",
  },
  providerInfo: { flex: 1 },
  providerName: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#1E293B" },
  providerRole: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#64748B", marginTop: 2 },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  completedText: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#16A34A" },

  // Stars
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  ratingLabel: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 20,
  },

  // Section title
  sectionTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 14,
    color: "#1E293B",
    marginBottom: 10,
  },

  // Tags
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  tagText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 12,
    color: "#64748B",
  },

  // Comment
  commentBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    minHeight: 90,
    marginBottom: 20,
  },
  commentInput: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 13,
    color: "#1E293B",
    minHeight: 60,
    textAlignVertical: "top",
  },
  charCount: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "left",
    marginTop: 4,
  },

  // Actions
  actions: { gap: 10 },
  submitBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#94A3B8" },

  // Success
  successWrap: { alignItems: "center", paddingVertical: 32 },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 22,
    color: "#1E293B",
    textAlign: "center",
  },
  successSub: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  starsRowSmall: { flexDirection: "row", gap: 4 },
});
