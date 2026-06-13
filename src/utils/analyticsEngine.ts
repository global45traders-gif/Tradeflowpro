/**
 * Advanced Analytics Engine
 * Memoized calculations for discipline, emotion, risk, streak, setup, and day-of-week analysis.
 * Returns structured data ready for charting and insight generation.
 */

export interface TradeLike {
  id: string;
  date: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage?: number;
  stopLoss?: number;
  target?: number;
  pnl: number;
  pnlPercent: number;
  rrRatio: number;
  netPnl: number;
  segment: string;
  emotion: string;
  setup?: string;
  entryTime?: string;
  exitTime?: string;
  charges: { total: number; mode: 'itemized' | 'flat' };
  accountId: string;
  rulesFollowed?: string[];
}

export interface AnalyticsResult {
  // Discipline
  disciplineScore: number;    // 0-100
  riskScore: number;          // 0-100
  executionScore: number;     // 0-100
  consistencyScore: number;   // 0-100 (weighted average)

  // Emotion
  emotionStats: Array<{
    emotion: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    avgPnl: number;
  }>;

  // Day of Week
  dayStats: Array<{
    day: string;
    dayNum: number;  // 0=Sun, 6=Sat
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    avgPnl: number;
  }>;

  // Setup
  setupStats: Array<{
    setup: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    avgPnl: number;
  }>;

  // Time of Day
  timeStats: Array<{
    period: string;
    trades: number;
    wins: number;
    winRate: number;
    totalPnl: number;
  }>;

  // Risk
  avgRiskPerTrade: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  profitFactor: number | string;
  expectancy: number;
  riskAdjustedReturn: number;

  // Streaks
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
  avgWin: number;
  avgLoss: number;

  // Equity Curve
  equityCurve: Array<{ date: string; balance: number; netPnl: number }>;

  // Rule adherence
  ruleAdherenceRate: number;
  ruleViolations: Array<{ ruleId: string; name: string; count: number; rate: number }>;

  // Totals
  totalTrades: number;
  totalPnL: number;
  totalNetPnL: number;
  winRate: number;
}

export function computeAnalytics(
  trades: TradeLike[],
  rules: Array<{ id: string; name: string; isActive: boolean }>,
  initialCapital: number,
  riskPercent: number
): AnalyticsResult {
  const empty = (extra?: Partial<AnalyticsResult>): AnalyticsResult => ({
    disciplineScore: 0, riskScore: 0, executionScore: 0, consistencyScore: 0,
    emotionStats: [], dayStats: [], setupStats: [], timeStats: [],
    avgRiskPerTrade: 0, maxDrawdown: 0, maxDrawdownPct: 0,
    profitFactor: 0, expectancy: 0, riskAdjustedReturn: 0,
    currentStreak: { type: 'none', count: 0 },
    longestWinStreak: 0, longestLossStreak: 0,
    avgWin: 0, avgLoss: 0,
    equityCurve: [{ date: 'Start', balance: initialCapital, netPnl: 0 }],
    ruleAdherenceRate: 0, ruleViolations: [],
    totalTrades: 0, totalPnL: 0, totalNetPnL: 0, winRate: 0,
    ...extra,
  });

  if (trades.length === 0) return empty();

  // Sort chronologically
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));

  // ── Basic metrics ──
  const totalTrades = sorted.length;
  const totalPnL = sorted.reduce((s, t) => s + t.pnl, 0);
  const totalNetPnL = sorted.reduce((s, t) => s + t.netPnl, 0);

  // ── Emotion stats ──
  const emotionMap: Record<string, { trades: number; wins: number; losses: number; totalPnl: number }> = {};
  sorted.forEach(t => {
    const e = t.emotion || 'Unknown';
    if (!emotionMap[e]) emotionMap[e] = { trades: 0, wins: 0, losses: 0, totalPnl: 0 };
    emotionMap[e].trades++;
    if (t.netPnl > 0) emotionMap[e].wins++;
    else if (t.netPnl < 0) emotionMap[e].losses++;
    emotionMap[e].totalPnl += t.netPnl;
  });

  const emotionStats = Object.entries(emotionMap).map(([emotion, d]) => ({
    emotion,
    trades: d.trades,
    wins: d.wins,
    losses: d.losses,
    winRate: Math.round((d.wins / d.trades) * 100),
    totalPnl: Math.round(d.totalPnl),
    avgPnl: Math.round(d.totalPnl / d.trades),
  })).sort((a, b) => b.totalPnl - a.totalPnl);

  // ── Day of Week stats ──
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMap: Record<number, { trades: number; wins: number; losses: number; totalPnl: number }> = {};
  sorted.forEach(t => {
    const d = new Date(t.date + 'T00:00:00');
    const dn = d.getDay();
    if (!dayMap[dn]) dayMap[dn] = { trades: 0, wins: 0, losses: 0, totalPnl: 0 };
    dayMap[dn].trades++;
    if (t.netPnl > 0) dayMap[dn].wins++;
    else if (t.netPnl < 0) dayMap[dn].losses++;
    dayMap[dn].totalPnl += t.netPnl;
  });

  const dayStats = Object.entries(dayMap)
    .map(([dn, d]) => ({
      day: dayNames[parseInt(dn)],
      dayNum: parseInt(dn),
      trades: d.trades,
      wins: d.wins,
      losses: d.losses,
      winRate: Math.round((d.wins / d.trades) * 100),
      totalPnl: Math.round(d.totalPnl),
      avgPnl: Math.round(d.totalPnl / d.trades),
    }))
    .sort((a, b) => a.dayNum - b.dayNum);

  // ── Setup stats ──
  const setupMap: Record<string, { trades: number; wins: number; losses: number; totalPnl: number }> = {};
  sorted.forEach(t => {
    const s = t.setup || 'Undefined';
    if (!setupMap[s]) setupMap[s] = { trades: 0, wins: 0, losses: 0, totalPnl: 0 };
    setupMap[s].trades++;
    if (t.netPnl > 0) setupMap[s].wins++;
    else if (t.netPnl < 0) setupMap[s].losses++;
    setupMap[s].totalPnl += t.netPnl;
  });

  const setupStats = Object.entries(setupMap)
    .map(([setup, d]) => ({
      setup,
      trades: d.trades,
      wins: d.wins,
      losses: d.losses,
      winRate: Math.round((d.wins / d.trades) * 100),
      totalPnl: Math.round(d.totalPnl),
      avgPnl: Math.round(d.totalPnl / d.trades),
    }))
    .sort((a, b) => b.trades - a.trades);

  // ── Time of Day stats ──
  const timeMap: Record<string, { trades: number; wins: number; totalPnl: number }> = {};
  sorted.forEach(t => {
    let period = 'Unknown';
    if (t.entryTime) {
      const h = parseInt(t.entryTime.split(':')[0], 10);
      if (h >= 9 && h < 10) period = '9-10 AM (Open)';
      else if (h >= 10 && h < 12) period = '10-12 PM';
      else if (h >= 12 && h < 14) period = '12-2 PM (Midday)';
      else if (h >= 14 && h < 15) period = '2-3 PM (Afternoon)';
      else if (h >= 15 && h < 16) period = '3+ PM (Close)';
      else period = `${h}:00`;
    }
    if (!timeMap[period]) timeMap[period] = { trades: 0, wins: 0, totalPnl: 0 };
    timeMap[period].trades++;
    if (t.netPnl > 0) timeMap[period].wins++;
    timeMap[period].totalPnl += t.netPnl;
  });

  const timeStats = Object.entries(timeMap)
    .map(([period, d]) => ({
      period,
      trades: d.trades,
      wins: d.wins,
      winRate: d.trades > 0 ? Math.round((d.wins / d.trades) * 100) : 0,
      totalPnl: Math.round(d.totalPnl),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // ── Risk metrics ──
  const wins = sorted.filter(t => t.netPnl > 0);
  const losses = sorted.filter(t => t.netPnl < 0);
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = totalTrades > 0 ? Math.round((winCount / totalTrades) * 100) : 0;

  const sumNetProfits = wins.reduce((s, t) => s + t.netPnl, 0);
  const sumNetLosses = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));
  const avgRiskPerTrade = riskPercent > 0 ? initialCapital * (riskPercent / 100) : 0;

  const profitFactor = sumNetLosses > 0
    ? Number((sumNetProfits / sumNetLosses).toFixed(2))
    : sumNetProfits > 0 ? '∞' : 0;

  const winProb = totalTrades > 0 ? winCount / totalTrades : 0;
  const lossProb = totalTrades > 0 ? lossCount / totalTrades : 0;
  const avgWin = winCount > 0 ? sumNetProfits / winCount : 0;
  const avgLoss = lossCount > 0 ? sumNetLosses / lossCount : 0;
  const expectancy = Number(((winProb * avgWin) - (lossProb * avgLoss)).toFixed(0));

  // Drawdown
  let peak = initialCapital;
  let maxDD = 0;
  let maxDDPct = 0;
  const equityCurve = [{ date: 'Start', balance: initialCapital, netPnl: 0 }];
  sorted.forEach(t => {
    peak = Math.max(peak, peak + t.netPnl);
    const bal = initialCapital + sorted.slice(0, sorted.indexOf(t) + 1).reduce((s, tr) => s + tr.netPnl, 0);
    const dd = peak - bal;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
    equityCurve.push({ date: t.date, balance: bal, netPnl: t.netPnl });
  });

  const riskAdjustedReturn = totalNetPnL !== 0 ? Number((totalNetPnL / (avgRiskPerTrade * totalTrades || 1)).toFixed(2)) : 0;

  // ── Streaks ──
  let longestWin = 0, longestLoss = 0, curWin = 0, curLoss = 0;
  sorted.forEach(t => {
    if (t.netPnl > 0) { curWin++; curLoss = 0; longestWin = Math.max(longestWin, curWin); }
    else if (t.netPnl < 0) { curLoss++; curWin = 0; longestLoss = Math.max(longestLoss, curLoss); }
  });

  let streakType: 'win' | 'loss' | 'none' = 'none';
  let streakCount = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].netPnl > 0) {
      if (streakType === 'win') streakCount++;
      else { streakType = 'win'; streakCount = 1; }
    } else if (sorted[i].netPnl < 0) {
      if (streakType === 'loss') streakCount++;
      else { streakType = 'loss'; streakCount = 1; }
    }
  }

  // ── Rule Adherence ──
  const activeRules = rules.filter(r => r.isActive);
  let ruleTotal = 0;
  let ruleFollowed = 0;
  const ruleViolationMap: Record<string, { name: string; count: number; total: number }> = {};

  activeRules.forEach(r => { ruleViolationMap[r.id] = { name: r.name, count: 0, total: 0 }; });

  const dateCounts: Record<string, number> = {};
  sorted.forEach(t => {
    dateCounts[t.date] = (dateCounts[t.date] || 0) + 1;
  });

  sorted.forEach(t => {
    activeRules.forEach(r => {
      ruleViolationMap[r.id].total++;
      ruleTotal++;

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
            const riskPct = initialCapital > 0 ? (riskAmount / initialCapital) * 100 : 0;
            wasFollowed = riskPct <= 2;
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

      if (wasFollowed) {
        ruleFollowed++;
      } else {
        ruleViolationMap[r.id].count++;
      }
    });
  });

  const ruleAdherenceRate = ruleTotal > 0 ? Math.round((ruleFollowed / ruleTotal) * 100) : 0;
  const ruleViolations = Object.entries(ruleViolationMap)
    .filter(([, d]) => d.count > 0)
    .map(([id, d]) => ({
      ruleId: id,
      name: d.name,
      count: d.count,
      rate: d.total > 0 ? Math.round((d.count / d.total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── Consistency Scoring ──
  // 1. Discipline Score = rule adherence rate
  const disciplineScore = ruleAdherenceRate;

  // 2. Risk Score = based on max drawdown
  let riskScore = 100;
  if (maxDDPct > 20) riskScore = 25;
  else if (maxDDPct > 10) riskScore = 50;
  else if (maxDDPct > 5) riskScore = 75;
  else riskScore = 100;

  // 3. Execution Score = emotional control (non-emotional trades ratio)
  const emotionalTrades = sorted.filter(t => ['Revenge', 'FOMO', 'Fear', 'Greed'].includes(t.emotion)).length;
  const executionScore = totalTrades > 0 ? Math.round(((totalTrades - emotionalTrades) / totalTrades) * 100) : 50;

  // 4. Consistency = weighted average
  const consistencyScore = Math.round(
    disciplineScore * 0.35 + riskScore * 0.35 + executionScore * 0.3
  );

  return {
    disciplineScore, riskScore, executionScore, consistencyScore,
    emotionStats, dayStats, setupStats, timeStats,
    avgRiskPerTrade: Math.round(avgRiskPerTrade),
    maxDrawdown: Math.round(maxDD),
    maxDrawdownPct: Number(maxDDPct.toFixed(1)),
    profitFactor, expectancy, riskAdjustedReturn,
    currentStreak: { type: streakType, count: streakCount },
    longestWinStreak: longestWin, longestLossStreak: longestLoss,
    avgWin: Math.round(avgWin), avgLoss: Math.round(avgLoss),
    equityCurve, ruleAdherenceRate, ruleViolations,
    totalTrades, totalPnL: Math.round(totalPnL), totalNetPnL: Math.round(totalNetPnL), winRate,
  };
}
