import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Platform, Alert, ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Service = { id: string; title_ar: string; category_id: string };

async function uploadToStorage(uid: string, prefix: string, uri: string): Promise<string | null> {
  try {
    const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
    const fileName = `${prefix}/${uid}-${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from("avatars").upload(fileName, blob, {
      upsert: true,
      contentType: `image/${ext}`,
    });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return publicUrl;
  } catch {
    return null;
  }
}

export default function ProviderEdit() {
  const colors = useColors();
  const { session, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [exp, setExp] = useState("");
  const [price, setPrice] = useState("");

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarPicked, setNewAvatarPicked] = useState(false);

  const [docUri, setDocUri] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [newDocPicked, setNewDocPicked] = useState(false);

  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const uid = session.user.id;
    const [{ data: prof }, { data: prov }, { data: srvList }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", uid).maybeSingle(),
      supabase.from("providers").select("bio, experience_years, hourly_rate, service_ids").eq("id", uid).maybeSingle(),
      supabase.from("services").select("id, title_ar, category_id").eq("is_active", true).order("sort"),
    ]);
    if (prof) {
      setName(prof.full_name || "");
      setAvatarUrl(prof.avatar_url || null);
      setAvatarUri(prof.avatar_url || null);
    }
    if (prov) {
      setBio(prov.bio || "");
      setExp(String(prov.experience_years || ""));
      setPrice(String(prov.hourly_rate || ""));
      setSelectedIds(Array.isArray(prov.service_ids) ? prov.service_ids : []);
    }
    if (srvList) setAllServices(srvList as Service[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const toggleService = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setNewAvatarPicked(true);
    }
  };

  const pickDoc = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setDocUri(result.assets[0].uri);
      setNewDocPicked(true);
    }
  };

  const save = async () => {
    if (!session?.user) return;
    const uid = session.user.id;
    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;
      let finalDocUrl = docUrl;

      if (newAvatarPicked && avatarUri) {
        const uploaded = await uploadToStorage(uid, "avatars", avatarUri);
        if (uploaded) finalAvatarUrl = uploaded;
      }

      if (newDocPicked && docUri) {
        const uploaded = await uploadToStorage(uid, "docs", docUri);
        if (uploaded) finalDocUrl = uploaded;
      }

      await Promise.all([
        supabase.from("profiles").update({ full_name: name.trim(), avatar_url: finalAvatarUrl }).eq("id", uid),
        supabase.from("providers").update({
          bio: bio.trim(),
          experience_years: Number(exp) || 0,
          hourly_rate: Number(price) || 0,
          service_ids: selectedIds.length > 0 ? selectedIds : null,
        }).eq("id", uid),
      ]);

      await refreshProfile();
      Alert.alert("✓ تم الحفظ", "تم تحديث بياناتك بنجاح", [{ text: "حسناً", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "فشل حفظ البيانات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.c, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const avatarSrc = avatarUri ? { uri: avatarUri } : null;

  const categories = Array.from(new Set(allServices.map((sv) => sv.category_id)));
  const catLabel: Record<string, string> = {
    homes: "تنظيف المنازل",
    deep: "تنظيف عميق",
    offices: "مكاتب وشركات",
    sofa: "كنب وسجاد",
    marble: "رخام وبلاط",
  };

  return (
    <View style={[s.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="البروفايل المهني" subtitle="تحديث معلوماتك للعملاء" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <TouchableOpacity style={s.avW} onPress={pickAvatar} activeOpacity={0.85}>
          <Image source={avatarUri ? { uri: avatarUri } : require("@/assets/images/default-avatar.png")} style={s.av} />
          <View style={[s.camBadge, { backgroundColor: colors.primary }]}>
            <Feather name="camera" size={14} color="#FFF" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickAvatar}>
          <Text style={[s.changeT, { color: colors.primary }]}>تغيير الصورة الشخصية</Text>
        </TouchableOpacity>

        {/* Basic info */}
        <Text style={[s.l, { color: colors.foreground }]}>الاسم الكامل</Text>
        <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.foreground }]} value={name} onChangeText={setName} textAlign="right" />

        <Text style={[s.l, { color: colors.foreground }]}>نبذة عنك</Text>
        <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.foreground, height: 80, paddingTop: 12 }]} value={bio} onChangeText={setBio} multiline textAlign="right" />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.l, { color: colors.foreground }]}>سنوات الخبرة</Text>
            <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.foreground }]} value={exp} onChangeText={setExp} keyboardType="numeric" textAlign="right" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.l, { color: colors.foreground }]}>السعر/الساعة (ر.س)</Text>
            <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.foreground }]} value={price} onChangeText={setPrice} keyboardType="numeric" textAlign="right" />
          </View>
        </View>

        {/* Services */}
        <Text style={[s.l, { color: colors.foreground }]}>الخدمات التي تقدمها</Text>
        {allServices.length === 0 ? (
          <Text style={[s.hint, { color: colors.mutedForeground }]}>لا توجد خدمات متاحة</Text>
        ) : (
          categories.map((cat) => (
            <View key={cat} style={{ marginBottom: 8 }}>
              <Text style={[s.catLabel, { color: colors.mutedForeground }]}>{catLabel[cat] || cat}</Text>
              <View style={s.tags}>
                {allServices.filter((sv) => sv.category_id === cat).map((sv) => {
                  const active = selectedIds.includes(sv.id);
                  return (
                    <TouchableOpacity
                      key={sv.id}
                      onPress={() => toggleService(sv.id)}
                      style={[s.tag, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                    >
                      <Text style={[s.tagT, { color: active ? "#FFF" : colors.foreground }]}>{sv.title_ar}</Text>
                      {active && <Feather name="check" size={11} color="#FFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Service area info */}
        <View style={[s.infoBox, { backgroundColor: colors.primaryLight }]}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={colors.primary} />
          <Text style={[s.infoT, { color: colors.primary }]}>
            منطقة خدمتك تُحدَّد تلقائياً بناءً على موقعك عند تفعيل حالة "متاح" — لا تحتاج إلى اختيار مناطق يدوياً
          </Text>
        </View>

        {/* Document upload */}
        <Text style={[s.l, { color: colors.foreground }]}>وثائق التحقق</Text>
        <Text style={[s.hint, { color: colors.mutedForeground }]}>ارفع صورة الهوية الوطنية أو رخصة العمل</Text>

        {docUri ? (
          <View style={s.docPreviewWrap}>
            <Image source={{ uri: docUri }} style={s.docPreview} resizeMode="cover" />
            <TouchableOpacity style={[s.docChange, { backgroundColor: colors.primary }]} onPress={pickDoc}>
              <Feather name="refresh-cw" size={13} color="#FFF" />
              <Text style={s.docChangeT}>تغيير</Text>
            </TouchableOpacity>
            <View style={[s.docBadge, { backgroundColor: colors.success }]}>
              <Feather name="check" size={11} color="#FFF" />
              <Text style={s.docBadgeT}>تم الرفع</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[s.docBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickDoc}>
            <Feather name="upload-cloud" size={22} color={colors.primary} />
            <Text style={[s.docBtnT, { color: colors.foreground }]}>اضغط لرفع وثيقة التحقق</Text>
            <Text style={[s.docBtnS, { color: colors.mutedForeground }]}>JPG, PNG مقبولة</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      <View style={[s.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" size="small" />
            : <Text style={s.saveT}>حفظ التغييرات</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1 },
  avW: { alignSelf: "center", marginBottom: 4, position: "relative", marginTop: 12 },
  av: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#FFF" },
  camBadge: { position: "absolute", bottom: 0, end: 0, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFF" },
  changeT: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "center", marginBottom: 16 },
  l: { fontFamily: "Tajawal_700Bold", fontSize: 12, marginBottom: 6, marginTop: 14 },
  input: { height: 46, borderRadius: 12, paddingHorizontal: 14, fontFamily: "Tajawal_500Medium", fontSize: 13 },
  catLabel: { fontFamily: "Tajawal_700Bold", fontSize: 10, marginBottom: 4, marginTop: 4 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  tagT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 14, marginTop: 16 },
  infoT: { fontFamily: "Tajawal_500Medium", fontSize: 11, flex: 1, lineHeight: 18 },
  hint: { fontFamily: "Tajawal_400Regular", fontSize: 11, marginBottom: 6 },
  docBtn: { padding: 20, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", gap: 6 },
  docBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  docBtnS: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  docPreviewWrap: { borderRadius: 16, overflow: "hidden", height: 160, position: "relative" },
  docPreview: { width: "100%", height: "100%" },
  docChange: { position: "absolute", top: 8, start: 8, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  docChangeT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  docBadge: { position: "absolute", top: 8, end: 8, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  docBadgeT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  bottom: { position: "absolute", bottom: 0, start: 0, end: 0, padding: 14, paddingBottom: 28 },
  saveBtn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  saveT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
