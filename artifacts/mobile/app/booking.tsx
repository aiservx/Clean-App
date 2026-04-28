import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";
import { LinearGradient } from "expo-linear-gradient";

const DATES = [
  { day: "السبت", num: "24", month: "مايو", selected: false },
  { day: "الأحد", num: "25", month: "مايو", selected: false },
  { day: "الاثنين", num: "26", month: "مايو", selected: true },
  { day: "الثلاثاء", num: "27", month: "مايو", selected: false },
  { day: "الأربعاء", num: "28", month: "مايو", selected: false },
];

const TIMES = ["08:00 صباحاً", "10:00 صباحاً", "12:00 ظهراً", "02:00 م", "04:00 م", "06:00 م"];

const CLEANERS = [
  {
    id: "1",
    name: "فاطمة أحمد",
    rating: "4.9",
    reviews: "128",
    exp: "4",
    image: require("@/assets/images/cleaner-fatima.png"),
    badge: "الأعلى تقييماً",
  },
  {
    id: "2",
    name: "سارة محمد",
    rating: "4.7",
    reviews: "95",
    exp: "3",
    image: require("@/assets/images/cleaner-sara.png"),
  },
  {
    id: "3",
    name: "نورة عبدالله",
    rating: "4.8",
    reviews: "112",
    exp: "5",
    image: require("@/assets/images/cleaner-noura.png"),
  },
];

export default function BookingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [selectedTime, setSelectedTime] = useState("12:00 ظهراً");
  const [selectedCleaner, setSelectedCleaner] = useState("1");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="chevron-right" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>حجز خدمة تنظيف منزل</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>خطوة 3 من 4</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="help-circle" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.addressRight}>
            <View style={[styles.pinIcon, { backgroundColor: colors.primaryLight }]}>
              <Feather name="map-pin" size={20} color={colors.primary} />
            </View>
            <View style={styles.addressTextContainer}>
              <Text style={[styles.addressLabel, { color: colors.mutedForeground }]}>عنوان الخدمة</Text>
              <Text style={[styles.addressValue, { color: colors.foreground }]}>شارع الملك فهد، حي الروضة، الرياض</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="edit-2" size={14} color={colors.foreground} />
            <Text style={[styles.editBtnText, { color: colors.foreground }]}>تعديل</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title="اختر التاريخ" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesScroll} style={{ flexDirection: "row-reverse" }}>
          {DATES.map((date, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dateCard,
                { backgroundColor: date.selected ? colors.primary : colors.card, borderColor: date.selected ? colors.primary : colors.border },
              ]}
            >
              <Text style={[styles.dateDay, { color: date.selected ? "#FFFFFF" : colors.mutedForeground }]}>{date.day}</Text>
              <Text style={[styles.dateNum, { color: date.selected ? "#FFFFFF" : colors.foreground }]}>{date.num}</Text>
              <Text style={[styles.dateMonth, { color: date.selected ? "#FFFFFF" : colors.mutedForeground }]}>{date.month}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader title="اختر الوقت المناسب" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timesScroll} style={{ flexDirection: "row-reverse" }}>
          {TIMES.map((time, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setSelectedTime(time)}
              style={[
                styles.timePill,
                { backgroundColor: selectedTime === time ? colors.primary : colors.card, borderColor: selectedTime === time ? colors.primary : colors.border },
              ]}
            >
              <Text style={[styles.timeText, { color: selectedTime === time ? "#FFFFFF" : colors.foreground }]}>{time}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader title="اختر عامل/ة التنظيف" />
        <View style={styles.cleanersContainer}>
          {CLEANERS.map((cleaner) => {
            const isSelected = selectedCleaner === cleaner.id;
            return (
              <TouchableOpacity
                key={cleaner.id}
                onPress={() => setSelectedCleaner(cleaner.id)}
                style={[
                  styles.cleanerCard,
                  { 
                    backgroundColor: isSelected ? colors.primaryLight : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border
                  }
                ]}
              >
                <View style={styles.radioContainer}>
                  <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.mutedForeground }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </View>
                
                <View style={styles.cleanerInfo}>
                  <View style={styles.cleanerNameRow}>
                    <Text style={[styles.cleanerName, { color: colors.foreground }]}>{cleaner.name}</Text>
                    {cleaner.badge && (
                      <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
                        <Text style={[styles.badgeText, { color: colors.success }]}>{cleaner.badge}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.ratingRow}>
                    <Text style={[styles.ratingText, { color: colors.foreground }]}>{cleaner.rating}</Text>
                    <Feather name="star" size={14} color={colors.warning} />
                    <Text style={[styles.reviewsText, { color: colors.mutedForeground }]}>({cleaner.reviews} تقييم)</Text>
                  </View>
                  
                  <View style={styles.tagsRow}>
                    <View style={[styles.tag, { backgroundColor: colors.card }]}>
                      <MaterialCommunityIcons name="shield-check" size={12} color={colors.success} />
                      <Text style={[styles.tagText, { color: colors.mutedForeground }]}>موثوقة</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: colors.card }]}>
                      <MaterialCommunityIcons name="sparkles" size={12} color={colors.primary} />
                      <Text style={[styles.tagText, { color: colors.mutedForeground }]}>تنظيف احترافي</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: colors.card }]}>
                      <Feather name="briefcase" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.tagText, { color: colors.mutedForeground }]}>خبرة {cleaner.exp} سنوات</Text>
                    </View>
                  </View>
                </View>
                
                <Image source={cleaner.image} style={styles.cleanerAvatar} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.priceSectionHeader}>
          <Text style={[styles.priceDetailsLink, { color: colors.primary }]}>عرض التفاصيل ▾</Text>
          <Text style={[styles.priceTitle, { color: colors.foreground }]}>تفاصيل السعر</Text>
        </View>

        <View style={[styles.priceCard, { backgroundColor: colors.secondary }]}>
          <Image source={require("@/assets/images/illustration-bucket.png")} style={styles.priceImage} resizeMode="contain" />
          <View style={styles.priceDetails}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceValue, { color: colors.foreground }]}>150 ر.س</Text>
              <Text style={[styles.priceLabel, { color: colors.foreground }]}>تنظيف منزل (3 غرف)</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceValue, { color: colors.foreground }]}>30 ر.س</Text>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>خدمة إضافية: تنظيف المطبخ</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceValue, { color: colors.foreground }]}>10 ر.س</Text>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>رسوم الخدمة</Text>
            </View>
            <View style={[styles.priceDivider, { backgroundColor: colors.border }]} />
            <View style={styles.priceRow}>
              <Text style={[styles.totalValue, { color: colors.primary }]}>190 ر.س</Text>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/tracking")}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGradient}
          >
            <View style={styles.confirmArrowContainer}>
              <Feather name="arrow-left" size={20} color={colors.primary} />
            </View>
            <View style={styles.confirmTextContainer}>
              <Text style={styles.confirmTitle}>تأكيد الحجز</Text>
              <Text style={styles.confirmPrice}>190 ر.س / الإجمالي شامل الضريبية</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.trustRow}>
          <Text style={[styles.trustText, { color: colors.mutedForeground }]}>دفع آمن 100%</Text>
          <Text style={[styles.trustDot, { color: colors.mutedForeground }]}>•</Text>
          <Text style={[styles.trustText, { color: colors.mutedForeground }]}>تعديل أو إلغاء الحجز بسهولة</Text>
          <Text style={[styles.trustDot, { color: colors.mutedForeground }]}>•</Text>
          <Text style={[styles.trustText, { color: colors.mutedForeground }]}>دعم على مدار الساعة</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  addressRight: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    flex: 1,
  },
  pinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  addressTextContainer: {
    flex: 1,
    alignItems: "flex-end", // RTL
  },
  addressLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
    marginBottom: 2,
  },
  addressValue: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    textAlign: "right",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 4,
  },
  editBtnText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
  },
  datesScroll: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  dateCard: {
    width: 72,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  dateDay: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    marginBottom: 4,
  },
  dateNum: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    marginBottom: 4,
  },
  dateMonth: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
  },
  timesScroll: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  timePill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
  },
  timeText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  cleanersContainer: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  cleanerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  radioContainer: {
    paddingRight: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cleanerInfo: {
    flex: 1,
    alignItems: "flex-end", // RTL
    marginRight: 16,
  },
  cleanerNameRow: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    marginBottom: 4,
  },
  cleanerName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  badgeText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 10,
  },
  ratingRow: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    marginLeft: 4,
  },
  reviewsText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    marginRight: 4,
  },
  tagsRow: {
    flexDirection: "row-reverse", // RTL
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 4,
  },
  tagText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 10,
  },
  cleanerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  priceSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  priceTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  priceDetailsLink: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  priceCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  priceImage: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  priceDetails: {
    flex: 1,
    gap: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
  },
  priceValue: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  priceDivider: {
    height: 1,
    marginVertical: 4,
  },
  totalLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  totalValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 100,
    marginBottom: 16,
  },
  confirmArrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  confirmTextContainer: {
    flex: 1,
    alignItems: "flex-end", // RTL
  },
  confirmTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  confirmPrice: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
    color: "#E0E7FF", // light blue tint
  },
  trustRow: {
    flexDirection: "row-reverse", // RTL
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  trustText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 10,
  },
  trustDot: {
    fontSize: 10,
  },
});
