/**
 * InAppBanner — WhatsApp-style in-app notification banner.
 *
 * Shown automatically when a push notification arrives while the app is
 * in the FOREGROUND (the OS banner is suppressed on some iOS versions in
 * foreground). Slides in from the top, auto-dismisses after 4.5 s, and
 * taps navigate to the correct screen via deep-link logic.
 *
 * Usage: mount <InAppBanner /> once inside the provider tree in _layout.tsx.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, Platform, Pressable, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

/* ── Types ──────────────────────────────────────────────────────────────── */

type BannerData = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, any>;
};

/* ── Icon / colour per notification type ───────────────────────────────── */

const TYPE_META: Record<string, { icon: string; color: string }> = {
  booking_created:    { icon: "shopping-bag",  color: "#2F80ED" },
  booking_accepted:   { icon: "check-circle",  color: "#16C47F" },
  booking_on_way:     { icon: "car",           color: "#8B5CF6" },
  booking_started:    { icon: "broom",         color: "#F59E0B" },
  booking_completed:  { icon: "check-all",     color: "#22C55E" },
  booking_cancelled:  { icon: "close-circle",  color: "#EF4444" },
  booking_update:     { icon: "refresh",       color: "#3B82F6" },
  message:            { icon: "message-text",  color: "#2F80ED" },
  chat_message:       { icon: "message-text",  color: "#2F80ED" },
  payment:            { icon: "cash",          color: "#16C47F" },
  payment_received:   { icon: "cash-check",    color: "#16C47F" },
  offer:              { icon: "tag",           color: "#EC4899" },
  promo:              { icon: "tag",           color: "#EC4899" },
  review_request:     { icon: "star",          color: "#F59E0B" },
  review_received:    { icon: "star-circle",   color: "#F59E0B" },
  referral:           { icon: "account-multiple", color: "#16C47F" },
};

/* ── Deep-link navigation ───────────────────────────────────────────────── */

export function navigateForType(type: string, data: Record<string, any>) {
  try {
    const bookingId = data?.bookingId || data?.booking_id;
    if (type === "chat_message" || type === "message") {
      const roomId = data?.roomId || data?.room_id;
      router.push({
        pathname: "/chat-detail",
        params: { roomId, bookingId, name: data?.senderName || data?.name || "" },
      } as any);
    } else if (type === "booking_created") {
      // Provider taps → go to booking details
      if (bookingId) router.push(`/(provider)/booking-details?id=${bookingId}` as any);
      else router.push("/(provider)/dashboard" as any);
    } else if (type === "review_request" || type === "review_received") {
      // review_request → client rates; review_received → provider sees rating screen
      if (bookingId) router.push({ pathname: "/rating", params: { bookingId } } as any);
      else router.push("/(provider)/profile" as any);
    } else if (type === "payment" || type === "payment_received") {
      router.push("/(provider)/wallet" as any);
    } else if (
      type === "booking_accepted"  ||
      type === "booking_on_way"    ||
      type === "booking_started"   ||
      type === "booking_completed" ||
      type === "booking_update"    ||
      type === "booking_cancelled"
    ) {
      // Client taps booking status update → go to tracking
      if (bookingId) router.push({ pathname: "/tracking", params: { id: bookingId } } as any);
      else router.push("/(tabs)/bookings" as any);
    } else if (bookingId) {
      router.push({ pathname: "/tracking", params: { id: bookingId } } as any);
    } else {
      router.push("/notifications" as any);
    }
  } catch {}
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function InAppBanner() {
  const insets  = useSafeAreaInsets();
  const colors  = useColors();
  const [banner, setBanner] = useState<BannerData | null>(null);
  const slideY  = useRef(new Animated.Value(-160)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(slideY, { toValue: -160, duration: 280, useNativeDriver: true }).start(
      () => setBanner(null),
    );
  }, [slideY]);

  const show = useCallback(
    (b: BannerData) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setBanner(b);
      slideY.setValue(-160);
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 90,
        friction: 13,
      }).start();
      timerRef.current = setTimeout(dismiss, 4500);
    },
    [slideY, dismiss],
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationReceivedListener((notif) => {
      const content = notif.request.content;
      const data    = (content.data as Record<string, any>) ?? {};
      const type    = (data.type as string) || "";
      show({
        id:    notif.request.identifier,
        title: content.title ?? "إشعار جديد",
        body:  content.body  ?? "",
        type,
        data,
      });
    });
    return () => sub.remove();
  }, [show]);

  if (!banner || Platform.OS === "web") return null;

  const meta = TYPE_META[banner.type] ?? { icon: "bell-outline", color: "#6D28D9" };

  return (
    <Animated.View
      style={[s.wrap, { top: insets.top + 10, transform: [{ translateY: slideY }] }]}
      pointerEvents="box-none"
    >
      <Pressable
        style={[s.card, { backgroundColor: colors.card }]}
        onPress={() => { dismiss(); navigateForType(banner.type, banner.data); }}
        android_ripple={{ color: "rgba(0,0,0,0.06)", borderless: false }}
      >
        {/* Coloured left accent bar */}
        <View style={[s.accent, { backgroundColor: meta.color }]} />

        {/* Icon */}
        <View style={[s.iconBox, { backgroundColor: meta.color + "1A" }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={24} color={meta.color} />
        </View>

        {/* Text */}
        <View style={s.textBox}>
          <Text style={[s.title, { color: colors.foreground }]} numberOfLines={1}>
            {banner.title}
          </Text>
          <Text style={[s.body, { color: colors.mutedForeground }]} numberOfLines={2}>
            {banner.body}
          </Text>
        </View>

        {/* Dismiss */}
        <Pressable
          onPress={dismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={s.closeBtn}
        >
          <Feather name="x" size={15} color={colors.mutedForeground} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    start: 10,
    end: 10,
    zIndex: 99999,
  },
  card: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingEnd: 12,
    paddingStart: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  accent: {
    width: 4,
    alignSelf: "stretch",
    borderTopEndRadius: 2,
    borderBottomEndRadius: 2,
    marginEnd: 4,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textBox: { flex: 1 },
  title: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 13,
    marginBottom: 2,
  },
  body: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
