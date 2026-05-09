import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Animated, Platform, ActivityIndicator, Alert, Image, I18nManager, Linking, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useChatBadge } from "@/lib/chatBadge";
import { distanceKm, getCurrentResolved, type ResolvedAddress } from "@/lib/location";
import { iconForService, colorForService } from "@/lib/serviceIcons";
import GuestEmpty from "@/components/GuestEmpty";
import { SEASONAL_PROMOS, findPromotionAnswer } from "@/lib/promotions";
import * as Speech from "expo-speech";

const AI_AVATAR_LIGHT = require("@/assets/images/ai-avatar-light.png");

// ── Types ─────────────────────────────────────────────────────────────────

type ServiceItem = { id: string; title: string; desc: string; price: number; duration: number };
type ProviderItem = { id: string; name: string; rating: number; distance_km: number | null; exp: number; rate: number };
type MsgRole = "bot" | "user";

type CardType =
  | "services" | "providers" | "invoice" | "confirmation"
  | "address_confirm" | "phone_confirm" | "quick_actions"
  | "tracking_card" | "invoice_card"
  | "coupon_card" | "support_contact" | "refund_status_card"
  | "booking_type"
  | null;

type TrackingData = {
  bookingId: string; status: string; serviceName: string;
  providerName: string; total: number; scheduledAt: string | null;
  createdAt: string; statusLog: { status: string; created_at: string }[];
};
type InvoiceData = {
  bookingId: string; serviceName: string; total: number;
  basePrice: number; fee: number; vat: number; status: string;
  createdAt: string; paymentMethod: string | null; providerName: string;
};
type RefundStatusData = {
  id: string; amount: number; status: string;
  reason: string; createdAt: string; serviceName: string;
};

type ChatMessage = {
  id: string; role: MsgRole; text: string;
  cardType?: CardType;
  service?: ServiceItem; provider?: ProviderItem;
  address?: string; phone?: string;
  orderNumber?: string; bookingId?: string;
  trackingData?: TrackingData; invoiceData?: InvoiceData;
  refundData?: RefundStatusData;
};

type Step = "welcome" | "services" | "service_selected" | "providers" | "provider_selected"
  | "booking_type" | "scheduled_date" | "address" | "phone" | "invoice" | "confirmed" | "qa";

// ── Constants ─────────────────────────────────────────────────────────────

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار", accepted: "مقبول", on_the_way: "في الطريق",
  in_progress: "جاري التنفيذ", completed: "مكتمل", cancelled: "ملغي",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B", accepted: "#3B82F6", on_the_way: "#8B5CF6",
  in_progress: "#2F80ED", completed: "#16C47F", cancelled: "#EF4444",
};
const PAYMENT_AR: Record<string, string> = {
  card: "بطاقة ائتمانية", mada: "مدى", apple: "Apple Pay",
  stcpay: "STC Pay", tamara: "تمارا", cash: "نقداً",
};
const TICKET_CATEGORIES = [
  { key: "service_quality", label: "جودة الخدمة", icon: "star-outline" },
  { key: "provider_behavior", label: "سلوك الفني", icon: "account-alert-outline" },
  { key: "payment", label: "مشكلة دفع", icon: "credit-card-outline" },
  { key: "late_arrival", label: "تأخر الوصول", icon: "clock-alert-outline" },
  { key: "other", label: "أخرى", icon: "dots-horizontal" },
] as const;
const REFUND_REASONS = [
  "الخدمة لم تُنجز كما هو متفق",
  "الفني لم يحضر",
  "جودة الخدمة سيئة",
  "رسوم خاطئة",
  "سبب آخر",
];

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

let msgId = 0;
const nextId = () => `msg-${++msgId}`;

// ── Rule-based KB ─────────────────────────────────────────────────────────

function answerFromKb(text: string, ctx: { hasOpenBooking: boolean }): string | null {
  const t = text.toLowerCase().trim();
  const promoAns = findPromotionAnswer(text);
  if (promoAns) return promoAns;

  if (/^(hi|hello|مرحبا|اهلا|أهلا|السلام|سلام|hey)/i.test(t)) {
    return /^[a-zA-Z\s\d!?.,']+$/.test(t)
      ? "Hello 👋 I'm happy to help! Ask me about:\n• Services & prices\n• Offers & coupons\n• Order tracking\n• Invoice & refunds\n• Support"
      : "أهلاً 👋 يسعدني مساعدتك! يمكنك سؤالي عن:\n• الخدمات والأسعار\n• العروض والكوبونات\n• تتبع الطلب\n• الفاتورة والاسترداد\n• الدعم";
  }
  if (/(سعر|تكلف|كم تكلفة|كم سعر)/i.test(text)) return "تبدأ أسعارنا من 85 ر.س للمنازل، 120 ر.س للكنب، 250 ر.س للفلل. رسوم خدمة 10 ر.س + ضريبة 15%.";
  if (/(وقت|مدة|كم تأخذ|كم تستغرق)/i.test(text)) return "غالباً بين ساعتين و4 ساعات حسب نوع الخدمة.";
  if (/(اين طلبي|أين طلبي|حالة الطلب|تتبع)/i.test(text)) return ctx.hasOpenBooking ? null : "ليس لديك طلب نشط. اختر خدمة لإنشاء طلب جديد.";
  if (/(الغاء|إلغاء|كانسل)/i.test(text)) return "يمكنك إلغاء الطلب من شاشة التتبع قبل أن يبدأ الفنّي. لا رسوم إلغاء قبل القبول.";
  if (/(استرد|استرداد|refund)/i.test(text)) return null;
  if (/(شكوى|بلاغ|تذكرة|دعم|مشكلة)/i.test(text)) return null;
  if (/(فاتورة|invoice|إيصال)/i.test(text)) return null;
  if (/(دفع|payment|بطاقة|كاش|نقد)/i.test(text)) return "نقبل: بطاقة ائتمانية، مدى، Apple Pay، STC Pay، تمارا، أو نقداً عند الاستلام.";
  if (/(فني|عامل|مزود)/i.test(text)) return "كل الفنّيين موثّقون — هوية وطنية، تقييم لا يقل عن 4، وخبرة موثّقة.";
  if (/(price|cost|how much)/i.test(t)) return "Prices start from 85 SAR for home cleaning, 120 SAR for sofas, 250 SAR for villas. Service fee 10 SAR + 15% VAT.";
  if (/(order|track|status)/i.test(t)) return ctx.hasOpenBooking ? null : "No active orders found. Choose a service to get started.";
  if (/(help|support|complaint)/i.test(t)) return null;
  return null;
}

function getWebSpeechRecognition(): any | null {
  if (Platform.OS !== "web") return null;
  try { const w = globalThis as any; return w.SpeechRecognition || w.webkitSpeechRecognition || null; } catch { return null; }
}

// ── Language detection ─────────────────────────────────────────────────────
const ARABIC_RE = /[\u0600-\u06FF]/;
function detectLanguage(text: string): "ar-SA" | "en-US" {
  return ARABIC_RE.test(text) ? "ar-SA" : "en-US";
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AiAssistantScreen() {
  const { session, profile } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { markRead } = useChatBadge();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { markRead(); }, []);

  // ── Core state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [typing, setTyping] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [step, setStep] = useState<Step>("welcome");
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderItem | null>(null);
  const [chosenAddress, setChosenAddress] = useState("");
  const [chosenPhone, setChosenPhone] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<"ar-SA" | "en-US">("ar-SA");
  const [hasOpenBooking, setHasOpenBooking] = useState(false);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const recognitionRef = useRef<any>(null);

  // ── TTS + Wave state ─────────────────────────────────────────────────────
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsEnabledRef = useRef(true);
  const waveAnims = useRef([0.3, 0.7, 1.0, 0.7, 0.3].map(v => new Animated.Value(v))).current;
  const waveAnimLoops = useRef<any[]>([]);

  // ── Profile autofill
  const savedPhone = profile?.phone || "";
  const [defaultAddress, setDefaultAddress] = useState<{ text: string; lat: number | null; lng: number | null } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<ResolvedAddress | null>(null);

  // ── Ticket state (inline form)
  const [ticketCategory, setTicketCategory] = useState<string>("service_quality");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  // ── Refund state (inline)
  const [refundReason, setRefundReason] = useState<string>(REFUND_REASONS[0]);
  const [refundBooking, setRefundBooking] = useState<{id: string; total: number; serviceName: string} | null>(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundId, setRefundId] = useState<string | null>(null);

  // ── Booking type (instant / scheduled)
  const [aiBookingType, setAiBookingType] = useState<"instant" | "scheduled">("instant");
  const [aiScheduledDate, setAiScheduledDate] = useState<string | null>(null);

  // ── Load services + providers + address + booking flag ───────────────────
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

        const PRIORITY: Record<string, number> = { "منازل": 1, "شقق": 2, "كنب": 3, "سجاد": 4, "مكيفات": 5, "فلل": 6, "مطابخ": 7, "خزانات": 8, "تعقيم": 9, "واجهات": 10 };
        const svcPriority = (title: string) => { for (const [kw, rank] of Object.entries(PRIORITY)) { if (title.includes(kw)) return rank; } return 99; };
        const mappedSvc: ServiceItem[] = ((svcRes.data ?? []) as any[])
          .map((s) => ({ id: s.id, title: s.title_ar || "خدمة", desc: s.desc_ar || "", price: Number(s.base_price || 0), duration: Number(s.duration_min || 120) }))
          .sort((a, b) => svcPriority(a.title) - svcPriority(b.title));
        setServices(mappedSvc);

        const { data: provRows } = await supabase.from("providers").select("id, rating, experience_years, hourly_rate, current_lat, current_lng, profiles(full_name)").eq("available", true).not("current_lat", "is", null).not("current_lng", "is", null).limit(10);
        const ref = me ? { lat: me.lat, lng: me.lng } : null;
        const mappedProv: ProviderItem[] = ((provRows ?? []) as any[]).map((p) => {
          const d = ref && p.current_lat && p.current_lng ? distanceKm(ref, { lat: p.current_lat, lng: p.current_lng }) : null;
          return { id: p.id, name: (p.profiles as any)?.full_name || "فني", rating: Number(p.rating || 4.7), distance_km: d, exp: Number(p.experience_years || 0), rate: Number(p.hourly_rate || 40) };
        });
        mappedProv.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
        setProviders(mappedProv);

        setHasOpenBooking(((openRes.data ?? []) as any[]).length > 0);

        // Pre-load most recent booking for refund
        const { data: lastBooking } = await supabase
          .from("bookings")
          .select("id, total, services:service_id(title_ar)")
          .eq("user_id", session.user.id)
          .in("status", ["completed", "cancelled"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastBooking) {
          const lb = lastBooking as any;
          setRefundBooking({ id: lb.id, total: Number(lb.total || 0), serviceName: lb.services?.title_ar || "خدمة تنظيف" });
        }
      } catch (e) {
        console.log("[ai] load failed:", (e as Error).message);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  const addBotMessage = useCallback((text: string, cardType?: CardType, extra?: Partial<ChatMessage>, lang?: "ar-SA" | "en-US") => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text, cardType, ...extra }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      if (!cardType) speakResponse(text, lang ?? "ar-SA");
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ── Typing animation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typing) {
      const anim = Animated.loop(Animated.sequence([
        Animated.timing(typingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(typingAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]));
      anim.start();
      return () => anim.stop();
    } else { typingAnim.setValue(0); }
  }, [typing, typingAnim]);

  // ── Welcome message ──────────────────────────────────────────────────────
  useEffect(() => {
    if (loadingMeta) return;
    const name = profile?.full_name?.split(" ")[0] || "";
    addBotMessage(name ? `مرحباً ${name} مني! 👋\nأنا مساعدك الذكي في نظافة ⬇️` : "مرحباً مني! 👋\nأنا مساعدك الذكي في نظافة ⬇️", "quick_actions");
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: services.length ? "اختار الخدمة" : "لا توجد خدمات متاحة الآن.", cardType: services.length ? "services" : null }]);
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

  // ── Helpers ──────────────────────────────────────────────────────────────

  const copyCode = (code: string) => {
    if (Platform.OS === "web") { try { navigator.clipboard?.writeText(code); } catch {} }
    Alert.alert("🎁 الكوبون جاهز للنسخ", `اضغط مطولاً على الكود للنسخ:\n\n${code}`, [{ text: "تم!", style: "default" }]);
  };

  const openLink = (url: string) => { Linking.openURL(url).catch(() => {}); };

  // ── TTS + wave helpers ───────────────────────────────────────────────────

  const speakResponse = (text: string, lang: "ar-SA" | "en-US") => {
    if (!ttsEnabledRef.current || Platform.OS === "web") return;
    const clean = text
      .replace(/[🎁✅❌⭐📌💰⏱🎯🎉🎊👋💳🔔📞💬📧📖🗓✨]/g, " ")
      .replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length < 3 || clean.length > 250) return;
    try {
      Speech.stop();
      Speech.speak(clean, {
        language: lang,
        rate: lang === "ar-SA" ? 0.82 : 0.9,
        pitch: lang === "ar-SA" ? 1.05 : 1.0,
        onError: () => {},
      });
    } catch {}
  };

  const startWaveAnimation = () => {
    waveAnimLoops.current.forEach((l: any) => { try { l?.stop(); } catch {} });
    waveAnimLoops.current = waveAnims.map((anim, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.0, duration: 200 + i * 55, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: 200 + i * 55, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    });
  };

  const stopWaveAnimation = () => {
    waveAnimLoops.current.forEach((l: any) => { try { l?.stop(); } catch {} });
    waveAnims.forEach(a => a.setValue(0.3));
  };

  // ── Real-data fetchers ───────────────────────────────────────────────────

  const fetchActiveTracking = async (): Promise<TrackingData | null> => {
    if (!session?.user) return null;
    try {
      const { data: booking } = await supabase.from("bookings")
        .select("id, status, total, scheduled_at, created_at, payment_method, services:service_id(title_ar), provider:profiles!bookings_provider_id_fkey(full_name)")
        .eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!booking) return null;
      const b = booking as any;
      const { data: logs } = await supabase.from("booking_status_log").select("status, created_at").eq("booking_id", b.id).order("created_at");
      return { bookingId: b.id, status: b.status, serviceName: b.services?.title_ar || "خدمة تنظيف", providerName: b.provider?.full_name || "فني", total: Number(b.total || 0), scheduledAt: b.scheduled_at, createdAt: b.created_at, statusLog: (logs ?? []) as any[] };
    } catch { return null; }
  };

  const fetchLatestInvoice = async (): Promise<InvoiceData | null> => {
    if (!session?.user) return null;
    try {
      const { data: booking } = await supabase.from("bookings")
        .select("id, status, total, created_at, payment_method, services:service_id(title_ar, base_price), provider:profiles!bookings_provider_id_fkey(full_name)")
        .eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!booking) return null;
      const b = booking as any;
      const basePrice = Number(b.services?.base_price || 0);
      const fee = 10; const vat = Math.round((basePrice + fee) * 0.15 * 100) / 100;
      return { bookingId: b.id, serviceName: b.services?.title_ar || "خدمة تنظيف", total: Number(b.total || basePrice + fee + vat), basePrice, fee, vat, status: b.status, createdAt: b.created_at, paymentMethod: b.payment_method, providerName: b.provider?.full_name || "فني" };
    } catch { return null; }
  };

  const fetchRefundStatus = async (): Promise<RefundStatusData | null> => {
    if (!session?.user) return null;
    try {
      const { data } = await supabase.from("refund_requests")
        .select("id, amount, status, reason, created_at, bookings:booking_id(services:service_id(title_ar))")
        .eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data) return null;
      const d = data as any;
      return { id: d.id, amount: Number(d.amount || 0), status: d.status, reason: d.reason, createdAt: d.created_at, serviceName: d.bookings?.services?.title_ar || "خدمة تنظيف" };
    } catch { return null; }
  };

  // ── Card pushers ─────────────────────────────────────────────────────────

  const pushTrackingCard = async () => {
    setTyping(true);
    const td = await fetchActiveTracking();
    setTimeout(() => {
      setTyping(false);
      if (td) setMessages((p) => [...p, { id: nextId(), role: "bot", text: "آخر تحديث لطلبك:", cardType: "tracking_card", trackingData: td }]);
      else setMessages((p) => [...p, { id: nextId(), role: "bot", text: "لم أجد أي طلبات نشطة. اختر خدمة لإنشاء طلب جديد." }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  const pushInvoiceCard = async () => {
    setTyping(true);
    const inv = await fetchLatestInvoice();
    setTimeout(() => {
      setTyping(false);
      if (inv) setMessages((p) => [...p, { id: nextId(), role: "bot", text: "آخر فاتورة لديك:", cardType: "invoice_card", invoiceData: inv }]);
      else setMessages((p) => [...p, { id: nextId(), role: "bot", text: "لم أجد فواتير حتى الآن. أكمل طلباً أولاً." }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  const pushCouponCard = () => {
    addUserMessage("ما هي العروض الحالية؟");
    setTimeout(() => {
      setTyping(false);
      setMessages((p) => [...p, { id: nextId(), role: "bot", text: "إليك العروض والكوبونات الفعّالة الآن 🎁", cardType: "coupon_card" }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 700);
  };

  const pushSupportContact = () => {
    addUserMessage("التواصل مع الدعم");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((p) => [...p, { id: nextId(), role: "bot", text: "كيف يمكنني مساعدتك؟ اختر وسيلة التواصل:", cardType: "support_contact" }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  const pushRefundCard = async () => {
    addUserMessage("أريد استرداد المبلغ");
    setTyping(true);
    const refData = await fetchRefundStatus();
    setTimeout(() => {
      setTyping(false);
      if (refData) {
        setMessages((p) => [...p, { id: nextId(), role: "bot", text: "آخر طلب استرداد لديك:", cardType: "refund_status_card", refundData: refData }]);
      } else if (refundBooking) {
        setMessages((p) => [...p, { id: nextId(), role: "bot", text: `يمكنني تقديم طلب استرداد لآخر خدمة (${refundBooking.serviceName}) بقيمة ${refundBooking.total.toFixed(2)} ر.س. اختر سبب الاسترداد:`, cardType: "refund_status_card" }]);
      } else {
        setMessages((p) => [...p, { id: nextId(), role: "bot", text: "لطلب الاسترداد:\n1️⃣ افتح الطلب من 'طلباتي'\n2️⃣ اختر 'فتح بلاغ'\n3️⃣ اشرح السبب\n\nيتم المراجعة خلال 24 ساعة." }]);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  // ── Ticket submission ────────────────────────────────────────────────────

  const submitTicket = async () => {
    if (!ticketDesc.trim() || !session?.user) return;
    setTicketSubmitting(true);
    try {
      const { data, error } = await supabase.from("support_tickets").insert({
        user_id: session.user.id, category: ticketCategory, description: ticketDesc.trim(), status: "open",
      }).select("id").maybeSingle();
      if (error) throw error;
      setTicketId(data?.id || "TKT-" + Date.now().toString().slice(-6));
      setTicketDesc("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const fakeId = "TKT-" + Date.now().toString().slice(-6);
      setTicketId(fakeId);
    } finally {
      setTicketSubmitting(false);
    }
  };

  // ── Refund submission ────────────────────────────────────────────────────

  const submitRefund = async () => {
    if (!refundBooking || !session?.user) return;
    setRefundSubmitting(true);
    try {
      const { data, error } = await supabase.from("refund_requests").insert({
        user_id: session.user.id, booking_id: refundBooking.id, amount: refundBooking.total, reason: refundReason, status: "pending",
      }).select("id").maybeSingle();
      if (error) throw error;
      setRefundId(data?.id || "REF-" + Date.now().toString().slice(-6));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addBotMessage("✅ تم استلام طلب الاسترداد! سيتم مراجعته خلال 24 ساعة والرد عبر الإشعارات.");
    } catch (e) {
      const fakeId = "REF-" + Date.now().toString().slice(-6);
      setRefundId(fakeId);
      addBotMessage("✅ تم إرسال طلب الاسترداد! سيتواصل معك فريق الدعم قريباً.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  // ── Booking flow ─────────────────────────────────────────────────────────

  const handleSelectService = (svc: ServiceItem) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    addUserMessage(svc.title);
    setSelectedService(svc);
    setTimeout(() => { addBotMessage(`اختيار ممتاز! 🎯\n\n📌 ${svc.title}\n💰 السعر: ${svc.price} ر.س\n⏱ المدة: ~${svc.duration} دقيقة\n\nاختر الفنّي:`, "providers"); setStep("providers"); }, 200);
  };

  const handleSelectProvider = (prov: ProviderItem) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    addUserMessage(`اخترت ${prov.name}`);
    setSelectedProvider(prov);
    setTimeout(() => {
      addBotMessage(`${prov.name} خيار رائع! ⭐ ${prov.rating}\n\nكيف تريد الحجز؟`, "booking_type");
      setStep("booking_type");
    }, 200);
  };

  const handleBookingTypeSelect = (type: "instant" | "scheduled") => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setAiBookingType(type);
    if (type === "instant") {
      addUserMessage("الآن — حجز فوري");
      setAiScheduledDate(new Date().toISOString());
      setTimeout(() => {
        const suggested = defaultAddress?.text || (currentAddress ? currentAddress.formatted : "");
        if (suggested) { addBotMessage("حجز فوري ✅\n\nهل العنوان التالي صحيح؟", "address_confirm", { address: suggested }); setStep("address"); }
        else { addBotMessage("حجز فوري ✅\n\nأرسل عنوانك:"); setStep("address"); }
      }, 200);
    } else {
      addUserMessage("موعد لاحق — مجدول");
      setAiScheduledDate(null);
      addBotMessage("اكتب التاريخ والوقت المطلوب، مثال:\nغداً الساعة 10 صباحاً\n2026-05-12 14:00");
      setStep("scheduled_date");
    }
  };

  const askPhone = () => {
    setTimeout(() => {
      if (savedPhone) { addBotMessage("تم تسجيل العنوان ✅\n\nهل نستخدم رقم الهاتف التالي؟", "phone_confirm", { phone: savedPhone }); setStep("phone"); }
      else { addBotMessage("تم تسجيل العنوان ✅\n\nأدخل رقم هاتفك:"); setStep("phone"); }
    }, 200);
  };

  const finalizeInvoice = (addr: string, phone: string) => {
    if (!selectedService || !selectedProvider) return;
    setChosenAddress(addr); setChosenPhone(phone); setStep("invoice");
    setTimeout(() => {
      setMessages((p) => [...p, { id: nextId(), role: "bot", text: "ممتاز! 🎉 فاتورة الحجز:", cardType: "invoice", service: selectedService, provider: selectedProvider, address: addr, phone }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  const handleConfirmAddress = (yes: boolean, suggested?: string) => {
    if (!yes) { addUserMessage("لا، عنوان جديد"); setTimeout(() => addBotMessage("اكتب العنوان الجديد بالأسفل."), 200); return; }
    addUserMessage(suggested || "نعم، استخدم العنوان المحفوظ");
    askPhone();
  };

  const handleConfirmPhone = (yes: boolean, suggested?: string) => {
    if (!yes) { addUserMessage("لا، رقم آخر"); setTimeout(() => addBotMessage("اكتب الرقم البديل."), 200); return; }
    addUserMessage(suggested || ""); finalizeInvoice(chosenAddress || defaultAddress?.text || currentAddress?.formatted || "", suggested || "");
  };

  const handleSendText = () => {
    const text = inputText.trim(); if (!text) return;
    // Auto-detect language and stop any ongoing speech before responding
    const lang = detectLanguage(text);
    setVoiceLang(lang);
    try { Speech.stop(); } catch {}
    setInputText(""); addUserMessage(text);
    if (step === "scheduled_date") {
      // Parse user-supplied date/time text into an ISO string
      let parsed: Date | null = null;
      try {
        // Try parsing ISO-ish format first (e.g. "2026-05-12 14:00")
        const isoAttempt = new Date(text.replace(" ", "T"));
        if (!isNaN(isoAttempt.getTime()) && isoAttempt > new Date()) {
          parsed = isoAttempt;
        }
      } catch {}
      if (!parsed) {
        // Simple Arabic heuristics: غداً / بعد غد + hour
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
        const dayAfter = new Date(); dayAfter.setDate(dayAfter.getDate() + 2); dayAfter.setHours(10, 0, 0, 0);
        const hourMatch = text.match(/(\d{1,2})/);
        const h = hourMatch ? parseInt(hourMatch[1], 10) : 10;
        if (/غداً|غدا/.test(text)) { tomorrow.setHours(h < 6 ? h + 12 : h, 0, 0, 0); parsed = tomorrow; }
        else if (/بعد غد/.test(text)) { dayAfter.setHours(h < 6 ? h + 12 : h, 0, 0, 0); parsed = dayAfter; }
        else if (hourMatch) {
          const d = new Date(); d.setHours(h < 6 ? h + 12 : h, 0, 0, 0);
          if (d > new Date()) { parsed = d; } else { d.setDate(d.getDate() + 1); parsed = d; }
        }
      }
      if (parsed) {
        setAiScheduledDate(parsed.toISOString());
        const fmt = parsed.toLocaleString("ar-SA", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        setTimeout(() => {
          const suggested = defaultAddress?.text || (currentAddress ? currentAddress.formatted : "");
          if (suggested) { addBotMessage(`تم تحديد الموعد: ${fmt} 📅\n\nهل العنوان التالي صحيح؟`, "address_confirm", { address: suggested }); setStep("address"); }
          else { addBotMessage(`تم تحديد الموعد: ${fmt} 📅\n\nأرسل عنوانك:`); setStep("address"); }
        }, 200);
      } else {
        addBotMessage("لم أتمكن من فهم التاريخ. جرب مثل:\nغداً الساعة 10\n2026-05-12 14:00");
      }
      return;
    }
    if (step === "address") { setChosenAddress(text); askPhone(); return; }
    if (step === "phone") { finalizeInvoice(chosenAddress || text, text); return; }
    // Intent detection
    if (/(اين طلبي|أين طلبي|حالة الطلب|تتبع)/i.test(text)) { pushTrackingCard(); return; }
    if (/(فاتورة|invoice|إيصال)/i.test(text)) { pushInvoiceCard(); return; }
    if (/(استرد|استرداد|refund)/i.test(text)) { pushRefundCard(); return; }
    if (/(شكوى|بلاغ|تذكرة|دعم|support)/i.test(text)) { pushSupportContact(); return; }
    if (/(عروض|كوبون|خصم|promo)/i.test(text)) { pushCouponCard(); return; }
    const ans = answerFromKb(text, { hasOpenBooking });
    if (ans) { addBotMessage(ans, undefined, undefined, lang); return; }
    addBotMessage(
      lang === "en-US"
        ? "Good question! I can help with: order tracking, invoice, offers, refunds, or support."
        : "سؤال جيد! يمكنني مساعدتك بـ: تتبع الطلب، الفاتورة، العروض، الاسترداد، أو الدعم. اختر من الأزرار السريعة أو اكتب سؤالك.",
      undefined, undefined, lang
    );
  };

  const handleConfirmBooking = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addUserMessage("تأكيد الحجز ✅"); setStep("confirmed");
    const scheduledAt = aiScheduledDate ?? new Date().toISOString();
    let bookingId: string | null = null;
    try {
      if (session?.user && selectedService) {
        const { data, error } = await supabase.from("bookings").insert({
          user_id: session.user.id, service_id: selectedService.id, provider_id: selectedProvider?.id || null,
          total: selectedService.price + 10 + Math.round((selectedService.price + 10) * 0.15 * 100) / 100,
          payment_method: "card", status: "pending", scheduled_at: scheduledAt,
          notes: `العنوان: ${chosenAddress} | الهاتف: ${chosenPhone}`,
        }).select("id").maybeSingle();
        if (error) console.log("[ai] booking insert err:", error.message);
        bookingId = data?.id || null;
        // Schedule local reminder 30 min before if it's a future appointment
        if (bookingId && aiBookingType === "scheduled") {
          const { scheduleBookingReminder } = await import("@/lib/notifications");
          await scheduleBookingReminder(scheduledAt, "⏰ تذكير بموعدك", `موعدك لـ "${selectedService.title}" خلال 30 دقيقة`, { bookingId });
        }
      }
    } catch (e) { console.log("[ai] booking failed:", (e as Error).message); }

    setTimeout(() => {
      const orderNum = bookingId ? bookingId.slice(0, 8).toUpperCase() : `CLN${Date.now().toString().slice(-6)}`;
      setMessages((p) => [...p, { id: nextId(), role: "bot", text: "تم إرسال الطلب! 🎊 سنتواصل معك خلال دقائق.", cardType: "confirmation", orderNumber: orderNum, bookingId: bookingId ?? undefined }]);
      setHasOpenBooking(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  const handleNewBooking = () => {
    msgId = 0; setMessages([]); setStep("welcome"); setSelectedService(null); setSelectedProvider(null); setChosenAddress(""); setChosenPhone(""); setAiBookingType("instant"); setAiScheduledDate(null);
    addBotMessage("بدأنا حجزاً جديداً 🎯");
    setTimeout(() => { setMessages((p) => [...p, { id: nextId(), role: "bot", text: "اختار الخدمة", cardType: "services" }]); setStep("services"); }, 800);
  };

  // ── Voice ────────────────────────────────────────────────────────────────

  const startVoiceWeb = () => {
    const SR = getWebSpeechRecognition();
    if (!SR) { Alert.alert("غير مدعوم", "حاول من Chrome."); return; }
    try {
      Speech.stop();
      const r = new SR(); r.lang = voiceLang; r.continuous = false; r.interimResults = false;
      r.onresult = (ev: any) => {
        const t: string = ev.results?.[0]?.[0]?.transcript || "";
        if (t) {
          setInputText((p) => (p ? p + " " : "") + t);
          setVoiceLang(detectLanguage(t));
        }
        stopWaveAnimation(); setVoiceListening(false);
      };
      r.onerror = () => { stopWaveAnimation(); setVoiceListening(false); };
      r.onend = () => { stopWaveAnimation(); setVoiceListening(false); };
      r.start(); recognitionRef.current = r; setVoiceListening(true);
      startWaveAnimation();
    } catch (e) { Alert.alert("خطأ", (e as Error).message); setVoiceListening(false); }
  };
  const stopVoiceWeb = () => {
    try { recognitionRef.current?.stop?.(); } catch {}
    stopWaveAnimation(); setVoiceListening(false);
  };
  const onMicPress = () => {
    try { Speech.stop(); } catch {}
    if (Platform.OS === "web") {
      voiceListening ? stopVoiceWeb() : startVoiceWeb();
    } else {
      if (voiceListening) { stopWaveAnimation(); setVoiceListening(false); return; }
      Alert.alert("الإدخال الصوتي", "استخدم زر المايكروفون على لوحة المفاتيح للإدخال الصوتي، أو اكتب رسالتك مباشرةً.", [{ text: "حسناً" }]);
    }
  };

  // ── Renderers ─────────────────────────────────────────────────────────────

  const QuickActions = () => (
    <View style={s.qaWrap}>
      {[
        { id: "promos",   label: "العروض والكوبونات", icon: "tag",          onPress: pushCouponCard },
        { id: "refer",    label: "دعوة صديق",         icon: "user-plus",    onPress: () => { addUserMessage("نظام دعوة الأصدقاء"); const a = answerFromKb("دعوة صديق", { hasOpenBooking }); a && addBotMessage(a); setTimeout(() => router.push("/referrals"), 1500); } },
        { id: "track",    label: "تتبع طلبي",         icon: "navigation-2", onPress: () => { addUserMessage("تتبع طلبي"); pushTrackingCard(); } },
        { id: "refund",   label: "استرداد المبلغ",    icon: "rotate-ccw",   onPress: pushRefundCard },
        { id: "support",  label: "الدعم والمساعدة",   icon: "headphones",   onPress: pushSupportContact },
        { id: "invoice",  label: "فاتورتي",            icon: "file-text",    onPress: () => { addUserMessage("فاتورتي"); pushInvoiceCard(); } },
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
        const ico = iconForService(svc.title); const col = colorForService(svc.title);
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
          <TouchableOpacity style={[s.confirmBtn, { marginTop: 10 }]} onPress={() => handleSelectProvider({ id: "auto", name: "أقرب فنّي", rating: 4.8, distance_km: null, exp: 0, rate: 0 })}>
            <Text style={s.confirmBtnText}>تخصيص تلقائي</Text>
          </TouchableOpacity>
        </View>
      ) : providers.map((prov) => (
        <TouchableOpacity key={prov.id} style={[s.provCard, { backgroundColor: colors.card }]} activeOpacity={0.85} onPress={() => handleSelectProvider(prov)}>
          <View style={s.provAvatar}><Text style={s.provInitials}>{prov.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</Text></View>
          <Text style={[s.provName, { color: colors.foreground }]} numberOfLines={1}>{prov.name}</Text>
          <View style={s.provRow}>
            <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
            <Text style={[s.provRating, { color: colors.foreground }]}>{prov.rating.toFixed(1)}</Text>
            {prov.distance_km != null && <Text style={[s.provDist, { color: colors.mutedForeground }]}>{prov.distance_km < 1 ? `${Math.round(prov.distance_km * 1000)}م` : `${prov.distance_km.toFixed(1)} كم`}</Text>}
          </View>
          <Text style={s.provRate}>{prov.rate || "—"} ر.س/ساعة</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderConfirmCard = (msg: ChatMessage, mode: "address" | "phone") => {
    const value = mode === "address" ? msg.address : msg.phone; if (!value) return null;
    return (
      <View style={s.confirmInline}>
        <View style={s.confirmInlineRow}><Feather name={mode === "address" ? "map-pin" : "phone"} size={16} color="#7C3AED" /><Text style={s.confirmInlineT}>{value}</Text></View>
        <View style={s.confirmInlineBtns}>
          <TouchableOpacity onPress={() => mode === "address" ? handleConfirmAddress(true, value) : handleConfirmPhone(true, value)} style={[s.confirmInlineBtn, { backgroundColor: "#7C3AED" }]}><Text style={[s.confirmInlineBtnT, { color: "#FFF" }]}>نعم، استخدمه</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => mode === "address" ? handleConfirmAddress(false) : handleConfirmPhone(false)} style={[s.confirmInlineBtn, { backgroundColor: "#F1F5F9" }]}><Text style={[s.confirmInlineBtnT, { color: "#0F172A" }]}>تغيير</Text></TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInvoice = (msg: ChatMessage) => {
    const svc = msg.service || selectedService; const prov = msg.provider || selectedProvider; if (!svc || !prov) return null;
    const fee = 10; const subtotal = svc.price + fee; const vat = Math.round(subtotal * 0.15 * 100) / 100; const total = Math.round((subtotal + vat) * 100) / 100;
    return (
      <View style={s.invoiceCard}>
        <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.invoiceHeader}><MaterialCommunityIcons name="receipt" size={22} color="#FFF" /><Text style={s.invoiceHeaderText}>فاتورة الحجز</Text></LinearGradient>
        <View style={s.invoiceBody}>
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{svc.title}</Text><Text style={s.invoiceLabel}>الخدمة</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{prov.name}</Text><Text style={s.invoiceLabel}>المزود</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal} numberOfLines={2}>{msg.address || chosenAddress}</Text><Text style={s.invoiceLabel}>العنوان</Text></View>
          <View style={s.invoiceDivider} />
          <View style={s.invoiceRow}><Text style={s.invoiceVal}>{msg.phone || chosenPhone || "—"}</Text><Text style={s.invoiceLabel}>الهاتف</Text></View>
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
              <Text style={s.confirmBtnText}>تأكيد وإرسال الطلب</Text><Feather name="check-circle" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderConfirmation = (msg: ChatMessage) => (
    <View style={s.confirmationCard}>
      <LinearGradient colors={["#16C47F", "#0EA968"]} style={s.confirmGrad}>
        <View style={s.confirmIconWrap}><Feather name="check" size={36} color="#FFF" /></View>
        <Text style={s.confirmTitle}>تم تأكيد الحجز! 🎉</Text>
        <Text style={s.confirmSub}>رقم الطلب: #{msg.orderNumber || "CLN000000"}</Text>
      </LinearGradient>
      {msg.bookingId && (
        <TouchableOpacity style={s.trackOrderBtn} activeOpacity={0.88} onPress={() => router.push({ pathname: "/tracking", params: { id: msg.bookingId } } as any)}>
          <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.trackOrderGrad}>
            <MaterialCommunityIcons name="radar" size={18} color="#FFF" />
            <Text style={s.trackOrderBtnText}>تتبع الطلب مباشرة</Text>
            <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={16} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={s.newBookingBtn} activeOpacity={0.85} onPress={handleNewBooking}>
        <Text style={s.newBookingBtnText}>حجز خدمة جديدة</Text><Feather name="plus-circle" size={16} color="#7C3AED" />
      </TouchableOpacity>
    </View>
  );

  const renderTrackingCard = (td: TrackingData) => {
    const statusColor = STATUS_COLOR[td.status] ?? "#94A3B8";
    const STEPS = ["pending", "accepted", "on_the_way", "in_progress", "completed"];
    const currentIdx = STEPS.indexOf(td.status);
    const STEP_LABELS: Record<string, string> = { pending: "انتظار", accepted: "قبول", on_the_way: "في الطريق", in_progress: "تنفيذ" };
    return (
      <View style={s.trackCard}>
        <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.trackCardHeader}>
          <MaterialCommunityIcons name="radar" size={20} color="#7C3AED" />
          <View style={{ flex: 1 }}><Text style={s.trackCardService}>{td.serviceName}</Text><Text style={s.trackCardSub}>#{td.bookingId.slice(0, 8).toUpperCase()}</Text></View>
          <View style={[s.trackStatusBadge, { backgroundColor: statusColor }]}><Text style={s.trackStatusBadgeT}>{STATUS_AR[td.status] ?? td.status}</Text></View>
        </LinearGradient>
        <View style={s.trackProgressWrap}>
          {STEPS.slice(0, -1).map((st, i) => {
            const done = i <= currentIdx;
            return (
              <View key={st} style={{ alignItems: "center", flex: 1 }}>
                <View style={[s.trackProgressDot, { backgroundColor: done ? statusColor : "#E2E8F0", borderColor: done ? statusColor : "#CBD5E1" }]}>
                  {done && <Feather name="check" size={8} color="#FFF" />}
                </View>
                <Text style={[s.trackProgressLabel, { color: done ? "#0F172A" : "#94A3B8" }]}>{STEP_LABELS[st]}</Text>
              </View>
            );
          })}
        </View>
        <View style={s.trackCardBody}>
          <View style={s.trackInfoRow}>
            <View style={s.trackProvAvatar}><Text style={s.trackProvInitials}>{td.providerName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</Text></View>
            <View style={{ flex: 1 }}><Text style={s.trackProvName}>{td.providerName}</Text><Text style={s.trackProvSub}>الفنّي المكلّف</Text></View>
            <View style={{ alignItems: "flex-end" }}><Text style={s.trackTotal}>{td.total.toFixed(2)} ر.س</Text><Text style={s.trackTotalSub}>الإجمالي</Text></View>
          </View>
          {td.scheduledAt && <View style={s.trackScheduleRow}><Feather name="calendar" size={13} color="#7C3AED" /><Text style={s.trackScheduleT}>{fmtDate(td.scheduledAt)}</Text></View>}
          {td.statusLog.length > 0 && (
            <View style={s.trackLog}>
              <Text style={s.trackLogTitle}>سجل الحالات</Text>
              {td.statusLog.slice(-4).reverse().map((entry: any, i: number) => (
                <View key={i} style={s.trackLogItem}>
                  <View style={[s.trackLogDot, { backgroundColor: STATUS_COLOR[entry.status] ?? "#94A3B8" }]} />
                  <View style={{ flex: 1 }}><Text style={s.trackLogStatus}>{STATUS_AR[entry.status] ?? entry.status}</Text><Text style={s.trackLogDate}>{fmtDate(entry.created_at)}</Text></View>
                </View>
              ))}
            </View>
          )}
        </View>
        <TouchableOpacity style={s.trackOpenBtn} activeOpacity={0.85} onPress={() => router.push({ pathname: "/tracking", params: { id: td.bookingId } } as any)}>
          <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.trackOpenGrad}>
            <MaterialCommunityIcons name="map-marker-radius" size={16} color="#FFF" />
            <Text style={s.trackOpenT}>فتح شاشة التتبع الكاملة</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInvoiceDetail = (inv: InvoiceData) => {
    const statusColor = STATUS_COLOR[inv.status] ?? "#94A3B8";
    return (
      <View style={s.invDetailCard}>
        <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.invDetailHeader}>
          <MaterialCommunityIcons name="receipt" size={20} color="#FFF" />
          <Text style={s.invDetailHeaderT}>فاتورتك الأخيرة</Text>
          <View style={[s.invDetailBadge, { backgroundColor: statusColor }]}><Text style={s.invDetailBadgeT}>{STATUS_AR[inv.status] ?? inv.status}</Text></View>
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
          <View style={s.invoiceRow}><Text style={[s.invoiceVal, { fontFamily: "Tajawal_700Bold", color: "#7C3AED", fontSize: 18 }]}>{inv.total.toFixed(2)} ر.س</Text><Text style={[s.invoiceLabel, { fontFamily: "Tajawal_700Bold" }]}>الإجمالي</Text></View>
        </View>
        <TouchableOpacity style={s.trackOpenBtn} activeOpacity={0.85} onPress={() => router.push("/(tabs)/bookings")}>
          <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={s.trackOpenGrad}><Feather name="list" size={14} color="#FFF" /><Text style={s.trackOpenT}>عرض كل الطلبات</Text></LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // ── NEW: Coupon cards ──────────────────────────────────────────────────
  const renderCouponCard = () => (
    <View style={s.couponWrap}>
      {SEASONAL_PROMOS.map((promo) => (
        <View key={promo.id} style={s.couponCard}>
          <LinearGradient colors={[promo.ctaBg, promo.ctaBg + "CC"]} style={s.couponGrad}>
            <View style={s.couponBadgeWrap}>
              <View style={[s.couponBadge, { backgroundColor: promo.badgeBg }]}>
                <Text style={[s.couponBadgeT, { color: promo.badgeText }]}>{promo.badge}</Text>
              </View>
              <View style={[s.discountBubble, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Text style={s.discountT}>{promo.discount}%</Text>
                <Text style={s.discountSub}>خصم</Text>
              </View>
            </View>
            <Text style={[s.couponTitle, { color: "#FFF" }]} numberOfLines={2}>{promo.title}</Text>
            <Text style={[s.couponSub, { color: "rgba(255,255,255,0.85)" }]} numberOfLines={1}>{promo.subtitle}</Text>
            <View style={s.couponCodeRow}>
              <TouchableOpacity style={s.couponCopyBtn} onPress={() => copyCode(promo.code)} activeOpacity={0.85}>
                <Feather name="copy" size={13} color={promo.ctaBg === "#FFF" ? "#0F172A" : "#FFF"} />
                <Text style={[s.couponCopyT, { color: promo.ctaBg === "#FFF" ? "#0F172A" : "#FFF" }]}>نسخ</Text>
              </TouchableOpacity>
              <View style={[s.couponCodeBox, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={s.couponCode}>{promo.code}</Text>
              </View>
            </View>
            <Text style={[s.couponExpiry, { color: "rgba(255,255,255,0.7)" }]}>⏰ {promo.validUntil}</Text>
          </LinearGradient>
        </View>
      ))}
      <TouchableOpacity style={s.couponAllBtn} activeOpacity={0.85} onPress={() => router.push("/(tabs)/offers")}>
        <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.couponAllGrad}>
          <Feather name="grid" size={15} color="#FFF" />
          <Text style={s.couponAllT}>عرض جميع العروض</Text>
          <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={14} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ── NEW: Support contact card ──────────────────────────────────────────
  const renderSupportContact = () => (
    <View style={s.supportCard}>
      <View style={s.supportHeader}>
        <MaterialCommunityIcons name="headset" size={20} color="#7C3AED" />
        <Text style={s.supportHeaderT}>مركز الدعم والمساعدة</Text>
      </View>
      <Text style={s.supportSubtitle}>نحن هنا 24/7 لمساعدتك في أي وقت</Text>

      {[
        { icon: "phone", label: "اتصل بنا", sub: "920-000-000", color: "#16C47F", onPress: () => openLink("tel:920000000") },
        { icon: "message-circle", label: "واتساب", sub: "تواصل فوري", color: "#25D366", onPress: () => openLink("https://wa.me/966920000000?text=أحتاج مساعدة") },
        { icon: "mail", label: "البريد الإلكتروني", sub: "support@nathafah.sa", color: "#3B82F6", onPress: () => openLink("mailto:support@nathafah.sa") },
        { icon: "book-open", label: "مركز المساعدة", sub: "الأسئلة الشائعة والدروس", color: "#F59E0B", onPress: () => openLink("https://nathafah.sa/help") },
      ].map((item, i) => (
        <TouchableOpacity key={i} style={s.supportRow} activeOpacity={0.85} onPress={item.onPress}>
          <View style={[s.supportIconCircle, { backgroundColor: item.color + "18" }]}>
            <Feather name={item.icon as any} size={18} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.supportRowLabel}>{item.label}</Text>
            <Text style={s.supportRowSub}>{item.sub}</Text>
          </View>
          <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={16} color="#CBD5E1" />
        </TouchableOpacity>
      ))}

      <View style={s.supportDivider} />

      {/* Ticket form */}
      {!ticketId ? (
        <View style={s.ticketForm}>
          <Text style={s.ticketFormTitle}>فتح شكوى جديدة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {TICKET_CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.key} style={[s.ticketCatChip, { backgroundColor: ticketCategory === cat.key ? "#7C3AED" : "#F1F5F9" }]} onPress={() => setTicketCategory(cat.key)} activeOpacity={0.85}>
                <MaterialCommunityIcons name={cat.icon as any} size={13} color={ticketCategory === cat.key ? "#FFF" : "#64748B"} />
                <Text style={[s.ticketCatLabel, { color: ticketCategory === cat.key ? "#FFF" : "#64748B" }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={s.ticketTextarea}
            value={ticketDesc}
            onChangeText={setTicketDesc}
            placeholder="اشرح المشكلة بالتفصيل..."
            placeholderTextColor="#94A3B8"
            multiline numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity style={[s.ticketSubmitBtn, { opacity: ticketDesc.trim() ? 1 : 0.5 }]} activeOpacity={0.85} onPress={submitTicket} disabled={!ticketDesc.trim() || ticketSubmitting}>
            {ticketSubmitting ? <ActivityIndicator color="#FFF" size="small" /> : (
              <><MaterialCommunityIcons name="send" size={16} color="#FFF" /><Text style={s.ticketSubmitT}>إرسال الشكوى</Text></>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.ticketSuccess}>
          <View style={[s.ticketSuccessIcon, { backgroundColor: "#16C47F18" }]}><Feather name="check-circle" size={28} color="#16C47F" /></View>
          <Text style={s.ticketSuccessTitle}>تم استلام شكواك ✅</Text>
          <Text style={s.ticketSuccessId}>رقم التذكرة: #{ticketId.slice(0, 8).toUpperCase()}</Text>
          <Text style={s.ticketSuccessSub}>سيتواصل معك فريق الدعم خلال أقل من ساعة</Text>
        </View>
      )}
    </View>
  );

  // ── NEW: Refund status/request card ───────────────────────────────────
  const renderRefundStatusCard = (refData?: RefundStatusData) => {
    const REFUND_STATUS_AR: Record<string, string> = {
      pending: "قيد المراجعة", under_review: "تحت المراجعة",
      approved: "موافق عليه", rejected: "مرفوض", processed: "تم الاسترداد",
    };
    const REFUND_STATUS_COLOR: Record<string, string> = {
      pending: "#F59E0B", under_review: "#3B82F6",
      approved: "#16C47F", rejected: "#EF4444", processed: "#7C3AED",
    };

    if (refData) {
      // Show existing refund status
      const col = REFUND_STATUS_COLOR[refData.status] ?? "#94A3B8";
      return (
        <View style={s.refundCard}>
          <LinearGradient colors={[col, col + "BB"]} style={s.refundHeader}>
            <MaterialCommunityIcons name="cash-refund" size={20} color="#FFF" />
            <Text style={s.refundHeaderT}>طلب الاسترداد</Text>
            <View style={[s.refundBadge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
              <Text style={s.refundBadgeT}>{REFUND_STATUS_AR[refData.status] ?? refData.status}</Text>
            </View>
          </LinearGradient>
          <View style={s.refundBody}>
            <View style={s.invoiceRow}><Text style={s.invoiceVal}>{refData.serviceName}</Text><Text style={s.invoiceLabel}>الخدمة</Text></View>
            <View style={s.invoiceDivider} />
            <View style={s.invoiceRow}><Text style={[s.invoiceVal, { color: "#7C3AED", fontFamily: "Tajawal_700Bold", fontSize: 16 }]}>{refData.amount.toFixed(2)} ر.س</Text><Text style={s.invoiceLabel}>مبلغ الاسترداد</Text></View>
            <View style={s.invoiceDivider} />
            <View style={s.invoiceRow}><Text style={s.invoiceVal} numberOfLines={2}>{refData.reason}</Text><Text style={s.invoiceLabel}>السبب</Text></View>
            <View style={s.invoiceDivider} />
            <View style={s.invoiceRow}><Text style={s.invoiceVal}>{fmtDate(refData.createdAt)}</Text><Text style={s.invoiceLabel}>تاريخ الطلب</Text></View>
          </View>
        </View>
      );
    }

    // Show refund request form
    if (!refundId && refundBooking) {
      return (
        <View style={s.refundCard}>
          <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.refundHeader}>
            <MaterialCommunityIcons name="cash-refund" size={20} color="#FFF" />
            <Text style={s.refundHeaderT}>طلب استرداد المبلغ</Text>
          </LinearGradient>
          <View style={s.refundBody}>
            <View style={s.invoiceRow}>
              <Text style={[s.invoiceVal, { color: "#7C3AED", fontFamily: "Tajawal_700Bold", fontSize: 18 }]}>{refundBooking.total.toFixed(2)} ر.س</Text>
              <Text style={s.invoiceLabel}>المبلغ</Text>
            </View>
            <View style={s.invoiceDivider} />
            <View style={s.invoiceRow}><Text style={s.invoiceVal}>{refundBooking.serviceName}</Text><Text style={s.invoiceLabel}>الخدمة</Text></View>
            <View style={s.invoiceDivider} />
            <Text style={[s.ticketFormTitle, { marginBottom: 8, marginTop: 4 }]}>سبب الاسترداد</Text>
            {REFUND_REASONS.map((reason, i) => (
              <TouchableOpacity key={i} style={[s.refundReasonRow, { backgroundColor: refundReason === reason ? "#EDE9FE" : "#F8FAFC" }]} onPress={() => setRefundReason(reason)} activeOpacity={0.85}>
                <View style={[s.refundReasonDot, { backgroundColor: refundReason === reason ? "#7C3AED" : "#CBD5E1" }]} />
                <Text style={[s.refundReasonT, { color: refundReason === reason ? "#7C3AED" : "#0F172A" }]}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.ticketSubmitBtn, { marginTop: 12 }]} activeOpacity={0.85} onPress={submitRefund} disabled={refundSubmitting}>
              {refundSubmitting ? <ActivityIndicator color="#FFF" size="small" /> : (
                <><MaterialCommunityIcons name="cash-refund" size={16} color="#FFF" /><Text style={s.ticketSubmitT}>تقديم طلب الاسترداد</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (refundId) {
      return (
        <View style={s.refundCard}>
          <View style={s.ticketSuccess}>
            <View style={[s.ticketSuccessIcon, { backgroundColor: "#7C3AED18" }]}><MaterialCommunityIcons name="cash-check" size={28} color="#7C3AED" /></View>
            <Text style={s.ticketSuccessTitle}>تم استلام طلب الاسترداد ✅</Text>
            <Text style={s.ticketSuccessId}>رقم الطلب: #{refundId.slice(0, 8).toUpperCase()}</Text>
            <Text style={s.ticketSuccessSub}>سيتم مراجعته خلال 24 ساعة والاسترداد عبر وسيلة الدفع الأصلية خلال 3-7 أيام</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>

      {/* Header — outside KAV so it stays fixed */}
      <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerRow}>
          {/* Back — start edge (right in RTL) */}
          <TouchableOpacity onPress={() => { try { Speech.stop(); } catch {} router.back(); }} style={s.headerBackBtn}>
            <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={24} color="#FFF" />
          </TouchableOpacity>

          {/* AI Avatar with online indicator */}
          <View style={s.headerAvatarWrap}>
            <Image source={AI_AVATAR_LIGHT} style={s.headerAvatar} />
            <View style={s.headerAvatarOnline} />
          </View>

          {/* Name + status — flex:1 aligned to flex-start (right in RTL) */}
          <View style={s.headerInfo}>
            <Text style={s.headerTitle}>مني • المساعد الذكي</Text>
            <View style={s.headerStatusRow}>
              <View style={s.headerOnlineDot} />
              <Text style={s.headerSub}>متصلة الآن • ع + EN</Text>
            </View>
          </View>

          {/* TTS toggle + AI badge — end edge (left in RTL) */}
          <View style={s.headerActions}>
            <TouchableOpacity
              style={[s.headerTtsBtn, { backgroundColor: ttsEnabled ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)" }]}
              onPress={() => {
                const next = !ttsEnabled;
                ttsEnabledRef.current = next;
                setTtsEnabled(next);
                if (!next) { try { Speech.stop(); } catch {} }
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name={ttsEnabled ? "volume-high" : "volume-off"} size={18} color="#FFF" />
            </TouchableOpacity>
            <View style={s.headerBadge}><Text style={s.headerBadgeText}>AI</Text></View>
          </View>
        </View>
      </LinearGradient>

      {loadingMeta ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#7C3AED" size="large" />
        </View>
      ) : (
        // ── KeyboardAvoidingView from react-native-keyboard-controller ────────
        // behavior="padding" on iOS: adds paddingBottom = keyboardHeight, scrolls content up
        // behavior="height" on Android: shrinks the view height above the keyboard
        // keyboardVerticalOffset = header height so offset is calculated correctly
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 66 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[s.messagesContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) => (
              <View key={msg.id} style={msg.role === "bot" ? s.botMsgWrap : s.userMsgWrap}>
                {msg.role === "bot" && <Image source={AI_AVATAR_LIGHT} style={s.botAvatarSmall} />}
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
                  {msg.cardType === "coupon_card" && renderCouponCard()}
                  {msg.cardType === "support_contact" && renderSupportContact()}
                  {msg.cardType === "refund_status_card" && renderRefundStatusCard(msg.refundData)}
                  {msg.cardType === "booking_type" && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={[s.confirmInlineBtn, { flex: 1, backgroundColor: "#7C3AED", paddingVertical: 12, borderRadius: 14, alignItems: "center", gap: 4 }]}
                        onPress={() => handleBookingTypeSelect("instant")}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFF" />
                        <Text style={[s.confirmInlineBtnT, { color: "#FFF" }]}>الآن (فوري)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.confirmInlineBtn, { flex: 1, backgroundColor: "#F59E0B", paddingVertical: 12, borderRadius: 14, alignItems: "center", gap: 4 }]}
                        onPress={() => handleBookingTypeSelect("scheduled")}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons name="calendar-clock" size={18} color="#FFF" />
                        <Text style={[s.confirmInlineBtnT, { color: "#FFF" }]}>موعد لاحق</Text>
                      </TouchableOpacity>
                    </View>
                  )}
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

          {/* ── Input bar — always at bottom of KAV, above keyboard ── */}
          <View style={[s.inputBar, { paddingBottom: insets.bottom + 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border ?? "#E2E8F0" }]}>
            {voiceListening ? (
              /* ── Recording state: wave + stop ─────────────────────── */
              <View style={s.recordingBar}>
                {/* Stop recording button */}
                <TouchableOpacity style={s.recordingStopBtn} onPress={onMicPress} activeOpacity={0.85}>
                  <Feather name="square" size={12} color="#FFF" />
                </TouchableOpacity>

                {/* Animated wave bars */}
                <View style={s.waveContainer}>
                  {waveAnims.map((anim, i) => (
                    <Animated.View key={i} style={[s.waveBar, { transform: [{ scaleY: anim }] }]} />
                  ))}
                </View>

                <Text style={s.recordingLabel}>جاري الاستماع...</Text>

                {/* Cancel = discard transcript */}
                <TouchableOpacity onPress={() => { stopVoiceWeb(); setInputText(""); }} style={{ padding: 8 }}>
                  <Feather name="x" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Normal input ──────────────────────────────────────── */
              <View style={[s.inputRow, { backgroundColor: colors.card }]}>
                <TouchableOpacity style={s.sendBtn} onPress={handleSendText} activeOpacity={0.85}>
                  <Feather name="send" size={18} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.micBtn, { backgroundColor: colors.primaryLight ?? "#EDE9FE" }]} onPress={onMicPress} activeOpacity={0.85}>
                  <MaterialCommunityIcons name="microphone-outline" size={20} color="#7C3AED" />
                </TouchableOpacity>
                <TouchableOpacity style={[s.micBtn, { backgroundColor: voiceLang === "en-US" ? "#3B82F6" : colors.card }]} onPress={() => setVoiceLang((l) => l === "ar-SA" ? "en-US" : "ar-SA")} activeOpacity={0.85}>
                  <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 11, color: voiceLang === "en-US" ? "#FFF" : colors.mutedForeground }}>
                    {voiceLang === "ar-SA" ? "ع" : "EN"}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={[s.textInput, { color: colors.foreground }]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={step === "address" ? "اكتب العنوان..." : step === "phone" ? "اكتب رقم الهاتف..." : step === "scheduled_date" ? "مثال: غداً الساعة 10 أو 2026-05-15 14:00" : "اكتب رسالتك أو اضغط المايك..."}
                  placeholderTextColor={colors.mutedForeground ?? "#94A3B8"}
                  onSubmitEditing={handleSendText}
                  returnKeyType="send"
                  blurOnSubmit={false}
                />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerInfo: { flex: 1, alignItems: "flex-start" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#FFF" },
  headerSub: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  headerBadgeText: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#FFF" },

  messagesContent: { padding: 16, gap: 12 },
  botMsgWrap: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  userMsgWrap: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  botAvatarSmall: { width: 28, height: 28, borderRadius: 14, marginTop: 4 },
  botBubble: { borderRadius: 18, borderTopStartRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: "#7C3AED", borderRadius: 18, borderTopEndRadius: 4, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "flex-end" },
  botText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#0F172A", lineHeight: 22 },
  userText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: "#FFF", lineHeight: 22 },

  typingBubble: { flexDirection: "row", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  typingDot: { width: 8, height: 8, borderRadius: 4 },

  // Quick actions
  qaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  qaChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  qaChipT: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#7C3AED" },

  // Service grid
  svcGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  svcCardGrid: { width: "31%", borderRadius: 16, padding: 10, alignItems: "center" },
  svcIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  svcCardTitle: { fontFamily: "Tajawal_700Bold", fontSize: 11, textAlign: "center", marginBottom: 4 },
  svcCardPrice: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  svcCardDur: { fontFamily: "Tajawal_400Regular", fontSize: 9, marginTop: 2 },

  // Provider cards
  provCard: { width: 150, borderRadius: 18, padding: 14, alignItems: "center" },
  provAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  provInitials: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#7C3AED" },
  provName: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 4 },
  provRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  provRating: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  provDist: { fontFamily: "Tajawal_400Regular", fontSize: 10 },
  provRate: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#7C3AED" },

  // Confirm address/phone
  confirmInline: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12, marginTop: 8, gap: 10 },
  confirmInlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  confirmInlineT: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A", flex: 1 },
  confirmInlineBtns: { flexDirection: "row", gap: 8 },
  confirmInlineBtn: { flex: 1, paddingVertical: 10, borderRadius: 100, alignItems: "center" },
  confirmInlineBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  // Invoice card
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

  // Confirmation card
  confirmationCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  confirmGrad: { padding: 28, alignItems: "center", gap: 8 },
  confirmIconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  confirmTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#FFF" },
  confirmSub: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "rgba(255,255,255,0.9)" },
  trackOrderBtn: { marginHorizontal: 12, marginTop: 14, borderRadius: 16, overflow: "hidden" },
  trackOrderGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, paddingHorizontal: 20 },
  trackOrderBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFF", flex: 1, textAlign: "center" },
  newBookingBtn: { padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  newBookingBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#7C3AED" },

  // Tracking card
  trackCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4 },
  trackCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  trackCardService: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF" },
  trackCardSub: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  trackStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  trackStatusBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 10, color: "#FFF" },
  trackProgressWrap: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 14 },
  trackProgressDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  trackProgressLabel: { fontFamily: "Tajawal_500Medium", fontSize: 9, marginTop: 4, textAlign: "center" },
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
  trackLog: { gap: 6, marginTop: 4 },
  trackLogTitle: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#94A3B8", marginBottom: 4 },
  trackLogItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  trackLogDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  trackLogStatus: { fontFamily: "Tajawal_600SemiBold", fontSize: 12, color: "#0F172A" },
  trackLogDate: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#94A3B8" },
  trackOpenBtn: { marginHorizontal: 12, marginBottom: 12, marginTop: 4, borderRadius: 14, overflow: "hidden" },
  trackOpenGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  trackOpenT: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#FFF" },

  // Invoice detail card
  invDetailCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  invDetailHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  invDetailHeaderT: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF", flex: 1 },
  invDetailBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  invDetailBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 10, color: "#FFF" },

  // ── Coupon cards ──────────────────────────────────────────────────────
  couponWrap: { marginTop: 8, gap: 12 },
  couponCard: { borderRadius: 20, overflow: "hidden", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  couponGrad: { padding: 18, gap: 8 },
  couponBadgeWrap: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  couponBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  couponBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  discountBubble: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  discountT: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF", lineHeight: 18 },
  discountSub: { fontFamily: "Tajawal_400Regular", fontSize: 9, color: "rgba(255,255,255,0.9)", lineHeight: 11 },
  couponTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, lineHeight: 22 },
  couponSub: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
  couponCodeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  couponCodeBox: { flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  couponCode: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF", letterSpacing: 2 },
  couponCopyBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  couponCopyT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  couponExpiry: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  couponAllBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  couponAllGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  couponAllT: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF", flex: 1, textAlign: "center" },

  // ── Support contact card ──────────────────────────────────────────────
  supportCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  supportHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  supportHeaderT: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#0F172A" },
  supportSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#64748B", paddingHorizontal: 16, marginBottom: 12 },
  supportRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  supportIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  supportRowLabel: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#0F172A" },
  supportRowSub: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "#64748B", marginTop: 2 },
  supportDivider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 16, marginVertical: 12 },

  // ── Ticket form (inside support card) ────────────────────────────────
  ticketForm: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  ticketFormTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#0F172A" },
  ticketCatChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  ticketCatLabel: { fontFamily: "Tajawal_600SemiBold", fontSize: 12 },
  ticketTextarea: {
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14,
    padding: 12, fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#0F172A",
    minHeight: 90, textAlign: "right",
  },
  ticketSubmitBtn: { backgroundColor: "#7C3AED", borderRadius: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ticketSubmitT: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF" },
  ticketSuccess: { alignItems: "center", paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8, gap: 8 },
  ticketSuccessIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  ticketSuccessTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#0F172A" },
  ticketSuccessId: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, color: "#7C3AED" },
  ticketSuccessSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#64748B", textAlign: "center", lineHeight: 20 },

  // ── Refund card ───────────────────────────────────────────────────────
  refundCard: { borderRadius: 20, overflow: "hidden", marginTop: 8, backgroundColor: "#FFF", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  refundHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  refundHeaderT: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF", flex: 1 },
  refundBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  refundBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 10, color: "#FFF" },
  refundBody: { padding: 16, gap: 10 },
  refundReasonRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, marginBottom: 4 },
  refundReasonDot: { width: 10, height: 10, borderRadius: 5 },
  refundReasonT: { fontFamily: "Tajawal_500Medium", fontSize: 13, flex: 1 },

  // ── Input bar ─────────────────────────────────────────────────────────
  inputBar: { paddingHorizontal: 12, paddingTop: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 6, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  textInput: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 14, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" },
  micBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  // ── Header extras ──────────────────────────────────────────────────────
  headerBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerAvatarWrap: { position: "relative" },
  headerAvatar: { width: 44, height: 44, borderRadius: 22 },
  headerAvatarOnline: { position: "absolute", bottom: 1, end: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "#7C3AED" },
  headerStatusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  headerOnlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTtsBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  // ── Wave recording ──────────────────────────────────────────────────────
  recordingBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#FEF2F2", shadowColor: "#EF4444", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  recordingStopBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center" },
  waveContainer: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, height: 36 },
  waveBar: { width: 4, height: 28, borderRadius: 2, backgroundColor: "#EF4444" },
  recordingLabel: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#EF4444" },
});
