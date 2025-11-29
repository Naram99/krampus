import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { getSettings } from "../utils/storage";

export default function RootLayout() {
  useEffect(() => {
    // Initialize language on app start
    getSettings();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
