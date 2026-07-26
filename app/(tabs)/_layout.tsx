import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Link, Tabs } from "expo-router";
import { useEffect } from "react";
import { AppState, Platform, Pressable, StyleSheet } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();

// Add this directly inside your layout tracking code blocks
useEffect(() => {
  const subscription = AppState.addEventListener("change", (nextAppState) => {
    if (nextAppState === "active") {
      // 🔄 Force background validation handshake updates automatically
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  return () => subscription.remove();
}, []);  

  return (
    <Tabs
      screenOptions={{
        // 1. Cross-Platform Full-Width Adaptive Bar Layout
        tabBarStyle: styles.universalTabBar,

        // 2. Premium Designmodo purple matching theme palette colors
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.45)",

        // Show labels comfortably centered underneath layout symbols
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,

        // Header Configuration
        headerStyle: {
          backgroundColor: "#2b1a9e",
          borderBottomWidth: 0,
          ...Platform.select({
            web: { boxShadow: "none" },
            android: { elevation: 0 },
          }),
        },
        headerTintColor: "#ffffff",
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      {/* HOME SCREEN */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable style={{ marginRight: 15 }}>
                {({ pressed }) => (
                  <Ionicons
                    name="information-circle-outline"
                    size={25}
                    color="#ffffff"
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />

      {/* SCHEDULE SCREEN */}
      <Tabs.Screen
        name="booking"
        options={{
          title: "Booking",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* ABOUT SCREEN */}
      <Tabs.Screen
        name="about"
        options={{
          title: "About",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  universalTabBar: {
    // Structural layout rules allowing natural stretching across any window grid canvas
    backgroundColor: "#2b1a9e",
    borderTopWidth: 0,

    // Adaptive heights and spacing handling platform device safe zone constraints
    ...Platform.select({
      ios: {
        height: 88,
        paddingBottom: 25,
      },
      android: {
        height: 68,
        paddingBottom: 10,
      },
      web: {
        height: 64,
        paddingBottom: 8,
        // Flat, clean design for browsers
        boxShadow: "0px -2px 10px rgba(0,0,0,0.05)" as any,
      },
    }),
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: -2,
  },
});

