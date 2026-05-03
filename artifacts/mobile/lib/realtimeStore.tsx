/**
 * Centralized Realtime Architecture — v2
 *
 * Active subscriptions:
 *   store-bookings-{uid}       → customer booking updates (user_id filter)
 *   store-notifs-{uid}         → customer notification updates (user_id filter)
 *   store-provider-orders      → provider new/updated bookings (all bookings)
 *   store-admin-bookings       → new booking inserts (admin dashboard)
 *
 * Features:
 *   - Global event dispatcher (EventEmitter pattern)
 *   - Stale-state prevention via generation counters
 *   - Optimistic updates merged into local state before DB confirms
 *   - Unified cleanup on logout
 *   - Console logs for every channel status + event
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

// ── Types ──────────────────────────────────────────────────────────────────

export type BookingRow = {
  id: string;
  status: string;
  total: number;
  scheduled_at: string | null;
  created_at: string;
  service_title: string;
  provider_name: string | null;
  provider_avatar: string | null;
  provider_id: string | null;
  addr_text: string;
};

export type NotifRow = {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  body: string | null;
  data: any;
  read: boolean | null;
  created_at: string;
};

export type RatingTrigger = {
  bookingId: string;
  providerId: string;
  providerName: string;
  providerAvatar: string | null;
};

// Global events dispatched across the whole app
export type RealtimeEvent =
  | { type: "booking_status_changed"; bookingId: string; oldStatus: string; newStatus: string }
  | { type: "new_booking"; bookingId: string }
  | { type: "notification_received"; notifId: string; notifType: string | null }
  | { type: "provider_order_updated"; bookingId: string; status: string }
  | { type: "badge_updated"; unreadCount: number };

type EventListener = (event: RealtimeEvent) => void;

// ── Global Event Dispatcher ────────────────────────────────────────────────

class RealtimeEventDispatcher {
  private listeners = new Set<EventListener>();

  subscribe(fn: EventListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  dispatch(event: RealtimeEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch {}
    });
  }
}

export const realtimeEvents = new RealtimeEventDispatcher();

// ── Store Context Type ─────────────────────────────────────────────────────

type StoreCtx = {
  bookings: BookingRow[];
  bookingsLoading: boolean;
  refreshBookings: () => Promise<void>;

  notifs: NotifRow[];
  notifsLoading: boolean;
  unreadCount: number;
  refreshNotifs: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;

  ratingTrigger: RatingTrigger | null;
  dismissRatingTrigger: () => void;

  /** Number of active realtime channels */
  channelCount: number;
};

const StoreCtx = createContext<StoreCtx | null>(null);

// ── AsyncStorage helpers ───────────────────────────────────────────────────

const RATED_KEY = "v1_rated_bookings";

async function getAlreadyRated(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(RATED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

async function markRated(bookingId: string): Promise<void> {
  try {
    const set = await getAlreadyRated();
    set.add(bookingId);
    await AsyncStorage.setItem(RATED_KEY, JSON.stringify([...set]));
  } catch {}
}

// ── Row mapper ─────────────────────────────────────────────────────────────

function mapBooking(b: any): BookingRow {
  return {
    id: b.id,
    status: b.status || "pending",
    total: Number(b.total || 0),
    scheduled_at: b.scheduled_at,
    created_at: b.created_at,
    service_title: b.services?.title_ar || "خدمة تنظيف",
    provider_name: b.provider?.full_name || null,
    provider_avatar: b.provider?.avatar_url || null,
    provider_id: b.provider_id || null,
    addr_text:
      [b.addresses?.district, b.addresses?.city].filter(Boolean).join("، ") ||
      b.addresses?.street ||
      "—",
  };
}

// ── Generation counter for stale-state prevention ─────────────────────────

function makeGen() {
  let g = 0;
  return { next: () => ++g, current: () => g };
}

// ── Provider ───────────────────────────────────────────────────────────────

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const uid = session?.user?.id ?? null;
  const isCustomer = !profile || profile.role === "user";
  const isProvider = profile?.role === "provider";

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [ratingTrigger, setRatingTrigger] = useState<RatingTrigger | null>(null);
  const [channelCount, setChannelCount] = useState(0);

  const ratedSetRef = useRef<Set<string>>(new Set());
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const bookingGenRef = useRef(makeGen());
  const notifGenRef = useRef(makeGen());

  // ── Channel management ──────────────────────────────────────────────────

  const removeAllChannels = useCallback(() => {
    channelsRef.current.forEach((ch) => {
      supabase.removeChannel(ch).catch(() => {});
    });
    channelsRef.current = [];
    setChannelCount(0);
    console.log("[realtime] ✓ all channels removed");
  }, []);

  const registerChannel = useCallback((ch: ReturnType<typeof supabase.channel>) => {
    channelsRef.current.push(ch);
    setChannelCount((n) => n + 1);
  }, []);

  // ── Data loaders ────────────────────────────────────────────────────────

  const loadBookings = useCallback(async (userId: string) => {
    const gen = bookingGenRef.current.next();
    setBookingsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, status, total, scheduled_at, created_at, provider_id,
          services:service_id(title_ar),
          provider:profiles!bookings_provider_id_fkey(full_name, avatar_url),
          addresses:address_id(street, district, city)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (gen !== bookingGenRef.current.current()) return; // stale
      if (!error && data) {
        const mapped = data.map(mapBooking);
        setBookings(mapped);
        console.log(`[realtime] bookings: ${mapped.length} loaded`);
      }
    } catch (e) {
      console.log("[realtime] loadBookings error:", (e as Error).message);
    } finally {
      if (gen === bookingGenRef.current.current()) setBookingsLoading(false);
    }
  }, []);

  const loadNotifs = useCallback(async (userId: string) => {
    const gen = notifGenRef.current.next();
    setNotifsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (gen !== notifGenRef.current.current()) return; // stale
      if (!error && data) {
        setNotifs(data as NotifRow[]);
        const unread = (data as NotifRow[]).filter((n) => !n.read).length;
        realtimeEvents.dispatch({ type: "badge_updated", unreadCount: unread });
        console.log(`[realtime] notifs: ${data.length} loaded, ${unread} unread`);
      }
    } catch (e) {
      console.log("[realtime] loadNotifs error:", (e as Error).message);
    } finally {
      if (gen === notifGenRef.current.current()) setNotifsLoading(false);
    }
  }, []);

  // ── Rating trigger ──────────────────────────────────────────────────────

  const maybeFireRating = useCallback(
    async (booking: BookingRow) => {
      if (!isCustomer) return;
      if (booking.status !== "completed") return;
      if (ratedSetRef.current.has(booking.id)) return;

      const persisted = await getAlreadyRated();
      if (persisted.has(booking.id)) {
        ratedSetRef.current.add(booking.id);
        return;
      }

      try {
        const { data: existing } = await supabase
          .from("reviews")
          .select("id")
          .eq("booking_id", booking.id)
          .maybeSingle();
        if (existing) {
          ratedSetRef.current.add(booking.id);
          await markRated(booking.id);
          return;
        }
      } catch {}

      ratedSetRef.current.add(booking.id);
      setRatingTrigger({
        bookingId: booking.id,
        providerId: booking.provider_id ?? "",
        providerName: booking.provider_name ?? "مزود الخدمة",
        providerAvatar: booking.provider_avatar,
      });
    },
    [isCustomer],
  );

  // ── Subscribe ───────────────────────────────────────────────────────────

  const subscribe = useCallback(
    (userId: string) => {
      removeAllChannels();

      // Channel 1: customer bookings
      const bkCh = supabase
        .channel(`store-bookings-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${userId}` },
          async (payload: any) => {
            const updated = payload.new;
            console.log(`[realtime] [store-bookings] ${payload.eventType} id=${updated?.id} status=${updated?.status}`);

            if (!updated?.id) {
              await loadBookings(userId);
              return;
            }

            setBookings((prev) => {
              const exists = prev.find((b) => b.id === updated.id);
              if (!exists) {
                loadBookings(userId);
                return prev;
              }
              const oldStatus = exists.status;
              const merged = prev.map((b) =>
                b.id === updated.id
                  ? {
                      ...b,
                      status: updated.status ?? b.status,
                      total: Number(updated.total ?? b.total),
                      provider_id: updated.provider_id ?? b.provider_id,
                    }
                  : b,
              );
              if (oldStatus !== updated.status) {
                realtimeEvents.dispatch({
                  type: "booking_status_changed",
                  bookingId: updated.id,
                  oldStatus,
                  newStatus: updated.status,
                });
              }
              const mergedRow = merged.find((b) => b.id === updated.id);
              if (mergedRow) maybeFireRating(mergedRow);
              return merged;
            });
          },
        )
        .subscribe((s) => console.log(`[realtime] store-bookings-${userId}: ${s}`));
      registerChannel(bkCh);

      // Channel 2: customer notifications
      const notifCh = supabase
        .channel(`store-notifs-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload: any) => {
            console.log(`[realtime] [store-notifs] ${payload.eventType} id=${payload.new?.id}`);
            loadNotifs(userId);
            if (payload.eventType === "INSERT" && payload.new?.id) {
              realtimeEvents.dispatch({
                type: "notification_received",
                notifId: payload.new.id,
                notifType: payload.new.type ?? null,
              });
            }
          },
        )
        .subscribe((s) => console.log(`[realtime] store-notifs-${userId}: ${s}`));
      registerChannel(notifCh);

      // Channel 3: provider pending orders (global bookings watcher)
      if (isProvider) {
        const provCh = supabase
          .channel(`store-provider-orders`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "bookings" },
            (payload: any) => {
              const bk = payload.new ?? payload.old;
              if (!bk?.id) return;
              console.log(`[realtime] [store-provider-orders] ${payload.eventType} id=${bk.id} status=${bk.status}`);
              realtimeEvents.dispatch({
                type: "provider_order_updated",
                bookingId: bk.id,
                status: bk.status ?? "unknown",
              });
            },
          )
          .subscribe((s) => console.log(`[realtime] store-provider-orders: ${s}`));
        registerChannel(provCh);
      }

      // Channel 4: admin dashboard — new booking inserts
      const adminCh = supabase
        .channel(`store-admin-bookings`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bookings" },
          (payload: any) => {
            const bk = payload.new;
            if (!bk?.id) return;
            console.log(`[realtime] [store-admin-bookings] NEW booking id=${bk.id}`);
            realtimeEvents.dispatch({ type: "new_booking", bookingId: bk.id });
          },
        )
        .subscribe((s) => console.log(`[realtime] store-admin-bookings: ${s}`));
      registerChannel(adminCh);
    },
    [removeAllChannels, registerChannel, loadBookings, loadNotifs, maybeFireRating, isProvider],
  );

  // ── Auth effect ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) {
      setBookings([]);
      setNotifs([]);
      removeAllChannels();
      return;
    }
    if (isCustomer) loadBookings(uid);
    loadNotifs(uid);
    subscribe(uid);
    getAlreadyRated().then((s) => { ratedSetRef.current = s; });
    return () => { removeAllChannels(); };
  }, [uid, isCustomer, subscribe]);

  // ── Public API ──────────────────────────────────────────────────────────

  const refreshBookings = useCallback(async () => {
    if (uid) await loadBookings(uid);
  }, [uid, loadBookings]);

  const refreshNotifs = useCallback(async () => {
    if (uid) await loadNotifs(uid);
  }, [uid, loadNotifs]);

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    realtimeEvents.dispatch({ type: "badge_updated", unreadCount: 0 });
  }, [uid]);

  const markOneRead = useCallback(async (id: string) => {
    if (!uid) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      realtimeEvents.dispatch({ type: "badge_updated", unreadCount: next.filter((n) => !n.read).length });
      return next;
    });
  }, [uid]);

  const dismissRatingTrigger = useCallback(() => {
    if (ratingTrigger) markRated(ratingTrigger.bookingId);
    setRatingTrigger(null);
  }, [ratingTrigger]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <StoreCtx.Provider
      value={{
        bookings, bookingsLoading, refreshBookings,
        notifs, notifsLoading, unreadCount, refreshNotifs, markAllRead, markOneRead,
        ratingTrigger, dismissRatingTrigger,
        channelCount,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useRealtimeStore(): StoreCtx {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useRealtimeStore must be inside RealtimeProvider");
  return ctx;
}

export function useRealtimeBookings() {
  const { bookings, bookingsLoading, refreshBookings } = useRealtimeStore();
  return { bookings, loading: bookingsLoading, refresh: refreshBookings };
}

export function useRealtimeNotifs() {
  const { notifs, notifsLoading, unreadCount, refreshNotifs, markAllRead, markOneRead } =
    useRealtimeStore();
  return { notifs, loading: notifsLoading, unreadCount, refresh: refreshNotifs, markAllRead, markOneRead };
}

/**
 * Subscribe to global realtime events from anywhere in the app.
 * Automatically cleaned up when the component unmounts.
 */
export function useRealtimeEvents(listener: EventListener, deps: React.DependencyList = []) {
  useEffect(() => {
    return realtimeEvents.subscribe(listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
