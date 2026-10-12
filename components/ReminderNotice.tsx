import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { sharedStyles as s } from '../utils/theme';
import { Button } from './ui';

export function ReminderNotice() {
  const { reminderError, refreshReminders, t, busy } = useApp();
  if (!reminderError) return null;
  return <View style={s.card}><Text accessibilityLiveRegion="polite" style={s.warning}>{t('notificationError')}</Text>
    <Button title={t('retry')} disabled={busy} onPress={() => void refreshReminders()} />
  </View>;
}
