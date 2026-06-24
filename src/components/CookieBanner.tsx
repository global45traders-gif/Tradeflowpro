import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('tradeflowpro-cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('tradeflowpro-cookie-consent', 'all');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('tradeflowpro-cookie-consent', 'essential');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:bottom-6 md:max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 shadow-2xl animate-in slide-in-from-bottom-8 select-none">
      <div className="flex items-start space-x-3.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0">
          <ShieldCheck className="h-5 w-5 animate-pulse" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Cookie Consent</h4>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            We use essential cookies to keep TradeFlowPro secure and functioning properly. With your permission, we may also use analytics cookies to improve your experience.
          </p>
        </div>
        <button
          onClick={handleReject}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded cursor-pointer"
          title="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
        <Link
          to="/cookies"
          className="text-[10px] font-bold text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors px-2 py-1.5"
          onClick={() => setVisible(false)}
        >
          Learn More
        </Link>
        <button
          onClick={handleReject}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-105 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
        >
          Reject Non-Essential
        </button>
        <button
          onClick={handleAcceptAll}
          className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-[10px] font-bold text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer shadow-md shadow-emerald-500/10"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
