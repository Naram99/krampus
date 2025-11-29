import { Currency } from '../types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  HUF: 'Ft',
};

export const formatCurrency = (amount: number, currency: Currency): string => {
  const symbol = CURRENCY_SYMBOLS[currency];
  // For HUF, typically no decimal places, for others use 2
  const decimals = currency === 'HUF' ? 0 : 2;
  return `${symbol}${amount.toFixed(decimals)}`;
};

export const getCurrencySymbol = (currency: Currency): string => {
  return CURRENCY_SYMBOLS[currency];
};

