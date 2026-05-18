/**
 * React hook for consistent currency formatting across the app.
 * Uses the account's selected currency for all monetary values.
 */
import { getCurrency } from '../utils/currency';

export function useCurrency(currencyCode: string) {
  const currency = getCurrency(currencyCode);

  const format = (value: number): string => {
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${currency.symbol}${Math.round(Math.abs(value)).toLocaleString()}`;
    }
  };

  const formatWithSign = (value: number): string => {
    const sign = value >= 0 ? '+' : '-';
    try {
      const formatted = new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(value));
      return `${sign}${formatted}`;
    } catch {
      return `${sign}${currency.symbol}${Math.round(Math.abs(value)).toLocaleString()}`;
    }
  };

  return { symbol: currency.symbol, code: currency.code, format, formatWithSign };
}
