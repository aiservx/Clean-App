import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";

const FILTERS = [
  { id: "all", title: "الكل", icon: "star", active: true },
  { id: "seasonal", title: "عروض موسمية", icon: "leaf", active: false },
  { id: "discounts", title: "خصومات", icon: "percent", active: false },
  { id: "referral", title: "دعوة الأصدقاء", icon: "users", active: false },
];

const SEASONAL = [
  { id: "1", title: "عرض العيد", discount: "خصم 25%", desc: "على جميع خدمات التنظيف", timer: "ينتهي خلال 05:18:32", icon: "moon", color: "#FFEDD5", iconColor: "#F59E0B" },
  { id: "2", title: "تنظيف الربيع", discount: "خصم 20%", desc: "على التنظيف العميق", timer: "08:21:47", icon: "bucket-outline", color: "#D1FAE5", iconColor: "#10B981" },
  { id: "3", title: "استعد للصيف", discount: "خصم 15%", desc: "على تنظيف المكيفات", timer: "10:15:30", icon: "air-conditioner", color: "#DBEAFE", iconColor: "#3B82F6" },
];

const SPECIALS = [
  { id: "1", title: "خصم العملاء الدائمين", icon: "medal", color: "#FCE7F3", iconColor: "#EC4899" },
  { id: "2", title: "اشتراك شهري", icon: "crown", color: "#E0E7FF", iconColor: "#3B82F6" },
  { id: "3", title: "للشركات", icon: "office-building", color: "#D1FAE5", iconColor: "#10B981" },
];

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.iconButton}>
          <View style={styles.badgeContainer}>
            <Feather name="bell" size={24} color={colors.foreground} />
            <View style={[styles.redDot, { backgroundColor: colors.danger, borderColor: colors.background }]} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>العروض والخصومات</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>عروض حصرية عليك لا تفوتها!</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="gift" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll} style={{ flexDirection: "row-reverse", marginBottom: 24 }}>
          {FILTERS.map(filter => (
            <TouchableOpacity 
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              style={[
                styles.filterChip,
                { backgroundColor: activeFilter === filter.id ? colors.primary : colors.card, borderColor: colors.border }
              ]}
            >
              <Text style={[
                styles.filterText,
                { color: activeFilter === filter.id ? "#FFFFFF" : colors.foreground }
              ]}>{filter.title}</Text>
              <Feather 
                name={filter.icon as any} 
                size={14} 
                color={activeFilter === filter.id ? "#FFFFFF" : colors.mutedForeground} 
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.heroBanner, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { color: colors.primaryDark }]}>عرض خاص على تنظيف المنازل</Text>
            <Text style={[styles.heroSubtitle, { color: colors.foreground }]}>احجز الآن واحصل على نظافة مثالية بأسعار لا تقبل المنافسة</Text>
            <TouchableOpacity style={[styles.heroBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.heroBtnText}>احجز الآن</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroImageContainer}>
            <Image source={require("@/assets/images/illustration-bucket.png")} style={styles.heroImage} resizeMode="contain" />
            <View style={[styles.heroBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.heroBadgeText}>خصم حتى 30%</Text>
            </View>
          </View>
        </View>

        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, styles.activeDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
        </View>

        <SectionHeader 
          title="☀ عروض موسمية" 
          action={<Text style={[styles.seeAllLink, { color: colors.primary }]}>عرض الكل ▾</Text>}
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonalScroll} style={{ flexDirection: "row-reverse" }}>
          {SEASONAL.map(offer => (
            <View key={offer.id} style={[styles.seasonalCard, { backgroundColor: offer.color }]}>
              <View style={[styles.iconCircle, { backgroundColor: "#FFFFFF" }]}>
                <MaterialCommunityIcons name={offer.icon as any} size={24} color={offer.iconColor} />
              </View>
              <Text style={[styles.seasonalTitle, { color: colors.foreground }]}>{offer.title}</Text>
              <Text style={[styles.seasonalDiscount, { color: colors.danger }]}>{offer.discount}</Text>
              <Text style={[styles.seasonalDesc, { color: colors.foreground }]}>{offer.desc}</Text>
              <View style={[styles.timerPill, { backgroundColor: "rgba(255,255,255,0.6)" }]}>
                <Feather name="clock" size={12} color={colors.foreground} />
                <Text style={[styles.timerText, { color: colors.foreground }]}>{offer.timer}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.referralCard, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.referralHeaderRow}>
            <Image source={require("@/assets/images/illustration-referral.png")} style={styles.referralImage} resizeMode="contain" />
            <View style={styles.referralTextContainer}>
              <Text style={[styles.referralTitle, { color: colors.primaryDark }]}>ادع أصدقائك واحصل على مكافآت!</Text>
              <Text style={[styles.referralDesc, { color: colors.foreground }]}>احصل على 50 ر.س رصيد مجاني لكل صديق يسجل ويحجز عبر كود الدعوة الخاص بك.</Text>
            </View>
          </View>
          <View style={[styles.codeCard, { backgroundColor: colors.card }]}>
            <View style={styles.codeRow}>
              <TouchableOpacity style={styles.copyBtn}>
                <Feather name="copy" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.codeText, { color: colors.foreground }]}>كود الدعوة CLEAN30</Text>
            </View>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.success }]}>
              <Feather name="share-2" size={16} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>دعوة الأصدقاء</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SectionHeader title="🏷 خصومات مميزة" />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specialsScroll} style={{ flexDirection: "row-reverse" }}>
          {SPECIALS.map(special => (
            <View key={special.id} style={[styles.specialCard, { backgroundColor: special.color }]}>
              <MaterialCommunityIcons name={special.icon as any} size={32} color={special.iconColor} />
              <Text style={[styles.specialTitle, { color: colors.foreground }]}>{special.title}</Text>
              <TouchableOpacity style={styles.specialLinkRow}>
                <Text style={[styles.specialLinkText, { color: special.iconColor }]}>المزيد ▸</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
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
    marginBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeContainer: {
    position: "relative",
  },
  redDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
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
  scrollContent: {
    paddingBottom: 100, // For tab bar
  },
  filtersScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  heroBanner: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    marginBottom: 16,
  },
  heroContent: {
    flex: 1,
    alignItems: "flex-end", // RTL
  },
  heroTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    textAlign: "right",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    textAlign: "right",
    marginBottom: 16,
    lineHeight: 20,
  },
  heroBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 100,
  },
  heroBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  heroImageContainer: {
    position: "relative",
    marginLeft: 16,
  },
  heroImage: {
    width: 100,
    height: 100,
  },
  heroBadge: {
    position: "absolute",
    top: -10,
    right: -10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    transform: [{ rotate: "15deg" }],
  },
  heroBadgeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 10,
    color: "#FFFFFF",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  seeAllLink: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  seasonalScroll: {
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 32,
  },
  seasonalCard: {
    width: 160,
    padding: 16,
    borderRadius: 24,
    alignItems: "center", // RTL (centered)
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  seasonalTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    marginBottom: 4,
    textAlign: "center",
  },
  seasonalDiscount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    marginBottom: 4,
    textAlign: "center",
  },
  seasonalDesc: {
    fontFamily: "Cairo_500Medium",
    fontSize: 11,
    marginBottom: 12,
    textAlign: "center",
  },
  timerPill: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
  },
  timerText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 10,
  },
  referralCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
  },
  referralHeaderRow: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    marginBottom: 20,
  },
  referralImage: {
    width: 80,
    height: 80,
    marginLeft: 16,
  },
  referralTextContainer: {
    flex: 1,
    alignItems: "flex-end", // RTL
  },
  referralTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    textAlign: "right",
    marginBottom: 8,
  },
  referralDesc: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18,
  },
  codeCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  codeRow: {
    flexDirection: "row-reverse", // RTL
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  codeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  copyBtn: {
    padding: 8,
  },
  shareBtn: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 100,
    width: "100%",
    gap: 8,
  },
  shareBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  specialsScroll: {
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 32,
  },
  specialCard: {
    width: 140,
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  specialTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  specialLinkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  specialLinkText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
  },
});
