import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { GradientButton } from "@/components/GradientButton";

const TAGS = [
  { id: "time", title: "الالتزام بالوقت", icon: "clock-outline" },
  { id: "details", title: "الاهتمام بالتفاصيل", icon: "clipboard-text-outline" },
  { id: "attitude", title: "التعامل الراقي", icon: "heart-outline" },
  { id: "quality", title: "جودة التنظيف", icon: "sparkles" },
];

export default function RatingScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (id: string) => {
    setSelectedTags(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Feather name="chevron-right" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>تقييم الخدمة</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>كيف كانت تجربتك اليوم؟</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="help-circle" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.heroCard, { backgroundColor: colors.primaryLight + "80" }]}>
            <View style={styles.avatarContainer}>
              <Image source={require("@/assets/images/cleaner-fatima.png")} style={styles.avatar} />
              <View style={[styles.avatarDot, { backgroundColor: colors.primary, borderColor: colors.card }]} />
            </View>
            <Text style={[styles.cleanerName, { color: colors.foreground }]}>فاطمة أحمد</Text>
            <Text style={[styles.cleanerSubtitle, { color: colors.mutedForeground }]}>منظفة محترفة</Text>
          </View>

          <View style={styles.ratingSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>قيم تجربتك مع فاطمة</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <MaterialCommunityIcons 
                    name={star <= rating ? "star" : "star-outline"} 
                    size={48} 
                    color={star <= rating ? colors.warning : colors.mutedForeground} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.ratingLabel, { color: colors.success }]}>ممتاز</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>شاركنا رأيك</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="اكتب ملاحظاتك عن الخدمة. رأيك يساعدنا في تقديم تجربة أفضل لك في المستقبل."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
                value={feedback}
                onChangeText={setFeedback}
                maxLength={500}
              />
              <View style={styles.inputFooter}>
                <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{feedback.length}/500</Text>
              </View>
            </View>
          </View>

          <View style={styles.tagsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ما الذي أعجبك في الخدمة؟</Text>
            <View style={styles.tagsGrid}>
              {TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity 
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    style={[
                      styles.tagChip, 
                      { 
                        backgroundColor: isSelected ? colors.primaryLight : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border
                      }
                    ]}
                  >
                    <MaterialCommunityIcons 
                      name={tag.icon as any} 
                      size={20} 
                      color={isSelected ? colors.primary : colors.foreground} 
                    />
                    <Text style={[
                      styles.tagChipText, 
                      { color: isSelected ? colors.primary : colors.foreground }
                    ]}>{tag.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.successLight }]}>
            <MaterialCommunityIcons name="shield-check" size={24} color={colors.success} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: colors.success }]}>تقييمك يهمنا</Text>
              <Text style={[styles.infoDesc, { color: colors.success }]}>نحرص على تقديم أفضل الخدمات بناءً على ملاحظاتك</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <GradientButton 
            title="إرسال التقييم" 
            onPress={() => router.push("/(tabs)")} 
            style={styles.submitBtn} 
          />
          <TouchableOpacity onPress={() => router.push("/(tabs)")}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>تخطي التقييم &gt;</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  heroCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  avatarDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  cleanerName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    marginBottom: 4,
  },
  cleanerSubtitle: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    marginBottom: 16,
    textAlign: "right",
    alignSelf: "stretch",
  },
  starsRow: {
    flexDirection: "row-reverse", // RTL
    gap: 8,
    marginBottom: 16,
  },
  ratingLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    height: 140,
  },
  input: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textAlign: "right",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  charCount: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
  },
  tagsSection: {
    marginBottom: 32,
  },
  tagsGrid: {
    flexDirection: "row-reverse", // RTL
    flexWrap: "wrap",
    gap: 12,
  },
  tagChip: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
    gap: 8,
    width: "48%",
  },
  tagChipText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  infoCard: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  infoTextContainer: {
    flex: 1,
    alignItems: "flex-end", // RTL
    marginRight: 16,
  },
  infoTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    marginBottom: 2,
  },
  infoDesc: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
    textAlign: "right",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtn: {
    marginBottom: 16,
  },
  skipText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
});
