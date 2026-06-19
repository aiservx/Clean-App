import React, { createContext, useContext, useMemo, useState } from "react";

export type ServiceItem = {
  id: string;
  title: string;
  price: number;
  desc: string;
  image: any;
  color: string;
};

export type RecurringFrequency = "once" | "weekly" | "biweekly" | "monthly";

export type BookingState = {
  service: ServiceItem | null;
  dateIndex: number;
  timeIndex: number;
  cleanerId: string;
  paymentMethodId: string;
  scheduledIso: string | null;
  addressId: string | null;
  recurringFrequency: RecurringFrequency;
  notes: string;
  setService: (s: ServiceItem) => void;
  setDateIndex: (i: number) => void;
  setTimeIndex: (i: number) => void;
  setCleanerId: (id: string) => void;
  setPaymentMethodId: (id: string) => void;
  setScheduledIso: (iso: string | null) => void;
  setAddressId: (id: string | null) => void;
  setRecurringFrequency: (f: RecurringFrequency) => void;
  setNotes: (n: string) => void;
  reset: () => void;
};

const BookingContext = createContext<BookingState | null>(null);

export const DEFAULT_SERVICE: ServiceItem = {
  id: "1",
  title: "تنظيف منازل",
  price: 85,
  desc: "تنظيف دوري شامل للمنزل",
  image: require("@/assets/images/illustration-sofa.png"),
  color: "#16C47F",
};

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [service, setService] = useState<ServiceItem | null>(DEFAULT_SERVICE);
  const [dateIndex, setDateIndex] = useState<number>(0);
  const [timeIndex, setTimeIndex] = useState<number>(1);
  const [cleanerId, setCleanerId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("1");
  const [scheduledIso, setScheduledIso] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>("once");
  const [notes, setNotes] = useState<string>("");

  const value = useMemo<BookingState>(
    () => ({
      service,
      dateIndex,
      timeIndex,
      cleanerId,
      paymentMethodId,
      scheduledIso,
      addressId,
      recurringFrequency,
      notes,
      setService,
      setDateIndex,
      setTimeIndex,
      setCleanerId,
      setPaymentMethodId,
      setScheduledIso,
      setAddressId,
      setRecurringFrequency,
      setNotes,
      reset: () => {
        setService(DEFAULT_SERVICE);
        setDateIndex(0);
        setTimeIndex(1);
        setCleanerId("");
        setPaymentMethodId("1");
        setScheduledIso(null);
        setAddressId(null);
        setRecurringFrequency("once");
        setNotes("");
      },
    }),
    [service, dateIndex, timeIndex, cleanerId, paymentMethodId, scheduledIso, addressId, recurringFrequency, notes],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingState {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within a BookingProvider");
  return ctx;
}
