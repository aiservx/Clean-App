import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Platform, Alert, ActivityIndicator } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const SERVICES = ["تنظيف منازل", "تنظيف عميق", "تنظيف مكاتب", "تنظيف فلل", "تنظيف كنب", "تنظيف سجاد", "تنظيف مطابخ"];
const AREAS = ["النخيل", "العليا", "الورود", "الصحافة", "الياسمين", "الملقا", "حطين"];

export default function ProviderEdit() {
  const colors = useColors();
  const { session, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [exp, setExp] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const uid = session.user.id;
    const [{ data: prof }, { data: prov }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", uid).maybeSingle(),
      supabase.from("providers").select("bio, experience_years, hourly_rate, services, areas").eq("id", uid).maybeSingle(),
    ]);
    if (prof) {
      setName(prof.full_name || "");
      setAvatarUrl(prof.avatar_url || null);
    }
    if (prov) {
      setBio(prov.bio || "");
      setExp(String(prov.experience_years || ""));
      setPrice(String(prov.hourly_rate || ""));
      setServices(Array.isArray(prov.services) ? prov.services : []);
      setAreas(Array.isArray(prov.areas) ? prov.areas : []);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const toggle = (arr: string[], setArr: any, v: string) =>
    arr.includes(v) ? setArr(arr.filter((x) => x !== v)) : setArr([...arr, v]);

  const pickImage = async () => {
    if (Platform.OS === "web") return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  const save = async () => {
    if (!session?.user) return;
    const uid = session.user.id;
    setSaving(true);
    try {
      let newAvatarUrl = avatarUrl;

      if (photo) {
        const ext = photo.split(".").pop() || "jpg";
        const fileName = `${uid}-${Date.now()}.${ext}`;
        const response = await fetch(photo);
        const blob = await response.blob();
        const { error: upErr } = await supabase.storage.from("avatars").upload(fileName, blob, { upsert: true, contentType: `image/${ext}` });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
          newAvatarUrl = publicUrl;
        }
      }

      const providerPayload: Record<string, any> = {
        bio: bio.trim(),
        experience_years: Number(exp) || 0,
        hourly_rate: Number(price) || 0,
      };
      if (services.length > 0) providerPayload.services = services;
      if (areas.length > 0) providerPayload.areas = areas;

      const [profileResult, providerResult] = await Promise.all([
        supabase.from("profiles").update({ full_name: name.trim(), avatar_url: newAvatarUrl }).eq("id", uid),
        supabase.from("providers").update(providerPayload).eq("id", uid),
      ]);

      if (providerResult.error?.message?.includes("column") && providerResult.error.message.includes("does not exist")) {
        const { bio: b, experience_years: e, hourly_rate: h } = providerPayload;
        await supabase.from("providers").update({ bio: b, experience_years: e, hourly_rate: h }).eq("id", uid);
      }

      await refreshProfile();
      Alert.alert("✓ تم الحفظ", "تم تحديث بياناتك بنجاح", [
        { text: "حسناً", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "فشل حفظ البيانات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.c, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const avatarSrc = photo ? { uri: photo } : avatarUrl ? { uri: avatarUrl } : null;

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="البروفايل المهني" subtitle="تحديث معلوماتك للعملاء" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.avW}>
          {avatarSrc ? (
            <Image source={avatarSrc} style={styles.av} />
          ) : (
            <View style={[styles.av, { backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 32, color: colors.primary }}>
                {name.charAt(0) || "م"}
              </Text>
            </View>
          )}
          <TouchableOpacity style={[styles.cam, { backgroundColor: colors.primary }]} onPress={pickImage}>
            <Feather name="camera" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={pickImage}><Text style={[styles.changeT, { color: colors.primary }]}>تغيير الصورة</Text></TouchableOpacity>

        <Text style={[styles.l, { color: colors.foreground }]}>الاسم الكامل</Text>
        <TextInput style={[styles.in, { backgroundColor: colors.card, color: colors.foreground }]} value={name} onChangeText={setName} textAlign="right" />

        <Text style={[styles.l, { color: colors.foreground }]}>نبذة عنك</Text>
        <TextInput style={[styles.in, { backgroundColor: colors.card, color: colors.foreground, height: 80, paddingTop: 12 }]} value={bio} onChangeText={setBio} multiline textAlign="right" />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.l, { color: colors.foreground }]}>سنوات الخبرة</Text>
            <TextInput style={[styles.in, { backgroundColor: colors.card, color: colors.foreground }]} value={exp} onChangeText={setExp} keyboardType="numeric" textAlign="right" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.l, { color: colors.foreground }]}>السعر/الساعة (ر.س)</Text>
            <TextInput style={[styles.in, { backgroundColor: colors.card, color: colors.foreground }]} value={price} onChangeText={setPrice} keyboardType="numeric" textAlign="right" />
          </View>
        </View>

        <Text style={[styles.l, { color: colors.foreground }]}>الخدمات التي تقدمها</Text>
        <View style={styles.tags}>
          {SERVICES.map((s) => {
            const a = services.includes(s);
            return (
              <TouchableOpacity key={s} onPress={() => toggle(services, setServices, s)} style={[styles.tag, { backgroundColor: a ? colors.primary : colors.card, borderColor: a ? colors.primary : colors.border }]}>
                <Text style={[styles.tagT, { color: a ? "#FFF" : colors.foreground }]}>{s}</Text>
                {a && <Feather name="check" size={12} color="#FFF" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.l, { color: colors.foreground }]}>مناطق العمل</Text>
        <View style={styles.tags}>
          {AREAS.map((s) => {
            const a = areas.includes(s);
            return (
              <TouchableOpacity key={s} onPress={() => toggle(areas, setAreas, s)} style={[styles.tag, { backgroundColor: a ? colors.accent : colors.card, borderColor: a ? colors.accent : colors.border }]}>
                <Text style={[styles.tagT, { color: a ? "#FFF" : colors.foreground }]}>{s}</Text>
                {a && <Feather name="check" size={12} color="#FFF" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.l, { color: colors.foreground }]}>وثائق التحقق</Text>
        <TouchableOpacity style={[styles.docBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Feather name="upload" size={16} color={colors.primary} />
          <Text style={[styles.docT, { color: colors.primary }]}>رفع الهوية الوطنية</Text>
          <MaterialCommunityIcons name="check-decagram" size={16} color={colors.success} />
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveT}>حفظ التغييرات</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  avW: { alignSelf: "center", marginBottom: 4, position: "relative", marginTop: 12 },
  av: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#FFF" },
  cam: { position: "absolute", bottom: 0, left: 0, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFF" },
  changeT: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "center", marginBottom: 16 },
  l: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "right", marginBottom: 6, marginTop: 8 },
  in: { height: 46, borderRadius: 12, paddingHorizontal: 14, fontFamily: "Tajawal_500Medium", fontSize: 13 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  tagT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  docBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", justifyContent: "center" },
  docT: { fontFamily: "Tajawal_700Bold", fontSize: 13, flex: 1, textAlign: "center" },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24 },
  saveBtn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  saveT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
