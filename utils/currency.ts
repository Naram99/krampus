import { Currency, Language } from '../types';

export const MAX_MINOR = 100_000_000_000;
export const LOCALES: Record<Language, string> = { en: 'en-US', de: 'de-DE', hu: 'hu-HU' };

/** Accept comma/dot decimals and correctly grouped spaces; never parse a prefix. */
export function parseMoney(input: string, allowZero = true): number {
  const normalized = input.trim().replace(/[\u00a0\u202f]/g, ' ');
  if (!/^(?:\d+|\d{1,3}(?: \d{3})+)(?:[.,]\d{1,2})?$/.test(normalized)) throw new Error('invalidMoney');
  const [whole, fraction = ''] = normalized.replace(/ /g, '').split(/[.,]/);
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor > MAX_MINOR || minor < 0 || (!allowZero && minor === 0)) throw new Error('invalidMoney');
  return minor;
}
export function moneyInput(minor: number): string {
  return `${Math.floor(minor / 100)}${minor % 100 ? `.${String(minor % 100).padStart(2, '0')}` : ''}`;
}
export function formatCurrency(minor: number, currency: Currency, language: Language): string {
  const decimals = currency === 'HUF' && minor % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(LOCALES[language], {
    style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(minor / 100);
}
