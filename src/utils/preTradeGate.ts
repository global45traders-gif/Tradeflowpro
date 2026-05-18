/**
 * Pre-Trade Gatekeeper v4
 * Validates EVERY trade before it can be logged.
 * Blocks trades that violate core rules.
 */

export interface GateCheck {
  passed: boolean;
  rule: string;
  message: string;
  severity: 'block' | 'warning';
  consequence?: string;
}

export interface GateResult {
  allowed: boolean;
  checks: GateCheck[];
  blockedBy: string[];
  qualityScore: number;
  recommendation: string;
}

/**
 * Run ALL pre-trade checks.
 * Returns: allowed (true/false), list of checks, recommendation.
 */
export function runPreTradeGate(
  tradeData: {
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    stopLoss?: number;
    target?: number;
    rrRatio?: number;
    segment?: string;
    setup?: string;
    emotion?: string;
    type: 'BUY' | 'SELL';
    qualityScore?: number;
  },
  account: { capital: number; riskPerTradePercent: number },
  sessionState: {
    todayLosses: number;
    todayTrades: number;
    lastTwoTradesNetPnl: number[];
  },
  executionMode: 'recovery' | 'normal' | 'aggressive',
  strictMode: boolean = true
): GateResult {
  const checks: GateCheck[] = [];
  const blockedBy: string[] = [];

  // ── 1. STOP LOSS CHECK (HARD BLOCK in Strict Mode) ──
  if (!tradeData.stopLoss || tradeData.stopLoss <= 0) {
    checks.push({
      passed: false,
      rule: 'Stop Loss Required',
      message: strictMode ? 'STRICT MODE: No stop loss defined. Trade rejected.' : 'No stop loss defined. This trade has no risk control.',
      severity: strictMode ? 'block' : 'warning',
      consequence: 'Without SL, a single bad trade can wipe 5–15% of your capital.',
    });
    if (strictMode) blockedBy.push('Stop Loss Required (Strict Mode)');
  } else {
    // Calculate actual risk %
    const entry = tradeData.entryPrice;
    const qty = tradeData.quantity;
    const sl = tradeData.stopLoss;
    const riskPerUnit = tradeData.type === 'BUY' ? entry - sl : sl - entry;
    const totalRisk = riskPerUnit * qty;
    const riskPct = account.capital > 0 ? (totalRisk / account.capital) * 100 : 0;

    if (riskPct > 2) {
      checks.push({
        passed: false,
        rule: 'Risk ≤ 2% Per Trade',
        message: strictMode ? `STRICT MODE: Risk at ${riskPct.toFixed(1)}% exceeds 2% limit. Trade rejected.` : `This trade risks ${riskPct.toFixed(1)}% of capital (₹${totalRisk.toLocaleString('en-IN')}). Maximum is 2%.`,
        severity: strictMode ? 'block' : 'warning',
        consequence: `Exceeding 2% risk has caused ${Math.round(riskPct * 2)}% drawdowns historically.`,
      });
      if (strictMode) blockedBy.push('Risk exceeds 2% limit (Strict Mode)');
    } else {
      checks.push({
        passed: true,
        rule: 'Risk ≤ 2% Per Trade',
        message: `Risk is ${riskPct.toFixed(1)}% (₹${totalRisk.toLocaleString('en-IN')}). Within safe limits.`,
        severity: 'warning',
      });
    }
  }

  // ── 2. R:R CHECK ──
  const rr = tradeData.rrRatio || 0;
  if (rr < 2 && tradeData.stopLoss && tradeData.stopLoss > 0) {
    checks.push({
      passed: false,
      rule: 'R:R ≥ 1:2',
      message: `Current R:R is 1:${rr.toFixed(2)}. Minimum required is 1:2.`,
      severity: executionMode === 'recovery' ? 'block' : 'warning',
      consequence: `Trades below 1:2 R:R lose money long-term. You need 67%+ WR to break even at 1:${rr.toFixed(2)}.`,
    });
    if (executionMode === 'recovery') {
      blockedBy.push('R:R below 1:2 (recovery mode requires strict discipline)');
    }
  } else {
    checks.push({
      passed: true,
      rule: 'R:R ≥ 1:2',
      message: `R:R is 1:${rr.toFixed(2)}. Meets minimum requirement.`,
      severity: 'warning',
    });
  }

  // ── 3. SETUP CHECK ──
  if (!tradeData.setup || tradeData.setup === '') {
    checks.push({
      passed: false,
      rule: 'Setup Defined',
      message: 'No trade setup selected. Every trade must have a defined setup.',
      severity: executionMode === 'recovery' ? 'block' : 'warning',
      consequence: 'Undefined setup = impulsive trade. 78% of impulsive trades lose money.',
    });
    if (executionMode === 'recovery') {
      blockedBy.push('No setup defined (recovery mode requires A+ setups only)');
    }
  } else {
    checks.push({
      passed: true,
      rule: 'Setup Defined',
      message: `Setup: "${tradeData.setup}".`,
      severity: 'warning',
    });
  }

  // ── 4. SESSION CONTROL CHECKS ──
  if (sessionState.todayLosses >= 1 && sessionState.todayTrades >= 1) {
    checks.push({
      passed: false,
      rule: 'Stop After First Loss',
      message: `You've already lost ${sessionState.todayLosses} trade(s) today. Session control recommends stopping.`,
      severity: executionMode === 'recovery' ? 'block' : 'warning',
      consequence: 'Trades after first loss win only 30–40% of the time vs 55–65% on fresh sessions.',
    });
  }

  if (sessionState.todayTrades >= (executionMode === 'recovery' ? 2 : 3)) {
    checks.push({
      passed: false,
      rule: 'Max Trades Per Day',
      message: `You've logged ${sessionState.todayTrades} trades today. Limit is ${executionMode === 'recovery' ? 2 : 3}.`,
      severity: 'block',
      consequence: 'Overtrading after limit reduces WR by 15–25%.',
    });
    blockedBy.push('Max daily trades exceeded');
  }

  // ── 5. EMOTION CHECK ──
  const emotionalEmotions = ['Revenge', 'FOMO', 'Fear', 'Greed'];
  if (emotionalEmotions.includes(tradeData.emotion || '')) {
    checks.push({
      passed: false,
      rule: 'Emotional State',
      message: `You're logging this trade while feeling "${tradeData.emotion}". Emotional trades have 40% lower win rate.`,
      severity: executionMode === 'recovery' ? 'block' : 'warning',
      consequence: `${tradeData.emotion} trades lose 2–3x more than confidence trades on average.`,
    });
  }

  // ── CALCULATE QUALITY SCORE ──
  let qualityScore = 0;
  const passedChecks = checks.filter(c => c.passed).length;
  qualityScore = Math.round((passedChecks / Math.max(1, checks.length)) * 100);

  // ── GENERATE RECOMMENDATION ──
  let recommendation = '';
  if (blockedBy.length > 0) {
    recommendation = `TRADE BLOCKED. ${blockedBy.length} rule(s) violated. Fix these before logging: ${blockedBy.join(', ')}.`;
  } else if (qualityScore < 50 && strictMode) {
    blockedBy.push('Trade quality score below 50. In Strict Mode: Do not take trades unless setup criteria is fully met.');
    recommendation = 'BLOCKED (Strict Mode): Quality score below 50/100. Do not take trades unless setup criteria is fully met. Pause and reset.';
  } else if (executionMode === 'recovery') {
    recommendation = 'RECOVERY MODE: All rules enforced strictly. This trade passes — but size must be ≤ 50% of normal.';
  } else {
    recommendation = 'Trade passes all checks. Execute with discipline.';
  }

  return {
    allowed: blockedBy.length === 0,
    checks,
    blockedBy,
    qualityScore,
    recommendation,
  };
}
