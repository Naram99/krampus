import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Platform, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused, useNavigation, usePreventRemove } from '@react-navigation/native';
import { Button, Field, Screen } from '../../components/ui';
import { ReminderNotice } from '../../components/ReminderNotice';
import { useApp } from '../../state/AppProvider';
import { AppData, AppSettings, Currency, Language } from '../../types';
import { formatCurrency, LOCALES, moneyInput, parseMoney } from '../../utils/currency';
import { colors, sharedStyles as s } from '../../utils/theme';

function draftFrom(data: AppData) {
  return { noBudget: data.settings.globalBudgetLimitMinor === null,
    budget: data.settings.globalBudgetLimitMinor === null ? '' : moneyInput(data.settings.globalBudgetLimitMinor),
    defaultBudget: moneyInput(data.settings.defaultPriceLimitMinor), currency: data.settings.currency, language: data.settings.language,
    enabled: data.settings.notificationsEnabled, days: [...data.settings.reminderDays].sort((a, b) => a - b),
    time: `${String(data.settings.reminderHour).padStart(2, '0')}:${String(data.settings.reminderMinute).padStart(2, '0')}`,
    year: String(data.shoppingYear) };
}
function ask(title: string, message: string, cancel: string, confirm: string): Promise<boolean> {
  return new Promise(resolve => Alert.alert(title, message, [
    { text: cancel, style: 'cancel', onPress: () => resolve(false) }, { text: confirm, onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
export default function SettingsPage() {
  const { data, update, busy, t, reminders, requestPermission, reset, setLeaveGuard } = useApp();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const [draft, setDraft] = useState(() => draftFrom(data));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const saveLock = useRef(false);
  const leaveDialog = useRef(false);
  const pendingLeave = useRef<(() => void) | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(data));
  const disabled = busy || working;
  useEffect(() => { setDraft(draftFrom({ settings: data.settings, shoppingYear: data.shoppingYear } as AppData)); }, [data.settings, data.shoppingYear]);
  const change = <K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(previous => ({ ...previous, [key]: value })); setSaved(false); setErrors({});
  };
  const save = useCallback(async (): Promise<boolean> => {
    if (saveLock.current || busy) return false;
    saveLock.current = true; setWorking(true); setSaved(false);
    try {
      const nextErrors: Record<string, string> = {};
      let budget: number | null = null, defaultBudget = 0;
      if (!draft.noBudget) try { budget = parseMoney(draft.budget, false); } catch { nextErrors.budget = t('positiveMoney'); }
      try { defaultBudget = parseMoney(draft.defaultBudget, false); } catch { nextErrors.defaultBudget = t('positiveMoney'); }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) nextErrors.time = t('invalidTime');
      if (draft.enabled && draft.days.length === 0) nextErrors.days = t('invalidDays');
      const year = Number(draft.year);
      if (!/^\d{4}$/.test(draft.year) || year < 2000 || year > 9999) nextErrors.year = t('invalidYear');
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return false;
      if (draft.currency !== data.settings.currency) {
        const example = data.people[0]?.priceLimitMinor ?? data.settings.globalBudgetLimitMinor ?? data.settings.defaultPriceLimitMinor;
        if (!await ask(t('currencyTitle'), t('currencyWarning', {
          before: formatCurrency(example, data.settings.currency, data.settings.language),
          after: formatCurrency(example, draft.currency, data.settings.language),
        }), t('cancel'), t('confirm'))) return false;
      }
      if (year !== data.shoppingYear && !await ask(t('yearTitle'), t('yearWarning', { year }), t('cancel'), t('confirm'))) return false;
      if (draft.enabled && !data.settings.notificationsEnabled) await requestPermission();
      const [hour, minute] = draft.time.split(':').map(Number);
      const settings: AppSettings = { globalBudgetLimitMinor: budget, defaultPriceLimitMinor: defaultBudget,
        notificationsEnabled: draft.enabled, currency: draft.currency, language: draft.language,
        reminderDays: [...draft.days].sort((a, b) => a - b), reminderHour: hour, reminderMinute: minute };
      await update(current => ({ ...current, settings, shoppingYear: year }));
      setDraft(draftFrom({ ...data, settings, shoppingYear: year })); setSaved(true);
      return true;
    } catch { setErrors({ save: t('saveError') }); return false; }
    finally { saveLock.current = false; setWorking(false); }
  }, [busy, data, draft, requestPermission, t, update]);
  const showLeave = useCallback((proceed: () => void) => {
    if (saveLock.current || busy || leaveDialog.current) return;
    leaveDialog.current = true;
    Alert.alert(t('unsavedTitle'), t('unsavedBody'), [
      { text: t('cancel'), style: 'cancel', onPress: () => { leaveDialog.current = false; } },
      { text: t('discard'), style: 'destructive', onPress: () => {
        leaveDialog.current = false; pendingLeave.current = proceed; setDraft(draftFrom(data)); setErrors({});
      } },
      { text: t('save'), onPress: () => {
        leaveDialog.current = false; pendingLeave.current = proceed;
        void save().then(success => { if (!success) pendingLeave.current = null; });
      } },
    ], { cancelable: true, onDismiss: () => { leaveDialog.current = false; } });
  }, [busy, data, save, t]);
  useEffect(() => {
    setLeaveGuard(dirty ? showLeave : null);
    return () => setLeaveGuard(null);
  }, [dirty, setLeaveGuard, showLeave]);
  useEffect(() => {
    if (!dirty && !working && pendingLeave.current) {
      const proceed = pendingLeave.current; pendingLeave.current = null; setLeaveGuard(null); proceed();
    }
  }, [dirty, working, setLeaveGuard]);
  usePreventRemove(dirty, ({ data: event }) => showLeave(() => navigation.dispatch(event.action)));
  useEffect(() => {
    if (Platform.OS !== 'android' || !focused || !dirty) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      showLeave(() => { if (navigation.canGoBack()) navigation.goBack(); else BackHandler.exitApp(); });
      return true;
    });
    return () => subscription.remove();
  }, [dirty, focused, navigation, showLeave]);
  const permissionKey = { granted: 'permissionGranted', denied: 'permissionDenied', unknown: 'permissionUnknown', unsupported: 'permissionUnsupported' } as const;
  const removeAll = () => Alert.alert(t('deleteAllTitle'), t('deleteAllBody'), [
    { text: t('cancel'), style: 'cancel' }, { text: t('delete'), style: 'destructive', onPress: () => {
      pendingLeave.current = null;
      void reset().catch(() => Alert.alert(t('error'), t('deleteError')));
    } },
  ]);
  return <Screen>
    <ReminderNotice />
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>{t('globalBudget')}</Text>
      <View style={s.row}><Text style={[s.text, { flex: 1 }]}>{t('noBudget')}</Text><Switch accessibilityLabel={t('noBudget')}
        value={draft.noBudget} onValueChange={value => change('noBudget', value)} disabled={disabled} trackColor={{ true: colors.christmasGreen }} /></View>
      {!draft.noBudget && <Field label={`${t('globalBudget')} (${draft.currency})`} value={draft.budget} editable={!disabled}
        keyboardType="decimal-pad" onChangeText={value => change('budget', value)} error={errors.budget} />}
      <Field label={`${t('defaultBudget')} (${draft.currency})`} value={draft.defaultBudget} editable={!disabled}
        keyboardType="decimal-pad" onChangeText={value => change('defaultBudget', value)} error={errors.defaultBudget} />
      <Text style={s.text}>{t('currency')}</Text><View style={s.row}>{(['USD', 'EUR', 'HUF'] as Currency[]).map(currency =>
        <TouchableOpacity key={currency} accessibilityRole="radio" accessibilityLabel={currency} accessibilityState={{ checked: draft.currency === currency, disabled }}
          disabled={disabled} onPress={() => change('currency', currency)} style={{ minHeight: 48, minWidth: 64, padding: 12, borderWidth: 2, borderRadius: 8, borderColor: draft.currency === currency ? colors.christmasGreen : colors.lightGray }}>
          <Text style={s.text}>{currency}</Text>
        </TouchableOpacity>)}</View>
    </View>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>{t('notifications')}</Text>
      <View style={s.row}><Text style={[s.text, { flex: 1 }]}>{t('enableNotifications')}</Text><Switch accessibilityLabel={t('enableNotifications')}
        value={draft.enabled} onValueChange={value => change('enabled', value)} disabled={disabled} trackColor={{ true: colors.christmasGreen }} /></View>
      <Text style={s.muted}>{t('reminderHelp')}</Text>
      <Text style={s.text}>{t('reminderDays')}</Text>
      <View style={s.row}>{Array.from({ length: 24 }, (_, i) => i + 1).map(day => {
        const checked = draft.days.includes(day);
        return <TouchableOpacity key={day} accessibilityRole="checkbox" accessibilityLabel={`${t('reminderDays')}: ${day}`}
          accessibilityState={{ checked, disabled }} disabled={disabled} onPress={() => change('days', checked ? draft.days.filter(d => d !== day) : [...draft.days, day].sort((a, b) => a - b))}
          style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.christmasGreen, backgroundColor: checked ? colors.christmasGreen : colors.white }}>
          <Text style={[s.text, checked && { color: colors.white }]}>{day}</Text>
        </TouchableOpacity>;
      })}</View>
      {errors.days && <Text style={s.warning}>{errors.days}</Text>}
      <Field label={t('reminderTime')} value={draft.time} editable={!disabled} onChangeText={value => change('time', value)} error={errors.time} placeholder="09:00" />
      <Text style={reminders.permission === 'denied' ? s.warning : s.muted}>{t(permissionKey[reminders.permission])}</Text>
      {(reminders.permission === 'denied' || (data.settings.notificationsEnabled && reminders.permission === 'unknown')) &&
        <Button title={t('openSystemSettings')} variant="secondary" disabled={disabled} onPress={() => { void Linking.openSettings().catch(() => Alert.alert(t('error'), t('permissionDenied'))); }} />}
      <Text style={s.muted}>{reminders.next ? t('nextReminder', { date: new Intl.DateTimeFormat(LOCALES[data.settings.language], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(reminders.next) }) : t('noNextReminder')}</Text>
    </View>
    <View style={s.card}>
      <Field label={t('shoppingYear')} value={draft.year} editable={!disabled} keyboardType="number-pad" onChangeText={value => change('year', value)} error={errors.year} />
      <Text style={s.muted}>{t('yearHelp')}</Text>
      <Text style={s.text}>{t('language')}</Text><View style={s.row}>{(['en', 'de', 'hu'] as Language[]).map(language =>
        <TouchableOpacity key={language} accessibilityRole="radio" accessibilityLabel={{ en: 'English', de: 'Deutsch', hu: 'Magyar' }[language]}
          accessibilityState={{ checked: draft.language === language, disabled }} disabled={disabled} onPress={() => change('language', language)}
          style={{ minHeight: 48, minWidth: 48, padding: 12, borderWidth: 2, borderRadius: 8, borderColor: draft.language === language ? colors.christmasGreen : colors.lightGray }}>
          <Text style={s.text}>{{ en: 'English', de: 'Deutsch', hu: 'Magyar' }[language]}</Text>
        </TouchableOpacity>)}</View>
    </View>
    {errors.save && <Text accessibilityLiveRegion="polite" style={s.warning}>{errors.save}</Text>}
    {saved && <Text accessibilityLiveRegion="polite" style={s.text}>{t('saved')}</Text>}
    {dirty && <Text style={s.muted}>{t('unsavedBody')}</Text>}
    <Button title={t('save')} disabled={disabled || !dirty} onPress={() => void save()} />
    <View style={s.card}>
      <Button title={t('privacy')} variant="secondary" onPress={() => setPrivacy(value => !value)} />
      {privacy && <Text style={s.text}>{t('privacyText')}</Text>}
      <Button title={t('deleteAll')} variant="danger" disabled={disabled} onPress={removeAll} />
    </View>
  </Screen>;
}
