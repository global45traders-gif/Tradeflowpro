/**
 * Trade Quality Engine
 * Scores every trade on a 0-100 scale based on discipline and execution.
 */

export interface TradeQualityScore {
  tradeId: string;
  score: number; // 0-100
  slRespected: boolean;
  rrTarget: number;
  rrAchieved: boolean;
  hadSetup: boolean;
  emotional: boolean;
}

/**
 * Score a single trade.
 * - 25pts: Stop Loss respected
 * - 25pts: R:R ≥ 1:2 achieved
 * - 25pts: Had a defined setup
 * - 25pts: Not an emotional trade
 */
export function scoreTrade(trade: Record<string, any>): TradeQualityScore {
  const hasSL = trade.stopLoss && trade.stopLoss > 0;
  const slRespected = hasSL
    ? trade.type === 'BUY'
      ? trade.exitPrice >= trade.stopLoss
      : trade.exitPrice <= trade.stopLoss
    : false;

  const rrTarget = trade.rrRatio || 0;
  const rrAchieved = rrTarget >= 2;

  const hadSetup = !!trade.setup && trade.setup !== 'Undefined' && trade.setup !== '';

  const emotionalEmotions = ['Revenge', 'FOMO', 'Fear', 'Greed'];
  const emotional = emotionalEmotions.includes(trade.emotion);

  // Weighted score
  let score = 0;
  if (slRespected) score += 25;
  if (rrAchieved) score += 25;
  if (hadSetup) score += 25;
  if (!emotional) score += 25;

  return {
    tradeId: trade.id || 'unknown',
    score,
    slRespected,
    rrTarget,
    rrAchieved,
    hadSetup,
    emotional,
  };
}

/**
 * Calculate aggregate quality metrics.
 */
export function computeQualityMetrics(trades: Record<string, any>[]): {
  scores: TradeQualityScore[];
  avgScore: number;
  highQualityTrades: number;
  lowQualityTrades: number;
  highQualityWinRate: number;
  lowQualityWinRate: number;
  correlation: 'strong' | 'moderate' | 'weak';
} {
  const scores = trades.map(t => scoreTrade(t));
  if (scores.length === 0) {
    return { scores, avgScore: 0, highQualityTrades: 0, lowQualityTrades: 0, highQualityWinRate: 0, lowQualityWinRate: 0, correlation: 'weak' };
  }

  const avgScore = Math.round(scores.reduce((s, sc) => s + sc.score, 0) / scores.length);
  const highQuality = scores.filter(sc => sc.score >= 75);
  const lowQuality = scores.filter(sc => sc.score < 50);

  const hqWins = highQuality.filter(sc => {
    const t = trades.find(tr => tr.id === sc.tradeId);
    return t && t.netPnl > 0;
  }).length;
  const lqWins = lowQuality.filter(sc => {
    const t = trades.find(tr => tr.id === sc.tradeId);
    return t && t.netPnl > 0;
  }).length;

  const highQualityWinRate = highQuality.length > 0 ? Math.round((hqWins / highQuality.length) * 100) : 0;
  const lowQualityWinRate = lowQuality.length > 0 ? Math.round((lqWins / lowQuality.length) * 100) : 0;

  const diff = highQualityWinRate - lowQualityWinRate;
  const correlation = diff >= 20 ? 'strong' : diff >= 10 ? 'moderate' : 'weak';

  return {
    scores,
    avgScore,
    highQualityTrades: highQuality.length,
    lowQualityTrades: lowQuality.length,
    highQualityWinRate,
    lowQualityWinRate,
    correlation,
  };
}
