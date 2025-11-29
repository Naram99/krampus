export interface Person {
  id: string;
  name: string;
  presentType: string;
  presentName: string;
  priceLimit: number;
  isBought: boolean;
  actualPrice?: number;
}

export type Currency = 'USD' | 'EUR' | 'HUF';
export type Language = 'en' | 'de' | 'hu';

export interface AppSettings {
  globalBudgetLimit: number;
  defaultPriceLimit: number;
  notificationsEnabled: boolean;
  currency: Currency;
  language: Language;
}

