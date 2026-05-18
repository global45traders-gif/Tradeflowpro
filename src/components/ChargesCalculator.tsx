import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TradeCharges } from '../utils/types';
import { SEGMENT_LABELS } from '../utils/segmentMap';

interface ChargesCalculatorProps {
  segment: string;
  charges: TradeCharges;
  onChange: (charges: TradeCharges) => void;
  autoCalc: boolean;
  onToggleAutoCalc: () => void;
}

export default function ChargesCalculator({
  segment,
  charges,
  onChange,
  autoCalc,
  onToggleAutoCalc,
}: ChargesCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [manualTotal, setManualTotal] = useState(charges.total.toString());

  const handleManualSave = () => {
    const num = parseFloat(manualTotal) || 0;
    onChange({
      brokerage: 0, stt: 0, gst: 0, sebiTurnover: 0, stampDuty: 0,
      exchangeTxn: 0, total: num, mode: 'flat',
    });
  };

  const updateChargeField = (field: keyof TradeCharges, value: string) => {
    const numVal = parseFloat(value) || 0;
    const updated = { ...charges, [field]: numVal };
    if (field !== 'total') {
      updated.total = Number((
        Math.max(0, updated.brokerage) + Math.max(0, updated.stt) + Math.max(0, updated.gst) +
        Math.max(0, updated.sebiTurnover) + Math.max(0, updated.stampDuty) + Math.max(0, updated.exchangeTxn)
      ).toFixed(2));
    }
    onChange(updated);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-900 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Brokerage & Charges</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${autoCalc ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {autoCalc ? 'Auto' : 'Manual'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm font-bold text-red-400">
            -₹{charges.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-800 p-4 space-y-4">
          {/* Auto/Manual Toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => { if (!autoCalc) onToggleAutoCalc(); }}
              className={`rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
                autoCalc ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Auto Calculate (Indian Market)
            </button>
            <button
              type="button"
              onClick={() => { if (autoCalc) onToggleAutoCalc(); }}
              className={`rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
                !autoCalc ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enter Total Charges
            </button>
          </div>

          {autoCalc ? (
            // Auto-calculated breakdown
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Segment: {SEGMENT_LABELS[segment as keyof typeof SEGMENT_LABELS] || segment}</p>
              {[
                { label: 'Brokerage', key: 'brokerage' as const, desc: 'Your broker fee' },
                { label: 'STT', key: 'stt' as const, desc: 'Securities Transaction Tax' },
                { label: 'Exchange Txn', key: 'exchangeTxn' as const, desc: 'NSE/BSE charges' },
                { label: 'GST (18%)', key: 'gst' as const, desc: 'On brokerage + exchange + SEBI' },
                { label: 'SEBI Charges', key: 'sebiTurnover' as const, desc: '₹10 per crore' },
                { label: 'Stamp Duty', key: 'stampDuty' as const, desc: 'On buy side' },
              ].map(({ label, key, desc }) => (
                <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40 last:border-0">
                  <div>
                    <span className="text-slate-400">{label}</span>
                    <span className="text-[10px] text-slate-600 ml-1">({desc})</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-600">₹</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={charges[key]}
                      onChange={(e) => updateChargeField(key, e.target.value)}
                      className="w-20 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-right font-mono text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Manual total charges
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  Total Charges (₹)
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 font-mono text-sm">₹</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={manualTotal}
                    onChange={(e) => setManualTotal(e.target.value)}
                    placeholder="e.g. 45.50"
                    className="flex-1 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualSave}
                className="w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Apply Charges
              </button>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <span className="text-xs font-bold text-slate-300">Total Charges</span>
            <span className="font-mono text-sm font-bold text-red-400">
              -₹{charges.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
