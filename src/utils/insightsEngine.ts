/**
 * Insights Engine v2
 * Generates unique, prioritized, actionable insights from trading data.
 * Each insight has: problem, cause, action, expected impact, confidence.
 * Deduplication and merging of related insights is built-in.
 */

import { AnalyticsResult } from './analyticsEngine';

export interface InsightAction {
  text: string;
  priority: 'immediate' | 'short-term' | 'ongoing';
}

export interface Insight {
  id: string;
  category: 'discipline' | 'risk' | 'psychology' | 'strategy' | 'timing';
  severity: 'critical' | 'warning' | 'optimization';
  impactScore: number; // 0-100
  confidenceLevel: 'low' | 'medium' | 'high';
  title: string;
  problem: string;
  cause: string;
  action: string;
  expectedImpact: string;
}

export interface ExecutionPlan {
  title: string;
  rules: Array<{ rule: string; reason: string }>;
}

export interface LeakDetection {
  title: string;
  description: string;
  impact: string;
  percentage: number;
}

export interface EdgeDetection {
  title: string;
  description: string;
  metric: string;
  value: string;
}

export interface BehavioralPattern {
  title: string;
  description: string;
  severity: 'critical' | 'warning';
}

export interface InsightsPackage {
  insights: Insight[];
  biggestLeak: LeakDetection | null;
  edge: EdgeDetection | null;
  behavioralPatterns: BehavioralPattern[];
  executionPlan: ExecutionPlan;
  totalScore: number; // 0-100 overall health score
}

/**
 * Main insight generation function.
 * Returns a structured, prioritized, deduplicated insights package.
 */
export function generateInsights(data: AnalyticsResult): InsightsPackage {
  const rawInsights: Insight[] = [];
  const behavioralPatterns: BehavioralPattern[] = [];

  if (data.totalTrades === 0) {
    return {
      insights: [],
      biggestLeak: null,
      edge: null,
      behavioralPatterns: [],
      executionPlan: { title: 'Execution Plan', rules: [] },
      totalScore: 0,
    };
  }

  // ──────────────────────────────────────
  // 1. DISCIPLINE INSIGHTS
  // ──────────────────────────────────────
  if (data.ruleViolations.length > 0 && data.ruleAdherenceRate < 80) {
    const topViolation = data.ruleViolations[0];
    const severity = data.ruleAdherenceRate < 40 ? 'critical' : data.ruleAdherenceRate < 60 ? 'warning' : 'optimization';
    const impactScore = Math.min(100, 95 - data.ruleAdherenceRate);

    rawInsights.push({
      id: 'discipline_adherence',
      category: 'discipline',
      severity,
      impactScore,
      confidenceLevel: data.totalTrades >= 10 ? 'high' : 'medium',
      title: `${topViolation.name} is your weakest discipline area`,
      problem: `${topViolation.name} is violated in ${topViolation.rate}% of trades — the highest violation rate among all rules.`,
      cause: `You have ${topViolation.count} documented violations, indicating a pattern of ignoring this rule during active trading.`,
      action: `For your next 10 trades, enforce ${topViolation.name} as non-negotiable. Use a pre-trade checklist and refuse to enter if this rule is not met.`,
      expectedImpact: `Improving this to 80%+ adherence typically reduces drawdowns by 25–40% and increases consistency score by 15+ points.`,
    });
  }

  if (data.ruleAdherenceRate >= 85) {
    rawInsights.push({
      id: 'discipline_excellent',
      category: 'discipline',
      severity: 'optimization',
      impactScore: 60,
      confidenceLevel: data.totalTrades >= 10 ? 'high' : 'medium',
      title: 'Exceptional rule adherence — maintain the edge',
      problem: null as any,
      cause: null as any,
      action: 'Your discipline is professional-grade. Focus on scaling position sizes and refining edge. Consider adding a 7th rule to push consistency further.',
      expectedImpact: null as any,
    });
  }

  // ──────────────────────────────────────
  // 2. RISK INSIGHTS
  // ──────────────────────────────────────
  if (data.maxDrawdownPct > 10) {
    const severity = data.maxDrawdownPct > 20 ? 'critical' : 'warning';
    rawInsights.push({
      id: 'risk_drawdown',
      category: 'risk',
      severity,
      impactScore: Math.min(100, data.maxDrawdownPct * 4),
      confidenceLevel: 'high',
      title: `Maximum drawdown of ${data.maxDrawdownPct}% requires risk adjustment`,
      problem: `Your account has experienced a ${data.maxDrawdownPct}% drawdown from peak — exceeding healthy limits for sustainable trading.`,
      cause: `This typically results from oversized positions, lack of stop loss, or trading during emotional distress.`,
      action: `Reduce position size to 50% of current levels for the next 5 trades. Implement a daily loss limit of ${data.avgRiskPerTrade ? `₹${(data.avgRiskPerTrade * 2).toLocaleString('en-IN')}` : '2% of capital'}.`,
      expectedImpact: `Capping risk per trade will prevent further drawdown expansion and allow psychological recovery.`,
    });
  }

  if (data.expectancy < 0) {
    rawInsights.push({
      id: 'risk_negative_expectancy',
      category: 'risk',
      severity: 'critical',
      impactScore: 95,
      confidenceLevel: data.totalTrades >= 10 ? 'high' : 'medium',
      title: 'Your system has negative expectancy — stop scaling until fixed',
      problem: `Average expectancy is ₹${data.expectancy} per trade — meaning each trade statistically loses money over time.`,
      cause: `This occurs when losses outweigh wins, either due to poor win rate, small winners, or oversized losses. Your win rate is ${data.winRate}% and avg loss (₹${data.avgLoss.toLocaleString('en-IN')}) ${data.avgLoss > data.avgWin ? 'exceeds' : 'is close to'} your avg win (₹${data.avgWin.toLocaleString('en-IN')}).`,
      action: `Stop taking new trades. Review your last 10 losing trades: identify the common factor (setup, emotion, time of day). Eliminate the worst-performing setup entirely.`,
      expectedImpact: `Fixing expectancy from negative to positive is the single highest-impact change you can make — it transforms your entire PnL trajectory.`,
    });
  } else if (data.expectancy > 100) {
    rawInsights.push({
      id: 'risk_positive_expectancy',
      category: 'risk',
      severity: 'optimization',
      impactScore: 70,
      confidenceLevel: data.totalTrades >= 10 ? 'high' : 'medium',
      title: `Positive expectancy confirmed — you have a statistical edge`,
      problem: null as any,
      cause: null as any,
      action: `Your edge of ₹${data.expectancy}/trade is real. Focus on increasing trade frequency (if setup quality allows) and maintaining discipline. Consider gradually increasing position size by 10% per month.`,
      expectedImpact: null as any,
    });
  }

  // ──────────────────────────────────────
  // 3. PSYCHOLOGY INSIGHTS
  // ──────────────────────────────────────
  const revengeTrades = data.emotionStats.find(e => e.emotion === 'Revenge');
  if (revengeTrades && revengeTrades.losses > 0) {
    rawInsights.push({
      id: 'psych_revenge',
      category: 'psychology',
      severity: revengeTrades.losses >= 3 ? 'critical' : 'warning',
      impactScore: Math.min(100, 80 + revengeTrades.losses * 5),
      confidenceLevel: revengeTrades.trades >= 5 ? 'high' : 'medium',
      title: `Revenge trading is costing you ₹${Math.abs(revengeTrades.totalPnl).toLocaleString('en-IN')}`,
      problem: `You have ${revengeTrades.losses} losing revenge trades out of ${revengeTrades.trades} total (${revengeTrades.winRate}% WR). This is your most destructive emotional pattern.`,
      cause: `Revenge trades typically occur right after a significant loss — the urge to "make it back" overrides discipline and leads to impulsive entries.`,
      action: `Implement a circuit breaker: after ANY loss, step away for 30 minutes minimum. No exceptions. Use a physical checklist before re-entering.`,
      expectedImpact: `Eliminating revenge trades alone can improve your consistency score by 15–25 points and reduce drawdown by 20–30%.`,
    });
  }

  const fomoTrades = data.emotionStats.find(e => e.emotion === 'FOMO');
  if (fomoTrades && fomoTrades.losses > 0) {
    rawInsights.push({
      id: 'psych_fomo',
      category: 'psychology',
      severity: 'warning',
      impactScore: 65,
      confidenceLevel: fomoTrades.trades >= 5 ? 'high' : 'medium',
      title: `FOMO entries have a ${fomoTrades.winRate}% win rate — below your average`,
      problem: `FOMO trades lose money: ₹${Math.abs(fomoTrades.totalPnl).toLocaleString('en-IN')} total with only ${fomoTrades.winRate}% win rate vs your ${data.winRate}% overall.`,
      cause: `FOMO occurs when you see a move without a setup and jump in late — typically at the top of a rally or bottom of a crash.`,
      action: `Write down your entry criteria. If the trade doesn't match ALL criteria, it's not a trade — it's gambling.`,
      expectedImpact: `Filtering out FOMO trades can improve your overall win rate by 5–10 percentage points.`,
    });
  }

  const confidenceTrades = data.emotionStats.find(e => e.emotion === 'Confidence');
  if (confidenceTrades && confidenceTrades.winRate >= 60 && confidenceTrades.totalPnl > 0) {
    rawInsights.push({
      id: 'psych_confidence_edge',
      category: 'psychology',
      severity: 'optimization',
      impactScore: 55,
      confidenceLevel: confidenceTrades.trades >= 5 ? 'high' : 'medium',
      title: `Confidence trades are your psychological edge (${confidenceTrades.winRate}% WR)`,
      problem: null as any,
      cause: null as any,
      action: `You perform significantly better when calm and confident. Consider a pre-trade routine: 2-minute breathing, review checklist, then execute. This amplifies your confidence state.`,
      expectedImpact: null as any,
    });
  }

  // ──────────────────────────────────────
  // 4. STRATEGY INSIGHTS
  // ──────────────────────────────────────
  const definedSetups = data.setupStats.filter(s => s.setup !== 'Undefined');
  if (definedSetups.length >= 2) {
    const best = definedSetups.reduce((a, b) => a.totalPnl > b.totalPnl ? a : b);
    const worst = definedSetups.reduce((a, b) => a.totalPnl < b.totalPnl ? a : b);

    if (best.winRate >= 60 && best.trades >= 3) {
      rawInsights.push({
        id: 'strategy_best',
        category: 'strategy',
        severity: 'optimization',
        impactScore: 50,
        confidenceLevel: best.trades >= 10 ? 'high' : 'medium',
        title: `"${best.setup}" is your highest-performing setup (${best.winRate}% WR)`,
        problem: null as any,
        cause: null as any,
        action: `Allocate 60%+ of your trades to "${best.setup} setups". Reduce or eliminate the lowest-performing setup to increase overall win rate.`,
        expectedImpact: `Focusing on your best setup can increase overall win rate by 8–15% and reduce emotional trading.`,
      });
    }

    if (worst.winRate < 40 && worst.trades >= 3) {
      rawInsights.push({
        id: 'strategy_worst',
        category: 'strategy',
        severity: 'warning',
        impactScore: 70,
        confidenceLevel: worst.trades >= 10 ? 'high' : 'medium',
        title: `"${worst.setup}" setup is losing money — consider dropping it`,
        problem: `"${worst.setup}" has only ${worst.winRate}% win rate and has lost ₹${Math.abs(worst.totalPnl).toLocaleString('en-IN')} across ${worst.trades} trades.`,
        cause: `This setup may not fit current market conditions, or your execution of it needs refinement.`,
        action: `Pause this setup for 10 trades. If you must use it, reduce position size to 50%. Review entries — you may be entering too early or late.`,
        expectedImpact: `Eliminating your worst setup can improve overall win rate by 5–10% and save ₹${Math.abs(worst.totalPnl).toLocaleString('en-IN')} in losses.`,
      });
    }
  }

  // ──────────────────────────────────────
  // 5. TIMING INSIGHTS
  // ──────────────────────────────────────
  if (data.dayStats.length >= 3) {
    const bestDay = data.dayStats.reduce((a, b) => a.totalPnl > b.totalPnl ? a : b);
    const worstDay = data.dayStats.reduce((a, b) => a.totalPnl < b.totalPnl ? a : b);

    if (bestDay.trades >= 3 && bestDay.winRate >= 60) {
      rawInsights.push({
        id: 'timing_best_day',
        category: 'timing',
        severity: 'optimization',
        impactScore: 45,
        confidenceLevel: bestDay.trades >= 10 ? 'high' : 'medium',
        title: `${bestDay} is your best trading day (${bestDay.winRate}% WR, +₹${bestDay.totalPnl.toLocaleString('en-IN')})`,
        problem: null as any,
        cause: null as any,
        action: `Consider scheduling your most important trades on ${bestDay}s. Use this day for your highest-conviction setups.`,
        expectedImpact: null as any,
      });
    }

    if (worstDay.totalPnl < 0 && worstDay.trades >= 3) {
      rawInsights.push({
        id: 'timing_worst_day',
        category: 'timing',
        severity: 'warning',
        impactScore: 60,
        confidenceLevel: worstDay.trades >= 10 ? 'high' : 'medium',
        title: `Avoid trading on ${worstDay}s (${worstDay.winRate}% WR, -₹${Math.abs(worstDay.totalPnl).toLocaleString('en-IN')})`,
        problem: `${worstDay} is consistently your worst day with ${worstDay.winRate}% win rate and ₹${Math.abs(worstDay.totalPnl).toLocaleString('en-IN')} in losses.`,
        cause: `This may be due to end-of-week fatigue, reduced liquidity, or emotional exhaustion after a tough week.`,
        action: `Skip trading entirely on ${worstDay}s, or limit yourself to 1 trade with 50% position size.`,
        expectedImpact: `Eliminating ${worstDay} trading can save ₹${Math.abs(worstDay.totalPnl).toLocaleString('en-IN')} per week in losses.`,
      });
    }
  }

  // ──────────────────────────────────────
  // 6. STREAK & BEHAVIORAL PATTERNS
  // ──────────────────────────────────────
  if (data.longestLossStreak >= 4) {
    behavioralPatterns.push({
      title: 'Extended losing streak detected',
      description: `Your longest losing streak was ${data.longestLossStreak} trades. After 3+ losses, traders tend to revenge trade, increase size, and deviate from their plan — compounding the damage.`,
      severity: 'critical',
    });
  }

  // Check if emotional trades increase after losses
  if (data.totalTrades >= 10) {
    const revengeCount = data.emotionStats.find(e => e.emotion === 'Revenge')?.trades || 0;
    const revengeRate = (revengeCount / data.totalTrades) * 100;
    if (revengeRate > 15) {
      behavioralPatterns.push({
        title: 'Emotional escalation pattern',
        description: `${revengeRate.toFixed(0)}% of your trades are revenge trades — this suggests you're not recovering properly from losses. You enter revenge mode instead of reviewing and recalibrating.`,
        severity: 'critical',
      });
    }
  }

  // Check if losses increase in size (risk escalation)
  if (data.totalTrades >= 6) {
    const sorted = [...data.equityCurve].slice(1);
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const avgPnlFirst = firstHalf.length > 0 ? firstHalf.reduce((s, e) => s + e.netPnl, 0) / firstHalf.length : 0;
    const avgPnlSecond = secondHalf.length > 0 ? secondHalf.reduce((s, e) => s + e.netPnl, 0) / secondHalf.length : 0;

    if (avgPnlSecond < avgPnlFirst && avgPnlSecond < 0) {
      behavioralPatterns.push({
        title: 'Performance degradation over time',
        description: `Your recent average PnL (₹${Math.round(avgPnlSecond).toLocaleString('en-IN')}) is significantly worse than your earlier average (₹${Math.round(avgPnlFirst).toLocaleString('en-IN')}). This suggests deteriorating discipline or changing market conditions.`,
        severity: 'warning',
      });
    }
  }

  // ──────────────────────────────────────
  // DEDUPLICATION & PRIORITIZATION
  // ──────────────────────────────────────

  // Merge insights with same category into stronger single insight
  const merged = deduplicateInsights(rawInsights);

  // Sort by impactScore descending, cap at 8
  merged.sort((a, b) => b.impactScore - a.impactScore);
  const finalInsights = merged.slice(0, 8);

  // ──────────────────────────────────────
  // BIGGEST LEAK DETECTION
  // ──────────────────────────────────────
  const biggestLeak = detectBiggestLeak(data, finalInsights);

  // ──────────────────────────────────────
  // EDGE DETECTION
  // ──────────────────────────────────────
  const edge = detectEdge(data);

  // ──────────────────────────────────────
  // EXECUTION PLAN
  // ──────────────────────────────────────
  const executionPlan = generateExecutionPlan(data, finalInsights);

  // ──────────────────────────────────────
  // OVERALL SCORE
  // ──────────────────────────────────────
  const totalScore = Math.round(
    data.disciplineScore * 0.30 +
    data.riskScore * 0.30 +
    data.executionScore * 0.20 +
    Math.min(100, data.winRate) * 0.20
  );

  return {
    insights: finalInsights,
    biggestLeak,
    edge,
    behavioralPatterns,
    executionPlan,
    totalScore,
  };
}

/**
 * Remove redundant insights by merging those with overlapping causes/actions.
 */
function deduplicateInsights(insights: Insight[]): Insight[] {
  const categoryMap: Record<string, Insight> = {};

  for (const insight of insights) {
    const key = `${insight.category}_${insight.severity}`;

    if (!categoryMap[key]) {
      categoryMap[key] = insight;
    } else {
      // Keep the one with higher impactScore, merge actions if different
      const existing = categoryMap[key];
      if (insight.impactScore > existing.impactScore) {
        categoryMap[key] = insight;
      } else if (insight.action !== existing.action && insight.impactScore > existing.impactScore * 0.7) {
        // Merge action text
        existing.action += ` Additionally: ${insight.action}`;
      }
    }
  }

  return Object.values(categoryMap);
}

/**
 * Detect the #1 source of losses.
 */
function detectBiggestLeak(
  data: AnalyticsResult,
  _insights: Insight[]
): LeakDetection | null {
  if (data.totalTrades === 0) return null;

  const totalLosses = Math.abs(
    data.emotionStats
      .filter(e => e.totalPnl < 0)
      .reduce((sum, e) => sum + e.totalPnl, 0)
  );

  if (totalLosses === 0) return null;

  // Check rule violations
  if (data.ruleViolations.length > 0) {
    const top = data.ruleViolations[0];
    return {
      title: 'Rule Violations',
      description: `Violating "${top.name}" is your #1 loss driver. ${top.rate}% violation rate across all trades.`,
      impact: `Fixing this alone can reduce losses by ${Math.min(78, Math.round(top.rate * 0.8))}%`,
      percentage: Math.min(78, Math.round(top.rate * 0.8)),
    };
  }

  // Check emotional trading
  const revenge = data.emotionStats.find(e => e.emotion === 'Revenge');
  if (revenge && revenge.totalPnl < 0) {
    const pctOfLosses = Math.round((Math.abs(revenge.totalPnl) / totalLosses) * 100);
    return {
      title: 'Revenge Trading',
      description: `Revenge trades account for ₹${Math.abs(revenge.totalPnl).toLocaleString('en-IN')} in losses (${pctOfLosses}% of total losses).`,
      impact: `Eliminating revenge trades can improve consistency by ${Math.round(pctOfLosses * 0.3)} points.`,
      percentage: pctOfLosses,
    };
  }

  return null;
}

/**
 * Detect what the trader does BEST.
 */
function detectEdge(data: AnalyticsResult): EdgeDetection | null {
  if (data.totalTrades < 3) return null;

  // Best emotion
  const bestEmotion = data.emotionStats.find(e => e.winRate >= 60 && e.trades >= 3 && e.totalPnl > 0);
  if (bestEmotion) {
    return {
      title: 'Psychological Edge',
      description: `"${bestEmotion.emotion}" trades win ${bestEmotion.winRate}% of the time with ₹${bestEmotion.totalPnl.toLocaleString('en-IN')} total profit.`,
      metric: 'Win Rate',
      value: `${bestEmotion.winRate}%`,
    };
  }

  // Best day
  const bestDay = data.dayStats.find(d => d.winRate >= 60 && d.trades >= 3);
  if (bestDay) {
    return {
      title: 'Timing Edge',
      description: `You perform best on ${bestDay}s with ${bestDay.winRate}% win rate and ₹${bestDay.totalPnl.toLocaleString('en-IN')} profit.`,
      metric: 'Day Win Rate',
      value: `${bestDay.winRate}%`,
    };
  }

  // Best setup
  const bestSetup = data.setupStats.find(s => s.setup !== 'Undefined' && s.winRate >= 60 && s.trades >= 3);
  if (bestSetup) {
    return {
      title: 'Strategy Edge',
      description: `"${bestSetup.setup}" setups win ${bestSetup.winRate}% of the time with ₹${bestSetup.totalPnl.toLocaleString('en-IN')} profit.`,
      metric: 'Setup Win Rate',
      value: `${bestSetup.winRate}%`,
    };
  }

  // Positive expectancy
  if (data.expectancy > 0) {
    return {
      title: 'Statistical Edge',
      description: `Your expectancy is ₹${data.expectancy}/trade — meaning your system is profitable over the long run.`,
      metric: 'Expectancy',
      value: `₹${data.expectancy}`,
    };
  }

  return null;
}

/**
 * Generate a specific "Next 5 Trades" execution plan.
 */
function generateExecutionPlan(
  data: AnalyticsResult,
  _insights: Insight[]
): ExecutionPlan {
  const rules: Array<{ rule: string; reason: string }> = [];

  // Always include core risk rule
  const riskRule = data.ruleViolations.find(v => v.name.toLowerCase().includes('risk'));
  if (riskRule) {
    rules.push({
      rule: `Risk ≤ ${riskRule.rate > 50 ? '1%' : '1.5%'} per trade for next 5 trades`,
      reason: `You've violated this rule ${riskRule.count} times (${riskRule.rate}% violation rate). Tighter risk will protect capital while you rebuild discipline.`,
    });
  } else {
    rules.push({
      rule: 'Risk ≤ 1.5% per trade for next 5 trades',
      reason: 'Standard risk management. Maintain this until consistency score exceeds 70.',
    });
  }

  // Trade count limit if overtrading detected
  const overtradeRule = data.ruleViolations.find(v => v.name.toLowerCase().includes('max') || v.name.toLowerCase().includes('over'));
  if (overtradeRule) {
    rules.push({
      rule: 'Maximum 2 trades per day (not 3)',
      reason: `You've exceeded your trade limit ${overtradeRule.count} times. Reducing from 3 to 2 forces you to take only A+ setups.`,
    });
  }

  // Stop loss enforcement
  const slRule = data.ruleViolations.find(v => v.name.toLowerCase().includes('stop'));
  if (slRule) {
    rules.push({
      rule: 'NO entry without pre-defined stop loss',
      reason: `Stop loss is violated in ${slRule.rate}% of trades. Write SL in your journal BEFORE entering the trade.`,
    });
  }

  // Emotional circuit breaker
  if (data.emotionStats.find(e => e.emotion === 'Revenge' && e.losses > 0)) {
    rules.push({
      rule: 'After 1 loss: 30-minute cooldown before next trade',
      reason: 'Revenge trading is your biggest psychological leak. This forced break prevents emotional escalation.',
    });
  }

  // Setup filter
  const worstSetup = data.setupStats.filter(s => s.setup !== 'Undefined').reduce((a, b) => a.totalPnl < b.totalPnl ? a : b, data.setupStats[0]);
  if (worstSetup && worstSetup.totalPnl < 0 && worstSetup.trades >= 3) {
    rules.push({
      rule: `Avoid "${worstSetup.setup}" setups for next 5 trades`,
      reason: `This setup has only ${worstSetup.winRate}% win rate and lost ₹${Math.abs(worstSetup.totalPnl).toLocaleString('en-IN')}. Trade only your best setups temporarily.`,
    });
  }

  // Day restriction
  const worstDay = data.dayStats.reduce((a, b) => a.totalPnl < b.totalPnl ? a : b, data.dayStats[0]);
  if (worstDay && worstDay.totalPnl < -1000 && worstDay.trades >= 3) {
    rules.push({
      rule: `No trading on ${worstDay.day}s this week`,
      reason: `${worstDay.day} is your worst day with ${worstDay.winRate}% win rate and ₹${Math.abs(worstDay.totalPnl).toLocaleString('en-IN')} lost.`,
    });
  }

  return {
    title: 'Next 5 Trades: Execution Plan',
    rules: rules.slice(0, 5),
  };
}
