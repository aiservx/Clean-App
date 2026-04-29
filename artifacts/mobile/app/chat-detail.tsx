import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useColors } from "@/hooks/useColors";

const INITIAL = [
  { id: "1", t: "السلام عليكم، أنا في الطريق إليك", me: false, time: "10:00" },
  { id: "2", t: "وعليكم السلام، الحمد لله. كم الوقت المتوقع؟", me: true, time: "10:01" },
  { id: "3", t: "حوالي 12 دقيقة بإذن الله", me: false, time: "10:01" },
  { id: "4", t: "تمام، الموقع واضح؟", me: true, time: "10:02" },
  { id: "5", t: "نعم، شكراً لمشاركتك الموقع", me: false, time: "10:02" },
];

export default function ChatDetail() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const [msgs, setMsgs] = useState(INITIAL);
  const [text, setText] = useState("");
  const ref = useRef<ScrollView>(null);

  const send = () => {
    if (!text.trim()) return;
    setMsgs([...msgs, { id: String(msgs.length + 1), t: text, me: true, time: "الآن" }]);
    setText("");
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={[styles.c, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.card }]}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
            <Feather name="phone" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.icon, { backgroundColor: colors.accentLight }]}>
            <MaterialCommunityIcons name="map-marker-radius" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.hN, { color: colors.foreground }]}>{name || "أحمد علي"}</Text>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[styles.hS, { color: colors.success }]}>متصل الآن</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView ref={ref} contentContainerStyle={{ padding: 14, gap: 8 }} showsVerticalScrollIndicator={false} onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}>
        {msgs.map((m) => (
          <View key={m.id} style={[styles.bubble, m.me ? { alignSelf: "flex-start", backgroundColor: colors.primary } : { alignSelf: "flex-end", backgroundColor: colors.card }]}>
            <Text style={[styles.bubbleT, { color: m.me ? "#FFF" : colors.foreground }]}>{m.t}</Text>
            <Text style={[styles.bubbleTime, { color: m.me ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>{m.time}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.inputBar, { backgroundColor: colors.card, paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={send}>
          <Feather name="send" size={18} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder="اكتب رسالة..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          textAlign="right"
          multiline
        />
        <TouchableOpacity><Feather name="paperclip" size={18} color={colors.mutedForeground} /></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  hN: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  hS: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  bubble: { maxWidth: "78%", padding: 10, borderRadius: 16, gap: 4 },
  bubbleT: { fontFamily: "Tajawal_500Medium", fontSize: 13, textAlign: "right" },
  bubbleTime: { fontFamily: "Tajawal_400Regular", fontSize: 9, textAlign: "left" },
  inputBar: { flexDirection: "row", alignItems: "center", padding: 10, gap: 10, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13, maxHeight: 100, paddingVertical: 6, paddingHorizontal: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
