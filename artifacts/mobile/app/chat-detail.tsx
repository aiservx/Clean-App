import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Msg = { id: string; sender_id: string; body: string; created_at: string };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

function TypingDots({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 180),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={td.row}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[td.dot, { backgroundColor: color, opacity: dot }]} />
      ))}
    </View>
  );
}

const td = StyleSheet.create({
  row: { flexDirection: "row", gap: 4, alignItems: "center", paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

export default function ChatDetail() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const { name, bookingId, roomId: paramRoomId } = useLocalSearchParams<{
    name?: string; bookingId?: string; roomId?: string;
  }>();

  const [roomId, setRoomId] = useState<string | null>(paramRoomId ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isTypingRef = useRef(false);

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

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!roomId || !session?.user) return;

    const userId = session.user.id;
    const topic = `chat-room-${roomId}`;
    const ch = supabase.channel(topic);
    channelRef.current = ch;

    ch
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `room_id=eq.${roomId}`,
      }, (p) => {
        setMsgs((prev) => [...prev, p.new as Msg]);
        if ((p.new as Msg).sender_id !== userId) {
          setOtherTyping(false);
          if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
        }
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      })
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (payload.payload?.userId && payload.payload.userId !== userId) {
          setOtherTyping(true);
          if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
          otherTypingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload: any) => {
        if (payload.payload?.userId && payload.payload.userId !== userId) {
          setOtherTyping(false);
          if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
    };
  }, [roomId, session]);

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !session?.user) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      channelRef.current.send({ type: "broadcast", event: "typing", payload: { userId: session.user.id } });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      channelRef.current?.send({ type: "broadcast", event: "stop_typing", payload: { userId: session.user.id } });
    }, 1500);
  }, [session]);

  const handleChangeText = (val: string) => {
    setText(val);
    if (val.length > 0) broadcastTyping();
    else {
      isTypingRef.current = false;
      channelRef.current?.send({ type: "broadcast", event: "stop_typing", payload: { userId: session?.user?.id } });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const send = async () => {
    if (!text.trim() || !session?.user) return;
    const body = text.trim();
    setText("");
    isTypingRef.current = false;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    channelRef.current?.send({ type: "broadcast", event: "stop_typing", payload: { userId: session.user.id } });

    let rid = roomId;
    if (!rid) rid = await ensureRoom();
    if (!rid) return;
    await supabase.from("messages").insert({ room_id: rid, sender_id: session.user.id, body });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      style={[s.c, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: colors.card }]}>
        <TouchableOpacity style={[s.icon, { backgroundColor: colors.primaryLight }]}>
          <Feather name="phone" size={16} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[s.hN, { color: colors.foreground }]}>{name || "المزود"}</Text>
          <Text style={[s.hS, { color: colors.mutedForeground }]}>
            {otherTyping
              ? "يكتب الآن..."
              : bookingId
              ? `طلب #${bookingId.split("-")[0].toUpperCase()}`
              : "محادثة"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 14, gap: 10, flexGrow: msgs.length === 0 ? 1 : undefined }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {msgs.length === 0 && !otherTyping ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <Feather name="message-circle" size={48} color={colors.mutedForeground} />
              <Text style={[s.emptyT, { color: colors.foreground }]}>لا رسائل بعد</Text>
              <Text style={[s.emptyS, { color: colors.mutedForeground }]}>ابدأ المحادثة مع المزود</Text>
            </View>
          ) : (
            msgs.map((m) => {
              const isMe = m.sender_id === session?.user?.id;
              return (
                <View
                  key={m.id}
                  style={[
                    s.bubble,
                    isMe
                      ? { alignSelf: "flex-start", backgroundColor: colors.primary }
                      : { alignSelf: "flex-end", backgroundColor: colors.card },
                  ]}
                >
                  <Text style={[s.bubbleT, { color: isMe ? "#FFF" : colors.foreground }]}>{m.body}</Text>
                  <Text style={[s.bubbleTime, { color: isMe ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
                    {fmtTime(m.created_at)}
                  </Text>
                </View>
              );
            })
          )}

          {otherTyping && (
            <View style={[s.typingBubble, { backgroundColor: colors.card, alignSelf: "flex-end" }]}>
              <TypingDots color={colors.mutedForeground} />
            </View>
          )}
        </ScrollView>
      )}

      <View style={[s.inputBar, { backgroundColor: colors.card, paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]}
          onPress={send}
        >
          <Feather name="send" size={18} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
        </TouchableOpacity>
        <TextInput
          style={[s.input, { color: colors.foreground }]}
          placeholder="اكتب رسالة..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={handleChangeText}
          textAlign="right"
          multiline
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)",
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  hN: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  hS: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginTop: 14, textAlign: "center" },
  emptyS: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginTop: 6, textAlign: "center" },
  bubble: { maxWidth: "78%", padding: 10, borderRadius: 16, gap: 4 },
  bubbleT: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
  bubbleTime: { fontFamily: "Tajawal_400Regular", fontSize: 9 },
  typingBubble: {
    padding: 12, paddingHorizontal: 16, borderRadius: 16,
    maxWidth: "28%", marginBottom: 4,
  },
  inputBar: {
    flexDirection: "row", alignItems: "center",
    padding: 10, gap: 10,
    borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)",
  },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13, maxHeight: 100, paddingVertical: 6, paddingHorizontal: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
