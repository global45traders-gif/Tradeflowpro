export interface Currency {
  code: string;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'en-DE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'AED', symbol: 'د.إ', locale: 'en-AE' },
  { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', locale: 'en-CA' },
  { code: 'JPY', symbol: '¥', locale: 'en-JP' },
  { code: 'SGD', symbol: 'S$', locale: 'en-SG' },
];

export function getCurrency(code: string): Currency {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}

export function formatCurrency(value: number, currencyCode: string = 'INR'): string {
  const currency = getCurrency(currencyCode);
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency.symbol}${Math.round(Math.abs(value)).toLocaleString('en-IN')}`;
  }
}

export function formatCurrencyWithSign(value: number, currencyCode: string = 'INR'): string {
  const currency = getCurrency(currencyCode);
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
    return `${sign}${currency.symbol}${Math.round(Math.abs(value)).toLocaleString('en-IN')}`;
  }
}

export function getSymbol(currencyCode: string): string {
  return getCurrency(currencyCode).symbol;
}
