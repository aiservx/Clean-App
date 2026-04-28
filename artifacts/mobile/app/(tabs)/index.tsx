import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";

const SERVICES = [
  { id: "1", title: "تنظيف السجاد", icon: "rug", color: "#FEE2E2", type: "material-community" },
  { id: "2", title: "تنظيف بعد البناء", icon: "broom", color: "#FEF3C7", type: "material-community" },
  { id: "3", title: "تنظيف المجالس", icon: "sofa", color: "#E0E7FF", type: "material-community" },
  { id: "4", title: "تنظيف المكاتب", icon: "office-building", color: "#D1FAE5", type: "material-community" },
  { id: "5", title: "تنظيف المنازل", icon: "home-variant", color: "#F3E8FF", type: "material-community" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const handleBookPress = () => {
    router.push("/services");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="bell" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.greeting, { color: colors.foreground }]}>👋 مرحبا بك</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>أين نرسل فريق التنظيف؟</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="menu" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.mapContainer, { backgroundColor: colors.border }]}>
          <AppMap
            style={StyleSheet.absoluteFill}
            region={{
              latitude: 24.7136,
              longitude: 46.6753,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            markers={[{ id: "me", coordinate: { latitude: 24.7136, longitude: 46.6753 } }]}
            scrollEnabled={false}
            zoomEnabled={false}
          />
          <View pointerEvents="none" style={styles.mapPinOverlay}>
            <Feather name="map-pin" size={36} color={colors.primary} />
          </View>

          <View style={styles.locationPill}>
            <Text style={styles.locationPillText}>موقعك الحالي</Text>
          </View>

          <TouchableOpacity style={[styles.gpsButton, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={handleBookPress} style={styles.ctaContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Image 
              source={require("@/assets/images/illustration-bucket.png")} 
              style={styles.ctaImage} 
              resizeMode="contain"
            />
            <View style={styles.ctaTextContainer}>
              <Text style={styles.ctaTitle}>احجز تنظيف الآن</Text>
            </View>
            <View style={styles.ctaArrowContainer}>
              <Feather name="arrow-left" size={20} color={colors.primary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <SectionHeader title="خدماتنا" />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesScroll}
        >
          {SERVICES.map((service) => (
            <TouchableOpacity key={service.id} style={[styles.serviceCard, { backgroundColor: colors.card, shadowColor: colors.foreground }]}>
              <View style={[styles.serviceIconContainer, { backgroundColor: service.color }]}>
                <MaterialCommunityIcons name={service.icon as any} size={24} color={colors.foreground} />
              </View>
              <Text style={[styles.serviceTitle, { color: colors.foreground }]}>{service.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.infoCard, { backgroundColor: colors.secondary }]}>
          <Image 
            source={require("@/assets/images/illustration-bucket.png")} 
            style={styles.infoImage} 
            resizeMode="contain"
          />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>نظافة أكثر.. حياة أفضل</Text>
            <Text style={[styles.infoSubtitle, { color: colors.mutedForeground }]}>استمتع ببيئة نظيفة وصحية مع خدماتنا المتخصصة</Text>
          </View>
        </View>
      </ScrollView>
    </View>
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
    marginBottom: 24,
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
  greeting: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
  },
  mapContainer: {
    height: 180,
    marginHorizontal: 24,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  locationPill: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationPillText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#1A2138",
  },
  gpsButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaContainer: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
  },
  ctaImage: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "right",
  },
  ctaArrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
  servicesScroll: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 12,
  },
  serviceCard: {
    width: 80,
    height: 96,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  serviceTitle: {
    fontFamily: "Cairo_500Medium",
    fontSize: 11,
    textAlign: "center",
  },
  infoCard: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  infoImage: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    textAlign: "right",
    marginBottom: 4,
  },
  infoSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18,
  },
});
