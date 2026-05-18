/**
 * Trading Control Engine v6 — Strict Enforcement System.
 * 
 * - Severity based on financial impact (₹ ranges)
 * - No duplicate root causes between Severe and Leak
 * - Strict mode enforcement
 * - All rules are hard constraints
 * - Day-based trading control
 * - Position size auto-control
 * - Standardized "If ignored" with expected loss
 */

import { AnalyticsResult } from './analyticsEngine';
import { fmt, fmtCurrency, fmtPct } from './formatters';

// Severity determined purely by financial impact
export function classifyByFinancialImpact(amount: number): 'severe' | 'moderate' | 'minor' {
  const abs = Math.abs(amount);
  if (abs >= 1000) return 'severe';
  if (abs >= 500) return 'moderate';
  return 'minor';
}

export interface Insight {
  id: string;
  category: 'discipline' | 'risk' | 'psychology' | 'strategy' | 'timing';
  severity: 'severe' | 'moderate' | 'minor';
  financialImpact: number; // ₹ amount
  confidence: 'low' | 'medium' | 'high';
  title: string; // The hard command
  action: string; // Specific enforced step
  ifIgnored: string; // "If ignored: Expected loss ₹X based on historical performance"
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
  positionSizeRecommendation: string; // Auto-recommendation
}

export interface Progression {
  direction: 'improving' | 'declining' | 'stagnant-negative' | 'stable-profitable';
  description: string;
  last7Pnl: number;
  prev7Pnl: number;
}

export interface DecisionPlan {
  title: string;
  rules: Array<{
    rule: string;
    reason: string;
    ifIgnored: string;
    enforce: boolean; // Hard constraint vs suggestion
  }>;
}

export interface DayControl {
  avoidDays: string[];
  focusDays: string[];
  rules: Array<{
    rule: string;
    reason: string;
    enforce: boolean;
  }>;
}

export interface InsightsV6Package {
  insights: Insight[]; // Max 3, no duplicates
  leak: LeakDetection | null; // NEVER duplicates root cause of severe insight
  riskOfRuin: RiskOfRuin;
  progression: Progression;
  decisionPlan: DecisionPlan;
  dayControl: DayControl;
}

export function generateInsightsV6(data: AnalyticsResult): InsightsV6Package {
  if (data.totalTrades === 0) return emptyV6();

  const candidates: Insight[] = [];
  const severeRootCauses = new Set<string>(); // Track root causes of severe insights

  // ── SEVERE INSIGHTS (₹1000+ impact) ──

  // Rule adherence (financial impact based on total loss from violations)
  if (data.ruleViolations.length > 0 && data.ruleAdherenceRate < 60) {
    const top = data.ruleViolations[0];
    const name = fmt(top.name) || 'Core rules';
    const estimatedLoss = Math.round(data.totalNetPnL * (top.rate / 100));
    const impact = Math.max(1000, Math.abs(estimatedLoss));

    candidates.push({
      id: 'rule_violation',
      category: 'discipline',
      severity: 'severe',
      financialImpact: impact,
      confidence: data.totalTrades >= 10 ? 'high' : 'medium',
      title: `FOR NEXT 5 SESSIONS: ${name} is mandatory. Zero exceptions.`,
      action: `Write "${name}" before every entry. If violated, close platform for the day.`,
      ifIgnored: `If ignored: Expected loss ₹${impact.toLocaleString('en-IN')} based on ${top.rate}% historical violation rate.`,
    });
    severeRootCauses.add('rule_violation');
  }

  // Negative expectancy (₹ impact = |expectancy| × remaining trades in period)
  if (data.expectancy < 0) {
    const projectedLoss = Math.abs(data.expectancy) * 20; // 20 trades ahead
    const impact = Math.max(1000, Math.round(projectedLoss));

    candidates.push({
      id: 'negative_expectancy',
      category: 'risk',
      severity: 'severe',
      financialImpact: impact,
      confidence: data.totalTrades >= 10 ? 'high' : 'medium',
      title: `STOP taking new trades until expectancy is positive. Current system loses ${fmtCurrency(Math.abs(data.expectancy))}/trade.`,
      action: `Review last 10 losses. Eliminate worst-performing setup entirely. Resume only after positive expectancy confirmed.`,
      ifIgnored: `If ignored: Expected loss ₹${impact.toLocaleString('en-IN')} over next 20 trades based on current trajectory.`,
    });
    severeRootCauses.add('negative_expectancy');
  }

  // Drawdown > 15%
  if (data.maxDrawdownPct > 15) {
    const lastBalance = data.equityCurve.length > 0 ? data.equityCurve[data.equityCurve.length - 1].balance : 500000;
    const capitalAtRisk = Math.round((data.maxDrawdownPct / 100) * lastBalance);
    const impact = Math.max(1000, capitalAtRisk);

    candidates.push({
      id: 'drawdown',
      category: 'risk',
      severity: 'severe',
      financialImpact: impact,
      confidence: 'high',
      title: `FOR NEXT 5 TRADES: Cut position size to 50%. Enforce daily loss limit.`,
      action: `Every trade at half size. Stop trading for the day after 2 consecutive losses.`,
      ifIgnored: `If ignored: Expected additional drawdown of ₹${impact.toLocaleString('en-IN')} based on current trajectory.`,
    });
    severeRootCauses.add('drawdown');
  }

  // Revenge trading
  const revenge = data.emotionStats.find(e => e.emotion === 'Revenge');
  if (revenge && revenge.losses >= 2) {
    const impact = Math.max(1000, Math.abs(revenge.totalPnl));

    candidates.push({
      id: 'revenge',
      category: 'psychology',
      severity: 'severe',
      financialImpact: impact,
      confidence: revenge.trades >= 5 ? 'high' : 'medium',
      title: `AFTER ANY LOSS: 30-minute mandatory cooldown. No exceptions for next 10 sessions.`,
      action: `Set physical timer. Leave desk. No screen time. Return only when timer completes.`,
      ifIgnored: `If ignored: Expected loss ₹${impact.toLocaleString('en-IN')} based on ${revenge.losses} historical revenge trade losses.`,
    });
    severeRootCauses.add('revenge');
  }

  // ── MODERATE INSIGHTS (₹500–1000 impact) ──

  // Worst setup
  const worstSetup = data.setupStats.filter(s => s.setup !== 'Undefined')
    .reduce((a: any, b: any) => a.totalPnl < b.totalPnl ? a : b, null);
  const worstSetupName = worstSetup ? fmt(worstSetup.setup) : null;
  if (worstSetup && worstSetupName && worstSetup.trades >= 3 && worstSetup.totalPnl < 0) {
    const impact = Math.max(500, Math.abs(worstSetup.totalPnl));
    const severity = classifyByFinancialImpact(impact);

    candidates.push({
      id: 'worst_setup',
      category: 'strategy',
      severity,
      financialImpact: impact,
      confidence: worstSetup.trades >= 10 ? 'high' : 'medium',
      title: `PAUSE "${worstSetupName}" setup for next 10 trades. Maximum 1 trade per day until reviewed.`,
      action: `Remove from setup list. Review entries for timing errors before reconsidering.`,
      ifIgnored: `If ignored: Expected loss ₹${Math.round(impact / 10).toLocaleString('en-IN')} per trade based on ${fmtPct(worstSetup.winRate)} historical win rate.`,
    });
  }

  // FOMO
  const fomo = data.emotionStats.find(e => e.emotion === 'FOMO');
  if (fomo && fomo.losses >= 2) {
    const impact = Math.max(500, Math.abs(fomo.totalPnl));
    const severity = classifyByFinancialImpact(impact);

    candidates.push({
      id: 'fomo',
      category: 'psychology',
      severity,
      financialImpact: impact,
      confidence: fomo.trades >= 5 ? 'high' : 'medium',
      title: `If setup doesn't match ALL criteria → SKIP the trade. No exceptions.`,
      action: `Write entry checklist. No trade without every box checked.`,
      ifIgnored: `If ignored: Expected loss ₹${Math.round(impact / fomo.trades).toLocaleString('en-IN')} per impulsive trade based on historical data.`,
    });
  }

  // ── MINOR INSIGHTS (<₹500 impact) ──

  // Worst day
  const worstDay = data.dayStats.length >= 3
    ? data.dayStats.reduce((a, b) => a.totalPnl < b.totalPnl ? a : b)
    : null;
  const worstDayName = worstDay ? fmt(worstDay.day) : null;
  if (worstDay && worstDayName && worstDay.totalPnl < -500 && worstDay.trades >= 3) {
    const impact = Math.min(999, Math.max(100, Math.abs(worstDay.totalPnl)));

    candidates.push({
      id: 'worst_day',
      category: 'timing',
      severity: classifyByFinancialImpact(impact),
      financialImpact: impact,
      confidence: worstDay.trades >= 5 ? 'high' : 'medium',
      title: `NO TRADING on ${worstDayName}s for next 5 sessions. This day is blocked.`,
      action: `Mark ${worstDayName} as OFF on calendar. Use the day for chart review only.`,
      ifIgnored: `If ignored: Expected loss ₹${Math.round(Math.abs(worstDay.totalPnl) / worstDay.trades).toLocaleString('en-IN')} per ${worstDayName} based on historical data.`,
    });
  }

  // Best day
  const bestDay = data.dayStats.length >= 3
    ? data.dayStats.reduce((a, b) => a.totalPnl > b.totalPnl ? a : b)
    : null;
  const bestDayName = bestDay ? fmt(bestDay.day) : null;
  if (bestDay && bestDayName && bestDay.winRate >= 60 && bestDay.trades >= 3) {
    candidates.push({
      id: 'best_day',
      category: 'timing',
      severity: 'minor',
      financialImpact: Math.max(100, bestDay.totalPnl),
      confidence: bestDay.trades >= 10 ? 'high' : 'medium',
      title: `Only trade on ${bestDayName}s until system stabilizes. A+ setups required.`,
      action: `Schedule best setups for ${bestDayName}s. Skip marginal entries on other days.`,
      ifIgnored: `If ignored: Missing ${fmtCurrency(bestDay.totalPnl)} potential profit per ${bestDayName} session.`,
    });
  }

  // ── SELECT TOP 3 (one per severity max) ──
  const severes = candidates.filter(i => i.severity === 'severe').sort((a, b) => b.financialImpact - a.financialImpact);
  const moderates = candidates.filter(i => i.severity === 'moderate').sort((a, b) => b.financialImpact - a.financialImpact);
  const minors = candidates.filter(i => i.severity === 'minor').sort((a, b) => b.financialImpact - a.financialImpact);

  const insights: Insight[] = [];
  if (severes.length > 0) insights.push(severes[0]);
  if (moderates.length > 0) insights.push(moderates[0]);
  if (minors.length > 0) insights.push(minors[0]);

  // ── BIGGEST LEAK (deduplicated — never duplicate severe root cause) ──
  const leak = detectLeak(data, severeRootCauses);

  // ── RISK OF RUIN + Position Size ──
  const riskOfRuin = assessRiskOfRuin(data);

  // ── PROGRESSION ──
  const progression = assessProgression(data);

  // ── DECISION PLAN (hard constraints) ──
  const decisionPlan = buildDecisionPlan(data, leak, insights, worstDayName, bestDayName, riskOfRuin.level);

  // ── DAY CONTROL ──
  const dayControl: DayControl = {
    avoidDays: worstDayName && worstDay && worstDay.totalPnl < -500 && worstDay.trades >= 3 ? [worstDayName] : [],
    focusDays: bestDayName && bestDay && bestDay.winRate >= 60 && bestDay.trades >= 3 ? [bestDayName] : [],
    rules: [],
  };
  if (dayControl.avoidDays.length > 0) {
    dayControl.rules.push({
      rule: `No trading on ${dayControl.avoidDays.join(' or ')} for next 5 sessions`,
      reason: `${dayControl.avoidDays} has lowest win rate and highest losses`,
      enforce: true,
    });
  }
  if (dayControl.focusDays.length > 0) {
    dayControl.rules.push({
      rule: `Only trade on ${dayControl.focusDays.join(' and ')} until system stabilizes`,
      reason: `${dayControl.focusDays} has highest win rate and profitability`,
      enforce: false,
    });
  }

  return { insights, leak, riskOfRuin, progression, decisionPlan, dayControl };
}

/**
 * Detect biggest leak WITHOUT duplicating severe root causes.
 */
function detectLeak(data: AnalyticsResult, severeRootCauses: Set<string>): LeakDetection | null {
  // Rule violations — only if not already a severe insight
  if (!severeRootCauses.has('rule_violation') && data.ruleViolations.length > 0) {
    const top = data.ruleViolations[0];
    const name = fmt(top.name) || 'Core rules';
    return {
      title: 'Rule Violations',
      description: `Breaking "${name}" in ${top.rate}% of trades.`,
      financialImpact: Math.round(data.totalNetPnL * (top.rate / 100)),
    };
  }

  // Revenge trading — only if not already severe
  const revenge = data.emotionStats.find(e => e.emotion === 'Revenge');
  if (!severeRootCauses.has('revenge') && revenge && revenge.totalPnl < 0) {
    return {
      title: 'Revenge Trading',
      description: `${fmtCurrency(revenge.totalPnl)} lost across ${revenge.losses} revenge trades.`,
      financialImpact: Math.abs(revenge.totalPnl),
    };
  }

  // Worst day — only if not already covered
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

  if (data.expectancy < -500) { score += 3; reasons.push(`Negative expectancy of ${fmtCurrency(data.expectancy)}/trade`); }
  else if (data.expectancy < 0) { score += 2; reasons.push(`Negative expectancy of ${fmtCurrency(data.expectancy)}/trade`); }

  if (data.ruleAdherenceRate < 50) { score += 3; reasons.push(`Rule adherence at ${data.ruleAdherenceRate}%`); }
  else if (data.ruleAdherenceRate < 70) { score += 1; reasons.push(`Rule adherence at ${data.ruleAdherenceRate}%`); }

  let level: 'low' | 'medium' | 'high';
  let description: string;
  let positionSizeRecommendation: string;

  if (score >= 7) {
    level = 'high';
    description = 'High risk of significant capital loss.';
    positionSizeRecommendation = 'Reduce position size by 50% immediately. Risk ≤ 0.5% per trade until consistency score exceeds 60.';
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
    return { direction: 'stagnant-negative', description: 'Need at least 7 trades for trend analysis.', last7Pnl: 0, prev7Pnl: 0 };
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
        description: `System recovering but still negative (₹${data.expectancy}/trade). Last 7: ${fmtCurrency(last7Pnl)} vs ${fmtCurrency(prev7Pnl)}. Keep refining.`,
        last7Pnl, prev7Pnl,
      };
    }
    return {
      direction: 'stagnant-negative',
      description: `System has negative expectancy (₹${data.expectancy}/trade). Losing money over time. Last 7: ${fmtCurrency(last7Pnl)}. Not sustainable.`,
      last7Pnl, prev7Pnl,
    };
  }

  if (pnlDiff > 2000 && wrDiff > 5) {
    return {
      direction: 'improving',
      description: `Trending up. Last 7: ${fmtCurrency(last7Pnl)} vs ${fmtCurrency(prev7Pnl)}. Edge strengthening.`,
      last7Pnl, prev7Pnl,
    };
  }

  if (pnlDiff < -2000 && wrDiff < -5) {
    return {
      direction: 'declining',
      description: `Performance declining. Last 7: ${fmtCurrency(last7Pnl)} vs ${fmtCurrency(prev7Pnl)}. Review what changed.`,
      last7Pnl, prev7Pnl,
    };
  }

  return {
    direction: 'stable-profitable',
    description: `Consistent. Last 7: ${fmtCurrency(last7Pnl)} (${last7WR}% WR). Edge holding steady.`,
    last7Pnl, prev7Pnl,
  };
}

function buildDecisionPlan(
  data: AnalyticsResult,
  leak: LeakDetection | null,
  insights: Insight[],
  worstDayName: string | null,
  bestDayName: string | null,
  riskLevel: string
): DecisionPlan {
  const rules: Array<{ rule: string; reason: string; ifIgnored: string; enforce: boolean }> = [];

  // From leak
  if (leak) {
    const existingIds = new Set(insights.map(i => i.id));
    if (!existingIds.has('rule_violation') && !existingIds.has('revenge')) {
      rules.push({
        rule: leak.title === 'Rule Violations' ? 'Enforce mandatory stop loss before every entry. Maximum 2 trades per day.' :
              leak.title === 'Revenge Trading' ? 'After any loss: 30-minute cooldown. Maximum 2 trades per day.' :
              'Review last 10 losses. Eliminate worst setup.',
        reason: leak.description,
        ifIgnored: `If ignored: Expected loss ₹${Math.abs(leak.financialImpact).toLocaleString('en-IN')} based on historical performance.`,
        enforce: true,
      });
    }
  }

  // Position size control based on risk of ruin
  if (riskLevel === 'high') {
    rules.push({
      rule: 'Reduce position size by 50%. Risk ≤ 0.5% per trade.',
      reason: 'High risk of ruin detected.',
      ifIgnored: 'If ignored: Potential total capital loss within 20–30 trades.',
      enforce: true,
    });
  } else if (riskLevel === 'medium') {
    rules.push({
      rule: 'Reduce position size by 25%. Risk ≤ 1% per trade.',
      reason: 'Moderate risk of capital erosion.',
      ifIgnored: 'If ignored: Expected 15–25% drawdown expansion.',
      enforce: true,
    });
  }

  // Day-based controls
  if (worstDayName) {
    rules.push({
      rule: `No trading on ${worstDayName}s for next 5 sessions.`,
      reason: `Highest losses and lowest win rate on this day.`,
      ifIgnored: `If ignored: Expected loss ₹${Math.round(Math.abs(
        data.dayStats.find(d => fmt(d.day) === worstDayName)?.totalPnl || 0
      ) / Math.max(1, data.dayStats.find(d => fmt(d.day) === worstDayName)?.trades || 1)).toLocaleString('en-IN')} per ${worstDayName}.`,
      enforce: true,
    });
  }

  if (bestDayName) {
    rules.push({
      rule: `Only trade on ${bestDayName}s until system stabilizes.`,
      reason: `Highest win rate and profitability on this day.`,
      ifIgnored: `If ignored: Missing ${fmtCurrency(Math.abs(
        data.dayStats.find(d => fmt(d.day) === bestDayName)?.totalPnl || 0
      ))} potential profit per ${bestDayName}.`,
      enforce: false,
    });
  }

  // From severe insights
  const severeInsight = insights.find(i => i.severity === 'severe');
  if (severeInsight && !rules.some(r => r.rule.toLowerCase().includes(severeInsight.title.toLowerCase().substring(0, 25)))) {
    rules.push({
      rule: severeInsight.title,
      reason: severeInsight.action,
      ifIgnored: severeInsight.ifIgnored,
      enforce: true,
    });
  }

  // Fallback defaults
  if (rules.length === 0) {
    rules.push(
      { rule: 'Risk ≤ 1.5% per trade. Maximum 3 trades per day.', reason: 'Standard risk management.', ifIgnored: 'If ignored: Uncontrolled losses if exceeded.', enforce: true },
      { rule: 'Stop loss required before every entry.', reason: 'No exceptions.', ifIgnored: 'If ignored: Single bad trade can wipe 5–15% of capital.', enforce: true }
    );
  }

  return { title: 'Next 3 Trades: Execution Plan', rules: rules.slice(0, 3) };
}

function emptyV6(): InsightsV6Package {
  return {
    insights: [],
    leak: null,
    riskOfRuin: { level: 'low', description: 'No trades yet.', reasons: [], positionSizeRecommendation: 'Maintain current sizing.' },
    progression: { direction: 'stagnant-negative', description: 'No data yet.', last7Pnl: 0, prev7Pnl: 0 },
    decisionPlan: { title: 'Execution Plan', rules: [] },
    dayControl: { avoidDays: [], focusDays: [], rules: [] },
  };
}
