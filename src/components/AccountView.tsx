import { useState } from 'react';
import { CreditCard, Plus, Trash2, Edit3, Save, RefreshCcw, Shield, X, Check, Wallet, BookOpen } from 'lucide-react';
import { TradingAccount, TradingRule } from '../utils/types';
import { CURRENCIES, getCurrency, formatCurrency } from '../utils/currency';

interface AccountViewProps {
  accounts: TradingAccount[];
  activeAccountId: string;
  stats: { currentBalance: number; totalNetPnL: number; ruleAdherenceRate: number; ruleViolations: { name: string; violatedCount: number; rate: number }[] };
  onCreateAccount: (acc: Omit<TradingAccount, 'id' | 'createdAt' | 'isActive'>) => void;
  onUpdateAccount: (id: string, data: Partial<TradingAccount>) => void;
  onDeleteAccount: (id: string) => void;
  onSelectAccount: (id: string) => void;
  rules: TradingRule[];
  onAddRule: (rule: Omit<TradingRule, 'id' | 'isDefault'>) => void;
  onUpdateRule: (id: string, data: Partial<TradingRule>) => void;
  onDeleteRule: (id: string) => void;
  onResetClick: () => void;
}

export default function AccountView({
  accounts, activeAccountId, stats, onCreateAccount, onUpdateAccount, onDeleteAccount,
  onSelectAccount, rules, onAddRule, onUpdateRule, onDeleteRule, onResetClick
}: AccountViewProps) {
  const [activeSection, setActiveSection] = useState<'accounts' | 'rules'>('accounts');
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', tag: 'Intraday' as const, capital: '', risk: '1', currency: 'INR' });
  const [newRule, setNewRule] = useState({ name: '', description: '', type: 'boolean' as const });
  const [editingAcc, setEditingAcc] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name?: string; capital?: string; risk?: string; currency?: string }>({});
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [ruleEditData, setRuleEditData] = useState<{ name?: string; description?: string; threshold?: string }>({});

  // Use currency from active account or default to INR
  const currencyCode = accounts.find(a => a.id === activeAccountId)?.currencyCode || 'INR';
  const fc = (v: number) => formatCurrency(v, currencyCode);

  const tagColors: Record<string, string> = {
    Intraday: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Swing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Options: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Equity: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Custom: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Account & Rules Management</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage trading accounts and discipline rules</p>
      </div>

      {/* Section Tabs */}
      <div className="flex space-x-1 rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 w-fit shadow-sm">
        <button onClick={() => setActiveSection('accounts')}
          className={`flex items-center space-x-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${activeSection === 'accounts' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <Wallet className="h-3.5 w-3.5" /><span>Accounts</span>
        </button>
        <button onClick={() => setActiveSection('rules')}
          className={`flex items-center space-x-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${activeSection === 'rules' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <Shield className="h-3.5 w-3.5" /><span>Rules & Discipline</span>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">{rules.filter(r => r.isActive).length}</span>
        </button>
      </div>

      {/* Accounts Section */}
      {activeSection === 'accounts' && (
        <div className="space-y-5">
          {/* Account Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map(acc => {
              const isActive = acc.id === activeAccountId;
              const isEditing = editingAcc === acc.id;

              return (
                <div key={acc.id} className={`relative rounded-2xl border p-5 transition-all shadow-sm ${isActive ? 'border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700'}`}>
                  {isActive && <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active</span>}

                  {/* Card Header */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      {isEditing ? (
                        <input type="text" value={editData.name || acc.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                          className="bg-slate-500 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-sm text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
                      ) : (
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{acc.name}</h3>
                      )}
                      <span className={`inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-bold mt-0.5 ${tagColors[acc.tag] || tagColors.Custom}`}>{acc.tag}</span>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Capital</span>
                      {isEditing ? (
                        <input type="number" value={editData.capital || acc.capital.toString()} onChange={e => setEditData({ ...editData, capital: e.target.value })}
                          className="w-24 bg-slate-500 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-right font-mono text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
                      ) : (
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fc(acc.capital)}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Risk/Trade</span>
                      {isEditing ? (
                        <input type="number" step="0.1" value={editData.risk || acc.riskPerTradePercent.toString()} onChange={e => setEditData({ ...editData, risk: e.target.value })}
                          className="w-16 bg-slate-500 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-right font-mono text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
                      ) : (
                        <span className="font-mono text-slate-700 dark:text-slate-300">{acc.riskPerTradePercent}%</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Currency</span>
                      {isEditing ? (
                        <select value={editData.currency || acc.currencyCode || 'USD'} onChange={e => setEditData({ ...editData, currency: e.target.value })}
                          className="bg-slate-500 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-xs text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none">
                          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                        </select>
                      ) : (
                        <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">{(acc.currencyCode || 'USD').toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex space-x-2 border-t border-slate-200 dark:border-slate-800/60 pt-3">
                    {!isActive && (
                      <button onClick={() => onSelectAccount(acc.id)} className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-[10px] font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer">
                        Switch to This
                      </button>
                    )}
                    {!isEditing ? (
                      <button onClick={() => { setEditingAcc(acc.id); setEditData({}); }} className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 transition-colors cursor-pointer">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => {
                        onUpdateAccount(acc.id, { name: editData.name || acc.name, capital: editData.capital ? parseFloat(editData.capital) : acc.capital, riskPerTradePercent: editData.risk ? parseFloat(editData.risk) : acc.riskPerTradePercent, currencyCode: editData.currency || acc.currencyCode || 'USD' });
                        setEditingAcc(null);
                      }} className="rounded-lg border border-emerald-500/30 p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer">
                        <Save className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {accounts.length > 1 && (
                      <button onClick={() => onDeleteAccount(acc.id)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Create Account Card */}
            {accounts.length < 5 && (
              <button onClick={() => setShowCreateAccount(true)}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-8 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group cursor-pointer shadow-sm">
                <Plus className="h-8 w-8 text-slate-400 dark:text-slate-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 mb-2 transition-colors" />
                <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">Create New Account</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-600">{5 - accounts.length} slots remaining</span>
              </button>
            )}
          </div>

          {/* Create Account Modal */}
          {showCreateAccount && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setShowCreateAccount(false)} />
              <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Create New Account</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Account Name</label>
                    <input type="text" placeholder="e.g. F&O Trading" value={newAcc.name} onChange={e => setNewAcc({ ...newAcc, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Tag</label>
                    <select value={newAcc.tag} onChange={e => setNewAcc({ ...newAcc, tag: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none cursor-pointer">
                      {['Intraday', 'Swing', 'Options', 'Equity', 'Custom'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Currency</label>
                    <select value={newAcc.currency} onChange={e => setNewAcc({ ...newAcc, currency: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none cursor-pointer">
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Capital ({newAcc.currency === 'INR' ? '₹' : getCurrency(newAcc.currency).symbol})</label>
                      <input type="number" placeholder="500000" value={newAcc.capital} onChange={e => setNewAcc({ ...newAcc, capital: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Risk %</label>
                      <input type="number" step="0.1" placeholder="1.0" value={newAcc.risk} onChange={e => setNewAcc({ ...newAcc, risk: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button onClick={() => setShowCreateAccount(false)} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
                    <button onClick={() => {
                      if (newAcc.name && newAcc.capital) {
                        onCreateAccount({ name: newAcc.name, tag: newAcc.tag, capital: parseFloat(newAcc.capital), riskPerTradePercent: parseFloat(newAcc.risk) || 1, brokerType: 'zerodha', brokeragePerOrder: 20, brokeragePercent: 0, currencyCode: newAcc.currency });
                        setNewAcc({ name: '', tag: 'Intraday', capital: '', risk: '1', currency: 'INR' });
                        setShowCreateAccount(false);
                      }
                    }} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer">Create Account</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="rounded-2xl border border-red-500/20 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-red-500 dark:text-red-400 mb-2">Danger Zone</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Resetting will delete ALL accounts, trades, rules, and settings permanently.</p>
            <button onClick={onResetClick} className="flex items-center space-x-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer">
              <RefreshCcw className="h-4 w-4" /><span>Reset All Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Rules Section */}
      {activeSection === 'rules' && (
        <div className="space-y-5">
          {/* Rule Adherence Summary */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">Discipline Score</h4>
              </div>
              <span className={`font-mono text-xl font-black ${stats.ruleAdherenceRate >= 70 ? 'text-emerald-600 dark:text-emerald-400' : stats.ruleAdherenceRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>
                {stats.ruleAdherenceRate.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full transition-all duration-500 ${stats.ruleAdherenceRate >= 70 ? 'bg-emerald-500' : stats.ruleAdherenceRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(stats.ruleAdherenceRate, 100)}%` }} />
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-3">
            {rules.map(rule => {
              const isEditing = editingRule === rule.id;
              return (
              <div key={rule.id} className={`rounded-xl border p-4 transition-all shadow-sm ${rule.isActive ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800/50 bg-slate-50/40 dark:bg-slate-950/40 opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input type="text" value={ruleEditData.name ?? rule.name} onChange={e => setRuleEditData({ ...ruleEditData, name: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-sm font-bold text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
                        <input type="text" value={ruleEditData.description ?? rule.description} onChange={e => setRuleEditData({ ...ruleEditData, description: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 focus:border-emerald-500 focus:outline-none" />
                        {rule.type === 'numeric' && (
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">Threshold ≤</span>
                            <input type="number" step="0.1" value={ruleEditData.threshold ?? rule.threshold ?? ''} onChange={e => setRuleEditData({ ...ruleEditData, threshold: e.target.value })}
                              className="w-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">%</span>
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <button onClick={() => {
                            onUpdateRule(rule.id, {
                              name: ruleEditData.name ?? rule.name,
                              description: ruleEditData.description ?? rule.description,
                              ...(ruleEditData.threshold && { threshold: parseFloat(ruleEditData.threshold) }),
                            });
                            setEditingRule(null);
                            setRuleEditData({});
                          }} className="rounded-lg bg-emerald-500 px-3 py-1 text-[10px] font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer">Save</button>
                          <button onClick={() => { setEditingRule(null); setRuleEditData({}); }}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-55 dark:bg-slate-800 px-3 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer font-medium">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-bold text-slate-900 dark:text-slate-200">{rule.name}</h5>
                        {rule.isDefault && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Editable</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{rule.description}</p>
                      {rule.type === 'numeric' && rule.threshold && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 inline-block font-bold">Threshold: ≤ {rule.threshold}%</span>
                      )}
                      </>
                    )}
                  </div>
                  {!isEditing && (
                  <div className="flex items-center space-x-1.5 ml-3">
                    <button onClick={() => onUpdateRule(rule.id, { isActive: !rule.isActive })}
                      className={`rounded-lg p-1.5 transition-colors cursor-pointer ${rule.isActive ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>
                      {rule.isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                    <button onClick={() => { setEditingRule(rule.id); setRuleEditData({}); }}
                      className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {!rule.isDefault && (
                      <button onClick={() => onDeleteRule(rule.id)} className="rounded-lg p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  )}
                </div>
              </div>
            );})}
          </div>

          {/* Create Rule */}
          {showCreateRule ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Rule name" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
                <select value={newRule.type} onChange={e => setNewRule({ ...newRule, type: e.target.value as any })}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none cursor-pointer">
                  <option value="boolean">Boolean (Yes/No)</option>
                  <option value="numeric">Numeric Threshold</option>
                </select>
              </div>
              <input type="text" placeholder="Description" value={newRule.description} onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
              <div className="flex space-x-2">
                <button onClick={() => {
                  if (newRule.name && newRule.description) {
                    onAddRule({ ...newRule, isActive: true, category: 'discipline' });
                    setNewRule({ name: '', description: '', type: 'boolean' });
                    setShowCreateRule(false);
                  }
                }} className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer">Add Rule</button>
                <button onClick={() => setShowCreateRule(false)} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCreateRule(true)} className="flex items-center space-x-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 w-full transition-all cursor-pointer shadow-sm">
              <Plus className="h-4 w-4" /><span>Add Custom Rule</span>
            </button>
          )}

          {/* Violations */}
          {stats.ruleViolations.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-3 flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-red-500" /><span>Most Broken Rules</span>
              </h4>
              <div className="space-y-2">
                {stats.ruleViolations.filter(v => v.violatedCount > 0).slice(0, 5).map((v, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950 p-3 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{v.name}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-red-500 dark:text-red-400 font-mono font-bold">{v.violatedCount} violations ({v.rate.toFixed(0)}%)</span>
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-red-500 animate-pulse" style={{ width: `${Math.min(v.rate, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
