import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function EditProfile() {
  const colors = useColors();
  const { profile, session } = useAuth();
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || session?.user?.email || "");
  const [city, setCity] = useState("");
  const [photo, setPhoto] = useState<string | null>(profile?.avatar_url || null);

  const pickImage = async () => {
    if (Platform.OS === "web") return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="تعديل الملف الشخصي" subtitle="تحديث بياناتك" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary, fontSize: 32 }}>{(name || "م").charAt(0)}</Text>
            </View>
          )}
          <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: colors.primary }]} onPress={pickImage}>
            <Feather name="camera" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.changeT, { color: colors.primary }]} onPress={pickImage}>تغيير الصورة الشخصية</Text>

        {[
          { l: "الاسم الكامل", v: name, s: setName, i: "user" },
          { l: "رقم الهاتف", v: phone, s: setPhone, i: "phone" },
          { l: "البريد الإلكتروني", v: email, s: setEmail, i: "mail" },
          { l: "المدينة", v: city, s: setCity, i: "map-pin" },
        ].map((f) => (
          <View key={f.l}>
            <Text style={[styles.label, { color: colors.foreground }]}>{f.l}</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card }]}>
              <TextInput style={[styles.input, { color: colors.foreground }]} value={f.v} onChangeText={f.s} textAlign="right" />
              <Feather name={f.i as any} size={16} color={colors.mutedForeground} />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.btnT}>حفظ التغييرات</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  avatarWrap: { alignSelf: "center", marginBottom: 8, position: "relative" },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: "#FFF" },
  cameraBtn: { position: "absolute", bottom: 0, left: 0, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFF" },
  changeT: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "center", marginBottom: 18 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "right", marginBottom: 6, marginTop: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", height: 48, borderRadius: 12, paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24 },
  btn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
