/**
 * Canonical segment definitions with normalized keys.
 * Every part of the app MUST use these normalized keys.
 *
 * The charge engine ONLY recognizes these exact lowercase values.
 */
export type SegmentKey =
  | 'equity_delivery'
  | 'equity_intraday'
  | 'futures'
  | 'options'
  | 'currency'
  | 'commodity';

/**
 * Human-readable labels for the UI dropdown.
 */
export const SEGMENT_LABELS: Record<SegmentKey, string> = {
  equity_delivery: 'Equity Delivery (CNC)',
  equity_intraday: 'Equity Intraday (MIS)',
  futures: 'Futures',
  options: 'Options',
  currency: 'Currency (CDS)',
  commodity: 'Commodity (MCX)',
};

/**
 * Segment keys sorted by popularity for the UI dropdown.
 */
export const SEGMENT_OPTIONS: SegmentKey[] = [
  'equity_intraday',
  'equity_delivery',
  'futures',
  'options',
  'currency',
  'commodity',
];

/**
 * Normalize ANY segment input string → canonical SegmentKey.
 *
 * This is the SINGLE SOURCE OF TRUTH for segment mapping.
 * All UI inputs, CSV imports, API responses, and localStorage values
 * must pass through this function before charge calculation.
 *
 * Mapping rules:
 *   "EQ"          → equity_delivery  (users expect delivery when they say "EQ")
 *   "equity"      → equity_delivery
 *   "delivery"    → equity_delivery
 *   "CNC"         → equity_delivery
 *   "intraday"    → equity_intraday
 *   "MIS"         → equity_intraday
 *   "EQ_INTRA"    → equity_intraday
 *   "FNO"         → options  (most F&O traders trade options)
 *   "futures"     → futures
 *   "FUT"         → futures
 *   "options"     → options
 *   "OPT"         → options
 *   "CE"/"PE"     → options
 *   "CDS"         → currency
 *   "currency"    → currency
 *   "MCX"         → commodity
 *   "commodity"   → commodity
 *   anything else → equity_intraday (safest default for active traders)
 */
export function normalizeSegment(raw: string | undefined | null): SegmentKey {
  if (!raw || typeof raw !== 'string') {
    console.warn('[Segment] Empty segment, defaulting to equity_intraday');
    return 'equity_intraday';
  }

  const s = raw.toLowerCase().trim();

  // Equity Delivery
  if (s === 'equity_delivery' || s === 'eq' || s === 'equity' || s === 'delivery' || s === 'cnc' || s === 'eq_del') {
    return 'equity_delivery';
  }

  // Equity Intraday
  if (s === 'equity_intraday' || s === 'intraday' || s === 'mis' || s === 'eq_intra') {
    return 'equity_intraday';
  }

  // Futures
  if (s === 'futures' || s === 'fut' || s === 'fut_idx') {
    return 'futures';
  }

  // Options (including legacy FNO)
  if (s === 'options' || s === 'opt' || s === 'opt_idx' || s === 'ce' || s === 'pe' || s === 'fno' || s === 'f&o') {
    return 'options';
  }

  // Currency
  if (s === 'cds' || s === 'currency' || s === 'cur_fut') {
    return 'currency';
  }

  // Commodity
  if (s === 'mcx' || s === 'commodity') {
    return 'commodity';
  }

  // Unknown — log warning, default to intraday
  console.warn(`[Segment] Unknown segment "${raw}". Defaulting to equity_intraday.`);
  return 'equity_intraday';
}
