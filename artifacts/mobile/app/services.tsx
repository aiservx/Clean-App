import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";

const SERVICES_GRID = [
  {
    id: "home",
    title: "تنظيف المنزل",
    desc: "تنظيف شامل لجميع أرجاء المنزل",
    image: require("@/assets/images/illustration-sofa.png"),
    color: "#FEF3C7", // pale yellow arc
    btnColor: "#10B981", // green btn
  },
  {
    id: "office",
    title: "تنظيف المكاتب",
    desc: "بيئة عمل نظيفة ومنظمة لإنتاجية أعلى",
    image: require("@/assets/images/illustration-office.png"),
    color: "#D1FAE5", // pale green arc
    btnColor: "#3B82F6", // blue btn
  },
  {
    id: "deep",
    title: "تنظيف عميق",
    desc: "تنظيف عميق لإزالة الأوساخ المتراكمة",
    image: require("@/assets/images/illustration-vacuum.png"),
    color: "#DBEAFE", // pale blue arc
    btnColor: "#3B82F6", // blue btn
  },
  {
    id: "sofa",
    title: "تنظيف الكنب",
    desc: "إزالة البقع و الروائح لكنب نظيف ومعطر",
    image: require("@/assets/images/illustration-armchair.png"),
    color: "#FFEDD5", // pale peach arc
    btnColor: "#F59E0B", // orange btn
  },
];

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="chevron-right" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>اختر الخدمة</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>اختر الخدمة التي تناسب احتياجك</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="help-circle" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.introCard, { backgroundColor: colors.primaryLight }]}>
          <Image 
            source={require("@/assets/images/illustration-bucket.png")} 
            style={styles.introImage} 
            resizeMode="contain"
          />
          <View style={styles.introTextContainer}>
            <Text style={[styles.introTitle, { color: colors.primaryDark }]}>خدمة احترافية</Text>
            <View style={styles.sparkleRow}>
              <Text style={[styles.introSubtitle, { color: colors.foreground }]}>أنظف</Text>
              <Text style={styles.sparkleIcon}>✨</Text>
            </View>
          </View>
        </View>

        <SectionHeader title="✨ خدمات التنظيف" />

        <View style={styles.grid}>
          {SERVICES_GRID.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              style={[styles.gridCard, { backgroundColor: colors.card, shadowColor: colors.foreground }]}
              onPress={() => router.push("/booking")}
              activeOpacity={0.9}
            >
              <View style={[styles.arcContainer, { backgroundColor: service.color }]}>
                <Image source={service.image} style={styles.cardImage} resizeMode="contain" />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{service.title}</Text>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{service.desc}</Text>
                <View style={[styles.cardBtn, { backgroundColor: service.btnColor }]}>
                  <Feather name="arrow-left" size={16} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Feather name="shield" size={20} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>ضمان الجودة</Text>
            <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>نضمن رضاك التام</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoItem}>
            <Feather name="clock" size={20} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>في الوقت المحدد</Text>
            <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>نصل في الموعد المتفق</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoItem}>
            <Feather name="users" size={20} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>فريق محترف</Text>
            <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>مدرب و موثوق</Text>
          </View>
        </View>

        <View style={[styles.helpCard, { backgroundColor: colors.secondary, paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={[styles.helpBtn, { backgroundColor: colors.card }]}>
            <Text style={[styles.helpBtnText, { color: colors.foreground }]}>✨ ساعدني</Text>
          </TouchableOpacity>
          <Text style={[styles.helpText, { color: colors.foreground }]}>غير متأكد؟ ساعدنا في اختيار الخدمة المناسبة لك</Text>
        </View>
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
  scrollContent: {
    paddingBottom: 24,
  },
  introCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  introImage: {
    width: 80,
    height: 80,
    marginRight: 16,
  },
  introTextContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  introTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  sparkleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  introSubtitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
  },
  sparkleIcon: {
    fontSize: 20,
  },
  grid: {
    flexDirection: "row-reverse", // RTL grid
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 32,
  },
  gridCard: {
    width: "47%",
    borderRadius: 24,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  arcContainer: {
    height: 100,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 16,
    marginBottom: 12,
  },
  cardImage: {
    width: 64,
    height: 64,
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
    alignItems: "flex-end",
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    marginBottom: 4,
    textAlign: "right",
  },
  cardDesc: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    textAlign: "right",
    marginBottom: 16,
    lineHeight: 18,
  },
  cardBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoRow: {
    flexDirection: "row-reverse", // RTL
    paddingHorizontal: 24,
    marginBottom: 32,
    alignItems: "flex-start",
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
  },
  infoTitle: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 2,
    textAlign: "center",
  },
  infoDesc: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 8,
    marginTop: 8,
  },
  helpCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  helpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    marginRight: 12,
  },
  helpBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  helpText: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
  },
});
