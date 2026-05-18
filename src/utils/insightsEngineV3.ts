/**
 * Insights Engine v4 — Fixed with safe formatters.
 * No [object Object] anywhere. All values extracted via fmt().
 */

import { AnalyticsResult } from './analyticsEngine';
import { fmt, fmtCurrency, fmtPct, fmtPnl } from './formatters';

export interface Insight {
  id: string;
  category: 'discipline' | 'risk' | 'psychology' | 'strategy' | 'timing';
  severity: 'critical' | 'improvement' | 'edge';
  impactScore: number;
  confidence: 'low' | 'medium' | 'high';
  title: string;
  problem: string;
  cause: string;
  action: string;
  expectedImprovement: string[];
}

export interface LeakDetection {
  title: string;
  description: string;
  fixImpact: string[];
}

export interface RiskOfRuin {
  level: 'low' | 'medium' | 'high';
  description: string;
}

export interface Progression {
  direction: 'improving' | 'declining' | 'stable';
  description: string;
  last7Pnl: number;
  prev7Pnl: number;
  last7WR: number;
  prev7WR: number;
}

export interface DecisionPlan {
  title: string;
  rules: Array<{ rule: string; reason: string }>;
}

export interface InsightsV3Package {
  insights: Insight[];
  leak: LeakDetection | null;
  riskOfRuin: RiskOfRuin;
  progression: Progression;
  decisionPlan: DecisionPlan;
}

/**
 * Generate v4 insights package with safe formatters.
 */
export function generateInsightsV3(data: AnalyticsResult): InsightsV3Package {
  if (data.totalTrades === 0) return emptyV4();

  const candidates: Insight[] = [];

  // ── CRITICAL INSIGHTS ──

  // 1. Rule adherence failure
  if (data.ruleViolations.length > 0) {
    const top = data.ruleViolations[0];
    const name = fmt(top.name);
    if (name && top.rate > 0) {
      candidates.push({
        id: 'rule_violation',
        category: 'discipline',
        severity: 'critical',
        impactScore: Math.min(98, 90 + Math.round(top.rate * 0.1)),
        confidence: data.totalTrades >= 10 ? 'high' : 'medium',
        title: `${name}: ${top.rate}% violation rate`,
        problem: `${name} is broken in ${top.rate}% of your trades.`,
        cause: `${top.count} documented violations show a pattern of ignoring this rule during live trading.`,
        action: `For your next 5 trades, treat ${name} as non-negotiable. Write it on a sticky note before every session.`,
        expectedImprovement: [
          `Win rate: +${Math.round(top.rate * 0.15)}–${Math.round(top.rate * 0.30)}%`,
          `Max drawdown: reduced by 25–40%`,
          `Consistency score: +10–20 points`,
        ],
      });
    }
  }

  // 2. Revenge trading
  const revenge = data.emotionStats.find(e => e.emotion === 'Revenge');
  if (revenge && revenge.losses >= 2) {
    candidates.push({
      id: 'revenge',
      category: 'psychology',
      severity: 'critical',
      impactScore: 95,
      confidence: revenge.trades >= 5 ? 'high' : 'medium',
      title: `Revenge trades: ${fmtCurrency(revenge.totalPnl)} lost`,
      problem: `${revenge.losses} losing revenge trades at ${fmtPct(revenge.winRate)} win rate vs your ${data.winRate}% average.`,
      cause: 'You trade to recover losses instead of following your plan.',
      action: 'After any loss, step away for 30 minutes. No exceptions.',
      expectedImprovement: [
        `Win rate: +${Math.min(15, Math.round((data.winRate - revenge.winRate) * 0.8))}–${Math.min(20, Math.round((data.winRate - revenge.winRate) * 1.2))}%`,
        `Drawdown: reduced by 20–35%`,
        `Emotional stress: significantly lower`,
      ],
    });
  }

  // 3. Negative expectancy
  if (data.expectancy < 0) {
    candidates.push({
      id: 'negative_expectancy',
      category: 'risk',
      severity: 'critical',
      impactScore: 97,
      confidence: data.totalTrades >= 10 ? 'high' : 'medium',
      title: `Negative expectancy: -${fmtCurrency(data.expectancy)}/trade`,
      problem: `Each trade statistically loses ${fmtCurrency(Math.abs(data.expectancy))} over time.`,
      cause: data.avgLoss > data.avgWin
        ? `Your avg loss (${fmtCurrency(data.avgLoss)}) exceeds avg win (${fmtCurrency(data.avgWin)}).`
        : `Win rate of ${data.winRate}% is too low given your R:R ratio.`,
      action: 'Stop new trades. Review your last 10 losses — eliminate the worst setup entirely.',
      expectedImprovement: [
        `Turning expectancy positive flips your entire PnL trajectory`,
        `Win rate: +5–15% after removing worst setup`,
        `Risk of ruin: eliminated entirely`,
      ],
    });
  }

  // 4. Excessive drawdown
  if (data.maxDrawdownPct > 10) {
    candidates.push({
      id: 'drawdown',
      category: 'risk',
      severity: 'critical',
      impactScore: Math.min(92, 80 + Math.round(data.maxDrawdownPct * 1.5)),
      confidence: 'high',
      title: `Drawdown: ${data.maxDrawdownPct}% — risk controls failing`,
      problem: `Account dropped ${data.maxDrawdownPct}% from peak.`,
      cause: 'Oversized positions or lack of stop loss during losing periods.',
      action: 'Cut position size by 50% for next 5 trades. Enforce daily loss limit.',
      expectedImprovement: [
        `Future drawdowns: capped at 40–50% of current`,
        `Psychological recovery: 2–3x faster`,
        `PnL stability: dramatically improved`,
      ],
    });
  }

  // ── IMPROVEMENT INSIGHTS ──

  // 5. Worst setup
  const worstSetup = data.setupStats.filter(s => s.setup !== 'Undefined')
    .reduce((a: any, b: any) => a.totalPnl < b.totalPnl ? a : b, null);
  if (worstSetup && worstSetup.trades >= 3 && worstSetup.totalPnl < 0) {
    const setupName = fmt(worstSetup.setup);
    if (setupName) {
      candidates.push({
        id: 'worst_setup',
        category: 'strategy',
        severity: 'improvement',
        impactScore: 72,
        confidence: worstSetup.trades >= 10 ? 'high' : 'medium',
        title: `"${setupName}" setup: ${fmtCurrency(Math.abs(worstSetup.totalPnl))} lost`,
        problem: `Only ${fmtPct(worstSetup.winRate)} win rate across ${worstSetup.trades} trades.`,
        cause: 'This setup either doesn\'t fit current market conditions or execution needs work.',
        action: 'Pause this setup for 10 trades. Review entries for timing errors.',
        expectedImprovement: [
          `Overall WR: +${Math.min(10, Math.round(worstSetup.winRate * 0.3))}–${Math.min(15, Math.round(worstSetup.winRate * 0.5))}%`,
          `Saved losses: ${fmtCurrency(Math.abs(worstSetup.totalPnl))} per 10 trades`,
        ],
      });
    }
  }

  // 6. FOMO trades
  const fomo = data.emotionStats.find(e => e.emotion === 'FOMO');
  if (fomo && fomo.losses >= 2) {
    candidates.push({
      id: 'fomo',
      category: 'psychology',
      severity: 'improvement',
      impactScore: 68,
      confidence: fomo.trades >= 5 ? 'high' : 'medium',
      title: `FOMO entries: ${fmtPct(fomo.winRate)} WR vs ${data.winRate}% average`,
      problem: `${fmtCurrency(fomo.totalPnl)} lost on impulsive entries.`,
      cause: 'Jumping into moves without waiting for proper setups.',
      action: 'If the trade doesn\'t match ALL criteria, skip it. No exceptions.',
      expectedImprovement: [
        `Win rate: +${Math.min(8, Math.round((data.winRate - fomo.winRate) * 0.6))}–${Math.min(12, Math.round((data.winRate - fomo.winRate) * 0.9))}%`,
        `Fewer losing trades: -${fomo.losses} per period`,
      ],
    });
  }

  // 7. Worst trading day
  if (data.dayStats.length >= 3) {
    const worstDay = data.dayStats.reduce((a, b) => a.totalPnl < b.totalPnl ? a : b);
    const dayName = fmt(worstDay.day);
    if (dayName && worstDay.totalPnl < -1000 && worstDay.trades >= 3) {
      candidates.push({
        id: 'worst_day',
        category: 'timing',
        severity: 'improvement',
        impactScore: 58,
        confidence: worstDay.trades >= 5 ? 'high' : 'medium',
        title: `${dayName}s cost ${fmtCurrency(worstDay.totalPnl)}`,
        problem: `${dayName} has ${fmtPct(worstDay.winRate)} win rate — your worst day.`,
        cause: 'End-of-week fatigue, reduced liquidity, or emotional exhaustion.',
        action: `Skip trading on ${dayName}s, or limit yourself to 1 trade with 50% position size.`,
        expectedImprovement: [
          `Weekly PnL: +${fmtCurrency(Math.round(Math.abs(worstDay.totalPnl) * 0.6))}–${fmtCurrency(Math.round(Math.abs(worstDay.totalPnl) * 0.9))}`,
        ],
      });
    }
  }

  // ── EDGE INSIGHTS ──

  // 8. Best emotion
  const bestEmotion = data.emotionStats.find(e => e.winRate >= 60 && e.trades >= 3 && e.totalPnl > 0);
  if (bestEmotion) {
    const emoName = fmt(bestEmotion.emotion);
    if (emoName) {
      candidates.push({
        id: 'edge_emotion',
        category: 'psychology',
        severity: 'edge',
        impactScore: 55,
        confidence: bestEmotion.trades >= 10 ? 'high' : 'medium',
        title: `"${emoName}" trades: ${fmtPct(bestEmotion.winRate)} WR, ${fmtCurrency(bestEmotion.totalPnl)}`,
        problem: '',
        cause: '',
        action: 'Amplify this state. Use a pre-trade routine: 2-min breathing, checklist review, then execute.',
        expectedImprovement: [
          `Trade more in this emotional state for +${Math.round(bestEmotion.winRate - data.winRate)}–${Math.round((bestEmotion.winRate - data.winRate) * 1.5)}% WR improvement`,
        ],
      });
    }
  }

  // 9. Best setup
  const bestSetup = data.setupStats.find(s => s.setup !== 'Undefined' && s.winRate >= 60 && s.trades >= 3);
  if (bestSetup) {
    const setupName = fmt(bestSetup.setup);
    if (setupName) {
      candidates.push({
        id: 'edge_setup',
        category: 'strategy',
        severity: 'edge',
        impactScore: 50,
        confidence: bestSetup.trades >= 10 ? 'high' : 'medium',
        title: `"${setupName}": ${fmtPct(bestSetup.winRate)} WR, ${fmtCurrency(bestSetup.totalPnl)}`,
        problem: '',
        cause: '',
        action: `Allocate 60%+ of trades to ${setupName} setups. Drop the worst-performing setup to increase overall WR.`,
        expectedImprovement: [
          `Overall WR: +${Math.round(bestSetup.winRate - data.winRate)}–${Math.round((bestSetup.winRate - data.winRate) * 1.3)}%`,
        ],
      });
    }
  }

  // 10. Best day
  if (data.dayStats.length >= 3) {
    const bestDay = data.dayStats.reduce((a, b) => a.totalPnl > b.totalPnl ? a : b);
    const dayName = fmt(bestDay.day);
    if (dayName && bestDay.winRate >= 60 && bestDay.trades >= 3) {
      candidates.push({
        id: 'edge_day',
        category: 'timing',
        severity: 'edge',
        impactScore: 45,
        confidence: bestDay.trades >= 10 ? 'high' : 'medium',
        title: `${dayName}s: ${fmtPct(bestDay.winRate)} WR, +${fmtCurrency(bestDay.totalPnl)}`,
        problem: '',
        cause: '',
        action: `Schedule your highest-conviction trades on ${dayName}s. Use this day for A+ setups only.`,
        expectedImprovement: [
          `Win rate on this day: +${Math.round(bestDay.winRate - data.winRate)}–${Math.round((bestDay.winRate - data.winRate) * 1.2)}%`,
        ],
      });
    }
  }

  // ── SELECT TOP 3 ──
  const criticals = candidates.filter(i => i.severity === 'critical').sort((a, b) => b.impactScore - a.impactScore);
  const improvements = candidates.filter(i => i.severity === 'improvement').sort((a, b) => b.impactScore - a.impactScore);
  const edges = candidates.filter(i => i.severity === 'edge').sort((a, b) => b.impactScore - a.impactScore);

  const insights: Insight[] = [];
  if (criticals.length > 0) insights.push(criticals[0]);
  if (improvements.length > 0) insights.push(improvements[0]);
  if (edges.length > 0) insights.push(edges[0]);

  // ── BIGGEST LEAK ──
  const leak = detectLeak(data);

  // ── RISK OF RUIN ──
  const riskOfRuin = assessRiskOfRuin(data);

  // ── PROGRESSION ──
  const progression = assessProgression(data);

  // ── DECISION PLAN ──
  const decisionPlan = buildDecisionPlan(data, leak);

  return { insights, leak, riskOfRuin, progression, decisionPlan };
}

function detectLeak(data: AnalyticsResult): LeakDetection | null {
  if (data.ruleViolations.length > 0 && data.ruleAdherenceRate < 60) {
    const top = data.ruleViolations[0];
    const name = fmt(top.name);
    if (!name) return null;
    return {
      title: 'Rule Violations',
      description: `Breaking "${name}" in ${top.rate}% of trades is your #1 loss driver.`,
      fixImpact: [
        `Reducing violations by 50% cuts losses by 20–30%`,
        `Consistency score improves 15–25 points`,
      ],
    };
  }

  const revenge = data.emotionStats.find(e => e.emotion === 'Revenge');
  if (revenge && revenge.totalPnl < 0) {
    return {
      title: 'Revenge Trading',
      description: `Revenge trades account for ${fmtCurrency(revenge.totalPnl)} in losses.`,
      fixImpact: [
        `Eliminating revenge trades saves ${fmtCurrency(Math.abs(revenge.totalPnl))}`,
        `Drawdown reduced by 20–35%`,
      ],
    };
  }

  if (data.expectancy < 0) {
    return {
      title: 'Negative Expectancy',
      description: `Each trade loses ${fmtCurrency(Math.abs(data.expectancy))} on average.`,
      fixImpact: [
        `Turning positive flips your entire PnL`,
        `Win rate improvement: +5–15%`,
      ],
    };
  }

  if (data.maxDrawdownPct > 15) {
    return {
      title: 'Uncontrolled Drawdown',
      description: `Account dropped ${data.maxDrawdownPct}% from peak.`,
      fixImpact: [
        `Capping risk cuts future DD by 40–50%`,
        `Psychological recovery 2–3x faster`,
      ],
    };
  }

  return null;
}

function assessRiskOfRuin(data: AnalyticsResult): RiskOfRuin {
  if (data.totalTrades < 5) return { level: 'low', description: 'Insufficient data for assessment.' };

  let score = 0;
  if (data.maxDrawdownPct > 20) score += 3;
  else if (data.maxDrawdownPct > 10) score += 2;
  else if (data.maxDrawdownPct > 5) score += 1;

  if (data.expectancy < -500) score += 3;
  else if (data.expectancy < 0) score += 2;
  else if (data.expectancy < 200) score += 1;

  if (data.consistencyScore < 40) score += 3;
  else if (data.consistencyScore < 60) score += 2;
  else if (data.consistencyScore < 75) score += 1;

  if (score >= 7) return { level: 'high', description: 'High risk of significant capital loss. Reduce size immediately.' };
  if (score >= 4) return { level: 'medium', description: 'Moderate risk. Tighten rules and reduce position sizes.' };
  return { level: 'low', description: 'Risk is manageable. Stay disciplined.' };
}

function assessProgression(data: AnalyticsResult): Progression {
  const sorted = [...data.equityCurve].slice(1);
  if (sorted.length < 7) {
    return { direction: 'stable', description: 'Need at least 7 trades for trend analysis.', last7Pnl: 0, prev7Pnl: 0, last7WR: 0, prev7WR: 0 };
  }

  const netPnls = sorted.map(e => e.netPnl || 0);
  const recent7 = netPnls.slice(-7);
  const prev7 = netPnls.slice(-14, -7);

  const last7Pnl = recent7.reduce((s, v) => s + v, 0);
  const prev7Pnl = prev7.length > 0 ? prev7.reduce((s, v) => s + v, 0) : 0;

  const last7Wins = recent7.filter(v => v > 0).length;
  const prev7Wins = prev7.filter(v => v > 0).length;
  const last7WR = Math.round((last7Wins / 7) * 100);
  const prev7WR = prev7.length > 0 ? Math.round((prev7Wins / prev7.length) * 100) : 0;

  const pnlDiff = last7Pnl - prev7Pnl;
  const wrDiff = last7WR - prev7WR;

  let direction: 'improving' | 'declining' | 'stable';
  let description: string;

  if (pnlDiff > 2000 && wrDiff > 5) {
    direction = 'improving';
    description = `Last 7 trades outperformed previous 7: ${fmtPnl(pnlDiff)} PnL difference, ${Math.abs(wrDiff)}pp higher WR.`;
  } else if (pnlDiff < -2000 && wrDiff < -5) {
    direction = 'declining';
    description = `Last 7 trades underperformed: ${fmtPnl(pnlDiff)} PnL difference, ${Math.abs(wrDiff)}pp lower WR. Review recent changes.`;
  } else {
    direction = 'stable';
    description = `Performance is consistent. Last 7: ${fmtPnl(last7Pnl)}, ${last7WR}% WR. Previous: ${fmtPnl(prev7Pnl)}, ${prev7WR}% WR.`;
  }

  return { direction, description, last7Pnl, prev7Pnl, last7WR, prev7WR };
}

function buildDecisionPlan(data: AnalyticsResult, leak: LeakDetection | null): DecisionPlan {
  const rules: Array<{ rule: string; reason: string }> = [];

  if (leak) {
    if (leak.title === 'Rule Violations') {
      const topRule = data.ruleViolations[0];
      const name = fmt(topRule.name);
      if (name) {
        rules.push({
          rule: 'Enforce mandatory stop loss before every entry',
          reason: `${topRule.rate}% violation rate on ${name} is costing you money.`,
        });
      }
      const overtrade = data.ruleViolations.find(v => v.name.toLowerCase().includes('max') || v.name.toLowerCase().includes('over'));
      if (overtrade) {
        rules.push({
          rule: 'Maximum 2 trades per day (not 3)',
          reason: `Exceeded limit ${overtrade.count} times. Forces only A+ setups.`,
        });
      }
    } else if (leak.title === 'Revenge Trading') {
      rules.push({
        rule: 'After any loss: 30-minute cooldown before next trade',
        reason: 'Revenge trades lose at below-average rates. This break prevents emotional escalation.',
      });
      rules.push({
        rule: 'Maximum 2 trades per day',
        reason: 'Reduces opportunity for revenge trading after first loss.',
      });
    } else if (leak.title === 'Negative Expectancy') {
      const worst = data.setupStats.filter(s => s.setup !== 'Undefined').reduce((a: any, b: any) => a.totalPnl < b.totalPnl ? a : b, null);
      if (worst && worst.setup !== 'Undefined') {
        const setupName = fmt(worst.setup);
        if (setupName) {
          rules.push({
            rule: `Eliminate "${setupName}" setup entirely for next 10 trades`,
            reason: `This setup lost ${fmtCurrency(Math.abs(worst.totalPnl))} at ${fmtPct(worst.winRate)} WR.`,
          });
        }
      }
      rules.push({
        rule: 'Risk ≤ 1% per trade for next 10 trades',
        reason: 'Reducing risk while you fix expectancy protects capital during the transition.',
      });
    } else if (leak.title === 'Uncontrolled Drawdown') {
      rules.push({
        rule: 'Cut position size to 50% for next 5 trades',
        reason: `Drawdown of ${data.maxDrawdownPct}% exceeds healthy limits. Recovery requires tighter risk.`,
      });
      rules.push({
        rule: 'Daily loss limit: stop trading after 2 consecutive losses',
        reason: 'Prevents further drawdown expansion during losing periods.',
      });
    }
  }

  if (rules.length === 0) {
    rules.push({
      rule: 'Risk ≤ 1.5% per trade',
      reason: 'Standard risk management. Maintain until consistency score exceeds 70.',
    });
    rules.push({
      rule: 'Maximum 3 trades per day',
      reason: 'Prevents overtrading and forces selectivity.',
    });
  }

  return { title: 'Next 3 Trades: Execution Plan', rules: rules.slice(0, 3) };
}

function emptyV4(): InsightsV3Package {
  return {
    insights: [], leak: null,
    riskOfRuin: { level: 'low', description: 'No trades yet — no risk.' },
    progression: { direction: 'stable', description: 'No data yet.', last7Pnl: 0, prev7Pnl: 0, last7WR: 0, prev7WR: 0 },
    decisionPlan: { title: 'Execution Plan', rules: [] },
  };
}
