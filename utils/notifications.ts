import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createReminderService, Permission } from './reminders';

const CHANNEL_ID = 'gift-reminders';
Notifications.setNotificationHandler({ handleNotification: async () => ({
  shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
}) });
async function channel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Krampus', importance: Notifications.AndroidImportance.DEFAULT, sound: 'default',
  });
}
export const reminderService = createReminderService({
  async permission(request): Promise<Permission> {
    if (Platform.OS === 'web') return 'unsupported';
    if (request) await channel();
    let permission = await Notifications.getPermissionsAsync();
    if (request && !permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
    if (permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL || permission.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL) return 'granted';
    return permission.status === 'undetermined' ? 'unknown' : 'denied';
  },
  async cancelAll() {
    if (Platform.OS !== 'web') await Notifications.cancelAllScheduledNotificationsAsync();
  },
  async schedule(reminder) {
    await channel();
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: { title: reminder.title, body: reminder.body, sound: 'default', data: { type: 'present_reminder' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: CHANNEL_ID },
    });
  },
});
