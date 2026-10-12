export type Currency = 'USD' | 'EUR' | 'HUF';
export type Language = 'en' | 'de' | 'hu';

/** Monetary values are integer hundredths, including HUF. */
export interface Person {
  id: string;
  name: string;
  presentType: string;
  presentName: string;
  priceLimitMinor: number;
  isBought: boolean;
  actualPriceMinor?: number;
}
export interface AppSettings {
  globalBudgetLimitMinor: number | null;
  defaultPriceLimitMinor: number;
  notificationsEnabled: boolean;
  currency: Currency;
  language: Language;
  reminderDays: number[];
  reminderHour: number;
  reminderMinute: number;
}
export interface AppData {
  version: 2;
  shoppingYear: number;
  people: Person[];
  settings: AppSettings;
}
