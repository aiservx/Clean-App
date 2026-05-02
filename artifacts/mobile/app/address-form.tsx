import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/lib/i18n";
import { getCurrentResolved, ResolvedAddress } from "@/lib/location";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export default function AddressForm() {
  const colors = useColors();
  const { t } = useI18n();
  const { session } = useAuth();
  const [type, setType] = useState("home");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [city, setCity] = useState("");
  const [defaultAddr, setDefaultAddr] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 24.7136, lng: 46.6753 });
  const [resolved, setResolved] = useState<ResolvedAddress | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const tried = useRef(false);

  const TYPES = [
    { id: "home", l: t("type_home"), i: "home" },
    { id: "work", l: t("type_work"), i: "briefcase" },
    { id: "family", l: t("type_family"), i: "users" },
    { id: "other", l: t("type_other"), i: "map-pin" },
  ];

  const fetchLocation = async () => {
    setLocating(true);
    try {
      const r = await getCurrentResolved();
      if (!r) {
        Alert.alert(t("permission_denied"), t("enable_location"));
        return;
      }
      setCoords({ lat: r.lat, lng: r.lng });
      setResolved(r);
      if (!city && r.city) setCity(r.city);
      if (!details && r.formatted) setDetails(r.formatted);
    } finally {
      setLocating(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    if (!tried.current) {
      tried.current = true;
      fetchLocation();
    }
  }, []);

  const onSave = async () => {
    if (!session?.user) {
      Alert.alert(t("error"), t("enter_credentials"));
      return;
    }
    if (!title.trim() || !details.trim()) {
      Alert.alert(t("error"), t("address_details"));
      return;
    }
    setSaving(true);
    try {
      // If marking default, unset previous default first
      if (defaultAddr) {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", session.user.id);
      }
      const { error } = await supabase.from("addresses").insert({
        user_id: session.user.id,
        title: title.trim(),
        city: city.trim() || null,
        street: details.trim(),
        district: resolved?.district || null,
        region: resolved?.region || null,
        lat: coords.lat,
        lng: coords.lng,
        is_default: defaultAddr,
      });
      if (error) {
        Alert.alert(t("error"), error.message);
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t("new_address")} subtitle={t("pin_on_map")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.mapWrap}>
          <AppMap
            style={StyleSheet.absoluteFill}
            region={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            markers={[{ id: "me", coordinate: { latitude: coords.lat, longitude: coords.lng }, color: colors.primary }]}
          />
          <View style={styles.pin} pointerEvents="none">
            <MaterialCommunityIcons name="map-marker" size={42} color={colors.primary} />
          </View>
          <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: "#FFF" }]} onPress={fetchLocation} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.foreground} />
            )}
          </TouchableOpacity>
        </View>

        {resolved ? (
          <View style={[styles.detected, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Feather name="map-pin" size={14} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 11, color: colors.mutedForeground, textAlign: "right" }}>{t("detected_address")}</Text>
              <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 13, color: colors.foreground, textAlign: "right" }} numberOfLines={2}>{resolved.formatted}</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.autoBtn, { borderColor: colors.primary }]} onPress={fetchLocation} disabled={locating}>
          <Feather name="navigation" size={14} color={colors.primary} />
          <Text style={[styles.autoT, { color: colors.primary }]}>{t("use_my_location")}</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.foreground }]}>{t("address_type")}</Text>
        <View style={styles.typesGrid}>
          {TYPES.map((tp) => {
            const a = type === tp.id;
            return (
              <TouchableOpacity
                key={tp.id}
                onPress={() => setType(tp.id)}
                style={[styles.typeCard, { backgroundColor: a ? colors.primary : colors.card, borderColor: a ? colors.primary : colors.border }]}
              >
                <Feather name={tp.i as any} size={18} color={a ? "#FFF" : colors.foreground} />
                <Text style={[styles.typeT, { color: a ? "#FFF" : colors.foreground }]}>{tp.l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>{t("address_name")}</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]} placeholder={t("address_name_ph")} placeholderTextColor={colors.mutedForeground} value={title} onChangeText={setTitle} textAlign="right" />

        <Text style={[styles.label, { color: colors.foreground }]}>{t("city")}</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]} value={city} onChangeText={setCity} textAlign="right" />

        <Text style={[styles.label, { color: colors.foreground }]}>{t("address_details")}</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, height: 80, paddingTop: 12 }]} placeholder={t("address_details_ph")} placeholderTextColor={colors.mutedForeground} value={details} onChangeText={setDetails} textAlign="right" multiline />

        <TouchableOpacity onPress={() => setDefaultAddr(!defaultAddr)} style={styles.defRow}>
          <View style={[styles.checkBox, { borderColor: colors.primary, backgroundColor: defaultAddr ? colors.primary : "transparent" }]}>
            {defaultAddr && <Feather name="check" size={12} color="#FFF" />}
          </View>
          <Text style={[styles.defT, { color: colors.foreground }]}>{t("set_default")}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveT}>{t("save_address")}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  mapWrap: { height: 220, borderRadius: 18, overflow: "hidden", marginBottom: 10, position: "relative" },
  pin: { position: "absolute", top: "50%", left: "50%", marginLeft: -21, marginTop: -36 },
  gpsBtn: { position: "absolute", bottom: 10, left: 10, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  detected: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  autoBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 6, marginBottom: 14, borderStyle: "dashed" },
  autoT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right", marginBottom: 6, marginTop: 8 },
  typesGrid: { flexDirection: "row-reverse", gap: 8 },
  typeCard: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1, gap: 4 },
  typeT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontFamily: "Tajawal_500Medium", fontSize: 13 },
  defRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 12 },
  checkBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  defT: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24 },
  saveBtn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  saveT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
