import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Check, X, CheckCircle2, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabaseClient';

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
            <X className="h-3 w-3 text-slate-400 dark:text-slate-650" />
          )}
          <span className={r.met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-500'}>{r.label}</span>
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
  const { user, loading: appLoading } = useApp();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!appLoading && (user.name || user.email)) {
      console.log("[Auth] User already authenticated. Redirecting to dashboard from SignupPage.");
      navigate('/dashboard');
    }
  }, [user, appLoading, navigate]);

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
    setSuccess(false);

    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setError('Please enter a valid email'); return; }
    if (strength.score < 4) { setError('Password does not meet security requirements'); return; }

    setLoading(true);

    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
          }
        }
      });

      if (authErr) {
        setError(authErr.message);
      } else {
        if (data.session) {
          navigate('/onboarding');
        } else {
          setSuccess(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log("[Auth] Continue with Google clicked inside SignupPage");
    console.log("Origin:", window.location.origin);
    console.log("Redirect URL:", `${window.location.origin}/dashboard`);
    setError('');
    setLoading(true);

    try {
      console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
      console.log("Anon Key Present:", !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      const redirectToUrl = `${window.location.origin}/dashboard`;
      console.log("[Auth] signInWithOAuth redirectTo parameter set to:", redirectToUrl);
      
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectToUrl,
        },
      });

      if (authErr) {
        console.error("[Auth] signInWithOAuth returned error:", authErr);
        setError(authErr.message);
      } else {
        console.log("[Auth] signInWithOAuth client call succeeded (redirecting user)");
      }
    } catch (err: any) {
      console.error("[Auth] signInWithOAuth caught exception:", err);
      setError(err?.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
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

        {success ? (
          <div className="text-center animate-in fade-in-50 duration-200">
            <Mail className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Check your email</h1>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We've sent an activation link to <strong className="text-slate-900 dark:text-slate-200">{email}</strong>. 
              Please click the link in the email to complete your registration.
            </p>
            <Link to="/login" className="mt-8 inline-block w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 text-xs font-bold transition-colors cursor-pointer text-center">
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create your account</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start tracking your trades in minutes</p>

            <form onSubmit={handleSignup} className="mt-6 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:border-emerald-500 focus:outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:border-emerald-500 focus:outline-none transition-colors" />
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
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 px-3 py-2.5 pr-10 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 transition-colors cursor-pointer">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordRequirements strength={strength} show={showRequirements && password.length > 0} />
              </div>

              {error && (
                <div className="text-xs text-red-500 font-semibold bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  {error}
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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-semibold">
                <span className="bg-slate-100 dark:bg-[#020617] px-2 text-slate-500 dark:text-slate-400">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google</span>
            </button>

            <p className="mt-6 text-center text-[10px] text-slate-500">
              Already have an account? <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
