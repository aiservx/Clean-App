import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";

const ADDRESSES = [
  { id: "1", title: "المنزل", address: "شارع الملك فهد، حي الروضة، الرياض", icon: "map-pin", color: "#10B981", badge: "الرئيسي" },
  { id: "2", title: "العمل", address: "طريق التخصصي، حي العليا، الرياض", icon: "briefcase", color: "#F59E0B" },
  { id: "3", title: "منزل العائلة", address: "شارع التحلية، المعذر الشمالي، الرياض", icon: "home", color: "#EF4444" },
];

const SETTINGS = [
  { id: "1", title: "طرق الدفع", subtitle: "إدارة بطاقاتك وطرق الدفع", icon: "credit-card", color: "#10B981" },
  { id: "2", title: "سجل الطلبات", subtitle: "عرض طلباتك السابقة وحالاتها", icon: "calendar", color: "#3B82F6" },
  { id: "3", title: "العروض والخصومات", subtitle: "تصفح أحدث العروض والخصومات", icon: "tag", color: "#EC4899" },
  { id: "4", title: "الإعدادات", subtitle: "إدارة الحساب والتطبيق", icon: "settings", color: "#6B7280" },
  { id: "5", title: "المساعدة والدعم", subtitle: "الأسئلة الشائعة وطرق التواصل", icon: "headphones", color: "#8B5CF6" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="settings" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>ملفي الشخصي</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>إدارة معلوماتك وخدماتك</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <View style={styles.badgeContainer}>
            <Feather name="bell" size={24} color={colors.foreground} />
            <View style={[styles.redDot, { backgroundColor: colors.danger, borderColor: colors.background }]} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: colors.foreground }]}>أحمد محمد</Text>
              <MaterialCommunityIcons name="check-decagram" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.userContact, { color: colors.mutedForeground }]}>+966 50 123 4567</Text>
            <Text style={[styles.userContact, { color: colors.mutedForeground }]}>ahmed.m@example.com</Text>
            <TouchableOpacity style={[styles.editProfileBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="edit-2" size={12} color={colors.foreground} />
              <Text style={[styles.editProfileText, { color: colors.foreground }]}>تعديل الملف الشخصي</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.avatarContainer}>
            <Image source={require("@/assets/images/user-ahmed.png")} style={styles.avatar} />
            <View style={[styles.cameraBtn, { backgroundColor: colors.primary, borderColor: colors.card }]}>
              <Feather name="camera" size={12} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <LinearGradient
          colors={["#8B5CF6", "#6366F1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.premiumBanner}
        >
          <View style={styles.premiumContent}>
            <View style={styles.premiumHeader}>
              <Text style={styles.premiumTitle}>عضوية مميزة</Text>
              <MaterialCommunityIcons name="star-circle" size={20} color="#FDE047" />
            </View>
            <Text style={styles.premiumSubtitle}>استمتع بخصومات حصرية وأولوية في الحجز</Text>
          </View>
          <TouchableOpacity style={styles.premiumBtn}>
            <Text style={[styles.premiumBtnText, { color: "#6366F1" }]}>عرض المميزات</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLink, { color: colors.primary }]}>عرض الكل ▾</Text>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>العناوين المحفوظة</Text>
              <Feather name="map-pin" size={18} color={colors.foreground} />
            </View>
          </View>
          
          {ADDRESSES.map((address, idx) => (
            <View key={address.id} style={[styles.addressRow, idx !== ADDRESSES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <TouchableOpacity style={styles.menuBtn}>
                <Feather name="more-vertical" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              <View style={styles.addressInfo}>
                <View style={styles.addressTitleRow}>
                  <Text style={[styles.addressTitle, { color: colors.foreground }]}>{address.title}</Text>
                  {address.badge && (
                    <View style={[styles.addressBadge, { backgroundColor: colors.successLight }]}>
                      <Text style={[styles.addressBadgeText, { color: colors.success }]}>{address.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.addressText, { color: colors.mutedForeground }]}>{address.address}</Text>
              </View>
              <View style={[styles.addressIcon, { backgroundColor: address.color + "1A" }]}>
                <Feather name={address.icon as any} size={20} color={address.color} />
              </View>
            </View>
          ))}
          
          <TouchableOpacity style={[styles.addAddressBtn, { borderColor: colors.primary, borderStyle: "dashed" }]}>
            <Text style={[styles.addAddressText, { color: colors.primary }]}>+ إضافة عنوان جديد</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, marginBottom: 100 }]}>
          {SETTINGS.map((item, idx) => (
            <TouchableOpacity key={item.id} style={[styles.settingRow, idx !== SETTINGS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
              </View>
              <View style={[styles.settingIcon, { backgroundColor: item.color + "1A" }]}>
                <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: 24,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    alignItems: "flex-end", // RTL
    marginRight: 16,
  },
  userNameRow: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  userName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
  },
  userContact: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    marginBottom: 2,
  },
  editProfileBtn: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginTop: 8,
    gap: 6,
  },
  editProfileText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 11,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumBanner: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
  },
  premiumContent: {
    flex: 1,
    alignItems: "flex-end", // RTL
    marginLeft: 16,
  },
  premiumHeader: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  premiumTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  premiumSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#E0E7FF",
    textAlign: "right",
  },
  premiumBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  premiumBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  sectionLink: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  menuBtn: {
    padding: 8,
  },
  addressInfo: {
    flex: 1,
    alignItems: "flex-end", // RTL
    marginRight: 16,
  },
  addressTitleRow: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  addressTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  addressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  addressBadgeText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 10,
  },
  addressText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    textAlign: "right",
  },
  addressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  addAddressBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  addAddressText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  settingInfo: {
    flex: 1,
    alignItems: "flex-end", // RTL
    marginRight: 16,
  },
  settingTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  settingSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    textAlign: "right",
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
