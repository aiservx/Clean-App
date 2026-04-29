import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.iconCircle}>
          <Feather name="more-horizontal" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>جاري الوصول إليك</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>سيصل عامل النظافة خلال</Text>
        </View>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ETA Card */}
        <View style={styles.etaRow}>
          <View style={[styles.etaHalf, { backgroundColor: colors.accentLight }]}>
             <Text style={[styles.etaSmall, { color: colors.accent }]}>المسافة المتبقية</Text>
             <Text style={[styles.etaLarge, { color: colors.accent }]}>2.4 كم</Text>
          </View>
          <View style={[styles.etaHalf, { backgroundColor: colors.successLight }]}>
             <Text style={[styles.etaSmall, { color: colors.success }]}>وقت الوصول المتوقع</Text>
             <Text style={[styles.etaLarge, { color: colors.success }]}>12 دقيقة</Text>
          </View>
        </View>

        {/* Map View */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            <AppMap
              style={StyleSheet.absoluteFill}
              region={{
                latitude: 24.7136,
                longitude: 46.6753,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
              polyline={{
                coordinates: [
                  { latitude: 24.7000, longitude: 46.6500 },
                  { latitude: 24.7136, longitude: 46.6753 },
                ],
                color: colors.accent,
                width: 4,
              }}
            />
            
            {/* Cleaner Pin */}
            <View style={[styles.cleanerPin, { top: "40%", right: "50%" }]}>
              <View style={styles.chatBubble}>
                <Text style={styles.chatBubbleText}>عامل النظافة في طريقه إليك</Text>
              </View>
              <View style={[styles.pinTail, { borderTopColor: colors.primary }]} />
              <Image source={require("@/assets/images/user-ahmed.png")} style={styles.pinAvatar} />
            </View>

            {/* Home Pin */}
            <View style={[styles.homePin, { bottom: "20%", left: "20%" }]}>
              <View style={[styles.homePinCircle, { backgroundColor: colors.success }]}>
                <Feather name="home" size={16} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.floatingActions}>
              <TouchableOpacity style={[styles.floatBtn, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="shield-check" size={20} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.floatBtn, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Cleaner Profile Card */}
        <View style={[styles.cleanerProfile, { backgroundColor: colors.card }]}>
          <View style={styles.cleanerMain}>
            <View style={styles.cleanerInfo}>
               <View style={styles.nameRow}>
                  <Text style={[styles.cleanerName, { color: colors.foreground }]}>أحمد علي</Text>
                  <View style={[styles.znBadge, { backgroundColor: colors.primary }]}>
                     <Text style={styles.znText}>ZN</Text>
                  </View>
               </View>
               <Text style={[styles.cleanerTitle, { color: colors.mutedForeground }]}>عامل نظافة محترف</Text>
               <View style={[styles.expPill, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.expText, { color: colors.success }]}>خبرة 5 سنوات</Text>
               </View>
            </View>
            <Image source={require("@/assets/images/user-ahmed.png")} style={styles.cleanerAvatarMain} />
          </View>

          <View style={[styles.carInfo, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.carPlate, { color: colors.foreground }]}>أ ب ج 1234 السعودية</Text>
            <View style={styles.carStatDivider} />
            <Text style={[styles.carModel, { color: colors.foreground }]}>تويوتا هايلكس | 2020</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="share-2" size={20} color={colors.foreground} />
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>مشاركة الموقع</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.primary }]}>
               <Feather name="phone" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="message-circle" size={20} color={colors.foreground} />
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>دردشة</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Summary Item */}
        <View style={[styles.serviceItem, { backgroundColor: colors.card }]}>
           <View style={styles.serviceTextWrap}>
              <Text style={[styles.serviceType, { color: colors.foreground }]}>خدمة تنظيف عميق</Text>
              <Text style={[styles.serviceTime, { color: colors.mutedForeground }]}>اليوم، 10:00 ص - 12:00 م</Text>
           </View>
           <View style={[styles.serviceIcon, { backgroundColor: colors.successLight }]}>
              <MaterialCommunityIcons name="broom" size={24} color={colors.success} />
           </View>
        </View>

        {/* Mark as Done -> rating */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/rating")}
          style={[styles.completedBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="check-circle" size={18} color="#FFFFFF" />
          <Text style={styles.completedBtnText}>تم إنجاز الخدمة - قيّم العامل</Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelRow} onPress={() => router.replace("/(tabs)")}>
          <Text style={[styles.cancelText, { color: colors.danger }]}>إلغاء الطلب</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerTitleContainer: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 13,
  },
  etaRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  etaHalf: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: "flex-end",
  },
  etaSmall: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 11,
    marginBottom: 4,
  },
  etaLarge: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 20,
  },
  mapSection: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  mapContainer: {
    height: 400,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  cleanerPin: {
    position: "absolute",
    alignItems: "center",
  },
  chatBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  chatBubbleText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 11,
  },
  pinAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  pinTail: {
    position: "absolute",
    bottom: 34,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  homePin: {
    position: "absolute",
  },
  homePinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  floatingActions: {
    position: "absolute",
    right: 16,
    top: 100,
    gap: 12,
  },
  floatBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cleanerProfile: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cleanerMain: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 12,
  },
  cleanerInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  nameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cleanerName: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
  },
  znBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  znText: {
    color: "#FFFFFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 10,
  },
  cleanerTitle: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
    marginBottom: 8,
  },
  expPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  expText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 11,
  },
  cleanerAvatarMain: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginLeft: 16,
  },
  carInfo: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  carPlate: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 13,
  },
  carStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E5E7EB",
  },
  carModel: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 12,
  },
  callBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16C47F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceItem: {
    marginHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  serviceTextWrap: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 16,
  },
  serviceType: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  serviceTime: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 12,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelRow: {
    alignItems: "center",
    marginTop: 10,
  },
  cancelText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    textDecorationLine: "underline",
  },
  completedBtn: {
    marginHorizontal: 24,
    height: 56,
    borderRadius: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
    shadowColor: "#16C47F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  completedBtnText: {
    color: "#FFFFFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
  },
});
