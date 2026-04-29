import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {action && <View style={styles.action}>{action}</View>}
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
    textAlign: "right",
    flex: 1,
  },
  action: {
    marginLeft: 16,
  },
});
