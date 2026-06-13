import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Trade, TradingAccount, TradingRule, TradeCharges } from '../utils/types';
import {
  calculateTradePnL,
  calculateTradePnLPercent,
  calculateTradeRR,
  calculateNetPnl,
  calculateCharges,
  recalculateTrade,
  defaultRules,
  defaultCharges,
} from '../utils/tradeUtils';

// ────────────────────────────────────────────────────────────
//  TYPES
// ────────────────────────────────────────────────────────────

export interface AppState {
  user: { name: string; email: string };
  accounts: TradingAccount[];
  activeAccountId: string;
  trades: Trade[];
  rules: TradingRule[];
}

export interface AppContextType extends AppState {
  setUser: (data: Partial<{ name: string; email: string }>) => void;
  setActiveAccount: (id: string) => void;
  updateAccount: (id: string, data: Partial<TradingAccount>) => void;
  createAccount: (acc: Omit<TradingAccount, 'id' | 'createdAt' | 'isActive'>) => TradingAccount;
  deleteAccount: (id: string) => void;
  addTrade: (trade: Omit<Trade, 'id' | 'pnl' | 'pnlPercent' | 'rrRatio' | 'netPnl' | 'charges' | 'accountId' | 'rulesFollowed' | 'leverage'> & { id?: string; rulesFollowed?: string[]; leverage?: number }, charges?: TradeCharges, autoCalc?: boolean) => void;
  updateTrade: (id: string, data: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  importTrades: (trades: Trade[]) => void;
  addRule: (rule: Omit<TradingRule, 'id' | 'isDefault'>) => void;
  updateRule: (id: string, data: Partial<TradingRule>) => void;
  deleteRule: (id: string) => void;
  resetAll: () => void;
  activeAccount: TradingAccount | undefined;
  currency: string;
  accountTrades: Trade[];
  analytics: ReturnType<typeof computeAnalytics>;
}

// ────────────────────────────────────────────────────────────
//  STORAGE KEYS
// ────────────────────────────────────────────────────────────

const SK = {
  user: 'tradeflow_user',
  accounts: 'tradeflow_accounts',
  activeAccount: 'tradeflow_active_account',
  trades: 'tradeflow_trades',
  rules: 'tradeflow_rules',
};

function loadJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch {}
  return fallback;
}
function saveJSON(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`[Storage] Failed to save key "${key}" to localStorage:`, err);
  }
}

// ────────────────────────────────────────────────────────────
//  ANALYTICS
// ────────────────────────────────────────────────────────────

function computeAnalytics(trades: Trade[], rules: TradingRule[], capital: number, currency: string) {
  if (trades.length === 0) {
    return {
      totalPnL: 0, totalNetPnL: 0, totalCharges: 0, winRate: 0, profitFactor: 0, avgRR: 0,
      winsCount: 0, lossesCount: 0, breakEvenCount: 0, avgWin: 0, avgLoss: 0, avgNetWin: 0, avgNetLoss: 0,
      maxWinStreak: 0, maxLossStreak: 0, currentStreak: { type: 'none' as const, count: 0 },
      bestTrade: null as Trade | null, worstTrade: null as Trade | null,
      equityCurve: [{ date: 'Start', balance: capital, netPnl: 0 }],
      currentBalance: capital, ruleAdherenceRate: 100,
      ruleViolations: [] as Array<{ ruleId: string; name: string; violatedCount: number; total: number; rate: number }>,
      disciplineScore: 0, riskScore: 0, executionScore: 0, consistencyScore: 0,
      emotionStats: [] as Array<{ emotion: string; trades: number; wins: number; losses: number; winRate: number; totalPnl: number; avgPnl: number }>,
      dayStats: [] as Array<{ day: string; trades: number; wins: number; losses: number; winRate: number; totalPnl: number; avgPnl: number }>,
      setupStats: [] as Array<{ setup: string; trades: number; wins: number; losses: number; winRate: number; totalPnl: number; avgPnl: number }>,
      timeStats: [] as Array<{ period: string; trades: number; wins: number; winRate: number; totalPnl: number }>,
      avgRiskPerTrade: capital * 0.01, maxDrawdown: 0, maxDrawdownPct: 0, riskAdjustedReturn: 0, expectancy: 0,
      currency,
      mostTradedSymbol: '', bestDay: '', worstSetup: '', avgHoldTime: 0,
      longPnl: 0, shortPnl: 0, longWinRate: 0, shortWinRate: 0,
      todayPnl: 0, currentStreakCount: 0,
    };
  }

  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let totalPnL = 0, totalNetPnL = 0, totalChargesVal = 0;
  let wins = 0, losses = 0, be = 0;
  let sumWins = 0, sumLosses = 0, sumNetWins = 0, sumNetLosses = 0;
  let sumRR = 0, validRR = 0;
  let maxWS = 0, maxLS = 0, curWS = 0, curLS = 0;
  let best: Trade | null = null, worst: Trade | null = null;
  let peak = capital, maxDD = 0;
  let runningBalance = capital;
  const curve = [{ date: 'Start', balance: capital, netPnl: 0 }];

  const emoMap: Record<string, { trades: number; wins: number; losses: number; totalPnl: number }> = {};
  const dayMap: Record<string, { trades: number; wins: number; losses: number; totalPnl: number }> = {};
  const setupMap: Record<string, { trades: number; wins: number; losses: number; totalPnl: number }> = {};
  const timeMap: Record<string, { trades: number; wins: number; totalPnl: number }> = {};
  const symbolMap: Record<string, { trades: number; pnl: number }> = {};
  let longPnl = 0, shortPnl = 0, longWins = 0, longTotal = 0, shortWins = 0, shortTotal = 0;
  let todayPnl = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const t of sorted) {
    totalPnL += t.pnl;
    totalNetPnL += t.netPnl;
    totalChargesVal += t.charges.total;
    runningBalance += t.netPnl;
    if (runningBalance > peak) peak = runningBalance;
    const dd = peak - runningBalance;
    if (dd > maxDD) maxDD = dd;
    curve.push({ date: t.date, balance: runningBalance, netPnl: t.netPnl });

    const isWin = t.netPnl > 0;
    const isLoss = t.netPnl < 0;
    if (isWin) { wins++; sumWins += t.pnl; sumNetWins += t.netPnl; curWS++; curLS = 0; maxWS = Math.max(maxWS, curWS); }
    else if (isLoss) { losses++; sumLosses += Math.abs(t.pnl); sumNetLosses += Math.abs(t.netPnl); curLS++; curWS = 0; maxLS = Math.max(maxLS, curLS); }
    else be++;

    if (t.date === today) todayPnl += t.netPnl;

    if (!best || t.netPnl > best.netPnl) best = t;
    if (!worst || t.netPnl < worst.netPnl) worst = t;
    if (t.rrRatio && !isNaN(t.rrRatio)) { sumRR += t.rrRatio; validRR++; }

    if (t.type === 'BUY') { longPnl += t.netPnl; longTotal++; if (isWin) longWins++; }
    else { shortPnl += t.netPnl; shortTotal++; if (isWin) shortWins++; }

    if (!emoMap[t.emotion]) emoMap[t.emotion] = { trades: 0, wins: 0, losses: 0, totalPnl: 0 };
    emoMap[t.emotion].trades++;
    if (isWin) emoMap[t.emotion].wins++; else if (isLoss) emoMap[t.emotion].losses++;
    emoMap[t.emotion].totalPnl += t.netPnl;

    const day = new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    if (!dayMap[day]) dayMap[day] = { trades: 0, wins: 0, losses: 0, totalPnl: 0 };
    dayMap[day].trades++;
    if (isWin) dayMap[day].wins++; else if (isLoss) dayMap[day].losses++;
    dayMap[day].totalPnl += t.netPnl;

    const s = t.setup || 'Undefined';
    if (!setupMap[s]) setupMap[s] = { trades: 0, wins: 0, losses: 0, totalPnl: 0 };
    setupMap[s].trades++;
    if (isWin) setupMap[s].wins++; else if (isLoss) setupMap[s].losses++;
    setupMap[s].totalPnl += t.netPnl;

    if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { trades: 0, pnl: 0 };
    symbolMap[t.symbol].trades++;
    symbolMap[t.symbol].pnl += t.netPnl;

    let period = 'Unknown';
    if (t.entryTime) {
      const h = parseInt(t.entryTime.split(':')[0], 10);
      if (h >= 9 && h < 10) period = '9-10 AM';
      else if (h >= 10 && h < 12) period = '10-12 PM';
      else if (h >= 12 && h < 14) period = '12-2 PM';
      else if (h >= 14 && h < 15) period = '2-3 PM';
      else period = '3+ PM';
    }
    if (!timeMap[period]) timeMap[period] = { trades: 0, wins: 0, totalPnl: 0 };
    timeMap[period].trades++;
    if (isWin) timeMap[period].wins++;
    timeMap[period].totalPnl += t.netPnl;
  }

  const total = sorted.length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const pf = sumNetLosses > 0 ? sumNetWins / sumNetLosses : sumNetWins > 0 ? 999 : 0;
  const avgWinVal = wins > 0 ? sumNetWins / wins : 0;
  const avgLossVal = losses > 0 ? sumNetLosses / losses : 0;
  const expectancy = total > 0 ? ((wins / total) * avgWinVal) - ((losses / total) * avgLossVal) : 0;

  const dateCounts: Record<string, number> = {};
  for (const t of sorted) {
    dateCounts[t.date] = (dateCounts[t.date] || 0) + 1;
  }

  const activeRules = rules.filter(r => r.isActive);
  let ruleTotal = 0, rulePassed = 0;
  const violationMap: Record<string, { name: string; count: number; total: number }> = {};
  for (const t of sorted) {
    for (const r of activeRules) {
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
            const riskPercent = capital > 0 ? (riskAmount / capital) * 100 : 0;
            wasFollowed = riskPercent <= 2;
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
        rulePassed++;
      } else {
        if (!violationMap[r.id]) {
          violationMap[r.id] = { name: r.name, count: 0, total: 0 };
        }
        violationMap[r.id].count++;
      }
      if (violationMap[r.id]) {
        violationMap[r.id].total++;
      }
    }
  }
  const adherence = ruleTotal > 0 ? (rulePassed / ruleTotal) * 100 : 100;

  const discScore = Math.round(adherence);
  const maxDDPct = peak > 0 ? (maxDD / peak) * 100 : 0;
  const riskScore = maxDDPct > 20 ? 25 : maxDDPct > 10 ? 50 : maxDDPct > 5 ? 75 : 100;
  const emotionalCount = sorted.filter(t => ['Revenge', 'FOMO', 'Fear', 'Greed'].includes(t.emotion)).length;
  const execScore = total > 0 ? Math.round(((total - emotionalCount) / total) * 100) : 50;
  const consistScore = Math.round(discScore * 0.35 + riskScore * 0.35 + execScore * 0.3);

  const mostTradedSymbol = Object.entries(symbolMap).sort((a, b) => b[1].trades - a[1].trades)[0]?.[0] || '';
  const bestDayEntry = Object.entries(dayMap).sort((a, b) => b[1].totalPnl - a[1].totalPnl)[0];
  const worstSetupEntry = Object.entries(setupMap).filter(([s]) => s !== 'Undefined').sort((a, b) => a[1].totalPnl - b[1].totalPnl)[0];

  return {
    totalPnL: Math.round(totalPnL), totalNetPnL: Math.round(totalNetPnL), totalCharges: Math.round(totalChargesVal),
    winRate: Math.round(winRate * 10) / 10, profitFactor: pf === 999 ? '∞' : Math.round(pf * 100) / 100,
    avgRR: validRR > 0 ? Math.round((sumRR / validRR) * 100) / 100 : 0,
    winsCount: wins, lossesCount: losses, breakEvenCount: be,
    avgWin: Math.round(avgWinVal), avgLoss: Math.round(avgLossVal), avgNetWin: Math.round(avgWinVal), avgNetLoss: Math.round(avgLossVal),
    maxWinStreak: maxWS, maxLossStreak: maxLS,
    currentStreak: curWS > 0 ? { type: 'win' as const, count: curWS } : curLS > 0 ? { type: 'loss' as const, count: curLS } : { type: 'none' as const, count: 0 },
    bestTrade: best, worstTrade: worst,
    equityCurve: curve, currentBalance: Math.round(runningBalance),
    ruleAdherenceRate: Math.round(adherence),
    ruleViolations: Object.entries(violationMap).map(([id, v]: [string, any]) => ({
      ruleId: id, name: v.name, violatedCount: v.count, total: v.total, rate: v.total > 0 ? Math.round((v.count / v.total) * 100) : 0,
    })),
    disciplineScore: discScore, riskScore, executionScore: execScore, consistencyScore: consistScore,
    emotionStats: Object.entries(emoMap).map(([k, v]: [string, any]) => ({
      emotion: k, trades: v.trades, wins: v.wins, losses: v.losses,
      winRate: v.trades > 0 ? Math.round((v.wins / v.trades) * 100) : 0,
      totalPnl: Math.round(v.totalPnl), avgPnl: v.trades > 0 ? Math.round(v.totalPnl / v.trades) : 0,
    })),
    dayStats: Object.entries(dayMap).map(([k, v]: [string, any]) => ({
      day: k, trades: v.trades, wins: v.wins, losses: v.losses,
      winRate: v.trades > 0 ? Math.round((v.wins / v.trades) * 100) : 0,
      totalPnl: Math.round(v.totalPnl), avgPnl: v.trades > 0 ? Math.round(v.totalPnl / v.trades) : 0,
    })),
    setupStats: Object.entries(setupMap).map(([k, v]: [string, any]) => ({
      setup: k, trades: v.trades, wins: v.wins, losses: v.losses,
      winRate: v.trades > 0 ? Math.round((v.wins / v.trades) * 100) : 0,
      totalPnl: Math.round(v.totalPnl), avgPnl: v.trades > 0 ? Math.round(v.totalPnl / v.trades) : 0,
    })),
    timeStats: Object.entries(timeMap).map(([k, v]: [string, any]) => ({
      period: k, trades: v.trades, wins: v.wins,
      winRate: v.trades > 0 ? Math.round((v.wins / v.trades) * 100) : 0, totalPnl: Math.round(v.totalPnl),
    })),
    avgRiskPerTrade: capital > 0 ? Math.round(Math.abs(totalNetPnL) / total) : 0,
    maxDrawdown: Math.round(maxDD), maxDrawdownPct: Math.round(maxDDPct * 10) / 10,
    riskAdjustedReturn: total !== 0 && avgWinVal > 0 ? Math.round((totalNetPnL / (avgWinVal * total)) * 100) / 100 : 0,
    expectancy: Math.round(expectancy),
    currency,
    mostTradedSymbol,
    bestDay: bestDayEntry ? bestDayEntry[0] : '',
    worstSetup: worstSetupEntry ? worstSetupEntry[0] : '',
    avgHoldTime: 0,
    longPnl: Math.round(longPnl), shortPnl: Math.round(shortPnl),
    longWinRate: longTotal > 0 ? Math.round((longWins / longTotal) * 100) : 0,
    shortWinRate: shortTotal > 0 ? Math.round((shortWins / shortTotal) * 100) : 0,
    todayPnl: Math.round(todayPnl), currentStreakCount: curWS > 0 ? curWS : curLS > 0 ? curLS : 0,
  };
}

// ────────────────────────────────────────────────────────────
//  CONTEXT
// ────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState(() => loadJSON(SK.user, { name: '', email: '' }));
  const [accounts, setAccounts] = useState<TradingAccount[]>(() => loadJSON<TradingAccount[]>(SK.accounts, []));
  const [activeAccountId, setActiveAccountIdState] = useState(() => localStorage.getItem(SK.activeAccount) || '');
  const [trades, setTrades] = useState<Trade[]>(() => loadJSON<Trade[]>(SK.trades, []));
  const [rules, setRules] = useState<TradingRule[]>(() => loadJSON<TradingRule[]>(SK.rules, defaultRules));

  useEffect(() => { saveJSON(SK.user, user); }, [user]);
  useEffect(() => { saveJSON(SK.accounts, accounts); }, [accounts]);
  useEffect(() => { saveJSON(SK.activeAccount, activeAccountId); }, [activeAccountId]);
  useEffect(() => { saveJSON(SK.trades, trades); }, [trades]);
  useEffect(() => { saveJSON(SK.rules, rules); }, [rules]);

  // Get active account safely, ensure no duplicates
  const dedupedAccounts = useMemo(() => {
    const seen = new Set<string>();
    return accounts.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [accounts]);

  const activeAccount = dedupedAccounts.find(a => a.id === activeAccountId) || dedupedAccounts[0];
  const currency = activeAccount?.currencyCode || 'USD';
  const accountTrades = trades.filter(t => t.accountId === activeAccountId);

  // Sync activeAccountId State with activeAccount when diverged
  useEffect(() => {
    if (activeAccount && activeAccountId !== activeAccount.id) {
      setActiveAccountIdState(activeAccount.id);
    }
  }, [activeAccount, activeAccountId]);

  // Self-heal historical trades that lack an accountId
  useEffect(() => {
    if (activeAccountId && trades.some(t => !t.accountId)) {
      setTrades(prev => prev.map(t => {
        if (!t.accountId) {
          return { ...t, accountId: activeAccountId };
        }
        return t;
      }));
    }
  }, [activeAccountId, trades]);

  const setUser = useCallback((data: Partial<{ name: string; email: string }>) => setUserState(prev => ({ ...prev, ...data })), []);
  const setActiveAccount = useCallback((id: string) => setActiveAccountIdState(id), []);

  const updateAccount = useCallback((id: string, data: Partial<TradingAccount>) => {
    setAccounts(prev => {
      // Remove duplicates first
      const seen = new Set<string>();
      const deduped = prev.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      return deduped.map(a => a.id === id ? { ...a, ...data } : a);
    });
  }, []);

  const createAccount = useCallback((acc: Omit<TradingAccount, 'id' | 'createdAt' | 'isActive'>) => {
    const newAcc: TradingAccount = {
      ...acc,
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString().split('T')[0],
      isActive: false,
    };
    setAccounts(prev => {
      const deduped = prev.filter(a => {
        const seen = new Set<string>();
        return !seen.has(a.id) && seen.add(a.id);
      });
      return [...deduped, newAcc];
    });
    return newAcc;
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => {
      const remaining = prev.filter(a => a.id !== id);
      if (activeAccountId === id && remaining.length > 0) setActiveAccountIdState(remaining[0].id);
      return remaining;
    });
  }, [activeAccountId]);

  const addTrade = useCallback((trade: Omit<Trade, 'id' | 'pnl' | 'pnlPercent' | 'rrRatio' | 'netPnl' | 'charges' | 'accountId' | 'rulesFollowed' | 'leverage'> & { id?: string; rulesFollowed?: string[]; leverage?: number }, charges?: TradeCharges, autoCalc = true) => {
    const lev = trade.leverage || 1;
    const ac = autoCalc ? calculateCharges(trade.segment || 'EQ', trade.type, trade.entryPrice, trade.exitPrice, trade.quantity, activeAccount?.brokeragePerOrder || 20, activeAccount?.brokeragePercent || 0) : (charges || defaultCharges);
    const pnl = calculateTradePnL(trade.type, trade.entryPrice, trade.exitPrice, trade.quantity);
    const netPnl = calculateNetPnl(pnl, ac);
    setTrades(prev => [{
      ...trade, id: trade.id || `t_${Date.now()}`, pnl: Math.round(pnl),
      pnlPercent: calculateTradePnLPercent(trade.type, trade.entryPrice, trade.exitPrice, trade.quantity),
      rrRatio: calculateTradeRR(trade.type, trade.entryPrice, trade.exitPrice, trade.stopLoss),
      netPnl: Math.round(netPnl), charges: ac, segment: trade.segment || 'EQ',
      accountId: activeAccountId, rulesFollowed: trade.rulesFollowed || [], leverage: lev,
    }, ...prev]);
  }, [activeAccountId, activeAccount]);

  const updateTrade = useCallback((id: string, data: Partial<Trade>) => {
    setTrades(prev => prev.map(t => t.id === id ? recalculateTrade({ ...t, ...data }, activeAccount?.brokeragePerOrder || 20, activeAccount?.brokeragePercent || 0) : t));
  }, [activeAccount]);

  const deleteTrade = useCallback((id: string) => setTrades(prev => prev.filter(t => t.id !== id)), []);
  const importTrades = useCallback((newTrades: Trade[]) => {
    const rec = newTrades.map(t => {
      const tradeWithAccount = { ...t, accountId: activeAccountId };
      return recalculateTrade(tradeWithAccount, activeAccount?.brokeragePerOrder || 20, activeAccount?.brokeragePercent || 0, true);
    });
    setTrades(prev => [...rec, ...prev]);
  }, [activeAccount, activeAccountId]);

  const addRule = useCallback((rule: Omit<TradingRule, 'id' | 'isDefault'>) => {
    setRules(prev => [...prev, { ...rule, id: `r_${Date.now()}`, isDefault: false }]);
  }, []);
  const updateRule = useCallback((id: string, data: Partial<TradingRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  }, []);
  const deleteRule = useCallback((id: string) => {
    setRules(prev => prev.filter(r => r.isDefault || r.id !== id));
    setTrades(prev => prev.map(t => ({ ...t, rulesFollowed: t.rulesFollowed.filter(rid => rid !== id) })));
  }, []);
  const resetAll = useCallback(() => {
    setTrades([]);
    setAccounts([]);
    setRules(defaultRules);
    setActiveAccountIdState('');
    // Safely remove only specific item keys to preserve session auth token
    localStorage.removeItem(SK.accounts);
    localStorage.removeItem(SK.activeAccount);
    localStorage.removeItem(SK.trades);
    localStorage.removeItem(SK.rules);
  }, []);

  const analytics = useMemo(() => computeAnalytics(accountTrades, rules, activeAccount?.capital || 0, currency), [accountTrades, rules, activeAccount, currency]);

  return (
    <AppContext.Provider value={{
      user, currency, accounts: dedupedAccounts, activeAccountId, trades, rules,
      setUser, setActiveAccount, updateAccount, createAccount, deleteAccount,
      addTrade, updateTrade, deleteTrade, importTrades,
      addRule, updateRule, deleteRule, resetAll,
      activeAccount, accountTrades, analytics,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
