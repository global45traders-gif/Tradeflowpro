import { useState, useCallback } from 'react';
import { useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import AnalyticsView from './components/AnalyticsView';
import AICoachView from './components/AICoachView';
import AccountView from './components/AccountView';
import TradeModal from './components/TradeModal';
import ImportTradesModal from './components/ImportTradesModal';
import ResetConfirmModal from './components/ResetConfirmModal';
import ProfileSettings from './pages/ProfileSettings';
import { Trade, TradeCharges } from './utils/types';
import * as XLSX from 'xlsx';
export default function DashboardApp() {
  const {
    user, setUser, accounts, activeAccountId, activeAccount,
    setActiveAccount, updateAccount, createAccount, deleteAccount,
    addTrade, updateTrade, deleteTrade, importTrades,
    addRule, updateRule, deleteRule, resetAll,
    rules, accountTrades, analytics,
  } = useApp();

  const [showSettings, setShowSettings] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('dashboard');

  const handleOpenAddTrade = useCallback(() => { setTradeToEdit(null); setIsTradeModalOpen(true); }, []);
  const handleOpenEditTrade = useCallback((trade: Trade) => { setTradeToEdit(trade); setIsTradeModalOpen(true); }, []);

  const handleSaveTrade = useCallback((
    tradeData: Omit<Trade, 'id' | 'pnl' | 'pnlPercent' | 'rrRatio' | 'netPnl' | 'charges' | 'accountId' | 'rulesFollowed' | 'leverage'> & { id?: string; rulesFollowed?: string[]; leverage?: number },
    charges?: TradeCharges,
    autoCalc = true,
  ) => {
    if (tradeData.id) updateTrade(tradeData.id, tradeData as Partial<Trade>);
    else addTrade(tradeData, charges, autoCalc);
  }, [addTrade, updateTrade]);

  const handleLogout = useCallback(() => {
    setShowSettings(false);
    localStorage.removeItem('tradeflow_auth');
    window.location.href = '/';
  }, []);
const exportTrades = useCallback(() => {
  if (!accountTrades || accountTrades.length === 0) {
    alert('No trades available to export');
    return;
  }

  const exportData = accountTrades.map((trade: any) => ({
    Date: trade.date,
    Symbol: trade.symbol,
    Type: trade.tradeType,
    Quantity: trade.quantity,
    EntryPrice: trade.entryPrice,
    ExitPrice: trade.exitPrice,
    NetPnL: trade.netPnl,
    Emotion: trade.emotion || '',
    Notes: trade.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Trades'
  );

  XLSX.writeFile(
    workbook,
    'trade-history.xlsx'
  );
}, [accountTrades]);
  if (showSettings) {
    return (
      <ProfileSettings
        user={user}
        accounts={accounts}
        currency={activeAccount?.currencyCode || 'USD'}
        onUpdateUser={(data) => setUser(data)}
        onCurrencyChange={(currency) => {
          if (activeAccount) updateAccount(activeAccount.id, { currencyCode: currency });
        }}
        onSelectAccount={setActiveAccount}
        onLogout={handleLogout}
        onImportTrades={() => { setShowSettings(false); setIsImportModalOpen(true); }}
        onExportTrades={exportTrades}
        onBack={() => setShowSettings(false)}
        onResetData={() => { setShowSettings(false); setIsResetModalOpen(true); }}
        activeAccountId={activeAccountId}
      />
    );
  }

if (!activeAccount) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <AccountView
        accounts={accounts}
        activeAccountId={activeAccountId}
        stats={analytics}
        onCreateAccount={createAccount}
        onUpdateAccount={updateAccount}
        onDeleteAccount={deleteAccount}
        onSelectAccount={setActiveAccount}
        rules={rules}
        onAddRule={addRule}
        onUpdateRule={updateRule}
        onDeleteRule={deleteRule}
        onResetClick={() => setIsResetModalOpen(true)}
      />
    </div>
  );
}
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      <Navbar
        userName={user.name || ''}
        userEmail={user.email || ''}
        account={activeAccount}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={setActiveAccount}
        totalNetPnL={analytics.totalNetPnL}
        trades={accountTrades}
        onUpdateAccount={(data) => updateAccount(activeAccount.id, data)}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
        onOpenImport={() => { setShowSettings(false); setIsImportModalOpen(true); }}
      />

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} tradesCount={accountTrades.length} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-12 max-w-7xl mx-auto w-full overflow-x-hidden">
          {sidebarTab === 'dashboard' && <DashboardView trades={accountTrades} account={activeAccount} stats={analytics} setActiveTab={setSidebarTab} onAddTradeClick={handleOpenAddTrade} />}
          {sidebarTab === 'trades' && <CalendarView trades={accountTrades} currency={activeAccount.currencyCode} onEditTrade={handleOpenEditTrade} onDeleteTrade={deleteTrade} onAddTrade={handleOpenAddTrade} onImportTrades={() => setIsImportModalOpen(true)} />}
          {sidebarTab === 'analytics' && <AnalyticsView trades={accountTrades} account={activeAccount} analytics={analytics} rules={rules} />}
          {sidebarTab === 'coach' && <AICoachView trades={accountTrades} account={activeAccount} currency={activeAccount.currencyCode} stats={analytics} />}
          {sidebarTab === 'account' && <AccountView accounts={accounts} activeAccountId={activeAccountId} stats={analytics} onCreateAccount={createAccount} onUpdateAccount={updateAccount} onDeleteAccount={deleteAccount} onSelectAccount={setActiveAccount} rules={rules} onAddRule={addRule} onUpdateRule={updateRule} onDeleteRule={deleteRule} onResetClick={() => setIsResetModalOpen(true)} />}
        </main>
      </div>

      {activeAccount && <TradeModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} onSave={handleSaveTrade} tradeToEdit={tradeToEdit} account={activeAccount} rules={[]} currency={activeAccount.currencyCode} />}
      <ImportTradesModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={importTrades} accountId={activeAccountId} currency={activeAccount.currencyCode} />
<ResetConfirmModal
  isOpen={isResetModalOpen}
  onClose={() => setIsResetModalOpen(false)}
  onConfirm={() => {
    // Reset all journal data
    resetAll();

    // Close modal
    setIsResetModalOpen(false);

    // Open account setup screen
    setSidebarTab('account');
  }}
/>
    </div>
  );
}