/**
 * Trading Control Engine v7 — Professional-Grade Decision System.
 * 
 * - Strict logical hierarchy: root cause blocks derived insights
 * - Severity based on system impact (not financial)
 * - Standardized enforcement language
 * - All actions are time-bound
 * - Statistical language uses "≈" and "based on historical performance"
 */

import { AnalyticsResult } from './analyticsEngine';
import { fmt, fmtCurrency } from './formatters';

// Severity based on system impact
export type Severity = 'severe' | 'moderate' | 'minor';

// Mapping: root cause → derived insight IDs to suppress
const DERIVED_SUPPRESSION: Record<string, string[]> = {
  no_stop_loss: ['worst_day', 'fomo', 'worst_setup'],
  negative_expectancy: ['worst_setup', 'worst_day', 'fomo'],
  excessive_drawdown: ['worst_day', 'worst_setup'],
  rule_violation: ['fomo', 'worst_setup'],
  revenge_trading: ['fomo', 'worst_day'],
};

export interface Insight {
  id: string;
  category: 'discipline' | 'risk' | 'psychology' | 'strategy' | 'timing';
  severity: Severity;
  financialImpact: number;
  confidence: 'low' | 'medium' | 'high';
  title: string; // The command
  action: string; // Specific enforced step with time-bound duration
  ifIgnored: string; // Standardized format
}

export interface LeakDetection {
  title: string;
  description: string;
  financialImpact: number;
}

export interface RiskOfRuin {
  level: 'low' | 'medium' | 'high';
  description: string;
  reasons: string[];
  positionSizeRecommendation: string;
}

export interface Progression {
  direction: 'improving' | 'declining' | 'stagnant-negative' | 'stable-profitable';
  description: string;
  action: string; // What to do based on direction
  last7Pnl: number;
  prev7Pnl: number;
}

export interface DecisionPlan {
  title: string;
  rules: Array<{
    rule: string;
    reason: string;
    ifIgnored: string;
    enforce: boolean;
    duration: string; // Time-bound
  }>;
}

export interface DayControl {
  avoidDays: string[];
  focusDays: string[];
  primaryDay: string | null;
  rules: Array<{ rule: string; reason: string; enforce: boolean }>;
}

export interface InsightsV7Package {
  insights: Insight[];
  leak: LeakDetection | null;
  riskOfRuin: RiskOfRuin;
  progression: Progression;
  decisionPlan: DecisionPlan;
  dayControl: DayControl;
}

export function generateInsightsV7(data: AnalyticsResult): InsightsV7Package {
  if (data.totalTrades === 0) return emptyV7();

  const candidates: Insight[] = [];
  const activeRootCauses = new Set<string>();
  const suppressedInsights = new Set<string>();

  // ════════════════════════════════════
  // PHASE 1: Detect root causes (Severe)
  // ════════════════════════════════════

  // Root cause 1: Stop loss not respected
  const slRule = data.ruleViolations.find(v =>
    v.name.toLowerCase().includes('stop') || v.name.toLowerCase().includes('sl')
  );
  if (slRule && slRule.rate > 40) {
    activeRootCauses.add('no_stop_loss');
    (DERIVED_SUPPRESSION['no_stop_loss'] || []).forEach(id => suppressedInsights.add(id));

    candidates.push({
      id: 'no_stop_loss',
      category: 'discipline',
      severity: 'severe',
      financialImpact: Math.round(data.totalNetPnL * (slRule.rate / 100)),
      confidence: 'high',
      title: 'Stop loss violations detected. Stop trading immediately. No new trades allowed until stop loss is enforced for 10 consecutive trades.',
      action: 'For next 10 trades: Enter stop loss before every entry. If not possible, do not take the trade. Stop trading for the session if stop loss is missed.',
      ifIgnored: `If ignored: Expected loss ≈ ₹${Math.round(Math.abs(data.totalNetPnL) * (slRule.rate / 100)).toLocaleString('en-IN')} based on historical performance.`,
    });
  }

  // Root cause 2: Negative expectancy
  if (data.expectancy < 0) {
    activeRootCauses.add('negative_expectancy');
    (DERIVED_SUPPRESSION['negative_expectancy'] || []).forEach(id => suppressedInsights.add(id));

    const projectedLoss = Math.abs(data.expectancy) * 20;
    candidates.push({
      id: 'negative_expectancy',
      category: 'risk',
      severity: 'severe',
      financialImpact: Math.max(1000, Math.round(projectedLoss)),
      confidence: data.totalTrades >= 10 ? 'high' : 'medium',
      title: 'Negative expectancy detected. Do not scale. Maintain reduced risk until expectancy is positive for 10 consecutive trades.',
      action: 'For next 20 trades: Risk ≤ 0.5% per trade. Review last 10 losses. Eliminate worst-performing setup entirely. Resume normal sizing only after expectancy ≥ 0 for 10 trades.',
      ifIgnored: `If ignored: Expected loss ≈ ₹${Math.round(projectedLoss).toLocaleString('en-IN')} over next 20 trades based on historical performance.`,
    });
  }

  // Root cause 3: Excessive drawdown (> 15%)
  if (data.maxDrawdownPct > 15) {
    activeRootCauses.add('excessive_drawdown');
    (DERIVED_SUPPRESSION['excessive_drawdown'] || []).forEach(id => suppressedInsights.add(id));

    const lastBalance = data.equityCurve.length > 0 ? data.equityCurve[data.equityCurve.length - 1].balance : 500000;
    const capitalAtRisk = Math.round((data.maxDrawdownPct / 100) * lastBalance);

    candidates.push({
      id: 'excessive_drawdown',
      category: 'risk',
      severity: 'severe',
      financialImpact: capitalAtRisk,
      confidence: 'high',
      title: 'Drawdown exceeds safe limits. Reduce position size to 50% for next 5 trades. Stop trading for the session after 2 consecutive losses.',
      action: 'For next 5 trades: Every trade at 50% normal size. Maximum 2 trades per day. Stop trading immediately after 2 consecutive losses.',
      ifIgnored: `If ignored: Expected additional drawdown ≈ ₹${capitalAtRisk.toLocaleString('en-IN')} based on historical trajectory.`,
    });
  }

  // Root cause 4: Rule violation rate > 60%
  if (data.ruleViolations.length > 0 && data.ruleAdherenceRate < 40 && !activeRootCauses.has('no_stop_loss')) {
    activeRootCauses.add('rule_violation');
    (DERIVED_SUPPRESSION['rule_violation'] || []).forEach(id => suppressedInsights.add(id));

    const top = data.ruleViolations[0];
    const name = fmt(top.name) || 'Core trading rules';

    candidates.push({
      id: 'rule_violation',
      category: 'discipline',
      severity: 'severe',
      financialImpact: Math.round(data.totalNetPnL * (top.rate / 100)),
      confidence: data.totalTrades >= 10 ? 'high' : 'medium',
      title: `${name} violated in ${top.rate}% of trades. Stop trading immediately. No new trades allowed until discipline is restored for 5 consecutive sessions.`,
      action: `For next 5 sessions: Write "${name}" before every entry. If violated, close all positions and stop trading for the day. Maximum 1 trade per session.`,
      ifIgnored: `If ignored: Expected loss ≈ ₹${Math.round(Math.abs(data.totalNetPnL) * (top.rate / 100)).toLocaleString('en-IN')} based on historical performance.`,
    });
  }

  // Root cause 5: Revenge trading
  const revenge = data.emotionStats.find(e => e.emotion === 'Revenge');
  if (revenge && revenge.losses >= 3) {
    activeRootCauses.add('revenge_trading');
    (DERIVED_SUPPRESSION['revenge_trading'] || []).forEach(id => suppressedInsights.add(id));

    candidates.push({
      id: 'revenge_trading',
      category: 'psychology',
      severity: 'severe',
      financialImpact: Math.abs(revenge.totalPnl),
      confidence: revenge.trades >= 5 ? 'high' : 'medium',
      title: 'Revenge trading detected. After any loss: 30-minute mandatory cooldown. No new trades allowed during cooldown for next 10 sessions.',
      action: 'For next 10 sessions: Set physical timer after every loss. Leave desk. No screen time. Return only when timer completes. Maximum 2 trades per day.',
      ifIgnored: `If ignored: Expected loss ≈ ₹${Math.abs(revenge.totalPnl).toLocaleString('en-IN')} based on ${revenge.losses} historical revenge trade losses.`,
    });
  }

  // ══════════════════════════════════════
  // PHASE 2: Add non-suppressed insights
  // ══════════════════════════════════════

  // Worst setup (only if not suppressed)
  if (!suppressedInsights.has('worst_setup')) {
    const worstSetup = data.setupStats.filter(s => s.setup !== 'Undefined')
      .reduce((a: any, b: any) => a.totalPnl < b.totalPnl ? a : b, null);
    const worstSetupName = worstSetup ? fmt(worstSetup.setup) : null;
    if (worstSetup && worstSetupName && worstSetup.trades >= 3 && worstSetup.totalPnl < 0) {
      candidates.push({
        id: 'worst_setup',
        category: 'strategy',
        severity: 'moderate',
        financialImpact: Math.abs(worstSetup.totalPnl),
        confidence: worstSetup.trades >= 10 ? 'high' : 'medium',
        title: `Pause "${worstSetupName}" setup for next 10 trades.`,
        action: `For next 10 trades: Remove "${worstSetupName}" from your setup list. Review entries for timing errors before reconsidering.`,
        ifIgnored: `If ignored: Expected loss ≈ ₹${Math.round(Math.abs(worstSetup.totalPnl) / worstSetup.trades).toLocaleString('en-IN')} per trade based on historical performance.`,
      });
    }
  }

  // FOMO (only if not suppressed)
  if (!suppressedInsights.has('fomo')) {
    const fomo = data.emotionStats.find(e => e.emotion === 'FOMO');
    if (fomo && fomo.losses >= 2) {
      candidates.push({
        id: 'fomo',
        category: 'psychology',
        severity: 'moderate',
        financialImpact: Math.abs(fomo.totalPnl),
        confidence: fomo.trades >= 5 ? 'high' : 'medium',
        title: 'FOMO entries detected. If setup does not match ALL criteria, skip the trade.',
        action: 'For next 10 sessions: Write entry checklist. No trade without every box checked. Maximum 2 trades per day.',
        ifIgnored: `If ignored: Expected loss ≈ ₹${Math.round(Math.abs(fomo.totalPnl) / fomo.trades).toLocaleString('en-IN')} per impulsive trade based on historical performance.`,
      });
    }
  }

  // Worst day (only if not suppressed)
  const worstDay = data.dayStats.length >= 3
    ? data.dayStats.reduce((a, b) => a.totalPnl < b.totalPnl ? a : b)
    : null;
  const worstDayName = worstDay ? fmt(worstDay.day) : null;
  if (!suppressedInsights.has('worst_day') && worstDay && worstDayName && worstDay.totalPnl < -500 && worstDay.trades >= 3) {
    candidates.push({
      id: 'worst_day',
      category: 'timing',
      severity: 'moderate',
      financialImpact: Math.abs(worstDay.totalPnl),
      confidence: worstDay.trades >= 5 ? 'high' : 'medium',
      title: `No trading on ${worstDayName}s for next 5 sessions.`,
      action: `For next 5 sessions: Mark ${worstDayName} as OFF on calendar. Use the day for chart review and planning only. No live trades.`,
      ifIgnored: `If ignored: Expected loss ≈ ₹${Math.round(Math.abs(worstDay.totalPnl) / worstDay.trades).toLocaleString('en-IN')} per ${worstDayName} based on historical performance.`,
    });
  }

  // Best day (always add as minor — it's an optimization)
  const bestDay = data.dayStats.length >= 3
    ? data.dayStats.reduce((a, b) => a.totalPnl > b.totalPnl ? a : b)
    : null;
  const bestDayName = bestDay ? fmt(bestDay.day) : null;
  if (bestDay && bestDayName && bestDay.winRate >= 60 && bestDay.trades >= 3) {
    candidates.push({
      id: 'best_day',
      category: 'timing',
      severity: 'minor',
      financialImpact: bestDay.totalPnl,
      confidence: bestDay.trades >= 10 ? 'high' : 'medium',
      title: `Primary trading day: ${bestDayName}.`,
      action: `Until system stabilizes: Schedule your highest-conviction setups for ${bestDayName}s. Use other days only for A+ setups with full criteria match.`,
      ifIgnored: `If ignored: Missing potential profit ≈ ₹${Math.round(bestDay.totalPnl / Math.max(1, bestDay.trades)).toLocaleString('en-IN')} per ${bestDayName} session based on historical performance.`,
    });
  }

  // ══════════════════════════════════════
  // PHASE 3: Select top 3 (one per severity max)
  // ══════════════════════════════════════

  const severes = candidates.filter(i => i.severity === 'severe').sort((a, b) => b.financialImpact - a.financialImpact);
  const moderates = candidates.filter(i => i.severity === 'moderate').sort((a, b) => b.financialImpact - a.financialImpact);
  const minors = candidates.filter(i => i.severity === 'minor').sort((a, b) => b.financialImpact - a.financialImpact);

  const insights: Insight[] = [];
  if (severes.length > 0) insights.push(severes[0]);
  if (moderates.length > 0) insights.push(moderates[0]);
  if (minors.length > 0) insights.push(minors[0]);

  // ══════════════════════════════════════
  // LEAK (deduplicated from severe root causes)
  // ══════════════════════════════════════
  const leak = detectLeak(data, activeRootCauses);

  // ══════════════════════════════════════
  // RISK OF RUIN + Position Size
  // ══════════════════════════════════════
  const riskOfRuin = assessRiskOfRuin(data);

  // ══════════════════════════════════════
  // PROGRESSION (with actionable advice)
  // ══════════════════════════════════════
  const progression = assessProgression(data);

  // ══════════════════════════════════════
  // DECISION PLAN (time-bound hard constraints)
  // ══════════════════════════════════════
  const decisionPlan = buildDecisionPlan(data, leak, insights, worstDayName, bestDayName, riskOfRuin.level);

  // ══════════════════════════════════════
  // DAY CONTROL
  // ══════════════════════════════════════
  const dayControl: DayControl = {
    avoidDays: worstDayName && worstDay && worstDay.totalPnl < -500 && worstDay.trades >= 3 ? [worstDayName] : [],
    focusDays: bestDayName && bestDay && bestDay.winRate >= 60 && bestDay.trades >= 3 ? [bestDayName] : [],
    primaryDay: bestDayName && bestDay && bestDay.winRate >= 60 && bestDay.trades >= 3 ? bestDayName : null,
    rules: [],
  };
  if (dayControl.avoidDays.length > 0) {
    dayControl.rules.push({
      rule: `No trading on ${dayControl.avoidDays[0]} for next 5 sessions`,
      reason: `${dayControl.avoidDays[0]} has lowest win rate and highest losses`,
      enforce: true,
    });
  }
  if (dayControl.primaryDay) {
    dayControl.rules.push({
      rule: `Primary trading day: ${dayControl.primaryDay}`,
      reason: `${dayControl.primaryDay} has highest win rate and profitability`,
      enforce: false,
    });
  }

  return { insights, leak, riskOfRuin, progression, decisionPlan, dayControl };
}

/**
 * Detect biggest leak WITHOUT duplicating severe root causes.
 */
function detectLeak(data: AnalyticsResult, _activeRootCauses: Set<string>): LeakDetection | null {
  // Only show leak if NO severe root causes are active
  if (_activeRootCauses.size > 0) return null;

  // If no severe issues, show the next biggest problem
  const revenge = data.emotionStats.find(e => e.emotion === 'Revenge');
  if (revenge && revenge.totalPnl < 0) {
    return {
      title: 'Revenge Trading',
      description: `${fmtCurrency(revenge.totalPnl)} lost across ${revenge.losses} revenge trades.`,
      financialImpact: Math.abs(revenge.totalPnl),
    };
  }

  const worstDay = data.dayStats.length >= 3 ? data.dayStats.reduce((a, b) => a.totalPnl < b.totalPnl ? a : b) : null;
  if (worstDay && worstDay.totalPnl < -1000) {
    const dayName = fmt(worstDay.day);
    if (dayName) {
      return {
        title: `${dayName} Trading Losses`,
        description: `${fmtCurrency(worstDay.totalPnl)} lost on ${dayName}s.`,
        financialImpact: Math.abs(worstDay.totalPnl),
      };
    }
  }

  return null;
}

function assessRiskOfRuin(data: AnalyticsResult): RiskOfRuin {
  if (data.totalTrades < 5) return { level: 'low', description: 'Insufficient data.', reasons: [], positionSizeRecommendation: 'Maintain current position sizing.' };

  const reasons: string[] = [];
  let score = 0;

  if (data.maxDrawdownPct > 20) { score += 3; reasons.push(`Drawdown at ${data.maxDrawdownPct}%`); }
  else if (data.maxDrawdownPct > 10) { score += 2; reasons.push(`Drawdown at ${data.maxDrawdownPct}%`); }
  else if (data.maxDrawdownPct > 5) { score += 1; reasons.push(`Drawdown at ${data.maxDrawdownPct}%`); }

  if (data.expectancy < -500) { score += 3; reasons.push(`Negative expectancy ≈ ${fmtCurrency(data.expectancy)}/trade`); }
  else if (data.expectancy < 0) { score += 2; reasons.push(`Negative expectancy ≈ ${fmtCurrency(data.expectancy)}/trade`); }

  if (data.ruleAdherenceRate < 50) { score += 3; reasons.push(`Rule adherence at ${data.ruleAdherenceRate}%`); }
  else if (data.ruleAdherenceRate < 70) { score += 1; reasons.push(`Rule adherence at ${data.ruleAdherenceRate}%`); }

  let level: 'low' | 'medium' | 'high';
  let description: string;
  let positionSizeRecommendation: string;

  if (score >= 7) {
    level = 'high';
    description = 'High risk of significant capital loss.';
    positionSizeRecommendation = 'Reduce position size by 50% immediately. Risk ≤ 0.5% per trade until consistency score exceeds 60 for 5 consecutive sessions.';
  } else if (score >= 4) {
    level = 'medium';
    description = 'Moderate risk of capital erosion.';
    positionSizeRecommendation = 'Reduce position size by 25%. Risk ≤ 1% per trade for next 10 sessions.';
  } else {
    level = 'low';
    description = 'Risk is manageable with current discipline.';
    positionSizeRecommendation = 'Maintain current position sizing. Risk ≤ 2% per trade.';
  }

  return { level, description, reasons, positionSizeRecommendation };
}

function assessProgression(data: AnalyticsResult): Progression {
  const sorted = [...data.equityCurve].slice(1);
  if (sorted.length < 7) {
    return {
      direction: 'stagnant-negative',
      description: 'Need at least 7 trades for trend analysis.',
      action: 'Log more trades with complete data for accurate progression tracking.',
      last7Pnl: 0, prev7Pnl: 0,
    };
  }

  const netPnls = sorted.map(e => e.netPnl || 0);
  const recent7 = netPnls.slice(-7);
  const prev7 = netPnls.slice(-14, -7);

  const last7Pnl = recent7.reduce((s, v) => s + v, 0);
  const prev7Pnl = prev7.length > 0 ? prev7.reduce((s, v) => s + v, 0) : 0;
  const pnlDiff = last7Pnl - prev7Pnl;

  const last7Wins = recent7.filter(v => v > 0).length;
  const prev7Wins = prev7.filter(v => v > 0).length;
  const last7WR = Math.round((last7Wins / 7) * 100);
  const prev7WR = prev7.length > 0 ? Math.round((prev7Wins / prev7.length) * 100) : 0;
  const wrDiff = last7WR - prev7WR;

  // FIX: If expectancy is negative, NEVER show "Stable"
  if (data.expectancy < 0) {
    if (pnlDiff > 2000 && wrDiff > 5) {
      return {
        direction: 'improving',
        description: `System recovering but still negative (≈ ${fmtCurrency(data.expectancy)}/trade). Last 7: ${fmtCurrency(last7Pnl)} vs ${fmtCurrency(prev7Pnl)}.`,
        action: 'Do not scale. Maintain reduced risk until expectancy is positive for 10 consecutive trades.',
        last7Pnl, prev7Pnl,
      };
    }
    return {
      direction: 'stagnant-negative',
      description: `System has negative expectancy (≈ ${fmtCurrency(data.expectancy)}/trade). Losing money over time. Last 7: ${fmtCurrency(last7Pnl)}.`,
      action: 'Do not scale. Maintain reduced risk until expectancy is positive for 10 consecutive trades. Review last 10 losses.',
      last7Pnl, prev7Pnl,
    };
  }

  if (pnlDiff > 2000 && wrDiff > 5) {
    return {
      direction: 'improving',
      description: `Trending up. Last 7: ${fmtCurrency(last7Pnl)} vs ${fmtCurrency(prev7Pnl)}.`,
      action: 'Gradually increase position size by 10% per session. Maintain current discipline.',
      last7Pnl, prev7Pnl,
    };
  }

  if (pnlDiff < -2000 && wrDiff < -5) {
    return {
      direction: 'declining',
      description: `Performance declining. Last 7: ${fmtCurrency(last7Pnl)} vs ${fmtCurrency(prev7Pnl)}.`,
      action: 'Reduce position size by 25% for next 5 trades. Review what changed in your process.',
      last7Pnl, prev7Pnl,
    };
  }

  return {
    direction: 'stable-profitable',
    description: `Consistent. Last 7: ${fmtCurrency(last7Pnl)} (${last7WR}% WR). Edge holding steady.`,
    action: 'Maintain current sizing and discipline. Do not increase risk until consistency score exceeds 75 for 5 consecutive sessions.',
    last7Pnl, prev7Pnl,
  };
}

function buildDecisionPlan(
  data: AnalyticsResult,
  _leak: LeakDetection | null,
  insights: Insight[],
  worstDayName: string | null,
  bestDayName: string | null,
  riskLevel: string
): DecisionPlan {
  const rules: Array<{ rule: string; reason: string; ifIgnored: string; enforce: boolean; duration: string }> = [];

  // Position size control based on risk of ruin
  if (riskLevel === 'high') {
    rules.push({
      rule: 'Reduce position size by 50%. Risk ≤ 0.5% per trade.',
      reason: 'High risk of ruin detected.',
      ifIgnored: 'If ignored: Expected loss ≈ total capital within 20–30 trades based on historical performance.',
      enforce: true,
      duration: 'Until consistency score exceeds 60 for 5 consecutive sessions',
    });
  } else if (riskLevel === 'medium') {
    rules.push({
      rule: 'Reduce position size by 25%. Risk ≤ 1% per trade.',
      reason: 'Moderate risk of capital erosion.',
      ifIgnored: 'If ignored: Expected drawdown expansion ≈ 15–25% based on historical performance.',
      enforce: true,
      duration: 'For next 10 sessions',
    });
  }

  // Day-based controls
  if (worstDayName) {
    rules.push({
      rule: `No trading on ${worstDayName}s.`,
      reason: `${worstDayName} has lowest win rate and highest losses.`,
      ifIgnored: `If ignored: Expected loss ≈ ₹${Math.round(Math.abs(
        data.dayStats.find(d => fmt(d.day) === worstDayName)?.totalPnl || 0
      ) / Math.max(1, data.dayStats.find(d => fmt(d.day) === worstDayName)?.trades || 1)).toLocaleString('en-IN')} per ${worstDayName} based on historical performance.`,
      enforce: true,
      duration: 'For next 5 sessions',
    });
  }

  if (bestDayName) {
    rules.push({
      rule: `Primary trading day: ${bestDayName}.`,
      reason: `${bestDayName} has highest win rate and profitability.`,
      ifIgnored: `If ignored: Missing potential profit ≈ ${fmtCurrency(Math.abs(
        data.dayStats.find(d => fmt(d.day) === bestDayName)?.totalPnl || 0
      ))} per ${bestDayName} based on historical performance.`,
      enforce: false,
      duration: 'Until system stabilizes',
    });
  }

  // From severe insights
  const severeInsight = insights.find(i => i.severity === 'severe');
  if (severeInsight) {
    rules.push({
      rule: severeInsight.title,
      reason: severeInsight.action,
      ifIgnored: severeInsight.ifIgnored,
      enforce: true,
      duration: 'As specified in the action step',
    });
  }

  // Fallback defaults
  if (rules.length === 0) {
    rules.push(
      {
        rule: 'Risk ≤ 1.5% per trade. Maximum 3 trades per day.',
        reason: 'Standard risk management.',
        ifIgnored: 'If ignored: Expected uncontrolled losses based on historical performance.',
        enforce: true,
        duration: 'Until consistency score exceeds 70',
      },
      {
        rule: 'Stop loss required before every entry.',
        reason: 'No exceptions.',
        ifIgnored: 'If ignored: Expected single-trade loss ≈ 5–15% of capital based on historical performance.',
        enforce: true,
        duration: 'Permanent rule',
      }
    );
  }

  return { title: 'Next 3 Trades: Execution Plan', rules: rules.slice(0, 3) };
}

function emptyV7(): InsightsV7Package {
  return {
    insights: [],
    leak: null,
    riskOfRuin: { level: 'low', description: 'No trades yet.', reasons: [], positionSizeRecommendation: 'Maintain current sizing.' },
    progression: { direction: 'stagnant-negative', description: 'No data yet.', action: 'Log trades to measure progression.', last7Pnl: 0, prev7Pnl: 0 },
    decisionPlan: { title: 'Execution Plan', rules: [] },
    dayControl: { avoidDays: [], focusDays: [], primaryDay: null, rules: [] },
  };
}
