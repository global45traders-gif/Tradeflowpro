import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Upload, X, FileSpreadsheet, Check, AlertCircle, Loader,
  MapPin, ChevronDown, Eye, Shield, Download
} from 'lucide-react';
import { Trade } from '../utils/types';
import {
  getMissingRequiredFields,
  parseTradeData, columnMappings, smartColumnMapping,
} from '../utils/importParser';
import { downloadSampleExcel } from '../utils/sampleFileGenerator';

interface ImportTradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (trades: Trade[]) => void;
  accountId: string;
  currency?: string;
}

// Required fields for a valid trade
const REQUIRED_FIELDS = ['date', 'symbol', 'type', 'entryPrice', 'exitPrice', 'quantity'];
const OPTIONAL_FIELDS = ['stopLoss', 'target', 'notes', 'emotion', 'segment', 'setup', 'entryTime', 'exitTime', 'charges', 'pnl'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const fieldLabels: Record<string, string> = {
  date: 'Date',
  symbol: 'Symbol',
  type: 'Type (Buy/Sell)',
  entryPrice: 'Entry Price',
  exitPrice: 'Exit Price',
  quantity: 'Quantity',
  stopLoss: 'Stop Loss',
  target: 'Target',
  notes: 'Notes',
  emotion: 'Emotion',
  segment: 'Segment',
  setup: 'Setup/Strategy',
  entryTime: 'Entry Time',
  exitTime: 'Exit Time',
  charges: 'Total Charges',
  pnl: 'PnL',
};

export default function ImportTradesModal({ isOpen, onClose, onImport, accountId, currency }: ImportTradesModalProps) {
  const cur = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  // Steps: 'upload' -> 'mapping' -> 'preview' -> 'done'
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsedTrades, setParsedTrades] = useState<Trade[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('high');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setFileName('');
    setRawData([]);
    setRawHeaders([]);
    setMapping({});
    setParsedTrades([]);
    setWarnings([]);
    setErrors([]);
    setIsProcessing(false);
    setIsDragging(false);
  }, []);

  const handleClose = () => { reset(); onClose(); };

  // Parse file (CSV or XLSX)
  const processFile = useCallback((file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setWarnings([]);
    setFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Record<string, unknown>[];
          const headers = results.meta.fields || [];
          handleParsedData(data, headers);
        },
        error: (err) => {
          setErrors([`CSV parse error: ${err.message}`]);
          setIsProcessing(false);
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);
          const headers = data.length > 0 ? Object.keys(data[0]) : [];
          handleParsedData(data, headers);
        } catch (err) {
          setErrors([`Excel parse error: ${err instanceof Error ? err.message : 'Unknown error'}`]);
          setIsProcessing(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setErrors(['Unsupported file format. Please use .csv, .xlsx, or .xls files.']);
      setIsProcessing(false);
    }
  }, []);

  const handleParsedData = useCallback((data: Record<string, unknown>[], headers: string[]) => {
    setRawData(data);
    setRawHeaders(headers);

    // Smart auto-detection
    const result = smartColumnMapping(headers);
    setMapping(result.mapping);
    setConfidence(result.confidence);
    // Auto-detected

    const missing = getMissingRequiredFields(result.mapping);

    if (missing.length === 0) {
      // Auto-parse and go to preview
      const parsed = parseTradeData(data, headers, result.mapping, accountId);
      setParsedTrades(parsed.trades as Trade[]);
      setWarnings(prev => [...prev, ...parsed.warnings]);
      setErrors(parsed.errors);
      setStep('preview');
    } else {
      // Need manual mapping
      setConfidence('low');
      setStep('mapping');
    }

    setIsProcessing(false);
  }, [accountId]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Parse with current mapping
  const handleParseWithMapping = () => {
    const missing = getMissingRequiredFields(mapping);
    if (missing.length > 0) return;

    const parsed = parseTradeData(rawData, rawHeaders, mapping, accountId);
    setParsedTrades(parsed.trades as Trade[]);
    setWarnings(parsed.warnings);
    setErrors(parsed.errors);
    setStep('preview');
  };

  const handleImport = () => {
    if (parsedTrades.length > 0) {
      onImport(parsedTrades);
      setStep('upload');
      setParsedTrades([]);
      setRawData([]);
      setRawHeaders([]);
      setMapping({});
      setFileName('');
      setWarnings([]);
      setErrors([]);
      onClose();
    }
  };

  const availableColumns = rawData.length > 0 ? Object.keys(rawData[0]) : rawHeaders;

  if (!isOpen) return null;

  // ========== UPLOAD STEP ==========
  if (step === 'upload') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={handleClose} />
        <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in-50 slide-in-from-bottom-8">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-slate-100">Import Trades</h3>
            </div>
            <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Upload Area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200 ${
                isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader className="h-10 w-10 text-emerald-400 animate-spin mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Parsing your file...</p>
                </>
              ) : (
                <>
                  <Upload className={`h-10 w-10 mb-3 ${isDragging ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <p className="text-sm font-bold text-slate-300">{isDragging ? 'Drop file here' : 'Drag & drop your file'}</p>
                  <p className="text-xs text-slate-500 mt-1">or click to browse</p>
                  <p className="text-[10px] text-slate-600 mt-3">Supports .csv, .xlsx, .xls</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
            </div>

            {/* Supported Formats Info */}
            <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Supported File Formats</span>
              </h5>
              <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '📄', name: 'CSV Export', desc: 'From any broker/Excel' },
                  { icon: '📋', name: 'Google Sheets', desc: 'Downloaded as .csv or .xlsx' },
                  { icon: '📑', name: 'Custom Excel', desc: 'Any spreadsheet format' },
                ].map(f => (
                  <div key={f.name} className="flex items-start space-x-2 text-[11px]">
                    <span className="text-base leading-none mt-0.5">{f.icon}</span>
                    <div>
                      <span className="font-semibold text-slate-300 block">{f.name}</span>
                      <span className="text-slate-500">{f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column Detection Info */}
            <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800">
              <h5 className="text-xs font-bold text-slate-300 mb-2">Auto Column Detection</h5>
              <p className="text-[11px] text-slate-400 mb-2">
                We automatically detect your columns even if names differ. Supported variations include:
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(columnMappings).slice(0, 6).map(([field, variations]) => (
                  <span key={field} className="rounded bg-slate-800 px-2 py-0.5 text-[9px] text-slate-400">
                    <span className="text-emerald-400 font-bold">{field}</span>
                    {' → '}
                    {variations.slice(0, 3).join(', ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Download Sample File */}
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 p-4 border border-emerald-500/20">
              <div>
                <h5 className="text-xs font-bold text-emerald-300 mb-0.5">New to importing?</h5>
                <p className="text-[10px] text-slate-400">Download a pre-formatted sample file with correct column headers and example data.</p>
              </div>
              <button
                onClick={() => downloadSampleExcel()}
                className="flex items-center space-x-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors flex-shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Sample File</span>
              </button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="px-6 pb-4">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400 space-y-1">
                {errors.slice(0, 3).map((err, i) => <p key={i}>❌ {err}</p>)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== MAPPING STEP ==========
  if (step === 'mapping') {
    const missing = getMissingRequiredFields(mapping);
    const mappedCount = ALL_FIELDS.filter(f => mapping[f]).length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={handleClose} />
        <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 slide-in-from-bottom-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 flex-shrink-0">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-amber-400" />
                <span>Map Columns</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {fileName} · {rawData.length} rows detected
              </p>
            </div>
            <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Auto-detection status */}
          <div className={`px-6 py-3 border-b border-slate-800 flex items-center space-x-2 text-xs ${
            confidence === 'high' ? 'bg-emerald-500/5 text-emerald-400' :
            confidence === 'medium' ? 'bg-amber-500/5 text-amber-400' :
            'bg-red-500/5 text-red-400'
          }`}>
            <Check className="h-4 w-4" />
            <span>Auto-detected {mappedCount} columns ({confidence} confidence)</span>
            {missing.length > 0 && <span>— {missing.length} required field{missing.length > 1 ? 's' : ''} need mapping</span>}
          </div>

          {/* Mapping Grid */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Required Fields */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-red-400"></span>
                <span>Required Fields</span>
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {REQUIRED_FIELDS.map(field => {
                  const isMapped = !!mapping[field];
                  return (
                    <div key={field} className={`rounded-xl p-3 border transition-colors ${
                      isMapped ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
                    }`}>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                        {fieldLabels[field]}
                        {!isMapped && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <div className="relative">
                        <select
                          value={mapping[field] || ''}
                          onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                          className={`w-full rounded-lg border px-3 py-2 text-xs font-medium appearance-none focus:outline-none transition-colors ${
                            isMapped
                              ? 'border-emerald-500/30 bg-slate-950 text-emerald-400 focus:border-emerald-500'
                              : 'border-red-500/30 bg-slate-950 text-red-400 focus:border-red-500'
                          }`}
                        >
                          <option value="">— Select column —</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col} className="bg-slate-950 text-slate-200">
                              {col}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                      </div>
                      {mapping[field] && (
                        <p className="text-[9px] text-emerald-400 mt-1">Mapped to: "{mapping[field]}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Fields */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                <span>Optional Fields</span>
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {OPTIONAL_FIELDS.map(field => (
                  <div key={field} className={`rounded-xl p-3 border ${
                    mapping[field] ? 'border-slate-700 bg-slate-950/60' : 'border-slate-800/50 bg-slate-950/30'
                  }`}>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5">{fieldLabels[field]}</label>
                    <div className="relative">
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 appearance-none focus:border-emerald-500 focus:outline-none transition-colors"
                      >
                        <option value="">— Skip —</option>
                        {availableColumns.map(col => (
                          <option key={col} value={col} className="bg-slate-950 text-slate-200">{col}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <button onClick={() => { reset(); setStep('upload'); }}
              className="text-xs text-slate-400 hover:text-white transition-colors">
              ← Choose different file
            </button>
            <button
              onClick={handleParseWithMapping}
              disabled={missing.length > 0}
              className={`flex items-center space-x-1.5 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                missing.length > 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>Preview {missing.length > 0 ? `(${missing.length} fields missing)` : 'Import'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== PREVIEW STEP ==========
  if (step === 'preview') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={handleClose} />
        <div className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 slide-in-from-bottom-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 flex-shrink-0">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Download className="h-5 w-5 text-emerald-400" />
                <span>Import Preview</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {fileName} · {parsedTrades.length} valid trades detected
              </p>
            </div>
            <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-slate-800 flex-shrink-0">
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Valid Trades</span>
              <span className="text-xl font-mono font-black text-emerald-400">{parsedTrades.length}</span>
            </div>
            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Skipped Rows</span>
              <span className="text-xl font-mono font-black text-red-400">{Math.max(0, rawData.length - parsedTrades.length - errors.length)}</span>
            </div>
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Warnings</span>
              <span className="text-xl font-mono font-black text-amber-400">{warnings.length}</span>
            </div>
          </div>

          {/* Errors & Warnings */}
          {(errors.length > 0 || warnings.length > 0) && (
            <div className="px-6 py-3 border-b border-slate-800 space-y-2 max-h-32 overflow-y-auto flex-shrink-0">
              {errors.slice(0, 3).map((err, i) => (
                <div key={`err-${i}`} className="flex items-start space-x-2 text-[11px] text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
              {warnings.slice(0, 5).map((warn, i) => (
                <div key={`warn-${i}`} className="flex items-start space-x-2 text-[11px] text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {/* Preview Table */}
          <div className="flex-1 overflow-y-auto p-6">
            {parsedTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-400">No valid trades found in the preview</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Your file may have different column names. Try mapping them manually.</p>
                <button onClick={() => setStep('mapping')}
                  className="flex items-center space-x-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors">
                  <MapPin className="h-4 w-4" /><span>Map Columns Manually</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Symbol</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Entry</th>
                      <th className="px-3 py-2 text-right">Exit</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">PnL</th>
                      <th className="px-3 py-2 text-right">Net PnL</th>
                      <th className="px-3 py-2">Emotion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-mono">
                    {parsedTrades.slice(0, 10).map((trade, i) => (
                      <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-400">{trade.date}</td>
                        <td className="px-3 py-2 text-slate-200 font-semibold">{trade.symbol}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300">{cur}{trade.entryPrice.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{cur}{trade.exitPrice.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{trade.quantity}</td>
                        <td className={`px-3 py-2 text-right font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(0)}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold ${trade.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.netPnl >= 0 ? '+' : ''}{trade.netPnl.toFixed(0)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] ${
                            trade.emotion === 'Confidence' ? 'bg-emerald-500/10 text-emerald-400' :
                            trade.emotion === 'Revenge' ? 'bg-rose-500/10 text-rose-400' :
                            trade.emotion === 'FOMO' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {trade.emotion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedTrades.length > 10 && (
                  <div className="px-3 py-2 text-center text-[10px] text-slate-500 border-t border-slate-800">
                    Showing first 10 of {parsedTrades.length} trades
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <button onClick={() => setStep('mapping')}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors">
              <MapPin className="h-4 w-4" /><span>Adjust Mapping</span>
            </button>
            <div className="flex space-x-3">
              <button onClick={handleClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleImport} disabled={parsedTrades.length === 0}
                className={`flex items-center space-x-1.5 rounded-xl px-6 py-2.5 text-xs font-bold transition-all ${
                  parsedTrades.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400'
                }`}>
                <Check className="h-4 w-4" />
                <span>Import {parsedTrades.length} Trades</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
