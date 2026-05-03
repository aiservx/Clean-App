import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Platform, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function EditProfile() {
  const colors = useColors();
  const { profile, session, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || session?.user?.email || "");
  const [city, setCity] = useState("");
  const [photo, setPhoto] = useState<string | null>(profile?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [photoChanged, setPhotoChanged] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("تحتاج إذن الوصول إلى الصور");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!r.canceled && r.assets[0]) {
      setPhoto(r.assets[0].uri);
      setPhotoChanged(true);
    }
  };

  const save = async () => {
    if (!session?.user) return;
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url || null;

      // Upload photo if changed
      if (photoChanged && photo && !photo.startsWith("http")) {
        const ext = photo.split(".").pop() || "jpg";
        const fileName = `${session.user.id}/avatar-${Date.now()}.${ext}`;
        const response = await fetch(photo);
        const blob = await response.blob();
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
          avatarUrl = urlData.publicUrl;
        }
      }

      // Update profile in DB
      const { error } = await supabase.from("profiles").update({
        full_name: name.trim() || null,
        phone: phone.trim() || null,
        avatar_url: avatarUrl,
      }).eq("id", session.user.id);

      if (error) {
        Alert.alert("خطأ", error.message);
      } else {
        await refreshProfile();
        Alert.alert("تم", "تم حفظ التغييرات بنجاح", [
          { text: "حسناً", onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      Alert.alert("خطأ", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="تعديل الملف الشخصي" subtitle="تحديث بياناتك" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          <Image source={photo ? { uri: photo } : require("@/assets/images/default-avatar.png")} style={styles.avatar} />
          <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: colors.primary }]} onPress={pickImage}>
            <Feather name="camera" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.changeT, { color: colors.primary }]} onPress={pickImage}>تغيير الصورة الشخصية</Text>

        {[
          { l: "الاسم الكامل", v: name, s: setName, i: "user" },
          { l: "رقم الهاتف", v: phone, s: setPhone, i: "phone" },
          { l: "البريد الإلكتروني", v: email, s: setEmail, i: "mail", disabled: true },
          { l: "المدينة", v: city, s: setCity, i: "map-pin" },
        ].map((f) => (
          <View key={f.l}>
            <Text style={[styles.label, { color: colors.foreground }]}>{f.l}</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, opacity: (f as any).disabled ? 0.5 : 1 }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={f.v}
                onChangeText={f.s}
                textAlign="right"
                editable={!(f as any).disabled}
              />
              <Feather name={f.i as any} size={16} color={colors.mutedForeground} />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnT}>حفظ التغييرات</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  avatarWrap: { alignSelf: "center", marginBottom: 8, position: "relative" },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: "#FFF" },
  cameraBtn: { position: "absolute", bottom: 0, start: 0, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFF" },
  changeT: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "center", marginBottom: 18 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 12, marginBottom: 6, marginTop: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", height: 48, borderRadius: 12, paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13 },
  bottom: { position: "absolute", bottom: 0, start: 0, end: 0, padding: 14, paddingBottom: 24 },
  btn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
