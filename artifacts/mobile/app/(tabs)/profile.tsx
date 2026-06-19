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
  { id: "tutorial", titleKey: "tutorial_video", subKey: "tutorial_video_sub", icon: "play-circle", color: "#16C47F", bg: "#DCFCE7", path: "/tutorial-video" },
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
  const [bookingsCount, setBookingsCount] = useState(0);

  const loadData = useCallback(async () => {
    if (!session?.user) return;
    const [addrRes, cntRes] = await Promise.all([
      supabase.from("addresses").select("*").eq("user_id", session.user.id).order("is_default", { ascending: false }),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("user_id", session.user.id).eq("status", "completed"),
    ]);
    if (addrRes.data) setAddresses(addrRes.data);
    if (cntRes.count != null) setBookingsCount(cntRes.count);
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
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
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

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={s.profileRow}>
          <View style={s.profileInfo}>
            <View style={s.nameRow}>
              <MaterialCommunityIcons name="check-decagram" size={18} color="#3B82F6" />
              <Text style={[s.userName, { color: colors.foreground }]}>{userName}</Text>
            </View>
            <Text style={[s.userDetail, { color: colors.mutedForeground }]}>{userPhone}</Text>
            <Text style={[s.userDetail, { color: colors.mutedForeground }]}>{userEmail}</Text>
            <TouchableOpacity style={[s.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/edit-profile")}>
              <Text style={[s.editBtnText, { color: colors.foreground }]}>تعديل الملف الشخصي</Text>
              <Feather name="edit-2" size={14} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.avatarWrap} onPress={() => router.push("/edit-profile")}>
            <Image source={profile?.avatar_url ? { uri: profile.avatar_url } : require("@/assets/images/default-avatar.png")} style={s.avatar} />
            <View style={s.cameraBadge}>
              <Feather name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Subscription Plans Banner */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => router.push("/subscription-plans" as any)}
          style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: "hidden" }}
        >
          <LinearGradient colors={["#059669", "#16C47F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ flexDirection: I18nManager.isRTL ? "row" : "row-reverse", alignItems: "center", padding: 14, gap: 12 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="shield-star-outline" size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF" }}>باقات الاشتراك الشهري</Text>
              <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>وفّر حتى 30% مع خدمة منتظمة مضمونة</Text>
            </View>
            <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Premium Membership Card */}
        <TouchableOpacity activeOpacity={0.92} onPress={() => router.push("/premium-membership" as any)} style={s.premiumWrap}>
          <LinearGradient colors={["#3B0764", "#6D28D9", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.premiumCard}>
            {/* Decorative circles */}
            <View style={s.premCircle1} />
            <View style={s.premCircle2} />

            {/* Top row */}
            <View style={s.premTopRow}>
              <View style={s.premBadge}>
                <MaterialCommunityIcons name="crown" size={13} color="#FDE68A" />
                <Text style={s.premBadgeText}>Premium</Text>
              </View>
              <View style={s.premIconBox}>
                <MaterialCommunityIcons name="crown" size={32} color="#FDE68A" />
              </View>
            </View>

            {/* Title & subtitle */}
            <Text style={s.premTitle}>عضوية مميزة</Text>
            <Text style={s.premSubtitle}>أولوية الخدمة • خصومات حصرية • دعم VIP</Text>

            {/* Stats */}
            <View style={s.premStatsRow}>
              <View style={s.premStat}>
                <Text style={s.premStatVal}>{bookingsCount}</Text>
                <Text style={s.premStatLabel}>طلب مكتمل</Text>
              </View>
              <View style={s.premStatDiv} />
              <View style={s.premStat}>
                <Text style={s.premStatVal}>15%</Text>
                <Text style={s.premStatLabel}>توفير دائم</Text>
              </View>
              <View style={s.premStatDiv} />
              <View style={s.premStat}>
                <Text style={s.premStatVal}>VIP</Text>
                <Text style={s.premStatLabel}>مستواك</Text>
              </View>
            </View>

            {/* CTA */}
            <View style={s.premCTA}>
              <Feather name={I18nManager.isRTL ? "arrow-left" : "arrow-right"} size={14} color="#7C3AED" />
              <Text style={s.premCTAText}>استكشف جميع المميزات</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Loyalty Points Card ─────────────────────────── */}
        {(() => {
          const points = bookingsCount * 10;
          const levels = [
            { name: "برونزي", min: 0,  max: 50,  color: "#CD7F32", bg: "#FEF3C7", icon: "🥉" },
            { name: "فضي",   min: 51,  max: 200, color: "#9CA3AF", bg: "#F3F4F6", icon: "🥈" },
            { name: "ذهبي",  min: 201, max: 500, color: "#F59E0B", bg: "#FFFBEB", icon: "🥇" },
            { name: "بلاتيني", min: 501, max: 99999, color: "#8B5CF6", bg: "#EDE9FE", icon: "💎" },
          ];
          const lvl = levels.find(l => points >= l.min && points <= l.max) ?? levels[0];
          const nextLvl = levels[levels.indexOf(lvl) + 1];
          const progress = nextLvl ? Math.min(1, (points - lvl.min) / (nextLvl.min - lvl.min)) : 1;
          return (
            <View style={[s.loyaltyCard, { backgroundColor: lvl.bg }]}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Text style={{ fontSize: 28, marginLeft: 8 }}>{lvl.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 14, color: lvl.color }}>مستوى {lvl.name}</Text>
                  <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#6B7280", marginTop: 1 }}>
                    {points.toLocaleString("ar-SA")} نقطة · {bookingsCount} طلب مكتمل
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 18, color: lvl.color }}>{points.toLocaleString("ar-SA")}</Text>
                  <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 9, color: "#9CA3AF" }}>نقطة</Text>
                </View>
              </View>
              <View style={{ height: 6, backgroundColor: "rgba(0,0,0,0.08)", borderRadius: 100, overflow: "hidden" }}>
                <View style={{ width: `${Math.round(progress * 100)}%` as any, height: 6, backgroundColor: lvl.color, borderRadius: 100 }} />
              </View>
              {nextLvl && (
                <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 9, color: "#9CA3AF", marginTop: 4, textAlign: "right" }}>
                  {(nextLvl.min - points)} نقطة للوصول إلى {nextLvl.icon} {nextLvl.name}
                </Text>
              )}
            </View>
          );
        })()}

        {/* ── Activity Stats Card ─────────────────────────────────────── */}
        {(() => {
          const totalSpent = bookingsCount * 175;
          const co2Saved = (bookingsCount * 2.5).toFixed(1);
          const streakWeeks = Math.min(12, Math.floor(bookingsCount / 2));
          const badges = [
            bookingsCount >= 1  && { icon: "🌟", label: "الطلب الأول" },
            bookingsCount >= 5  && { icon: "⭐", label: "5 طلبات" },
            bookingsCount >= 10 && { icon: "🏆", label: "10 طلبات" },
            bookingsCount >= 20 && { icon: "💎", label: "عميل مميز" },
          ].filter(Boolean) as { icon: string; label: string }[];

          return (
            <View style={[actStyles.wrap, { backgroundColor: colors.card }]}>
              <View style={actStyles.headerRow}>
                <MaterialCommunityIcons name="chart-line" size={18} color="#3B82F6" />
                <Text style={[actStyles.title, { color: colors.foreground }]}>إحصائياتي</Text>
              </View>
              <View style={actStyles.statsGrid}>
                <View style={[actStyles.statBox, { backgroundColor: "#EFF6FF" }]}>
                  <Text style={[actStyles.statVal, { color: "#3B82F6" }]}>{totalSpent.toLocaleString("ar-SA")}</Text>
                  <Text style={[actStyles.statLabel, { color: "#3B82F6" }]}>إجمالي الإنفاق (ر.س)</Text>
                </View>
                <View style={[actStyles.statBox, { backgroundColor: "#F0FDF4" }]}>
                  <Text style={[actStyles.statVal, { color: "#16C47F" }]}>{co2Saved}</Text>
                  <Text style={[actStyles.statLabel, { color: "#16C47F" }]}>كجم CO₂ توفّر 🌱</Text>
                </View>
                <View style={[actStyles.statBox, { backgroundColor: "#FFF7ED" }]}>
                  <Text style={[actStyles.statVal, { color: "#F97316" }]}>{streakWeeks}</Text>
                  <Text style={[actStyles.statLabel, { color: "#F97316" }]}>أسابيع متواصلة 🔥</Text>
                </View>
                <View style={[actStyles.statBox, { backgroundColor: "#FDF4FF" }]}>
                  <Text style={[actStyles.statVal, { color: "#8B5CF6" }]}>{badges.length}</Text>
                  <Text style={[actStyles.statLabel, { color: "#8B5CF6" }]}>شارات مكتسبة 🏅</Text>
                </View>
              </View>
              {badges.length > 0 && (
                <View style={actStyles.badgesRow}>
                  {badges.map((b) => (
                    <View key={b.label} style={actStyles.badge}>
                      <Text style={{ fontSize: 16 }}>{b.icon}</Text>
                      <Text style={[actStyles.badgeLabel, { color: colors.mutedForeground }]}>{b.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })()}

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
                  <TouchableOpacity onPress={() => Alert.alert("الخيارات", "ماذا تريد أن تفعل؟", [
                    { text: "تعديل", onPress: () => router.push("/address-form") },
                    { text: "إلغاء", style: "cancel" },
                  ])}>
                    <Text style={s.addrMore}>···</Text>
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
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);
const colAlign = I18nManager.isRTL ? ("flex-start" as const) : ("flex-end" as const);

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: rowDir, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  hIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  notifDot: { position: "absolute", top: 10, end: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6", borderWidth: 2, borderColor: "#FFF" },
  hCenter: { flex: 1, alignItems: "center" },
  hTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  hSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginTop: 2 },

  profileRow: { flexDirection: rowDir, alignItems: "center", paddingHorizontal: 24, marginBottom: 16 },
  profileInfo: { flex: 1, alignItems: colAlign, marginStart: 16 },
  nameRow: { flexDirection: rowDir, alignItems: "center", gap: 6, marginBottom: 4 },
  userName: { fontFamily: "Tajawal_700Bold", fontSize: 20 },
  userDetail: { fontFamily: "Tajawal_500Medium", fontSize: 13, marginBottom: 2 },
  editBtn: { flexDirection: rowDir, alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  editBtnText: { fontFamily: "Tajawal_600SemiBold", fontSize: 12 },
  avatarWrap: { position: "relative" },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  cameraBadge: { position: "absolute", bottom: 0, end: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: "#3B82F6", borderWidth: 3, borderColor: "#FFF", alignItems: "center", justifyContent: "center" },

  loyaltyCard: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 20 },
  premiumWrap: { marginHorizontal: 16, marginBottom: 20 },
  premiumCard: { borderRadius: 24, padding: 20, overflow: "hidden" },
  premCircle1: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.06)", top: -40, start: -40 },
  premCircle2: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.05)", bottom: -20, end: 30 },
  premTopRow: { flexDirection: rowDir, justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  premBadge: { flexDirection: rowDir, alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  premBadgeText: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#FDE68A" },
  premIconBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  premTitle: { fontFamily: "Tajawal_700Bold", fontSize: 22, color: "#FFF", textAlign: colAlign === "flex-end" ? "right" : "left", marginBottom: 4 },
  premSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)", textAlign: colAlign === "flex-end" ? "right" : "left", marginBottom: 18 },
  premStatsRow: { flexDirection: rowDir, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 16, padding: 14, marginBottom: 16, gap: 0 },
  premStat: { flex: 1, alignItems: "center" },
  premStatVal: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#FFF" },
  premStatLabel: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  premStatDiv: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 4 },
  premCTA: { flexDirection: rowDir, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFF", borderRadius: 14, paddingVertical: 12 },
  premCTAText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#6D28D9" },

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
  signOutInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  signOutIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  signOutText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#DC2626" },
});

const actStyles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 20, borderRadius: 20, padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statBox: { flex: 1, minWidth: "45%", borderRadius: 14, padding: 12, alignItems: "center" },
  statVal: { fontFamily: "Tajawal_700Bold", fontSize: 18, marginBottom: 2 },
  statLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "center" },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.04)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  badgeLabel: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
});
