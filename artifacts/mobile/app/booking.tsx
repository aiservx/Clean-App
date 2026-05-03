import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator , I18nManager} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { useBooking, DEFAULT_SERVICE } from "@/store/booking";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { distanceKm, getCurrentResolved, type ResolvedAddress } from "@/lib/location";

const STEPS = [
  { id: 1, title: "الخدمة", status: "completed" },
  { id: 2, title: "التفاصيل", status: "completed" },
  { id: 3, title: "الموعد", status: "completed" },
  { id: 4, title: "تأكيد", status: "active" },
];

const AR_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

// Dynamically generate the next 7 days starting from today (real, not hardcoded)
function buildUpcomingDays() {
  const out: { day: string; num: string; month: string; iso: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      day: i === 0 ? "اليوم" : i === 1 ? "غداً" : AR_DAYS[d.getDay()],
      num: String(d.getDate()),
      month: AR_MONTHS[d.getMonth()],
      iso: d.toISOString(),
    });
  }
  return out;
}

const TIMES = [
  { label: "صباحاً", range: "08:00-10:00", h: 8 },
  { label: "صباحاً", range: "10:00-12:00", h: 10 },
  { label: "ظهراً", range: "12:00-14:00", h: 12 },
  { label: "عصراً", range: "16:00-18:00", h: 16 },
  { label: "مساء", range: "18:00-20:00", h: 18 },
];

type Provider = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  rating: number;
  experience_years: number;
  hourly_rate: number;
  current_lat: number | null;
  current_lng: number | null;
  d_km: number | null;
};

const tap = () => {
  if (Platform.OS !== "web") Haptics.selectionAsync();
};

export default function BookingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const booking = useBooking();
  const { session } = useAuth();

  const dates = useMemo(buildUpcomingDays, []);
  const service = booking.service ?? DEFAULT_SERVICE;
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProvs, setLoadingProvs] = useState(true);
  const [bookingType, setBookingType] = useState<"instant" | "scheduled">("scheduled");

  // Load real nearby providers from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProvs(true);
      try {
        const me: ResolvedAddress | null = await getCurrentResolved();
        const { data } = await supabase
          .from("providers")
          .select("id, rating, experience_years, current_lat, current_lng, hourly_rate, available, profiles(full_name, avatar_url)")
          .eq("available", true)
          .not("current_lat", "is", null)
          .not("current_lng", "is", null)
          .limit(15);
        if (cancelled) return;
        const mapped: Provider[] = (data ?? []).map((p: any) => {
          const lat = p.current_lat;
          const lng = p.current_lng;
          const d = me && lat && lng ? distanceKm({ lat: me.lat, lng: me.lng }, { lat, lng }) : null;
          return {
            id: p.id,
            full_name: p.profiles?.full_name || null,
            avatar_url: p.profiles?.avatar_url || null,
            rating: Number(p.rating || 0),
            experience_years: Number(p.experience_years || 0),
            hourly_rate: Number(p.hourly_rate || 0),
            current_lat: lat,
            current_lng: lng,
            d_km: d,
          };
        });
        // Sort by distance (nulls last)
        mapped.sort((a, b) => (a.d_km ?? 999) - (b.d_km ?? 999));
        setProviders(mapped);
      } catch (e) {
        console.log("[v0] booking providers load failed", (e as Error).message);
      } finally {
        if (!cancelled) setLoadingProvs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedProvider = providers.find((p) => p.id === booking.cleanerId) ?? providers[0] ?? null;
  const selectedDate = dates[booking.dateIndex] ?? dates[0];
  const selectedTime = TIMES[booking.timeIndex] ?? TIMES[1];

  // Pricing derived from selected service
  const totals = useMemo(() => {
    const base = service.price;
    const fee = 10;
    const subtotal = base + fee;
    const vat = Math.round(subtotal * 0.15 * 100) / 100;
    const total = Math.round((subtotal + vat) * 100) / 100;
    return { base, fee, subtotal, vat, total };
  }, [service.price]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>إتمام الحجز</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            راجع تفاصيل الحجز وأكد الطلب
          </Text>
        </View>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Stepper */}
        <View style={styles.stepperContainer}>
          {[...STEPS].reverse().map((step, index) => (
            <React.Fragment key={step.id}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor:
                        step.status === "completed"
                          ? colors.primary
                          : step.status === "active"
                          ? colors.accent
                          : colors.border,
                      borderColor: step.status === "active" ? colors.accentLight : "transparent",
                      borderWidth: step.status === "active" ? 4 : 0,
                    },
                  ]}
                >
                  {step.status === "completed" ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.stepNumber}>{step.id}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    { color: step.status === "active" ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {step.title}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: step.status === "completed" ? colors.primary : colors.border },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Booking type toggle (Instant vs Scheduled) */}
        <View style={styles.typeToggleWrap}>
          <TouchableOpacity
            onPress={() => { tap(); setBookingType("instant"); }}
            style={[styles.typeBtn, bookingType === "instant" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={16} color={bookingType === "instant" ? "#FFF" : colors.primary} />
            <Text style={[styles.typeT, { color: bookingType === "instant" ? "#FFF" : colors.foreground }]}>حجز فوري</Text>
            <Text style={[styles.typeSub, { color: bookingType === "instant" ? "rgba(255,255,255,0.85)" : colors.mutedForeground }]}>أقرب فني الآن</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { tap(); setBookingType("scheduled"); }}
            style={[styles.typeBtn, bookingType === "scheduled" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="calendar" size={16} color={bookingType === "scheduled" ? "#FFF" : colors.primary} />
            <Text style={[styles.typeT, { color: bookingType === "scheduled" ? "#FFF" : colors.foreground }]}>حجز مجدول</Text>
            <Text style={[styles.typeSub, { color: bookingType === "scheduled" ? "rgba(255,255,255,0.85)" : colors.mutedForeground }]}>اختر موعداً</Text>
          </TouchableOpacity>
        </View>

        {bookingType === "scheduled" && (
          <>
            {/* Date Selection */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اختر التاريخ</Text>
              <Feather name="calendar" size={18} color={colors.foreground} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {dates.map((date, index) => {
                const selected = booking.dateIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    onPress={() => { tap(); booking.setDateIndex(index); }}
                    style={[
                      styles.dateCard,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.dateDay, { color: selected ? "#FFFFFF" : colors.mutedForeground }]}>{date.day}</Text>
                    <Text style={[styles.dateNum, { color: selected ? "#FFFFFF" : colors.foreground }]}>{date.num}</Text>
                    <Text style={[styles.dateMonth, { color: selected ? "#FFFFFF" : colors.mutedForeground }]}>{date.month}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time Selection */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اختر الوقت</Text>
              <Feather name="clock" size={18} color={colors.foreground} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {TIMES.map((time, index) => {
                const selected = booking.timeIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    onPress={() => { tap(); booking.setTimeIndex(index); }}
                    style={[
                      styles.timeCard,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.timeLabel, { color: selected ? "#FFFFFF" : colors.mutedForeground }]}>{time.label}</Text>
                    <Text style={[styles.timeRange, { color: selected ? "#FFFFFF" : colors.foreground }]}>{time.range}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Provider Selection — REAL from DB */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {bookingType === "instant" ? "أقرب فني متاح" : "اختر الفني"}
          </Text>
          <Feather name="user" size={18} color={colors.foreground} />
        </View>

        {loadingProvs ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : providers.length === 0 ? (
          <View style={[styles.emptyProv, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="account-search" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyProvT, { color: colors.foreground }]}>لا يوجد فنيون متاحون الآن</Text>
            <Text style={[styles.emptyProvS, { color: colors.mutedForeground }]}>سيتم تخصيص أقرب فني فور قبول الطلب</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {providers.map((p) => {
              const selected = booking.cleanerId === p.id;
              const initials = (p.full_name || "؟").trim().split(" ").map((s) => s[0]).slice(0, 2).join("");
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.85}
                  onPress={() => { tap(); booking.setCleanerId(p.id); }}
                  style={[
                    styles.cleanerCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: selected ? colors.primary : "transparent",
                      borderWidth: selected ? 2 : 0,
                    },
                  ]}
                >
                  {selected && (
                    <View style={[styles.cleanerCheck, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                  <Image source={p.avatar_url ? { uri: p.avatar_url } : require("@/assets/images/default-avatar.png")} style={styles.cleanerAvatar} />
                  <Text style={[styles.cleanerName, { color: colors.foreground }]} numberOfLines={1}>{p.full_name || "فني"}</Text>
                  <View style={styles.ratingRow}>
                    <Text style={[styles.ratingText, { color: colors.foreground }]}>{p.rating.toFixed(1)}</Text>
                    <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
                  </View>
                  {p.d_km != null && (
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>
                      {p.d_km < 1 ? `${Math.round(p.d_km * 1000)} م` : `${p.d_km.toFixed(1)} كم`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Order Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryHeader, { color: colors.foreground }]}>ملخص الطلب</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{service.title}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>الخدمة</Text>
          </View>
          {bookingType === "scheduled" && selectedDate && (
            <>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {selectedDate.day}، {selectedDate.num} {selectedDate.month}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>التاريخ</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{selectedTime.range}</Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>الوقت</Text>
              </View>
            </>
          )}
          {bookingType === "instant" && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>الآن (خلال دقائق)</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>الموعد</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {selectedProvider?.full_name || "أقرب فني متاح"}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>الفني</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.priceRow}>
            <Text style={[styles.priceValue, { color: colors.foreground }]}>{totals.base} ر.س</Text>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>السعر الأساسي</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceValue, { color: colors.foreground }]}>{totals.fee} ر.س</Text>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>رسوم الخدمة</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceValue, { color: colors.foreground }]}>{totals.vat} ر.س</Text>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>ضريبة القيمة المضافة (15%)</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.totalRow}>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{totals.total} ر.س</Text>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي</Text>
          </View>
        </View>

        {/* Payment Method */}
        <TouchableOpacity
          style={[styles.paymentRow, { backgroundColor: colors.card }]}
          onPress={() => router.push("/payment")}
          activeOpacity={0.8}
        >
          <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={20} color={colors.mutedForeground} />
          <View style={styles.paymentInfo}>
            <Text style={[styles.paymentText, { color: colors.foreground }]}>
              {booking.paymentMethodId === "3" ? "نقدي عند الاستلام" : "بطاقة ائتمانية"}
            </Text>
            <MaterialCommunityIcons name="credit-card" size={20} color={colors.accent} />
          </View>
          <Text style={[styles.paymentLabel, { color: colors.mutedForeground }]}>طريقة الدفع</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.card }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Persist scheduled date so payment screen creates the booking with the correct time
            if (bookingType === "scheduled" && selectedDate) {
              const d = new Date(selectedDate.iso);
              d.setHours(selectedTime.h, 0, 0, 0);
              (booking as any).setScheduledIso?.(d.toISOString());
            } else {
              (booking as any).setScheduledIso?.(new Date().toISOString());
            }
            router.push("/payment");
          }}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtn}
          >
            <Feather name="lock" size={18} color="#FFFFFF" />
            <View style={styles.confirmTextContainer}>
              <Text style={styles.confirmTitle}>تأكيد الحجز</Text>
              <Text style={styles.confirmSubtitle}>{totals.total} ر.س | الإجمالي</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitleContainer: { alignItems: "flex-end" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  headerSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 13 },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  stepItem: { alignItems: "center", width: 60 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepNumber: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 12 },
  stepTitle: { fontFamily: "Tajawal_600SemiBold", fontSize: 10 },
  stepLine: { height: 2, flex: 1, marginTop: -16 },
  typeToggleWrap: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 18 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", gap: 4 },
  typeT: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginTop: 4 },
  typeSub: { fontFamily: "Tajawal_400Regular", fontSize: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  horizontalScroll: { paddingHorizontal: 16, gap: 12, marginBottom: 14 },
  dateCard: {
    width: 70,
    height: 90,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dateDay: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  dateNum: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  dateMonth: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  timeCard: {
    width: 120,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  timeLabel: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  timeRange: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  cleanerCard: {
    width: 120,
    padding: 12,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: "relative",
  },
  cleanerCheck: {
    position: "absolute",
    top: 8,
    end: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  cleanerAvatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 8 },
  cleanerName: { fontFamily: "Tajawal_600SemiBold", fontSize: 12, marginBottom: 4, textAlign: "center" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  emptyProv: { marginHorizontal: 16, padding: 24, borderRadius: 18, alignItems: "center", marginBottom: 18, gap: 6 },
  emptyProvT: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginTop: 6 },
  emptyProvS: { fontFamily: "Tajawal_500Medium", fontSize: 11, textAlign: "center" },
  summaryCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryHeader: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
  summaryValue: { fontFamily: "Tajawal_600SemiBold", fontSize: 13 },
  divider: { height: 1, marginVertical: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  priceLabel: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
  priceValue: { fontFamily: "Tajawal_600SemiBold", fontSize: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  totalLabel: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  totalValue: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  paymentInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  paymentText: { fontFamily: "Tajawal_600SemiBold", fontSize: 14 },
  paymentLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmBtn: {
    height: 64,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  confirmTextContainer: { flex: 1, alignItems: "flex-end" },
  confirmTitle: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  confirmSubtitle: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 12 },
});
