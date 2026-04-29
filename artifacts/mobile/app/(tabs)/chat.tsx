import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import GuestEmpty from "@/components/GuestEmpty";
import FloatingTabBar from "@/components/FloatingTabBar";

const CHATS = [
  { id: "1", name: "أحمد علي", lastMsg: "عامل النظافة في طريقه إليك الآن", time: "10:15 ص", unread: 2, online: true, image: require("@/assets/images/user-ahmed.png") },
  { id: "2", name: "فاطمة أحمد", lastMsg: "شكراً لتقييمك الرائع!", time: "أمس", unread: 0, online: false, image: require("@/assets/images/cleaner-fatima.png") },
  { id: "3", name: "سارة محمد", lastMsg: "هل يمكنك تأكيد الموقع؟", time: "أمس", unread: 0, online: true, image: require("@/assets/images/cleaner-sara.png") },
  { id: "4", name: "الدعم الفني", lastMsg: "كيف يمكننا مساعدتك اليوم؟", time: "23 مايو", unread: 0, online: false, image: require("@/assets/images/icon.png") },
];

export default function ChatScreen() {
  const { session } = useAuth();
  const _colors = useColors();
  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: _colors.background }}>
        <GuestEmpty title="الرسائل" subtitle="سجّل دخولك للتواصل مع مزودي الخدمة" icon="message-text-outline" />
        <FloatingTabBar active="chat" />
      </View>
    );
  }
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>الرسائل</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>تواصل مع عمال النظافة والدعم</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          {CHATS.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.chatRow, { borderBottomColor: colors.border }]}>
               {/* Time and Unread */}
               <View style={styles.leftCol}>
                  <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{item.time}</Text>
                  {item.unread > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                       <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
               </View>

               {/* Name and Last Message */}
               <View style={styles.centerCol}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.lastMsg, { color: colors.mutedForeground }]} numberOfLines={1}>
                     {item.lastMsg}
                  </Text>
               </View>

               {/* Avatar */}
               <View style={styles.avatarWrap}>
                  <Image source={item.image} style={styles.avatar} />
                  {item.online && <View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: colors.background }]} />}
               </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  headerTitleContainer: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 22,
  },
  headerSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  leftCol: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  timeText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 11,
    marginBottom: 4,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "#FFFFFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 10,
  },
  centerCol: {
    flex: 1,
    alignItems: "flex-end",
    marginHorizontal: 16,
  },
  userName: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  lastMsg: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});
