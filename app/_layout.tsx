import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { getSettings } from "../utils/storage";
import { scheduleDecemberNotifications } from "../utils/notifications";

export default function RootLayout() {
  useEffect(() => {
    // Initialize language and notifications on app start
    const initialize = async () => {
      await getSettings();
      // Schedule notifications if enabled
      await scheduleDecemberNotifications();
    };
    initialize();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
