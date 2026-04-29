import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

const FILTERS = ["الكل", "قيد التنفيذ", "مكتملة", "ملغاة"];

const BOOKINGS = [
  { 
    id: "1", 
    service: "تنظيف عميق للمنزل", 
    cleaner: "أحمد حسين", 
    date: "اليوم، 10:00 ص - 12:00 م", 
    price: "92", 
    status: "قيد التنفيذ",
    statusColor: "#2F80ED",
    image: require("@/assets/images/cleaner-fatima.png")
  },
  { 
    id: "2", 
    service: "تنظيف سجاد", 
    cleaner: "سارة محمد", 
    date: "أمس، 02:00 م - 04:00 م", 
    price: "120", 
    status: "مكتملة",
    statusColor: "#16C47F",
    image: require("@/assets/images/cleaner-sara.png")
  },
];

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>حجوزاتي</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>تابع جميع طلباتك</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {FILTERS.map((filter, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.filterPill, 
                { backgroundColor: index === 0 ? colors.primary : colors.card, borderColor: colors.border }
              ]}
            >
              <Text style={[styles.filterText, { color: index === 0 ? "#FFFFFF" : colors.foreground }]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bookings List */}
        <View style={styles.listContainer}>
          {BOOKINGS.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.bookingCard, { backgroundColor: colors.card }]}
              onPress={() => router.push("/tracking")}
            >
              <View style={styles.cardHeader}>
                 <View style={[styles.statusBadge, { backgroundColor: item.statusColor + "20" }]}>
                    <Text style={[styles.statusText, { color: item.statusColor }]}>{item.status}</Text>
                 </View>
                 <Text style={[styles.serviceName, { color: colors.foreground }]}>{item.service}</Text>
              </View>
              
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              <View style={styles.cardContent}>
                 <View style={styles.cleanerInfo}>
                    <View style={styles.textWrap}>
                       <Text style={[styles.cleanerName, { color: colors.foreground }]}>{item.cleaner}</Text>
                       <Text style={[styles.bookingDate, { color: colors.mutedForeground }]}>{item.date}</Text>
                    </View>
                    <Image source={item.image} style={styles.cleanerAvatar} />
                 </View>
                 
                 <View style={styles.priceWrap}>
                    <Text style={[styles.priceValue, { color: colors.primary }]}>{item.price} ر.س</Text>
                    <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>الإجمالي</Text>
                 </View>
              </View>

              <View style={styles.cardFooter}>
                 <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.actionBtnText, { color: colors.foreground }]}>عرض التفاصيل</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.reorderBtn, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.reorderBtnText, { color: colors.primary }]}>إعادة طلب</Text>
                 </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  headerTitleContainer: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 22,
  },
  headerSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 14,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 20,
  },
  bookingCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  serviceName: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cleanerInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  cleanerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  textWrap: {
    alignItems: "flex-end",
  },
  cleanerName: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 14,
    marginBottom: 2,
  },
  bookingDate: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 12,
  },
  priceWrap: {
    alignItems: "center",
  },
  priceValue: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
  },
  priceLabel: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 13,
  },
  reorderBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderBtnText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 13,
  },
});
