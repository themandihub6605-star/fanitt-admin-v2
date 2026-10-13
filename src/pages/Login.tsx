import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, Wallet } from '@/icons';
import { Logo } from '@/components/Logo';
import { Button, Notice, inputClass } from '@/components/AdminUI';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/services/apiClient';
import { cn } from '@/utils/cn';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('fanitt_admin_session_expired')) {
        setExpired(true);
        sessionStorage.removeItem('fanitt_admin_session_expired');
      }
    } catch {
      // storage blocked
    }
  }, []);

  // Already signed in as an admin → go straight in.
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') navigate('/', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExpired(false);
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role !== 'admin') {
        await logout();
        setError(`${u.email} isn’t an admin account. Sign in with an admin account.`);
        setLoading(false);
        return;
      }
      const from = (location.state as { from?: string } | null)?.from || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Sign-in failed — check your email and password');
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[#F7F8FA] lg:grid-cols-[1fr_480px] dark:bg-[#0B0D12]">
      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-gray-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-orange-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[480px] w-[480px] rounded-full bg-pink-500/20 blur-3xl" />
        <Logo className="relative h-9 w-auto" />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">Run all of Fanitt from one place.</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">Approvals, payouts, content, campaigns, the store and system health — with every admin action recorded.</p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Activity, text: 'Live activity across the app and website' },
              { icon: Wallet, text: 'Payouts, escrow and disputes in one queue' },
              { icon: Sparkles, text: 'Every change logged in the audit trail' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <f.icon size={15} />
                </span>
                {f.text}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/35">© {new Date().getFullYear()} Fanitt · Admin access only</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-sm">
          <Logo className="h-8 w-auto lg:hidden" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-gray-950 dark:text-white lg:mt-0">Sign in to the admin panel</h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-white/50">Use your Fanitt admin account.</p>

          {expired && (
            <Notice tone="info" className="mt-5">
              Your session ended. Please sign in again.
            </Notice>
          )}
          {error && (
            <Notice tone="error" className="mt-5">
              {error}
            </Notice>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-white/80">Email</span>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@fanitt.com" className={cn(inputClass, 'h-10 pl-9')} />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-white/80">Password</span>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(inputClass, 'h-10 pl-9 pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
            <Button type="submit" loading={loading} className="h-10 w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck size={13} className="text-emerald-500" /> Restricted area. Sign-ins and failed attempts are logged.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
