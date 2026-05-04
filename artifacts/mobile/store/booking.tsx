import React, { createContext, useContext, useMemo, useState } from "react";

export type ServiceItem = {
  id: string;
  title: string;
  price: number;
  desc: string;
  image: any;
  color: string;
};

export type BookingState = {
  service: ServiceItem | null;
  dateIndex: number;
  timeIndex: number;
  cleanerId: string;            // selected provider id (uuid) or "" for auto
  paymentMethodId: string;
  scheduledIso: string | null;  // ISO timestamp for scheduled bookings
  addressId: string | null;     // selected address id (uuid)
  setService: (s: ServiceItem) => void;
  setDateIndex: (i: number) => void;
  setTimeIndex: (i: number) => void;
  setCleanerId: (id: string) => void;
  setPaymentMethodId: (id: string) => void;
  setScheduledIso: (iso: string | null) => void;
  setAddressId: (id: string | null) => void;
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

  const value = useMemo<BookingState>(
    () => ({
      service,
      dateIndex,
      timeIndex,
      cleanerId,
      paymentMethodId,
      scheduledIso,
      addressId,
      setService,
      setDateIndex,
      setTimeIndex,
      setCleanerId,
      setPaymentMethodId,
      setScheduledIso,
      setAddressId,
      reset: () => {
        setService(DEFAULT_SERVICE);
        setDateIndex(0);
        setTimeIndex(1);
        setCleanerId("");
        setPaymentMethodId("1");
        setScheduledIso(null);
        setAddressId(null);
      },
    }),
    [service, dateIndex, timeIndex, cleanerId, paymentMethodId, scheduledIso, addressId],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingState {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within a BookingProvider");
  return ctx;
}
