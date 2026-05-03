import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const METHODS = [
  { id: "bank", l: "حوالة بنكية (IBAN)", s: "خلال 24 ساعة", i: "credit-card", c: "#16C47F" },
  { id: "stc", l: "STC Pay", s: "فوري", i: "smartphone", c: "#4F008C" },
  { id: "wallet", l: "محفظة محلية", s: "فوري", i: "tag", c: "#2F80ED" },
];

const QUICK = [100, 250, 500, 1000];

export default function Withdraw() {
  const colors = useColors();
  const { session } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [iban, setIban] = useState("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const uid = session.user.id;
    const [{ data: comp }, { data: payouts }, { data: prov }] = await Promise.all([
      supabase.from("bookings").select("total").eq("provider_id", uid).eq("status", "completed"),
      supabase.from("payouts").select("amount, status").eq("provider_id", uid),
      supabase.from("providers").select("iban").eq("id", uid).maybeSingle(),
    ]);
    const gross = (comp ?? []).reduce((s: number, r: any) => s + Number(r.total || 0) * 0.85, 0);
    const out = (payouts ?? []).filter((p: any) => p.status !== "failed").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    setBalance(Math.max(0, gross - out));
    if (prov?.iban) setIban(prov.iban);
    setLoading(false);
  }, [session]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  const submit = async () => {
    if (!session?.user) return Alert.alert("خطأ", "سجّل الدخول أولاً");
    const amt = Number(amount);
    if (!amt || amt <= 0) return Alert.alert("تنبيه", "أدخل مبلغ صحيح");
    if (amt > balance) return Alert.alert("تنبيه", `الرصيد المتاح فقط ${balance.toFixed(2)} ر.س`);
    if (method === "bank" && !iban.trim()) return Alert.alert("تنبيه", "أدخل رقم الـ IBAN للتحويل البنكي");

    setBusy(true);
    const { error } = await supabase.from("payouts").insert({
      provider_id: session.user.id,
      amount: amt,
      iban: method === "bank" ? iban.trim() : null,
      status: "pending",
    });
    if (error) {
      setBusy(false);
      return Alert.alert("خطأ", error.message);
    }
    // Save IBAN on provider for future
    if (method === "bank" && iban.trim()) {
      await supabase.from("providers").update({ iban: iban.trim() }).eq("id", session.user.id);
    }
    // Notify admin via notifications table (best-effort)
    await supabase.from("notifications").insert({
      user_id: session.user.id,
      title: "طلب سحب جديد",
      body: `طلب سحب بقيمة ${amt} ر.س`,
      type: "payout_requested",
      data: { amount: amt, method },
    }).then(() => null, () => null);

    setBusy(false);
    Alert.alert("✓ تم الإرسال", `تم تسجيل طلب السحب بقيمة ${amt} ر.س. سيُحوَّل خلال 24 ساعة.`, [
      { text: "حسناً", onPress: () => router.back() },
    ]);
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="سحب الأرباح" subtitle="رصيدك المتاح للسحب" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.balCard}>
          <Text style={styles.balL}>الرصيد المتاح</Text>
          {loading ? (
            <ActivityIndicator color="#FFF" style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.balV}>{balance.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} <Text style={{ fontSize: 14 }}>ر.س</Text></Text>
          )}
        </LinearGradient>

        <Text style={[styles.l, { color: colors.foreground }]}>المبلغ المراد سحبه</Text>
        <View style={[styles.amountInput, { backgroundColor: colors.card }]}>
          <Text style={[styles.curr, { color: colors.mutedForeground }]}>ر.س</Text>
          <TextInput
            style={[styles.amount, { color: colors.foreground }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            textAlign="center"
          />
        </View>

        <View style={styles.quickRow}>
          {QUICK.map((q) => (
            <TouchableOpacity key={q} onPress={() => setAmount(String(q))} style={[styles.qBtn, { backgroundColor: amount === String(q) ? colors.primary : colors.card }]}>
              <Text style={[styles.qT, { color: amount === String(q) ? "#FFF" : colors.foreground }]}>{q}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setAmount(String(Math.floor(balance)))} style={[styles.qBtn, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.qT, { color: colors.primary }]}>الكل</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.l, { color: colors.foreground }]}>طريقة السحب</Text>
        <View style={{ gap: 8 }}>
          {METHODS.map((m) => {
            const a = method === m.id;
            return (
              <TouchableOpacity key={m.id} onPress={() => setMethod(m.id)} style={[styles.mRow, { backgroundColor: colors.card, borderColor: a ? colors.primary : "transparent" }]}>
                <View style={[styles.mIcon, { backgroundColor: m.c + "22" }]}>
                  <Feather name={m.i as any} size={18} color={m.c} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={[styles.mL, { color: colors.foreground }]}>{m.l}</Text>
                  <Text style={[styles.mS, { color: colors.mutedForeground }]}>{m.s}</Text>
                </View>
                <View style={[styles.radio, { borderColor: a ? colors.primary : colors.border }]}>
                  {a && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {method === "bank" && (
          <>
            <Text style={[styles.l, { color: colors.foreground }]}>رقم الـ IBAN</Text>
            <View style={[styles.amountInput, { backgroundColor: colors.card, paddingVertical: 14 }]}>
              <TextInput
                style={{ fontFamily: "Tajawal_700Bold", fontSize: 14, color: colors.foreground, flex: 1 }}
                value={iban}
                onChangeText={setIban}
                placeholder="SA00 0000 0000 0000 0000"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
              />
            </View>
          </>
        )}

        <View style={[styles.summary, { backgroundColor: colors.card }]}>
          {[
            { l: "المبلغ", v: `${amount || 0} ر.س` },
            { l: "رسوم السحب", v: "0 ر.س", g: true },
            { l: "الإجمالي للتحويل", v: `${amount || 0} ر.س`, b: true },
          ].map((r) => (
            <View key={r.l} style={styles.sRow}>
              <Text style={[styles.sL, { color: r.b ? colors.foreground : colors.mutedForeground, fontFamily: r.b ? "Tajawal_700Bold" : "Tajawal_500Medium" }]}>{r.l}</Text>
              <Text style={[styles.sV, { color: r.g ? colors.success : colors.foreground, fontFamily: r.b ? "Tajawal_700Bold" : "Tajawal_500Medium", fontSize: r.b ? 14 : 12 }]}>{r.v}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: busy ? colors.muted : colors.primary }]} onPress={submit} disabled={busy}>
          <Feather name="arrow-up" size={16} color="#FFF" />
          <Text style={styles.btnT}>{busy ? "جاري الإرسال..." : "تأكيد طلب السحب"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  balCard: { padding: 18, borderRadius: 18, alignItems: "flex-end", marginBottom: 14 },
  balL: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 11 },
  balV: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 30, marginTop: 4 },
  l: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 8, marginTop: 6 },
  amountInput: { borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 },
  amount: { fontFamily: "Tajawal_700Bold", fontSize: 36, minWidth: 100 },
  curr: { fontFamily: "Tajawal_500Medium", fontSize: 14 },
  quickRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  qBtn: { flex: 1, paddingVertical: 8, borderRadius: 100, alignItems: "center" },
  qT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  mRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  mL: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  mS: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 1 },
  mIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summary: { padding: 14, borderRadius: 14, marginTop: 14, gap: 8 },
  sRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sL: { fontSize: 11 },
  sV: {},
  bottom: { position: "absolute", bottom: 0, start: 0, end: 0, padding: 14, paddingBottom: 24 },
  btn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
