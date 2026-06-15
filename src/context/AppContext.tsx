import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Trade, TradingAccount, TradingRule, TradeCharges } from '../utils/types';
import { supabase } from '../utils/supabaseClient';
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
  loading: boolean;
  setUser: (data: Partial<{ name: string; email: string }>) => void;
  setActiveAccount: (id: string) => void;
  updateAccount: (id: string, data: Partial<TradingAccount>) => void;
  createAccount: (acc: Omit<TradingAccount, 'id' | 'createdAt' | 'isActive'>) => TradingAccount;
  deleteAccount: (id: string) => void;
  addTrade: (trade: Omit<Trade, 'id' | 'pnl' | 'pnlPercent' | 'rrRatio' | 'netPnl' | 'charges' | 'accountId' | 'rulesFollowed' | 'leverage'> & { id?: string; rulesFollowed?: string[]; leverage?: number; strategy?: string; screenshotUrls?: string[] }, charges?: TradeCharges, autoCalc?: boolean) => void;
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

const AppContext = createContext<AppContextType | null>(null);

function mapDbAccount(a: any): TradingAccount {
  return {
    id: a.id,
    name: a.name,
    tag: a.tag as any,
    accountType: a.account_type || undefined,
    capital: Number(a.capital),
    riskPerTradePercent: Number(a.risk_per_trade_percent),
    brokerType: a.broker_type as any,
    brokeragePerOrder: Number(a.brokerage_per_order),
    brokeragePercent: Number(a.brokerage_percent),
    currencyCode: a.currency_code,
    isActive: a.is_active,
    createdAt: a.created_at,
  };
}

function mapDbRule(r: any): TradingRule {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category as any,
    type: r.type as any,
    threshold: r.threshold ? Number(r.threshold) : undefined,
    isActive: r.is_active,
    isDefault: r.is_default,
  };
}

function mapDbTrade(t: any): Trade {
  return {
    id: t.id,
    date: t.trade_date,
    symbol: t.symbol,
    type: t.type as any,
    entryPrice: Number(t.entry_price),
    exitPrice: Number(t.exit_price),
    quantity: Number(t.quantity),
    leverage: Number(t.leverage),
    stopLoss: t.stop_loss ? Number(t.stop_loss) : undefined,
    target: t.target ? Number(t.target) : undefined,
    notes: t.notes || '',
    emotion: t.emotion,
    pnl: Number(t.pnl),
    pnlPercent: Number(t.pnl_percent),
    rrRatio: Number(t.rr_ratio),
    netPnl: Number(t.net_pnl),
    charges: t.charges,
    segment: t.segment,
    accountId: t.account_id,
    rulesFollowed: t.rules_followed || [],
    setup: t.setup || undefined,
    entryTime: t.entry_time || undefined,
    exitTime: t.exit_time || undefined,
    screenshotUrls: t.screenshot_urls || [],
    strategy: t.strategy || undefined,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState(() => localStorage.getItem(SK.activeAccount) || '');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rules, setRules] = useState<TradingRule[]>(defaultRules);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[Auth] Initializing auth listeners");
    console.log("Current URL:", window.location.href);
    console.log("Search Params:", window.location.search);
    console.log("Hash:", window.location.hash);
    console.log("[Auth] URL Search Parameters:", window.location.search);
    console.log("[Auth] URL Hash Parameters:", window.location.hash);

    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    const error = urlParams.get('error') || hashParams.get('error');
    const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');
    const code = urlParams.get('code') || hashParams.get('code');

    if (error) {
      console.error("[Auth] OAuth redirection error detected:", error, "-", errorDesc);
    }
    if (code) {
      console.log("[Auth] OAuth code parameter detected in URL:", code);
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[Auth] getSession error:", error);
      }
      console.log("[Auth] getSession result - Session exists:", !!session);
      if (session) {
        console.log("[Auth] Current user metadata:", session.user.user_metadata);
        setUserState({
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'Trader',
          email: session.user.email || '',
        });
        loadUserData(session.user.id);
      } else {
        setUserState({ name: '', email: '' });
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[Auth] onAuthStateChange triggered - Event:", event, "Session exists:", !!session);
      
      // Explicitly log required auth events
      if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'].includes(event)) {
        console.log(`[Auth] Detailed Auth Event: ${event}`, {
          userEmail: session?.user?.email,
          sessionActive: !!session
        });
      }

      if (session) {
        console.log("[Auth] Session details:", {
          id: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata
        });
        setUserState({
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'Trader',
          email: session.user.email || '',
        });
        loadUserData(session.user.id);
      } else {
        setUserState({ name: '', email: '' });
        setAccounts([]);
        setTrades([]);
        setRules(defaultRules);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async (userId: string) => {
    console.log("[Auth] loadUserData initiated for userId:", userId);
    setLoading(true);
    try {
      // Fetch or automatically create profile
      const { data: profile, error: profileErr } = await supabase.from('profiles').select('name').eq('id', userId).single();
      if (profileErr) {
        console.log("[Auth] Profiles fetch result/error:", profileErr.message);
      }
      let profileName = '';
      if (profile?.name) {
        profileName = profile.name;
        console.log("[Auth] Existing profile found with name:", profileName);
      } else {
        console.log("[Auth] Profile not found. Attempting automatic profile creation.");
        const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          console.error("[Auth] getUser error during fallback lookup:", userErr);
        }
        const fallbackName = authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || 'Trader';
        console.log("[Auth] Inserting fallback profile for user, name:", fallbackName);
        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            name: fallbackName,
            email: authUser?.email || '',
          })
          .select()
          .single();
        
        if (insertErr) {
          console.error("[Auth] Profile automatic insert failed:", insertErr);
        } else {
          console.log("[Auth] Profile automatic insert succeeded:", newProfile);
        }
        profileName = newProfile?.name || fallbackName;
      }

      if (profileName) {
        setUserState(prev => ({ ...prev, name: profileName }));
      }

      const { data: dbAccs } = await supabase.from('accounts').select('*').eq('user_id', userId);
      let mappedAccs: TradingAccount[] = [];
      if (dbAccs) {
        mappedAccs = dbAccs.map(mapDbAccount);
        setAccounts(mappedAccs);
      }

      const { data: dbRules } = await supabase.from('rules').select('*').eq('user_id', userId);
      if (dbRules && dbRules.length > 0) {
        setRules(dbRules.map(mapDbRule));
      } else {
        const rulesToInsert = defaultRules.map(r => ({
          id: r.id,
          user_id: userId,
          name: r.name,
          description: r.description,
          category: r.category,
          type: r.type,
          threshold: r.threshold || null,
          is_active: r.isActive,
          is_default: r.isDefault,
        }));
        await supabase.from('rules').insert(rulesToInsert);
        setRules(defaultRules);
      }

      const { data: dbTrades } = await supabase.from('trades').select('*').eq('user_id', userId);
      if (dbTrades) {
        setTrades(dbTrades.map(mapDbTrade));
      }
    } catch (err) {
      console.error('Error loading Supabase user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const dedupedAccounts = useMemo(() => {
    const seen = new Set<string>();
    return accounts.filter(a => !seen.has(a.id) && seen.add(a.id));
  }, [accounts]);

  const activeAccount = dedupedAccounts.find(a => a.id === activeAccountId) || dedupedAccounts[0];
  const currency = activeAccount?.currencyCode || 'INR';
  const accountTrades = trades.filter(t => t.accountId === activeAccountId);

  useEffect(() => {
    if (activeAccount && activeAccountId !== activeAccount.id) {
      setActiveAccountIdState(activeAccount.id);
      localStorage.setItem(SK.activeAccount, activeAccount.id);
    }
  }, [activeAccount, activeAccountId]);

  const setUser = useCallback((data: Partial<{ name: string; email: string }>) => {
    setUserState(prev => {
      const next = { ...prev, ...data };
      if (data.name) {
        (async () => {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            await supabase.from('profiles').update({ name: data.name }).eq('id', authUser.id);
          }
        })();
      }
      return next;
    });
  }, []);

  const setActiveAccount = useCallback((id: string) => {
    setActiveAccountIdState(id);
    localStorage.setItem(SK.activeAccount, id);
  }, []);

  const updateAccount = useCallback(async (id: string, data: Partial<TradingAccount>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    await supabase.from('accounts').update({
      name: data.name,
      tag: data.tag,
      account_type: data.accountType,
      capital: data.capital,
      risk_per_trade_percent: data.riskPerTradePercent,
      broker_type: data.brokerType,
      brokerage_per_order: data.brokeragePerOrder,
      brokerage_percent: data.brokeragePercent,
      currency_code: data.currencyCode,
      is_active: data.isActive,
    }).eq('id', id);
  }, []);

  const createAccount = useCallback((acc: Omit<TradingAccount, 'id' | 'createdAt' | 'isActive'>) => {
    const newAcc: TradingAccount = {
      ...acc,
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString().split('T')[0],
      isActive: false,
    };

    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase.from('accounts').insert({
        id: newAcc.id,
        user_id: authUser.id,
        name: newAcc.name,
        tag: newAcc.tag,
        account_type: newAcc.accountType || null,
        capital: newAcc.capital,
        risk_per_trade_percent: newAcc.riskPerTradePercent,
        broker_type: newAcc.brokerType,
        brokerage_per_order: newAcc.brokeragePerOrder,
        brokerage_percent: newAcc.brokeragePercent,
        currency_code: newAcc.currencyCode,
        is_active: newAcc.isActive,
        created_at: newAcc.createdAt,
      });
    })();

    setAccounts(prev => [...prev, newAcc]);
    return newAcc;
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    setAccounts(prev => {
      const remaining = prev.filter(a => a.id !== id);
      if (activeAccountId === id && remaining.length > 0) {
        setActiveAccountIdState(remaining[0].id);
        localStorage.setItem(SK.activeAccount, remaining[0].id);
      }
      return remaining;
    });
    await supabase.from('accounts').delete().eq('id', id);
  }, [activeAccountId]);

  const addTrade = useCallback((trade: Omit<Trade, 'id' | 'pnl' | 'pnlPercent' | 'rrRatio' | 'netPnl' | 'charges' | 'accountId' | 'rulesFollowed' | 'leverage'> & { id?: string; rulesFollowed?: string[]; leverage?: number; strategy?: string; screenshotUrls?: string[] }, charges?: TradeCharges, autoCalc = true) => {
    const lev = trade.leverage || 1;
    const ac = autoCalc ? calculateCharges(trade.segment || 'EQ', trade.type, trade.entryPrice, trade.exitPrice, trade.quantity, activeAccount?.brokeragePerOrder || 20, activeAccount?.brokeragePercent || 0) : (charges || defaultCharges);
    const pnl = calculateTradePnL(trade.type, trade.entryPrice, trade.exitPrice, trade.quantity);
    const netPnl = calculateNetPnl(pnl, ac);
    const newTrade: Trade = {
      ...trade, id: trade.id || `t_${Date.now()}`, pnl: Math.round(pnl),
      pnlPercent: calculateTradePnLPercent(trade.type, trade.entryPrice, trade.exitPrice, trade.quantity),
      rrRatio: calculateTradeRR(trade.type, trade.entryPrice, trade.exitPrice, trade.stopLoss),
      netPnl: Math.round(netPnl), charges: ac, segment: trade.segment || 'EQ',
      accountId: activeAccountId, rulesFollowed: trade.rulesFollowed || [], leverage: lev,
      strategy: trade.strategy || undefined, screenshotUrls: trade.screenshotUrls || [],
    };

    setTrades(prev => [newTrade, ...prev]);

    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase.from('trades').insert({
        id: newTrade.id,
        user_id: authUser.id,
        account_id: activeAccountId,
        trade_date: newTrade.date,
        symbol: newTrade.symbol,
        type: newTrade.type,
        entry_price: newTrade.entryPrice,
        exit_price: newTrade.exitPrice,
        quantity: newTrade.quantity,
        leverage: newTrade.leverage,
        stop_loss: newTrade.stopLoss || null,
        target: newTrade.target || null,
        notes: newTrade.notes,
        emotion: newTrade.emotion,
        screenshot_urls: newTrade.screenshotUrls,
        strategy: newTrade.strategy || null,
        pnl: newTrade.pnl,
        pnl_percent: newTrade.pnlPercent,
        rr_ratio: newTrade.rrRatio,
        net_pnl: newTrade.netPnl,
        charges: newTrade.charges,
        segment: newTrade.segment,
        rules_followed: newTrade.rulesFollowed,
        setup: newTrade.setup || null,
        entry_time: newTrade.entryTime || null,
        exit_time: newTrade.exitTime || null,
      });
    })();
  }, [activeAccountId, activeAccount]);

  const updateTrade = useCallback((id: string, data: Partial<Trade>) => {
    setTrades(prev => prev.map(t => {
      if (t.id === id) {
        const updated = recalculateTrade({ ...t, ...data }, activeAccount?.brokeragePerOrder || 20, activeAccount?.brokeragePercent || 0);
        (async () => {
          await supabase.from('trades').update({
            trade_date: updated.date,
            symbol: updated.symbol,
            type: updated.type,
            entry_price: updated.entryPrice,
            exit_price: updated.exitPrice,
            quantity: updated.quantity,
            leverage: updated.leverage,
            stop_loss: updated.stopLoss || null,
            target: updated.target || null,
            notes: updated.notes,
            emotion: updated.emotion,
            screenshot_urls: updated.screenshotUrls,
            strategy: updated.strategy || null,
            pnl: updated.pnl,
            pnl_percent: updated.pnlPercent,
            rr_ratio: updated.rrRatio,
            net_pnl: updated.netPnl,
            charges: updated.charges,
            segment: updated.segment,
            rules_followed: updated.rulesFollowed,
            setup: updated.setup || null,
            entry_time: updated.entryTime || null,
            exit_time: updated.exitTime || null,
          }).eq('id', id);
        })();
        return updated;
      }
      return t;
    }));
  }, [activeAccount]);

  const deleteTrade = useCallback((id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
    (async () => {
      await supabase.from('trades').delete().eq('id', id);
    })();
  }, []);

  const importTrades = useCallback((newTrades: Trade[]) => {
    const rec = newTrades.map(t => {
      const tradeWithAccount = { ...t, accountId: activeAccountId };
      return recalculateTrade(tradeWithAccount, activeAccount?.brokeragePerOrder || 20, activeAccount?.brokeragePercent || 0, true);
    });
    setTrades(prev => [...rec, ...prev]);

    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const inserts = rec.map(trade => ({
        id: trade.id || `t_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        user_id: authUser.id,
        account_id: activeAccountId,
        trade_date: trade.date,
        symbol: trade.symbol,
        type: trade.type,
        entry_price: trade.entryPrice,
        exit_price: trade.exitPrice,
        quantity: trade.quantity,
        leverage: trade.leverage || 1,
        stop_loss: trade.stopLoss || null,
        target: trade.target || null,
        notes: trade.notes || '',
        emotion: trade.emotion || 'Confidence',
        screenshot_urls: trade.screenshotUrls || [],
        strategy: trade.strategy || null,
        pnl: trade.pnl,
        pnl_percent: trade.pnlPercent,
        rr_ratio: trade.rrRatio,
        net_pnl: trade.netPnl,
        charges: trade.charges,
        segment: trade.segment,
        rules_followed: trade.rulesFollowed || [],
        setup: trade.setup || null,
        entry_time: trade.entryTime || null,
        exit_time: trade.exitTime || null,
      }));

      await supabase.from('trades').insert(inserts);
    })();
  }, [activeAccount, activeAccountId]);

  const addRule = useCallback((rule: Omit<TradingRule, 'id' | 'isDefault'>) => {
    const newRule: TradingRule = { ...rule, id: `r_${Date.now()}`, isDefault: false };
    setRules(prev => [...prev, newRule]);

    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase.from('rules').insert({
        id: newRule.id,
        user_id: authUser.id,
        name: newRule.name,
        description: newRule.description,
        category: newRule.category,
        type: newRule.type,
        threshold: newRule.threshold || null,
        is_active: newRule.isActive,
        is_default: newRule.isDefault,
      });
    })();
  }, []);

  const updateRule = useCallback((id: string, data: Partial<TradingRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    (async () => {
      await supabase.from('rules').update({
        name: data.name,
        description: data.description,
        category: data.category,
        type: data.type,
        threshold: data.threshold,
        is_active: data.isActive,
      }).eq('id', id);
    })();
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules(prev => prev.filter(r => r.isDefault || r.id !== id));
    setTrades(prev => prev.map(t => ({ ...t, rulesFollowed: t.rulesFollowed.filter(rid => rid !== id) })));
    (async () => {
      await supabase.from('rules').delete().eq('id', id);
    })();
  }, []);

  const resetAll = useCallback(() => {
    setTrades([]);
    setAccounts([]);
    setRules(defaultRules);
    setActiveAccountIdState('');
    localStorage.removeItem(SK.activeAccount);

    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase.from('trades').delete().eq('user_id', authUser.id);
      await supabase.from('accounts').delete().eq('user_id', authUser.id);
      await supabase.from('rules').delete().eq('user_id', authUser.id);
      
      const rulesToInsert = defaultRules.map(r => ({
        id: r.id,
        user_id: authUser.id,
        name: r.name,
        description: r.description,
        category: r.category,
        type: r.type,
        threshold: r.threshold || null,
        is_active: r.isActive,
        is_default: r.isDefault,
      }));
      await supabase.from('rules').insert(rulesToInsert);
    })();
  }, []);

  const analytics = useMemo(() => computeAnalytics(accountTrades, rules, activeAccount?.capital || 0, currency), [accountTrades, rules, activeAccount, currency]);

  return (
    <AppContext.Provider value={{
      user, currency, accounts: dedupedAccounts, activeAccountId, trades, rules,
      setUser, setActiveAccount, updateAccount, createAccount, deleteAccount,
      addTrade, updateTrade, deleteTrade, importTrades,
      addRule, updateRule, deleteRule, resetAll,
      activeAccount, accountTrades, analytics, loading,
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
