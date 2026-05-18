/**
 * Trading Rule System
 * Manages rules, tracks adherence, and provides analytics on discipline.
 */

export interface TradingRule {
  id: string;
  name: string;
  description: string;
  category: 'risk' | 'discipline' | 'psychology' | 'strategy';
  type: 'boolean' | 'numeric' | 'threshold';
  threshold?: number;  // For numeric/threshold rules (e.g. max 3 trades, min R:R 2)
  isActive: boolean;
  isDefault: boolean;
}

export interface RuleEvaluation {
  ruleId: string;
  followed: boolean;
  tradeId?: string;
  reason?: string;
}

/** Default rules shipped with the app */
export const DEFAULT_RULES: TradingRule[] = [
  {
    id: 'r_stoploss',
    name: 'Always Use Stop Loss',
    description: 'Every trade must have a stop loss set before entry.',
    category: 'risk',
    type: 'boolean',
    isActive: true,
    isDefault: true,
  },
  {
    id: 'r_risk',
    name: 'Risk Per Trade ≤ 2%',
    description: 'Never risk more than 2% of account capital on a single trade.',
    category: 'risk',
    type: 'threshold',
    threshold: 2,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'r_revenge',
    name: 'No Revenge Trading',
    description: 'Do not enter a trade immediately after a loss to "make it back".',
    category: 'psychology',
    type: 'boolean',
    isActive: true,
    isDefault: true,
  },
  {
    id: 'r_rr',
    name: 'Maintain R:R ≥ 1:2',
    description: 'Target at least 1:2 risk-to-reward ratio before entering.',
    category: 'strategy',
    type: 'threshold',
    threshold: 2,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'r_overtrade',
    name: 'Max 3 Trades Per Day',
    description: 'Limit yourself to a maximum of 3 trades per session.',
    category: 'discipline',
    type: 'threshold',
    threshold: 3,
    isActive: true,
    isDefault: true,
  },
  {
    id: 'r_plan',
    name: 'Trade From Plan',
    description: 'Every trade must be from a pre-defined setup or plan.',
    category: 'discipline',
    type: 'boolean',
    isActive: true,
    isDefault: true,
  },
];

/**
 * Calculate rule adherence statistics across a set of trades.
 * Each trade has a `rulesFollowed: string[]` array of rule IDs that WERE followed.
 */
export function calculateRuleAdherence(
  rules: TradingRule[],
  trades: Array<{ rulesFollowed?: string[]; netPnl: number; date: string }>
): {
  overallRate: number;
  byRule: Array<{
    ruleId: string;
    name: string;
    category: string;
    total: number;
    followed: number;
    violated: number;
    rate: number;
    avgPnlWhenFollowed: number;
    avgPnlWhenViolated: number;
  }>;
  byDate: Array<{
    date: string;
    total: number;
    followed: number;
    rate: number;
  }>;
} {
  const activeRules = rules.filter(r => r.isActive);
  if (activeRules.length === 0 || trades.length === 0) {
    return {
      overallRate: 0,
      byRule: [],
      byDate: [],
    };
  }

  const ruleStats: Record<string, {
    total: number;
    followed: number;
    violated: number;
    pnlFollowed: number;
    countFollowed: number;
    pnlViolated: number;
    countViolated: number;
  }> = {};

  activeRules.forEach(r => {
    ruleStats[r.id] = { total: 0, followed: 0, violated: 0, pnlFollowed: 0, countFollowed: 0, pnlViolated: 0, countViolated: 0 };
  });

  let grandTotal = 0;
  let grandFollowed = 0;

  // Per-date tracking
  const dateMap: Record<string, { total: number; followed: number }> = {};

  trades.forEach(trade => {
    const followed = trade.rulesFollowed || [];
    const date = trade.date;

    if (!dateMap[date]) dateMap[date] = { total: 0, followed: 0 };

    activeRules.forEach(rule => {
      const wasFollowed = followed.includes(rule.id);
      const s = ruleStats[rule.id];
      s.total++;
      grandTotal++;

      if (wasFollowed) {
        s.followed++;
        s.pnlFollowed += trade.netPnl;
        s.countFollowed++;
        grandFollowed++;
        dateMap[date].followed++;
      } else {
        s.violated++;
        s.pnlViolated += trade.netPnl;
        s.countViolated++;
      }
      dateMap[date].total++;
    });
  });

  const byRule = activeRules.map(rule => {
    const s = ruleStats[rule.id];
    return {
      ruleId: rule.id,
      name: rule.name,
      category: rule.category,
      total: s.total,
      followed: s.followed,
      violated: s.violated,
      rate: s.total > 0 ? Math.round((s.followed / s.total) * 100) : 0,
      avgPnlWhenFollowed: s.countFollowed > 0 ? Math.round(s.pnlFollowed / s.countFollowed) : 0,
      avgPnlWhenViolated: s.countViolated > 0 ? Math.round(s.pnlViolated / s.countViolated) : 0,
    };
  });

  const byDate = Object.entries(dateMap)
    .map(([date, d]) => ({
      date,
      total: d.total,
      followed: d.followed,
      rate: d.total > 0 ? Math.round((d.followed / d.total) * 100) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    overallRate: grandTotal > 0 ? Math.round((grandFollowed / grandTotal) * 100) : 0,
    byRule,
    byDate,
  };
}
