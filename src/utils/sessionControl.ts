/**
 * Session Control System v4
 * Manages real-time session state and enforces hard stops.
 */

export interface SessionState {
  todayTrades: number;
  todayWins: number;
  todayLosses: number;
  todayPnl: number;
  currentStreak: 'win' | 'loss' | 'none';
  currentStreakCount: number;
  sessionStatus: 'active' | 'warning' | 'hard_stop';
  reason?: string;
}

/**
 * Analyze session state and determine if trading should continue.
 */
export function getSessionControl(
  todayTrades: TradeSummary[],
  maxTradesPerDay: number
): SessionState {
  const wins = todayTrades.filter(t => t.netPnl > 0);
  const losses = todayTrades.filter(t => t.netPnl < 0);
  const todayPnl = todayTrades.reduce((s, t) => s + t.netPnl, 0);

  // Determine current streak
  let streakType: 'win' | 'loss' | 'none' = 'none';
  let streakCount = 0;
  for (let i = todayTrades.length - 1; i >= 0; i--) {
    if (todayTrades[i].netPnl > 0) {
      if (streakType === 'win') streakCount++;
      else { streakType = 'win'; streakCount = 1; }
    } else if (todayTrades[i].netPnl < 0) {
      if (streakType === 'loss') streakCount++;
      else { streakType = 'loss'; streakCount = 1; }
    }
  }

  // ── SESSION STATUS ──
  let sessionStatus: 'active' | 'warning' | 'hard_stop' = 'active';
  let reason: string | undefined;

  // Hard stop: 2+ consecutive losses
  if (streakType === 'loss' && streakCount >= 2) {
    sessionStatus = 'hard_stop';
    reason = `${streakCount} consecutive losses detected. Session hard stop activated. No more trades today.`;
  }
  // Warning: first trade was a loss
  else if (todayTrades.length >= 1 && todayTrades[0].netPnl < 0 && todayTrades.length === 1) {
    sessionStatus = 'warning';
    reason = 'First trade was a loss. Win rate after first loss drops to 30–40%. Consider stopping for today.';
  }
  // Max trades
  else if (todayTrades.length >= maxTradesPerDay) {
    sessionStatus = 'hard_stop';
    reason = `Maximum ${maxTradesPerDay} trades per day reached. Session closed.`;
  }

  return {
    todayTrades: todayTrades.length,
    todayWins: wins.length,
    todayLosses: losses.length,
    todayPnl,
    currentStreak: streakType,
    currentStreakCount: streakCount,
    sessionStatus,
    reason,
  };
}

export interface TradeSummary {
  netPnl: number;
  date: string;
}
