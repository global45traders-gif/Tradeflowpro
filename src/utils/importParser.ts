import { Trade, TradeCharges } from '../utils/types';
import { calculateTradePnL, calculateTradePnLPercent, calculateTradeRR, calculateCharges, calculateNetPnl } from './tradeUtils';

// Column name variations mapped to internal field keys
export const columnMappings: Record<string, string[]> = {
  date: ['date', 'trade date', 'order date', 'entry date', 'transaction date', 'executed date', 'trade date & time'],
  symbol: ['symbol', 'instrument', 'trading symbol', 'instrument type', 'tradingsymbol', 'security', 'script', 'name', 'stock'],
  type: ['type', 'side', 'transaction type', 'buy/sell', 'action', 'direction', 'trade type'],
  entryPrice: ['entry price', 'buy price', 'avg buy price', 'avg price', 'price', 'average price', 'avg. buy price', 'buy avg price', 'fill price', 'entry'],
  exitPrice: ['exit price', 'sell price', 'avg sell price', 'average sell price', 'sell avg price', 'exit', 'avg. sell price'],
  quantity: ['quantity', 'qty', 'filled qty', 'filled quantity', 'size', 'lot size', 'lots', 'total quantity', 'trade qty'],
  stopLoss: ['stop loss', 'sl', 'stoploss', 'stop', 'sl price'],
  target: ['target', 'tgt', 'take profit', 'tp'],
  notes: ['notes', 'remarks', 'comments', 'description', 'reason', 'comment', 'remark'],
  emotion: ['emotion', 'psychology', 'mental state', 'mood', 'feeling', 'sentiment'],
  segment: ['segment', 'segment type', 'product type', 'product', 'instrument type'],
  setup: ['setup', 'strategy', 'pattern', 'trade setup', 'setup type'],
  entryTime: ['entry time', 'buy time', 'time', 'order time', 'trade time', 'executed time'],
  exitTime: ['exit time', 'sell time'],
  pnl: ['pnl', 'realized pnl', 'realised pnl', 'profit loss', 'p&l'],
  charges: ['charges', 'total charges', 'fees', 'total fees', 'brokerage charges', 'total brokerage', 'txn charges'],
};

// Normalize column headers: lowercase, trim, remove special chars
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s/]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Auto-detect column mapping from file headers
export function autoDetectColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [field, variations] of Object.entries(columnMappings)) {
    for (const variation of variations) {
      const normVariation = normalizeHeader(variation);
      const idx = normalizedHeaders.findIndex(h =>
        h === normVariation ||
        h.includes(normVariation) ||
        normVariation.includes(h)
      );
      if (idx !== -1 && !mapping[field]) {
        mapping[field] = headers[idx];
      }
    }
  }

  return mapping;
}

// Check if required fields are mapped
export function getMissingRequiredFields(mapping: Record<string, string>): string[] {
  const required = ['date', 'symbol', 'type', 'entryPrice', 'exitPrice', 'quantity'];
  return required.filter(f => !mapping[f]);
}

// Detect if file looks like a Zerodha tradebook
export function detectZerodhaFormat(headers: string[]): boolean {
  const normalized = headers.map(normalizeHeader);
  const zerodhaIndicators = [
    'tradingsymbol', 'transaction type', 'average price', 'fill price',
    'product', 'segment', 'buy/sell', 'net qty', 'realized pnl'
  ];
  const matchCount = zerodhaIndicators.filter(z =>
    normalized.some(h => h.includes(z))
  ).length;
  return matchCount >= 2;
}

// Parse a Zerodha-style tradebook (handles separate buy/sell rows)
function parseZerodhaRow(row: Record<string, unknown>, mapping: Record<string, string>, accountId: string): Partial<Trade> | null {
  const getVal = (field: string): string => {
    const col = mapping[field];
    if (!col) return '';
    return String(row[col] ?? '').trim();
  };

  const getNum = (field: string): number => {
    const val = getVal(field);
    const cleaned = val.replace(/[₹,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Zerodha format: Transaction Type column tells BUY/SELL
  const rawType = getVal('type').toUpperCase();
  let type: 'BUY' | 'SELL' = rawType.includes('SELL') ? 'SELL' : 'BUY';

  const dateRaw = getVal('date');
  const date = parseDate(dateRaw);
  const symbol = getVal('symbol').toUpperCase();
  const entryPrice = getNum('entryPrice');
  const exitPrice = getNum('exitPrice');
  const quantity = Math.round(getNum('quantity'));

  if (!date || !symbol || !entryPrice || !quantity) return null;

  const stopLoss = getNum('stopLoss') || undefined;
  const target = getNum('target') || undefined;
  const notes = getVal('notes');
  const emotion = getVal('emotion') || undefined;
  const setup = getVal('setup') || undefined;
  const entryTime = getVal('entryTime') || undefined;
  const exitTime = getVal('exitTime') || undefined;
  const segmentRaw = getVal('segment').toUpperCase();
  let segment: 'EQ' | 'FNO' | 'CDS' | 'MCX' = 'EQ';
  if (segmentRaw.includes('FUT') || segmentRaw.includes('OPT') || segmentRaw.includes('FNO') || segmentRaw.includes('F&O')) segment = 'FNO';
  else if (segmentRaw.includes('CDS') || segmentRaw.includes('CUR') || segmentRaw.includes('CURRENCY')) segment = 'CDS';
  else if (segmentRaw.includes('MCX') || segmentRaw.includes('COM')) segment = 'MCX';

  // For Zerodha, exit price might be 0 if position is still open
  const finalExitPrice = exitPrice > 0 ? exitPrice : entryPrice; // If no exit, treat as breakeven

  const pnl = type === 'BUY'
    ? (finalExitPrice - entryPrice) * quantity
    : (entryPrice - finalExitPrice) * quantity;

  const pnlPercent = entryPrice * quantity > 0 ? (pnl / (entryPrice * quantity)) * 100 : 0;
  const rrRatio = stopLoss && stopLoss !== entryPrice
    ? (type === 'BUY' ? (finalExitPrice - entryPrice) / (entryPrice - stopLoss) : (entryPrice - finalExitPrice) / (stopLoss - entryPrice))
    : 0;

  const charges: TradeCharges = {
    brokerage: getNum('charges') > 0 ? getNum('charges') * 0.4 : 20,
    stt: getNum('charges') > 0 ? getNum('charges') * 0.1 : 0,
    gst: 2,
    sebiTurnover: 0.01,
    stampDuty: 0.5,
    exchangeTxn: 1,
    total: getNum('charges') > 0 ? getNum('charges') : 25,
    mode: 'flat',
  };

  const netPnl = calculateNetPnl(pnl, charges);

  return {
    id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    date,
    symbol,
    type,
    entryPrice,
    exitPrice: finalExitPrice,
    quantity,
    stopLoss,
    target,
    notes: notes || `Imported from broker file (${type})`,
    emotion: emotion || 'Confidence',
    pnl,
    pnlPercent,
    rrRatio: Number(rrRatio.toFixed(2)),
    charges,
    netPnl,
    segment,
    accountId,
    leverage: 1,
    rulesFollowed: [],
    setup: setup || undefined,
    entryTime: entryTime || undefined,
    exitTime: exitTime || undefined,
  };
}

// Standard parser for general CSV/XLSX files
function parseStandardRow(row: Record<string, unknown>, mapping: Record<string, string>, accountId: string): Partial<Trade> | null {
  const getVal = (field: string): string => {
    const col = mapping[field];
    if (!col) return '';
    return String(row[col] ?? '').trim();
  };

  const getNum = (field: string): number => {
    const val = getVal(field);
    const cleaned = val.replace(/[₹,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const date = parseDate(getVal('date'));
  const symbol = getVal('symbol').toUpperCase();
  const rawType = getVal('type').toUpperCase();
  const type: 'BUY' | 'SELL' = rawType.includes('SELL') || rawType.includes('SHORT') ? 'SELL' : 'BUY';
  const entryPrice = getNum('entryPrice');
  const exitPrice = getNum('exitPrice');
  const quantity = Math.round(getNum('quantity'));

  if (!date || !symbol || !entryPrice || !exitPrice || !quantity) return null;

  const stopLoss = getNum('stopLoss') || undefined;
  const target = getNum('target') || undefined;
  const notes = getVal('notes');
  const emotion = getVal('emotion') || 'Confidence';
  const setup = getVal('setup') || undefined;
  const entryTime = getVal('entryTime') || undefined;
  const exitTime = getVal('exitTime') || undefined;
  const segmentRaw = getVal('segment').toUpperCase();
  let segment: 'EQ' | 'FNO' | 'CDS' | 'MCX' = 'EQ';
  if (segmentRaw.includes('FUT') || segmentRaw.includes('OPT') || segmentRaw.includes('FNO')) segment = 'FNO';
  else if (segmentRaw.includes('CDS') || segmentRaw.includes('CURRENCY')) segment = 'CDS';
  else if (segmentRaw.includes('MCX') || segmentRaw.includes('COM')) segment = 'MCX';

  const pnl = calculateTradePnL(type, entryPrice, exitPrice, quantity);
  const pnlPercent = calculateTradePnLPercent(type, entryPrice, exitPrice, quantity);
  const rrRatio = calculateTradeRR(type, entryPrice, exitPrice, stopLoss);

  const charges = calculateCharges(segment, type, entryPrice, exitPrice, quantity);
  const netPnl = calculateNetPnl(pnl, charges);

  return {
    id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    date,
    symbol,
    type,
    entryPrice,
    exitPrice,
    quantity,
    stopLoss,
    target,
    notes,
    emotion,
    pnl,
    pnlPercent,
    rrRatio,
    charges,
    netPnl,
    segment,
    accountId,
    leverage: 1,
    rulesFollowed: [],
    setup,
    entryTime,
    exitTime,
  };
}

// Parse date from various formats
function parseDate(val: string): string {
  if (!val) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  // MM/DD/YYYY (US format) - only if month > 12 to disambiguate
  const mdyMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyMatch) {
    return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, '0')}-${mdyMatch[2].padStart(2, '0')}`;
  }

  // Excel serial date number
  const num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const excelDate = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(excelDate.getTime())) {
      return excelDate.toISOString().split('T')[0];
    }
  }

  // Try native Date parsing
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  // Handle "20-Mar-2026" or "20 Mar 2026" format
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const parts = val.split(/[\/\-\s]+/);
  if (parts.length === 3) {
    let day: string, month: string, year: string;
    const dayIdx = parts.findIndex(p => /^\d{1,2}$/.test(p));
    const yearIdx = parts.findIndex(p => /^\d{4}$/.test(p));

    if (dayIdx !== -1 && yearIdx !== -1) {
      day = parts[dayIdx].padStart(2, '0');
      year = parts[yearIdx];
      const monthPart = parts.find((_, i) => i !== dayIdx && i !== yearIdx) || '';
      const monthIdx = monthNames.findIndex(m => monthPart.toLowerCase().startsWith(m));
      month = monthIdx >= 0 ? String(monthIdx + 1).padStart(2, '0') : '01';
      return `${year}-${month}-${day}`;
    }
  }

  return '';
}

// Main parsing function
export function parseTradeData(
  data: Record<string, unknown>[],
  headers: string[],
  mapping: Record<string, string>,
  accountId: string
): { trades: Partial<Trade>[]; errors: string[]; warnings: string[] } {
  const trades: Partial<Trade>[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const isZerodha = detectZerodhaFormat(headers);
  const parser = isZerodha ? parseZerodhaRow : parseStandardRow;

  data.forEach((row, idx) => {
    try {
      const trade = parser(row, mapping, accountId);
      if (trade && trade.date && trade.symbol && (trade.entryPrice as number) > 0) {
        trades.push(trade);
      } else {
        // Skip empty/header rows silently
        const hasData = Object.values(row).some(v => {
          const s = String(v).trim();
          return s && s !== '0' && s !== '-' && s !== '';
        });
        if (hasData) {
          warnings.push(`Row ${idx + 2}: Skipped — missing required data (date, symbol, or price)`);
        }
      }
    } catch (e) {
      errors.push(`Row ${idx + 2}: Failed to parse — ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  });

  return { trades, errors, warnings };
}

// Get all unique column headers from parsed data
export function getAvailableColumns(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];
  return Object.keys(data[0]);
}

// Smart column mapping: try multiple strategies
export function smartColumnMapping(headers: string[]): { mapping: Record<string, string>; confidence: 'high' | 'medium' | 'low' } {
  const mapping = autoDetectColumns(headers);
  const missing = getMissingRequiredFields(mapping);

  if (missing.length === 0) return { mapping, confidence: 'high' };
  if (missing.length <= 2) return { mapping, confidence: 'medium' };
  return { mapping, confidence: 'low' };
}
