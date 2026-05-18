/**
 * Safe value formatter for analytics and insights.
 * Prevents [object Object] by extracting readable labels from any value type.
 * Returns null for truly unformattable values.
 */

export function fmt(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;

  // Primitives
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return null;
    return String(val);
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';

  // Objects — extract the most meaningful label
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    // Try common label fields in priority order
    const keys = ['label', 'day', 'name', 'setup', 'emotion', 'value', 'title', 'period'];
    for (const key of keys) {
      if (obj[key] && typeof obj[key] === 'string') {
        return (obj[key] as string).trim();
      }
    }
    // Fallback: try first string property
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
  }

  return null;
}

/**
 * Format a currency value safely.
 */
export function fmtCurrency(val: number | unknown): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num) || !isFinite(num)) return '₹0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Format a percentage safely.
 */
export function fmtPct(val: number | unknown): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num) || !isFinite(num)) return '0%';
  return `${Math.round(num)}%`;
}

/**
 * Format a PnL value with sign.
 */
export function fmtPnl(val: number | unknown): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num) || !isFinite(num)) return '₹0';
  const sign = num >= 0 ? '+' : '-';
  return `${sign}₹${Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Guard: returns null if ANY key value is unformattable.
 * Use this to skip rendering broken insights entirely.
 */
export function fmtGuard(...values: unknown[]): boolean {
  return values.every(v => fmt(v) !== null);
}
