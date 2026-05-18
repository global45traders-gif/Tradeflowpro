import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, X, BarChart3, Calendar, Target, Brain, Shield, ArrowRight, FileText, Mail, BookOpen } from 'lucide-react';

/* ─── Modals ─── */

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl animate-in fade-in-50 slide-in-from-bottom-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6 text-xs text-slate-300 space-y-4 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Privacy Policy" onClose={onClose}>
      <h4 className="text-sm font-semibold text-slate-100">Data Collection</h4>
      <p>TradeFlowPro only stores what you explicitly provide: your display name, email (for login), and trade data you choose to log. We do not track your browsing behavior, sell data to third parties, or collect analytics on your usage patterns.</p>

      <h4 className="text-sm font-semibold text-slate-100">Data Storage</h4>
      <p>Your trade data and preferences are stored locally in your browser using localStorage. This means your data never leaves your device unless you choose to export it. We do not have a backend server that stores your trades.</p>

      <h4 className="text-sm font-semibold text-slate-100">Authentication</h4>
      <p>Authentication is handled via local session tokens. No passwords are stored on any server. Your session is tied to your browser and can be cleared by logging out or clearing browser data.</p>

      <h4 className="text-sm font-semibold text-slate-100">Third Parties</h4>
      <p>We do not integrate with external analytics, advertising, or tracking services. Your data stays on your device.</p>

      <h4 className="text-sm font-semibold text-slate-100">Your Rights</h4>
      <p>You can view, modify, or delete all your data at any time through the app settings. Export your trade data as CSV at any time, or reset everything to start fresh.</p>
    </Modal>
  );
}

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Terms of Use" onClose={onClose}>
      <h4 className="text-sm font-semibold text-slate-100">Purpose</h4>
      <p>TradeFlowPro is an analytics and journaling tool designed to help traders track, review, and improve their trading performance. It is not a trading platform, broker, or financial advisor.</p>

      <h4 className="text-sm font-semibold text-slate-100">No Financial Advice</h4>
      <p>Nothing in this application constitutes financial, investment, or trading advice. All analytics, metrics, and insights are calculated from data you provide and are for informational purposes only. You are solely responsible for your trading decisions.</p>

      <h4 className="text-sm font-semibold text-slate-100">User Responsibility</h4>
      <p>Trading involves significant risk. Past performance, as recorded in your journal, does not guarantee future results. You should only trade with capital you can afford to lose.</p>

      <h4 className="text-sm font-semibold text-slate-100">Acceptable Use</h4>
      <p>Use TradeFlowPro for personal trading analysis. Do not attempt to manipulate, reverse-engineer, or abuse the application. We reserve the right to restrict access if the application is used inappropriately.</p>

      <h4 className="text-sm font-semibold text-slate-100">Account</h4>
      <p>Your session and data are tied to your browser. Clearing browser data will remove your session. Always export your data before clearing browser storage.</p>
    </Modal>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Contact & Support" onClose={onClose}>
      <p className="text-sm">Have feedback, found a bug, or want to request a feature? We'd love to hear from you.</p>

      <div className="space-y-3 pt-2">
        <div className="flex items-start space-x-3">
          <Mail className="h-4 w-4 text-emerald-400 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-200">Email</p>
            <p className="text-slate-400">support@tradeflow.pro</p>
            <p className="text-slate-500 text-[10px]">We typically respond within 24 hours.</p>
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <Shield className="h-4 w-4 text-emerald-400 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-200">Discord</p>
            <p className="text-slate-400">Coming soon — join our community for updates and discussions.</p>
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <FileText className="h-4 w-4 text-emerald-400 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-200">Feature Requests</p>
            <p className="text-slate-400">Email us your ideas. We review all suggestions and prioritize based on user feedback.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Landing Page ─── */

export default function LandingPage() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<string | null>(null);
  const [showHeroPreview, setShowHeroPreview] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-slate-800/50 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">TradeFlow<span className="text-emerald-400">Pro</span></span>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/login')} className="text-xs text-slate-400 hover:text-white transition-colors">Sign in</button>
            <button onClick={() => navigate('/signup')} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-8 md:pt-24 md:pb-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-slate-400">Trade smarter. Not harder.</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Your trading journal,<br />
              <span className="text-emerald-400">without the noise.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm text-slate-400 md:text-base">
              Log trades, track performance, identify behavioral patterns, and build consistency.
              A focused analytics tool for serious traders.
            </p>
            <div className="mt-6 flex items-center justify-center space-x-3">
              <button onClick={() => navigate('/signup')} className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors">
                Start Free
              </button>
              <button onClick={() => setShowHeroPreview(!showHeroPreview)} className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                {showHeroPreview ? 'Hide' : 'See'} Preview
              </button>
            </div>
          </div>

          {/* Hero Preview */}
          {showHeroPreview && (
            <div className="mx-auto mt-12 max-w-4xl">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-2 backdrop-blur-sm">
                <div className="rounded-xl bg-slate-950 p-4">
                  {/* Mini Dashboard Mockup */}
                  <div className="grid gap-3 sm:grid-cols-4 mb-4">
                    {[
                      { label: 'Remaining Balance', value: '₹4,87,500', color: 'text-emerald-400' },
                      { label: 'Net PnL', value: '-₹12,500', color: 'text-red-400' },
                      { label: 'Win Rate', value: '42.8%', color: 'text-slate-200' },
                      { label: 'Profit Factor', value: '0.89', color: 'text-slate-200' },
                    ].map(card => (
                      <div key={card.label} className="rounded-lg bg-slate-900 p-3">
                        <span className="text-[9px] text-slate-500 uppercase">{card.label}</span>
                        <span className={`block text-sm font-mono font-bold ${card.color}`}>{card.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Mini Equity Curve */}
                  <div className="h-24 rounded-lg bg-slate-900 flex items-end overflow-hidden">
                    <svg viewBox="0 0 400 100" className="w-full h-full">
                      <defs>
                        <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M 0 80 L 30 75 L 60 78 L 90 65 L 120 70 L 150 55 L 180 60 L 210 50 L 240 55 L 270 45 L 300 50 L 330 40 L 360 45 L 400 35" fill="none" stroke="#10b981" strokeWidth="2" />
                      <path d="M 0 80 L 30 75 L 60 78 L 90 65 L 120 70 L 150 55 L 180 60 L 210 50 L 240 55 L 270 45 L 300 50 L 330 40 L 360 45 L 400 35 L 400 100 L 0 100 Z" fill="url(#heroGrad)" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(16,185,129,0.06),transparent)]" />
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-white">How it works</h2>
          <p className="text-xs text-slate-400 mt-1">Three steps to better trading consistency.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: BookOpen, title: 'Log or import trades', desc: 'Manually journal trades or import CSV/XLSX from your broker. Every entry is timestamped and tagged.' },
            { icon: BarChart3, title: 'Analyze performance', desc: 'Review expectancy, drawdown, setup analysis, and emotional patterns across your trade history.' },
            { icon: Target, title: 'Improve consistency', desc: 'Identify recurring mistakes, track rule adherence, and build discipline with data-driven insights.' },
          ].map((step, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <step.icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-bold">Step {i + 1}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">{step.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-white">Built for serious traders</h2>
          <p className="text-xs text-slate-400 mt-1">Tools that help you understand your trading, not just record it.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: BookOpen, title: 'Trade Journal', desc: 'Log every trade with entry, exit, setup, and emotion tags. Import CSV/XLSX from any broker.' },
            { icon: BarChart3, title: 'Performance Analytics', desc: 'Expectancy, drawdown, profit factor, setup analysis, and time-of-day breakdowns.' },
            { icon: Brain, title: 'Behavioral Analysis', desc: 'Identify recurring emotional mistakes from your trade history. See which emotions cost you most.' },
            { icon: Target, title: 'Discipline Tracking', desc: 'Track rule violations and impulsive trades automatically. Know when you break your own rules.' },
            { icon: Calendar, title: 'Calendar View', desc: 'Visualize daily PnL in a calendar layout. See patterns in your trading days at a glance.' },
            { icon: Shield, title: 'Risk Management', desc: 'Monitor position sizing, max drawdown, and risk-adjusted returns across all your accounts.' },
          ].map((feature, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-3">
                <feature.icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">{feature.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Preview: Analytics */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Understand your edge with data</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              TradeFlowPro goes beyond basic journaling. See expectancy, max drawdown, profit factor, setup win rates, and psychology metrics — all calculated from your actual trade data.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li className="flex items-center space-x-2"><ArrowRight className="h-3 w-3 text-emerald-400" /><span>Expectancy and risk-adjusted returns</span></li>
              <li className="flex items-center space-x-2"><ArrowRight className="h-3 w-3 text-emerald-400" /><span>Setup and strategy win rate analysis</span></li>
              <li className="flex items-center space-x-2"><ArrowRight className="h-3 w-3 text-emerald-400" /><span>Emotional pattern recognition</span></li>
              <li className="flex items-center space-x-2"><ArrowRight className="h-3 w-3 text-emerald-400" /><span>Time-of-day and day-of-week analysis</span></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="rounded-xl bg-slate-950 p-4">
              <div className="grid gap-3 grid-cols-3 mb-4">
                {[
                  { label: 'Expectancy', value: '₹2,340', color: 'text-emerald-400' },
                  { label: 'Max Drawdown', value: '-8.2%', color: 'text-red-400' },
                  { label: 'Profit Factor', value: '1.34', color: 'text-slate-200' },
                ].map(card => (
                  <div key={card.label} className="rounded-lg bg-slate-900 p-2.5">
                    <span className="text-[9px] text-slate-500 uppercase">{card.label}</span>
                    <span className={`block text-xs font-mono font-bold ${card.color}`}>{card.value}</span>
                  </div>
                ))}
              </div>
              <div className="h-20 rounded-lg bg-slate-900 flex items-end">
                <svg viewBox="0 0 300 80" className="w-full h-full">
                  <rect x="10" y="40" width="25" height="40" rx="2" fill="#10b981" />
                  <rect x="45" y="55" width="25" height="25" rx="2" fill="#ef4444" />
                  <rect x="80" y="30" width="25" height="50" rx="2" fill="#10b981" />
                  <rect x="115" y="45" width="25" height="35" rx="2" fill="#ef4444" />
                  <rect x="150" y="20" width="25" height="60" rx="2" fill="#10b981" />
                  <rect x="185" y="50" width="25" height="30" rx="2" fill="#ef4444" />
                  <rect x="220" y="25" width="25" height="55" rx="2" fill="#10b981" />
                  <rect x="255" y="35" width="25" height="45" rx="2" fill="#10b981" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Preview: Calendar */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          <div className="order-2 lg:order-1 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="rounded-xl bg-slate-950 p-4">
              {/* Mini Calendar Mockup */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-[8px] text-slate-500 py-1">{d}</div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => {
                  const day = i - 2;
                  if (day < 1 || day > 31) return <div key={i} className="h-6 rounded bg-slate-900/50" />;
                  const pnl = [450, -230, 0, 1200, -150, 0, 890, -400, 340, 0, -600, 200, 0, 150, -80, 700, 0, -300, 450, 0, -200, 600, 0, -100, 900, 0, -500, 300, 0, 200, -100];
                  const v = pnl[day - 1] ?? 0;
                  const bg = v > 0 ? 'bg-emerald-500/20 text-emerald-400' : v < 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-900/50 text-slate-600';
                  return (
                    <div key={i} className={`h-6 rounded flex items-center justify-center text-[8px] ${bg}`}>
                      {day}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2">
                <span>Monthly PnL: <span className="text-emerald-400">+₹3,270</span></span>
                <span>Win days: 16 / 31</span>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-xl font-bold text-white mb-3">See your trading at a glance</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The calendar view shows daily PnL at a glance. Spot patterns in your trading week — which days you trade best, and which days to avoid.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              <li className="flex items-center space-x-2"><ArrowRight className="h-3 w-3 text-emerald-400" /><span>Color-coded daily PnL</span></li>
              <li className="flex items-center space-x-2"><ArrowRight className="h-3 w-3 text-emerald-400" /><span>Click any day to see trade details</span></li>
              <li className="flex items-center space-x-2"><ArrowRight className="h-3 w-3 text-emerald-400" /><span>Monthly win/loss day ratio</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 md:p-12 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Start building consistency today</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Track your trades, review your performance, and understand your trading patterns. Free to start.
          </p>
          <button onClick={() => navigate('/signup')} className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors">
            Create Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-3 w-3" />
            </div>
            <span className="text-xs text-slate-500">TradeFlowPro © 2025</span>
          </div>
          <div className="flex items-center space-x-4 text-[10px] text-slate-500">
            <button onClick={() => setModal('privacy')} className="hover:text-slate-300 transition-colors">Privacy</button>
            <button onClick={() => setModal('terms')} className="hover:text-slate-300 transition-colors">Terms</button>
            <button onClick={() => setModal('contact')} className="hover:text-slate-300 transition-colors">Contact</button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {modal === 'privacy' && <PrivacyModal onClose={() => setModal(null)} />}
      {modal === 'terms' && <TermsModal onClose={() => setModal(null)} />}
      {modal === 'contact' && <ContactModal onClose={() => setModal(null)} />}
    </div>
  );
}
