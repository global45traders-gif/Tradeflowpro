import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabaseClient';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { theme } = useTheme();

  const handleLogoClick = () => {
    if (user.name || user.email) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetErr) {
        setError(resetErr.message);
      } else {
        setSent(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 flex items-center justify-center px-4 transition-colors duration-200">
      <div className="w-full max-w-sm">
        {/* Back navigation */}
        <Link to="/login" className="flex items-center space-x-2 mb-8 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs">Back to login</span>
        </Link>

        {/* Logo */}
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

        {sent ? (
          /* Success Screen */
          <div className="text-center animate-in fade-in-50 duration-200">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reset email sent</h1>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We've sent a password reset link to <strong className="text-slate-900 dark:text-slate-200">{email}</strong>. 
              Please click the link in the email to set a new password.
            </p>
            <Link to="/login" className="mt-8 inline-block w-full rounded-lg bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 py-2.5 text-xs font-bold transition-colors cursor-pointer text-center">
              Back to Login
            </Link>
          </div>
        ) : (
          /* Input Form */
          <div className="animate-in fade-in-50 duration-200">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Forgot Your Password?</h1>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enter your email address below, and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 pl-9 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-500 font-semibold bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {loading ? (
                  <span className="animate-pulse">Sending link...</span>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>

            {/* Need Help Support Card */}
            <div className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-xl mt-6 text-left flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Info className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Need Help?</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                  If you are having trouble resetting your password, contact our support team.
                </p>
                <a
                  href="mailto:support@tradeflow.pro"
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors inline-flex items-center space-x-1"
                >
                  <span>support@tradeflow.pro</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
