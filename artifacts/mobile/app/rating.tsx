import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export default function RatingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([0, 1]);

  const ratingLabels = ["", "سيء جداً", "سيء", "متوسط", "ممتاز", "رائع"];

  const handleSubmit = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  const toggleTag = (i: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelectedTags((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>قيم الخدمة</Text>
          </View>
          <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
            <Feather name="chevron-right" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* Main Card */}
          <View style={[styles.mainCard, { backgroundColor: colors.card }]}>
            <Image source={require("@/assets/images/cleaner-fatima.png")} style={styles.avatar} />
            <Text style={[styles.name, { color: colors.foreground }]}>كيف كانت خدمة أحمد؟</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>رأيك يساعدنا في تحسين جودة خدماتنا</Text>
            
            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity 
                  key={star} 
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(star);
                  }}
                >
                  <MaterialCommunityIcons 
                    name={star <= rating ? "star" : "star-outline"} 
                    size={48} 
                    color={star <= rating ? colors.warning : colors.border} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.ratingLabel, { color: colors.warning }]}>{ratingLabels[rating]}</Text>
          </View>

          {/* Comment Section */}
          <View style={styles.commentSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اكتب تعليقك</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
              placeholder="اكتب ملاحظاتك هنا..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlign="right"
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />
          </View>

          {/* Quick Feedback Tags */}
          <View style={styles.tagsSection}>
             <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ما الذي أعجبك؟</Text>
             <View style={styles.tagsRow}>
                {["الالتزام بالوقت", "الاحترافية", "نظافة ممتازة", "التعامل الراقي"].map((tag, index) => {
                  const sel = selectedTags.includes(index);
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => toggleTag(index)}
                      activeOpacity={0.85}
                      style={[
                        styles.tag,
                        {
                          backgroundColor: sel ? colors.primaryLight : colors.secondary,
                          borderColor: sel ? colors.primary : "transparent",
                          borderWidth: sel ? 1 : 0,
                        },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: sel ? colors.primary : colors.foreground }]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
             </View>
          </View>
        </ScrollView>

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleSubmit}>
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              <Text style={styles.submitBtnText}>إرسال التقييم</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  mainCard: {
    marginHorizontal: 24,
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  name: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  starsRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  ratingLabel: {
    marginTop: 12,
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  commentSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "right",
  },
  input: {
    height: 120,
    borderRadius: 20,
    padding: 16,
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    borderWidth: 1,
  },
  tagsSection: {
    paddingHorizontal: 24,
  },
  tagsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  tagText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  submitBtn: {
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
});
