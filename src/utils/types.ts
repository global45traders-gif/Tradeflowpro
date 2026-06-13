export interface TradeCharges {
  brokerage: number;
  stt: number;
  gst: number;
  sebiTurnover: number;
  stampDuty: number;
  exchangeTxn: number;
  other?: number;
  total: number;
  mode: 'itemized' | 'flat' | 'itemized_manual';
}

export interface TradingAccount {
  id: string;
  name: string;
  tag: 'Intraday' | 'Swing' | 'Options' | 'Equity' | 'Custom';
  capital: number;
  riskPerTradePercent: number;
  brokerType: 'zerodha' | 'groww' | 'angel' | 'upstox' | 'fyers' | 'other';
  brokeragePerOrder: number;
  brokeragePercent: number;
  currencyCode: string;
  isActive: boolean;
  createdAt: string;
}

export type TradingRule = import('./rulesEngine').TradingRule;

export interface RuleAdherence {
  tradeId: string;
  rulesFollowed: string[];  // Array of rule IDs that were followed
}

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage: number;  // 1 = 1x, 5 = 5x, etc. Default 1
  stopLoss?: number;
  target?: number;
  notes: string;
  emotion: string;
  pnl: number;       // Gross PnL (before charges)
  pnlPercent: number;
  rrRatio: number;
  netPnl: number;    // Net PnL (after charges)
  charges: TradeCharges;
  segment: string;  // Normalized via normalizeSegment()
  accountId: string;
  rulesFollowed: string[];  // Rule IDs that were FOLLOWED on this trade
  setup?: string;
  entryTime?: string;
  exitTime?: string;
  // Computed convenience fields (derived, not stored)
  positionSize?: number;    // quantity × entryPrice
  effectiveExposure?: number;  // positionSize × leverage
}

export interface AdvancedAnalytics {
  maxDrawdown: number;
  maxDrawdownPct: number;
  avgRiskPerTrade: number;
  riskAdjustedReturn: number;
  expectancy: number;
  consistencyScore: number;
  disciplineScore: number;
  riskScore: number;
  executionScore: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
  avgWinDuration: number;
  avgLossDuration: number;
  setupStats: { setup: string; trades: number; wins: number; winRate: number; totalPnl: number; avgPnl: number }[];
  positionSizeAnalysis: { quantity: number; pnl: number }[];
  timeOfDayStats: { period: string; trades: number; wins: number; winRate: number; totalPnl: number }[];
  mistakeAnalysis: { category: string; count: number; lossAmount: number; pctOfLosses: number }[];
  equityCurveWithDD: { date: string; balance: number; drawdown: number }[];
  riskPerTradeOverTime: { date: string; riskPct: number; pnl: number }[];
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface AccountSettings {
  capital: number;
  riskPerTradePercent: number;
  currency: string;
  brokerType: 'discretionary' | 'discount' | 'zerodha' | 'groww' | 'angel' | 'upstox' | 'fyers';
  brokeragePerOrder: number;
  brokeragePercent: number;
}

export type SegmentConfig = {
  label: string;
  // Brokerage model
  brokerageType: 'zero' | 'flat' | 'capped_percent' | 'custom';
  brokerageCap?: number;          // e.g., ₹20
  brokeragePercent?: number;       // e.g., 0.03%
  brokerageFlat?: number;          // e.g., ₹20
  // STT (Securities Transaction Tax) percentages
  sttBuyPct: number;
  sttSellPct: number;
  // Stamp Duty percentages
  stampDutyBuyPct: number;
  stampDutySellPct: number;
  // Exchange Transaction Charge percentage
  exchangeTxnPct: number;
  // SEBI turnover charge per crore (₹)
  sebiPerCr: number;
  // GST percentage
  gstPct: number;
  // Legacy compatibility
  sttBuy?: number;
  sttSell?: number;
  stampDuty?: number;
  exchangeTxnNSE?: number;
  exchangeTxnBSE?: number;
  sebi?: number;
  gstRate?: number;
};

export interface DayOfWeekStats {
  day: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface EmotionStats {
  emotion: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}
