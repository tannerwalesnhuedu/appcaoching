import { useClientOnlyValue } from "@/components/useClientOnlyValue"; 
import { useColorScheme } from "@/components/useColorScheme"; 
import { supabase } from "@/lib/supabase"; 
import { Ionicons } from "@expo/vector-icons"; 
import { Tabs } from "expo-router"; 
import { useEffect } from "react"; 
import { AppState, Platform, StyleSheet } from "react-native"; 

export default function TabLayout() { 
  const colorScheme = useColorScheme(); 

  useEffect(() => { 
    const subscription = AppState.addEventListener("change", (nextAppState) => { 
      if (nextAppState === "active") { 
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
        tabBarStyle: styles.universalTabBar, 
        tabBarActiveTintColor: "#ffffff", 
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.45)", 
        tabBarShowLabel: true, 
        tabBarLabelStyle: styles.tabLabel, 
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
      {/* 1. HOME SCREEN */} 
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Home", 
          tabBarIcon: ({ color, focused }) => ( 
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} /> 
          ), 
          headerRight: undefined, 
        }} 
      /> 

      {/* 2. BOOKING ENGINE DASHBOARD */} 
      <Tabs.Screen 
        name="booking" 
        options={{ 
          title: "Booking", 
          tabBarIcon: ({ color, focused }) => ( 
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} /> 
          ), 
        }} 
      /> 

      {/* 3. ABOUT VIEW */} 
      <Tabs.Screen 
        name="about" 
        options={{ 
          title: "About", 
          tabBarIcon: ({ color, focused }) => ( 
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} /> 
          ), 
        }} 
      /> 

    </Tabs> 
  ); 
} 

const styles = StyleSheet.create({ 
  universalTabBar: { 
    backgroundColor: "#2b1a9e", 
    borderTopWidth: 0, 
    ...Platform.select({ 
      ios: { height: 88, paddingBottom: 25, }, 
      android: { height: 68, paddingBottom: 10, }, 
      web: { height: 64, paddingBottom: 8, boxShadow: "0px -2px 10px rgba(0,0,0,0.05)" as any, }, 
    }), 
  }, 
  tabLabel: { fontSize: 11, fontWeight: "600", marginTop: -2, }, 
});
