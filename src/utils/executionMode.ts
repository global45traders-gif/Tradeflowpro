/**
 * Execution Mode Engine v4
 * Automatically switches between Recovery, Normal, and Aggressive modes.
 * Based on: DD%, expectancy, recent performance.
 */

export type ExecutionMode = 'recovery' | 'normal' | 'aggressive';

export interface ExecutionModeState {
  mode: ExecutionMode;
  reason: string;
  rules: Array<{ rule: string; detail: string }>;
  maxTradesPerDay: number;
  maxRiskPerTrade: number; // percentage
}

export function determineExecutionMode(
  drawdownPct: number,
  expectancy: number,
  consistencyScore: number,
  last5Trades: Array<{ netPnl: number }>
): ExecutionModeState {
  const recentWins = last5Trades.filter(t => t.netPnl > 0).length;

  // ── RECOVERY MODE ──
  // Activated when: DD > 10% OR expectancy negative OR consistency < 40
  if (drawdownPct > 10 || expectancy < -200 || consistencyScore < 40) {
    return {
      mode: 'recovery',
      reason: drawdownPct > 10
        ? `Drawdown at ${drawdownPct}% — capital preservation mode activated.`
        : expectancy < -200
          ? `Negative expectancy (₹${expectancy}/trade) — stop scaling until edge is fixed.`
          : `Consistency score at ${consistencyScore} — back to basics.`,
      rules: [
        { rule: 'MAX 2 trades per day', detail: 'No exceptions. Quality over quantity.' },
        { rule: 'Risk ≤ 1% per trade', detail: 'Half of normal sizing until recovery is confirmed.' },
        { rule: 'No revenge trading', detail: 'After any loss, 30-minute mandatory cooldown.' },
        { rule: 'A+ setups only', detail: 'If the setup isn\'t your highest-conviction pattern, skip it.' },
      ],
      maxTradesPerDay: 2,
      maxRiskPerTrade: 1,
    };
  }

  // ── AGGRESSIVE MODE ──
  // Activated when: DD < 5% AND expectancy positive AND consistency > 70 AND 4+ wins in last 5
  if (
    drawdownPct < 5 &&
    expectancy > 200 &&
    consistencyScore > 70 &&
    recentWins >= 4 &&
    last5Trades.length >= 5
  ) {
    return {
      mode: 'aggressive',
      reason: `Strong performance: ${recentWins}/5 wins, expectancy ₹${expectancy}, DD ${drawdownPct}%. Edge is confirmed.`,
      rules: [
        { rule: 'MAX 4 trades per day', detail: 'More opportunities while edge is hot.' },
        { rule: 'Risk ≤ 2.5% per trade', detail: 'Slightly elevated risk — but still within safe limits.' },
        { rule: 'Maintain stop loss discipline', detail: 'Success breeds complacency — don\'t slip.' },
      ],
      maxTradesPerDay: 4,
      maxRiskPerTrade: 2.5,
    };
  }

  // ── NORMAL MODE ──
  return {
    mode: 'normal',
    reason: `Balanced performance. DD ${drawdownPct}%, expectancy ₹${expectancy}, ${consistencyScore}/100 consistency.`,
    rules: [
      { rule: 'MAX 3 trades per day', detail: 'Standard limit for disciplined trading.' },
      { rule: 'Risk ≤ 2% per trade', detail: 'Standard risk management.' },
      { rule: 'Stop loss required', detail: 'Every trade must have a pre-defined SL.' },
    ],
    maxTradesPerDay: 3,
    maxRiskPerTrade: 2,
  };
}
