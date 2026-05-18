import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, DollarSign, BarChart3, Shield } from 'lucide-react';
import { CURRENCIES } from '../utils/currency';
import { useApp } from '../context/AppContext';

export default function OnboardingPage() {
  const { user, createAccount, setActiveAccount } = useApp();
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [capital, setCapital] = useState('');
  const [risk, setRisk] = useState('1');
  const navigate = useNavigate();

  const handleComplete = () => {
    // Create the first trading account with onboarding data
    const newAcc = createAccount({
      name: `${user.name || 'Trader'}'s Account`,
      tag: 'Equity' as const,
      capital: capital ? parseFloat(capital) : 50000,
      riskPerTradePercent: risk ? parseFloat(risk) : 1,
      brokerType: 'zerodha' as const,
      brokeragePerOrder: 20,
      brokeragePercent: 0,
      currencyCode: currency,
    } as any);
    setActiveAccount(newAcc.id);
    navigate('/dashboard');
  };

  const steps = [
    {
      icon: DollarSign,
      title: 'Welcome to TradeFlow Pro',
      desc: 'Let\'s set up your trading journal. This takes less than 2 minutes.',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors">
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Starting Capital</label>
            <input type="number" placeholder="50000" value={capital} onChange={(e) => setCapital(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors" />
          </div>
        </div>
      ),
    },
    {
      icon: BarChart3,
      title: 'Set your risk per trade',
      desc: 'Recommended: 1-2% of capital per trade.',
      content: (
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Risk per trade (%)</label>
          <input type="number" step="0.1" min="0.1" max="10" placeholder="1.0" value={risk} onChange={(e) => setRisk(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors" />
          <p className="text-[10px] text-slate-500 mt-1.5">At {risk}% risk on {capital || '$50,000'}, you'd risk ~{currency === 'INR' ? '₹' : '$'}{Math.round((parseFloat(risk) || 1) / 100 * (parseFloat(capital) || 50000)).toLocaleString()} per trade.</p>
        </div>
      ),
    },
    {
      icon: Shield,
      title: 'You\'re all set',
      desc: 'Your account is ready. Start by logging or importing your first trades.',
      content: (
        <div className="text-center py-4">
          <p className="text-xs text-slate-400">Currency: <span className="text-white">{currency}</span></p>
          <p className="text-xs text-slate-400 mt-1">Capital: <span className="text-white">{capital || '50,000'}</span></p>
          <p className="text-xs text-slate-400 mt-1">Risk: <span className="text-white">{risk}%</span> per trade</p>
        </div>
      ),
    },
  ];

  const StepIcon = steps[step].icon;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex items-center space-x-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          ))}
        </div>

        <div className="flex items-center space-x-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <StepIcon className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">TradeFlow<span className="text-emerald-400">Pro</span></span>
        </div>

        <h1 className="text-xl font-bold text-white mt-4">{steps[step].title}</h1>
        <p className="mt-1 text-xs text-slate-400">{steps[step].desc}</p>

        <div className="mt-6">{steps[step].content}</div>

        <div className="mt-6 flex space-x-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="flex-1 rounded-lg border border-slate-800 bg-slate-900 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors">
              Back
            </button>
          )}
          <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : handleComplete()}
            className="flex-1 flex items-center justify-center space-x-1.5 rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors">
            <span>{step < steps.length - 1 ? 'Continue' : 'Get started'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
