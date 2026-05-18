import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="flex items-center space-x-2 mb-8 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs">Back to login</span>
        </Link>

        <div className="flex items-center space-x-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">TradeFlow<span className="text-emerald-400">Pro</span></span>
        </div>

        {sent ? (
          <div className="text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white">Check your email</h1>
            <p className="mt-2 text-xs text-slate-400">We've sent a password reset link to {email}</p>
            <Link to="/login" className="mt-6 inline-block text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              ← Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white">Reset password</h1>
            <p className="mt-1 text-xs text-slate-400">Enter your email to receive a reset link</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input type="email" required placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 pl-9 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors" />
                </div>
              </div>
              <button type="submit"
                className="w-full rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors">
                Send reset link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
