import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { TradeCharges } from '../utils/types';
import { SEGMENT_LABELS } from '../utils/segmentMap';

interface ChargesCalculatorProps {
  segment: string;
  charges: TradeCharges;
  onChange: (charges: TradeCharges) => void;
  autoCalc: boolean;
  setAutoCalc: (autoCalc: boolean) => void;
}

export default function ChargesCalculator({
  segment,
  charges,
  onChange,
  autoCalc,
  setAutoCalc,
}: ChargesCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [manualTotal, setManualTotal] = useState(charges.total.toString());

  const currentMode: 'auto' | 'flat' | 'manual_itemized' =
    autoCalc ? 'auto' : (charges.mode === 'flat' ? 'flat' : 'manual_itemized');

  useEffect(() => {
    if (charges.mode === 'flat') {
      setManualTotal(charges.total.toString());
    }
  }, [charges.total, charges.mode]);

  const handleModeSelect = (mode: 'auto' | 'flat' | 'manual_itemized') => {
    if (mode === 'auto') {
      setAutoCalc(true);
      onChange({
        ...charges,
        mode: 'itemized',
      });
    } else if (mode === 'flat') {
      setAutoCalc(false);
      onChange({
        brokerage: 0,
        stt: 0,
        gst: 0,
        sebiTurnover: 0,
        stampDuty: 0,
        exchangeTxn: 0,
        other: 0,
        total: parseFloat(manualTotal) || 0,
        mode: 'flat',
      });
    } else {
      setAutoCalc(false);
      onChange({
        ...charges,
        other: charges.other || 0,
        mode: 'itemized_manual',
      });
    }
  };

  const handleFlatTotalChange = (value: string) => {
    setManualTotal(value);
    const num = parseFloat(value) || 0;
    onChange({
      brokerage: 0,
      stt: 0,
      gst: 0,
      sebiTurnover: 0,
      stampDuty: 0,
      exchangeTxn: 0,
      other: 0,
      total: num,
      mode: 'flat',
    });
  };

  const updateChargeField = (field: keyof TradeCharges, value: string) => {
    const numVal = parseFloat(value) || 0;
    const updated = { ...charges, [field]: numVal };
    if (field !== 'total') {
      updated.total = Number((
        Math.max(0, updated.brokerage) +
        Math.max(0, updated.stt) +
        Math.max(0, updated.gst) +
        Math.max(0, updated.sebiTurnover) +
        Math.max(0, updated.stampDuty) +
        Math.max(0, updated.exchangeTxn) +
        Math.max(0, updated.other || 0)
      ).toFixed(2));
    }
    onChange(updated);
  };

  const fields = [
    { label: 'Brokerage', key: 'brokerage' as const, desc: 'Your broker fee' },
    { label: 'STT', key: 'stt' as const, desc: 'Securities Transaction Tax' },
    { label: 'Exchange Txn', key: 'exchangeTxn' as const, desc: 'NSE/BSE charges' },
    { label: 'GST (18%)', key: 'gst' as const, desc: 'On brokerage + exchange + SEBI' },
    { label: 'SEBI Charges', key: 'sebiTurnover' as const, desc: '₹10 per crore' },
    { label: 'Stamp Duty', key: 'stampDuty' as const, desc: 'On buy side' },
    { label: 'Other Charges', key: 'other' as const, desc: 'Miscellaneous charges' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Brokerage & Charges</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            currentMode === 'auto' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            {currentMode === 'auto' && 'Auto'}
            {currentMode === 'flat' && 'Flat Total'}
            {currentMode === 'manual_itemized' && 'Manual Itemized'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm font-bold text-red-500 dark:text-red-400">
            -₹{charges.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4">
          
          {/* Redesigned Mode Selector Dropdown */}
          <div className="space-y-1.5 relative">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Charges Mode
            </label>
            <button
              type="button"
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-700 transition-colors"
            >
              <span>
                {currentMode === 'auto' && 'Auto Calculate Charges'}
                {currentMode === 'flat' && 'Enter Total Charges'}
                {currentMode === 'manual_itemized' && 'Manual Itemized Charges'}
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-slate-400 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showModeDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowModeDropdown(false)} />
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl overflow-hidden animate-in fade-in-50 slide-in-from-top-1">
                  {[
                    { value: 'auto', label: 'Auto Calculate Charges' },
                    { value: 'flat', label: 'Enter Total Charges' },
                    { value: 'manual_itemized', label: 'Manual Itemized Charges' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handleModeSelect(opt.value as any);
                        setShowModeDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                        currentMode === opt.value
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{currentMode === opt.value ? '✓ ' : ''}{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            
            <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
              Switch between automatic and manual charge calculation methods.
            </p>
          </div>

          {currentMode === 'flat' ? (
            /* Enter Total Charges Mode */
            <div className="space-y-3 font-sans">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
                  Total Charges (₹)
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualTotal}
                    onChange={(e) => handleFlatTotalChange(e.target.value)}
                    placeholder="e.g. 45.50"
                    className="flex-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-right font-mono text-sm text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Auto or Manual Itemized Charges Mode */
            <div className="space-y-2">
              {currentMode === 'auto' && (
                <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">
                  Segment: {SEGMENT_LABELS[segment as keyof typeof SEGMENT_LABELS] || segment}
                </p>
              )}
              {fields.map(({ label, key, desc }) => {
                const val = charges[key] !== undefined ? charges[key] : 0;
                return (
                  <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800/40 last:border-0 font-sans">
                    <div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-600 ml-1">({desc})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500 dark:text-slate-500 font-mono">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={val}
                        disabled={currentMode === 'auto'}
                        onChange={(e) => updateChargeField(key, e.target.value)}
                        className={`w-20 rounded border px-2 py-1 text-right font-mono text-xs transition-colors focus:outline-none ${
                          currentMode === 'auto'
                            ? 'border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Total summary */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Charges</span>
            <span className="font-mono text-sm font-bold text-red-500 dark:text-red-400">
              -₹{charges.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
