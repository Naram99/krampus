import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppData, Language } from '../types';
import { Button } from '../components/ui';
import { deviceLanguage } from '../utils/data';
import { createTranslator } from '../utils/i18n';
import { reminderService } from '../utils/notifications';
import { ReminderStatus } from '../utils/reminders';
import { repository } from '../utils/storage';
import { sharedStyles as s } from '../utils/theme';

type LeaveGuard = (proceed: () => void) => void;
interface AppContextValue {
  data: AppData;
  busy: boolean;
  t: ReturnType<typeof createTranslator>;
  reminders: ReminderStatus;
  reminderError: boolean;
  update: (change: (current: AppData) => AppData) => Promise<void>;
  refreshReminders: () => Promise<void>;
  requestPermission: () => Promise<void>;
  reset: () => Promise<void>;
  setLeaveGuard: (guard: LeaveGuard | null) => void;
  attemptLeave: (proceed: () => void) => boolean;
}
const AppContext = createContext<AppContextValue | null>(null);
function reminderFingerprint(data: AppData) {
  return JSON.stringify([data.shoppingYear, data.settings.notificationsEnabled, data.settings.language,
    data.settings.reminderDays, data.settings.reminderHour, data.settings.reminderMinute,
    data.people.map(p => [p.id, p.isBought])]);
}
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  // Static web rendering and the first client render must use the same text.
  const [fallbackLanguage, setFallbackLanguage] = useState<Language>('en');
  const dataRef = useRef<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [reminders, setReminders] = useState<ReminderStatus>({ permission: 'unknown', next: null });
  const [reminderError, setReminderError] = useState(false);
  const guardRef = useRef<LeaveGuard | null>(null);
  const t = useMemo(() => createTranslator(data?.settings.language ?? fallbackLanguage), [data?.settings.language, fallbackLanguage]);
  const publish = useCallback((next: AppData) => { dataRef.current = next; setData(next); }, []);
  const sync = useCallback(async (snapshot: AppData) => {
    try {
      setReminders(await reminderService.reconcile(snapshot));
      setReminderError(false);
    } catch {
      setReminderError(true);
      setReminders(previous => ({ ...previous, next: null }));
    }
  }, []);
  const load = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setLoading(true);
    try { const next = await repository.load(); publish(next); await sync(next); }
    catch {
      dataRef.current = null; setData(null);
      await reminderService.cancelAll().catch(() => setReminderError(true));
    }
    finally { busyRef.current = false; setBusy(false); setLoading(false); }
  }, [publish, sync]);
  useEffect(() => { setFallbackLanguage(deviceLanguage()); void load(); }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && dataRef.current && !busyRef.current) void sync(dataRef.current);
    });
    return () => subscription.remove();
  }, [sync]);
  const update = useCallback(async (change: (current: AppData) => AppData) => {
    if (busyRef.current || !dataRef.current) throw new Error('busy');
    busyRef.current = true; setBusy(true);
    try {
      const previous = dataRef.current;
      const next = await repository.update(change);
      publish(next);
      if (reminderFingerprint(previous) !== reminderFingerprint(next)) await sync(next);
    } finally { busyRef.current = false; setBusy(false); }
  }, [publish, sync]);
  const refreshReminders = useCallback(async () => {
    if (!dataRef.current || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await sync(dataRef.current); }
    finally { busyRef.current = false; setBusy(false); }
  }, [sync]);
  const requestPermission = useCallback(async () => {
    const permission = await reminderService.requestPermission();
    setReminders(previous => ({ ...previous, permission }));
  }, []);
  const reset = useCallback(async () => {
    if (busyRef.current) throw new Error('busy');
    busyRef.current = true; setBusy(true);
    dataRef.current = null; guardRef.current = null;
    try {
      await reminderService.cancelAll();
      await repository.clear();
      const fresh = await repository.load(); publish(fresh); await sync(fresh);
    } catch (error) { setData(null); throw error; }
    finally { busyRef.current = false; setBusy(false); }
  }, [publish, sync]);
  const restore = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { const next = await repository.restore(); publish(next); await sync(next); }
    catch { Alert.alert(t('error'), t('restoreError')); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const setLeaveGuard = useCallback((guard: LeaveGuard | null) => { guardRef.current = guard; }, []);
  const attemptLeave = useCallback((proceed: () => void) => {
    if (!guardRef.current) return false;
    guardRef.current(proceed); return true;
  }, []);
  if (loading) return <SafeAreaView style={s.screen}><View style={s.content}><ActivityIndicator /><Text style={s.text}>{t('loading')}</Text></View></SafeAreaView>;
  if (!data) return <SafeAreaView style={s.screen}><View style={s.content}>
    <Text style={s.warning}>{t('loadError')}</Text>
    <Button title={t('retry')} disabled={busy} onPress={() => void load()} />
    <Button title={t('restore')} disabled={busy} variant="secondary" onPress={() => Alert.alert(t('restoreTitle'), t('restoreDescription'), [
      { text: t('cancel'), style: 'cancel' }, { text: t('restore'), onPress: () => void restore() },
    ])} />
    <Button title={t('deleteAll')} disabled={busy} variant="danger" onPress={() => Alert.alert(t('deleteAllTitle'), t('deleteAllBody'), [
      { text: t('cancel'), style: 'cancel' }, { text: t('delete'), style: 'destructive', onPress: () => { void reset().catch(() => Alert.alert(t('error'), t('deleteError'))); } },
    ])} />
  </View></SafeAreaView>;
  return <AppContext.Provider value={{ data, busy, t, reminders, reminderError, update, refreshReminders, requestPermission, reset, setLeaveGuard, attemptLeave }}>
    {children}
  </AppContext.Provider>;
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider is required');
  return value;
}
