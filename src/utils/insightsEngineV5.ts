/**
 * Insights Engine v5 — Enforced Decision System.
 * - No duplicates between Critical Issues and Biggest Leak
 * - Text severity levels (Severe/Moderate/Minor) instead of scores
 * - All insights are direct commands
 * - Progression logic fixed for negative expectancy
 * - Day-based hard rules
 * - Quality score enforcement
 */

import { AnalyticsResult } from './analyticsEngine';
import { fmt, fmtCurrency } from './formatters';

export type SeverityLevel = 'severe' | 'moderate' | 'minor';

export interface Insight {
  id: string;
  category: 'discipline' | 'risk' | 'psychology' | 'strategy' | 'timing';
  severity: SeverityLevel;
  confidence: 'low' | 'medium' | 'high';
  title: string; // The command itself
  action: string; // Specific step to follow
  consequence: string; // "If ignored → X"
  expectedImprovement: string[];
}

export interface LeakDetection {
  title: string;
  description: string;
  fixImpact: string[];
  rule?: string; // Hard rule generated from leak
}

export interface RiskOfRuin {
  level: 'low' | 'medium' | 'high';
  description: string;
  reasons: string[]; // WHY this level
}

export interface Progression {
  direction: 'improving' | 'declining' | 'stagnant-negative' | 'stable-profitable';
  description: string;
  last7Pnl: number;
  prev7Pnl: number;
}

export interface DecisionPlan {
  title: string;
  rules: Array<{ rule: string; reason: string; consequence: string }>;
}

export interface QualityEnforcement {
  score: number;
  message: string;
  enforce: boolean;
}

export interface DayControl {
  avoidDays: string[];
  focusDays: string[];
  rules: Array<{ rule: string; reason: string }>;
}

export interface InsightsV5Package {
  insights: Insight[]; // Max 3: 1 Severe, 1 Moderate, 1 Minor
  leak: LeakDetection | null; // NEVER duplicates what's in insights
  riskOfRuin: RiskOfRuin;
  progression: Progression;
  decisionPlan: DecisionPlan;
  quality: QualityEnforcement;
  dayControl: DayControl;
}

export function generateInsightsV5(data: AnalyticsResult): InsightsV5Package {
  if (data.totalTrades === 0) return emptyV5();

  const candidates: Insight[] = [];
  const leakRuleIds = new Set<string>(); // Track what goes into leak to avoid duplication

  // ── SEVERE COMMANDS ──

  // Rule violation (highest priority when adherence < 60%)
  if (data.ruleViolations.length > 0 && data.ruleAdherenceRate < 60) {
    const top = data.ruleViolations[0];
    const name = fmt(top.name) || 'Core rules';
    leakRuleIds.add(top.ruleId);
    candidates.push({
      id: 'rule_violation',
      category: 'discipline',
      severity: 'severe',
      confidence: data.totalTrades >= 10 ? 'high' : 'medium',
      title: `FOR NEXT 5 SESSIONS: ${name} is mandatory. Zero exceptions.`,
      action: `Write "${name}" on a sticky note. Check it BEFORE every entry. If violated, close platform for the day.`,
      consequence: `If ignored → ${top.rate}% violation rate will continue causing uncontrolled losses.`,
      expectedImprovement: [
        `Drawdown reduced by 25–40%`,
        `Consistency score improves 15–25 points`,
      ],
    });
  }

  // Negative expectancy
  if (data.expectancy < 0) {
    candidates.push({
      id: 'negative_expectancy',
      category: 'risk',
      severity: 'severe',
      confidence: data.totalTrades >= 10 ? 'high' : 'medium',
      title: `STOP taking new trades. Your system loses ${fmtCurrency(Math.abs(data.expectancy))}/trade on average.`,
      action: `Review your last 10 losing trades. Eliminate the worst-performing setup entirely. Only resume after expectancy turns positive.`,
      consequence: `If ignored → mathematical certainty of capital erosion. Each trade statistically loses money.`,
      expectedImprovement: [
        `Turning expectancy positive flips your entire PnL trajectory`,
      ],
    });
  }

  // Drawdown > 15%
  if (data.maxDrawdownPct > 15) {
    candidates.push({
      id: 'drawdown',
      category: 'risk',
      severity: 'severe',
      confidence: 'high',
      title: `FOR NEXT 5 TRADES: Cut position size to 50%. Enforce daily loss limit.`,
      action: `Every trade at half normal size. Stop trading for the day after 2 consecutive losses.`,
      consequence: `If ignored → drawdown will expand beyond recoverable levels.`,
      expectedImprovement: [
        `Future drawdowns capped at 40–50% of current`,
      ],
    });
  }

  // Revenge trading
  const revenge = data.emotionStats.find(e => e.emotion === 'Revenge');
  if (revenge && revenge.losses >= 2) {
    candidates.push({
      id: 'revenge',
      category: 'psychology',
      severity: 'severe',
      confidence: revenge.trades >= 5 ? 'high' : 'medium',
      title: `AFTER ANY LOSS: 30-minute mandatory cooldown. No exceptions for next 10 sessions.`,
      action: `Set a physical timer. Leave your desk. No screen time. Return only when timer completes.`,
      consequence: `If ignored → ${revenge.losses} revenge trades have already lost ${fmtCurrency(Math.abs(revenge.totalPnl))}.`,
      expectedImprovement: [
        `Eliminates 20–35% of drawdown`,
      ],
    });
  }

  // ── MODERATE COMMANDS ──

  // Worst setup
  const worstSetup = data.setupStats.filter(s => s.setup !== 'Undefined')
    .reduce((a: any, b: any) => a.totalPnl < b.totalPnl ? a : b, null);
  const worstSetupName = worstSetup ? fmt(worstSetup.setup) : null;
  if (worstSetup && worstSetupName && worstSetup.trades >= 3 && worstSetup.totalPnl < 0) {
    candidates.push({
      id: 'worst_setup',
      category: 'strategy',
      severity: 'moderate',
      confidence: worstSetup.trades >= 10 ? 'high' : 'medium',
      title: `PAUSE "${worstSetupName}" setup for next 10 trades.`,
      action: `Remove it from your setup list. Review entries for timing errors before reconsidering.`,
      consequence: `If ignored → ${fmtCurrency(Math.abs(worstSetup.totalPnl))} in losses per 10 trades continues.`,
      expectedImprovement: [
        `Overall WR improves by 5–15%`,
      ],
    });
  }

  // FOMO
  const fomo = data.emotionStats.find(e => e.emotion === 'FOMO');
  if (fomo && fomo.losses >= 2) {
    candidates.push({
      id: 'fomo',
      category: 'psychology',
      severity: 'moderate',
      confidence: fomo.trades >= 5 ? 'high' : 'medium',
      title: `If setup doesn't match ALL criteria → SKIP the trade.`,
      action: `Write your entry checklist. No trade without every box checked.`,
      consequence: `If ignored → ${fmtCurrency(Math.abs(fomo.totalPnl))} lost on impulsive entries repeats.`,
      expectedImprovement: [
        `Win rate improves by 5–10%`,
      ],
    });
  }

  // ── MINOR COMMANDS ──

  // Worst day
  const worstDay = data.dayStats.length >= 3
    ? data.dayStats.reduce((a, b) => a.totalPnl < b.totalPnl ? a : b)
    : null;
  const worstDayName = worstDay ? fmt(worstDay.day) : null;
  if (worstDay && worstDayName && worstDay.totalPnl < -1000 && worstDay.trades >= 3) {
    candidates.push({
      id: 'worst_day',
      category: 'timing',
      severity: 'minor',
      confidence: worstDay.trades >= 5 ? 'high' : 'medium',
      title: `NO TRADING on ${worstDayName}s for next 5 sessions.`,
      action: `Mark ${worstDayName} as OFF on your calendar. Use the day for chart review only.`,
      consequence: `If ignored → ${fmtCurrency(Math.abs(worstDay.totalPnl))} lost per ${worstDayName}.`,
      expectedImprovement: [
        `Weekly PnL improves by ${fmtCurrency(Math.round(Math.abs(worstDay.totalPnl) * 0.7))}`,
      ],
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
      confidence: bestDay.trades >= 10 ? 'high' : 'medium',
      title: `On ${bestDayName}s: A+ setups only. Maximum conviction sizing.`,
      action: `Schedule your best setups for ${bestDayName}s. Skip marginal entries.`,
      consequence: `If ignored → you're wasting your edge day on subpar trades.`,
      expectedImprovement: [
        `${bestDayName} WR improves by ${Math.round(bestDay.winRate - data.winRate)}–${Math.round((bestDay.winRate - data.winRate) * 1.5)}%`,
      ],
    });
  }

  // ── SELECT TOP 3 (one per severity level max) ──
  const severes = candidates.filter(i => i.severity === 'severe').sort((a, b) => {
    const order: Record<string, number> = { discipline: 0, risk: 1, psychology: 2, strategy: 3, timing: 4 };
    return (order[a.category] || 3) - (order[b.category] || 3);
  });
  const moderates = candidates.filter(i => i.severity === 'moderate');
  const minors = candidates.filter(i => i.severity === 'minor');

  const insights: Insight[] = [];
  if (severes.length > 0) insights.push(severes[0]);
  if (moderates.length > 0) insights.push(moderates[0]);
  if (minors.length > 0) insights.push(minors[0]);

  // ── BIGGEST LEAK (deduplicated) ──
  const leak = detectLeak(data, leakRuleIds, insights);

  // ── RISK OF RUIN with reasons ──
  const riskOfRuin = assessRiskOfRuin(data);

  // ── PROGRESSION (fixed logic) ──
  const progression = assessProgression(data);

  // ── DECISION PLAN ──
  const decisionPlan = buildDecisionPlan(data, leak, insights, worstDayName, bestDayName);

  // ── QUALITY ENFORCEMENT ──
  const quality = assessQuality(data);

  // ── DAY CONTROL ──
  const dayControl: DayControl = {
    avoidDays: worstDayName && worstDay && worstDay.totalPnl < -1000 && worstDay.trades >= 3 ? [worstDayName] : [],
    focusDays: bestDayName && bestDay && bestDay.winRate >= 60 && bestDay.trades >= 3 ? [bestDayName] : [],
    rules: [],
  };
  if (dayControl.avoidDays.length > 0) {
    dayControl.rules.push({
      rule: `No trading on ${dayControl.avoidDays.join(' or ')} for next 5 sessions`,
      reason: `${dayControl.avoidDays} has lowest win rate and highest losses`,
    });
  }
  if (dayControl.focusDays.length > 0) {
    dayControl.rules.push({
      rule: `A+ setups only on ${dayControl.focusDays.join(' and ')}`,
      reason: `${dayControl.focusDays} has highest win rate`,
    });
  }

  return { insights, leak, riskOfRuin, progression, decisionPlan, quality, dayControl };
}

function detectLeak(data: AnalyticsResult, _usedRuleIds: Set<string>, existingInsights: Insight[]): LeakDetection | null {
  // Don't duplicate what's already a severe insight
  const topViolation = data.ruleViolations[0];
  const hasRuleInsight = existingInsights.some(i => i.id === 'rule_violation');

  if (!hasRuleInsight && topViolation && data.ruleAdherenceRate < 60) {
    const name = fmt(topViolation.name) || 'Core rules';
    return {
      title: 'Rule Violations',
      description: `Breaking "${name}" in ${topViolation.rate}% of trades.`,
      fixImpact: [`Reducing violations by 50% cuts losses by 20–30%`],
      rule: `FOR NEXT 5 SESSIONS: ${name} is mandatory. Zero exceptions.`,
    };
  }

  const revenge = data.emotionStats.find(e => e.emotion === 'Revenge');
  const hasRevengeInsight = existingInsights.some(i => i.id === 'revenge');
  if (!hasRevengeInsight && revenge && revenge.totalPnl < 0) {
    return {
      title: 'Revenge Trading',
      description: `${fmtCurrency(revenge.totalPnl)} lost. ${revenge.losses} revenge trades.`,
      fixImpact: [`Eliminating revenge saves ${fmtCurrency(Math.abs(revenge.totalPnl))}`],
      rule: 'After any loss: 30-minute cooldown. No exceptions.',
    };
  }

  return null;
}

function assessRiskOfRuin(data: AnalyticsResult): RiskOfRuin {
  if (data.totalTrades < 5) return { level: 'low', description: 'Insufficient data.', reasons: [] };

  const reasons: string[] = [];
  let score = 0;

  if (data.maxDrawdownPct > 20) { score += 3; reasons.push(`Drawdown at ${data.maxDrawdownPct}%`); }
  else if (data.maxDrawdownPct > 10) { score += 2; reasons.push(`Drawdown at ${data.maxDrawdownPct}%`); }
  else if (data.maxDrawdownPct > 5) { score += 1; reasons.push(`Drawdown at ${data.maxDrawdownPct}%`); }

  if (data.expectancy < -500) { score += 3; reasons.push(`Negative expectancy of ${fmtCurrency(data.expectancy)}/trade`); }
  else if (data.expectancy < 0) { score += 2; reasons.push(`Negative expectancy of ${fmtCurrency(data.expectancy)}/trade`); }
  else if (data.expectancy < 200) { score += 1; reasons.push(`Low expectancy of ${fmtCurrency(data.expectancy)}/trade`); }

  if (data.ruleViolations.length > 0 && data.ruleAdherenceRate < 50) {
    score += 3;
    reasons.push(`${data.ruleViolations[0].name} violated in ${data.ruleViolations[0].rate}% of trades`);
  } else if (data.ruleAdherenceRate < 70) {
    score += 1;
    reasons.push(`Rule adherence at ${data.ruleAdherenceRate}%`);
  }

  let level: 'low' | 'medium' | 'high';
  let description: string;

  if (score >= 7) {
    level = 'high';
    description = 'High risk of significant capital loss. Reduce position size immediately.';
  } else if (score >= 4) {
    level = 'medium';
    description = 'Moderate risk. Tighten rules and reduce position sizes.';
  } else {
    level = 'low';
    description = 'Risk is manageable. Maintain current discipline.';
  }

  return { level, description, reasons };
}

function assessProgression(data: AnalyticsResult): Progression {
  const sorted = [...data.equityCurve].slice(1);
  if (sorted.length < 7) {
    return {
      direction: 'stagnant-negative',
      description: 'Need at least 7 trades for trend analysis.',
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
        description: `System is recovering but still negative (₹${data.expectancy}/trade). Last 7: ${fmtCurrency(last7Pnl)} vs previous ${fmtCurrency(prev7Pnl)}. Keep refining.`,
        last7Pnl, prev7Pnl,
      };
    }
    return {
      direction: 'stagnant-negative',
      description: `Your system has negative expectancy (₹${data.expectancy}/trade). You are losing money over time. Last 7: ${fmtCurrency(last7Pnl)}. This is not sustainable.`,
      last7Pnl, prev7Pnl,
    };
  }

  // Positive expectancy
  if (pnlDiff > 2000 && wrDiff > 5) {
    return {
      direction: 'improving',
      description: `Trending up. Last 7: ${fmtCurrency(last7Pnl)} vs previous ${fmtCurrency(prev7Pnl)}. Edge is strengthening.`,
      last7Pnl, prev7Pnl,
    };
  }

  if (pnlDiff < -2000 && wrDiff < -5) {
    return {
      direction: 'declining',
      description: `Performance declining. Last 7: ${fmtCurrency(last7Pnl)} vs previous ${fmtCurrency(prev7Pnl)}. Review what changed.`,
      last7Pnl, prev7Pnl,
    };
  }

  return {
    direction: 'stable-profitable',
    description: `Consistent performance. Last 7: ${fmtCurrency(last7Pnl)} (${last7WR}% WR). Edge is holding steady.`,
    last7Pnl, prev7Pnl,
  };
}

function buildDecisionPlan(
  data: AnalyticsResult,
  leak: LeakDetection | null,
  insights: Insight[],
  worstDayName: string | null,
  bestDayName: string | null
): DecisionPlan {
  const rules: Array<{ rule: string; reason: string; consequence: string }> = [];

  // From leak
  if (leak?.rule) {
    rules.push({ rule: leak.rule, reason: leak.description, consequence: 'Continued capital erosion.' });
  }

  // Day-based hard rules
  if (worstDayName) {
    rules.push({
      rule: `No trading on ${worstDayName}s for next 5 sessions`,
      reason: `Highest losses and lowest win rate`,
      consequence: `Continued ${fmtCurrency(Math.abs(
        data.dayStats.find(d => fmt(d.day) === worstDayName)?.totalPnl || 0
      ))} lost per ${worstDayName}.`,
    });
  }

  if (bestDayName) {
    rules.push({
      rule: `A+ setups only on ${bestDayName}s`,
      reason: `Highest win rate and profitability`,
      consequence: `Wasting your best edge day on subpar trades.`,
    });
  }

  // From existing severe insights
  const severeInsight = insights.find(i => i.severity === 'severe');
  if (severeInsight && !rules.some(r => r.rule.toLowerCase().includes(severeInsight.title.toLowerCase().substring(0, 20)))) {
    rules.push({
      rule: severeInsight.title,
      reason: severeInsight.consequence,
      consequence: 'Capital loss continues at current rate.',
    });
  }

  // Fallback defaults
  if (rules.length === 0) {
    rules.push(
      { rule: 'Risk ≤ 1.5% per trade', reason: 'Standard risk management.', consequence: 'Uncontrolled losses if exceeded.' },
      { rule: 'Maximum 3 trades per day', reason: 'Prevents overtrading.', consequence: 'Reduced win rate from marginal entries.' }
    );
  }

  return { title: 'Next 3 Trades: Execution Plan', rules: rules.slice(0, 3) };
}

function assessQuality(data: AnalyticsResult): QualityEnforcement {
  // Simple quality proxy: rule adherence + emotional control
  const emotionalTrades = data.emotionStats
    .filter(e => ['Revenge', 'FOMO', 'Fear', 'Greed'].includes(e.emotion))
    .reduce((s, e) => s + e.trades, 0);
  const emotionalRate = data.totalTrades > 0 ? (emotionalTrades / data.totalTrades) * 100 : 0;

  const score = Math.round(
    data.ruleAdherenceRate * 0.5 + (100 - emotionalRate) * 0.3 + Math.min(100, data.winRate) * 0.2
  );

  if (score < 50) {
    return {
      score,
      message: 'Do not take trades unless setup criteria is fully met.',
      enforce: true,
    };
  }

  if (score < 70) {
    return {
      score,
      message: 'Trade with caution. Double-check setup criteria before every entry.',
      enforce: false,
    };
  }

  return { score, message: 'Quality is strong. Maintain current discipline.', enforce: false };
}

function emptyV5(): InsightsV5Package {
  return {
    insights: [],
    leak: null,
    riskOfRuin: { level: 'low', description: 'No trades yet — no risk.', reasons: [] },
    progression: { direction: 'stagnant-negative', description: 'No data yet.', last7Pnl: 0, prev7Pnl: 0 },
    decisionPlan: { title: 'Execution Plan', rules: [] },
    quality: { score: 0, message: 'Log trades to measure quality.', enforce: false },
    dayControl: { avoidDays: [], focusDays: [], rules: [] },
  };
}
