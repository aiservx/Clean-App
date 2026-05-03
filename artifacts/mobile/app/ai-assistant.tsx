import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Animated, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, Image, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const AI_AVATAR_LIGHT = require("@/assets/images/ai-avatar-light.png");
const AI_AVATAR_DARK = require("@/assets/images/ai-avatar-dark.png");
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useChatBadge } from "@/lib/chatBadge";
import { distanceKm, getCurrentResolved, type ResolvedAddress } from "@/lib/location";
import { iconForService, colorForService } from "@/lib/serviceIcons";
import GuestEmpty from "@/components/GuestEmpty";
import { findPromotionAnswer } from "@/lib/promotions";

type ServiceItem = {
  id: string;
  title: string;
  desc: string;
  price: number;
  duration: number;
};

type ProviderItem = {
  id: string;
  name: string;
  rating: number;
  distance_km: number | null;
  exp: number;
  rate: number;
};

type MsgRole = "bot" | "user";
type CardType = "services" | "providers" | "invoice" | "confirmation" | "address_confirm" | "phone_confirm" | "quick_actions" | null;

type ChatMessage = {
  id: string;
  role: MsgRole;
  text: string;
  cardType?: CardType;
  service?: ServiceItem;
  provider?: ProviderItem;
  address?: string;
  phone?: string;
  orderNumber?: string;
};

type Step =
  | "welcome"
  | "services"
  | "service_selected"
  | "providers"
  | "provider_selected"
  | "address"
  | "phone"
  | "invoice"
  | "confirmed"
  | "qa"; // free-form Q&A mode

let msgId = 0;
const nextId = () => `msg-${++msgId}`;

// ── Lightweight rule-based AI for service/order knowledge ──
function answerFromKb(text: string, ctx: { hasOpenBooking: boolean }): string | null {
  const t = text.toLowerCase().trim();

  // Promotions / coupons / refer-a-friend always check first so the
  // assistant gives the live promo data instead of the generic fallback.
  const promoAns = findPromotionAnswer(text);
  if (promoAns) return promoAns;

  // greetings
  const isEnglish = /^[a-zA-Z\s\d!?.,']+$/.test(t);
  if (/^(hi|hello|مرحبا|اهلا|أهلا|السلام|سلام|hey)/i.test(t)) {
    return isEnglish
      ? "Hello 👋 I'm happy to help! You can ask me about:\n• Services & prices\n• Active offers & coupons\n• Refer a friend & earn 50 SAR\n• Order status or invoice\n• Refund or cancellation"
      : "أهلاً 👋 يسعدني مساعدتك! يمكنك سؤالي عن:\n• الخدمات والأسعار\n• العروض والكوبونات الفعّالة\n• دعوة الأصدقاء وكسب 50 ر.س\n• حالة طلبك أو الفاتورة\n• استرداد المبلغ أو الإلغاء";
  }
  if (/(سعر|تكلف|كم تكلفة|كم سعر)/i.test(text)) {
    return "تبدأ أسعارنا من 85 ر.س لتنظيف المنازل، و120 ر.س للكنب، و250 ر.س للفلل. يضاف رسوم خدمة 10 ر.س + ضريبة 15%. تظهر الفاتورة الكاملة قبل الدفع.";
  }
  if (/(وقت|مدة|كم تأخذ|كم تستغرق)/i.test(text)) {
    return "غالباً تستغرق الخدمة بين ساعتين و4 ساعات حسب نوعها. الفنّي سيؤكد المدة قبل البدء.";
  }
  if (/(اين طلبي|أين طلبي|حالة الطلب|تتبع)/i.test(text)) {
    return ctx.hasOpenBooking
      ? "يمكنك متابعة طلبك مباشرة من شاشة التتبع — اضغط 'تتبع طلبي' أو افتح طلباتي وستجد آخر تحديث للموقع والوقت المتوقع."
      : "ليس لديك طلب نشط حالياً. اختر خدمة من الأسفل لإنشاء طلب جديد.";
  }
  if (/(الغاء|إلغاء|كانسل|cancel)/i.test(text)) {
    return "يمكنك إلغاء الطلب من شاشة 'تتبع الطلب' قبل أن يبدأ الفنّي العمل. بعد البدء يحتاج الإلغاء موافقة الدعم. لا توجد رسوم إلغاء قبل قبول المزود.";
  }
  if (/(استرد|استرداد|فلوس|refund|رجع المبلغ|رجوع المبلغ)/i.test(text)) {
    return "لطلب الاسترداد:\n1️⃣ افتح الطلب من 'طلباتي'\n2️⃣ اختر 'فتح بلاغ'\n3️⃣ اشرح السبب وأرفق صور إن أمكن\nغالباً يتم الرد خلال 24 ساعة، والاسترداد عبر نفس وسيلة الدفع خلال 3-7 أيام عمل.";
  }
  if (/(شكوى|بلاغ|تذكره|تذكرة|دعم|مشكلة|اشتك|اشتكى)/i.test(text)) {
    return "للتواصل مع الدعم: افتح 'الإعدادات' ➜ 'المساعدة والدعم' ➜ 'فتح تذكرة'. يصلك رد خلال أقل من ساعة عادةً، ولديك سجل كامل لمحادثة الدعم.";
  }
  if (/(فاتورة|فواتير|invoice|إيصال|بيل)/i.test(text)) {
    return "تظهر لك الفاتورة فور تأكيد الحجز، ويتم تحديثها تلقائياً بعد كل تغيير حالة (قبول، تنفيذ، اكتمال). تجد كل فواتيرك في 'طلباتي'.";
  }
  if (/(دفع|payment|بطاقة|كاش|نقد|تمارا|stc|apple pay|مدى)/i.test(text)) {
    return "نقبل: بطاقة ائتمانية، مدى، Apple Pay، STC Pay، تمارا، أو الدفع نقداً عند الاستلام. كل المعاملات مشفّرة.";
  }
  if (/(فني|عامل|مزود|cleaner|provider)/i.test(text)) {
    return "كل الفنّيين موثّقون لدينا — هوية وطنية، تقييم لا يقل عن 4، وخبرة موثّقة. تستطيع رؤية تقييمات وأبعاد كل فنّي قبل الاختيار.";
  }
  if (/(عنوان|address)/i.test(text)) {
    return "يمكنك حفظ أكثر من عنوان (منزل، عمل، عائلة) من 'الإعدادات' ➜ 'العناوين'. سأستخدم العنوان الافتراضي تلقائياً.";
  }
  // English queries
  if (/(price|cost|how much)/i.test(t)) {
    return "Our prices start from 85 SAR for home cleaning, 120 SAR for sofa cleaning, and 250 SAR for villas. A 10 SAR service fee + 15% VAT applies. Full invoice shown before payment.";
  }
  if (/(how long|duration|time)/i.test(t)) {
    return "Services usually take 2-4 hours depending on the type. Your technician will confirm the duration before starting.";
  }
  if (/(order|track|status|where)/i.test(t)) {
    return ctx.hasOpenBooking
      ? "You can track your order from the tracking screen — tap 'Track Order' or open My Orders for the latest location and ETA."
      : "You don't have an active order. Choose a service below to create a new one.";
  }
  if (/(payment|pay|card|cash)/i.test(t)) {
    return "We accept: Credit card, Mada, Apple Pay, STC Pay, Tamara, or cash on delivery. All transactions are encrypted.";
  }
  if (/(help|support|complaint)/i.test(t)) {
    return "For support: Open 'Settings' → 'Help & Support' → 'Open Ticket'. You'll get a response within an hour usually.";
  }
  return null;
}

// Web SpeechRecognition typing helper (no-op on native)
function getWebSpeechRecognition(): any | null {
  if (Platform.OS !== "web") return null;
  try {
    const w: any = globalThis as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  } catch {
    return null;
  }
}

export default function ChatScreen() {
  const { session, profile } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { markRead } = useChatBadge();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { markRead(); }, []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [typing, setTyping] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [step, setStep] = useState<Step>("welcome");
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderItem | null>(null);
  const [chosenAddress, setChosenAddress] = useState<string>("");
  const [chosenPhone, setChosenPhone] = useState<string>("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<"ar-SA" | "en-US">("ar-SA");
  const [hasOpenBooking, setHasOpenBooking] = useState(false);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const recognitionRef = useRef<any>(null);

  // Saved-profile autofill candidates
  const savedPhone = profile?.phone || "";
  const [defaultAddress, setDefaultAddress] = useState<{ text: string; lat: number | null; lng: number | null } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<ResolvedAddress | null>(null);

  // Load services + nearby providers + saved address + open-booking flag
  useEffect(() => {
    if (!session?.user) {
      setLoadingMeta(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      try {
        const [me, addrRes, svcRes, openRes] = await Promise.all([
          getCurrentResolved(),
          supabase.from("addresses").select("title, street, district, city, lat, lng, is_default").eq("user_id", session.user.id).order("is_default", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("services").select("id, title_ar, desc_ar, base_price, duration_min, sort").eq("is_active", true).order("sort", { ascending: true }).limit(8),
          supabase.from("bookings").select("id, status").eq("user_id", session.user.id).in("status", ["pending", "accepted", "on_way", "started"]).limit(1),
        ]);
        if (cancelled) return;

        if (addrRes.data) {
          const a: any = addrRes.data;
          setDefaultAddress({
            text: [a.street, a.district, a.city].filter(Boolean).join("، ") || a.title || "العنوان المحفوظ",
            lat: a.lat ?? null,
            lng: a.lng ?? null,
          });
        }
        if (me) setCurrentAddress(me);

        const mappedSvc: ServiceItem[] = (svcRes.data ?? []).map((s: any) => ({
          id: s.id,
          title: s.title_ar || "خدمة",
          desc: s.desc_ar || "",
          price: Number(s.base_price || 0),
          duration: Number(s.duration_min || 120),
        }));
        setServices(mappedSvc);

        // Providers (nearby, available)
        const { data: provRows } = await supabase
          .from("providers")
          .select("id, rating, experience_years, hourly_rate, current_lat, current_lng, profiles(full_name)")
          .eq("available", true)
          .not("current_lat", "is", null)
          .not("current_lng", "is", null)
          .limit(10);
        const ref = me ? { lat: me.lat, lng: me.lng } : null;
        const mappedProv: ProviderItem[] = (provRows ?? []).map((p: any) => {
          const lat = p.current_lat;
          const lng = p.current_lng;
          const d = ref && lat && lng ? distanceKm(ref, { lat, lng }) : null;
          return {
            id: p.id,
            name: p.profiles?.full_name || "فني",
            rating: Number(p.rating || 4.7),
            distance_km: d,
            exp: Number(p.experience_years || 0),
            rate: Number(p.hourly_rate || 40),
          };
        });
        mappedProv.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
        setProviders(mappedProv);

        setHasOpenBooking(((openRes.data ?? []) as any[]).length > 0);
      } catch (e) {
        console.log("[v0] chat load failed:", (e as Error).message);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  const addBotMessage = useCallback((text: string, cardType?: CardType, extra?: Partial<ChatMessage>) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text, cardType, ...extra }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Welcome on mount
  useEffect(() => {
    if (loadingMeta) return;
    const name = profile?.full_name?.split(" ")[0] || "";
    addBotMessage(name ? `مرحباً ${name}! 👋\nأنا مساعدك الذكي في نظافة.` : "مرحباً! 👋\nأنا مساعدك الذكي في نظافة.");
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: "كيف أقدر أساعدك؟", cardType: "quick_actions" }]);
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: services.length ? "اختر خدمة من الشبكة:" : "لا توجد خدمات متاحة الآن، حاول لاحقاً.", cardType: services.length ? "services" : null }]);
        setStep("services");
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }, 700);
    }, 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMeta]);

  // Typing animation
  useEffect(() => {
    if (typing) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(typingAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      typingAnim.setValue(0);
    }
  }, [typing, typingAnim]);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <GuestEmpty title="المساعد الذكي" subtitle="سجّل دخولك للتحدث مع المساعد الذكي" icon="robot-happy-outline" />
      </View>
    );
  }

  const handleSelectService = (svc: ServiceItem) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    addUserMessage(svc.title);
    setSelectedService(svc);
    setStep("service_selected");
    setTimeout(() => {
      addBotMessage(
        `اختيار ممتاز! 🎯\n\n📌 ${svc.title}\n💰 السعر: ${svc.price} ر.س\n⏱ المدة: ~${svc.duration} دقيقة\n\nاختر الفنّي الذي يناسبك:`,
        "providers"
      );
      setStep("providers");
    }, 200);
  };

  const handleSelectProvider = (prov: ProviderItem) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    addUserMessage(`اخترت ${prov.name}`);
    setSelectedProvider(prov);
    // Now ask about address — if we have a saved/current one, ask for confirmation
    setTimeout(() => {
      const suggested = defaultAddress?.text || (currentAddress ? currentAddress.formatted : "");
      if (suggested) {
        addBotMessage(`${prov.name} خيار رائع! ⭐ ${prov.rating}\n\nهل العنوان التالي صحيح؟`, "address_confirm", { address: suggested });
        setStep("address");
      } else {
        addBotMessage(`${prov.name} خيار رائع! ⭐ ${prov.rating}\n\nأرسل عنوانك:`);
        setStep("address");
      }
    }, 200);
  };

  const askPhone = () => {
    setTimeout(() => {
      if (savedPhone) {
        addBotMessage("تم تسجيل العنوان ✅\n\nهل نستخدم رقم الهاتف التالي؟", "phone_confirm", { phone: savedPhone });
        setStep("phone");
      } else {
        addBotMessage("تم تسجيل العنوان ✅\n\nأدخل رقم هاتفك:");
        setStep("phone");
      }
    }, 200);
  };

  const finalizeInvoice = (addr: string, phone: string) => {
    if (!selectedService || !selectedProvider) return;
    setChosenAddress(addr);
    setChosenPhone(phone);
    setStep("invoice");
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: nextId(), role: "bot",
        text: "ممتاز! 🎉 هذه فاتورة الحجز للمراجعة:",
        cardType: "invoice",
        service: selectedService,
        provider: selectedProvider,
        address: addr,
        phone,
      }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  const handleConfirmAddress = (yes: boolean, suggested?: string) => {
    if (!yes) {
      addUserMessage("لا، أرسل عنواناً جديداً");
      setTimeout(() => addBotMessage("تمام، اكتب العنوان الجديد بالأسفل."), 200);
      return;
    }
    const addr = suggested || "";
    addUserMessage(addr || "نعم، استخدم العنوان المحفوظ");
    askPhone();
  };

  const handleConfirmPhone = (yes: boolean, suggested?: string) => {
    if (!yes) {
      addUserMessage("لا، رقم آخر");
      setTimeout(() => addBotMessage("اكتب الرقم البديل بالأسفل."), 200);
      return;
    }
    const ph = suggested || "";
    addUserMessage(ph);
    finalizeInvoice(chosenAddress || (defaultAddress?.text || currentAddress?.formatted || ""), ph);
  };

  const handleSendText = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    addUserMessage(text);

    if (step === "address") {
      setChosenAddress(text);
      askPhone();
    } else if (step === "phone") {
      finalizeInvoice(chosenAddress || text, text);
    } else {
      // Free-form: try the rule-based KB first
      const ans = answerFromKb(text, { hasOpenBooking });
      if (ans) {
        addBotMessage(ans);
      } else {
        addBotMessage("سؤال جيد! يمكنني مساعدتك بطلب جديد، تتبع طلب، أو فتح بلاغ. اختر من الأزرار السريعة أو اكتب: حالة طلبي / استرداد / دعم.");
      }
    }
  };

  const handleConfirmBooking = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addUserMessage("تأكيد الحجز ✅");
    setStep("confirmed");

    // Persist to DB
    let bookingId: string | null = null;
    try {
      if (session?.user && selectedService) {
        const { data, error } = await supabase
          .from("bookings")
          .insert({
            user_id: session.user.id,
            service_id: selectedService.id,
            provider_id: selectedProvider?.id || null,
            total: selectedService.price + 10 + Math.round((selectedService.price + 10) * 0.15 * 100) / 100,
            payment_method: "card",
            status: "pending",
            scheduled_at: new Date().toISOString(),
            notes: `العنوان: ${chosenAddress} | الهاتف: ${chosenPhone}`,
          })
          .select("id")
          .maybeSingle();
        if (error) console.log("[v0] chat booking insert err:", error.message);
        bookingId = data?.id || null;
      }
    } catch (e) {
      console.log("[v0] chat booking failed:", (e as Error).message);
    }

    setTimeout(() => {
      const orderNum = bookingId ? bookingId.slice(0, 8).toUpperCase() : `CLN${Date.now().toString().slice(-6)}`;
      setMessages((prev) => [...prev, {
        id: nextId(), role: "bot",
        text: bookingId
          ? "تم إرسال الطلب! 🎊 سنتواصل معك خلال دقائق لتأكيد الموعد. اضغط أسفل لمتابعة التتبع."
          : "تم استلام الطلب — سيتواصل معك الفريق قريباً.",
        cardType: "confirmation",
        orderNumber: orderNum,
      }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      if (bookingId) {
        // Auto-open tracking after 2s
        setTimeout(() => router.push({ pathname: "/tracking", params: { id: bookingId } } as any), 2000);
      }
    }, 600);
  };

  const handleNewBooking = () => {
    msgId = 0;
    setMessages([]);
    setStep("welcome");
    setSelectedService(null);
    setSelectedProvider(null);
    setChosenAddress("");
    setChosenPhone("");
    addBotMessage("بدأنا حجزاً جديداً 🎯");
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: "اختر خدمة:", cardType: "services" }]);
      setStep("services");
    }, 800);
  };

  // ─── Voice input ───
  const startVoiceWeb = () => {
    const SR = getWebSpeechRecognition();
    if (!SR) {
      Alert.alert("غير مدعوم", "متصفّحك لا يدعم الإدخال الصوتي. حاول من Chrome.");
      return;
    }
    try {
      const r = new SR();
      r.lang = voiceLang;
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (ev: any) => {
        const transcript: string = ev.results?.[0]?.[0]?.transcript || "";
        if (transcript) setInputText((prev) => (prev ? prev + " " : "") + transcript);
      };
      r.onerror = () => setVoiceListening(false);
      r.onend = () => setVoiceListening(false);
      r.start();
      recognitionRef.current = r;
      setVoiceListening(true);
    } catch (e) {
      Alert.alert("خطأ", (e as Error).message);
      setVoiceListening(false);
    }
  };

  const stopVoiceWeb = () => {
    try { recognitionRef.current?.stop?.(); } catch {}
    setVoiceListening(false);
  };

  const onMicPress = () => {
    if (Platform.OS === "web") {
      voiceListening ? stopVoiceWeb() : startVoiceWeb();
    } else {
      Alert.alert(
        "الإدخال الصوتي",
        "متاح حالياً على نسخة الويب. ضمن تطبيق الجوال سيتم تفعيله في تحديث قريب.",
      );
    }
  };

  // ─── Renderers ───
  const QuickActions = () => (
    <View style={s.qaWrap}>
      {[
        { id: "promos", label: "العروض والكوبونات", icon: "tag", onPress: () => { addUserMessage("ما هي العروض والكوبونات الفعّالة؟"); const a = answerFromKb("عروض وكوبونات", { hasOpenBooking }); a && addBotMessage(a); } },
        { id: "refer", label: "دعوة صديق", icon: "user-plus", onPress: () => { addUserMessage("نظام دعوة الأصدقاء"); const a = answerFromKb("دعوة صديق", { hasOpenBooking }); a && addBotMessage(a); setTimeout(() => router.push("/referrals"), 1500); } },
        { id: "track", label: "تتبع طلبي", icon: "navigation-2", onPress: () => { addUserMessage("تتبع طلبي"); const a = answerFromKb("اين طلبي", { hasOpenBooking }); a && addBotMessage(a); if (hasOpenBooking) setTimeout(() => router.push("/(tabs)/bookings"), 1200); } },
        { id: "refund", label: "استرداد المبلغ", icon: "rotate-ccw", onPress: () => { addUserMessage("استرداد المبلغ"); const a = answerFromKb("استرداد", { hasOpenBooking }); a && addBotMessage(a); } },
        { id: "support", label: "دعم", icon: "headphones", onPress: () => { addUserMessage("التواصل مع الدعم"); const a = answerFromKb("دعم", { hasOpenBooking }); a && addBotMessage(a); } },
        { id: "invoice", label: "فاتورتي", icon: "file-text", onPress: () => { addUserMessage("فاتورتي"); const a = answerFromKb("فاتورة", { hasOpenBooking }); a && addBotMessage(a); } },
      ].map((q) => (
        <TouchableOpacity key={q.id} style={s.qaChip} activeOpacity={0.85} onPress={q.onPress}>
          <Feather name={q.icon as any} size={13} color="#7C3AED" />
          <Text style={s.qaChipT}>{q.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderServiceGrid = () => (
    <View style={s.svcGrid}>
      {services.length === 0 ? (
        <View style={[s.svcCardGrid, { alignItems: "center", justifyContent: "center", height: 100 }]}>
          <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#64748B" }}>لا توجد خدمات الآن</Text>
        </View>
      ) : services.map((svc) => {
        const ico = iconForService(svc.title);
        const col = colorForService(svc.title);
        return (
          <TouchableOpacity key={svc.id} style={[s.svcCardGrid, { backgroundColor: col + "11" }]} activeOpacity={0.85} onPress={() => handleSelectService(svc)}>
            <View style={[s.svcIconBox, { backgroundColor: col + "22" }]}>
              <MaterialCommunityIcons name={ico as any} size={28} color={col} />
            </View>
            <Text style={s.svcCardTitle} numberOfLines={1}>{svc.title}</Text>
            <Text style={[s.svcCardPrice, { color: col }]}>{svc.price} ر.س</Text>
            <Text style={s.svcCardDur}>⏱ ~{svc.duration} د</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderProviderCards = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      {providers.length === 0 ? (
        <View style={[s.provCard, { alignItems: "center" }]}>
          <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#64748B" }}>لا يوجد فنيون متاحون الآن</Text>
          <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#94A3B8", marginTop: 4 }}>سيتم تخصيص أقرب فنّي تلقائياً</Text>
          <TouchableOpacity style={[s.confirmBtn, { marginTop: 10 }]} onPress={() => handleSelectProvider({ id: "auto", name: "أقرب فنّي", rating: 4.8, distance_km: null, exp: 0, rate: 0 })}>
            <Text style={s.confirmBtnText}>تخصيص تلقائي</Text>
          </TouchableOpacity>
        </View>
      ) : providers.map((prov) => (
        <TouchableOpacity key={prov.id} style={s.provCard} activeOpacity={0.85} onPress={() => handleSelectProvider(prov)}>
          <View style={s.provAvatar}>
            <Text style={s.provInitials}>{prov.name.split(" ").map((w) => w[0]).join("").slice(0,2)}</Text>
          </View>
          <Text style={s.provName} numberOfLines={1}>{prov.name}</Text>
          <View style={s.provRow}>
            <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
            <Text style={s.provRating}>{prov.rating.toFixed(1)}</Text>
            {prov.distance_km != null && (
              <Text style={s.provDist}>{prov.distance_km < 1 ? `${Math.round(prov.distance_km * 1000)}م` : `${prov.distance_km.toFixed(1)} كم`}</Text>
            )}
          </View>
          <Text style={s.provRate}>{prov.rate || "—"} ر.س/ساعة</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderConfirmCard = (msg: ChatMessage, mode: "address" | "phone") => {
    const value = mode === "address" ? msg.address : msg.phone;
    if (!value) return null;
    return (
      <View style={s.confirmInline}>
        <View style={s.confirmInlineRow}>
          <Feather name={mode === "address" ? "map-pin" : "phone"} size={16} color="#7C3AED" />
          <Text style={s.confirmInlineT}>{value}</Text>
        </View>
        <View style={s.confirmInlineBtns}>
          <TouchableOpacity onPress={() => mode === "address" ? handleConfirmAddress(true, value) : handleConfirmPhone(true, value)} style={[s.confirmInlineBtn, { backgroundColor: "#7C3AED" }]}>
            <Text style={[s.confirmInlineBtnT, { color: "#FFF" }]}>نعم، استخدمه</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => mode === "address" ? handleConfirmAddress(false) : handleConfirmPhone(false)} style={[s.confirmInlineBtn, { backgroundColor: "#F1F5F9" }]}>
            <Text style={[s.confirmInlineBtnT, { color: "#0F172A" }]}>تغيير</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInvoice = (msg: ChatMessage) => {
    const svc = msg.service || selectedService;
    const prov = msg.provider || selectedProvider;
    const addr = msg.address || chosenAddress;
    const ph = msg.phone || chosenPhone;
    if (!svc || !prov) return null;
    const fee = 10;
    const subtotal = svc.price + fee;
    const vat = Math.round(subtotal * 0.15 * 100) / 100;
    const total = Math.round((subtotal + vat) * 100) / 100;

    return (
      <View style={s.invoiceCard}>
        <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.invoiceHeader}>
          <MaterialCommunityIcons name="receipt" size={22} color="#FFF" />
          <Text style={s.invoiceHeaderText}>فاتورة الحجز</Text>
        </LinearGradient>
        <View style={s.invoiceBody}>
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{svc.title}</Text><Text style={s.invoiceLabel}>الخدمة</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{prov.name}</Text><Text style={s.invoiceLabel}>المزود</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal} numberOfLines={2}>{addr}</Text><Text style={s.invoiceLabel}>العنوان</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{ph || "—"}</Text><Text style={s.invoiceLabel}>الهاتف</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>~{svc.duration} دقيقة</Text><Text style={s.invoiceLabel}>المدة</Text></View>
          <View style={[s.invoiceDivider, { borderStyle: "dashed" }]} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{svc.price} ر.س</Text><Text style={s.invoiceLabel}>سعر الخدمة</Text></View>
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{fee} ر.س</Text><Text style={s.invoiceLabel}>رسوم الخدمة</Text></View>
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{vat} ر.س</Text><Text style={s.invoiceLabel}>ضريبة (15%)</Text></View>
          <View style={[s.invoiceDivider, { borderColor: "#7C3AED" }]} />
          <View style={s.invoiceRow}><Text style={[s.invoiceVal, { fontFamily: "Tajawal_700Bold", color: "#7C3AED", fontSize: 18 }]}>{total} ر.س</Text><Text style={[s.invoiceLabel, { fontFamily: "Tajawal_700Bold" }]}>الإجمالي</Text></View>
        </View>
        {step === "invoice" && (
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

  const renderConfirmation = (msg: ChatMessage) => (
    <View style={s.confirmationCard}>
      <LinearGradient colors={["#16C47F", "#0EA968"]} style={s.confirmGrad}>
        <View style={s.confirmIconWrap}>
          <Feather name="check" size={36} color="#FFF" />
        </View>
        <Text style={s.confirmTitle}>تم تأكيد الحجز!</Text>
        <Text style={s.confirmSub}>رقم الطلب: #{msg.orderNumber || "CLN000000"}</Text>
      </LinearGradient>
      <TouchableOpacity style={s.newBookingBtn} activeOpacity={0.85} onPress={handleNewBooking}>
        <Text style={s.newBookingBtnText}>حجز خدمة جديدة</Text>
        <Feather name="plus-circle" size={16} color="#7C3AED" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Premium gradient header */}
      <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
            <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color="#FFF" />
          </TouchableOpacity>
          <Image source={AI_AVATAR_LIGHT} style={{ width: 44, height: 44, borderRadius: 22 }} />
          <View style={s.headerInfo}>
            <Text style={s.headerTitle}>المساعد الذكي ✨</Text>
            <Text style={s.headerSub}>متصل الآن • يفهم العربية والإنجليزية</Text>
          </View>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>AI</Text>
          </View>
        </View>
      </LinearGradient>

      {loadingMeta ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#7C3AED" />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
          <ScrollView ref={scrollRef} contentContainerStyle={s.messagesContent} showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {messages.map((msg) => (
              <View key={msg.id} style={msg.role === "bot" ? s.botMsgWrap : s.userMsgWrap}>
                {msg.role === "bot" && (
                  <Image source={AI_AVATAR_LIGHT} style={s.botAvatarSmall} />
                )}
                <View style={{ flex: 1, maxWidth: "92%" }}>
                  <View style={msg.role === "bot" ? s.botBubble : s.userBubble}>
                    <Text style={msg.role === "bot" ? s.botText : s.userText}>{msg.text}</Text>
                  </View>
                  {msg.cardType === "quick_actions" && <QuickActions />}
                  {msg.cardType === "services" && renderServiceGrid()}
                  {msg.cardType === "providers" && renderProviderCards()}
                  {msg.cardType === "address_confirm" && renderConfirmCard(msg, "address")}
                  {msg.cardType === "phone_confirm" && renderConfirmCard(msg, "phone")}
                  {msg.cardType === "invoice" && renderInvoice(msg)}
                  {msg.cardType === "confirmation" && renderConfirmation(msg)}
                </View>
              </View>
            ))}

            {typing && (
              <View style={s.botMsgWrap}>
                <Image source={AI_AVATAR_LIGHT} style={s.botAvatarSmall} />
                <View style={s.typingBubble}>
                  <Animated.View style={[s.typingDot, { opacity: typingAnim }]} />
                  <Animated.View style={[s.typingDot, { opacity: typingAnim, marginStart: 6 }]} />
                  <Animated.View style={[s.typingDot, { opacity: typingAnim, marginStart: 6 }]} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 12) + 60 }]}>
            <View style={s.inputRow}>
              <TouchableOpacity style={s.sendBtn} onPress={handleSendText} activeOpacity={0.85}>
                <Feather name="send" size={18} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.micBtn, voiceListening && { backgroundColor: "#EF4444" }]} onPress={onMicPress} activeOpacity={0.85}>
                <MaterialCommunityIcons name={voiceListening ? "microphone" : "microphone-outline"} size={20} color={voiceListening ? "#FFF" : "#7C3AED"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.micBtn, { backgroundColor: voiceLang === "en-US" ? "#3B82F6" : "#F1F5F9" }]}
                onPress={() => setVoiceLang((l) => l === "ar-SA" ? "en-US" : "ar-SA")}
                activeOpacity={0.85}
              >
                <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 11, color: voiceLang === "en-US" ? "#FFF" : "#64748B" }}>
                  {voiceLang === "ar-SA" ? "ع" : "EN"}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={s.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder={
                  step === "address" ? "اكتب العنوان..." :
                  step === "phone" ? "اكتب رقم الهاتف..." :
                  "اكتب رسالتك أو اضغط على المايك..."
                }
                placeholderTextColor="#94A3B8"
                textAlign="right"
                onSubmitEditing={handleSendText}
                returnKeyType="send"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  botAvatarHeader: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1, alignItems: "flex-end" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#FFF" },
  headerSub: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  headerBadgeText: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#FFF" },

  messagesContent: { padding: 16, paddingBottom: 20, gap: 12 },
  botMsgWrap: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  userMsgWrap: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  botAvatarSmall: { width: 28, height: 28, borderRadius: 14, marginTop: 4 },
  botBubble: { backgroundColor: "#F1F5F9", borderRadius: 18, borderTopStartRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: "#7C3AED", borderRadius: 18, borderTopEndRadius: 4, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "flex-end" },
  botText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#0F172A", lineHeight: 22 },
  userText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#FFF", lineHeight: 22 },

  typingBubble: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#94A3B8" },

  // Quick action chips
  qaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  qaChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#EDE9FE", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  qaChipT: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#7C3AED" },

  // Service grid
  svcGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  svcCardGrid: { width: "31%", borderRadius: 16, padding: 10, alignItems: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  svcIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  svcCardTitle: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#0F172A", textAlign: "center", marginBottom: 4 },
  svcCardPrice: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  svcCardDur: { fontFamily: "Tajawal_400Regular", fontSize: 9, color: "#64748B", marginTop: 2 },

  // Provider cards (horizontal)
  provCard: { width: 150, backgroundColor: "#FFF", borderRadius: 18, padding: 14, alignItems: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  provAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  provInitials: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#7C3AED" },
  provName: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A", marginBottom: 4 },
  provRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  provRating: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#0F172A" },
  provDist: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#64748B" },
  provRate: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#7C3AED" },

  // Confirm address/phone inline
  confirmInline: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, marginTop: 8, gap: 10 },
  confirmInlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  confirmInlineT: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A", flex: 1 },
  confirmInlineBtns: { flexDirection: "row", gap: 8 },
  confirmInlineBtn: { flex: 1, paddingVertical: 10, borderRadius: 100, alignItems: "center" },
  confirmInlineBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  invoiceCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  invoiceHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  invoiceHeaderText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  invoiceBody: { padding: 16, gap: 10 },
  invoiceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invoiceLabel: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#64748B" },
  invoiceVal: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, color: "#0F172A", maxWidth: "60%" },
  invoiceDivider: { borderBottomWidth: 1, borderColor: "#F1F5F9" },
  invoiceActions: { padding: 16, paddingTop: 0 },
  confirmBtn: { backgroundColor: "#7C3AED", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF" },

  confirmationCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  confirmGrad: { padding: 24, alignItems: "center", gap: 8 },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  confirmTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#FFF" },
  confirmSub: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "rgba(255,255,255,0.9)" },
  newBookingBtn: { padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  newBookingBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#7C3AED" },

  inputBar: { paddingHorizontal: 12, paddingTop: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF", borderRadius: 100, paddingHorizontal: 8, paddingVertical: 6, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  textInput: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#0F172A", paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
});
