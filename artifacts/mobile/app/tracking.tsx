import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";

const TIMELINE = [
  { id: "1", title: "تم الوصول", active: false, done: false },
  { id: "2", title: "في الطريق", active: true, done: false, icon: "car" },
  { id: "3", title: "جاري التجهيز", active: true, done: true },
  { id: "4", title: "تم التأكيد", active: true, done: true, icon: "check" },
];

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="headphones" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>جاري الوصول إليك</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>عامل النظافة في طريقه إليك الآن</Text>
        </View>
        <View style={styles.rightActions}>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.danger + "1A" }]}>
            <Text style={[styles.cancelBtnText, { color: colors.danger }]}>إلغاء الطلب</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Feather name="chevron-right" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.infoRow, { backgroundColor: colors.secondary }]}>
          <View style={styles.infoItem}>
            <Feather name="clock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>الموعد اليوم</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>04:00 م - 06:00 م</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoItem}>
            <Feather name="copy" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>رقم الحجز</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}># 10245</Text>
          </View>
        </View>

        <View style={[styles.mapCard, { backgroundColor: colors.border }]}>
          <AppMap
            style={StyleSheet.absoluteFill}
            region={{
              latitude: 24.7136,
              longitude: 46.6753,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            polyline={{
              coordinates: [
                { latitude: 24.70, longitude: 46.65 },
                { latitude: 24.71, longitude: 46.66 },
                { latitude: 24.72, longitude: 46.68 },
                { latitude: 24.73, longitude: 46.69 },
              ],
              color: colors.success,
              width: 4,
            }}
            markers={[
              { id: "home", coordinate: { latitude: 24.73, longitude: 46.69 }, color: colors.success },
              { id: "car", coordinate: { latitude: 24.70, longitude: 46.65 }, color: colors.primary },
            ]}
            scrollEnabled={false}
            zoomEnabled={false}
          />
          <View pointerEvents="none" style={styles.mapHomeOverlay}>
            <View style={[styles.mapHomeIcon, { backgroundColor: colors.success }]}>
              <Feather name="home" size={18} color="#FFFFFF" />
            </View>
          </View>
          <View pointerEvents="none" style={styles.mapCarOverlay}>
            <View style={[styles.mapCarIcon, { backgroundColor: "#FFFFFF" }]}>
              <MaterialCommunityIcons name="car" size={20} color={colors.primary} />
            </View>
          </View>

          <View style={styles.etaCard}>
            <Text style={[styles.etaLabel, { color: colors.mutedForeground }]}>الوقت المتوقع للوصول</Text>
            <Text style={[styles.etaValue, { color: colors.success }]}>12 دقيقة</Text>
          </View>

          <TouchableOpacity style={[styles.gpsButton, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.cleanerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cleanerHeader}>
            <View style={styles.cleanerInfo}>
              <View style={styles.cleanerNameRow}>
                <Text style={[styles.cleanerName, { color: colors.foreground }]}>أسماء محمد</Text>
                <View style={[styles.ratingBadge, { backgroundColor: colors.warning + "1A" }]}>
                  <Text style={[styles.ratingText, { color: colors.warning }]}>4.8</Text>
                  <Feather name="star" size={10} color={colors.warning} />
                </View>
              </View>
              <View style={styles.cleanerTags}>
                <View style={[styles.tag, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.tagText, { color: colors.success }]}>الأكثر تقييماً</Text>
                </View>
                <Text style={[styles.expText, { color: colors.mutedForeground }]}>خبرة 3 سنوات في التنظيف</Text>
              </View>
            </View>
            <Image source={require("@/assets/images/cleaner-fatima.png")} style={styles.cleanerAvatar} />
          </View>
          
          <View style={[styles.carInfoPill, { backgroundColor: colors.successLight }]}>
            <MaterialCommunityIcons name="car" size={16} color={colors.success} />
            <Text style={[styles.carInfoText, { color: colors.success }]}>تويوتا يارس - أبيض</Text>
            <View style={styles.plateContainer}>
              <Text style={[styles.plateText, { color: colors.success }]}>أ ب د 1234</Text>
            </View>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.successLight }]} onPress={() => router.push("/rating")}>
              <MaterialCommunityIcons name="chat-outline" size={18} color={colors.success} />
              <Text style={[styles.actionBtnText, { color: colors.success }]}>الدردشة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.successLight }]}>
              <Feather name="phone-call" size={18} color={colors.success} />
              <Text style={[styles.actionBtnText, { color: colors.success }]}>اتصال</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.successLight }]}>
              <Feather name="share-2" size={18} color={colors.success} />
              <Text style={[styles.actionBtnText, { color: colors.success }]}>مشاركة الرحلة</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.safetyCard, { backgroundColor: colors.secondary }]}>
          <View style={styles.safetyIconContainer}>
            <MaterialCommunityIcons name="shield-check" size={24} color={colors.primary} />
          </View>
          <View style={styles.safetyTextContainer}>
            <Text style={[styles.safetyTitle, { color: colors.foreground }]}>سلامتك تهمنا</Text>
            <Text style={[styles.safetyDesc, { color: colors.mutedForeground }]}>يمكنك مشاركة موقعك مع أحد افراد عائلتك</Text>
          </View>
          <TouchableOpacity style={[styles.safetyBtn, { backgroundColor: colors.card }]}>
            <Text style={[styles.safetyBtnText, { color: colors.primary }]}>مشاركة الموقع</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      
      <View style={[styles.timelineContainer, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.timelineTrack}>
          {TIMELINE.map((step, idx) => (
            <React.Fragment key={step.id}>
              <View style={styles.timelineStep}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: step.active ? colors.success : colors.border },
                  !step.active && { borderWidth: 2, borderColor: colors.mutedForeground, backgroundColor: colors.card }
                ]}>
                  {step.icon && step.active && (
                    <MaterialCommunityIcons name={step.icon as any} size={12} color="#FFFFFF" />
                  )}
                </View>
                <Text style={[
                  styles.timelineTitle,
                  { color: step.active ? colors.foreground : colors.mutedForeground }
                ]}>{step.title}</Text>
              </View>
              {idx < TIMELINE.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  { backgroundColor: TIMELINE[idx + 1].active ? colors.success : colors.border }
                ]} />
              )}
            </React.Fragment>
          ))}
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
    marginBottom: 16,
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
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  cancelBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  infoRow: {
    flexDirection: "row-reverse", // RTL
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  infoLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
  },
  infoValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },
  divider: {
    width: 1,
    marginHorizontal: 16,
  },
  mapCard: {
    height: 240,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapHomeOverlay: {
    position: "absolute",
    top: 40,
    right: 30,
  },
  mapCarOverlay: {
    position: "absolute",
    bottom: 60,
    left: 30,
  },
  mapHomeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  mapCarIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  etaCard: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
  },
  etaLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: 10,
    marginBottom: 2,
  },
  etaValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },
  gpsButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cleanerCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  cleanerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end", // RTL
    marginBottom: 16,
  },
  cleanerInfo: {
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
    fontSize: 18,
    marginLeft: 8,
  },
  ratingBadge: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
    gap: 4,
  },
  ratingText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
  },
  cleanerTags: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  tagText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 10,
  },
  expText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
  },
  cleanerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  carInfoPill: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  carInfoText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  plateContainer: {
    backgroundColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: "auto", // Push to left in RTL
  },
  plateText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
  },
  actionRow: {
    flexDirection: "row-reverse", // RTL
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 100,
    gap: 6,
  },
  actionBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
  safetyCard: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  safetyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  safetyTextContainer: {
    flex: 1,
    alignItems: "flex-end", // RTL
  },
  safetyTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    marginBottom: 2,
  },
  safetyDesc: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    textAlign: "right",
  },
  safetyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    marginRight: 12,
  },
  safetyBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 11,
  },
  timelineContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  timelineTrack: {
    flexDirection: "row-reverse", // RTL
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  timelineStep: {
    alignItems: "center",
    width: 60,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    zIndex: 1,
  },
  timelineTitle: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 11,
    textAlign: "center",
  },
  timelineLine: {
    flex: 1,
    height: 2,
    marginTop: 11,
    marginHorizontal: -20,
    zIndex: 0,
  },
});
