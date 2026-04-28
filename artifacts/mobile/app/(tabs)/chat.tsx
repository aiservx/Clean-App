import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { GradientButton } from "@/components/GradientButton";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>المحادثات</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Feather name="message-circle" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد محادثات بعد</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>سيظهر سجل المحادثات مع فريق الدعم وعمال النظافة هنا.</Text>
        
        <GradientButton 
          title="ابدأ محادثة" 
          onPress={() => {}} 
          style={styles.btn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 100, // account for tab bar
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  btn: {
    width: "100%",
  },
});
