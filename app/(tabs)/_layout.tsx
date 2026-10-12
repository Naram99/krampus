import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useApp } from '../../state/AppProvider';
import { colors } from '../../utils/theme';

export default function TabsLayout() {
  const { t, attemptLeave } = useApp();
  return <Tabs screenOptions={{
    tabBarActiveTintColor: colors.christmasRed, tabBarInactiveTintColor: colors.gray,
    headerStyle: { backgroundColor: colors.christmasRed }, headerTintColor: colors.white,
    tabBarStyle: { backgroundColor: colors.white },
  }} screenListeners={({ route, navigation }) => ({ tabPress: event => {
    if (route.name !== 'settings' && attemptLeave(() => navigation.navigate(route.name))) event.preventDefault();
  } })}>
    <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
    <Tabs.Screen name="people" options={{ title: t('people'), tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{ title: t('settings'), tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} /> }} />
  </Tabs>;
}
