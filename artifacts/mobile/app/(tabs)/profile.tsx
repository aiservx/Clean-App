import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert , I18nManager} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/lib/auth";
import GuestEmpty from "@/components/GuestEmpty";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

const MENU_KEYS = [
  { id: "orders", titleKey: "my_orders", subKey: "my_orders_sub", icon: "calendar", color: "#3B82F6", bg: "#DBEAFE", path: "/(tabs)/bookings" },
  { id: "offers", titleKey: "offers_disc", subKey: "offers_disc_sub", icon: "tag", color: "#EC4899", bg: "#FCE7F3", path: "/(tabs)/offers" },
  { id: "settings", titleKey: "settings", subKey: "settings_sub", icon: "settings", color: "#6B7280", bg: "#F3F4F6", path: "/settings" },
  { id: "help", titleKey: "help_support", subKey: "help_support_sub", icon: "headphones", color: "#F97316", bg: "#FFF7ED", path: "/help" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const { session, profile, signOut } = useAuth();
  const MENU = MENU_KEYS.map((m) => ({ ...m, title: t(m.titleKey), sub: t(m.subKey) }));
  const [addresses, setAddresses] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase.from("addresses").select("*").eq("user_id", session.user.id).order("is_default", { ascending: false });
    if (data) setAddresses(data);
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
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[s.hIcon, { backgroundColor: colors.card }]} onPress={() => router.push("/settings")}>
          <Feather name="settings" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.hCenter}>
          <Text style={[s.hTitle, { color: colors.foreground }]}>{t("profile_title")}</Text>
          <Text style={[s.hSub, { color: colors.mutedForeground }]}>{t("profile_sub")}</Text>
        </View>
        <TouchableOpacity style={[s.hIcon, { backgroundColor: colors.card }]} onPress={() => router.push("/notifications")}>
          <Feather name="bell" size={20} color={colors.foreground} />
          <View style={s.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={s.profileRow}>
          <TouchableOpacity style={s.avatarWrap} onPress={() => router.push("/edit-profile")}>
            <Image source={profile?.avatar_url ? { uri: profile.avatar_url } : require("@/assets/images/default-avatar.png")} style={s.avatar} />
            <View style={s.cameraBadge}>
              <Feather name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          <View style={s.profileInfo}>
            <View style={s.nameRow}>
              <Text style={[s.userName, { color: colors.foreground }]}>{userName}</Text>
              <MaterialCommunityIcons name="check-decagram" size={18} color="#3B82F6" />
            </View>
            <Text style={[s.userDetail, { color: colors.mutedForeground }]}>{userPhone}</Text>
            <Text style={[s.userDetail, { color: colors.mutedForeground }]}>{userEmail}</Text>
            <TouchableOpacity style={[s.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/edit-profile")}>
              <Feather name="edit-2" size={14} color="#3B82F6" />
              <Text style={[s.editBtnText, { color: colors.foreground }]}>تعديل الملف الشخصي</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Membership Banner */}
        <LinearGradient colors={["#8B5CF6", "#A78BFA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.memberBanner}>
          <MaterialCommunityIcons name="star" size={36} color="#FDE68A" />
          <View style={s.memberContent}>
            <Text style={s.memberTitle}>عضوية مميزة</Text>
            <Text style={s.memberDesc}>استمتع بخدمات حصرية وعروض خاصة</Text>
          </View>
          <TouchableOpacity style={s.memberBtn}>
            <Text style={s.memberBtnText}>عرض المميزات</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Saved Addresses */}
        <View style={s.secHeader}>
          <View style={s.secTitleRow}>
            <View style={[s.secIconWrap, { backgroundColor: "#DBEAFE" }]}>
              <Feather name="map-pin" size={16} color="#3B82F6" />
            </View>
            <Text style={[s.secTitle, { color: colors.foreground }]}>العناوين المحفوظة</Text>
          </View>
          <TouchableOpacity style={s.seeAllRow}>
            <Text style={s.seeAll}>عرض الكل</Text>
            <Feather name="chevron-down" size={16} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        <View style={s.addressList}>
          {displayAddresses.length === 0 ? (
            <TouchableOpacity style={s.addAddrEmpty} onPress={() => router.push("/address-form")}>
              <Text style={s.addAddrText}>+ إضافة عنوان جديد</Text>
            </TouchableOpacity>
          ) : (
            <>
              {displayAddresses.map((addr: any) => (
                <View key={addr.id} style={[s.addressItem, { backgroundColor: colors.card }]}>
                  <View style={[s.addrIcon, { backgroundColor: addr.iconBg || "#DCFCE7" }]}>
                    <Feather name={(addr.icon || "map-pin") as any} size={20} color={addr.iconColor || "#16C47F"} />
                  </View>
                  <View style={s.addrTextWrap}>
                    <Text style={[s.addrTitle, { color: colors.foreground }]}>{addr.title || "عنوان"}</Text>
                    <Text style={[s.addrSub, { color: colors.mutedForeground }]} numberOfLines={1}>{addr.address || addr.street || ""}</Text>
                  </View>
                  {addr.is_default && (
                    <View style={s.defaultBadge}>
                      <Text style={s.defaultBadgeText}>الرئيسي</Text>
                    </View>
                  )}
                  <TouchableOpacity>
                    <Text style={s.addrMore}>...</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.addAddr} onPress={() => router.push("/address-form")}>
                <Text style={s.addAddrText}>+ إضافة عنوان جديد</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Menu */}
        <View style={[s.menuCard, { backgroundColor: colors.card }]}>
          {MENU.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(item.path as any)}
              style={[s.menuItem, i < MENU.length - 1 && s.menuBorder]}
            >
              <View style={[s.menuIconWrap, { backgroundColor: item.bg }]}>
                <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={s.menuTextWrap}>
                <Text style={[s.menuTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[s.menuSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.signOutBtn} onPress={onSignOut} activeOpacity={0.85}>
          <View style={s.signOutInner}>
            <View style={s.signOutIconWrap}>
              <Feather name="log-out" size={16} color="#EF4444" />
            </View>
            <Text style={s.signOutText}>{t("signout")}</Text>
            <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={16} color="#FCA5A5" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// RTL helper: on first launch isRTL is false (forceRTL needs a full reload to take effect).
// Using `RTL ? "row" : "row-reverse"` gives correct visual order in BOTH cases:
//   isRTL=false → "row-reverse" manually creates right-to-left order
//   isRTL=true  → "row" + the RTL system's automatic reversal = same result
const RTL = I18nManager.isRTL;
const rowDir = RTL ? "row" : "row-reverse";
const colAlign = RTL ? "flex-start" : "flex-end"; // aligns children to visual RIGHT

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: rowDir, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  hIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  notifDot: { position: "absolute", top: 10, end: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6", borderWidth: 2, borderColor: "#FFF" },
  hCenter: { flex: 1, alignItems: "center" },
  hTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  hSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginTop: 2 },

  profileRow: { flexDirection: rowDir, alignItems: "center", paddingHorizontal: 24, marginBottom: 16 },
  profileInfo: { flex: 1, alignItems: colAlign, marginEnd: 16 },
  nameRow: { flexDirection: rowDir, alignItems: "center", gap: 6, marginBottom: 4 },
  userName: { fontFamily: "Tajawal_700Bold", fontSize: 20 },
  userDetail: { fontFamily: "Tajawal_500Medium", fontSize: 13, marginBottom: 2 },
  editBtn: { flexDirection: rowDir, alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  editBtnText: { fontFamily: "Tajawal_600SemiBold", fontSize: 12 },
  avatarWrap: { position: "relative" },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  cameraBadge: { position: "absolute", bottom: 0, end: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: "#3B82F6", borderWidth: 3, borderColor: "#FFF", alignItems: "center", justifyContent: "center" },

  memberBanner: { marginHorizontal: 16, borderRadius: 20, padding: 18, flexDirection: rowDir, alignItems: "center", marginBottom: 20 },
  memberContent: { flex: 1, alignItems: colAlign, marginEnd: 12 },
  memberTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  memberDesc: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  memberBtn: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  memberBtnText: { fontFamily: "Tajawal_600SemiBold", fontSize: 12, color: "#FFF" },

  secHeader: { flexDirection: rowDir, justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
  secTitleRow: { flexDirection: rowDir, alignItems: "center", gap: 8 },
  secTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  secIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  seeAllRow: { flexDirection: rowDir, alignItems: "center", gap: 2 },
  seeAll: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, color: "#3B82F6" },

  addressList: { paddingHorizontal: 16, marginBottom: 20 },
  addressItem: { flexDirection: rowDir, alignItems: "center", padding: 14, borderRadius: 18, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  addrIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  addrTextWrap: { flex: 1, alignItems: colAlign, marginHorizontal: 12 },
  addrTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  addrSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginTop: 2 },
  addrMore: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#94A3B8", paddingHorizontal: 6 },
  defaultBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginEnd: 4 },
  defaultBadgeText: { fontFamily: "Tajawal_600SemiBold", fontSize: 10, color: "#16C47F" },
  addAddrEmpty: { height: 56, borderRadius: 18, borderWidth: 1, borderStyle: "dashed", borderColor: "#3B82F6", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  addAddr: { alignItems: "center", paddingVertical: 10 },
  addAddrText: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, color: "#3B82F6" },

  menuCard: { marginHorizontal: 16, borderRadius: 22, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, marginBottom: 16 },
  menuItem: { flexDirection: rowDir, alignItems: "center", paddingVertical: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  menuTextWrap: { flex: 1, alignItems: colAlign, marginHorizontal: 14 },
  menuTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 2 },
  menuSub: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  signOutBtn: { marginHorizontal: 16, marginTop: 8, marginBottom: 24, borderRadius: 18, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FFF5F5", overflow: "hidden", shadowColor: "#EF4444", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  signOutInner: { flexDirection: rowDir, alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  signOutIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  signOutText: { flex: 1, fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#DC2626" },
});
