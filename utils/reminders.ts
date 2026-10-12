import { AppData } from '../types';
import { createTranslator } from './i18n';

export interface Reminder { identifier: string; date: Date; title: string; body: string }
export function planReminders(data: AppData, now = new Date()): Reminder[] {
  if (!data.settings.notificationsEnabled || !data.people.some(p => !p.isBought)) return [];
  const t = createTranslator(data.settings.language);
  const bought = data.people.filter(p => p.isBought).length;
  const values = { bought, total: data.people.length, percent: Math.round(bought / data.people.length * 100) };
  return [...data.settings.reminderDays].sort((a, b) => a - b).map(day => ({
    identifier: `krampus:${data.shoppingYear}:12:${day}`,
    date: new Date(data.shoppingYear, 11, day, data.settings.reminderHour, data.settings.reminderMinute),
    title: t('reminderTitle'), body: t('reminderBody', values),
  })).filter(reminder => reminder.date > now);
}
export type Permission = 'granted' | 'denied' | 'unknown' | 'unsupported';
export interface ReminderStatus { permission: Permission; next: Date | null }
export interface NotificationAdapter {
  permission(request: boolean): Promise<Permission>;
  cancelAll(): Promise<void>;
  schedule(reminder: Reminder): Promise<void>;
}
export function createReminderService(adapter: NotificationAdapter, now: () => Date = () => new Date()) {
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  }
  return {
    requestPermission: () => serial(() => adapter.permission(true)),
    cancelAll: () => serial(() => adapter.cancelAll()),
    reconcile: (data: AppData) => serial(async (): Promise<ReminderStatus> => {
      // Cancel even when permission has been revoked or the list is complete.
      await adapter.cancelAll();
      const permission = await adapter.permission(false);
      if (permission !== 'granted') return { permission, next: null };
      const reminders = planReminders(data, now());
      try { for (const reminder of reminders) await adapter.schedule(reminder); }
      catch (error) {
        // Avoid leaving a silently partial schedule after a failed update.
        await adapter.cancelAll();
        throw error;
      }
      return { permission, next: reminders[0]?.date ?? null };
    }),
  };
}
