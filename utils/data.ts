import { AppData, AppSettings, Language, Person } from '../types';
import { MAX_MINOR } from './currency';

export const DEFAULT_DAYS = [1, 10, 15, 20, 22, 23, 24];
export function deviceLanguage(): Language {
  try {
    const language = Intl.DateTimeFormat().resolvedOptions().locale.split(/[-_]/)[0];
    return language === 'hu' || language === 'de' ? language : 'en';
  } catch { return 'en'; }
}
export function defaultData(language: Language = deviceLanguage(), year = new Date().getFullYear()): AppData {
  return { version: 2, shoppingYear: year, people: [], settings: {
    globalBudgetLimitMinor: null, defaultPriceLimitMinor: 5000, notificationsEnabled: false,
    currency: 'USD', language, reminderDays: [...DEFAULT_DAYS], reminderHour: 9, reminderMinute: 0,
  } };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalidData');
  return value as Record<string, unknown>;
}
function amount(value: unknown, positive = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (positive ? 1 : 0) || value > MAX_MINOR) throw new Error('invalidData');
  return value;
}
function text(value: unknown, required = false): string {
  if (typeof value !== 'string' || (required && !value.trim())) throw new Error('invalidData');
  return value;
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error('invalidData');
  return value;
}
export function validateData(value: unknown): AppData {
  const data = object(value);
  if (data.version !== 2) throw new Error('unsupportedVersion');
  integer(data.shoppingYear, 2000, 9999);
  if (!Array.isArray(data.people) || data.people.length > 10000) throw new Error('invalidData');
  const ids = new Set<string>();
  for (const raw of data.people) {
    const person = object(raw);
    const id = text(person.id, true);
    if (ids.has(id)) throw new Error('invalidData');
    ids.add(id);
    text(person.name, true); text(person.presentName); text(person.presentType);
    amount(person.priceLimitMinor, true);
    if (typeof person.isBought !== 'boolean') throw new Error('invalidData');
    if (person.actualPriceMinor !== undefined) amount(person.actualPriceMinor);
    if (person.isBought && person.actualPriceMinor === undefined) throw new Error('invalidData');
  }
  const settings = object(data.settings);
  if (settings.globalBudgetLimitMinor !== null) amount(settings.globalBudgetLimitMinor, true);
  amount(settings.defaultPriceLimitMinor, true);
  if (typeof settings.notificationsEnabled !== 'boolean' || typeof settings.currency !== 'string' || !['USD', 'EUR', 'HUF'].includes(settings.currency) || typeof settings.language !== 'string' || !['en', 'de', 'hu'].includes(settings.language)) throw new Error('invalidData');
  if (!Array.isArray(settings.reminderDays) || new Set(settings.reminderDays).size !== settings.reminderDays.length) throw new Error('invalidData');
  settings.reminderDays.forEach(day => integer(day, 1, 24));
  if (settings.notificationsEnabled && !settings.reminderDays.length) throw new Error('invalidData');
  integer(settings.reminderHour, 0, 23); integer(settings.reminderMinute, 0, 59);
  return value as AppData;
}
/** Reject unsupported legacy precision instead of silently rounding user's data. */
function legacyMoney(value: unknown, positive = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('invalidData');
  const scaled = value * 100, minor = Math.round(scaled);
  if (Math.abs(scaled - minor) > 0.0001) throw new Error('invalidData');
  return amount(minor, positive);
}
export function migrateLegacy(peopleJson: string | null, settingsJson: string | null, defaults: AppData): AppData {
  const people: unknown = peopleJson === null ? [] : JSON.parse(peopleJson);
  if (!Array.isArray(people)) throw new Error('invalidData');
  const settings = settingsJson === null ? {} : object(JSON.parse(settingsJson));
  const nextSettings: AppSettings = { ...defaults.settings };
  if (settings.globalBudgetLimit !== undefined) {
    const budget = legacyMoney(settings.globalBudgetLimit);
    nextSettings.globalBudgetLimitMinor = budget === 0 ? null : budget;
  }
  if (settings.defaultPriceLimit !== undefined) nextSettings.defaultPriceLimitMinor = legacyMoney(settings.defaultPriceLimit, true);
  for (const key of ['currency', 'language', 'notificationsEnabled'] as const) {
    if (settings[key] !== undefined) Object.assign(nextSettings, { [key]: settings[key] });
  }
  return validateData({ ...defaults, settings: nextSettings, people: people.map(raw => {
    const p = object(raw);
    // The former dashboard interpreted an absent purchased price as zero.
    const actualPriceMinor = p.actualPrice === undefined ? (p.isBought === true ? 0 : undefined) : legacyMoney(p.actualPrice);
    return { id: p.id, name: p.name, presentType: p.presentType ?? '', presentName: p.presentName ?? '',
      priceLimitMinor: legacyMoney(p.priceLimit, true), isBought: p.isBought, actualPriceMinor };
  }) });
}
export function calculateStats(people: Person[], limit: number | null) {
  const bought = people.filter(p => p.isBought);
  const spentMinor = bought.reduce((sum, p) => sum + (p.actualPriceMinor ?? 0), 0);
  const plannedMinor = people.reduce((sum, p) => sum + p.priceLimitMinor, 0);
  const estimatedMinor = spentMinor + people.filter(p => !p.isBought).reduce((sum, p) => sum + p.priceLimitMinor, 0);
  return { total: people.length, bought: bought.length, percent: people.length ? Math.round(bought.length / people.length * 100) : 0,
    spentMinor, plannedMinor, estimatedMinor, overMinor: limit === null ? 0 : Math.max(0, spentMinor - limit),
    estimatedOverMinor: limit === null ? 0 : Math.max(0, estimatedMinor - limit) };
}

let idSequence = 0;
export function newPersonId(people: Person[]): string {
  const used = new Set(people.map(p => p.id));
  let id: string;
  do { id = `${Date.now().toString(36)}-${(++idSequence).toString(36)}`; } while (used.has(id));
  return id;
}
