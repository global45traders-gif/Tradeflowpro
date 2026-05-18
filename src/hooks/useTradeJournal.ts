import { useState, useEffect, useMemo, useCallback } from 'react';
import { Trade, TradingAccount, TradingRule, DayOfWeekStats, EmotionStats, TradeCharges } from '../utils/types';

// Helper to get user name from localStorage
export function getUserName(): string {
  return localStorage.getItem('tradeflow_user_name') || 'Trader';
}
import { initialMockTrades, calculateTradePnL, calculateTradePnLPercent, calculateTradeRR, calculateNetPnl, defaultAccounts, defaultRules, recalculateTrade } from '../utils/tradeUtils';

const TRADES_STORAGE_KEY = 'tradeflow_trades';
const ACCOUNTS_STORAGE_KEY = 'tradeflow_accounts';
const RULES_STORAGE_KEY = 'tradeflow_rules';

export function useTradeJournal() {
  const [activeAccountId, setActiveAccountId] = useState(() => {
    return localStorage.getItem('tradeflow_active_account') || 'acc_default';
  });

  const [accounts, setAccounts] = useState<TradingAccount[]>(() => {
    const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    let initialAccounts: TradingAccount[];

    if (saved) {
      try {
        initialAccounts = JSON.parse(saved);
      } catch {
        initialAccounts = [];
      }
    } else {
      initialAccounts = [];
    }

    // Apply onboarding/user settings
    const userCapital = localStorage.getItem('tradeflow_capital');
    const userCurrency = localStorage.getItem('tradeflow_currency') || 'USD';
    const userRisk = localStorage.getItem('tradeflow_risk');

    if (initialAccounts.length === 0) {
      // No accounts yet — create from user data
      return [{
        ...defaultAccounts[0],
        capital: userCapital ? parseFloat(userCapital) : 500000,
        currencyCode: userCurrency,
        riskPerTradePercent: userRisk ? parseFloat(userRisk) : 1,
      }];
    }

    // Accounts exist — sync currency with user preference
    const updated = [...initialAccounts];
    updated.forEach(acc => {
      if (userCurrency && !acc.currencyCode) {
        acc.currencyCode = userCurrency;
      }
    });
    return updated;
  });

  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem(TRADES_STORAGE_KEY);
    let rawTrades: Trade[];
    if (saved) {
      try { rawTrades = JSON.parse(saved); } catch { rawTrades = initialMockTrades; }
    } else {
      rawTrades = initialMockTrades;
    }
    // Auto-recalculate ALL trades on load to ensure consistent PnL/charges
    return rawTrades.map(t => recalculateTrade(t));
  });

  const [rules, setRules] = useState<TradingRule[]>(() => {
    const saved = localStorage.getItem(RULES_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return defaultRules;
  });

  useEffect(() => { localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades)); }, [trades]);
  useEffect(() => { localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules)); }, [rules]);
  useEffect(() => { localStorage.setItem('tradeflow_active_account', activeAccountId); }, [activeAccountId]);

  // Derived
  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

  // Auto-recalculate ALL trades when account brokerage settings change
  useEffect(() => {
    setTrades(prev => prev.map(t => recalculateTrade(t, activeAccount.brokeragePerOrder, activeAccount.brokeragePercent)));
  }, [activeAccount.brokeragePerOrder, activeAccount.brokeragePercent]);

  const accountTrades = useMemo(
    () => trades.filter(t => t.accountId === activeAccountId),
    [trades, activeAccountId]
  );

  // Trade Operations — all use recalculateTrade for consistent PnL/charges
  const addTrade = useCallback((
    tradeData: Omit<Trade, 'id' | 'pnl' | 'pnlPercent' | 'rrRatio' | 'netPnl' | 'charges' | 'accountId' | 'rulesFollowed' | 'leverage'> & { id?: string; rulesFollowed?: string[]; leverage?: number },
    charges?: TradeCharges,
    autoCalcCharges: boolean = true
  ) => {
    const leverage = Math.max(1, tradeData.leverage || 1);
    // If manual flat charges, preserve them
    const finalCharges = (!autoCalcCharges && charges && charges.mode === 'flat') ? charges : undefined;
    const rawTrade: Partial<Trade> = {
      ...tradeData,
      leverage,
      charges: finalCharges,
      accountId: activeAccountId,
    };
    const newTrade = recalculateTrade(rawTrade, activeAccount.brokeragePerOrder, activeAccount.brokeragePercent);
    setTrades(prev => [newTrade, ...prev]);
  }, [activeAccountId, activeAccount]);

  const importTrades = useCallback((newTrades: Trade[]) => {
    // Auto-recalculate every imported trade to ensure correct PnL/charges
    const recalculated = newTrades.map(t =>
      recalculateTrade({ ...t, accountId: activeAccountId }, activeAccount.brokeragePerOrder, activeAccount.brokeragePercent)
    );
    setTrades(prev => [...recalculated, ...prev]);
  }, [activeAccountId, activeAccount]);

  const updateTrade = useCallback((id: string, tradeData: Partial<Trade>) => {
    setTrades(prev => prev.map(t => {
      if (t.id !== id) return t;
      const merged = { ...t, ...tradeData };
      // Auto-recalculate: if charges were manually set to flat, keep them
      if (merged.charges?.mode === 'flat') {
        const pnl = calculateTradePnL(merged.type, merged.entryPrice, merged.exitPrice, merged.quantity);
        const netPnl = calculateNetPnl(pnl, merged.charges);
        const pnlPercent = calculateTradePnLPercent(merged.type, merged.entryPrice, merged.exitPrice, merged.quantity);
        const rrRatio = calculateTradeRR(merged.type, merged.entryPrice, merged.exitPrice, merged.stopLoss);
        return { ...merged, pnl, netPnl, pnlPercent, rrRatio };
      }
      return recalculateTrade(merged, activeAccount.brokeragePerOrder, activeAccount.brokeragePercent);
    }));
  }, [activeAccount.brokeragePerOrder, activeAccount.brokeragePercent]);

  const deleteTrade = useCallback((id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  }, []);

  // Account Management
  const createAccount = useCallback((acc: Omit<TradingAccount, 'id' | 'createdAt' | 'isActive'>) => {
    const newAcc: TradingAccount = {
      ...acc,
      id: `acc_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      isActive: false,
    };
    setAccounts(prev => [...prev, newAcc]);
    return newAcc;
  }, []);

  const updateAccount = useCallback((id: string, data: Partial<TradingAccount>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter(a => a.id !== id);
      if (activeAccountId === id) setActiveAccountId(remaining[0].id);
      return remaining;
    });
  }, [activeAccountId]);

  const selectAccount = useCallback((id: string) => setActiveAccountId(id), []);

  // Rule Management
  const addRule = useCallback((rule: Omit<TradingRule, 'id' | 'isDefault'>) => {
    const newRule: TradingRule = { ...rule, id: `rule_${Date.now()}`, isDefault: false };
    setRules(prev => [...prev, newRule]);
  }, []);

  const updateRule = useCallback((id: string, data: Partial<TradingRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules(prev => prev.filter(r => r.isDefault || r.id !== id));
    setTrades(prev => prev.map(t => ({
      ...t,
      rulesFollowed: t.rulesFollowed.filter(rid => rid !== id),
    })));
  }, []);

  const resetData = useCallback(() => {
    setTrades([]);
    setAccounts(defaultAccounts);
    setRules(defaultRules);
    setActiveAccountId('acc_default');
    localStorage.removeItem(TRADES_STORAGE_KEY);
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    localStorage.removeItem(RULES_STORAGE_KEY);
  }, []);

  // Advanced Analytics
  const stats = useMemo(() => {
    const totalTrades = accountTrades.length;
    if (totalTrades === 0) return {
      totalPnL: 0, totalNetPnL: 0, totalCharges: 0,
      winRate: 0, profitFactor: 0, avgRR: 0,
      winsCount: 0, lossesCount: 0, breakEvenCount: 0,
      avgWin: 0, avgLoss: 0, avgNetWin: 0, avgNetLoss: 0,
      maxWinStreak: 0, maxLossStreak: 0,
      bestTrade: null as Trade | null, worstTrade: null as Trade | null,
      equityCurve: [{ date: 'Start', balance: activeAccount?.capital || 500000, netPnl: 0 }],
      currentBalance: activeAccount?.capital || 500000,
      emotionStats: [] as EmotionStats[],
      dayOfWeekStats: [] as DayOfWeekStats[],
      ruleAdherenceRate: 0, ruleViolations: [] as { ruleId: string; name: string; violatedCount: number; total: number; rate: number }[],
      insights: [] as string[],
      ruleBreakdown: {} as Record<string, { followed: number; violated: number }>,
      maxDrawdown: 0, maxDrawdownPct: 0, avgRiskPerTrade: 0,
      riskAdjustedReturn: 0, expectancy: 0,
      consistencyScore: 0, disciplineScore: 0, riskScore: 0, executionScore: 0,
      currentStreak: { type: 'none' as const, count: 0 },
      longestWinStreak: 0, longestLossStreak: 0,
      avgWinDuration: 0, avgLossDuration: 0,
      setupStats: [], positionSizeAnalysis: [], timeOfDayStats: [],
      mistakeAnalysis: [], equityCurveWithDD: [{ date: 'Start', balance: activeAccount?.capital || 500000, drawdown: 0 }],
      riskPerTradeOverTime: [],
    };

    let totalPnL = 0, totalNetPnL = 0, totalCharges = 0;
    let winsCount = 0, lossesCount = 0, breakEvenCount = 0;
    let sumProfits = 0, sumLosses = 0, sumNetProfits = 0, sumNetLosses = 0;
    let sumRR = 0, validRRCount = 0;
    let bestTrade: Trade | null = null, worstTrade: Trade | null = null;

    let currentWinStreak = 0, maxWinStreak = 0, currentLossStreak = 0, maxLossStreak = 0;
    const equityCurve = [{ date: 'Start', balance: activeAccount?.capital || 500000, netPnl: 0 }];
    let runningBalance = activeAccount?.capital || 500000;

    const chronoTrades = [...accountTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    chronoTrades.forEach(trade => {
      totalPnL += trade.pnl;
      totalNetPnL += trade.netPnl;
      totalCharges += trade.charges.total;
      runningBalance += trade.netPnl;
      equityCurve.push({ date: trade.date, balance: runningBalance, netPnl: trade.netPnl });

      if (!bestTrade || trade.netPnl > bestTrade.netPnl) bestTrade = trade;
      if (!worstTrade || trade.netPnl < worstTrade.netPnl) worstTrade = trade;

      if (trade.netPnl > 0) {
        winsCount++; sumProfits += trade.pnl; sumNetProfits += trade.netPnl;
        currentWinStreak++; maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        currentLossStreak = 0;
      } else if (trade.netPnl < 0) {
        lossesCount++; sumLosses += Math.abs(trade.pnl); sumNetLosses += Math.abs(trade.netPnl);
        currentLossStreak++; maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
        currentWinStreak = 0;
      } else breakEvenCount++;

      if (!isNaN(trade.rrRatio)) { sumRR += trade.rrRatio; validRRCount++; }
    });

    const winRate = (winsCount / totalTrades) * 100;
    const profitFactor = sumNetLosses > 0 ? sumNetProfits / sumNetLosses : sumNetProfits > 0 ? Infinity : 1;
    const avgNetWinVal = winsCount > 0 ? sumNetProfits / winsCount : 0;
    const avgNetLossVal = lossesCount > 0 ? sumNetLosses / lossesCount : 0;

    // Emotion Stats
    const emotionMap: Record<string, EmotionStats> = {};
    accountTrades.forEach(t => {
      const e = t.emotion || 'Unspecified';
      if (!emotionMap[e]) emotionMap[e] = { emotion: e, trades: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, avgPnl: 0 };
      emotionMap[e].trades++;
      if (t.netPnl > 0) emotionMap[e].wins++;
      else if (t.netPnl < 0) emotionMap[e].losses++;
      emotionMap[e].totalPnl += t.netPnl;
    });
    const emotionStats = Object.values(emotionMap).map(e => ({
      ...e, winRate: Number(((e.wins / e.trades) * 100).toFixed(0)),
      avgPnl: Number((e.totalPnl / e.trades).toFixed(0)),
    })).sort((a, b) => b.totalPnl - a.totalPnl);

    // Day-of-Week Stats
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap: Record<string, DayOfWeekStats> = {};
    accountTrades.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const dayIdx = d.getDay();
      const dayName = dayNames[dayIdx];
      if (!dayMap[dayName]) dayMap[dayName] = { day: dayName, trades: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, avgPnl: 0 };
      dayMap[dayName].trades++;
      if (t.netPnl > 0) dayMap[dayName].wins++;
      else if (t.netPnl < 0) dayMap[dayName].losses++;
      dayMap[dayName].totalPnl += t.netPnl;
    });
    const dayOfWeekStats = Object.values(dayMap).map(d => ({
      ...d, winRate: Number(((d.wins / d.trades) * 100).toFixed(0)),
      avgPnl: Number((d.totalPnl / d.trades).toFixed(0)),
    })).sort((a, b) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(a.day) - ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(b.day));

    // Rule Adherence
    const ruleMap: Record<string, { followed: number; violated: number }> = {};
    rules.filter(r => r.isActive).forEach(r => { ruleMap[r.id] = { followed: 0, violated: 0 }; });
    accountTrades.forEach(t => {
      rules.filter(r => r.isActive).forEach(r => {
        if (t.rulesFollowed?.includes(r.id)) ruleMap[r.id].followed++;
        else ruleMap[r.id].violated++;
      });
    });
    const totalRuleChecks = Object.values(ruleMap).reduce((s, v) => s + v.followed + v.violated, 0);
    const totalFollowed = Object.values(ruleMap).reduce((s, v) => s + v.followed, 0);
    const ruleAdherenceRate = totalRuleChecks > 0 ? (totalFollowed / totalRuleChecks) * 100 : 0;
    const ruleViolations = Object.entries(ruleMap).map(([id, v]) => {
      const rule = rules.find(r => r.id === id);
      const total = v.followed + v.violated;
      return {
        ruleId: id, name: rule?.name || id, violatedCount: v.violated, total,
        rate: total > 0 ? (v.violated / total) * 100 : 0,
      };
    }).sort((a, b) => b.violatedCount - a.violatedCount);

    // Generate Insights
    const insights: string[] = [];
    if (winRate < 40) insights.push(`⚠️ Your win rate is only ${winRate.toFixed(0)}%. Focus on improving entry timing.`);
    if (winRate >= 50) insights.push(`✅ Solid ${winRate.toFixed(0)}% win rate. Your edge is mathematically positive.`);
    if (maxLossStreak >= 3) insights.push(`❌ You had ${maxLossStreak} consecutive losses. Consider reducing position size during drawdowns.`);
    if (ruleAdherenceRate < 60) insights.push(`📋 Rule adherence is only ${ruleAdherenceRate.toFixed(0)}%. Your discipline is costing you money.`);
    if (ruleAdherenceRate >= 80) insights.push(`🏆 Excellent ${ruleAdherenceRate.toFixed(0)}% rule adherence. Your discipline is your edge.`);
    if (bestTrade) insights.push(`📈 Best trade: ${(bestTrade as Trade).symbol} (+₹${(bestTrade as Trade).netPnl.toLocaleString('en-IN')}). Study what made it work.`);
    if (worstTrade) insights.push(`📉 Worst trade: ${(worstTrade as Trade).symbol} (-₹${Math.abs((worstTrade as Trade).netPnl).toLocaleString('en-IN')}). Review and learn.`);

    const revengeTrades = accountTrades.filter(t => t.emotion === 'Revenge');
    if (revengeTrades.length > 0) {
      const revengePnl = revengeTrades.reduce((s, t) => s + t.netPnl, 0);
      insights.push(`😡 Revenge trades lost you ₹${Math.abs(revengePnl).toLocaleString('en-IN')}. Stop trading after losses.`);
    }
    const confidenceTrades = accountTrades.filter(t => t.emotion === 'Confidence');
    if (confidenceTrades.length > 0) {
      const confWr = (confidenceTrades.filter(t => t.netPnl > 0).length / confidenceTrades.length * 100).toFixed(0);
      insights.push(`💪 Confidence trades have ${confWr}% win rate. Trust your best setups.`);
    }
    if (dayOfWeekStats.length > 0) {
      const bestDay = dayOfWeekStats.reduce((a, b) => a.totalPnl > b.totalPnl ? a : b);
      insights.push(`📅 Your best day is ${bestDay.day} with ₹${bestDay.totalPnl.toLocaleString('en-IN')} total PnL.`);
    }
    const mostBroken = ruleViolations.find(r => r.violatedCount > 0);
    if (mostBroken) insights.push(`⚠️ "${mostBroken.name}" is broken ${mostBroken.violatedCount} times (${mostBroken.rate.toFixed(0)}% violation rate).`);

    // === ADVANCED ANALYTICS ===

    // 1. Max Drawdown
    let peakBalance = activeAccount?.capital || 500000;
    let maxDrawdown = 0;
    let maxDrawdownPct = 0;
    const equityCurveWithDD = equityCurve.map(p => {
      if (p.balance > peakBalance) peakBalance = p.balance;
      const dd = peakBalance - p.balance;
      const ddPct = peakBalance > 0 ? (dd / peakBalance) * 100 : 0;
      if (dd > maxDrawdown) { maxDrawdown = dd; maxDrawdownPct = ddPct; }
      return { date: p.date, balance: p.balance, drawdown: -dd };
    });

    // 2. Avg Risk per Trade (using entryPrice * quantity * risk%)
    const riskPct = activeAccount?.riskPerTradePercent || 1;
    const avgRiskPerTrade = accountTrades.reduce((s, t) => s + (t.entryPrice * t.quantity * riskPct / 100), 0) / totalTrades;

    // 3. Risk-adjusted return
    const totalRiskTaken = accountTrades.reduce((s, t) => s + Math.abs(t.pnl), 0);
    const riskAdjustedReturn = totalRiskTaken > 0 ? totalNetPnL / totalRiskTaken : 0;

    // 4. Expectancy
    const winProb = totalTrades > 0 ? winsCount / totalTrades : 0;
    const lossProb = totalTrades > 0 ? lossesCount / totalTrades : 0;
    const expectancy = (winProb * avgNetWinVal) - (lossProb * avgNetLossVal);

    // 5. Current Streak
    let streakType: 'win' | 'loss' | 'none' = 'none';
    let streakCount = 0;
    for (let i = chronoTrades.length - 1; i >= 0; i--) {
      if (chronoTrades[i].netPnl > 0) {
        if (streakType === 'win') streakCount++;
        else { streakType = 'win'; streakCount = 1; }
      } else if (chronoTrades[i].netPnl < 0) {
        if (streakType === 'loss') streakCount++;
        else { streakType = 'loss'; streakCount = 1; }
      }
    }

    // 6. Setup Stats
    const setupMap: Record<string, { trades: number; wins: number; totalPnl: number }> = {};
    accountTrades.forEach(t => {
      const s = t.setup || 'Undefined';
      if (!setupMap[s]) setupMap[s] = { trades: 0, wins: 0, totalPnl: 0 };
      setupMap[s].trades++;
      if (t.netPnl > 0) setupMap[s].wins++;
      setupMap[s].totalPnl += t.netPnl;
    });
    const setupStats = Object.entries(setupMap).map(([setup, d]) => ({
      setup, trades: d.trades, wins: d.wins,
      winRate: Number(((d.wins / d.trades) * 100).toFixed(0)),
      totalPnl: d.totalPnl, avgPnl: Number((d.totalPnl / d.trades).toFixed(0)),
    })).sort((a, b) => b.totalPnl - a.totalPnl);

    // 7. Position Size Analysis
    const positionSizeAnalysis = chronoTrades.map(t => ({ quantity: t.quantity, pnl: t.netPnl }));

    // 8. Time of Day Analysis
    const periodMap: Record<string, { trades: number; wins: number; totalPnl: number }> = {};
    accountTrades.forEach(t => {
      let period = 'Unknown';
      if (t.entryTime) {
        const h = parseInt(t.entryTime.split(':')[0], 10);
        if (h >= 9 && h < 10) period = '9-10 AM (Open)';
        else if (h >= 10 && h < 12) period = '10-12 PM (Morning)';
        else if (h >= 12 && h < 14) period = '12-2 PM (Midday)';
        else if (h >= 14 && h < 15) period = '2-3 PM (Afternoon)';
        else period = '3+ PM (Close)';
      }
      if (!periodMap[period]) periodMap[period] = { trades: 0, wins: 0, totalPnl: 0 };
      periodMap[period].trades++;
      if (t.netPnl > 0) periodMap[period].wins++;
      periodMap[period].totalPnl += t.netPnl;
    });
    const timeOfDayStats = Object.entries(periodMap).map(([period, d]) => ({
      period, trades: d.trades, wins: d.wins,
      winRate: Number(((d.wins / d.trades) * 100).toFixed(0)),
      totalPnl: d.totalPnl,
    })).sort((a, b) => a.period.localeCompare(b.period));

    // 9. Mistake Analysis
    const mistakeMap: Record<string, { count: number; lossAmount: number }> = {};
    const lossTrades = accountTrades.filter(t => t.netPnl < 0);
    const totalLossAmount = lossTrades.reduce((s, t) => s + Math.abs(t.netPnl), 0);

    lossTrades.forEach(t => {
      // Check for rule violations
      const activeRuleCount = rules.filter(r => r.isActive).length;
      const violatedCount = activeRuleCount - (t.rulesFollowed?.length || 0);
      if (violatedCount > 0) {
        const key = 'Rule Violations';
        if (!mistakeMap[key]) mistakeMap[key] = { count: 0, lossAmount: 0 };
        mistakeMap[key].count++;
        mistakeMap[key].lossAmount += Math.abs(t.netPnl);
      }
      // Check for emotional trades
      if (['Revenge', 'FOMO', 'Fear', 'Greed'].includes(t.emotion)) {
        if (!mistakeMap[t.emotion]) mistakeMap[t.emotion] = { count: 0, lossAmount: 0 };
        mistakeMap[t.emotion].count++;
        mistakeMap[t.emotion].lossAmount += Math.abs(t.netPnl);
      }
      // Check for no stop loss
      if (!t.stopLoss) {
        const key = 'No Stop Loss';
        if (!mistakeMap[key]) mistakeMap[key] = { count: 0, lossAmount: 0 };
        mistakeMap[key].count++;
        mistakeMap[key].lossAmount += Math.abs(t.netPnl);
      }
    });
    const mistakeAnalysis = Object.entries(mistakeMap).map(([cat, d]) => ({
      category: cat, count: d.count, lossAmount: Number(d.lossAmount.toFixed(0)),
      pctOfLosses: totalLossAmount > 0 ? Number(((d.lossAmount / totalLossAmount) * 100).toFixed(0)) : 0,
    })).sort((a, b) => b.lossAmount - a.lossAmount);

    // 10. Risk per Trade Over Time
    const riskPerTradeOverTime = chronoTrades.map(t => {
      const actualRisk = Math.abs(t.pnl) / (t.entryPrice * t.quantity) * 100;
      return { date: t.date, riskPct: Number(actualRisk.toFixed(2)), pnl: t.netPnl };
    });

    // 12. Consistency Scoring
    // Discipline Score: based on rule adherence
    const disciplineScore = Math.min(100, ruleAdherenceRate);
    // Risk Score: based on max drawdown and risk consistency
    const riskScore = maxDrawdownPct <= 5 ? 100 : maxDrawdownPct <= 10 ? 80 : maxDrawdownPct <= 20 ? 50 : 25;
    // Execution Score: based on emotional control and setup adherence
    const emotionalTrades = accountTrades.filter(t => ['Revenge', 'FOMO', 'Fear', 'Greed'].includes(t.emotion)).length;
    const executionScore = totalTrades > 0 ? Math.round(((totalTrades - emotionalTrades) / totalTrades) * 100) : 50;
    // Overall consistency
    const consistencyScore = Math.round((disciplineScore * 0.35 + riskScore * 0.35 + executionScore * 0.3));

    // Add advanced insights
    if (maxDrawdownPct > 5) insights.push(`📉 Max drawdown is ₹${maxDrawdown.toLocaleString('en-IN')} (${maxDrawdownPct.toFixed(1)}%). Consider tighter risk controls.`);
    if (expectancy > 0) insights.push(`📊 Your system has POSITIVE expectancy of ₹${expectancy.toFixed(0)} per trade — edge confirmed.`);
    else insights.push(`⚠️ Your system has NEGATIVE expectancy. Review and refine your strategy.`);
    if (emotionalTrades > totalTrades * 0.3) insights.push(`🧠 ${(emotionalTrades / totalTrades * 100).toFixed(0)}% of trades are emotional. This is your biggest leak.`);
    if (mistakeAnalysis.length > 0) {
      const topMistake = mistakeAnalysis[0];
      insights.push(`💥 "${topMistake.category}" caused ${topMistake.pctOfLosses}% of your total losses.`);
    }

    return {
      totalPnL, totalNetPnL, totalCharges,
      winRate: Number(winRate.toFixed(1)),
      profitFactor: profitFactor === Infinity ? '∞' : Number(profitFactor.toFixed(2)),
      avgRR: validRRCount > 0 ? Number((sumRR / validRRCount).toFixed(2)) : 0,
      winsCount, lossesCount, breakEvenCount,
      avgWin: winsCount > 0 ? Number((sumProfits / winsCount).toFixed(2)) : 0,
      avgLoss: lossesCount > 0 ? Number((sumLosses / lossesCount).toFixed(2)) : 0,
      avgNetWin: winsCount > 0 ? Number((sumNetProfits / winsCount).toFixed(2)) : 0,
      avgNetLoss: lossesCount > 0 ? Number((sumNetLosses / lossesCount).toFixed(2)) : 0,
      maxWinStreak, maxLossStreak, bestTrade, worstTrade,
      equityCurve, currentBalance: runningBalance,
      emotionStats, dayOfWeekStats, ruleAdherenceRate, ruleViolations,
      insights: insights.slice(0, 8), ruleBreakdown: ruleMap,
      // Advanced Analytics
      maxDrawdown: Number(maxDrawdown.toFixed(0)),
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(1)),
      avgRiskPerTrade: Number(avgRiskPerTrade.toFixed(0)),
      riskAdjustedReturn: Number(riskAdjustedReturn.toFixed(2)),
      expectancy: Number(expectancy.toFixed(0)),
      consistencyScore,
      disciplineScore,
      riskScore,
      executionScore,
      currentStreak: { type: streakType, count: streakCount },
      longestWinStreak: maxWinStreak,
      longestLossStreak: maxLossStreak,
      avgWinDuration: 0,
      avgLossDuration: 0,
      setupStats,
      positionSizeAnalysis,
      timeOfDayStats,
      mistakeAnalysis,
      equityCurveWithDD,
      riskPerTradeOverTime,
    };
  }, [accountTrades, activeAccount, rules]);

  return {
    accounts, activeAccountId, activeAccount,
    trades: accountTrades, allTrades: trades,
    rules, stats,
    addTrade, importTrades, updateTrade, deleteTrade,
    createAccount, updateAccount, deleteAccount, selectAccount,
    addRule, updateRule, deleteRule,
    resetData,
  };
}
