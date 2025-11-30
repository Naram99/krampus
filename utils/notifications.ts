import * as Notifications from 'expo-notifications';
import { getPeople, getSettings } from './storage';
import { t, getLanguage } from './i18n';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// December dates for notifications: 1, 10, 15, 20, 22, 23, 24
const NOTIFICATION_DATES = [1, 10, 15, 20, 22, 23, 24];

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Calculate progress percentage
 */
function calculateProgress(people: any[]): number {
  if (people.length === 0) return 0;
  const boughtCount = people.filter((p) => p.isBought).length;
  return Math.round((boughtCount / people.length) * 100);
}

/**
 * Get notification message based on current language and progress
 */
function getNotificationMessage(progress: number, totalPeople: number, boughtCount: number): string {
  const language = getLanguage();
  
  // We'll use the translation function, but we need to make sure the language is set
  // The message will be formatted with progress percentage
  return t('notifications.reminderMessage')
    .replace('{progress}', progress.toString())
    .replace('{bought}', boughtCount.toString())
    .replace('{total}', totalPeople.toString());
}

/**
 * Schedule a notification for a specific date in December
 */
async function scheduleNotificationForDate(
  day: number,
  year: number,
  hour: number = 9,
  minute: number = 0
): Promise<void> {
  const date = new Date(year, 11, day, hour, minute, 0); // Month is 0-indexed, so 11 = December
  
  // Don't schedule if the date is in the past
  if (date < new Date()) {
    return;
  }

  // Get settings first to ensure language is set
  const settings = await getSettings();
  
  // Only schedule if notifications are enabled
  if (!settings.notificationsEnabled) {
    return;
  }

  // Get people to calculate progress
  const people = await getPeople();

  const progress = calculateProgress(people);
  const totalPeople = people.length;
  const boughtCount = people.filter((p) => p.isBought).length;

  const message = getNotificationMessage(progress, totalPeople, boughtCount);
  const title = t('notifications.reminderTitle');

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: message,
      sound: true,
      data: { type: 'present_reminder', day },
    },
    trigger: date,
  });
}

/**
 * Schedule all December notifications for the current year
 */
export async function scheduleDecemberNotifications(): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('Notification permissions not granted');
    return;
  }

  // Cancel existing notifications first
  await cancelAllNotifications();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentDay = new Date().getDate();

  // Only schedule if we're in December or before December
  if (currentMonth > 11) {
    // If it's past December, schedule for next year
    const nextYear = currentYear + 1;
    for (const day of NOTIFICATION_DATES) {
      await scheduleNotificationForDate(day, nextYear);
    }
  } else if (currentMonth === 11) {
    // If we're in December, only schedule future dates
    for (const day of NOTIFICATION_DATES) {
      if (day >= currentDay) {
        await scheduleNotificationForDate(day, currentYear);
      }
    }
  } else {
    // If it's before December, schedule for this year
    for (const day of NOTIFICATION_DATES) {
      await scheduleNotificationForDate(day, currentYear);
    }
  }
}

/**
 * Update all scheduled notifications with current progress
 * This should be called when people are added/removed or when presents are marked as bought
 */
export async function updateScheduledNotifications(): Promise<void> {
  const settings = await getSettings();
  if (!settings.notificationsEnabled) {
    await cancelAllNotifications();
    return;
  }

  // Reschedule all notifications to update the progress
  await scheduleDecemberNotifications();
}

