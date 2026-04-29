import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const SERVICES = ["تنظيف منازل", "تنظيف عميق", "تنظيف مكاتب", "تنظيف فلل", "تنظيف كنب", "تنظيف سجاد", "تنظيف مطابخ"];
const AREAS = ["النخيل", "العليا", "الورود", "الصحافة", "الياسمين", "الملقا", "حطين"];

export default function ProviderEdit() {
  const colors = useColors();
  const [name, setName] = useState("أحمد علي");
  const [bio, setBio] = useState("عامل نظافة محترف بخبرة 5 سنوات");
  const [exp, setExp] = useState("5");
  const [price, setPrice] = useState("85");
  const [photo, setPhoto] = useState<string | null>(null);
  const [services, setServices] = useState(["تنظيف منازل", "تنظيف عميق"]);
  const [areas, setAreas] = useState(["النخيل", "العليا"]);

  const toggle = (arr: string[], setArr: any, v: string) => arr.includes(v) ? setArr(arr.filter((x) => x !== v)) : setArr([...arr, v]);

  const pickImage = async () => {
    if (Platform.OS === "web") return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="البروفايل المهني" subtitle="تحديث معلوماتك للعملاء" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.avW}>
          <Image source={photo ? { uri: photo } : require("@/assets/images/cleaner-fatima.png")} style={styles.av} />
          <TouchableOpacity style={[styles.cam, { backgroundColor: colors.primary }]} onPress={pickImage}>
            <Feather name="camera" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={pickImage}><Text style={[styles.changeT, { color: colors.primary }]}>تغيير الصورة</Text></TouchableOpacity>

        <Text style={[styles.l, { color: colors.foreground }]}>الاسم الكامل</Text>
        <TextInput style={[styles.in, { backgroundColor: colors.card, color: colors.foreground }]} value={name} onChangeText={setName} textAlign="right" />

        <Text style={[styles.l, { color: colors.foreground }]}>نبذة عنك</Text>
        <TextInput style={[styles.in, { backgroundColor: colors.card, color: colors.foreground, height: 80, paddingTop: 12 }]} value={bio} onChangeText={setBio} multiline textAlign="right" />

        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
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
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.saveT}>حفظ التغييرات</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  avW: { alignSelf: "center", marginBottom: 4, position: "relative" },
  av: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#FFF" },
  cam: { position: "absolute", bottom: 0, left: 0, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFF" },
  changeT: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "center", marginBottom: 16 },
  l: { fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "right", marginBottom: 6, marginTop: 8 },
  in: { height: 46, borderRadius: 12, paddingHorizontal: 14, fontFamily: "Tajawal_500Medium", fontSize: 13 },
  tags: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  tagT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  docBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", justifyContent: "center" },
  docT: { fontFamily: "Tajawal_700Bold", fontSize: 13, flex: 1, textAlign: "center" },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24 },
  saveBtn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  saveT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
