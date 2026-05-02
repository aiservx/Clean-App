/**
 * Centralized Realtime Store
 *
 * Manages ALL Supabase realtime subscriptions in one place so every screen
 * gets live updates regardless of which tab/screen is currently visible.
 *
 * Architecture:
 *  - One RealtimeProvider wraps the whole app (inside AuthProvider)
 *  - On login → subscribes to bookings + notifications for that user
 *  - On logout → unsubscribes everything, clears state
 *  - Exposes hooks: useRealtimeBookings, useRealtimeNotifs, useRatingTrigger
 *  - "Rating trigger" fires when any booking flips to "completed" for the first time
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

type StoreCtx = {
  // Bookings
  bookings: BookingRow[];
  bookingsLoading: boolean;
  refreshBookings: () => Promise<void>;

  // Notifications
  notifs: NotifRow[];
  notifsLoading: boolean;
  unreadCount: number;
  refreshNotifs: () => Promise<void>;
  markAllRead: () => Promise<void>;

  // Rating trigger
  ratingTrigger: RatingTrigger | null;
  dismissRatingTrigger: () => void;
};

const StoreCtx = createContext<StoreCtx | null>(null);

const RATED_KEY = "v0_rated_bookings";

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

// ── Provider ───────────────────────────────────────────────────────────────

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const uid = session?.user?.id ?? null;
  const isCustomer = !profile || profile.role === "user";

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  const [ratingTrigger, setRatingTrigger] = useState<RatingTrigger | null>(null);

  // Track which completed bookings we've already triggered a rating for
  const ratedSetRef = useRef<Set<string>>(new Set());

  // Track channels so we can clean them up
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const removeAllChannels = useCallback(() => {
    channelsRef.current.forEach((ch) => {
      supabase.removeChannel(ch).catch(() => {});
    });
    channelsRef.current = [];
  }, []);

  // ── Load bookings ────────────────────────────────────────────────────────

  const loadBookings = useCallback(async (userId: string) => {
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

      if (!error && data) {
        setBookings(data.map(mapBooking));
      }
    } catch (e) {
      console.log("[realtime] loadBookings error:", (e as Error).message);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  // ── Load notifications ───────────────────────────────────────────────────

  const loadNotifs = useCallback(async (userId: string) => {
    setNotifsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60);
      if (!error && data) {
        setNotifs(data as NotifRow[]);
      }
    } catch (e) {
      console.log("[realtime] loadNotifs error:", (e as Error).message);
    } finally {
      setNotifsLoading(false);
    }
  }, []);

  // ── Check & fire rating trigger ─────────────────────────────────────────

  const maybeFireRating = useCallback(
    async (booking: BookingRow) => {
      if (!isCustomer) return;
      if (booking.status !== "completed") return;
      if (ratedSetRef.current.has(booking.id)) return;

      // Check AsyncStorage persisted set
      const persisted = await getAlreadyRated();
      if (persisted.has(booking.id)) {
        ratedSetRef.current.add(booking.id);
        return;
      }

      // Check if already reviewed in DB
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

  // ── Subscribe to realtime channels ─────────────────────────────────────

  const subscribe = useCallback(
    (userId: string) => {
      removeAllChannels();

      // Channel 1: User's bookings
      const bkCh = supabase
        .channel(`store-bookings-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
            filter: `user_id=eq.${userId}`,
          },
          async (payload: any) => {
            const updated = payload.new;
            if (!updated?.id) {
              await loadBookings(userId);
              return;
            }
            // Optimistic update: merge into state
            setBookings((prev) => {
              const exists = prev.find((b) => b.id === updated.id);
              if (!exists) {
                // New booking — reload full list to get joined fields
                loadBookings(userId);
                return prev;
              }
              const merged = prev.map((b) =>
                b.id === updated.id
                  ? { ...b, status: updated.status, total: Number(updated.total ?? b.total) }
                  : b,
              );
              // Check for completed → rating trigger
              const mergedRow = merged.find((b) => b.id === updated.id);
              if (mergedRow) maybeFireRating(mergedRow);
              return merged;
            });
          },
        )
        .subscribe();

      // Channel 2: User's notifications
      const notifCh = supabase
        .channel(`store-notifs-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            loadNotifs(userId);
          },
        )
        .subscribe();

      channelsRef.current = [bkCh, notifCh];
    },
    [removeAllChannels, loadBookings, loadNotifs, maybeFireRating],
  );

  // ── React to auth changes ───────────────────────────────────────────────

  useEffect(() => {
    if (!uid) {
      setBookings([]);
      setNotifs([]);
      removeAllChannels();
      return;
    }

    // Load initial data
    if (isCustomer) loadBookings(uid);
    loadNotifs(uid);

    // Subscribe for live updates
    subscribe(uid);

    // Load persisted rated set to avoid duplicate triggers
    getAlreadyRated().then((set) => {
      ratedSetRef.current = set;
    });

    return () => {
      removeAllChannels();
    };
  }, [uid, isCustomer]);

  // ── Public API ─────────────────────────────────────────────────────────

  const refreshBookings = useCallback(async () => {
    if (uid) await loadBookings(uid);
  }, [uid, loadBookings]);

  const refreshNotifs = useCallback(async () => {
    if (uid) await loadNotifs(uid);
  }, [uid, loadNotifs]);

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", uid)
      .eq("read", false);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [uid]);

  const dismissRatingTrigger = useCallback(() => {
    if (ratingTrigger) {
      markRated(ratingTrigger.bookingId);
    }
    setRatingTrigger(null);
  }, [ratingTrigger]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <StoreCtx.Provider
      value={{
        bookings,
        bookingsLoading,
        refreshBookings,
        notifs,
        notifsLoading,
        unreadCount,
        refreshNotifs,
        markAllRead,
        ratingTrigger,
        dismissRatingTrigger,
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
  const { notifs, notifsLoading, unreadCount, refreshNotifs, markAllRead } = useRealtimeStore();
  return { notifs, loading: notifsLoading, unreadCount, refresh: refreshNotifs, markAllRead };
}
