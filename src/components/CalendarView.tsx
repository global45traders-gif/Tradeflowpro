import { useState } from 'react';
import { ChevronLeft, ChevronRight, Upload, Plus } from 'lucide-react';
import { Trade } from '../utils/types';
import { downloadSampleExcel } from '../utils/sampleFileGenerator';
import { formatCurrencyWithSign } from '../utils/format';
import DayTradesPopup from './DayTradesPopup';

interface CalendarViewProps {
  trades: Trade[];
  currency: string;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (id: string) => void;
  onAddTrade: (date?: string) => void;
  onImportTrades: () => void;
}

export default function CalendarView({ trades, currency, onEditTrade, onDeleteTrade, onAddTrade, onImportTrades }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const tradesByDate: Record<string, Trade[]> = {};
  trades.forEach((trade) => {
    if (!tradesByDate[trade.date]) tradesByDate[trade.date] = [];
    tradesByDate[trade.date].push(trade);
  });

  const getDayNetPnl = (dateStr: string): number =>
    (tradesByDate[dateStr] || []).reduce((sum, t) => sum + t.netPnl, 0);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const totalMonthPnl = Object.keys(tradesByDate)
    .filter((d) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .reduce((sum, d) => sum + getDayNetPnl(d), 0);

  const winDays = Object.keys(tradesByDate)
    .filter((d) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && getDayNetPnl(d) > 0).length;
  const lossDays = Object.keys(tradesByDate)
    .filter((d) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && getDayNetPnl(d) < 0).length;
  const totalDays = Object.keys(tradesByDate)
    .filter((d) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const formatDateStr = (day: number): string =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isToday = (day: number): boolean => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Trading Calendar</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Visualize your daily net PnL performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => downloadSampleExcel()}
            className="hidden sm:flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-all duration-200"
            title="Download sample Excel file for import format reference"
          >
            <span>Sample File</span>
          </button>
          <button
            onClick={onImportTrades}
            className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white transition-all duration-200"
          >
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </button>
          <button
            onClick={onAddTrade}
            className="flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 transition-all duration-200"
          >
            <span>+ Add Trade</span>
          </button>
        </div>
      </div>

      {/* Month Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net PnL (Month)</span>
          <p className={`font-mono text-xl font-bold mt-1 ${totalMonthPnl >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {formatCurrencyWithSign(totalMonthPnl, currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profit Days</span>
          <p className="font-mono text-xl font-bold mt-1 text-emerald-500 dark:text-emerald-400">{winDays} <span className="text-slate-400 dark:text-slate-500 text-sm">/ {totalDays}</span></p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Loss Days</span>
          <p className="font-mono text-xl font-bold mt-1 text-red-500 dark:text-red-400">{lossDays} <span className="text-slate-400 dark:text-slate-500 text-sm">/ {totalDays}</span></p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setShowMonthPicker(!showMonthPicker); setPickerYear(year); }}
            className="flex items-center space-x-2 rounded-lg px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{monthNames[month]} {year}</h2>
          </button>
          <button onClick={nextMonth} className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Month/Year Picker */}
        {showMonthPicker && (
          <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setPickerYear(y => y - 1)} className="rounded p-1 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400 font-mono">{pickerYear}</span>
              <button onClick={() => setPickerYear(y => y + 1)} className="rounded p-1 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {monthNames.map((m, mi) => (
                <button
                  key={mi}
                  onClick={() => { setCurrentDate(new Date(pickerYear, mi, 1)); setShowMonthPicker(false); }}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    mi === month && pickerYear === year
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-200'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-2">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="h-20 md:h-24 rounded-lg bg-slate-100/50 dark:bg-slate-950/30" />;

            const dateStr = formatDateStr(day);
            const dayTrades = tradesByDate[dateStr] || [];
            const netPnl = getDayNetPnl(dateStr);
            const isProfit = netPnl > 0;
            const isLoss = netPnl < 0;
            const today = isToday(day);

            return (
              <button
                key={dateStr}
                onClick={() => dayTrades.length > 0 ? setSelectedDate(dateStr) : onAddTrade(dateStr)}
                className={`relative h-20 md:h-24 rounded-lg border p-1.5 flex flex-col transition-all duration-150 hover:scale-[1.02] hover:shadow-lg group cursor-pointer
                  ${today ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'}
                  ${isProfit ? 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12]' : isLoss ? 'bg-red-500/[0.06] hover:bg-red-500/[0.12]' : 'bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900'}
                `}
              >
                {/* Top row: Day number */}
                <div className="flex items-center justify-between w-full px-0.5">
                  <span className={`text-xs font-bold ${today ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{day}</span>
                </div>
                {/* Content */}
                {dayTrades.length > 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-0.5">
                    <span className={`font-mono text-[10px] md:text-xs font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrencyWithSign(netPnl, currency)}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold font-sans">
                      {dayTrades.length} {dayTrades.length === 1 ? 'Trade' : 'Trades'}
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 hidden group-hover:flex items-center justify-center space-x-0.5 font-bold transition-colors">
                      <Plus className="h-3 w-3" />
                      <span>Add Trade</span>
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Trades Popup */}
      {selectedDate && tradesByDate[selectedDate] && (
        <DayTradesPopup
          date={selectedDate}
          trades={tradesByDate[selectedDate]}
          currency={currency}
          onClose={() => setSelectedDate(null)}
          onEditTrade={onEditTrade}
          onDeleteTrade={onDeleteTrade}
          onAddTrade={() => { setSelectedDate(null); onAddTrade(selectedDate); }}
        />
      )}
    </div>
  );
}
