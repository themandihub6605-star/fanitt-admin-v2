import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== 'admin') {
        setError(`${user.email} isn't an admin account.`);
        setLoading(false);
        return;
      }
      const from = (location.state as { from?: string } | null)?.from || '/';
      navigate(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed — check your email and password');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl"
      >
        <div className="text-center">
          <Logo className="mx-auto h-9 w-auto" />
          <p className="mt-2 text-sm font-semibold text-white/50">Super Admin Panel</p>
          <h1 className="mt-6 text-xl font-bold text-white">Sign in to continue</h1>
          <p className="mt-1 text-sm text-white/50">Admin accounts only.</p>
        </div>

        {error && (
          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-red-400">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-white/60">Email</span>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fanitt.com"
                className="w-full rounded-xl border border-white/10 bg-navy-800/60 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-white/60">Password</span>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-navy-800/60 py-2.5 pl-11 pr-11 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#FF6A1F_0%,#F9436E_60%,#EC2A78_100%)] py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
          </motion.button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-white/35">
          <ShieldCheck size={12} className="text-emerald-400" /> Restricted access
        </p>
      </motion.div>
    </div>
  );
}