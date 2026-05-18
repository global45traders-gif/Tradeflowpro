// Re-export charge engine as the single source of truth for trade calculations
export {
  segmentRules as segmentConfig,
  calculateCharges,
  calculateNetPnl,
  calculateTradePnL,
  calculateTradePnLPercent,
  calculateTradeRR,
  recalculateTrade,
  defaultCharges,
} from './chargeEngine';

export { normalizeSegment, normalizeSegment as resolveSegmentConfig, SEGMENT_LABELS, SEGMENT_OPTIONS } from './segmentMap';
export type { SegmentKey } from './segmentMap';

// Default trading rules
import { TradingRule, TradingAccount } from './types';

export const defaultRules: TradingRule[] = [
  { id: 'r_stoploss', name: 'Always Use Stop Loss', description: 'Every trade must have a stop loss set before entry.', category: 'risk', type: 'boolean', isActive: true, isDefault: true },
  { id: 'r_risk', name: 'Risk Per Trade ≤ 2%', description: 'Never risk more than 2% of account capital on a single trade.', category: 'risk', type: 'threshold', threshold: 2, isActive: true, isDefault: true },
  { id: 'r_revenge', name: 'No Revenge Trading', description: 'Do not enter a trade immediately after a loss to "make it back".', category: 'psychology', type: 'boolean', isActive: true, isDefault: true },
  { id: 'r_rr', name: 'Maintain R:R ≥ 1:2', description: 'Target at least 1:2 risk-to-reward ratio before entering.', category: 'strategy', type: 'threshold', threshold: 2, isActive: true, isDefault: true },
  { id: 'r_overtrade', name: 'Max 3 Trades Per Day', description: 'Limit yourself to a maximum of 3 trades per session.', category: 'discipline', type: 'threshold', threshold: 3, isActive: true, isDefault: true },
  { id: 'r_plan', name: 'Trade From Plan', description: 'Every trade must be from a pre-defined setup or plan.', category: 'discipline', type: 'boolean', isActive: true, isDefault: true },
];

export const defaultAccounts: TradingAccount[] = [
  {
    id: 'acc_default',
    name: 'Main Trading Account',
    tag: 'Equity',
    capital: 500000,
    riskPerTradePercent: 1.0,
    brokerType: 'zerodha',
    brokeragePerOrder: 20,
    brokeragePercent: 0,
    currencyCode: 'INR',
    isActive: true,
    createdAt: '2026-01-01',
  },
];

export const safeNum = (val: unknown, fallback: number = 0): number => {
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

// Mock trades — ALL segments are normalized canonical keys
import { Trade } from './types';
import type { SegmentKey } from './segmentMap';
const ACC = 'acc_default';
export const initialMockTrades: Trade[] = [
  { id: 't1', date: '2026-03-20', symbol: 'RELIANCE', type: 'BUY', entryPrice: 2400, exitPrice: 2460, quantity: 50, leverage: 1, stopLoss: 2380, notes: 'Volume breakout on 15-min chart.', emotion: 'Confidence', pnl: 3000, pnlPercent: 2.5, rrRatio: 3, netPnl: 2934, charges: { brokerage: 0, stt: 6.0, gst: 0.12, sebiTurnover: 0.02, stampDuty: 1.8, exchangeTxn: 8.28, total: 16.22, mode: 'itemized' }, segment: 'equity_delivery' as SegmentKey, accountId: ACC, rulesFollowed: ['r1', 'r2', 'r4', 'r5'], positionSize: 120000, effectiveExposure: 120000 },
  { id: 't2', date: '2026-03-21', symbol: 'NIFTY', type: 'BUY', entryPrice: 22000, exitPrice: 21900, quantity: 75, leverage: 1, stopLoss: 21950, notes: 'FOMO on morning rally.', emotion: 'FOMO', pnl: -7500, pnlPercent: -0.45, rrRatio: -2, netPnl: -7571, charges: { brokerage: 40, stt: 0, gst: 1.48, sebiTurnover: 0.16, stampDuty: 0.5, exchangeTxn: 8.25, total: 49.39, mode: 'itemized' }, segment: 'options' as SegmentKey, accountId: ACC, rulesFollowed: ['r5'], positionSize: 1650000, effectiveExposure: 1650000 },
  { id: 't3', date: '2026-03-23', symbol: 'BANKNIFTY', type: 'SELL', entryPrice: 47000, exitPrice: 46600, quantity: 30, leverage: 1, stopLoss: 47150, notes: 'Clean double top.', emotion: 'Patience', pnl: 12000, pnlPercent: 0.85, rrRatio: 2.67, netPnl: 11929, charges: { brokerage: 40, stt: 0, gst: 1.18, sebiTurnover: 0.28, stampDuty: 0.42, exchangeTxn: 6, total: 70.88, mode: 'itemized' }, segment: 'options' as SegmentKey, accountId: ACC, rulesFollowed: ['r1', 'r2', 'r4', 'r5'], positionSize: 1410000, effectiveExposure: 1410000 },
  { id: 't4', date: '2026-03-24', symbol: 'TCS', type: 'BUY', entryPrice: 3800, exitPrice: 3850, quantity: 40, leverage: 1, stopLoss: 3780, notes: 'Support bounce at 50 EMA.', emotion: 'Confidence', pnl: 2000, pnlPercent: 1.32, rrRatio: 2.5, netPnl: 1960, charges: { brokerage: 0, stt: 5.7, gst: 0.1, sebiTurnover: 0.03, stampDuty: 1.14, exchangeTxn: 5.52, total: 12.49, mode: 'itemized' }, segment: 'equity_delivery' as SegmentKey, accountId: ACC, rulesFollowed: ['r1', 'r2', 'r4', 'r5'], positionSize: 152000, effectiveExposure: 152000 },
  { id: 't5', date: '2026-03-25', symbol: 'TATASTEEL', type: 'BUY', entryPrice: 150, exitPrice: 142, quantity: 1000, leverage: 1, stopLoss: 148, notes: 'Revenge trading.', emotion: 'Revenge', pnl: -8000, pnlPercent: -5.33, rrRatio: -4, netPnl: -8029, charges: { brokerage: 0, stt: 2.0, gst: 0.1, sebiTurnover: 0.03, stampDuty: 0.45, exchangeTxn: 4.14, total: 6.72, mode: 'itemized' }, segment: 'equity_intraday' as SegmentKey, accountId: ACC, rulesFollowed: [], positionSize: 150000, effectiveExposure: 150000 },
  { id: 't6', date: '2026-03-27', symbol: 'INFY', type: 'BUY', entryPrice: 1600, exitPrice: 1640, quantity: 120, leverage: 1, stopLoss: 1585, notes: 'Ascending triangle.', emotion: 'Patience', pnl: 4800, pnlPercent: 2.5, rrRatio: 2.67, netPnl: 4760, charges: { brokerage: 0, stt: 7.68, gst: 0.14, sebiTurnover: 0.04, stampDuty: 1.44, exchangeTxn: 6.63, total: 15.93, mode: 'itemized' }, segment: 'equity_delivery' as SegmentKey, accountId: ACC, rulesFollowed: ['r1', 'r2', 'r4', 'r5'], positionSize: 192000, effectiveExposure: 192000 },
  { id: 't7', date: '2026-03-20', symbol: 'HDFCBANK', type: 'SELL', entryPrice: 1680, exitPrice: 1665, quantity: 100, leverage: 1, stopLoss: 1690, notes: 'Short on resistance.', emotion: 'Confidence', pnl: 1500, pnlPercent: 0.89, rrRatio: 1.5, netPnl: 1474, charges: { brokerage: 0, stt: 2.52, gst: 0.08, sebiTurnover: 0.03, stampDuty: 0.5, exchangeTxn: 5.8, total: 8.93, mode: 'itemized' }, segment: 'equity_delivery' as SegmentKey, accountId: ACC, rulesFollowed: ['r1', 'r2', 'r5'], positionSize: 168000, effectiveExposure: 168000 },
  { id: 't8', date: '2026-03-27', symbol: 'NIFTY', type: 'BUY', entryPrice: 22050, exitPrice: 22180, quantity: 50, leverage: 1, stopLoss: 22000, notes: 'Gap fill strategy.', emotion: 'Patience', pnl: 6500, pnlPercent: 0.59, rrRatio: 2.6, netPnl: 6429, charges: { brokerage: 40, stt: 0, gst: 1.53, sebiTurnover: 0.22, stampDuty: 0.33, exchangeTxn: 11.03, total: 71.11, mode: 'itemized' }, segment: 'futures' as SegmentKey, accountId: ACC, rulesFollowed: ['r1', 'r2', 'r4', 'r5'], positionSize: 1102500, effectiveExposure: 1102500 },
  { id: 't9', date: '2026-03-18', symbol: 'ADANIENT', type: 'BUY', entryPrice: 2350, exitPrice: 2310, quantity: 200, leverage: 1, stopLoss: 2330, notes: 'Bought on news.', emotion: 'Fear', pnl: -8000, pnlPercent: -1.7, rrRatio: -1, netPnl: -8033, charges: { brokerage: 0, stt: 4.7, gst: 0.09, sebiTurnover: 0.09, stampDuty: 1.41, exchangeTxn: 8.16, total: 14.45, mode: 'itemized' }, segment: 'equity_delivery' as SegmentKey, accountId: ACC, rulesFollowed: ['r1', 'r5'], positionSize: 470000, effectiveExposure: 470000 },
  { id: 't10', date: '2026-03-19', symbol: 'ITC', type: 'BUY', entryPrice: 445, exitPrice: 452, quantity: 500, leverage: 1, stopLoss: 442, notes: 'Breakout with volume.', emotion: 'Confidence', pnl: 3500, pnlPercent: 1.57, rrRatio: 2.33, netPnl: 3476, charges: { brokerage: 0, stt: 5.57, gst: 0.09, sebiTurnover: 0.04, stampDuty: 1.67, exchangeTxn: 7.71, total: 15.08, mode: 'itemized' }, segment: 'equity_delivery' as SegmentKey, accountId: ACC, rulesFollowed: ['r1', 'r2', 'r4', 'r5'], positionSize: 222500, effectiveExposure: 222500 },
  { id: 't11', date: '2026-04-02', symbol: 'BANKNIFTY', type: 'SELL', entryPrice: 48000, exitPrice: 47500, quantity: 25, leverage: 1, stopLoss: 48200, notes: 'Bearish engulfing.', emotion: 'Patience', pnl: 12500, pnlPercent: 1.04, rrRatio: 2.5, netPnl: 12428, charges: { brokerage: 40, stt: 0, gst: 1.2, sebiTurnover: 0.24, stampDuty: 0.36, exchangeTxn: 5, total: 71.8, mode: 'itemized' }, segment: 'options' as SegmentKey, accountId: ACC, rulesFollowed: ['r1', 'r2', 'r4', 'r5'], positionSize: 1200000, effectiveExposure: 1200000 },
  { id: 't12', date: '2026-04-03', symbol: 'RELIANCE', type: 'BUY', entryPrice: 2430, exitPrice: 2395, quantity: 50, leverage: 5, stopLoss: 2410, notes: 'No SL initially.', emotion: 'Greed', pnl: -1750, pnlPercent: -1.44, rrRatio: -1.75, netPnl: -1795, charges: { brokerage: 0, stt: 2.39, gst: 0.07, sebiTurnover: 0.02, stampDuty: 0.36, exchangeTxn: 5.59, total: 8.43, mode: 'itemized' }, segment: 'equity_intraday' as SegmentKey, accountId: ACC, rulesFollowed: ['r2', 'r5'], positionSize: 121500, effectiveExposure: 607500 },
];
