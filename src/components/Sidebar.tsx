import { LayoutDashboard, BookOpen, TrendingUp, Bot, Wallet, ChevronRight, Sparkles } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tradesCount: number;
}

export default function Sidebar({ activeTab, setActiveTab, tradesCount }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'trades', name: 'Trades Log', icon: BookOpen, badge: tradesCount },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp },
    { id: 'coach', name: 'AI Coach', icon: Bot, highlight: true },
    { id: 'account', name: 'Accounts & Rules', icon: Wallet },
  ];

  return (
    <aside className="fixed bottom-0 left-0 z-20 flex h-16 w-full flex-row border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 md:sticky md:top-20 md:h-[calc(100vh-5rem)] md:w-64 md:flex-col md:border-t-0 md:border-r md:px-4 md:py-6">
      {/* Sidebar Items */}
      <nav className="flex w-full flex-row justify-around md:flex-col md:justify-start md:space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex items-center justify-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 md:justify-start md:text-sm
                ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }
              `}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`} />
                {item.highlight && !isActive && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <span className="hidden md:inline flex-1 text-left">{item.name}</span>

              {/* Badges or Highlight Indicators */}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="hidden md:inline rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700/50">
                  {item.badge}
                </span>
              )}

              {item.highlight && (
                <span className="hidden md:flex items-center space-x-1 rounded bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                  <Sparkles className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                  <span>AI</span>
                </span>
              )}

              <ChevronRight className={`hidden md:block h-4 w-4 text-slate-400 dark:text-slate-600 transition-all duration-200 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 ${isActive ? 'opacity-50 text-emerald-500' : ''}`} />
            </button>
          );
        })}
      </nav>

    </aside>
  );
}
