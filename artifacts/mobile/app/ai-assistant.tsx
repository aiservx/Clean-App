import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Animated, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, Image, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import FloatingTabBar from "@/components/FloatingTabBar";

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
type CardType =
  | "services"
  | "providers"
  | "invoice"
  | "confirmation"
  | "address_confirm"
  | "phone_confirm"
  | "quick_actions"
  | "tracking_card"
  | "invoice_card"
  | null;

type TrackingData = {
  bookingId: string;
  status: string;
  serviceName: string;
  providerName: string;
  total: number;
  scheduledAt: string | null;
  createdAt: string;
  statusLog: { status: string; created_at: string }[];
};

type InvoiceData = {
  bookingId: string;
  serviceName: string;
  total: number;
  basePrice: number;
  fee: number;
  vat: number;
  status: string;
  createdAt: string;
  paymentMethod: string | null;
  providerName: string;
};

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
  bookingId?: string;
  trackingData?: TrackingData;
  invoiceData?: InvoiceData;
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
  | "qa";

let msgId = 0;
const nextId = () => `msg-${++msgId}`;

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_AR: Record<string, string> = {
  pending:     "قيد الانتظار",
  accepted:    "مقبول",
  on_the_way:  "في الطريق",
  in_progress: "جاري التنفيذ",
  completed:   "مكتمل",
  cancelled:   "ملغي",
};
const STATUS_COLOR: Record<string, string> = {
  pending:     "#F59E0B",
  accepted:    "#3B82F6",
  on_the_way:  "#8B5CF6",
  in_progress: "#2F80ED",
  completed:   "#16C47F",
  cancelled:   "#EF4444",
};
const PAYMENT_AR: Record<string, string> = {
  card: "بطاقة ائتمانية", mada: "مدى", apple: "Apple Pay",
  stcpay: "STC Pay", tamara: "تمارا", cash: "نقداً",
};
const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

// ── Lightweight rule-based AI ──────────────────────────────────────────────
function answerFromKb(text: string, ctx: { hasOpenBooking: boolean }): string | null {
  const t = text.toLowerCase().trim();
  const promoAns = findPromotionAnswer(text);
  if (promoAns) return promoAns;

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
      ? "جاري جلب آخر تحديث لطلبك..."
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
    return "جاري جلب آخر فاتورة لديك...";
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

// Web SpeechRecognition helper
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

  const savedPhone = profile?.phone || "";
  const [defaultAddress, setDefaultAddress] = useState<{ text: string; lat: number | null; lng: number | null } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<ResolvedAddress | null>(null);

  // Load services + providers + address + open-booking flag
  useEffect(() => {
    if (!session?.user) { setLoadingMeta(false); return; }
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
          setDefaultAddress({ text: [a.street, a.district, a.city].filter(Boolean).join("، ") || a.title || "العنوان المحفوظ", lat: a.lat ?? null, lng: a.lng ?? null });
        }
        if (me) setCurrentAddress(me);

        const PRIORITY: Record<string, number> = {
          "منازل": 1, "شقق": 2, "كنب": 3, "سجاد": 4, "مكيفات": 5,
          "فلل": 6, "مطابخ": 7, "خزانات": 8, "تعقيم": 9, "واجهات": 10,
        };
        const svcPriority = (title: string) => {
          for (const [kw, rank] of Object.entries(PRIORITY)) { if (title.includes(kw)) return rank; }
          return 99;
        };
        const mappedSvc: ServiceItem[] = (svcRes.data ?? [])
          .map((s: any) => ({ id: s.id, title: s.title_ar || "خدمة", desc: s.desc_ar || "", price: Number(s.base_price || 0), duration: Number(s.duration_min || 120) }))
          .sort((a, b) => svcPriority(a.title) - svcPriority(b.title));
        setServices(mappedSvc);

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
          return { id: p.id, name: p.profiles?.full_name || "فني", rating: Number(p.rating || 4.7), distance_km: d, exp: Number(p.experience_years || 0), rate: Number(p.hourly_rate || 40) };
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

  // Welcome on mount
  useEffect(() => {
    if (loadingMeta) return;
    const name = profile?.full_name?.split(" ")[0] || "";
    const greeting = name
      ? `مرحباً ${name} مني! 👋\nأنا مساعدك الذكي في نظافة. واقدر أساعدك في ⬇️`
      : "مرحباً مني! 👋\nأنا مساعدك الذكي في نظافة. واقدر أساعدك في ⬇️";
    addBotMessage(greeting, "quick_actions");
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: nextId(), role: "bot",
        text: services.length ? "اختار الخدمة" : "لا توجد خدمات متاحة الآن، حاول لاحقاً.",
        cardType: services.length ? "services" : null,
      }]);
      setStep("services");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMeta]);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <GuestEmpty title="المساعد الذكي" subtitle="سجّل دخولك للتحدث مع المساعد الذكي" icon="robot-happy-outline" />
      </View>
    );
  }

  // ── Real-data fetchers ───────────────────────────────────────────────────

  const fetchActiveTracking = async (): Promise<TrackingData | null> => {
    if (!session?.user) return null;
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, status, total, scheduled_at, created_at, payment_method, services:service_id(title_ar), provider:profiles!bookings_provider_id_fkey(full_name)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!booking) return null;
      const b = booking as any;
      const { data: logs } = await supabase
        .from("booking_status_log")
        .select("status, created_at")
        .eq("booking_id", b.id)
        .order("created_at");
      return {
        bookingId: b.id,
        status: b.status,
        serviceName: b.services?.title_ar || "خدمة تنظيف",
        providerName: b.provider?.full_name || "فني",
        total: Number(b.total || 0),
        scheduledAt: b.scheduled_at,
        createdAt: b.created_at,
        statusLog: (logs ?? []) as any[],
      };
    } catch { return null; }
  };

  const fetchLatestInvoice = async (): Promise<InvoiceData | null> => {
    if (!session?.user) return null;
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, status, total, created_at, payment_method, services:service_id(title_ar, base_price), provider:profiles!bookings_provider_id_fkey(full_name)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!booking) return null;
      const b = booking as any;
      const basePrice = Number(b.services?.base_price || 0);
      const fee = 10;
      const vat = Math.round((basePrice + fee) * 0.15 * 100) / 100;
      const total = Number(b.total || (basePrice + fee + vat));
      return {
        bookingId: b.id,
        serviceName: b.services?.title_ar || "خدمة تنظيف",
        total,
        basePrice,
        fee,
        vat,
        status: b.status,
        createdAt: b.created_at,
        paymentMethod: b.payment_method,
        providerName: b.provider?.full_name || "فني",
      };
    } catch { return null; }
  };

  const pushTrackingCard = async () => {
    setTyping(true);
    const td = await fetchActiveTracking();
    setTimeout(() => {
      setTyping(false);
      if (td) {
        setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: "آخر تحديث لطلبك:", cardType: "tracking_card", trackingData: td }]);
      } else {
        setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: "لم أجد أي طلبات. اختر خدمة لإنشاء طلب جديد." }]);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  const pushInvoiceCard = async () => {
    setTyping(true);
    const inv = await fetchLatestInvoice();
    setTimeout(() => {
      setTyping(false);
      if (inv) {
        setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: "آخر فاتورة لديك:", cardType: "invoice_card", invoiceData: inv }]);
      } else {
        setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: "لم أجد فواتير حتى الآن. أكمل طلباً أولاً." }]);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  // ── Booking flow ─────────────────────────────────────────────────────────

  const handleSelectService = (svc: ServiceItem) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    addUserMessage(svc.title);
    setSelectedService(svc);
    setStep("service_selected");
    setTimeout(() => {
      addBotMessage(`اختيار ممتاز! 🎯\n\n📌 ${svc.title}\n💰 السعر: ${svc.price} ر.س\n⏱ المدة: ~${svc.duration} دقيقة\n\nاختر الفنّي الذي يناسبك:`, "providers");
      setStep("providers");
    }, 200);
  };

  const handleSelectProvider = (prov: ProviderItem) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    addUserMessage(`اخترت ${prov.name}`);
    setSelectedProvider(prov);
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
      // Intent: tracking
      if (/(اين طلبي|أين طلبي|حالة الطلب|تتبع)/i.test(text)) {
        pushTrackingCard();
        return;
      }
      // Intent: invoice
      if (/(فاتورة|فواتير|invoice|إيصال|بيل)/i.test(text)) {
        pushInvoiceCard();
        return;
      }
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
          ? "تم إرسال الطلب! 🎊 سنتواصل معك خلال دقائق لتأكيد الموعد."
          : "تم استلام الطلب — سيتواصل معك الفريق قريباً.",
        cardType: "confirmation",
        orderNumber: orderNum,
        bookingId: bookingId ?? undefined,
      }]);
      setHasOpenBooking(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: "اختار الخدمة", cardType: "services" }]);
      setStep("services");
    }, 800);
  };

  // ── Voice input ──────────────────────────────────────────────────────────

  const startVoiceWeb = () => {
    const SR = getWebSpeechRecognition();
    if (!SR) { Alert.alert("غير مدعوم", "متصفّحك لا يدعم الإدخال الصوتي. حاول من Chrome."); return; }
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
    } catch (e) { Alert.alert("خطأ", (e as Error).message); setVoiceListening(false); }
  };

  const stopVoiceWeb = () => { try { recognitionRef.current?.stop?.(); } catch {} setVoiceListening(false); };

  const onMicPress = () => {
    if (Platform.OS === "web") {
      voiceListening ? stopVoiceWeb() : startVoiceWeb();
    } else {
      Alert.alert("الإدخال الصوتي", "متاح حالياً على نسخة الويب. ضمن تطبيق الجوال سيتم تفعيله في تحديث قريب.");
    }
  };

  // ── Renderers ─────────────────────────────────────────────────────────────

  const QuickActions = () => (
    <View style={s.qaWrap}>
      {[
        {
          id: "promos", label: "العروض والكوبونات", icon: "tag",
          onPress: () => { addUserMessage("ما هي العروض والكوبونات الفعّالة؟"); const a = answerFromKb("عروض وكوبونات", { hasOpenBooking }); a && addBotMessage(a); },
        },
        {
          id: "refer", label: "دعوة صديق", icon: "user-plus",
          onPress: () => { addUserMessage("نظام دعوة الأصدقاء"); const a = answerFromKb("دعوة صديق", { hasOpenBooking }); a && addBotMessage(a); setTimeout(() => router.push("/referrals"), 1500); },
        },
        {
          id: "track", label: "تتبع طلبي", icon: "navigation-2",
          onPress: () => { addUserMessage("تتبع طلبي"); pushTrackingCard(); },
        },
        {
          id: "refund", label: "استرداد المبلغ", icon: "rotate-ccw",
          onPress: () => { addUserMessage("استرداد المبلغ"); const a = answerFromKb("استرداد", { hasOpenBooking }); a && addBotMessage(a); },
        },
        {
          id: "support", label: "دعم", icon: "headphones",
          onPress: () => { addUserMessage("التواصل مع الدعم"); const a = answerFromKb("دعم", { hasOpenBooking }); a && addBotMessage(a); },
        },
        {
          id: "invoice", label: "فاتورتي", icon: "file-text",
          onPress: () => { addUserMessage("فاتورتي"); pushInvoiceCard(); },
        },
      ].map((q) => (
        <TouchableOpacity key={q.id} style={[s.qaChip, { backgroundColor: colors.card, borderColor: colors.primaryLight }]} activeOpacity={0.85} onPress={q.onPress}>
          <Feather name={q.icon as any} size={13} color="#7C3AED" />
          <Text style={s.qaChipT}>{q.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderServiceGrid = () => (
    <View style={s.svcGrid}>
      {services.length === 0 ? (
        <View style={[s.svcCardGrid, { alignItems: "center", justifyContent: "center", height: 100, backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.mutedForeground }}>لا توجد خدمات الآن</Text>
        </View>
      ) : services.map((svc) => {
        const ico = iconForService(svc.title);
        const col = colorForService(svc.title);
        return (
          <TouchableOpacity key={svc.id} style={[s.svcCardGrid, { backgroundColor: colors.card }]} activeOpacity={0.85} onPress={() => handleSelectService(svc)}>
            <View style={[s.svcIconBox, { backgroundColor: col + "22" }]}>
              <MaterialCommunityIcons name={ico as any} size={28} color={col} />
            </View>
            <Text style={[s.svcCardTitle, { color: colors.foreground }]} numberOfLines={2}>{svc.title}</Text>
            <Text style={[s.svcCardPrice, { color: col }]}>{svc.price} ر.س</Text>
            <Text style={[s.svcCardDur, { color: colors.mutedForeground }]}>⏱ ~{svc.duration} د</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderProviderCards = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      {providers.length === 0 ? (
        <View style={[s.provCard, { alignItems: "center", backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.mutedForeground }}>لا يوجد فنيون متاحون الآن</Text>
          <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 10, color: colors.mutedForeground, marginTop: 4 }}>سيتم تخصيص أقرب فنّي تلقائياً</Text>
          <TouchableOpacity style={[s.confirmBtn, { marginTop: 10 }]} onPress={() => handleSelectProvider({ id: "auto", name: "أقرب فنّي", rating: 4.8, distance_km: null, exp: 0, rate: 0 })}>
            <Text style={s.confirmBtnText}>تخصيص تلقائي</Text>
          </TouchableOpacity>
        </View>
      ) : providers.map((prov) => (
        <TouchableOpacity key={prov.id} style={[s.provCard, { backgroundColor: colors.card }]} activeOpacity={0.85} onPress={() => handleSelectProvider(prov)}>
          <View style={s.provAvatar}>
            <Text style={s.provInitials}>{prov.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</Text>
          </View>
          <Text style={[s.provName, { color: colors.foreground }]} numberOfLines={1}>{prov.name}</Text>
          <View style={s.provRow}>
            <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
            <Text style={[s.provRating, { color: colors.foreground }]}>{prov.rating.toFixed(1)}</Text>
            {prov.distance_km != null && (
              <Text style={[s.provDist, { color: colors.mutedForeground }]}>{prov.distance_km < 1 ? `${Math.round(prov.distance_km * 1000)}م` : `${prov.distance_km.toFixed(1)} كم`}</Text>
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

  // ── Rich confirmation card with prominent Track Order button ─────────────
  const renderConfirmation = (msg: ChatMessage) => (
    <View style={s.confirmationCard}>
      <LinearGradient colors={["#16C47F", "#0EA968"]} style={s.confirmGrad}>
        <View style={s.confirmIconWrap}>
          <Feather name="check" size={36} color="#FFF" />
        </View>
        <Text style={s.confirmTitle}>تم تأكيد الحجز! 🎉</Text>
        <Text style={s.confirmSub}>رقم الطلب: #{msg.orderNumber || "CLN000000"}</Text>
        <Text style={[s.confirmSub, { marginTop: 2, opacity: 0.8 }]}>سنتواصل معك خلال دقائق</Text>
      </LinearGradient>

      {msg.bookingId && (
        <TouchableOpacity
          style={s.trackOrderBtn}
          activeOpacity={0.88}
          onPress={() => router.push({ pathname: "/tracking", params: { id: msg.bookingId } } as any)}
        >
          <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.trackOrderGrad}>
            <MaterialCommunityIcons name="radar" size={18} color="#FFF" />
            <Text style={s.trackOrderBtnText}>تتبع الطلب مباشرة</Text>
            <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={16} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.newBookingBtn} activeOpacity={0.85} onPress={handleNewBooking}>
        <Text style={s.newBookingBtnText}>حجز خدمة جديدة</Text>
        <Feather name="plus-circle" size={16} color="#7C3AED" />
      </TouchableOpacity>
    </View>
  );

  // ── Rich live tracking card ───────────────────────────────────────────────
  const renderTrackingCard = (td: TrackingData) => {
    const statusColor = STATUS_COLOR[td.status] ?? "#94A3B8";
    const statusAr = STATUS_AR[td.status] ?? td.status;
    const TIMELINE_STEPS = ["pending", "accepted", "on_the_way", "in_progress", "completed"];
    const currentIdx = TIMELINE_STEPS.indexOf(td.status);

    return (
      <View style={s.trackCard}>
        {/* Header */}
        <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.trackCardHeader}>
          <MaterialCommunityIcons name="radar" size={20} color="#7C3AED" />
          <View style={{ flex: 1 }}>
            <Text style={s.trackCardService}>{td.serviceName}</Text>
            <Text style={s.trackCardSub}>#{td.bookingId.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={[s.trackStatusBadge, { backgroundColor: statusColor }]}>
            <Text style={s.trackStatusBadgeT}>{statusAr}</Text>
          </View>
        </LinearGradient>

        {/* Progress bar */}
        <View style={s.trackProgressWrap}>
          {TIMELINE_STEPS.slice(0, -1).map((st, i) => {
            const done = i <= currentIdx;
            const labels: Record<string, string> = { pending: "انتظار", accepted: "قبول", on_the_way: "في الطريق", in_progress: "تنفيذ" };
            return (
              <View key={st} style={{ alignItems: "center", flex: 1 }}>
                <View style={[s.trackProgressDot, { backgroundColor: done ? statusColor : "#E2E8F0", borderColor: done ? statusColor : "#CBD5E1" }]}>
                  {done && <Feather name="check" size={8} color="#FFF" />}
                </View>
                <Text style={[s.trackProgressLabel, { color: done ? "#0F172A" : "#94A3B8" }]}>{labels[st]}</Text>
                {i < 3 && <View style={[s.trackProgressLine, { backgroundColor: i < currentIdx ? statusColor : "#E2E8F0" }]} />}
              </View>
            );
          })}
        </View>

        {/* Provider & info */}
        <View style={s.trackCardBody}>
          <View style={s.trackInfoRow}>
            <View style={s.trackProvAvatar}>
              <Text style={s.trackProvInitials}>{td.providerName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.trackProvName}>{td.providerName}</Text>
              <Text style={s.trackProvSub}>الفنّي المكلّف</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.trackTotal}>{td.total.toFixed(2)} ر.س</Text>
              <Text style={s.trackTotalSub}>الإجمالي</Text>
            </View>
          </View>

          {td.scheduledAt && (
            <View style={s.trackScheduleRow}>
              <Feather name="calendar" size={13} color="#7C3AED" />
              <Text style={s.trackScheduleT}>{fmtDate(td.scheduledAt)}</Text>
            </View>
          )}

          {/* Status log timeline */}
          {td.statusLog.length > 0 && (
            <View style={s.trackLog}>
              <Text style={s.trackLogTitle}>سجل الحالات</Text>
              {td.statusLog.slice(-4).reverse().map((entry: any, i: number) => (
                <View key={i} style={s.trackLogItem}>
                  <View style={[s.trackLogDot, { backgroundColor: STATUS_COLOR[entry.status] ?? "#94A3B8" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.trackLogStatus}>{STATUS_AR[entry.status] ?? entry.status}</Text>
                    <Text style={s.trackLogDate}>{fmtDate(entry.created_at)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Open tracking screen button */}
        <TouchableOpacity
          style={s.trackOpenBtn}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: "/tracking", params: { id: td.bookingId } } as any)}
        >
          <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.trackOpenGrad}>
            <MaterialCommunityIcons name="map-marker-radius" size={16} color="#FFF" />
            <Text style={s.trackOpenT}>فتح شاشة التتبع الكاملة</Text>
            <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={14} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Rich invoice detail card (for existing bookings) ─────────────────────
  const renderInvoiceDetail = (inv: InvoiceData) => {
    const statusColor = STATUS_COLOR[inv.status] ?? "#94A3B8";
    const statusAr = STATUS_AR[inv.status] ?? inv.status;
    return (
      <View style={s.invDetailCard}>
        <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.invDetailHeader}>
          <MaterialCommunityIcons name="receipt" size={20} color="#FFF" />
          <Text style={s.invDetailHeaderT}>فاتورتك الأخيرة</Text>
          <View style={[s.invDetailBadge, { backgroundColor: statusColor }]}>
            <Text style={s.invDetailBadgeT}>{statusAr}</Text>
          </View>
        </LinearGradient>
        <View style={s.invoiceBody}>
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{inv.serviceName}</Text><Text style={s.invoiceLabel}>الخدمة</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{inv.providerName}</Text><Text style={s.invoiceLabel}>الفنّي</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{fmtDate(inv.createdAt)}</Text><Text style={s.invoiceLabel}>تاريخ الطلب</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{PAYMENT_AR[inv.paymentMethod ?? ""] || inv.paymentMethod || "—"}</Text><Text style={s.invoiceLabel}>طريقة الدفع</Text></View>
          <View style={[s.invoiceDivider, { borderStyle: "dashed" }]} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{inv.basePrice} ر.س</Text><Text style={s.invoiceLabel}>سعر الخدمة</Text></View>
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{inv.fee} ر.س</Text><Text style={s.invoiceLabel}>رسوم الخدمة</Text></View>
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{inv.vat} ر.س</Text><Text style={s.invoiceLabel}>ضريبة (15%)</Text></View>
          <View style={[s.invoiceDivider, { borderColor: "#7C3AED" }]} />
          <View style={s.invoiceRow}>
            <Text style={[s.invoiceVal, { fontFamily: "Tajawal_700Bold", color: "#7C3AED", fontSize: 18 }]}>{inv.total.toFixed(2)} ر.س</Text>
            <Text style={[s.invoiceLabel, { fontFamily: "Tajawal_700Bold" }]}>الإجمالي</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.trackOpenBtn]}
          activeOpacity={0.85}
          onPress={() => router.push("/(tabs)/bookings")}
        >
          <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={s.trackOpenGrad}>
            <Feather name="list" size={14} color="#FFF" />
            <Text style={s.trackOpenT}>عرض كل الطلبات</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
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
                  <View style={[msg.role === "bot" ? s.botBubble : s.userBubble, msg.role === "bot" && { backgroundColor: colors.card }]}>
                    <Text style={[msg.role === "bot" ? s.botText : s.userText, msg.role === "bot" && { color: colors.foreground }]}>{msg.text}</Text>
                  </View>
                  {msg.cardType === "quick_actions" && <QuickActions />}
                  {msg.cardType === "services" && renderServiceGrid()}
                  {msg.cardType === "providers" && renderProviderCards()}
                  {msg.cardType === "address_confirm" && renderConfirmCard(msg, "address")}
                  {msg.cardType === "phone_confirm" && renderConfirmCard(msg, "phone")}
                  {msg.cardType === "invoice" && renderInvoice(msg)}
                  {msg.cardType === "confirmation" && renderConfirmation(msg)}
                  {msg.cardType === "tracking_card" && msg.trackingData && renderTrackingCard(msg.trackingData)}
                  {msg.cardType === "invoice_card" && msg.invoiceData && renderInvoiceDetail(msg.invoiceData)}
                </View>
              </View>
            ))}

            {typing && (
              <View style={s.botMsgWrap}>
                <Image source={AI_AVATAR_LIGHT} style={s.botAvatarSmall} />
                <View style={[s.typingBubble, { backgroundColor: colors.card }]}>
                  <Animated.View style={[s.typingDot, { opacity: typingAnim, backgroundColor: colors.mutedForeground }]} />
                  <Animated.View style={[s.typingDot, { opacity: typingAnim, backgroundColor: colors.mutedForeground, marginStart: 6 }]} />
                  <Animated.View style={[s.typingDot, { opacity: typingAnim, backgroundColor: colors.mutedForeground, marginStart: 6 }]} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 8) + 4, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border ?? "#E2E8F0" }]}>
            <View style={[s.inputRow, { backgroundColor: colors.card }]}>
              <TouchableOpacity style={s.sendBtn} onPress={handleSendText} activeOpacity={0.85}>
                <Feather name="send" size={18} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.micBtn, voiceListening && { backgroundColor: "#EF4444" }, { backgroundColor: voiceListening ? "#EF4444" : colors.primaryLight ?? "#EDE9FE" }]} onPress={onMicPress} activeOpacity={0.85}>
                <MaterialCommunityIcons name={voiceListening ? "microphone" : "microphone-outline"} size={20} color={voiceListening ? "#FFF" : "#7C3AED"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.micBtn, { backgroundColor: voiceLang === "en-US" ? "#3B82F6" : colors.card }]}
                onPress={() => setVoiceLang((l) => l === "ar-SA" ? "en-US" : "ar-SA")}
                activeOpacity={0.85}
              >
                <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 11, color: voiceLang === "en-US" ? "#FFF" : colors.mutedForeground }}>
                  {voiceLang === "ar-SA" ? "ع" : "EN"}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[s.textInput, { color: colors.foreground }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={
                  step === "address" ? "اكتب العنوان..." :
                  step === "phone" ? "اكتب رقم الهاتف..." :
                  "اكتب رسالتك أو اضغط على المايك..."
                }
                placeholderTextColor={colors.mutedForeground ?? "#94A3B8"}
                onSubmitEditing={handleSendText}
                returnKeyType="send"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      <FloatingTabBar active="chat" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
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

  qaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  qaChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#EDE9FE", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  qaChipT: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#7C3AED" },

  svcGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  svcCardGrid: { width: "31%", borderRadius: 16, padding: 10, alignItems: "center" },
  svcIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  svcCardTitle: { fontFamily: "Tajawal_700Bold", fontSize: 11, textAlign: "center", marginBottom: 4 },
  svcCardPrice: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  svcCardDur: { fontFamily: "Tajawal_400Regular", fontSize: 9, marginTop: 2 },

  provCard: { width: 150, borderRadius: 18, padding: 14, alignItems: "center" },
  provAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  provInitials: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#7C3AED" },
  provName: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 4 },
  provRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  provRating: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  provDist: { fontFamily: "Tajawal_400Regular", fontSize: 10 },
  provRate: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#7C3AED" },

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

  // Confirmation card (booking success)
  confirmationCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  confirmGrad: { padding: 28, alignItems: "center", gap: 8 },
  confirmIconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  confirmTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#FFF" },
  confirmSub: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "rgba(255,255,255,0.9)" },

  // Primary "Track Order" button inside confirmation card
  trackOrderBtn: { marginHorizontal: 12, marginTop: 14, borderRadius: 16, overflow: "hidden" },
  trackOrderGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, paddingHorizontal: 20 },
  trackOrderBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFF", flex: 1, textAlign: "center" },

  newBookingBtn: { padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  newBookingBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#7C3AED" },

  // Live tracking card
  trackCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4 },
  trackCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  trackCardService: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF" },
  trackCardSub: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  trackStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  trackStatusBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 10, color: "#FFF" },

  // Progress steps
  trackProgressWrap: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 14, position: "relative" },
  trackProgressDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  trackProgressLabel: { fontFamily: "Tajawal_500Medium", fontSize: 9, marginTop: 4, textAlign: "center" },
  trackProgressLine: { position: "absolute", top: 23, width: "100%", height: 2, zIndex: -1 },

  // Tracking body
  trackCardBody: { padding: 14, gap: 10 },
  trackInfoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  trackProvAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
  trackProvInitials: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#7C3AED" },
  trackProvName: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A" },
  trackProvSub: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#94A3B8", marginTop: 2 },
  trackTotal: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#7C3AED" },
  trackTotalSub: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#94A3B8", marginTop: 2, textAlign: "right" },
  trackScheduleRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F8FAFC", borderRadius: 10, padding: 8 },
  trackScheduleT: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#475569" },

  // Status log
  trackLog: { gap: 6, marginTop: 4 },
  trackLogTitle: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#94A3B8", marginBottom: 4 },
  trackLogItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  trackLogDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  trackLogStatus: { fontFamily: "Tajawal_600SemiBold", fontSize: 12, color: "#0F172A" },
  trackLogDate: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#94A3B8" },

  // Open tracking btn
  trackOpenBtn: { marginHorizontal: 12, marginBottom: 12, marginTop: 4, borderRadius: 14, overflow: "hidden" },
  trackOpenGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  trackOpenT: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#FFF" },

  // Invoice detail card
  invDetailCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  invDetailHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  invDetailHeaderT: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF", flex: 1 },
  invDetailBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  invDetailBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 10, color: "#FFF" },

  inputBar: { paddingHorizontal: 12, paddingTop: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF", borderRadius: 100, paddingHorizontal: 8, paddingVertical: 6, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  textInput: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#0F172A", paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
});
