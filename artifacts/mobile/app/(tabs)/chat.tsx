import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, Animated, Platform, KeyboardAvoidingView, ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import GuestEmpty from "@/components/GuestEmpty";
import FloatingTabBar from "@/components/FloatingTabBar";

// ─── Service data ───
type ServiceItem = {
  id: string;
  title: string;
  desc: string;
  price: number;
  duration: number;
  icon: string;
  color: string;
  image: ImageSourcePropType;
  bgColor: string;
};

const SERVICES: ServiceItem[] = [
  { id: "homes",     title: "تنظيف منازل",  desc: "تنظيف شامل لجميع أرجاء المنزل",           price: 85,  duration: 120, icon: "home",         color: "#16C47F", image: require("@/assets/images/illustration-vacuum.png"),   bgColor: "#E8F5EE" },
  { id: "deep",      title: "تنظيف عميق",   desc: "تنظيف عميق وتعقيم شامل للمساحات",         price: 150, duration: 180, icon: "shield-check", color: "#3B82F6", image: require("@/assets/images/illustration-bucket.png"),   bgColor: "#FCE4EC" },
  { id: "offices",   title: "تنظيف مكاتب",  desc: "تنظيف احترافي للمكاتب والشركات",           price: 100, duration: 150, icon: "briefcase",    color: "#F59E0B", image: require("@/assets/images/illustration-office.png"),   bgColor: "#FFF3E0" },
  { id: "furniture", title: "تنظيف كنب",    desc: "تنظيف وتعقيم الكنب والسجاد بأحدث الأجهزة", price: 120, duration: 90,  icon: "sofa",         color: "#10B981", image: require("@/assets/images/illustration-armchair.png"), bgColor: "#E8F5EE" },
  { id: "kitchens",  title: "تنظيف مطابخ",  desc: "تنظيف وتطهير المطابخ وإزالة الدهون",       price: 110, duration: 120, icon: "silverware-fork-knife", color: "#EF4444", image: require("@/assets/images/illustration-bucket.png"), bgColor: "#FFF3E0" },
  { id: "villas",    title: "تنظيف فلل",    desc: "خدمة تنظيف متكاملة للفلل والمنازل الكبيرة", price: 250, duration: 240, icon: "home-city",    color: "#8B5CF6", image: require("@/assets/images/illustration-vacuum.png"),   bgColor: "#E8EAF6" },
];

type ProviderItem = { id: string; name: string; rating: number; distance: string; exp: number; rate: number };

const NEARBY_PROVIDERS: ProviderItem[] = [
  { id: "p1", name: "أحمد علي",    rating: 4.9, distance: "1.2 كم", exp: 5, rate: 45 },
  { id: "p2", name: "فاطمة أحمد",  rating: 4.8, distance: "2.5 كم", exp: 3, rate: 40 },
  { id: "p3", name: "سارة محمد",   rating: 4.7, distance: "3.1 كم", exp: 4, rate: 42 },
];

// ─── Chat message types ───
type MsgRole = "bot" | "user";
type CardType = "services" | "providers" | "invoice" | "confirmation" | null;

type ChatMessage = {
  id: string;
  role: MsgRole;
  text: string;
  cardType?: CardType;
  service?: ServiceItem;
  provider?: ProviderItem;
  address?: string;
  phone?: string;
};

type BookingState = {
  step: "welcome" | "services" | "service_selected" | "providers" | "provider_selected" | "address" | "phone" | "invoice" | "confirmed";
  service: ServiceItem | null;
  provider: ProviderItem | null;
  address: string;
  phone: string;
};

let msgId = 0;
const nextId = () => `msg-${++msgId}`;

export default function ChatScreen() {
  const { session, profile } = useAuth();
  const _colors = useColors();
  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: _colors.background }}>
        <GuestEmpty title="المساعد الذكي" subtitle="سجّل دخولك للتحدث مع المساعد الذكي" icon="robot-happy-outline" />
        <FloatingTabBar active="chat" />
      </View>
    );
  }

  const insets = useSafeAreaInsets();
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [typing, setTyping] = useState(false);
  const [booking, setBooking] = useState<BookingState>({
    step: "welcome", service: null, provider: null, address: "", phone: "",
  });
  const typingAnim = useRef(new Animated.Value(0)).current;

  const addBotMessage = useCallback((text: string, cardType?: CardType, extra?: Partial<ChatMessage>) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text, cardType, ...extra }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 800);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Welcome on mount
  useEffect(() => {
    const name = profile?.full_name?.split(" ")[0] || "";
    addBotMessage(
      name ? `مرحباً ${name}! 👋\nأنا مساعدك الذكي في نظافة.\nكيف يمكنني مساعدتك اليوم؟` : "مرحباً! 👋\nأنا مساعدك الذكي في نظافة.\nكيف يمكنني مساعدتك اليوم؟"
    );
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: "اختر الخدمة التي تحتاجها:", cardType: "services" }]);
      setBooking((prev) => ({ ...prev, step: "services" }));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);
  }, []);

  // Typing animation
  useEffect(() => {
    if (typing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(typingAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      typingAnim.setValue(0);
    }
  }, [typing]);

  const handleSelectService = (svc: ServiceItem) => {
    addUserMessage(svc.title);
    setBooking((prev) => ({ ...prev, service: svc, step: "service_selected" }));
    setTimeout(() => {
      addBotMessage(
        `اختيار ممتاز! 🎯\n\n📌 ${svc.title}\n💰 السعر: ${svc.price} ر.س\n⏱ المدة: ${svc.duration} دقيقة\n\n${svc.desc}\n\nالآن اختر مزود الخدمة القريب منك:`,
        "providers"
      );
      setBooking((prev) => ({ ...prev, step: "providers" }));
    }, 300);
  };

  const handleSelectProvider = (prov: ProviderItem) => {
    addUserMessage(`اخترت ${prov.name}`);
    setBooking((prev) => ({ ...prev, provider: prov, step: "address" }));
    setTimeout(() => {
      addBotMessage(`${prov.name} خيار رائع! ⭐ ${prov.rating}\n\nأرسل عنوانك لنحدد موقع الخدمة:`);
    }, 300);
  };

  const handleSendText = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    addUserMessage(text);

    if (booking.step === "address") {
      setBooking((prev) => ({ ...prev, address: text, step: "phone" }));
      setTimeout(() => addBotMessage("تم تسجيل العنوان ✅\n\nأدخل رقم هاتفك للتواصل:"), 300);
    } else if (booking.step === "phone") {
      setBooking((prev) => ({ ...prev, phone: text, step: "invoice" }));
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: nextId(), role: "bot",
          text: "ممتاز! 🎉 إليك فاتورة الحجز للمراجعة:",
          cardType: "invoice",
          service: booking.service!,
          provider: booking.provider!,
          address: booking.address || text,
          phone: text,
        }]);
        setBooking((prev) => ({ ...prev, step: "invoice" }));
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }, 800);
    } else if (booking.step === "welcome" || booking.step === "services") {
      setTimeout(() => {
        addBotMessage("اختر من الخدمات المتاحة أدناه:", "services");
        setBooking((prev) => ({ ...prev, step: "services" }));
      }, 300);
    } else {
      setTimeout(() => addBotMessage("أنا هنا لمساعدتك! اختر خدمة من القائمة أعلاه للبدء."), 300);
    }
  };

  const handleConfirmBooking = () => {
    addUserMessage("تأكيد الحجز ✅");
    setBooking((prev) => ({ ...prev, step: "confirmed" }));
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: nextId(), role: "bot",
        text: "تم إرسال طلب الحجز بنجاح! 🎊\n\nسيتم التواصل معك خلال دقائق لتأكيد الموعد.\n\nشكراً لاختيارك نظافة! 💚",
        cardType: "confirmation",
      }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 800);
  };

  const handleNewBooking = () => {
    msgId = 0;
    setMessages([]);
    setBooking({ step: "welcome", service: null, provider: null, address: "", phone: "" });
    const name = profile?.full_name?.split(" ")[0] || "";
    addBotMessage(name ? `مرحباً ${name}! 👋 كيف يمكنني مساعدتك؟` : "مرحباً! 👋 كيف يمكنني مساعدتك؟");
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: "اختر الخدمة:", cardType: "services" }]);
      setBooking((prev) => ({ ...prev, step: "services" }));
    }, 1500);
  };

  const renderServiceCards = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      {SERVICES.map((svc) => (
        <TouchableOpacity key={svc.id} style={[s.svcCard, { backgroundColor: svc.bgColor }]} activeOpacity={0.85} onPress={() => handleSelectService(svc)}>
          <Image source={svc.image} style={s.svcCardImg} resizeMode="contain" />
          <Text style={s.svcCardTitle}>{svc.title}</Text>
          <Text style={s.svcCardPrice}>{svc.price} ر.س</Text>
          <Text style={s.svcCardDur}>⏱ {svc.duration} دقيقة</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderProviderCards = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      {NEARBY_PROVIDERS.map((prov) => (
        <TouchableOpacity key={prov.id} style={s.provCard} activeOpacity={0.85} onPress={() => handleSelectProvider(prov)}>
          <View style={s.provAvatar}>
            <Text style={s.provInitials}>{prov.name.split(" ").map((w) => w[0]).join("")}</Text>
          </View>
          <Text style={s.provName}>{prov.name}</Text>
          <View style={s.provRow}>
            <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
            <Text style={s.provRating}>{prov.rating}</Text>
            <Text style={s.provDist}>{prov.distance}</Text>
          </View>
          <Text style={s.provRate}>{prov.rate} ر.س/ساعة</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderInvoice = (msg: ChatMessage) => {
    const svc = msg.service || booking.service;
    const prov = msg.provider || booking.provider;
    const addr = msg.address || booking.address;
    const ph = msg.phone || booking.phone;
    if (!svc || !prov) return null;
    const vat = Math.round(svc.price * 0.15);
    const total = svc.price + vat;

    return (
      <View style={s.invoiceCard}>
        <LinearGradient colors={["#16C47F", "#0EA968"]} style={s.invoiceHeader}>
          <MaterialCommunityIcons name="receipt" size={22} color="#FFF" />
          <Text style={s.invoiceHeaderText}>فاتورة الحجز</Text>
        </LinearGradient>
        <View style={s.invoiceBody}>
          <View style={s.invoiceRow}>
            <Text style={s.invoiceVal}>{svc.title}</Text>
            <Text style={s.invoiceLabel}>الخدمة</Text>
          </View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}>
            <Text style={s.invoiceVal}>{prov.name}</Text>
            <Text style={s.invoiceLabel}>مزود الخدمة</Text>
          </View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}>
            <Text style={s.invoiceVal}>{addr}</Text>
            <Text style={s.invoiceLabel}>العنوان</Text>
          </View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}>
            <Text style={s.invoiceVal}>{ph}</Text>
            <Text style={s.invoiceLabel}>الهاتف</Text>
          </View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}>
            <Text style={s.invoiceVal}>{svc.duration} دقيقة</Text>
            <Text style={s.invoiceLabel}>المدة المتوقعة</Text>
          </View>
          <View style={[s.invoiceDivider, { borderStyle: "dashed" }]} />
          <View style={s.invoiceRow}>
            <Text style={s.invoiceVal}>{svc.price} ر.س</Text>
            <Text style={s.invoiceLabel}>سعر الخدمة</Text>
          </View>
          <View style={s.invoiceRow}>
            <Text style={s.invoiceVal}>{vat} ر.س</Text>
            <Text style={s.invoiceLabel}>ضريبة القيمة المضافة (15%)</Text>
          </View>
          <View style={[s.invoiceDivider, { borderColor: "#16C47F" }]} />
          <View style={s.invoiceRow}>
            <Text style={[s.invoiceVal, { fontFamily: "Tajawal_700Bold", color: "#16C47F", fontSize: 18 }]}>{total} ر.س</Text>
            <Text style={[s.invoiceLabel, { fontFamily: "Tajawal_700Bold" }]}>الإجمالي</Text>
          </View>
        </View>
        {booking.step === "invoice" && (
          <View style={s.invoiceActions}>
            <TouchableOpacity style={s.confirmBtn} activeOpacity={0.85} onPress={handleConfirmBooking}>
              <Text style={s.confirmBtnText}>تأكيد وإرسال الطلب</Text>
              <Feather name="check-circle" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderConfirmation = () => (
    <View style={s.confirmationCard}>
      <LinearGradient colors={["#16C47F", "#0EA968"]} style={s.confirmGrad}>
        <View style={s.confirmIconWrap}>
          <Feather name="check" size={36} color="#FFF" />
        </View>
        <Text style={s.confirmTitle}>تم تأكيد الحجز!</Text>
        <Text style={s.confirmSub}>رقم الطلب: #CLN{Date.now().toString().slice(-6)}</Text>
      </LinearGradient>
      <TouchableOpacity style={s.newBookingBtn} activeOpacity={0.85} onPress={handleNewBooking}>
        <Text style={s.newBookingBtnText}>حجز خدمة جديدة</Text>
        <Feather name="plus-circle" size={16} color="#16C47F" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerRow}>
          <View style={s.botAvatarHeader}>
            <MaterialCommunityIcons name="robot-happy" size={24} color="#FFF" />
          </View>
          <View style={s.headerInfo}>
            <Text style={s.headerTitle}>المساعد الذكي ✨</Text>
            <Text style={s.headerSub}>متصل الآن • يعرف جميع الخدمات</Text>
          </View>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>AI</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={msg.role === "bot" ? s.botMsgWrap : s.userMsgWrap}>
              {msg.role === "bot" && (
                <View style={s.botAvatarSmall}>
                  <MaterialCommunityIcons name="robot-happy" size={16} color="#7C3AED" />
                </View>
              )}
              <View style={{ flex: 1, maxWidth: "85%" }}>
                <View style={msg.role === "bot" ? s.botBubble : s.userBubble}>
                  <Text style={msg.role === "bot" ? s.botText : s.userText}>{msg.text}</Text>
                </View>
                {msg.cardType === "services" && renderServiceCards()}
                {msg.cardType === "providers" && renderProviderCards()}
                {msg.cardType === "invoice" && renderInvoice(msg)}
                {msg.cardType === "confirmation" && renderConfirmation()}
              </View>
            </View>
          ))}

          {typing && (
            <View style={s.botMsgWrap}>
              <View style={s.botAvatarSmall}>
                <MaterialCommunityIcons name="robot-happy" size={16} color="#7C3AED" />
              </View>
              <View style={s.typingBubble}>
                <Animated.View style={[s.typingDot, { opacity: typingAnim }]} />
                <Animated.View style={[s.typingDot, { opacity: typingAnim, marginLeft: 6 }]} />
                <Animated.View style={[s.typingDot, { opacity: typingAnim, marginLeft: 6 }]} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 12) + 60 }]}>
          <View style={s.inputRow}>
            <TouchableOpacity style={s.sendBtn} onPress={handleSendText} activeOpacity={0.85}>
              <Feather name="send" size={18} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
            </TouchableOpacity>
            <TextInput
              style={s.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                booking.step === "address" ? "أدخل عنوانك هنا..." :
                booking.step === "phone" ? "أدخل رقم هاتفك..." :
                "اكتب رسالتك..."
              }
              placeholderTextColor="#94A3B8"
              textAlign="right"
              onSubmitEditing={handleSendText}
              returnKeyType="send"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  botAvatarHeader: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  headerInfo: { flex: 1, alignItems: "flex-end" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#FFF" },
  headerSub: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
  },
  headerBadgeText: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#FFF" },

  // Messages
  messagesContent: { padding: 16, paddingBottom: 20, gap: 12 },
  botMsgWrap: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8 },
  userMsgWrap: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  botAvatarSmall: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  botBubble: {
    backgroundColor: "#F1F5F9",
    borderRadius: 18, borderTopRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: "#7C3AED",
    borderRadius: 18, borderTopLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    alignSelf: "flex-end",
  },
  botText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#0F172A", textAlign: "right", lineHeight: 22 },
  userText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#FFF", textAlign: "right", lineHeight: 22 },

  // Typing
  typingBubble: {
    flexDirection: "row", backgroundColor: "#F1F5F9",
    borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12,
  },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#94A3B8" },

  // Service cards in chat
  svcCard: {
    width: 140, borderRadius: 18, padding: 12, alignItems: "center",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  svcCardImg: { width: 56, height: 56, marginBottom: 8 },
  svcCardTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A", textAlign: "center", marginBottom: 4 },
  svcCardPrice: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#16C47F" },
  svcCardDur: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#64748B", marginTop: 2 },

  // Provider cards in chat
  provCard: {
    width: 150, backgroundColor: "#FFF", borderRadius: 18, padding: 14, alignItems: "center",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  provAvatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: "#EDE9FE",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  provInitials: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#7C3AED" },
  provName: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A", marginBottom: 4 },
  provRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginBottom: 4 },
  provRating: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#0F172A" },
  provDist: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#64748B" },
  provRate: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#16C47F" },

  // Invoice
  invoiceCard: {
    borderRadius: 20, overflow: "hidden", marginTop: 8,
    backgroundColor: "#FFF",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  invoiceHeader: {
    flexDirection: "row-reverse", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  invoiceHeaderText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  invoiceBody: { padding: 16, gap: 10 },
  invoiceRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  invoiceLabel: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#64748B" },
  invoiceVal: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, color: "#0F172A", textAlign: "left", maxWidth: "60%" },
  invoiceDivider: { borderBottomWidth: 1, borderColor: "#F1F5F9" },
  invoiceActions: { padding: 16, paddingTop: 0 },
  confirmBtn: {
    backgroundColor: "#16C47F", borderRadius: 14,
    paddingVertical: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8,
  },
  confirmBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFF" },

  // Confirmation
  confirmationCard: {
    borderRadius: 20, overflow: "hidden", marginTop: 8,
    backgroundColor: "#FFF",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  confirmGrad: { alignItems: "center", paddingVertical: 24, gap: 10 },
  confirmIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center",
  },
  confirmTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#FFF" },
  confirmSub: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "rgba(255,255,255,0.9)" },
  newBookingBtn: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14,
  },
  newBookingBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#16C47F" },

  // Input
  inputBar: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center",
  },
  textInput: {
    flex: 1, height: 44, backgroundColor: "#F8FAFC",
    borderRadius: 22, paddingHorizontal: 16,
    fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#0F172A",
  },
});
