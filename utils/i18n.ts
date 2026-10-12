import en from '../translations/en';
import de from '../translations/de';
import hu from '../translations/hu';
import { Language } from '../types';

export type TranslationKey = keyof typeof en;
const translations = { en, de, hu };
export function createTranslator(language: Language) {
  return (key: TranslationKey, values: Record<string, string | number> = {}): string =>
    translations[language][key].replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
