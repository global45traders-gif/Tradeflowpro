import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Check, X, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

interface PasswordStrength {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  score: number;
  label: string;
  color: string;
  barColor: string;
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
  let label = 'Weak';
  let color = 'text-red-400';
  let barColor = 'bg-red-400';

  if (score >= 4) { label = 'Strong'; color = 'text-emerald-400'; barColor = 'bg-emerald-400'; }
  else if (score >= 3) { label = 'Medium'; color = 'text-amber-400'; barColor = 'bg-amber-400'; }

  return { ...checks, score, label, color, barColor };
}

function PasswordRequirements({ strength, show }: { strength: PasswordStrength; show: boolean }) {
  if (!show) return null;
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
            <X className="h-3 w-3 text-slate-400 dark:text-slate-600" />
          )}
          <span className={r.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'}>{r.label}</span>
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

export default function SignupPage() {
  const { user, setUser } = useApp();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogoClick = () => {
    if (user.name || user.email) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const strength = getPasswordStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setError('Please enter a valid email'); return; }
    if (strength.score < 4) { setError('Password does not meet security requirements'); return; }

    setLoading(true);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));

    setUser({ name: name.trim(), email: email.trim().toLowerCase() });
    localStorage.setItem('tradeflow_auth', 'true');
    setLoading(false);
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center space-x-2 mb-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /><span className="text-xs">Back to home</span>
        </Link>

        <button
          onClick={handleLogoClick}
          aria-label="TradeFlowPro Logo"
          className="flex items-center bg-transparent border-none p-0 outline-none focus:outline-none focus-visible:opacity-80 transition-opacity cursor-pointer hover:opacity-90 mb-8"
          type="button"
        >
          <img
            src={theme === 'dark' ? '/logo-unified-dark.png' : '/logo-unified.png'}
            alt="TradeFlowPro Logo"
            className="h-11 w-auto object-contain"
          />
        </button>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create your account</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start tracking your trades in minutes</p>

        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors" />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors" />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value.trimStart()); setShowRequirements(true); }}
                onFocus={() => setShowRequirements(true)}
                placeholder="Create a strong password"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 pr-10 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 transition-colors cursor-pointer">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordRequirements strength={strength} show={showRequirements && password.length > 0} />
          </div>

          {error && (
            <div className="flex items-center space-x-1.5 text-xs text-red-500">
              <X className="h-3.5 w-3.5" /><span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading || strength.score < 4 || !name.trim() || !email.trim()}
            className="w-full rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 cursor-pointer">
            {loading ? (
              <span className="animate-pulse">Creating account...</span>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /><span>Create Account</span></>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-slate-500">
          Already have an account? <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
