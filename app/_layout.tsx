import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../state/AppProvider';
import { Onboarding } from '../components/Onboarding';

function Navigator() {
  const router = useRouter();
  const { data, attemptLeave } = useApp();
  useEffect(() => {
    if (!data.onboardingCompleted || Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse) => {
      if (response.notification.request.content.data.type === 'present_reminder') {
        const proceed = () => {
          router.navigate('/');
          void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        };
        if (!attemptLeave(proceed)) proceed();
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then(response => { if (response) open(response); }).catch(() => undefined);
    return () => subscription.remove();
  }, [router, attemptLeave, data.onboardingCompleted]);
  if (!data.onboardingCompleted) return <><StatusBar style="dark" /><Onboarding /></>;
  return <><StatusBar style="light" /><Stack screenOptions={{ headerShown: false }} /></>;
}
export default function RootLayout() {
  return <SafeAreaProvider><AppProvider><Navigator /></AppProvider></SafeAreaProvider>;
}
