import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { Currency, Language } from '../types';
import { moneyInput, parseMoney } from '../utils/currency';
import { createTranslator } from '../utils/i18n';
import { colors, sharedStyles as s } from '../utils/theme';
import { Button, Field } from './ui';

const languageNames: Record<Language, string> = { hu: 'Magyar', en: 'English', de: 'Deutsch' };
const suggestedBudgetMinor: Record<Currency, number> = { HUF: 500000, EUR: 5000, USD: 5000 };

export function Onboarding() {
  const { data, update, busy } = useApp();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState(data.settings.language);
  const [currency, setCurrency] = useState(data.settings.currency);
  const [noBudget, setNoBudget] = useState(data.settings.globalBudgetLimitMinor === null);
  const [budget, setBudget] = useState(data.settings.globalBudgetLimitMinor === null ? '' : moneyInput(data.settings.globalBudgetLimitMinor));
  const [defaultBudget, setDefaultBudget] = useState(moneyInput(data.settings.defaultPriceLimitMinor));
  const defaultBudgetEdited = useRef(false);
  const submitting = useRef(false);
  const [errors, setErrors] = useState<{ budget?: boolean; defaultBudget?: boolean; save?: boolean }>({});
  const t = useMemo(() => createTranslator(language), [language]);

  useEffect(() => {
    if (Platform.OS !== 'android' || step === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!submitting.current) setStep(0);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  const chooseCurrency = (next: Currency) => {
    if (!defaultBudgetEdited.current && next !== currency) setDefaultBudget(moneyInput(suggestedBudgetMinor[next]));
    setCurrency(next); setErrors({});
  };
  const finish = async (skip: boolean) => {
    if (busy || submitting.current) return;
    let globalBudgetLimitMinor: number | null = null;
    let defaultPriceLimitMinor = 0;
    if (!skip) {
      const invalid: typeof errors = {};
      if (!noBudget) try { globalBudgetLimitMinor = parseMoney(budget, false); } catch { invalid.budget = true; }
      try { defaultPriceLimitMinor = parseMoney(defaultBudget, false); } catch { invalid.defaultBudget = true; }
      setErrors(invalid);
      if (Object.keys(invalid).length) return;
    }
    submitting.current = true;
    try {
      await update(current => ({ ...current, onboardingCompleted: true,
        settings: skip ? current.settings : { ...current.settings, language, currency, globalBudgetLimitMinor, defaultPriceLimitMinor },
      }));
    } catch { setErrors(previous => ({ ...previous, save: true })); }
    finally { submitting.current = false; }
  };

  return <SafeAreaView style={s.screen}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, styles.content]}>
        <View style={styles.brand}>
          <Text style={styles.brandName}>🎁 Krampus</Text>
          <Text style={s.muted}>{t('onboardingStep', { step: step + 1, total: 2 })}</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel={t('onboardingSetup')}
          accessibilityValue={{ min: 0, max: 2, now: step + 1, text: t('onboardingStep', { step: step + 1, total: 2 }) }} style={styles.track}>
          <View style={[styles.fill, { width: step === 0 ? '50%' : '100%' }]} />
        </View>
        <View style={s.card}>
          <Text accessibilityRole="header" style={s.title}>{t(step === 0 ? 'onboardingWelcome' : 'onboardingBudgetTitle')}</Text>
          <Text style={s.text}>{t(step === 0 ? 'onboardingWelcomeBody' : 'onboardingBudgetBody')}</Text>
          {step === 0 ? <>
            <Text style={s.heading}>{t('language')}</Text>
            {(['hu', 'en', 'de'] as Language[]).map(option => <TouchableOpacity key={option}
              accessibilityRole="radio" accessibilityLabel={languageNames[option]} accessibilityState={{ checked: language === option, disabled: busy }}
              disabled={busy} onPress={() => setLanguage(option)} style={[styles.languageChoice, language === option && styles.selected]}>
              <Text style={[s.text, language === option && styles.selectedText]}>{languageNames[option]}</Text>
              {language === option && <Text accessible={false} style={styles.selectedText}>✓</Text>}
            </TouchableOpacity>)}
          </> : <>
            <Text style={s.heading}>{t('currency')}</Text>
            <View style={s.row}>{(['HUF', 'EUR', 'USD'] as Currency[]).map(option => <TouchableOpacity key={option}
              accessibilityRole="radio" accessibilityLabel={option} accessibilityState={{ checked: currency === option, disabled: busy }}
              disabled={busy} onPress={() => chooseCurrency(option)} style={[styles.currencyChoice, currency === option && styles.selected]}>
              <Text style={[s.text, currency === option && styles.selectedText]}>{option}</Text>
            </TouchableOpacity>)}</View>
            <Text style={s.muted}>{t('onboardingCurrencyHelp')}</Text>
            <View style={s.row}>
              <Text style={[s.text, { flex: 1 }]}>{t('noBudget')}</Text>
              <Switch accessibilityLabel={t('noBudget')} value={noBudget} disabled={busy}
                onValueChange={value => { setNoBudget(value); setErrors({}); }} trackColor={{ true: colors.christmasGreen }} />
            </View>
            {!noBudget && <Field label={`${t('globalBudget')} (${currency})`} keyboardType="decimal-pad" value={budget} editable={!busy}
              onChangeText={value => { setBudget(value); setErrors({}); }} error={errors.budget ? t('positiveMoney') : undefined} />}
            <Field label={`${t('defaultBudget')} (${currency})`} keyboardType="decimal-pad" value={defaultBudget} editable={!busy}
              onChangeText={value => { defaultBudgetEdited.current = true; setDefaultBudget(value); setErrors({}); }}
              error={errors.defaultBudget ? t('positiveMoney') : undefined} />
            <Text style={s.muted}>{t('onboardingDefaultHelp')}</Text>
          </>}
        </View>
        {errors.save && <Text accessibilityLiveRegion="polite" style={s.warning}>{t('saveError')}</Text>}
        <Button title={t(step === 0 ? 'onboardingNext' : 'onboardingFinish')} disabled={busy}
          onPress={() => { if (step === 0) setStep(1); else void finish(false); }} />
        {step === 1 && <Button title={t('onboardingBack')} variant="secondary" disabled={busy} onPress={() => setStep(0)} />}
        <Button title={t('onboardingSkip')} variant="secondary" disabled={busy} onPress={() => void finish(true)} />
        <Text style={[s.muted, { textAlign: 'center' }]}>{t('onboardingSkipHelp')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', maxWidth: 520 },
  brand: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brandName: { fontSize: 22, fontWeight: '700', color: colors.christmasRed },
  track: { height: 6, backgroundColor: colors.lightGray, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.christmasGreen },
  languageChoice: { minHeight: 56, borderRadius: 8, borderWidth: 1, borderColor: colors.gingerbread, padding: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  currencyChoice: { minHeight: 48, minWidth: 80, flexGrow: 1, flexBasis: 80, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.gingerbread, borderRadius: 8 },
  selected: { backgroundColor: colors.christmasGreen, borderColor: colors.christmasGreen },
  selectedText: { color: colors.white, fontWeight: '600' },
});
