import { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Edit3, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { Trade, AccountSettings } from '../utils/types';

interface TradesViewProps {
  trades: Trade[];
  settings: AccountSettings;
  onAddTradeClick: () => void;
  onEditTradeClick: (trade: Trade) => void;
  onDeleteTrade: (id: string) => void;
}

type SortField = 'date-desc' | 'date-asc' | 'pnl-desc' | 'pnl-asc' | 'symbol-asc' | 'symbol-desc';

export default function TradesView({
  trades,
  settings,
  onAddTradeClick,
  onEditTradeClick,
  onDeleteTrade,
}: TradesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [emotionFilter, setEmotionFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'PROFIT' | 'LOSS' | 'BREAKEVEN'>('ALL');
  const [sortBy, setSortBy] = useState<SortField>('date-desc');

  // Available emotions for filtering
  const emotionsList = ['Confidence', 'Patience', 'FOMO', 'Fear', 'Revenge', 'Greed'];

  // Handle Filtering & Sorting
  const filteredTrades = useMemo(() => {
    return trades
      .filter((trade) => {
        const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase().trim());
        const matchesType = typeFilter === 'ALL' || trade.type === typeFilter;
        const matchesEmotion = emotionFilter === 'ALL' || trade.emotion === emotionFilter;
        
        let matchesOutcome = true;
        if (outcomeFilter === 'PROFIT') matchesOutcome = trade.pnl > 0;
        else if (outcomeFilter === 'LOSS') matchesOutcome = trade.pnl < 0;
        else if (outcomeFilter === 'BREAKEVEN') matchesOutcome = trade.pnl === 0;

        return matchesSearch && matchesType && matchesEmotion && matchesOutcome;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'pnl-desc') return b.pnl - a.pnl;
        if (sortBy === 'pnl-asc') return a.pnl - b.pnl;
        if (sortBy === 'symbol-asc') return a.symbol.localeCompare(b.symbol);
        if (sortBy === 'symbol-desc') return b.symbol.localeCompare(a.symbol);
        return 0;
      });
  }, [trades, searchTerm, typeFilter, emotionFilter, outcomeFilter, sortBy]);

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setEmotionFilter('ALL');
    setOutcomeFilter('ALL');
    setSortBy('date-desc');
  };

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '+';
    return val === 0 ? `₹0` : `${sign}${settings.currency}${absVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Trade Journal Log</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse, search, and refine your historical journal entries and trading metrics.
          </p>
        </div>
        <button
          onClick={onAddTradeClick}
          className="flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Log New Trade</span>
        </button>
      </div>

      {/* Filters Panel */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search Symbol */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search symbol (e.g. NIFTY)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Trade Type Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:block">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors"
            >
              <option value="ALL">All Directions</option>
              <option value="BUY">BUY (Long)</option>
              <option value="SELL">SELL (Short)</option>
            </select>
          </div>

          {/* Emotion Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:block">Emotion:</span>
            <select
              value={emotionFilter}
              onChange={(e) => setEmotionFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors"
            >
              <option value="ALL">All Psychology</option>
              {emotionsList.map((emo) => (
                <option key={emo} value={emo}>
                  {emo}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:block">Outcome:</span>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors"
            >
              <option value="ALL">All Outcomes</option>
              <option value="PROFIT">Wins Only</option>
              <option value="LOSS">Losses Only</option>
              <option value="BREAKEVEN">Break Evens</option>
            </select>
          </div>

          {/* Sorting Field */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:block">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="pnl-desc">Highest Profit</option>
              <option value="pnl-asc">Highest Loss</option>
              <option value="symbol-asc">Symbol (A-Z)</option>
              <option value="symbol-desc">Symbol (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || typeFilter !== 'ALL' || emotionFilter !== 'ALL' || outcomeFilter !== 'ALL' || sortBy !== 'date-desc') && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60 pt-3">
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Filter className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
              <span>Showing <strong className="text-emerald-600 dark:text-emerald-400">{filteredTrades.length}</strong> of {trades.length} entries</span>
            </div>
            <button
              onClick={resetFilters}
              className="flex items-center space-x-1 rounded bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Trades Table */}
      {filteredTrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 py-16 px-4 text-center">
          <AlertCircle className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-2 animate-bounce" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No trading logs matched your criteria</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4">Try adjusting your filters, clearing your search, or add a new trade setup.</p>
          <button
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Symbol</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5 text-right">Entry (₹)</th>
                <th className="px-5 py-3.5 text-right">Exit (₹)</th>
                <th className="px-5 py-3.5 text-right">Qty</th>
                <th className="px-5 py-3.5 text-right">Stop Loss (₹)</th>
                <th className="px-5 py-3.5 text-right">PnL (₹)</th>
                <th className="px-5 py-3.5 text-right">PnL %</th>
                <th className="px-5 py-3.5 text-center">R:R</th>
                <th className="px-5 py-3.5 text-center">Emotion</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-xs">
              {filteredTrades.map((trade, idx) => {
                const isProfit = trade.pnl >= 0;
                const isBreakEven = trade.pnl === 0;
                const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/50 dark:bg-slate-950/20';

                return (
                  <tr key={trade.id} className={`${rowBg} hover:bg-slate-100/50 dark:hover:bg-slate-800/20 transition-all duration-150 group`}>
                    {/* Date */}
                    <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">{trade.date}</td>

                    {/* Symbol */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{trade.symbol}</span>
                        {trade.notes && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[200px] truncate" title={trade.notes}>
                            {trade.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${
                        trade.type === 'BUY'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/20'
                          : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-500/20'
                      }`}>
                        {trade.type}
                      </span>
                    </td>

                    {/* Entry Price */}
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                      {trade.entryPrice.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </td>

                    {/* Exit Price */}
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                      {trade.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </td>

                    {/* Quantity */}
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">{trade.quantity}</td>

                    {/* Stop Loss */}
                    <td className="px-5 py-3.5 text-right font-mono text-slate-400 dark:text-slate-500">
                      {trade.stopLoss
                        ? `₹${trade.stopLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>

                    {/* PnL */}
                    <td className={`px-5 py-3.5 text-right font-mono font-bold text-sm ${
                      isBreakEven ? 'text-slate-500 dark:text-slate-400' : isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(trade.pnl)}
                    </td>

                    {/* PnL % */}
                    <td className={`px-5 py-3.5 text-right font-mono font-medium ${
                      isBreakEven ? 'text-slate-500 dark:text-slate-400' : isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {isBreakEven ? '0.00%' : `${isProfit ? '+' : ''}${trade.pnlPercent.toFixed(2)}%`}
                    </td>

                    {/* Risk to Reward Ratio */}
                    <td className="px-5 py-3.5 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {trade.rrRatio !== undefined && !isNaN(trade.rrRatio) && trade.rrRatio !== 0 ? (
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] ${
                          trade.rrRatio >= 2.0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                          trade.rrRatio >= 1.0 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                          'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                        }`}>
                          {trade.rrRatio > 0 ? `1 : ${trade.rrRatio}` : `1 : ${Math.abs(trade.rrRatio)} (Loss)`}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Emotion Badge */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                        trade.emotion === 'Confidence' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' :
                        trade.emotion === 'Patience' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20' :
                        trade.emotion === 'FOMO' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20' :
                        trade.emotion === 'Fear' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20' :
                        trade.emotion === 'Revenge' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {trade.emotion}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => onEditTradeClick(trade)}
                          title="Edit trade entry"
                          className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTrade(trade.id)}
                          title="Delete trade entry"
                          className="rounded p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
