import { useState, useEffect } from 'react';
import { X, Save, Sparkles, Calculator, ChevronDown, AlertTriangle, Info, Shield, Check } from 'lucide-react';
import { Trade, TradeCharges } from '../utils/types';
import { calculateCharges, calculateTradePnL, calculateTradeRR, defaultCharges } from '../utils/tradeUtils';
import { formatCurrencyWithSign } from '../utils/format';
import { SEGMENT_LABELS, SEGMENT_OPTIONS, normalizeSegment } from '../utils/segmentMap';
import ChargesCalculator from './ChargesCalculator';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Omit<Trade, 'id' | 'pnl' | 'pnlPercent' | 'rrRatio' | 'netPnl' | 'charges' | 'accountId' | 'rulesFollowed' | 'leverage'> & { id?: string; rulesFollowed?: string[]; leverage?: number }, charges: TradeCharges, autoCalc: boolean) => void;
  tradeToEdit: Trade | null;
  account: { brokeragePerOrder: number; brokeragePercent: number; capital: number; currencyCode?: string };
  rules: Array<{ id: string; name: string; description: string; category: string; isActive: boolean; isDefault: boolean }>;
  currency?: string;
}

export default function TradeModal({ isOpen, onClose, onSave, tradeToEdit, account, rules, currency: currencyProp }: TradeModalProps) {
  const currency = currencyProp || account.currencyCode || 'USD';
  const [date, setDate] = useState('');
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [setup, setSetup] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [notes, setNotes] = useState('');
  const [emotion, setEmotion] = useState('Confidence');
  // Segment state uses the normalized SegmentKey
  const [segment, setSegment] = useState<string>('equity_intraday');
  const [autoCalcCharges, setAutoCalcCharges] = useState(true);
  const [charges, setCharges] = useState<TradeCharges>(defaultCharges);
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);
  const [rulesFollowed, setRulesFollowed] = useState<string[]>([]);
  const [showRuleSelector, setShowRuleSelector] = useState(false);

  // Live PnL preview
  const previewEntry = parseFloat(entryPrice) || 0;
  const previewExit = parseFloat(exitPrice) || 0;
  const previewQty = parseInt(quantity, 10) || 0;
  const previewPnl = previewEntry && previewExit && previewQty
    ? calculateTradePnL(type, previewEntry, previewExit, previewQty) : 0;
  const previewNetPnl = previewPnl - charges.total;
  const previewRiskPct = previewEntry && previewQty ? ((previewEntry * previewQty) / account.capital) * 100 : 0;
  const previewRR = stopLoss ? calculateTradeRR(type, previewEntry, previewExit, parseFloat(stopLoss) || undefined) : 0;

  // Optional validation hints — never block trade submission
  const hints: Array<{ icon: React.ComponentType<any>; text: string; color: string }> = [];
  if (entryPrice && exitPrice && quantity && !stopLoss) {
    hints.push({ icon: AlertTriangle, text: 'No stop loss defined — consider setting one for risk management.', color: 'text-amber-400' });
  }
  if (previewRiskPct > 5 && previewRiskPct <= 10) {
    hints.push({ icon: AlertTriangle, text: `Position uses ${previewRiskPct.toFixed(1)}% of capital — higher than typical risk guidelines.`, color: 'text-amber-400' });
  }
  if (previewRiskPct > 10) {
    hints.push({ icon: AlertTriangle, text: `Position uses ${previewRiskPct.toFixed(1)}% of capital — very high risk.`, color: 'text-red-400' });
  }
  if (stopLoss && previewRR > 0 && previewRR < 2) {
    hints.push({ icon: Info, text: `R:R is 1:${previewRR.toFixed(1)} — below the 1:2 recommended minimum.`, color: 'text-amber-400' });
  }
  const emotionalEmotions = ['Revenge', 'FOMO', 'Fear', 'Greed'];
  if (emotionalEmotions.includes(emotion)) {
    hints.push({ icon: AlertTriangle, text: `${emotion} trades historically have lower win rates. Trade carefully.`, color: 'text-amber-400' });
  }

  useEffect(() => {
    if (isOpen) {
      if (tradeToEdit) {
        setDate(tradeToEdit.date);
        setSymbol(tradeToEdit.symbol);
        setType(tradeToEdit.type);
        setEntryPrice(tradeToEdit.entryPrice.toString());
        setExitPrice(tradeToEdit.exitPrice.toString());
        setQuantity(tradeToEdit.quantity.toString());
        setLeverage((tradeToEdit.leverage || 1).toString());
        setStopLoss(tradeToEdit.stopLoss?.toString() || '');
        setTarget(tradeToEdit.target?.toString() || '');
        setSetup(tradeToEdit.setup || '');
        setEntryTime(tradeToEdit.entryTime || '');
        setExitTime(tradeToEdit.exitTime || '');
        setNotes(tradeToEdit.notes);
        setEmotion(tradeToEdit.emotion);
        setSegment(normalizeSegment(tradeToEdit.segment));
        setCharges(tradeToEdit.charges);
        setAutoCalcCharges(tradeToEdit.charges.mode === 'itemized');
        setRulesFollowed(tradeToEdit.rulesFollowed || []);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setSymbol('');
        setType('BUY');
        setEntryPrice('');
        setExitPrice('');
        setQuantity('');
        setLeverage('1');
        setStopLoss('');
        setTarget('');
        setSetup('');
        setEntryTime('');
        setExitTime('');
        setNotes('');
        setEmotion('Confidence');
        setSegment('equity_intraday');
        setAutoCalcCharges(true);
        setCharges(defaultCharges);
        setRulesFollowed([]);
      }
    }
  }, [isOpen, tradeToEdit]);

  // Auto-calculate charges when relevant fields change
  useEffect(() => {
    if (autoCalcCharges && entryPrice && exitPrice && quantity) {
      const c = calculateCharges(
        segment, type,
        parseFloat(entryPrice) || 0,
        parseFloat(exitPrice) || 0,
        parseInt(quantity) || 0,
        account.brokeragePerOrder, account.brokeragePercent
      );
      setCharges(c);
    }
  }, [segment, type, entryPrice, exitPrice, quantity, autoCalcCharges, account.brokeragePerOrder, account.brokeragePercent]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !entryPrice || !exitPrice || !quantity) return;

    onSave({
      id: tradeToEdit?.id,
      date,
      symbol: symbol.toUpperCase().trim(),
      type,
      entryPrice: parseFloat(entryPrice),
      exitPrice: parseFloat(exitPrice),
      quantity: parseInt(quantity, 10),
      leverage: Math.max(1, parseFloat(leverage) || 1),
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      target: target ? parseFloat(target) : undefined,
      notes,
      emotion,
      segment,
      setup: setup || undefined,
      entryTime: entryTime || undefined,
      exitTime: exitTime || undefined,
      rulesFollowed,
    }, charges, autoCalcCharges);
    onClose();
  };

  // Hints section (already declared above)

  const emotions = [
    { value: 'Confidence', label: 'Confidence 👍' },
    { value: 'Patience', label: 'Patience ⏳' },
    { value: 'FOMO', label: 'FOMO 😱' },
    { value: 'Fear', label: 'Fear 😨' },
    { value: 'Revenge', label: 'Revenge 😡' },
    { value: 'Greed', label: 'Greed 🤑' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative w-full max-w-3xl max-h-[90vh] transform rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 slide-in-from-bottom-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <span>{tradeToEdit ? 'Edit Trade' : 'Log New Trade'}</span>
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Live PnL Preview */}
          {(previewEntry && previewExit && previewQty) && (
            <div className={`mb-5 rounded-xl p-4 border ${previewNetPnl >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1.5">
                  <Calculator className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-400 font-bold uppercase">Live Preview</span>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Gross</span>
                  <span className={`font-mono font-bold ${previewPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrencyWithSign(previewPnl, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Charges</span>
                  <span className="font-mono font-bold text-red-400">-{formatCurrencyWithSign(charges.total, currency).replace('+', '')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Net PnL</span>
                  <span className={`font-mono text-lg font-black ${previewNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrencyWithSign(previewNetPnl, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Segment Selection */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Market Segment
              </label>
              <button
                type="button"
                onClick={() => setShowSegmentDropdown(!showSegmentDropdown)}
                className="w-full flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-700 transition-colors"
              >
                <span>{SEGMENT_LABELS[segment as keyof typeof SEGMENT_LABELS] || segment}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showSegmentDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSegmentDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
                  {SEGMENT_OPTIONS.map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => { setSegment(seg); setShowSegmentDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        segment === seg ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <span className="font-bold">{SEGMENT_LABELS[seg]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2-Column Grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Symbol */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Symbol / Instrument <span className="text-red-400">*</span>
                </label>
                <input
                  type="text" required placeholder="e.g. RELIANCE, NIFTY"
                  value={symbol} onChange={(e) => setSymbol(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              {/* Trade Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Direction <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
                  <button type="button" onClick={() => setType('BUY')}
                    className={`rounded-lg py-2 text-[11px] font-extrabold tracking-wider uppercase transition-all ${type === 'BUY' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                    BUY
                  </button>
                  <button type="button" onClick={() => setType('SELL')}
                    className={`rounded-lg py-2 text-[11px] font-extrabold tracking-wider uppercase transition-all ${type === 'SELL' ? 'bg-red-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                    SELL
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quantity <span className="text-red-400">*</span>
                </label>
                <input
                  type="number" required min="1" placeholder="e.g. 50"
                  value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                />
              </div>

              {/* Leverage */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Leverage
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number" min="1" max="50" step="1" placeholder="1"
                    value={leverage} onChange={(e) => setLeverage(e.target.value)}
                    className="w-20 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm font-medium text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                  />
                  <span className="text-xs font-bold text-slate-400">×</span>
                  {previewEntry && previewQty && (
                    <span className="text-[10px] text-slate-500">
                      Exposure: {formatCurrencyWithSign(previewEntry * previewQty * (parseFloat(leverage) || 1), currency).replace('+', '')}
                    </span>
                  )}
                </div>
              </div>

              {/* Entry Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Entry Price (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number" required step="any" min="0.01" placeholder="e.g. 2400.00"
                  value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                />
              </div>

              {/* Exit Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Exit Price (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number" required step="any" min="0.01" placeholder="e.g. 2460.00"
                  value={exitPrice} onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                />
              </div>

              {/* Stop Loss */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Stop Loss Price
                </label>
                <input
                  type="number" step="any" min="0.01" placeholder="e.g. 2380.00"
                  value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                />
              </div>

              {/* Target */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Target Price
                </label>
                <input
                  type="number" step="any" min="0.01" placeholder="e.g. 2500.00"
                  value={target} onChange={(e) => setTarget(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                />
              </div>

              {/* Setup/Strategy */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Trade Setup</label>
                <select value={setup} onChange={(e) => setSetup(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors">
                  <option value="">Select Setup</option>
                  {['Breakout', 'Pullback', 'FVG', 'Support/Resistance', 'Trend Follow', 'Reversal', 'Range', 'Scalp', 'Other'].map(s => (
                    <option key={s} value={s} className="bg-slate-950">{s}</option>
                  ))}
                </select>
              </div>

              {/* Entry Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Entry Time</label>
                <input type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors font-mono" />
              </div>

              {/* Exit Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Exit Time</label>
                <input type="time" value={exitTime} onChange={(e) => setExitTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors font-mono" />
              </div>

              {/* Emotion */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Psychological State
                </label>
                <select value={emotion} onChange={(e) => setEmotion(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors">
                  {emotions.map((emo) => (
                    <option key={emo.value} value={emo.value} className="bg-slate-950">{emo.label}</option>
                  ))}
                </select>
              </div>

              {/* Auto/Manual Toggle */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setAutoCalcCharges(!autoCalcCharges);
                    if (!autoCalcCharges) {
                      const c = calculateCharges(segment, type, previewEntry, previewExit, previewQty, account.brokeragePerOrder, account.brokeragePercent);
                      setCharges(c);
                    }
                  }}
                  className={`w-full flex items-center justify-center space-x-2 rounded-xl border py-2.5 text-xs font-bold transition-all duration-200 ${
                    autoCalcCharges
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Calculator className="h-4 w-4" />
                  <span>{autoCalcCharges ? '✓ Auto-Calculate Charges (Indian Market)' : '⚙ Manual Charges Mode'}</span>
                </button>
              </div>
            </div>

            {/* Rule Adherence */}
            {rules.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRuleSelector(!showRuleSelector)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Rule Adherence</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      {rulesFollowed.length}/{rules.filter(r => r.isActive).length}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showRuleSelector ? 'rotate-180' : ''}`} />
                </button>
                {showRuleSelector && (
                  <div className="border-t border-slate-800 p-4 space-y-2">
                    <p className="text-[10px] text-slate-500 mb-2">Select the rules you FOLLOWED on this trade:</p>
                    {rules.filter(r => r.isActive).map(rule => {
                      const isFollowed = rulesFollowed.includes(rule.id);
                      return (
                        <button
                          key={rule.id}
                          type="button"
                          onClick={() => setRulesFollowed(prev =>
                            isFollowed ? prev.filter(id => id !== rule.id) : [...prev, rule.id]
                          )}
                          className={`w-full flex items-center justify-between rounded-lg p-2.5 text-left transition-all ${
                            isFollowed ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-900 border border-slate-800'
                          }`}
                        >
                          <div>
                            <span className={`text-xs font-bold ${isFollowed ? 'text-emerald-300' : 'text-slate-400'}`}>{rule.name}</span>
                            <p className="text-[10px] text-slate-500 mt-0.5">{rule.description}</p>
                          </div>
                          {isFollowed ? <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" /> : <X className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea
                rows={3} placeholder="Why did you take this trade? What setup did you follow?"
                value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
              ></textarea>
            </div>

            {/* Charges Section */}
            <ChargesCalculator
              segment={segment}
              charges={charges}
              onChange={setCharges}
              autoCalc={autoCalcCharges}
              onToggleAutoCalc={() => {
                setAutoCalcCharges(!autoCalcCharges);
                if (!autoCalcCharges) {
                  const c = calculateCharges(segment, type, previewEntry, previewExit, previewQty, account.brokeragePerOrder, account.brokeragePercent);
                  setCharges(c);
                }
              }}
            />
          </form>
        </div>

        {/* Optional Validation Hints (informational only — never block) */}
        {hints.length > 0 && !tradeToEdit && (
          <div className="border-t border-slate-800 px-6 py-3 space-y-1.5 bg-amber-500/[0.02]">
            {hints.map((hint, i) => {
              const HintIcon = hint.icon;
              return (
                <div key={i} className="flex items-start space-x-2 text-[10px]">
                  <HintIcon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${hint.color}`} />
                  <span className={hint.color}>{hint.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Buttons — always enabled */}
        <div className="border-t border-slate-800 px-6 py-4 flex justify-end space-x-3 bg-slate-950/40">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 transition-all">
            <Save className="h-4 w-4" />
            <span>{tradeToEdit ? 'Save Changes' : 'Log Trade'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
