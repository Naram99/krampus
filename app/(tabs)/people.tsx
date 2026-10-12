import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Dialog, Field } from '../../components/ui';
import { ReminderNotice } from '../../components/ReminderNotice';
import { useApp } from '../../state/AppProvider';
import { Person } from '../../types';
import { formatCurrency, moneyInput, parseMoney } from '../../utils/currency';
import { newPersonId } from '../../utils/data';
import { sharedStyles as s } from '../../utils/theme';

export default function PeoplePage() {
  const { data, update, busy, t } = useApp();
  const params = useLocalSearchParams<{ add?: string }>();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', gift: '', budget: '' });
  const [errors, setErrors] = useState<{ name?: string; budget?: string; save?: string }>({});
  const { currency, language, defaultPriceLimitMinor } = data.settings;
  const open = (person?: Person) => {
    setEditing(person?.id ?? null);
    setForm({ name: person?.name ?? '', category: person?.presentType ?? '', gift: person?.presentName ?? '', budget: moneyInput(person?.priceLimitMinor ?? defaultPriceLimitMinor) });
    setErrors({}); setVisible(true);
  };
  useEffect(() => {
    if (params.add === '1') {
      setEditing(null); setForm({ name: '', category: '', gift: '', budget: moneyInput(defaultPriceLimitMinor) });
      setErrors({}); setVisible(true); router.setParams({ add: undefined });
    }
  }, [params.add, defaultPriceLimitMinor, router]);
  const save = async () => {
    if (busy) return;
    const nextErrors: typeof errors = {};
    if (!form.name.trim()) nextErrors.name = t('invalidName');
    let priceLimitMinor = 0;
    try { priceLimitMinor = parseMoney(form.budget, false); } catch { nextErrors.budget = t('positiveMoney'); }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await update(current => {
        const fields = { name: form.name.trim(), presentType: form.category.trim(), presentName: form.gift.trim(), priceLimitMinor };
        const people = editing ? current.people.map(p => p.id === editing ? { ...p, ...fields } : p)
          : [...current.people, { ...fields, id: newPersonId(current.people), isBought: false }];
        return { ...current, people };
      });
      setVisible(false);
    } catch { setErrors({ save: t('saveError') }); }
  };
  const remove = (person: Person) => Alert.alert(t('deletePersonTitle', { name: person.name }), t('deletePersonBody'), [
    { text: t('cancel'), style: 'cancel' }, { text: t('delete'), style: 'destructive', onPress: () => {
      void update(current => ({ ...current, people: current.people.filter(p => p.id !== person.id) })).catch(() => Alert.alert(t('error'), t('saveError')));
    } },
  ]);
  return <SafeAreaView edges={['left', 'right']} style={s.screen}>
    <FlatList data={data.people} keyExtractor={p => p.id} contentContainerStyle={s.content}
      ListHeaderComponent={<View style={{ gap: 16, marginBottom: 16 }}><ReminderNotice />
        <Button title={t('addPerson')} disabled={busy} onPress={() => open()} />
      </View>}
      ListEmptyComponent={<View style={s.card}><Text style={s.text}>{t('empty')}</Text></View>}
      renderItem={({ item }) => <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={s.heading}>{item.name}</Text>
        <Text style={s.text}>{item.presentName || item.presentType || t('noIdea')}</Text>
        <Text style={s.muted}>{t('personBudget')}: {formatCurrency(item.priceLimitMinor, currency, language)}</Text>
        <View style={s.row}>
          <Button title={t('edit')} label={`${t('edit')}: ${item.name}`} variant="secondary" disabled={busy} onPress={() => open(item)} />
          <Button title={t('delete')} label={`${t('delete')}: ${item.name}`} variant="danger" disabled={busy} onPress={() => remove(item)} />
        </View>
      </View>} />
    <Dialog visible={visible} title={t(editing ? 'editPerson' : 'addPerson')} onClose={() => { if (!busy) setVisible(false); }}>
      <Field label={`${t('name')} *`} value={form.name} editable={!busy} error={errors.name} onChangeText={name => setForm({ ...form, name })} autoFocus />
      <Field label={t('category')} value={form.category} editable={!busy} onChangeText={category => setForm({ ...form, category })} />
      <Field label={t('giftName')} value={form.gift} editable={!busy} onChangeText={gift => setForm({ ...form, gift })} />
      <Field label={`${t('personBudget')} (${currency}) *`} value={form.budget} editable={!busy} keyboardType="decimal-pad" error={errors.budget} onChangeText={budget => setForm({ ...form, budget })} />
      {errors.save && <Text accessibilityLiveRegion="polite" style={s.warning}>{errors.save}</Text>}
      <Button title={t('save')} disabled={busy} onPress={() => void save()} />
      <Button title={t('cancel')} disabled={busy} variant="secondary" onPress={() => setVisible(false)} />
    </Dialog>
  </SafeAreaView>;
}
