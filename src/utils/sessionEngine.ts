/**
 * Session Analysis Engine — Fixed with safe formatters.
 */

import { fmtCurrency, fmtPct } from './formatters';

export interface SessionAnalysis {
  firstTradeOutcome: { win: number; total: number; winRate: number };
  afterFirstWin: { win: number; total: number; winRate: number; avgPnl: number };
  afterFirstLoss: { win: number; total: number; winRate: number; avgPnl: number };
  streakImpact: {
    after2Wins: { win: number; total: number; winRate: number };
    after2Losses: { win: number; total: number; winRate: number };
  };
  patterns: SessionPattern[];
}

export interface SessionPattern {
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'neutral';
}

export function analyzeSessions(trades: Array<Record<string, any>>): SessionAnalysis {
  if (trades.length < 3) {
    return {
      firstTradeOutcome: { win: 0, total: 0, winRate: 0 },
      afterFirstWin: { win: 0, total: 0, winRate: 0, avgPnl: 0 },
      afterFirstLoss: { win: 0, total: 0, winRate: 0, avgPnl: 0 },
      streakImpact: {
        after2Wins: { win: 0, total: 0, winRate: 0 },
        after2Losses: { win: 0, total: 0, winRate: 0 },
      },
      patterns: [],
    };
  }

  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const patterns: SessionPattern[] = [];

  // Group by date
  const byDate: Record<string, Array<Record<string, any>>> = {};
  sorted.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = [];
    byDate[t.date].push(t);
  });

  // First trade of each day
  const firstTrades = Object.values(byDate).map(day => day[0]);
  const firstWins = firstTrades.filter(t => t.netPnl > 0).length;

  // After first win/loss
  const afterFirstWinTrades: Array<Record<string, any>> = [];
  const afterFirstLossTrades: Array<Record<string, any>> = [];

  Object.values(byDate).forEach(day => {
    if (day.length < 2) return;
    if (day[0].netPnl > 0) afterFirstWinTrades.push(...day.slice(1));
    else if (day[0].netPnl < 0) afterFirstLossTrades.push(...day.slice(1));
  });

  const afwWins = afterFirstWinTrades.filter(t => t.netPnl > 0).length;
  const afwAvgPnl = afterFirstWinTrades.length > 0 ? Math.round(afterFirstWinTrades.reduce((s, t) => s + t.netPnl, 0) / afterFirstWinTrades.length) : 0;

  const aflWins = afterFirstLossTrades.filter(t => t.netPnl > 0).length;
  const aflAvgPnl = afterFirstLossTrades.length > 0 ? Math.round(afterFirstLossTrades.reduce((s, t) => s + t.netPnl, 0) / afterFirstLossTrades.length) : 0;

  // Compute stats first
  const afterFirstWin = { win: afwWins, total: afterFirstWinTrades.length, winRate: afterFirstWinTrades.length > 0 ? Math.round((afwWins / afterFirstWinTrades.length) * 100) : 0, avgPnl: afwAvgPnl };
  const afterFirstLoss = { win: aflWins, total: afterFirstLossTrades.length, winRate: afterFirstLossTrades.length > 0 ? Math.round((aflWins / afterFirstLossTrades.length) * 100) : 0, avgPnl: aflAvgPnl };

  // Streak impact
  let after2WinsArr: Array<Record<string, any>> = [];
  let after2LossesArr: Array<Record<string, any>> = [];

  for (let i = 2; i < sorted.length; i++) {
    const t1 = sorted[i - 2];
    const t2 = sorted[i - 1];
    if (t1.netPnl > 0 && t2.netPnl > 0) after2WinsArr.push(sorted[i]);
    else if (t1.netPnl < 0 && t2.netPnl < 0) after2LossesArr.push(sorted[i]);
  }

  const a2wWins = after2WinsArr.filter(t => t.netPnl > 0).length;
  const a2lWins = after2LossesArr.filter(t => t.netPnl > 0).length;

  const after2Wins = { win: a2wWins, total: after2WinsArr.length, winRate: after2WinsArr.length > 0 ? Math.round((a2wWins / after2WinsArr.length) * 100) : 0 };
  const after2Losses = { win: a2lWins, total: after2LossesArr.length, winRate: after2LossesArr.length > 0 ? Math.round((a2lWins / after2LossesArr.length) * 100) : 0 };

  // Detect patterns
  if (afterFirstLoss.total >= 3 && afterFirstLoss.winRate < 35) {
    patterns.push({
      title: 'Post-loss collapse',
      description: `After your first loss of the day, you win only ${fmtPct(afterFirstLoss.winRate)} of subsequent trades (${fmtCurrency(afterFirstLoss.avgPnl)}/trade avg). You're not recovering — you're compounding.`,
      severity: 'critical',
    });
  }

  if (afterFirstWin.total >= 3 && afterFirstWin.winRate < 40) {
    patterns.push({
      title: 'Overtrading after wins',
      description: `After a profitable first trade, your win rate drops to ${fmtPct(afterFirstWin.winRate)}. You're getting overconfident and deviating from your plan.`,
      severity: 'warning',
    });
  }

  if (after2Losses.total >= 3 && after2Losses.winRate < 30) {
    patterns.push({
      title: 'Double-loss spiral',
      description: `After 2 consecutive losses, your win rate collapses to ${fmtPct(after2Losses.winRate)}. Implement a mandatory stop after 2 losses.`,
      severity: 'critical',
    });
  }

  if (after2Wins.total >= 3 && after2Wins.winRate < 40) {
    patterns.push({
      title: 'Post-win overconfidence',
      description: `After 2 consecutive wins, your win rate drops to ${fmtPct(after2Wins.winRate)}. You're loosening discipline after success.`,
      severity: 'warning',
    });
  }

  return {
    firstTradeOutcome: { win: firstWins, total: firstTrades.length, winRate: firstTrades.length > 0 ? Math.round((firstWins / firstTrades.length) * 100) : 0 },
    afterFirstWin,
    afterFirstLoss,
    streakImpact: { after2Wins, after2Losses },
    patterns,
  };
}
