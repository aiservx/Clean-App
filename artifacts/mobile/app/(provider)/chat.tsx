import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";

const CHATS = [
  { id: "1", name: "خالد العتيبي", lastMsg: "أين أنت الآن؟", time: "10:15", unread: 2, online: true, img: require("@/assets/images/user-ahmed.png") },
  { id: "2", name: "فاطمة السعد", lastMsg: "شكراً، كان عمل ممتاز!", time: "أمس", unread: 0, online: false, img: require("@/assets/images/user-ahmed.png") },
  { id: "3", name: "سعد الحربي", lastMsg: "الطلب بعد الظهر إن شاء الله", time: "أمس", unread: 1, online: true, img: require("@/assets/images/user-ahmed.png") },
  { id: "4", name: "الدعم - مزود خدمة", lastMsg: "كيف يمكننا مساعدتك؟", time: "23 مايو", unread: 0, online: false, img: require("@/assets/images/icon.png") },
];

export default function ProviderChat() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ alignItems: "flex-end", flex: 1 }}>
          <Text style={[styles.hT, { color: colors.foreground }]}>الرسائل</Text>
          <Text style={[styles.hS, { color: colors.mutedForeground }]}>تواصل مع عملائك</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        {CHATS.map((c) => (
          <TouchableOpacity key={c.id} style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => router.push(`/chat-detail?name=${c.name}`)}>
            <View style={styles.left}>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>{c.time}</Text>
              {c.unread > 0 && (
                <View style={[styles.unread, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadT}>{c.unread}</Text>
                </View>
              )}
            </View>
            <View style={styles.center}>
              <Text style={[styles.name, { color: colors.foreground }]}>{c.name}</Text>
              <Text style={[styles.last, { color: colors.mutedForeground }]} numberOfLines={1}>{c.lastMsg}</Text>
            </View>
            <View style={styles.avWrap}>
              <Image source={c.img} style={styles.av} />
              {c.online && <View style={[styles.onDot, { backgroundColor: colors.success, borderColor: colors.background }]} />}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { paddingHorizontal: 16, marginBottom: 14 },
  hT: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  hS: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  left: { alignItems: "center", justifyContent: "center", width: 50 },
  time: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginBottom: 4 },
  unread: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  unreadT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 9 },
  center: { flex: 1, alignItems: "flex-end", marginHorizontal: 12 },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 2 },
  last: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  avWrap: { position: "relative" },
  av: { width: 50, height: 50, borderRadius: 25 },
  onDot: { position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
