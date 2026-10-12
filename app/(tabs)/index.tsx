import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Dialog, Field } from '../../components/ui';
import { ReminderNotice } from '../../components/ReminderNotice';
import { useApp } from '../../state/AppProvider';
import { Person } from '../../types';
import { formatCurrency, moneyInput, parseMoney } from '../../utils/currency';
import { calculateStats } from '../../utils/data';
import { colors, sharedStyles as s } from '../../utils/theme';

export default function MainPage() {
  const { data, update, busy, t } = useApp();
  const router = useRouter();
  const [selected, setSelected] = useState<Person | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const { currency, language, globalBudgetLimitMinor: limit } = data.settings;
  const money = (minor: number) => formatCurrency(minor, currency, language);
  const stats = calculateStats(data.people, limit);
  const sorted = [...data.people].sort((a, b) => Number(a.isBought) - Number(b.isBought));
  const editPrice = (person: Person) => {
    setSelected(person); setInput(person.actualPriceMinor === undefined ? '' : moneyInput(person.actualPriceMinor)); setError('');
  };
  const toggle = async (person: Person) => {
    if (!person.isBought) { editPrice(person); return; }
    try { await update(current => ({ ...current, people: current.people.map(p => p.id === person.id ? { ...p, isBought: false } : p) })); }
    catch { Alert.alert(t('error'), t('saveError')); }
  };
  const savePrice = async () => {
    if (!selected || busy) return;
    let amount: number;
    try { amount = parseMoney(input); } catch { setError(t('invalidMoney')); return; }
    try {
      await update(current => ({ ...current, people: current.people.map(p => p.id === selected.id ? { ...p, isBought: true, actualPriceMinor: amount } : p) }));
      setSelected(null);
    } catch { setError(t('saveError')); }
  };
  const header = <View style={{ gap: 16, marginBottom: 16 }}>
    <ReminderNotice />
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.title}>{t('shoppingYear')}: {data.shoppingYear}</Text>
      <Text style={s.text}>{t('progress', stats)}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel={t('progressLabel')}
        accessibilityValue={{ min: 0, max: 100, now: stats.percent, text: t('progress', stats) }} style={styles.track}>
        <View style={[styles.fill, { width: `${stats.percent}%` }]} />
      </View>
      {stats.total > 0 && stats.bought === stats.total && <Text style={styles.done}>{t('allDone')}</Text>}
      <Text style={s.text}>{t('spent')}: {money(stats.spentMinor)}</Text>
      <Text style={s.muted}>{t('planned')}: {money(stats.plannedMinor)}</Text>
      <Text style={s.text}>{t('estimated')}: {money(stats.estimatedMinor)}</Text>
      <Text style={s.muted}>{t('estimateHelp')}</Text>
      {limit === null ? <Text style={s.muted}>{t('noBudget')}</Text> : <>
        <Text style={s.text}>{t('globalBudget')}: {money(limit)}</Text>
        {stats.overMinor > 0 ? <Text accessibilityLiveRegion="polite" style={s.warning}>⚠ {t('overBudget', { amount: money(stats.overMinor) })}</Text>
          : <Text style={s.text}>{t('remaining', { amount: money(limit - stats.spentMinor) })}</Text>}
        {stats.bought < stats.total && stats.estimatedOverMinor > 0 && <Text style={s.warning}>⚠ {t('estimatedOver', { amount: money(stats.estimatedOverMinor) })}</Text>}
      </>}
    </View>
  </View>;
  return <SafeAreaView edges={['left', 'right']} style={s.screen}>
    <FlatList data={sorted} keyExtractor={p => p.id} contentContainerStyle={s.content} ListHeaderComponent={header}
      ListEmptyComponent={<View style={s.card}><Text style={s.text}>{t('empty')}</Text>
        <Button title={t('addPerson')} disabled={busy} onPress={() => router.navigate({ pathname: '/people', params: { add: '1' } })} />
      </View>}
      renderItem={({ item }) => {
        const difference = (item.actualPriceMinor ?? 0) - item.priceLimitMinor;
        return <View style={[s.card, { marginBottom: 12 }]}>
          <View style={styles.personHeader}>
            <Text style={[s.heading, { flex: 1 }]}>{item.name}</Text>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: item.isBought, disabled: busy }}
              accessibilityLabel={t(item.isBought ? 'unmarkBought' : 'markBought', { name: item.name })}
              disabled={busy} onPress={() => void toggle(item)} style={[styles.checkbox, item.isBought && styles.checked]}>
              <Text style={[styles.checkText, item.isBought && { color: colors.white }]}>{item.isBought ? '✓' : ''}</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.text}>{item.presentName || item.presentType || t('noIdea')}</Text>
          <Text style={s.muted}>{t('personBudget')}: {money(item.priceLimitMinor)}</Text>
          {item.isBought && <>
            <Text style={s.text}>{t('actualPrice')}: {money(item.actualPriceMinor ?? 0)}</Text>
            <Text style={difference > 0 ? s.warning : s.text}>
              {difference > 0 ? `⚠ ${t('overBudget', { amount: money(difference) })}` : difference === 0 ? t('atPersonBudget') : t('underPersonBudget', { amount: money(-difference) })}
            </Text>
            <Button title={t('editPrice')} label={`${t('editPrice')}: ${item.name}`} variant="secondary" disabled={busy} onPress={() => editPrice(item)} />
          </>}
        </View>;
      }} />
    <Dialog visible={selected !== null} title={`${t('actualPrice')}: ${selected?.name ?? ''}`} onClose={() => { if (!busy) setSelected(null); }}>
      <Text style={s.muted}>{t('personBudget')}: {money(selected?.priceLimitMinor ?? 0)}</Text>
      <Field label={`${t('actualPrice')} (${currency})`} keyboardType="decimal-pad" value={input} editable={!busy}
        onChangeText={value => { setInput(value); setError(''); }} error={error} autoFocus />
      <Button title={t('save')} disabled={busy} onPress={() => void savePrice()} />
      <Button title={t('cancel')} variant="secondary" disabled={busy} onPress={() => setSelected(null)} />
    </Dialog>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  track: { height: 12, borderRadius: 6, backgroundColor: colors.lightGray, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.christmasGreen }, done: { fontSize: 18, fontWeight: '700', color: colors.success },
  personHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 48, height: 48, borderWidth: 2, borderRadius: 8, borderColor: colors.christmasGreen, justifyContent: 'center', alignItems: 'center' },
  checked: { backgroundColor: colors.christmasGreen }, checkText: { fontSize: 24, color: colors.christmasGreen },
});
