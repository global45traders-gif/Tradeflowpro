import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { setUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Restore user from localStorage
    try {
      const saved = localStorage.getItem('tradeflow_user');
      if (saved) {
        const u = JSON.parse(saved);
        setUser({ name: u.name || '', email: u.email || email });
      } else {
        setUser({ name: '', email });
      }
    } catch {
      setUser({ name: '', email });
    }
    localStorage.setItem('tradeflow_auth', 'true');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center space-x-2 mb-8 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs">Back to home</span>
        </Link>

        <div className="flex items-center space-x-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">TradeFlow<span className="text-emerald-400">Pro</span></span>
        </div>

        <h1 className="text-xl font-bold text-white">Welcome back</h1>
        <p className="mt-1 text-xs text-slate-400">Sign in to your trading journal</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 pr-9 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <button type="submit"
            className="w-full rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-slate-500">
          Don't have an account? <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 transition-colors">Create one</Link>
        </p>
      </div>
    </div>
  );
}
