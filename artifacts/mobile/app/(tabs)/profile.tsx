import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/lib/auth";
import GuestEmpty from "@/components/GuestEmpty";
import FloatingTabBar from "@/components/FloatingTabBar";

const ADDRESSES = [
  { id: "1", title: "المنزل", address: "حي النخيل، شارع الأمير نايف، الرياض", icon: "home", color: "#16C47F", default: true },
  { id: "2", title: "العمل", address: "مركز المملكة، طريق الملك فهد، الرياض", icon: "briefcase", color: "#2F80ED" },
];

const MENU_ITEMS = [
  { id: "1", title: "طلباتي", subtitle: "إدارة جميع حجوزاتك", icon: "shopping-bag", color: "#16C47F", path: "/(tabs)/bookings" },
  { id: "2", title: "المفضلة", subtitle: "العمال المفضلين لديك", icon: "heart", color: "#EC4899", path: "/favorites" },
  { id: "3", title: "العروض والخصومات", subtitle: "أحدث العروض الحصرية", icon: "tag", color: "#F59E0B", path: "/(tabs)/offers" },
  { id: "4", title: "دعوة الأصدقاء", subtitle: "اربح 50 ر.س لكل صديق", icon: "users", color: "#8B5CF6", path: "/referrals" },
  { id: "5", title: "الإعدادات", subtitle: "إدارة الحساب والتنبيهات", icon: "settings", color: "#6B7280", path: "/settings" },
  { id: "6", title: "المساعدة والدعم", subtitle: "تواصل معنا في أي وقت", icon: "headphones", color: "#FB923C", path: "/help" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session, profile, signOut } = useAuth();
  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <GuestEmpty title="حسابك الشخصي" subtitle="سجّل دخولك لإدارة عناوينك وحجوزاتك" icon="account-circle-outline" />
        <FloatingTabBar active="profile" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerActions}>
           <TouchableOpacity style={styles.iconCircle} onPress={() => router.push("/settings")}>
             <Feather name="settings" size={20} color={colors.foreground} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.iconCircle} onPress={() => router.push("/notifications")}>
             <Feather name="bell" size={20} color={colors.foreground} />
             <View style={[styles.notifDot, { backgroundColor: colors.primary }]} />
           </TouchableOpacity>
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>الملف الشخصي</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>إدارة حسابك وطلباتك</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <LinearGradient
            colors={[colors.primaryLight + "40", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.profileTop}>
            <TouchableOpacity style={styles.chevron}>
              <Feather name="chevron-left" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
               <Text style={[styles.userName, { color: colors.foreground }]}>أحمد محمد</Text>
               <Text style={[styles.userContact, { color: colors.mutedForeground }]}>+966 50 123 4567</Text>
               <Text style={[styles.userContact, { color: colors.mutedForeground }]}>ahmed@email.com</Text>
               
               <View style={[styles.premiumPill, { backgroundColor: colors.successLight }]}>
                  <MaterialCommunityIcons name="diamond-stone" size={14} color={colors.success} />
                  <Text style={[styles.premiumText, { color: colors.success }]}>عضو مميز | لديك 240 نقطة</Text>
               </View>
            </View>

            <View style={styles.avatarWrap}>
              <Image source={require("@/assets/images/user-ahmed.png")} style={styles.avatar} />
              <TouchableOpacity style={[styles.cameraBadge, { backgroundColor: colors.primary }]} onPress={() => router.push("/edit-profile")}>
                <Feather name="camera" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Saved Addresses */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>العناوين المحفوظة</Text>
        </View>

        <View style={styles.sectionContent}>
          {ADDRESSES.map((item) => (
            <View key={item.id} style={[styles.addressItem, { backgroundColor: colors.card }]}>
              <TouchableOpacity>
                <Feather name="more-vertical" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              <View style={styles.itemTextWrap}>
                <View style={styles.itemTitleRow}>
                  {item.default && (
                    <View style={[styles.defaultBadge, { backgroundColor: colors.successLight }]}>
                      <Text style={[styles.defaultBadgeText, { color: colors.success }]}>افتراضي</Text>
                    </View>
                  )}
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
                </View>
                <Text style={[styles.itemSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
              <View style={[styles.itemIconBox, { backgroundColor: item.color + "20" }]}>
                 <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
            </View>
          ))}
          <TouchableOpacity style={[styles.addBtn, { borderColor: colors.primary }]} onPress={() => router.push("/address-form")}>
             <Text style={[styles.addBtnText, { color: colors.primary }]}>+ إضافة عنوان جديد</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => router.push("/payment-methods")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>وسائل الدفع</Text>
        </View>

        <View style={styles.sectionContent}>
          <View style={[styles.addressItem, { backgroundColor: colors.card }]}>
            <TouchableOpacity>
              <Feather name="more-vertical" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={styles.itemTextWrap}>
               <View style={styles.itemTitleRow}>
                 <View style={[styles.defaultBadge, { backgroundColor: colors.successLight }]}>
                   <Text style={[styles.defaultBadgeText, { color: colors.success }]}>افتراضي</Text>
                 </View>
                 <Text style={[styles.itemTitle, { color: colors.foreground }]}>visa **** 4242</Text>
               </View>
            </View>
            <View style={styles.paymentLogoWrap}>
               <MaterialCommunityIcons name="credit-card" size={24} color={colors.accent} />
            </View>
          </View>
          <TouchableOpacity style={[styles.addBtn, { borderColor: colors.primary }]} onPress={() => router.push("/payment-form")}>
             <Text style={[styles.addBtnText, { color: colors.primary }]}>+ إضافة وسيلة دفع جديدة</Text>
          </TouchableOpacity>
        </View>

        {/* Menu List */}
        <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => router.push(item.path as any)}
              style={[
                styles.menuItem, 
                index !== MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
              ]}
            >
              <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
              </View>
              <View style={[styles.menuIconBox, { backgroundColor: item.color + "20" }]}>
                 <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.switchBtn, { backgroundColor: colors.accentLight, borderWidth: 1, borderColor: colors.accent }]}
          onPress={() => router.replace("/(provider)")}
        >
          <Feather name="briefcase" size={16} color={colors.accent} />
          <Text style={[styles.switchT, { color: colors.accent }]}>التبديل لحساب مزود خدمة</Text>
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
  headerActions: {
    flexDirection: "row",
    gap: 12,
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
  notifDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
  profileCard: {
    marginHorizontal: 24,
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  chevron: {
    padding: 4,
  },
  profileInfo: {
    flex: 1,
    alignItems: "flex-end",
    marginHorizontal: 16,
  },
  userName: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 20,
    marginBottom: 4,
  },
  userContact: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    marginBottom: 2,
  },
  premiumPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
    marginTop: 12,
  },
  premiumText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 11,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
  },
  seeAll: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 14,
  },
  sectionContent: {
    paddingHorizontal: 16,
    marginBottom: 18,
    gap: 12,
  },
  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  itemTextWrap: {
    flex: 1,
    alignItems: "flex-end",
    marginHorizontal: 16,
  },
  itemTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  defaultBadgeText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 10,
  },
  itemSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 13,
  },
  itemIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentLogoWrap: {
    width: 48,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  addBtnText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 14,
  },
  menuContainer: {
    marginHorizontal: 24,
    borderRadius: 24,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  menuTextWrap: {
    flex: 1,
    alignItems: "flex-end",
    marginHorizontal: 16,
  },
  menuTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  menuSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  switchBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  switchT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
});
