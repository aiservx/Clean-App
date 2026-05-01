import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Msg = { id: string; sender_id: string; body: string; created_at: string };

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

export default function ChatDetail() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const { name, bookingId, roomId: paramRoomId } = useLocalSearchParams<{ name?: string; bookingId?: string; roomId?: string }>();
  const [roomId, setRoomId] = useState<string | null>(paramRoomId ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const ref = useRef<ScrollView>(null);

  const ensureRoom = useCallback(async (): Promise<string | null> => {
    if (!session?.user) return null;
    if (roomId) return roomId;
    if (!bookingId) return null;
    const { data: existing } = await supabase
      .from("chat_rooms").select("id").eq("booking_id", bookingId).maybeSingle();
    if (existing?.id) { setRoomId(existing.id); return existing.id; }
    const { data: booking } = await supabase
      .from("bookings").select("user_id, provider_id").eq("id", bookingId).maybeSingle();
    if (!booking) return null;
    const { data: created } = await supabase.from("chat_rooms").insert({
      booking_id: bookingId, user_id: booking.user_id, provider_id: booking.provider_id,
    }).select("id").maybeSingle();
    if (created?.id) { setRoomId(created.id); return created.id; }
    return null;
  }, [session, roomId, bookingId]);

  const load = useCallback(async () => {
    const rid = await ensureRoom();
    if (!rid) { setLoading(false); return; }
    const { data } = await supabase
      .from("messages").select("id, sender_id, body, created_at")
      .eq("room_id", rid).order("created_at", { ascending: true });
    if (data) setMsgs(data as Msg[]);
    setLoading(false);
  }, [ensureRoom]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!roomId) return;
    const ch = supabase.channel(`chat-room-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (p) => setMsgs((prev) => [...prev, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const send = async () => {
    if (!text.trim() || !session?.user) return;
    const body = text.trim();
    setText("");
    let rid = roomId;
    if (!rid) rid = await ensureRoom();
    if (!rid) return;
    await supabase.from("messages").insert({ room_id: rid, sender_id: session.user.id, body });
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={[styles.c, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
          <Feather name="phone" size={16} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.hN, { color: colors.foreground }]}>{name || "المزود"}</Text>
          <Text style={[styles.hS, { color: colors.mutedForeground }]}>
            {bookingId ? `طلب #${bookingId.split("-")[0].toUpperCase()}` : "محادثة"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView ref={ref}
          contentContainerStyle={{ padding: 14, gap: 10, flexGrow: msgs.length === 0 ? 1 : undefined }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}
        >
          {msgs.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <Feather name="message-circle" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyT, { color: colors.foreground }]}>لا رسائل بعد</Text>
              <Text style={[styles.emptyS, { color: colors.mutedForeground }]}>ابدأ المحادثة مع المزود</Text>
            </View>
          ) : msgs.map((m) => {
            const isMe = m.sender_id === session?.user?.id;
            return (
              <View key={m.id} style={[styles.bubble, isMe ? { alignSelf: "flex-start", backgroundColor: colors.primary } : { alignSelf: "flex-end", backgroundColor: colors.card }]}>
                <Text style={[styles.bubbleT, { color: isMe ? "#FFF" : colors.foreground }]}>{m.body}</Text>
                <Text style={[styles.bubbleTime, { color: isMe ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>{fmtTime(m.created_at)}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.card, paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]} onPress={send}>
          <Feather name="send" size={18} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
        </TouchableOpacity>
        <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="اكتب رسالة..."
          placeholderTextColor={colors.mutedForeground} value={text} onChangeText={setText} textAlign="right" multiline />
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
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginTop: 14, textAlign: "center" },
  emptyS: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginTop: 6, textAlign: "center" },
  bubble: { maxWidth: "78%", padding: 10, borderRadius: 16, gap: 4 },
  bubbleT: { fontFamily: "Tajawal_500Medium", fontSize: 13, textAlign: "right" },
  bubbleTime: { fontFamily: "Tajawal_400Regular", fontSize: 9, textAlign: "left" },
  inputBar: { flexDirection: "row", alignItems: "center", padding: 10, gap: 10, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13, maxHeight: 100, paddingVertical: 6, paddingHorizontal: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
