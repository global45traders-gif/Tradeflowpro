import { useState } from 'react';
import { User, Shield, Database, LogOut, Save, CheckCircle2, ChevronRight, Download, Upload, Trash2, Wallet, CreditCard, Lock, Globe, ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
import { TradingAccount } from '../utils/types';
import { formatCurrencyWithSign, getSymbol } from '../utils/format';
import { downloadSampleExcel } from '../utils/sampleFileGenerator';

interface ProfileSettingsProps {
  user: { name: string; email: string };
  accounts: TradingAccount[];
  currency: string;
  onUpdateUser: (data: Partial<{ name: string; email: string; bio: string }>) => void;
  onCurrencyChange: (currency: string) => void;
  onSelectAccount: (id: string) => void;
  onLogout: () => void;
  onBack: () => void;
  onImportTrades: () => void;
  onExportTrades: () => void;
  onResetData: () => void;
  activeAccountId: string;
}

interface PasswordStrength {
  length: boolean; uppercase: boolean; lowercase: boolean;
  number: boolean; special: boolean; score: number; label: string; color: string; barColor: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  let label = 'Weak', color = 'text-red-500 dark:text-red-400', barColor = 'bg-red-500 dark:bg-red-400';
  if (score >= 4) { label = 'Strong'; color = 'text-emerald-600 dark:text-emerald-400'; barColor = 'bg-emerald-500 dark:bg-emerald-400'; }
  else if (score >= 3) { label = 'Medium'; color = 'text-amber-600 dark:text-amber-400'; barColor = 'bg-amber-500 dark:bg-amber-400'; }
  return { ...checks, score, label, color, barColor };
}

function PasswordRequirements({ strength }: { strength: PasswordStrength }) {
  const requirements = [
    { label: 'At least 8 characters', met: strength.length },
    { label: 'Uppercase letter', met: strength.uppercase },
    { label: 'Lowercase letter', met: strength.lowercase },
    { label: 'Number', met: strength.number },
    { label: 'Special character', met: strength.special },
  ];
  return (
    <div className="space-y-1.5 mt-2">
      {requirements.map(r => (
        <div key={r.label} className="flex items-center space-x-1.5 text-[10px]">
          {r.met ? (
            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <X className="h-3 w-3 text-slate-400 dark:text-slate-650" />
          )}
          <span className={r.met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}>
            {r.label}
          </span>
        </div>
      ))}
      <div className="flex items-center space-x-2 mt-2">
        <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${strength.barColor}`}
            style={{ width: `${(strength.score / 5) * 100}%` }} />
        </div>
        <span className={`text-[10px] font-semibold ${strength.color}`}>{strength.label}</span>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Globe },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'data', label: 'Data & Imports', icon: Database },
];

export default function ProfileSettings({
  user, accounts, currency,
  onUpdateUser, onCurrencyChange, onSelectAccount, onLogout,
  onBack, onImportTrades, onExportTrades, onResetData, activeAccountId,
}: ProfileSettingsProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [editName, setEditName] = useState(user.name || '');
  const [bio, setBio] = useState('');
  const [saved, setSaved] = useState(false);

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const newPwStrength = getPasswordStrength(newPw);

  const handleSaveProfile = () => {
    onUpdateUser({ name: editName.trim(), bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (!currentPw) { setPwMessage({ type: 'error', text: 'Enter current password' }); return; }
    if (newPwStrength.score < 3) { setPwMessage({ type: 'error', text: 'New password is too weak' }); return; }
    if (newPw !== confirmPw) { setPwMessage({ type: 'error', text: 'Passwords do not match' }); return; }

    setPwLoading(true);
    // Simulate async
    await new Promise(resolve => setTimeout(resolve, 800));
    setPwLoading(false);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setPwMessage({ type: 'success', text: 'Password updated successfully' });
  };

  const getInitials = () => {
    if (user.name?.trim()) return user.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (user.email?.includes('@')) return user.email.split('@')[0].slice(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-250">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-semibold">Back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Profile, accounts, and preferences</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center space-x-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-650 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
            <LogOut className="h-4 w-4" /><span>Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 animate-in fade-in-50 duration-200">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="lg:sticky lg:top-20 space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                  }`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {!isActive && <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-600 lg:hidden ml-auto" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-in fade-in-40 duration-200">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Profile Information</h2>
                <div className="flex items-start space-x-4 mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-2 ring-emerald-500/20">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{getInitials()}</span>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-450 dark:text-slate-500 uppercase font-semibold mb-1">Display Name</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-455 dark:text-slate-500 uppercase font-semibold mb-1">Email Address</label>
                    <input type="email" value={user.email || ''} disabled placeholder="email@example.com"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-405 dark:text-slate-400 cursor-not-allowed" />
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">Email is managed by your login provider</p>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-455 dark:text-slate-500 uppercase font-semibold mb-1">Bio (Optional)</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about your trading style..." rows={3}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors resize-none" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Changes are saved locally</p>
                    <button onClick={handleSaveProfile}
                      className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                        saved
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      }`}>
                      {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      <span>{saved ? 'Saved' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-5 animate-in fade-in-40 duration-200">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Trading Preferences</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Default Currency</label>
                    <select value={currency} onChange={e => onCurrencyChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer">
                      {['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD'].map(c => (
                        <option key={c} value={c} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">{getSymbol(c)} {c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Timezone</label>
                      <select defaultValue="IST"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer">
                        <option value="IST" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">IST (UTC+5:30)</option>
                        <option value="EST" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">EST (UTC-5:00)</option>
                        <option value="GMT" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">GMT (UTC+0:00)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Date Format</label>
                      <select defaultValue="YYYY-MM-DD"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer">
                        <option value="YYYY-MM-DD" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">YYYY-MM-DD</option>
                        <option value="MM/DD/YYYY" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">DD/MM/YYYY</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <div className="space-y-4 animate-in fade-in-40 duration-200">
              {accounts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
                  <CreditCard className="h-8 w-8 text-slate-400 dark:text-slate-650 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No trading accounts yet</p>
                </div>
              ) : (
                accounts.map(acc => (
                  <div key={acc.id} className={`rounded-xl border p-4 transition-all shadow-sm ${
                    acc.id === activeAccountId
                      ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          acc.id === activeAccountId
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}><Wallet className="h-5 w-5" /></div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{acc.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{acc.tag} · Risk: {acc.riskPerTradePercent}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrencyWithSign(acc.capital, acc.currencyCode || 'INR').replace('+', '')}
                        </p>
                        {acc.id !== activeAccountId ? (
                          <button onClick={() => onSelectAccount(acc.id)} className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer">Activate</button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-in fade-in-40 duration-200">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <span>Change Password</span>
                </h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Current Password</label>
                    <div className="relative">
                      <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value.trimStart())}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 pr-10 text-sm text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors" />
                      <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">New Password</label>
                    <div className="relative">
                      <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value.trimStart())}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 pr-10 text-sm text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors" />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordRequirements strength={newPwStrength} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value.trimStart())}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 pr-10 text-sm text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors" />
                      <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">
                        {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPw && confirmPw !== newPw && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 font-semibold">Passwords do not match</p>
                    )}
                  </div>
                  {pwMessage && (
                    <div className={`flex items-center space-x-1.5 text-xs ${pwMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'} font-semibold`}>
                      {pwMessage.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>{pwMessage.text}</span>
                    </div>
                  )}
                  <button type="submit" disabled={pwLoading || !currentPw || newPwStrength.score < 3 || newPw !== confirmPw}
                    className="w-full rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm">
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <span>Security settings</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/60">
                    <div>
                      <p className="text-xs font-semibold text-slate-850 dark:text-slate-200">Two-Factor Authentication</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Add an extra layer of security</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Coming Soon</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-850 dark:text-slate-200">Active Sessions</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">1 device currently logged in</p>
                    </div>
                    <button onClick={onLogout} className="text-xs text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-350 font-bold cursor-pointer">Logout All</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data & Imports Tab */}
          {activeTab === 'data' && (
            <div className="space-y-5 animate-in fade-in-40 duration-200">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center space-x-2">
                  <Database className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <span>Data & Imports</span>
                </h2>
                <div className="space-y-4">
                  {[
                    { label: 'Download Sample Excel', desc: 'Get a template for importing trades', btn: 'Download', action: downloadSampleExcel, icon: Download },
                    { label: 'Import Trades', desc: 'Upload CSV/XLSX from your broker', btn: 'Import', action: onImportTrades, icon: Upload },
                    { label: 'Export All Trades', desc: 'Download your complete trade history', btn: 'Export', action: onExportTrades, icon: Download },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{item.desc}</p>
                        </div>
                        <button onClick={item.action} className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer">
                          <Icon className="h-3.5 w-3.5" /><span>{item.btn}</span>
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                    <div>
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">Reset All Data</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Permanently delete all trades and settings</p>
                    </div>
                    <button onClick={onResetData} className="flex items-center space-x-1.5 text-xs text-red-650 dark:text-red-400 hover:underline font-bold cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" /><span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
