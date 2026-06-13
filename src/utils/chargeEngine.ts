import { TradeCharges } from './types';
import { SegmentKey, normalizeSegment } from './segmentMap';

// ═══════════════════════════════════════════════════════
// INDIAN MARKET CHARGE CONFIGURATIONS (2026 SEBI Rates)
// Keys MUST match SegmentKey from segmentMap.ts exactly.
// ═══════════════════════════════════════════════════════

interface ChargeRules {
  label: string;
  brokerageType: 'zero' | 'flat' | 'capped_percent';
  brokerageCap?: number;
  brokeragePercent?: number;
  brokerageFlat?: number;
  sttBuyPct: number;
  sttSellPct: number;
  stampDutyBuyPct: number;
  stampDutySellPct: number;
  exchangeTxnPct: number;
  sebiPerCr: number;
  gstPct: number;
}

export const segmentRules: Record<SegmentKey, ChargeRules> = {
  // ── Equity Delivery (CNC) ──
  // Brokerage: ₹0  |  STT: 0.1% buy + sell  |  Stamp: 0.015% buy
  equity_delivery: {
    label: 'Equity Delivery (CNC)',
    brokerageType: 'zero',
    sttBuyPct: 0.1,
    sttSellPct: 0.1,
    stampDutyBuyPct: 0.015,
    stampDutySellPct: 0,
    exchangeTxnPct: 0.00345,
    sebiPerCr: 10,
    gstPct: 18,
  },

  // ── Equity Intraday (MIS) ──
  // Brokerage: ₹20 or 0.03% per order (lower)  |  STT: 0.025% SELL only  |  Stamp: 0.003% buy
  equity_intraday: {
    label: 'Equity Intraday (MIS)',
    brokerageType: 'capped_percent',
    brokerageCap: 20,
    brokeragePercent: 0.03,
    sttBuyPct: 0,
    sttSellPct: 0.025,
    stampDutyBuyPct: 0.003,
    stampDutySellPct: 0,
    exchangeTxnPct: 0.00345,
    sebiPerCr: 10,
    gstPct: 18,
  },

  // ── Futures (FUT) ──
  // Brokerage: ₹20/order  |  STT: 0.01% SELL  |  Stamp: 0.002% buy
  futures: {
    label: 'Futures',
    brokerageType: 'flat',
    brokerageFlat: 20,
    sttBuyPct: 0,
    sttSellPct: 0.01,
    stampDutyBuyPct: 0.002,
    stampDutySellPct: 0,
    exchangeTxnPct: 0.0019,
    sebiPerCr: 10,
    gstPct: 18,
  },

  // ── Options (OPT) ──
  // Brokerage: ₹20/order  |  STT: 0.05% SELL (on premium)  |  Stamp: 0.003% buy
  options: {
    label: 'Options',
    brokerageType: 'flat',
    brokerageFlat: 20,
    sttBuyPct: 0,
    sttSellPct: 0.05,
    stampDutyBuyPct: 0.003,
    stampDutySellPct: 0,
    exchangeTxnPct: 0.053,
    sebiPerCr: 10,
    gstPct: 18,
  },

  // ── Currency Derivatives (CDS) ──
  // Brokerage: ₹20/order  |  STT: NONE  |  Stamp: 0.001% buy
  currency: {
    label: 'Currency (CDS)',
    brokerageType: 'flat',
    brokerageFlat: 20,
    sttBuyPct: 0,
    sttSellPct: 0,
    stampDutyBuyPct: 0.001,
    stampDutySellPct: 0,
    exchangeTxnPct: 0.00035,
    sebiPerCr: 10,
    gstPct: 18,
  },

  // ── Commodity (MCX) ──
  // Brokerage: ₹20/order  |  STT: 0.01% SELL  |  Stamp: 0.003% buy
  commodity: {
    label: 'Commodity (MCX)',
    brokerageType: 'flat',
    brokerageFlat: 20,
    sttBuyPct: 0,
    sttSellPct: 0.01,
    stampDutyBuyPct: 0.003,
    stampDutySellPct: 0,
    exchangeTxnPct: 0.0021,
    sebiPerCr: 10,
    gstPct: 18,
  },
};

// ── Safe number: returns val if valid, otherwise NaN ──
const safeNum = (val: number | string | undefined | null): number => {
  if (val === null || val === undefined) return NaN;
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? NaN : num;
};

// ── Round to 2 decimal places, safe against NaN ──
const r2 = (val: number): number => {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Number(Math.round(Number(val + 'e2')) + 'e-2');
};

/**
 * Calculate all charges for a trade based on Indian market (SEBI-compliant) rules.
 *
 * Uses normalized SegmentKey — NEVER raw strings.
 *
 * @param segment - Segment key ('equity_delivery', 'equity_intraday', 'futures', 'options', 'currency', 'commodity')
 * @param _type - Trade type ('BUY' or 'SELL') — used in debug log
 * @param entryPrice - Entry price per unit
 * @param exitPrice - Exit price per unit
 * @param quantity - Number of units/shares/lots
 * @param brokeragePerOrder - Custom flat brokerage per order (overrides segment default)
 * @param brokeragePercent - Custom percentage brokerage (overrides segment default)
 * @returns TradeCharges object with itemized breakdown
 */
export function calculateCharges(
  segment: string,
  _type: 'BUY' | 'SELL',
  entryPrice: number | string,
  exitPrice: number | string,
  quantity: number | string,
  brokeragePerOrder: number = 0,
  brokeragePercent: number = 0
): TradeCharges {
  // ── CRITICAL: Normalize segment first ──
  const normalized = normalizeSegment(segment);
  const config = segmentRules[normalized];

  if (!config) {
    console.error(`[Charges] Segment "${segment}" → "${normalized}" has no config! Using equity_intraday.`);
    return calculateCharges('equity_intraday', _type, entryPrice, exitPrice, quantity, brokeragePerOrder, brokeragePercent);
  }

  // ── Validate and convert inputs ──
  const entry = safeNum(entryPrice);
  const exit = safeNum(exitPrice);
  const qty = safeNum(quantity);

  // ── Debug logging ──
  console.log('[Charges]', {
    raw: segment,
    normalized,
    label: config.label,
    entry: `${entryPrice} → ${entry}`,
    exit: `${exitPrice} → ${exit}`,
    qty: `${quantity} → ${qty}`,
  });

  // ── Guard against invalid numbers ──
  if (isNaN(entry) || isNaN(exit) || isNaN(qty)) {
    console.error('[Charges] Invalid numeric values:', { entry, exit, qty });
    return emptyCharges();
  }
  if (entry <= 0 || qty <= 0 || exit <= 0) {
    console.error('[Charges] Zero or negative values:', { entry, exit, qty });
    return emptyCharges();
  }

  const buyTurnover = entry * qty;
  const sellTurnover = exit * qty;
  const totalTurnover = buyTurnover + sellTurnover;

  console.log('[Charges] Turnover:', {
    buy: r2(buyTurnover),
    sell: r2(sellTurnover),
    total: r2(totalTurnover),
  });

  // ════════════════════════════════════
  // 1. BROKERAGE
  // ════════════════════════════════════
  let brokerage = 0;

  if (config.brokerageType === 'zero') {
    brokerage = 0;
  } else if (config.brokerageType === 'flat') {
    brokerage = (config.brokerageFlat || 20) * 2;
  } else if (config.brokerageType === 'capped_percent') {
    const buyBkg = Math.min(
      config.brokerageCap || 20,
      buyTurnover * (config.brokeragePercent || 0.03) / 100
    );
    const sellBkg = Math.min(
      config.brokerageCap || 20,
      sellTurnover * (config.brokeragePercent || 0.03) / 100
    );
    brokerage = buyBkg + sellBkg;
  }

  // Custom broker settings override
  if (brokeragePerOrder > 0) {
    brokerage = brokeragePerOrder * 2;
  } else if (brokeragePercent > 0) {
    const pctBkg = totalTurnover * brokeragePercent / 100;
    brokerage = Math.min(pctBkg, 40);
  }

  // ════════════════════════════════════
  // 2. STT (Securities Transaction Tax)
  // ════════════════════════════════════
  let stt = 0;
  if (config.sttBuyPct > 0) stt += buyTurnover * (config.sttBuyPct / 100);
  if (config.sttSellPct > 0) stt += sellTurnover * (config.sttSellPct / 100);

  // ════════════════════════════════════
  // 3. EXCHANGE TRANSACTION CHARGES
  // ════════════════════════════════════
  const exchangeTxn = totalTurnover * (config.exchangeTxnPct / 100);

  // ════════════════════════════════════
  // 4. SEBI TURNOVER CHARGES (₹10/cr)
  // ════════════════════════════════════
  const sebiTurnover = totalTurnover / 10000000 * (config.sebiPerCr || 10);

  // ════════════════════════════════════
  // 5. STAMP DUTY
  // ════════════════════════════════════
  let stampDuty = 0;
  if (config.stampDutyBuyPct > 0) stampDuty += buyTurnover * (config.stampDutyBuyPct / 100);
  if (config.stampDutySellPct > 0) stampDuty += sellTurnover * (config.stampDutySellPct / 100);

  // ════════════════════════════════════
  // 6. GST (18% on brokerage + exchange + sebi)
  // ════════════════════════════════════
  const gstBase = brokerage + exchangeTxn + sebiTurnover;
  const gst = gstBase * (config.gstPct / 100);

  // ════════════════════════════════════
  // TOTAL
  // ════════════════════════════════════
  const total = brokerage + stt + exchangeTxn + sebiTurnover + stampDuty + gst;

  console.log('[Charges] Breakdown:', {
    brokerage: r2(brokerage),
    stt: r2(stt),
    exchange: r2(exchangeTxn),
    sebi: r2(sebiTurnover),
    stamp: r2(stampDuty),
    gst: r2(gst),
    total: r2(total),
  });

  return {
    brokerage: r2(brokerage),
    stt: r2(stt),
    gst: r2(gst),
    sebiTurnover: r2(sebiTurnover),
    stampDuty: r2(stampDuty),
    exchangeTxn: r2(exchangeTxn),
    total: r2(total),
    mode: 'itemized',
  };
}

function emptyCharges(): TradeCharges {
  return { brokerage: 0, stt: 0, gst: 0, sebiTurnover: 0, stampDuty: 0, exchangeTxn: 0, other: 0, total: 0, mode: 'itemized' };
}

export const defaultCharges = emptyCharges();

export function calculateNetPnl(grossPnl: number, charges: TradeCharges): number {
  const g = safeNum(grossPnl);
  const c = safeNum(charges?.total);
  if (isNaN(g)) return 0;
  return r2(g - (isNaN(c) ? 0 : c));
}

export function calculateTradePnL(type: 'BUY' | 'SELL', entryPrice: number | string, exitPrice: number | string, quantity: number | string): number {
  const ep = safeNum(entryPrice);
  const xp = safeNum(exitPrice);
  const qty = safeNum(quantity);
  if (isNaN(ep) || isNaN(xp) || isNaN(qty) || ep === 0 || qty === 0) return 0;
  return r2(type === 'BUY' ? (xp - ep) * qty : (ep - xp) * qty);
}

export function calculateTradePnLPercent(type: 'BUY' | 'SELL', entryPrice: number | string, exitPrice: number | string, quantity: number | string): number {
  const pnl = calculateTradePnL(type, entryPrice, exitPrice, quantity);
  const ep = safeNum(entryPrice);
  const qty = safeNum(quantity);
  const cost = ep * qty;
  return cost === 0 || isNaN(cost) ? 0 : r2((pnl / cost) * 100);
}

export function calculateTradeRR(type: 'BUY' | 'SELL', entryPrice: number | string, exitPrice: number | string, stopLoss?: number | string): number {
  const ep = safeNum(entryPrice);
  const xp = safeNum(exitPrice);
  const sl = stopLoss !== undefined ? safeNum(stopLoss) : NaN;

  if (isNaN(ep) || isNaN(xp) || ep === 0 || isNaN(sl) || sl === 0 || sl === ep) {
    const fallbackRisk = ep * 0.015;
    if (fallbackRisk === 0) return 0;
    const change = type === 'BUY' ? (xp - ep) : (ep - xp);
    return r2(change / fallbackRisk);
  }

  if (type === 'BUY') {
    const risk = ep - sl;
    if (risk <= 0) return 0;
    return r2((xp - ep) / risk);
  } else {
    const risk = sl - ep;
    if (risk <= 0) return 0;
    return r2((ep - xp) / risk);
  }
}

export function recalculateTrade(
  trade: Record<string, any>,
  brokeragePerOrder: number = 0,
  brokeragePercent: number = 0,
  keepPnL: boolean = false
): any {
  const type = trade.type || 'BUY';
  const ep = safeNum(trade.entryPrice);
  const xp = safeNum(trade.exitPrice);
  const qty = safeNum(trade.quantity);

  // CRITICAL: normalize segment before calculation
  const seg = normalizeSegment(trade.segment);
  const leverage = safeNum(trade.leverage) || 1;
  const sl = trade.stopLoss !== undefined ? safeNum(trade.stopLoss) : undefined;

  if (isNaN(ep) || isNaN(xp) || isNaN(qty) || ep === 0 || qty === 0) {
    console.error('[Charges] Cannot recalculate — missing required fields:', {
      entry: trade.entryPrice,
      exit: trade.exitPrice,
      qty: trade.quantity,
    });
    return trade;
  }

  const pnl = keepPnL && typeof trade.pnl === 'number' ? trade.pnl : calculateTradePnL(type, ep, xp, qty);
  const pnlPercent = keepPnL && typeof trade.pnlPercent === 'number' ? trade.pnlPercent : calculateTradePnLPercent(type, ep, xp, qty);
  const rrRatio = keepPnL && typeof trade.rrRatio === 'number' ? trade.rrRatio : calculateTradeRR(type, ep, xp, sl);

  // Preserve manual charges (flat or itemized_manual) if user entered them
  let charges: TradeCharges;
  if (trade.charges && (trade.charges.mode === 'flat' || trade.charges.mode === 'itemized_manual')) {
    charges = {
      brokerage: r2(safeNum(trade.charges.brokerage)),
      stt: r2(safeNum(trade.charges.stt)),
      gst: r2(safeNum(trade.charges.gst)),
      sebiTurnover: r2(safeNum(trade.charges.sebiTurnover)),
      stampDuty: r2(safeNum(trade.charges.stampDuty)),
      exchangeTxn: r2(safeNum(trade.charges.exchangeTxn)),
      other: r2(safeNum(trade.charges.other || 0)),
      total: r2(safeNum(trade.charges.total)),
      mode: trade.charges.mode,
    };
  } else {
    charges = calculateCharges(seg, type, ep, xp, qty, brokeragePerOrder, brokeragePercent);
  }

  const netPnl = keepPnL && typeof trade.netPnl === 'number' ? trade.netPnl : calculateNetPnl(pnl, charges);
  const positionSize = ep * qty;
  const effectiveExposure = positionSize * leverage;

  return {
    ...trade,
    pnl: r2(pnl),
    pnlPercent,
    rrRatio,
    charges,
    netPnl,
    leverage: isNaN(leverage) ? 1 : Math.max(1, leverage),
    segment: seg,  // Always store the normalized segment
    positionSize: r2(positionSize),
    effectiveExposure: r2(effectiveExposure),
  };
}
