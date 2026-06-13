import { useState } from 'react';
import { Award, Scale, ChevronRight, TrendingUp, BarChart3 } from 'lucide-react';
import { Trade, TradingAccount } from '../utils/types';
import { formatCurrencyWithSign, formatCurrency, getSymbol } from '../utils/currency';

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Area
} from 'recharts';

interface DashboardViewProps {
  trades: Trade[];
  account: TradingAccount;
  stats: any;
  setActiveTab: (t: string) => void;
  onAddTradeClick: () => void;
}

export default function DashboardView({ trades, account, stats, setActiveTab, onAddTradeClick }: DashboardViewProps) {
const [hoveredIdx] = useState<number | null>(null);
  const currencyCode = account?.currencyCode || 'INR';
  const fmt = (v: number) => formatCurrencyWithSign(v, currencyCode);
  const fmtAbs = (v: number) => formatCurrency(v, currencyCode);
  const sym = getSymbol(currencyCode);

  // Chart calculations with safe internal padding and strict boundaries
  const W = 600, H = 260, PX = 65, PY = 35;
  const balances = stats.equityCurve.map((p: any) => p.balance);
  const minB = balances.length > 0 ? Math.min(...balances) : 0;
  const maxB = balances.length > 0 ? Math.max(...balances) : 0;
  const range = maxB - minB || 1;
  const padding = Math.max(range * 0.1, 1000);
  const axisMin = Math.floor((minB - padding) / 1000) * 1000;
  const axisMax = Math.ceil((maxB + padding) / 1000) * 1000;
  const safeRange = axisMax - axisMin || 1000;
  

  const pts = stats.equityCurve.map((p: any, idx: number) => ({
    ...p,
    x: PX + (idx / (stats.equityCurve.length - 1 || 1)) * (W - PX * 2),
    y: H - PY - ((p.balance - axisMin) / safeRange) * (H - PY * 2),
    netPnl: p.netPnl || 0,
  }));

const equityCurve = pts.map((p: any) => ({
  date: p.date,
  balance: p.balance,
  netPnl: p.netPnl
}));

  const recentTrades = trades.slice(0, 5);
  const isEmpty = trades.length === 0;

  if (isEmpty) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-emerald-50/30 dark:to-emerald-950/10 p-5 md:flex md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Welcome back</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your trading journal is ready. Log your first trade to get started.</p>
          </div>
          <button onClick={onAddTradeClick}
            className="mt-3 md:mt-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer">
            + Log First Trade
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: TrendingUp, title: 'Net PnL', value: fmt(0), sub: 'Start trading to track performance' },
            { icon: Award, title: 'Win Rate', value: '—', sub: 'No trades recorded yet' },
            { icon: Scale, title: 'Profit Factor', value: '—', sub: 'Requires at least 1 trade' },
          ].map((w) => (
            <div key={w.title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-4 flex items-center space-x-4">
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2"><w.icon className="h-4 w-4 text-slate-500" /></div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">{w.title}</span>
                <span className="text-lg font-mono font-bold text-slate-700 dark:text-slate-400">{w.value}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-600 ml-1">{w.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Equity Curve</h4>
          <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-500">Analytics will appear once trades are recorded</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-emerald-50/30 dark:to-emerald-950/10 p-5 md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{account.name} · {trades.length} trades logged</p>
        </div>
        <button onClick={onAddTradeClick}
          className="mt-3 md:mt-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer">
          + Log Trade
        </button>
      </div>

      {/* Primary Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Remaining Balance</span>
          <span className={`text-2xl font-mono font-bold ${stats.currentBalance >= account.capital ? 'text-emerald-600 dark:text-emerald-400' : stats.currentBalance < account.capital * 0.9 ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {fmtAbs(stats.currentBalance)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-600">Current account equity</span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Net PnL</span>
          <span className={`text-2xl font-mono font-bold ${stats.totalNetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {fmt(stats.totalNetPnL)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-600 ml-1">{stats.winRate}% WR</span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Win Rate</span>
          <span className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100">{stats.winRate}%</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-600">{stats.winsCount}W / {stats.lossesCount}L</span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Max Drawdown</span>
          <span className={`text-2xl font-mono font-bold ${stats.maxDrawdownPct <= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            -{stats.maxDrawdownPct}%
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-600">{fmtAbs(stats.maxDrawdown)}</span>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { l: 'Expectancy', v: fmt(stats.avgNetWin - stats.avgNetLoss) },
          { l: 'Avg Win', v: fmtAbs(stats.avgWin) },
          { l: 'Avg Loss', v: fmtAbs(stats.avgLoss) },
          { l: 'Streak', v: `${stats.currentStreakCount || 0} ${stats.currentStreak?.type || '—'}` },
          { l: 'R:R', v: `1:${stats.avgRR}` },
          { l: 'Risk Adj', v: `${stats.riskAdjustedReturn}x` },
        ].map(m => (
          <div key={m.l} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3 text-center">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">{m.l}</span>
            <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">{m.v}</span>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-3">Equity Curve</h4>
        <div className="relative overflow-hidden rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-5">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--chart-text)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--chart-grid)' }}
                tickLine={{ stroke: 'var(--chart-grid)' }}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis
                tick={{ fill: 'var(--chart-text)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--chart-grid)' }}
                tickLine={{ stroke: 'var(--chart-grid)' }}
                domain={[
                  (dataMin: number) => dataMin - 500,
                  (dataMax: number) => dataMax + 500
                ]}
                tickFormatter={(v: number) => `${sym}${(v / 1000).toFixed(0)}k`}
              />
              <RechartsTooltip
                separator=" : "
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                  borderRadius: '12px',
                  color: 'var(--chart-tooltip-text)',
                  fontSize: '12px',
                  padding: '10px 12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
                }}
                labelStyle={{
                  color: 'var(--chart-text)',
                  marginBottom: '6px',
                  fontWeight: 600
                }}
                itemStyle={{
                  color: 'var(--chart-tooltip-text)'
                }}
                cursor={{
                  stroke: 'var(--chart-grid)',
                  strokeWidth: 1,
                  strokeDasharray: '4 4'
                }}
                formatter={(value: any, name: any) => {
                  const num = Number(value);

                  if (name === 'netPnl') {
                    return [
                      <span style={{ color: num >= 0 ? '#10b981' : '#f43f5e' }}>
                        {`${num >= 0 ? '+' : ''}${sym}${num.toLocaleString()}`}
                      </span>,
                      'Daily PnL'
                    ];
                  }

                  return [
                    <span style={{ color: 'var(--chart-tooltip-text)' }}>
                      {`${sym}${num.toLocaleString()}`}
                    </span>,
                    'Balance'
                  ];
                }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.1}
                strokeWidth={2}
                activeDot={{ r: 6, fill: '#10b981', stroke: 'var(--chart-tooltip-bg)', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="netPnl"
                stroke="transparent"
                fill="transparent"
                activeDot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intelligent boundary-managed tooltip */}
      {hoveredIdx !== null && pts[hoveredIdx] && (() => {
        const pt = pts[hoveredIdx];
        const isLeftEdge = pt.x < W / 3;
        const isRightEdge = pt.x > (2 * W) / 3;

        let leftStyle = `${(pt.x / W) * 100}%`;
        let transformStyle = 'translate(-50%, -100%)';
        let topOffset = -8;

        if (isLeftEdge) {
          leftStyle = `${((pt.x + 10) / W) * 100}%`;
          transformStyle = 'translate(0, -50%)';
          topOffset = 0;
        } else if (isRightEdge) {
          leftStyle = `${((pt.x - 10) / W) * 100}%`;
          transformStyle = 'translate(-100%, -50%)';
          topOffset = 0;
        }

        return (
          <div
            className="absolute z-20 pointer-events-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur-sm transition-all duration-150"
            style={{
              left: leftStyle,
              top: `calc(${(pt.y / H) * 100}% + ${topOffset}px)`,
              transform: transformStyle,
            }}
          >
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {pt.date || 'Start'}
            </p>

            <p className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
              {fmtAbs(pt.balance)}
            </p>

            {pt.netPnl !== undefined && pt.netPnl !== 0 && (
              <p
                className={`text-[10px] font-mono font-semibold ${
                  pt.netPnl >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {fmt(pt.netPnl)}
              </p>
            )}
          </div>
        );
      })()}

      {/* Recent Trades */}
      {recentTrades.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Recent Trades</h4>
            <button onClick={() => setActiveTab('trades')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-semibold flex items-center space-x-0.5 cursor-pointer">
              <span>View All</span><ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Symbol</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5 text-right">Net PnL</th>
                  <th className="px-4 py-2.5 text-center">Emotion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-xs">
                {recentTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">{t.date}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{t.symbol}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500 dark:text-red-400'}`}>{t.type}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${t.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {fmt(t.netPnl)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                        t.emotion === 'Confidence' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        t.emotion === 'Patience' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                        t.emotion === 'FOMO' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        t.emotion === 'Revenge' ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>{t.emotion}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
