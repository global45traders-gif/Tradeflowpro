import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { TrendingUp, ChevronDown, Settings, LogOut, Edit3, Wallet, ExternalLink, CheckCircle2 } from 'lucide-react';
import { TradingAccount, Trade } from '../utils/types';
import { formatCurrencyWithSign } from '../utils/currency';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  userName: string;
  userEmail: string;
  account: TradingAccount;
  accounts: TradingAccount[];
  activeAccountId: string;
  onSelectAccount: (id: string) => void;
  totalNetPnL: number;
  trades: Trade[];
  onUpdateAccount: (data: Partial<TradingAccount>) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenImport: () => void;
  onLogoClick?: () => void;
}

export default function Navbar({
  userName,
  account,
  accounts,
  activeAccountId,
  onSelectAccount,
  totalNetPnL,
  onLogout,
  onOpenSettings,
  onOpenImport,
  onLogoClick,
}: NavbarProps) {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const { theme } = useTheme();

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    }
    navigate('/dashboard');
  };

  const [showProfile, setShowProfile] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showToast, setShowToast] = useState('');
  const [editName, setEditName] = useState(userName);
  const [showEditPopup, setShowEditPopup] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const getInitials = useCallback((name: string, email: string) => {
    if (name && name.trim()) return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (email && email.includes('@')) return email.split('@')[0].slice(0, 2).toUpperCase();
    return 'T';
  }, []);

  const userInitials = getInitials(userName, '');

  useEffect(() => {
    setEditName(userName);
  }, [userName]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
        setShowEditPopup(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setShowAccountDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currencyCode = account?.currencyCode || 'INR';
  const fmt = (v: number) => formatCurrencyWithSign(v, currencyCode);
  const isProfit = totalNetPnL >= 0;

  const toast = useCallback((msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(''), 3000);
  }, []);

  const handleSaveProfile = () => {
    if (editName.trim()) {
      setUser({ name: editName.trim() });
      toast('Profile updated');
    }
    setShowEditPopup(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 pl-4 md:pl-[28px] pr-4 md:pr-6 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleLogoClick}
            aria-label="TradeFlowPro Logo"
            className="flex items-center bg-transparent border-none p-0 outline-none focus:outline-none focus-visible:opacity-80 transition-opacity cursor-pointer hover:opacity-90"
            type="button"
          >
            <img
              src={theme === 'dark' ? '/logo-unified-dark.png' : '/logo-unified.png'}
              alt="TradeFlowPro Logo"
              className="h-[38px] w-auto object-contain"
            />
          </button>

          <div ref={accountRef} className="relative">
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <span className="max-w-[120px] truncate font-medium">{account?.name || 'Account'}</span>
              <ChevronDown className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            </button>
            {showAccountDropdown && accounts.length > 1 && (
              <div className="absolute left-0 mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50">
                {accounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { onSelectAccount(a.id); setShowAccountDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                      a.id === activeAccountId ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-medium block">{a.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{a.tag}</span>
                    </div>
                    {a.id === activeAccountId && <div className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Net PnL</span>
            <span className={`font-mono text-sm font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {fmt(totalNetPnL)}
            </span>
          </div>

          <ThemeToggle />

          <div ref={profileRef} className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowEditPopup(false); }}
              className="flex items-center space-x-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 ring-1 ring-emerald-500/30">
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{userInitials}</span>
              </div>
              <ChevronDown className={`h-3 w-3 text-slate-500 dark:text-slate-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50 animate-in fade-in-50 slide-in-from-top-2">
                {/* Profile Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 p-3 bg-slate-50/40 dark:bg-slate-950/40">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{userInitials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{userName}</p>
                    </div>
                  </div>
                </div>

                {/* Menu */}
                <div className="py-1">
                  <button
                    onClick={() => { setShowProfile(false); setShowEditPopup(true); }}
                    className="w-full flex items-center space-x-2 px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /><span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => { setShowProfile(false); onOpenSettings(); }}
                    className="w-full flex items-center space-x-2 px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /><span>Settings</span>
                    <ExternalLink className="h-3 w-3 text-slate-400 dark:text-slate-600 ml-auto" />
                  </button>
                  <button
                    onClick={() => { setShowProfile(false); onOpenImport(); }}
                    className="w-full flex items-center space-x-2 px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Wallet className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /><span>Import Trades</span>
                  </button>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 py-1">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5" /><span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Edit Profile Popup */}
      {showEditPopup && (
        <div className="fixed top-20 right-4 z-50 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl animate-in fade-in-50 slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Profile</h3>
            <button onClick={() => setShowEditPopup(false)} className="rounded p-1 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">✕</button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Display Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none" />
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setShowEditPopup(false)} className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleSaveProfile} className="flex-1 rounded-lg bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-white dark:bg-slate-900 px-4 py-3 shadow-xl animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">{showToast}</span>
        </div>
      )}
    </>
  );
}
