import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ComposedChart, Area, Cell,
} from 'recharts';
import {
  Shield, Brain, CalendarDays, Target, Activity, TrendingUp,
} from 'lucide-react';
import { Trade } from '../utils/types';
import { TradingRule } from '../utils/rulesEngine';
import { formatCurrencyWithSign, getCurrency } from '../utils/currency';

// Dark theme tooltip styling
const darkTooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  backdropFilter: 'blur(8px)',
};

interface AnalyticsPageProps {
  trades: Trade[];
  account: { capital: number; riskPerTradePercent: number; currencyCode?: string };
  analytics: any;
  rules: TradingRule[];
}

export default function AnalyticsPage({ trades, account, analytics, rules }: AnalyticsPageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const cur = account.currencyCode || 'INR';
  const sym = getCurrency(cur).symbol;

  const fmt = (v: number) => formatCurrencyWithSign(v, cur);
  const fmtAbs = (v: number) => `${sym}${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'discipline', label: 'Discipline', icon: Shield },
    { id: 'psychology', label: 'Psychology', icon: Brain },
    { id: 'risk', label: 'Risk', icon: TrendingUp },
    { id: 'strategy', label: 'Strategy', icon: Target },
  ];

  // Dark theme axis styling
  const axisProps = {
    stroke: '#475569',
    style: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
    tickLine: { stroke: '#334155' },
  };

  if (trades.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Performance Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">Visual trading metrics and charts</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 py-20 px-4 text-center">
          <Activity className="h-12 w-12 text-slate-600 mb-3 animate-pulse" />
          <p className="text-sm font-semibold text-slate-400">No trades to analyze</p>
          <p className="text-xs text-slate-500 mt-1">Start logging trades to unlock analytics</p>
        </div>
      </div>
    );
  }

  // Dynamic Y-axis scaling for equity curve
  const balances = analytics.equityCurve.map((d: any) => d.balance);
  const minB = balances.length > 0 ? Math.min(...balances) : 0;
  const maxB = balances.length > 0 ? Math.max(...balances) : 0;
  const range = maxB - minB || 1;
  const padding = Math.max(range * 0.1, 1000);
  const axisMin = Math.floor((minB - padding) / 1000) * 1000;
  const axisMax = Math.ceil((maxB + padding) / 1000) * 1000;
  const yDomain = axisMin !== axisMax ? [axisMin, axisMax] : ['auto', 'auto'];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    const isEquity = payload[0].dataKey === 'balance';

    return (
      <div style={darkTooltipStyle} className="p-3.5 space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-1.5">
          {d.date || d.day || d.period || d.setup || ''}
        </p>
        {isEquity ? (
          <>
            <p className="text-xs text-slate-300">
              Balance: <span className="font-mono font-bold text-slate-100">{sym}{d.balance.toLocaleString('en-IN')}</span>
            </p>
            {d.netPnl !== undefined && d.netPnl !== 0 && (
              <p className="text-xs text-slate-300">
                Daily PnL: <span className={`font-mono font-bold ${d.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(d.netPnl)}
                </span>
              </p>
            )}
          </>
        ) : (
          <>
            {d.totalPnl !== undefined && (
              <p className="text-xs text-slate-300">
                PnL: <span className={`font-mono font-bold ${d.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(d.totalPnl)}</span>
              </p>
            )}
            {d.winRate !== undefined && (
              <p className="text-xs text-slate-300">
                Win Rate: <span className="font-mono font-bold text-indigo-400">{d.winRate}%</span>
              </p>
            )}
            {d.trades !== undefined && <p className="text-[10px] text-slate-500 mt-1">{d.trades} trades logged</p>}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Performance Analytics</h1>
        <p className="text-xs text-slate-400 mt-0.5">Visual trading metrics and charts</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
        {tabs.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center space-x-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${activeTab === t.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon className="h-3.5 w-3.5" /><span>{t.label}</span>
          </button>
        );})}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { l: 'Remaining Balance', v: fmtAbs(analytics.currentBalance), c: analytics.currentBalance >= account.capital ? 'text-emerald-400' : 'text-slate-200' },
          { l: 'Expectancy', v: fmt(analytics.expectancy), c: analytics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { l: 'Profit Factor', v: String(analytics.profitFactor), c: typeof analytics.profitFactor === 'number' && analytics.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-amber-400' },
          { l: 'Max DD', v: `-${analytics.maxDrawdownPct}%`, c: analytics.maxDrawdownPct <= 5 ? 'text-emerald-400' : 'text-red-400' },
          { l: 'Streak', v: analytics.currentStreak.count > 0 ? `${analytics.currentStreak.count} ${analytics.currentStreak.type}` : '—', c: analytics.currentStreak.type === 'win' ? 'text-emerald-400' : analytics.currentStreak.type === 'loss' ? 'text-red-400' : 'text-slate-400' },
          { l: 'Risk Adj', v: `${analytics.riskAdjustedReturn}x`, c: analytics.riskAdjustedReturn >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map(k => (
          <div key={k.l} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <span className="text-[10px] text-slate-500 uppercase font-bold">{k.l}</span>
            <p className={`text-sm font-mono font-bold mt-0.5 ${k.c}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Equity Curve */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h4 className="text-sm font-bold text-slate-200 mb-3">Equity Curve</h4>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={analytics.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" {...axisProps} padding={{ left: 20, right: 20 }} />
                <YAxis {...axisProps} domain={yDomain} tickFormatter={(v: number) => `${sym}${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Day of Week + Psychology */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2"><CalendarDays className="h-4 w-4 text-blue-400" /><span>Day-of-Week</span></h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.dayStats.filter((d: any) => d.trades > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={(v: number) => `${sym}${v.toLocaleString('en-IN')}`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]}>
                    {analytics.dayStats.filter((d: any) => d.trades > 0).map((d: any, i: number) => (
                      <Cell key={i} fill={d.totalPnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2"><Brain className="h-4 w-4 text-purple-400" /><span>Emotion vs PnL</span></h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.emotionStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="emotion" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={(v: number) => `${sym}${v.toLocaleString('en-IN')}`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]}>
                    {analytics.emotionStats.map((d: any, i: number) => (
                      <Cell key={i} fill={d.totalPnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </>
)}
{activeTab === 'discipline' && (
  <>
          {/* Discipline Tab */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2"><Shield className="h-4 w-4 text-slate-500" /><span>Discipline & Rules</span></h4>
            <div className="grid gap-3 sm:grid-cols-3 mb-4">
              <div className="rounded-lg bg-slate-950 p-3">
                <span className="text-[9px] text-slate-500 uppercase">Rule Adherence</span>
                <p className="text-lg font-mono font-bold text-slate-100">{analytics.ruleAdherenceRate}%</p>
              </div>
              <div className="rounded-lg bg-slate-950 p-3">
                <span className="text-[9px] text-slate-500 uppercase">Rule Violations</span>
                <p className="text-lg font-mono font-bold text-red-400">{analytics.ruleViolations.length}</p>
              </div>
              <div className="rounded-lg bg-slate-950 p-3">
                <span className="text-[9px] text-slate-500 uppercase">Active Rules</span>
                <p className="text-lg font-mono font-bold text-slate-100">{rules.filter((r: any) => r.isActive).length}</p>
              </div>
            </div>
            {analytics.ruleViolations.length > 0 && (
              <div className="space-y-2">
                {analytics.ruleViolations.map((v: any) => (
                  <div key={v.name} className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
                    <span className="text-xs text-slate-300">{v.name}</span>
                    <span className="text-[10px] text-red-400 font-mono">{v.violatedCount} violations ({v.rate}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Psychology Tab */}
      {activeTab === 'psychology' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analytics.emotionStats.map((em: any) => (
            <div key={em.emotion} className={`rounded-xl p-4 border ${em.totalPnl >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-200">{em.emotion}</span>
                <span className="text-[10px] text-slate-500">{em.trades} trades</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-slate-500">WR:</span> <span className="text-slate-200 font-semibold">{em.winRate}%</span></div>
                <div><span className="text-slate-500">PnL:</span> <span className={`font-mono font-bold ${em.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(em.totalPnl)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Risk Tab */}
      {activeTab === 'risk' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { l: 'Max Drawdown', v: `₹${analytics.maxDrawdown.toLocaleString('en-IN')}`, c: 'text-red-400' },
              { l: 'DD %', v: `${analytics.maxDrawdownPct}%`, c: analytics.maxDrawdownPct <= 5 ? 'text-emerald-400' : 'text-red-400' },
              { l: 'Avg Risk', v: `₹${analytics.avgRiskPerTrade.toLocaleString('en-IN')}`, c: 'text-amber-400' },
              { l: 'Risk Adj', v: `${analytics.riskAdjustedReturn}x`, c: analytics.riskAdjustedReturn >= 0 ? 'text-emerald-400' : 'text-red-400' },
            ].map(k => (
              <div key={k.l} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <span className="text-[10px] text-slate-500 uppercase font-bold">{k.l}</span>
                <p className={`text-lg font-mono font-bold mt-1 ${k.c}`}>{k.v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h4 className="text-sm font-bold text-slate-200 mb-3">Drawdown Over Time</h4>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={analytics.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v: number) => `${sym}${v.toLocaleString('en-IN')}`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="balance" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Strategy Tab */}
      {activeTab === 'strategy' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analytics.setupStats.filter((s: any) => s.setup !== 'Undefined').map((s: any) => (
            <div key={s.setup} className={`rounded-xl p-4 border ${s.totalPnl >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-200">{s.setup}</span>
                <span className="text-[10px] text-slate-500">{s.trades} trades</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-slate-500">WR:</span> <span className="text-slate-200 font-semibold">{s.winRate}%</span></div>
                <div><span className="text-slate-500">PnL:</span> <span className={`font-mono font-bold ${s.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(s.totalPnl)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
