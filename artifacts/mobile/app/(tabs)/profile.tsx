import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/lib/auth";
import GuestEmpty from "@/components/GuestEmpty";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

const FALLBACK_ADDRESSES = [
  { id: "a1", title: "المنزل", address: "شارع الملك فهد، حي الروضة، الرياض 12311", is_default: true, icon: "map-pin", iconColor: "#16C47F", iconBg: "#DCFCE7" },
  { id: "a2", title: "العمل", address: "طريق الأمير سلطان، حي العليا، الرياض 12221", is_default: false, icon: "briefcase", iconColor: "#3B82F6", iconBg: "#DBEAFE" },
  { id: "a3", title: "منزل العائلة", address: "حي النرجس، شارع رقم 15، الرياض 13336", is_default: false, icon: "home", iconColor: "#8B5CF6", iconBg: "#EDE9FE" },
];

const MENU = [
  { id: "pay", title: "طرق الدفع", sub: "إدارة بطاقاتك وطرق الدفع", icon: "credit-card", color: "#16C47F", bg: "#DCFCE7", path: "/payment-methods" },
  { id: "orders", title: "سجل الطلبات", sub: "عرض طلباتك السابقة وحالتها", icon: "calendar", color: "#3B82F6", bg: "#DBEAFE", path: "/(tabs)/bookings" },
  { id: "offers", title: "العروض والخصومات", sub: "تصفح أحدث العروض والخصومات", icon: "tag", color: "#EC4899", bg: "#FCE7F3", path: "/(tabs)/offers" },
  { id: "settings", title: "الإعدادات", sub: "إدارة الحساب والتطبيق", icon: "settings", color: "#6B7280", bg: "#F3F4F6", path: "/settings" },
  { id: "help", title: "المساعدة والدعم", sub: "الأسئلة الشائعة وطرق التواصل", icon: "headphones", color: "#F97316", bg: "#FFF7ED", path: "/help" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const { session, profile, signOut } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase.from("addresses").select("*").eq("user_id", session.user.id).order("is_default", { ascending: false });
    if (data && data.length > 0) setAddresses(data);
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  const onSignOut = () => {
    Alert.alert(t("signout"), t("signout_q"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("exit"), style: "destructive", onPress: async () => { await signOut(); router.replace("/login"); } },
    ]);
  };

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <GuestEmpty title={t("profile_title")} subtitle={t("profile_sub")} icon="account-circle-outline" />
      </View>
    );
  }

  const displayAddresses = addresses;
  const userName = profile?.full_name || t("the_user");
  const userPhone = profile?.phone || "";
  const userEmail = profile?.email || "";

  return (
    <View style={[s.root, { backgroundColor: "#F8FAFC" }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.hIcon} onPress={() => router.push("/notifications")}>
          <Feather name="bell" size={20} color="#1E293B" />
          <View style={s.notifDot} />
        </TouchableOpacity>
        <View style={s.hCenter}>
          <Text style={s.hTitle}>ملفي الشخصي</Text>
          <Text style={s.hSub}>إدارة معلوماتك وخدماتك</Text>
        </View>
        <TouchableOpacity style={s.hIcon} onPress={() => router.push("/settings")}>
          <Feather name="settings" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={s.profileRow}>
          <View style={s.profileInfo}>
            <View style={s.nameRow}>
              <MaterialCommunityIcons name="check-decagram" size={18} color="#3B82F6" />
              <Text style={s.userName}>{userName}</Text>
            </View>
            <Text style={s.userDetail}>{userPhone}</Text>
            <Text style={s.userDetail}>{userEmail}</Text>
            <TouchableOpacity style={s.editBtn} onPress={() => router.push("/edit-profile")}>
              <Feather name="edit-2" size={14} color="#3B82F6" />
              <Text style={s.editBtnText}>تعديل الملف الشخصي</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.avatarWrap} onPress={() => router.push("/edit-profile")}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            ) : (
              <Image source={require("@/assets/images/user-ahmed.png")} style={s.avatar} />
            )}
            <View style={s.cameraBadge}>
              <Feather name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Membership Banner */}
        <LinearGradient colors={["#8B5CF6", "#A78BFA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.memberBanner}>
          <TouchableOpacity style={s.memberBtn}>
            <Text style={s.memberBtnText}>عرض المميزات</Text>
          </TouchableOpacity>
          <View style={s.memberContent}>
            <Text style={s.memberTitle}>عضوية مميزة</Text>
            <Text style={s.memberDesc}>استمتع بخدمات حصرية وعروض خاصة</Text>
          </View>
          <MaterialCommunityIcons name="star" size={36} color="#FDE68A" />
        </LinearGradient>

        {/* Saved Addresses */}
        <View style={s.secHeader}>
          <TouchableOpacity style={s.seeAllRow}>
            <Feather name="chevron-down" size={16} color="#3B82F6" />
            <Text style={s.seeAll}>عرض الكل</Text>
          </TouchableOpacity>
          <View style={s.secTitleRow}>
            <Text style={s.secTitle}>العناوين المحفوظة</Text>
            <View style={[s.secIconWrap, { backgroundColor: "#DBEAFE" }]}>
              <Feather name="map-pin" size={16} color="#3B82F6" />
            </View>
          </View>
        </View>

        <View style={s.addressList}>
          {displayAddresses.length === 0 ? (
            <TouchableOpacity style={s.addAddrEmpty} onPress={() => router.push("/address-form")}>
              <Text style={s.addAddrText}>+ إضافة عنوان جديد</Text>
            </TouchableOpacity>
          ) : (
            <>
              {displayAddresses.map((addr: any) => (
                <View key={addr.id} style={s.addressItem}>
                  <TouchableOpacity>
                    <Text style={s.addrMore}>...</Text>
                  </TouchableOpacity>
                  {addr.is_default && (
                    <View style={s.defaultBadge}>
                      <Text style={s.defaultBadgeText}>الرئيسي</Text>
                    </View>
                  )}
                  <View style={s.addrTextWrap}>
                    <Text style={s.addrTitle}>{addr.title}</Text>
                    <Text style={s.addrSub} numberOfLines={1}>{addr.address || addr.street || ""}</Text>
                  </View>
                  <View style={[s.addrIcon, { backgroundColor: addr.iconBg || "#DCFCE7" }]}>
                    <Feather name={(addr.icon || "map-pin") as any} size={20} color={addr.iconColor || "#16C47F"} />
                  </View>
                </View>
              ))}
              <TouchableOpacity style={s.addAddr} onPress={() => router.push("/address-form")}>
                <Text style={s.addAddrText}>+ إضافة عنوان جديد</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Menu */}
        <View style={s.menuCard}>
          {MENU.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(item.path as any)}
              style={[s.menuItem, i < MENU.length - 1 && s.menuBorder]}
            >
              <Feather name="chevron-left" size={18} color="#CBD5E1" />
              <View style={s.menuTextWrap}>
                <Text style={s.menuTitle}>{item.title}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <View style={[s.menuIconWrap, { backgroundColor: item.bg }]}>
                <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.signOutBtn} onPress={onSignOut}>
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text style={s.signOutText}>{t("signout")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  hIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  notifDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6", borderWidth: 2, borderColor: "#FFF" },
  hCenter: { flex: 1, alignItems: "center" },
  hTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#1E293B" },
  hSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#94A3B8", marginTop: 2 },

  profileRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 },
  profileInfo: { flex: 1, alignItems: "flex-end", marginRight: 16 },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 4 },
  userName: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#1E293B" },
  userDetail: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#64748B", marginBottom: 2 },
  editBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  editBtnText: { fontFamily: "Tajawal_600SemiBold", fontSize: 12, color: "#1E293B" },
  avatarWrap: { position: "relative" },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: "#3B82F6", borderWidth: 3, borderColor: "#FFF", alignItems: "center", justifyContent: "center" },

  memberBanner: { marginHorizontal: 16, borderRadius: 20, padding: 18, flexDirection: "row-reverse", alignItems: "center", marginBottom: 20 },
  memberContent: { flex: 1, alignItems: "flex-end", marginRight: 12 },
  memberTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  memberDesc: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  memberBtn: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  memberBtnText: { fontFamily: "Tajawal_600SemiBold", fontSize: 12, color: "#FFF" },

  secHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
  secTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  secTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#1E293B" },
  secIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  seeAllRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAll: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, color: "#3B82F6" },

  addressList: { paddingHorizontal: 16, marginBottom: 20 },
  addressItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", padding: 14, borderRadius: 18, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  addrIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  addrTextWrap: { flex: 1, alignItems: "flex-end", marginHorizontal: 12 },
  addrTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#1E293B" },
  addrSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#64748B", marginTop: 2 },
  addrMore: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#94A3B8", paddingHorizontal: 6 },
  defaultBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginRight: 4 },
  defaultBadgeText: { fontFamily: "Tajawal_600SemiBold", fontSize: 10, color: "#16C47F" },
  addAddrEmpty: { height: 56, borderRadius: 18, borderWidth: 1, borderStyle: "dashed", borderColor: "#3B82F6", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  addAddr: { alignItems: "center", paddingVertical: 10 },
  addAddrText: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, color: "#3B82F6" },

  menuCard: { marginHorizontal: 16, backgroundColor: "#FFF", borderRadius: 22, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, marginBottom: 16 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  menuTextWrap: { flex: 1, alignItems: "flex-end", marginHorizontal: 14 },
  menuTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#1E293B", marginBottom: 2 },
  menuSub: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "#94A3B8" },
  menuIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  signOutBtn: { marginHorizontal: 16, marginTop: 4, marginBottom: 16, height: 52, borderRadius: 18, backgroundColor: "#FEF2F2", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10 },
  signOutText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#EF4444" },
});
