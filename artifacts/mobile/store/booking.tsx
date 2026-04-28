import React, { createContext, useContext, useMemo, useState } from "react";

export type Cleaner = {
  id: string;
  name: string;
  rating: string;
  exp: string;
  image: any;
};

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
  cleanerId: string;
  paymentMethodId: string;
  setService: (s: ServiceItem) => void;
  setDateIndex: (i: number) => void;
  setTimeIndex: (i: number) => void;
  setCleanerId: (id: string) => void;
  setPaymentMethodId: (id: string) => void;
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
  const [dateIndex, setDateIndex] = useState<number>(2);
  const [timeIndex, setTimeIndex] = useState<number>(1);
  const [cleanerId, setCleanerId] = useState<string>("1");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("1");

  const value = useMemo<BookingState>(
    () => ({
      service,
      dateIndex,
      timeIndex,
      cleanerId,
      paymentMethodId,
      setService,
      setDateIndex,
      setTimeIndex,
      setCleanerId,
      setPaymentMethodId,
      reset: () => {
        setService(DEFAULT_SERVICE);
        setDateIndex(2);
        setTimeIndex(1);
        setCleanerId("1");
        setPaymentMethodId("1");
      },
    }),
    [service, dateIndex, timeIndex, cleanerId, paymentMethodId],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingState {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within a BookingProvider");
  return ctx;
}
