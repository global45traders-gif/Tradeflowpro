import { X, Edit3, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Trade } from '../utils/types';
import { formatCurrencyWithSign, formatCurrency } from '../utils/format';

interface DayTradesPopupProps {
  date: string;
  trades: Trade[];
  currency: string;
  onClose: () => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (id: string) => void;
  onAddTrade: () => void;
}

export default function DayTradesPopup({ date, trades, currency, onClose, onEditTrade, onDeleteTrade, onAddTrade }: DayTradesPopupProps) {
  const netPnl = trades.reduce((sum, t) => sum + t.netPnl, 0);
  const totalCharges = trades.reduce((sum, t) => sum + t.charges.total, 0);
  const isProfit = netPnl >= 0;

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative w-full max-w-3xl max-h-[85vh] transform rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 slide-in-from-bottom-8">
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 ${isProfit ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{displayDate}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{trades.length} trade{trades.length > 1 ? 's' : ''} logged</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Day Net PnL</p>
              <p className={`font-mono text-xl font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {formatCurrencyWithSign(netPnl, currency)}
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="p-3 border-r border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase block">Gross PnL</span>
            <span className={`font-mono text-xs font-bold ${trades.reduce((s, t) => s + t.pnl, 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {formatCurrencyWithSign(trades.reduce((s, t) => s + t.pnl, 0), currency)}
            </span>
          </div>
          <div className="p-3 border-r border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase block">Total Charges</span>
            <span className="font-mono text-xs font-bold text-red-500 dark:text-red-400">-{formatCurrency(totalCharges, currency)}</span>
          </div>
          <div className="p-3 text-center">
            <span className="text-[10px] text-slate-500 uppercase block">Net PnL</span>
            <span className={`font-mono text-xs font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {formatCurrencyWithSign(netPnl, currency)}
            </span>
          </div>
        </div>

        {/* Trades List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {trades.map((trade) => (
            <div key={trade.id} className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-4 hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg text-sm ${trade.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500 dark:text-red-400'}`}>
                    {trade.pnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{trade.symbol}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ${trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500 dark:text-red-400'}`}>{trade.type}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                        trade.emotion === 'Confidence' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        trade.emotion === 'Patience' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                        trade.emotion === 'FOMO' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        trade.emotion === 'Revenge' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                        trade.emotion === 'Fear' ? 'bg-red-500/10 text-red-500 dark:text-red-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>{trade.emotion}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-[11px]">
                      <div><span className="text-slate-500">Entry: </span><span className="font-mono text-slate-800 dark:text-slate-300">{formatCurrency(trade.entryPrice, currency)}</span></div>
                      <div><span className="text-slate-500">Exit: </span><span className="font-mono text-slate-800 dark:text-slate-300">{formatCurrency(trade.exitPrice, currency)}</span></div>
                      <div><span className="text-slate-500">Qty: </span><span className="font-mono text-slate-800 dark:text-slate-300">{trade.quantity}</span></div>
                      {trade.leverage && trade.leverage > 1 && (
                        <div><span className="text-slate-500">Lev: </span><span className="font-mono font-bold text-amber-500 dark:text-amber-400">{trade.leverage}×</span></div>
                      )}
                      <div><span className="text-slate-500">R:R </span><span className="font-mono text-slate-800 dark:text-slate-300">1:{trade.rrRatio}</span></div>
                    </div>
                    {trade.notes && <p className="text-[11px] text-slate-500 dark:text-slate-500 italic mt-2 line-clamp-2">{trade.notes}</p>}
                  </div>
                </div>

                {/* PnL & Actions */}
                <div className="flex flex-col items-end space-y-2">
                  <div className="text-right">
                    <p className={`font-mono text-sm font-bold ${trade.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {formatCurrencyWithSign(trade.pnl, currency)}
                    </p>
                    <p className={`font-mono text-[10px] ${trade.netPnl >= 0 ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-red-500/70 dark:text-red-400/70'}`}>
                      Net: {formatCurrencyWithSign(trade.netPnl, currency)}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">Charges: {formatCurrency(trade.charges.total, currency)}</p>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEditTrade(trade)} className="rounded p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onDeleteTrade(trade.id)} className="rounded p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-950/40">
          <button onClick={onAddTrade} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition-all">
            + Add Trade for this Day
          </button>
        </div>
      </div>
    </div>
  );
}
