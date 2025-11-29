import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useState, useCallback } from "react";
import { getSettings } from "../../utils/storage";
import { t, getLanguage } from "../../utils/i18n";

export default function TabsLayout() {
  const [language, setLanguage] = useState<string>(getLanguage());

  useFocusEffect(
    useCallback(() => {
      // Update language when screen is focused
      getSettings().then(() => {
        setLanguage(getLanguage());
      });
    }, [])
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#C41E3A",
        tabBarInactiveTintColor: "#8B4513",
        headerShown: true,
        headerStyle: {
          backgroundColor: "#C41E3A",
        },
        headerTintColor: "#fff",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#C41E3A",
          borderTopWidth: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("main.title"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: t("people.title"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings.title"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

