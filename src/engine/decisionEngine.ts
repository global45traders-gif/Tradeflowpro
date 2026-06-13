/**
 * ────────────────────────────────────────────────────────────
 *  TRADEFLOW PRO — Centralized Decision Engine v2
 * ────────────────────────────────────────────────────────────
 *
 *  SINGLE SOURCE OF TRUTH for:
 *  • Trading insights & recommendations
 *  • Risk-level classification
 *  • Enforcement actions
 *  • Progression tracking
 *
 *  RULES:
 *  1. Strong performance (WR ≥ 60%, PnL > 0, trades ≥ 7)
 *     overrides all severity — no severe warnings.
 *  2. Rule violations become soft suggestions when profitable.
 *  3. No conflicting signals — never show "profitable"
 *     and "stop trading" together.
 *  4. Minimum data: trades < 7 → limited insights, no strong
 *     conclusions.
 *
 *  Pure logic only — zero UI dependencies.
 * ────────────────────────────────────────────────────────────
 */

// ────────────────────────────────────────────────────────────
//  INPUT TYPES
// ────────────────────────────────────────────────────────────

export interface NormalizedTrade {
  date: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  netPnl: number;
  pnl: number;
  pnlPercent: number;
  rrRatio: number;
  segment: string;
  emotion: string;
  setup?: string;
  rulesFollowed: string[];
  charges: { total: number };
  accountId: string;
  stopLoss?: number;
  target?: number;
}

export interface NormalizedRule {
  id: string;
  name: string;
  isActive: boolean;
}

export interface DecisionSettings {
  riskPerTrade: number;
  maxTradesPerDay: number;
  capital: number;
}

// ────────────────────────────────────────────────────────────
//  OUTPUT TYPES
// ────────────────────────────────────────────────────────────

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type CriticalIssue =
  | 'negative_expectancy'
  | 'discipline_failure'
  | 'high_drawdown'
  | null;

export type ProgressionState =
  | 'STAGNANT_NEGATIVE'
  | 'IMPROVING'
  | 'DECLINING'
  | 'STABLE'
  | 'INSUFFICIENT_DATA';

export type SeverityLevel = 'critical' | 'moderate' | 'minor';

export interface DecisionEngineResult {
  criticalIssue: CriticalIssue;
  actions: string[];
  riskLevel: RiskLevel;
  progression: ProgressionState;
  insights: Array<{
    severity: SeverityLevel;
    text: string;
  }>;
  metrics: {
    totalPnL: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    expectancy: number;
    maxDrawdownPct: number;
    ruleAdherenceRate: number;
    totalTrades: number;
    isStrongPerformance: boolean;
    hasSufficientData: boolean;
  };
}

// ────────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────────

const safe = (val: number | undefined | null, fallback = 0): number => {
  if (val === null || val === undefined || isNaN(val)) return fallback;
  if (!isFinite(val)) return fallback;
  return val;
};

const r2 = (v: number): number => Math.round(v * 100) / 100;

function computeMaxDrawdownPct(sorted: NormalizedTrade[], capital: number): number {
  if (sorted.length === 0) return 0;
  let peak = capital;
  let maxDD = 0;
  let balance = capital;
  for (const t of sorted) {
    balance += t.netPnl;
    if (balance > peak) peak = balance;
    const dd = peak - balance;
    if (dd > maxDD) maxDD = dd;
  }
  return peak > 0 ? (maxDD / peak) * 100 : 0;
}

function computeRuleAdherence(trades: NormalizedTrade[], rules: NormalizedRule[], capital: number): number {
  const active = rules.filter(r => r.isActive);
  if (active.length === 0 || trades.length === 0) return 100;
  let total = 0;
  let passed = 0;

  const dateCounts: Record<string, number> = {};
  trades.forEach(t => {
    dateCounts[t.date] = (dateCounts[t.date] || 0) + 1;
  });

  for (const t of trades) {
    for (const r of active) {
      total++;
      let wasFollowed = false;

      switch (r.id) {
        case 'r_stoploss':
          wasFollowed = t.stopLoss !== undefined && t.stopLoss !== null && t.stopLoss > 0;
          break;
        case 'r_risk': {
          if (!t.stopLoss || t.stopLoss <= 0) {
            wasFollowed = true; // Missing stop loss is NOT counted as risk limit violation (avoids double penalty)
          } else {
            const riskAmount = Math.abs(t.entryPrice - t.stopLoss) * t.quantity;
            const riskPercent = capital > 0 ? (riskAmount / capital) * 100 : 0;
            wasFollowed = riskPercent <= 2;
          }
          break;
        }
        case 'r_rr': {
          if (!t.stopLoss || t.stopLoss <= 0) {
            wasFollowed = false; // Cannot maintain target R:R without stop loss
          } else {
            const risk = Math.abs(t.entryPrice - t.stopLoss);
            if (risk === 0) {
              wasFollowed = false;
            } else {
              const reward = (t.target && t.target > 0)
                ? Math.abs(t.target - t.entryPrice)
                : Math.abs(t.exitPrice - t.entryPrice);
              const rr = reward / risk;
              wasFollowed = rr >= 2;
            }
          }
          break;
        }
        case 'r_overtrade': {
          const tradesOnDay = dateCounts[t.date] || 0;
          wasFollowed = tradesOnDay <= 3;
          break;
        }
        case 'r_revenge':
          wasFollowed = t.emotion !== 'Revenge';
          break;
        case 'r_plan':
          wasFollowed = t.setup !== undefined && t.setup !== null && t.setup !== '' && t.setup !== 'Undefined';
          break;
        default:
          wasFollowed = t.rulesFollowed?.includes(r.id) ?? false;
          break;
      }

      if (wasFollowed) passed++;
    }
  }
  return total > 0 ? (passed / total) * 100 : 100;
}

// ────────────────────────────────────────────────────────────
//  PERFORMANCE DETECTION
// ────────────────────────────────────────────────────────────

function isStrongPerformance(metrics: {
  winRate: number;
  totalPnL: number;
  totalTrades: number;
}): boolean {
  return (
    metrics.winRate >= 60 &&
    metrics.totalPnL > 0 &&
    metrics.totalTrades >= 7
  );
}

// ────────────────────────────────────────────────────────────
//  MAIN FUNCTION
// ────────────────────────────────────────────────────────────

export function generateDecision(params: {
  trades: NormalizedTrade[];
  rules: NormalizedRule[];
  settings: DecisionSettings;
}): DecisionEngineResult {
  const { trades, rules, settings } = params;
  const capital = safe(settings.capital, 500000);

  // Sort chronologically
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const totalTrades = sorted.length;

  // ── Empty dataset ──
  if (totalTrades === 0) {
    return {
      criticalIssue: null,
      actions: ['Start logging trades to receive personalised decisions.'],
      riskLevel: 'LOW',
      progression: 'INSUFFICIENT_DATA',
      insights: [],
      metrics: {
        totalPnL: 0, winRate: 0, avgWin: 0, avgLoss: 0,
        profitFactor: 0, expectancy: 0, maxDrawdownPct: 0,
        ruleAdherenceRate: 100, totalTrades: 0,
        isStrongPerformance: false, hasSufficientData: false,
      },
    };
  }

  // ══════════════════════════════════════════════════════════
  //  1. CORE METRICS
  // ══════════════════════════════════════════════════════════

  let totalPnL = 0;
  let wins = 0;
  let losses = 0;
  let sumWins = 0;
  let sumLosses = 0;

  for (const t of sorted) {
    const pnl = safe(t.netPnl);
    totalPnL += pnl;
    if (pnl > 0) { wins++; sumWins += pnl; }
    else if (pnl < 0) { losses++; sumLosses += Math.abs(pnl); }
  }

  const winRate = r2((wins / totalTrades) * 100);
  const avgWin = wins > 0 ? r2(sumWins / wins) : 0;
  const avgLoss = losses > 0 ? r2(sumLosses / losses) : 0;
  const winProb = wins / totalTrades;
  const lossProb = losses / totalTrades;

  const profitFactor = sumLosses > 0
    ? r2(sumWins / sumLosses)
    : sumWins > 0 ? 999 : 0;

  const expectancy = r2((winProb * avgWin) - (lossProb * avgLoss));
  const maxDrawdownPct = r2(computeMaxDrawdownPct(sorted, capital));
  const ruleAdherenceRate = r2(computeRuleAdherence(sorted, rules, capital));

  const hasSufficientData = totalTrades >= 7;
  const strongPerf = isStrongPerformance({ winRate, totalPnL, totalTrades });

  const metrics: DecisionEngineResult['metrics'] = {
    totalPnL: r2(totalPnL),
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    maxDrawdownPct,
    ruleAdherenceRate,
    totalTrades,
    isStrongPerformance: strongPerf,
    hasSufficientData,
  };

  // ══════════════════════════════════════════════════════════
  //  2. CRITICAL ISSUE (respecting priority rules)
  // ══════════════════════════════════════════════════════════
  //
  //  If performance is strong, rule violations are NOT critical.
  //  Performance overrides discipline issues.
  //
  //  Priority:
  //    1. Negative expectancy (only if NOT strong performance)
  //    2. High drawdown (always relevant)
  //    3. Discipline failure (only if NOT strong performance)

  let criticalIssue: CriticalIssue = null;

  if (expectancy < 0) {
    // Only flag as critical if NOT strong performance
    criticalIssue = strongPerf ? null : 'negative_expectancy';
  }

  if (maxDrawdownPct > 10 && criticalIssue === null) {
    criticalIssue = 'high_drawdown';
  }

  if (ruleAdherenceRate < 50 && criticalIssue === null && !strongPerf) {
    criticalIssue = 'discipline_failure';
  }

  // ══════════════════════════════════════════════════════════
  //  3. ACTIONS — soft when profitable, firm when negative
  // ══════════════════════════════════════════════════════════

  const actions: string[] = [];

  if (criticalIssue === 'negative_expectancy' && !strongPerf) {
    actions.push(
      `Expectancy is -₹${Math.abs(expectancy).toLocaleString('en-IN')}/trade. Review your last ${Math.min(10, totalTrades)} trades.`,
      `Reduce risk to 0.5% per trade until expectancy turns positive.`,
      'Resume normal sizing only after 10 trades with positive expectancy.'
    );
  } else if (criticalIssue === 'high_drawdown') {
    actions.push(
      `Drawdown at ${maxDrawdownPct.toFixed(1)}%. Reduce risk by 50% for next 5 trades.`,
      'Pause trading for 1 session and review your last 10 losing trades.',
      'Set a daily loss limit — stop after 2 consecutive losses.'
    );
  } else if (criticalIssue === 'discipline_failure') {
    actions.push(
      'Consider improving stop loss discipline — mandatory SL before entry helps.',
      'Maximum 3 trades per day. Quality over quantity.',
      'Write your rules on a sticky note. Check them before every entry.'
    );
  } else if (strongPerf) {
    // Positive reinforcement — no "stop trading" messages
    actions.push(
      `Strong performance: ${winRate}% WR, +₹${totalPnL.toLocaleString('en-IN')}. Keep following your edge.`,
      'Consider gradually increasing position size by 10% if consistency holds.',
      `Maintain current discipline. Risk ≤ ${settings.riskPerTrade}% per trade.`
    );
  } else if (!hasSufficientData) {
    actions.push(
      `Logged ${totalTrades} trade(s). Continue logging — meaningful insights begin at 7+ trades.`,
      `Maintain risk ≤ ${settings.riskPerTrade}% per trade while building your data.`
    );
  } else {
    actions.push(
      `Maintain current discipline. Risk ≤ ${settings.riskPerTrade}% per trade.`,
      'Maximum 3 trades per day. Quality over quantity.',
      'Continue following your edge. No changes needed.'
    );
  }

  // ══════════════════════════════════════════════════════════
  //  4. RISK LEVEL — adjusted for performance
  // ══════════════════════════════════════════════════════════

  let riskLevel: RiskLevel;

  if (strongPerf) {
    riskLevel = 'LOW';
  } else if (expectancy < 0 && maxDrawdownPct > 10) {
    riskLevel = 'HIGH';
  } else if (expectancy < 0 || maxDrawdownPct > 10) {
    riskLevel = 'MEDIUM';
  } else if (ruleAdherenceRate < 50) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  // ══════════════════════════════════════════════════════════
  //  5. PROGRESSION
  // ══════════════════════════════════════════════════════════

  let progression: ProgressionState;

  if (!hasSufficientData) {
    progression = 'INSUFFICIENT_DATA';
  } else if (expectancy < 0 && !strongPerf) {
    progression = 'STAGNANT_NEGATIVE';
  } else if (totalTrades >= 10) {
    const last10 = sorted.slice(-10);
    const prev10 = sorted.slice(-20, -10);

    const last10WR = (last10.filter(t => t.netPnl > 0).length / last10.length) * 100;
    const prev10WR = prev10.length > 0
      ? (prev10.filter(t => t.netPnl > 0).length / prev10.length) * 100
      : 0;

    const last10Pnl = last10.reduce((s, t) => s + t.netPnl, 0);
    const prev10Pnl = prev10.length > 0 ? prev10.reduce((s, t) => s + t.netPnl, 0) : 0;

    if (last10WR > prev10WR + 5 || last10Pnl > prev10Pnl + 2000) {
      progression = 'IMPROVING';
    } else if (last10WR < prev10WR - 5 || last10Pnl < prev10Pnl - 2000) {
      progression = 'DECLINING';
    } else {
      progression = strongPerf ? 'STABLE' : 'STAGNANT_NEGATIVE';
    }
  } else {
    progression = strongPerf ? 'STABLE' : 'STAGNANT_NEGATIVE';
  }

  // ══════════════════════════════════════════════════════════
  //  6. INSIGHTS — no duplicates, no contradictions
  // ══════════════════════════════════════════════════════════

  const insightCandidates: Array<{
    severity: SeverityLevel;
    text: string;
    rootCause: string;
    forcePositive?: boolean;
  }> = [];

  const usedRootCauses = new Set<string>();

  // ── If strong performance: ONLY positive or soft suggestions ──
  if (strongPerf && hasSufficientData) {
    // No critical or negative insights allowed
    usedRootCauses.add('lock_positive');

    // Positive insight about performance
    insightCandidates.push({
      severity: 'minor',
      text: `Strong performance: ${winRate}% WR, +₹${totalPnL.toLocaleString('en-IN')} across ${totalTrades} trades. Keep following your edge.`,
      rootCause: 'performance_positive',
      forcePositive: true,
    });

    // Soft suggestion if rule adherence could improve
    if (ruleAdherenceRate < 80) {
      insightCandidates.push({
        severity: 'minor',
        text: `Rule adherence is at ${ruleAdherenceRate.toFixed(0)}%. Consider improving discipline to maintain your edge.`,
        rootCause: 'rule_adherence',
        forcePositive: true,
      });
    }

    // Edge insight: best day or setup
    const dayMap: Record<string, { pnl: number; wins: number; count: number }> = {};
    for (const t of sorted) {
      const d = new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      if (!dayMap[d]) dayMap[d] = { pnl: 0, wins: 0, count: 0 };
      dayMap[d].pnl += t.netPnl;
      if (t.netPnl > 0) dayMap[d].wins++;
      dayMap[d].count++;
    }
    const bestDay = Object.entries(dayMap)
      .filter(([, d]) => d.count >= 3)
      .reduce((a, b) => a[1].pnl > b[1].pnl ? a : b, ['', { pnl: 0, wins: 0, count: 0 }]);

    if (bestDay[1].pnl > 0 && bestDay[1].count >= 3) {
      const dayWR = Math.round((bestDay[1].wins / bestDay[1].count) * 100);
      insightCandidates.push({
        severity: 'minor',
        text: `Your edge: ${bestDay[0]}s have ${dayWR}% WR (+₹${bestDay[1].pnl.toLocaleString('en-IN')}). Prioritize these days.`,
        rootCause: 'best_day',
        forcePositive: true,
      });
    }
  }

  // ── If insufficient data ──
  else if (!hasSufficientData) {
    insightCandidates.push({
      severity: 'minor',
      text: `${totalTrades} trade(s) logged. Meaningful analysis begins at 7+ trades. Keep logging consistently.`,
      rootCause: 'insufficient_data',
      forcePositive: true,
    });
  }

  // ── Normal / negative performance: show relevant insights ──
  else {
    // CRITICAL: only one root cause at a time
    if (expectancy < 0 && !usedRootCauses.has('expectancy')) {
      usedRootCauses.add('expectancy');
      insightCandidates.push({
        severity: 'critical',
        text: `Expectancy is -₹${Math.abs(expectancy).toLocaleString('en-IN')}/trade. Your system loses money on average.`,
        rootCause: 'expectancy',
      });
    }

    if (maxDrawdownPct > 10 && !usedRootCauses.has('drawdown')) {
      usedRootCauses.add('drawdown');
      insightCandidates.push({
        severity: 'critical',
        text: `Maximum drawdown at ${maxDrawdownPct.toFixed(1)}% — exceeding the 10% safe threshold.`,
        rootCause: 'drawdown',
      });
    }

    // Rule violations — soft when profitable, firm when not
    if (ruleAdherenceRate < 60 && !usedRootCauses.has('discipline')) {
      usedRootCauses.add('discipline');
      const severity: SeverityLevel = totalPnL > 0 ? 'moderate' : 'critical';
      const text = totalPnL > 0
        ? `Rule adherence is at ${ruleAdherenceRate.toFixed(0)}%. Consider improving discipline to protect your gains.`
        : `Rule adherence is at ${ruleAdherenceRate.toFixed(0)}%. This is contributing to losses.`;
      insightCandidates.push({ severity, text, rootCause: 'discipline' });
    }

    // MODERATE insights
    const revengeLosses = trades.filter(t => t.emotion === 'Revenge' && t.netPnl < 0);
    const revengeCount = revengeLosses.length;
    if (revengeCount >= 3 && !usedRootCauses.has('revenge')) {
      usedRootCauses.add('revenge');
      const revengePnl = revengeLosses.reduce((s, t) => s + t.netPnl, 0);
      insightCandidates.push({
        severity: totalPnL > 0 ? 'moderate' : 'critical',
        text: `Revenge trades lost ≈ ₹${Math.abs(revengePnl).toLocaleString('en-IN')}. After any loss: take a 30-minute break.`,
        rootCause: 'revenge',
      });
    }

    // Worst setup
    const setupMap: Record<string, { pnl: number; count: number }> = {};
    for (const t of sorted) {
      const s = t.setup || 'Undefined';
      if (!setupMap[s]) setupMap[s] = { pnl: 0, count: 0 };
      setupMap[s].pnl += t.netPnl;
      setupMap[s].count++;
    }
    const worstSetup = Object.entries(setupMap)
      .filter(([s]) => s !== 'Undefined')
      .reduce((a, b) => a[1].pnl < b[1].pnl ? a : b, ['', { pnl: 0, count: 0 }]);

    if (worstSetup[1].pnl < -500 && worstSetup[1].count >= 3 && !usedRootCauses.has('setup')) {
      usedRootCauses.add('setup');
      insightCandidates.push({
        severity: 'moderate',
        text: `"${worstSetup[0]}" setup lost ≈ ₹${Math.abs(Math.round(worstSetup[1].pnl)).toLocaleString('en-IN')}. Pause this setup for 10 trades.`,
        rootCause: 'setup',
      });
    }

    // MINOR: edge (best day)
    const dayMap: Record<string, { pnl: number; wins: number; count: number }> = {};
    for (const t of sorted) {
      const d = new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      if (!dayMap[d]) dayMap[d] = { pnl: 0, wins: 0, count: 0 };
      dayMap[d].pnl += t.netPnl;
      if (t.netPnl > 0) dayMap[d].wins++;
      dayMap[d].count++;
    }
    const bestDay = Object.entries(dayMap)
      .filter(([, d]) => d.count >= 3)
      .reduce((a, b) => a[1].pnl > b[1].pnl ? a : b, ['', { pnl: 0, wins: 0, count: 0 }]);

    if (bestDay[1].pnl > 0 && bestDay[1].count >= 3 && !usedRootCauses.has('best_day')) {
      const dayWR = Math.round((bestDay[1].wins / bestDay[1].count) * 100);
      insightCandidates.push({
        severity: 'minor',
        text: `Your edge: ${bestDay[0]}s have ${dayWR}% WR (+₹${bestDay[1].pnl.toLocaleString('en-IN')}). Prioritize these days.`,
        rootCause: 'best_day',
      });
    }
  }

  // ── Select max 3: one per severity ──
  const criticals = insightCandidates.filter(i => i.severity === 'critical');
  const moderates = insightCandidates.filter(i => i.severity === 'moderate');
  const minors = insightCandidates.filter(i => i.severity === 'minor');

  const insights: DecisionEngineResult['insights'] = [];
  if (criticals.length > 0) insights.push(criticals[0]);
  if (moderates.length > 0) insights.push(moderates[0]);
  if (minors.length > 0) insights.push(minors[0]);

  // ══════════════════════════════════════════════════════════
  //  7. CONTRADICTION CHECK (safety net)
  // ══════════════════════════════════════════════════════════

  if (strongPerf) {
    // Ensure no negative insight slipped through
    const cleaned = insights.filter(i => {
      if (i.severity === 'critical') {
        return i.text.includes('strong') || i.text.includes('edge') || i.text.includes('profit');
      }
      return true;
    });
    insights.splice(0, insights.length, ...cleaned);
  }

  // ══════════════════════════════════════════════════════════
  //  8. CLEAN RETURN
  // ══════════════════════════════════════════════════════════

  return {
    criticalIssue,
    actions,
    riskLevel,
    progression,
    insights,
    metrics,
  };
}
