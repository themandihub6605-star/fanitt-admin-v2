// File: src/pages/Login.tsx  (fanitt-admin)
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from '@/icons';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/services/apiClient';
import { cn } from '@/utils/cn';

const CODE_LENGTH = 6;
const CODE_VALID_SECONDS = 10 * 60;
const RESEND_AFTER_SECONDS = 30;

const field =
  'peer h-12 w-full rounded-[12px] border border-gray-200 bg-white pl-11 pr-4 text-[14.5px] text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 focus:border-[#FF5A1F] focus:ring-4 focus:ring-[#FF5A1F]/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30 dark:hover:border-white/20';

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyCode, logout, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expired, setExpired] = useState(false);

  // Step 2: code sent to the admin's email.
  const [otp, setOtp] = useState<{ challenge: string; email: string } | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [validFor, setValidFor] = useState(CODE_VALID_SECONDS);
  const [resendIn, setResendIn] = useState(RESEND_AFTER_SECONDS);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

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

  // Code timers.
  useEffect(() => {
    if (!otp) return;
    const t = window.setInterval(() => {
      setValidFor((v) => (v > 0 ? v - 1 : 0));
      setResendIn((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [otp]);

  const goIn = () => {
    const from = (location.state as { from?: string } | null)?.from || '/';
    navigate(from, { replace: true });
  };

  const startCodeStep = (challenge: string, maskedEmail: string) => {
    setOtp({ challenge, email: maskedEmail });
    setDigits(Array(CODE_LENGTH).fill(''));
    setValidFor(CODE_VALID_SECONDS);
    setResendIn(RESEND_AFTER_SECONDS);
    window.setTimeout(() => boxes.current[0]?.focus(), 80);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setExpired(false);
    setLoading(true);
    try {
      const outcome = await login(email.trim(), password);
      if ('otp' in outcome) {
        startCodeStep(outcome.otp.challenge, outcome.otp.email);
        setLoading(false);
        return;
      }
      if (outcome.user.role !== 'admin') {
        await logout();
        setError(`${outcome.user.email} isn’t an admin account. Sign in with an admin account.`);
        setLoading(false);
        return;
      }
      goIn();
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Sign-in failed — check your email and password');
      setLoading(false);
    }
  };

  const verify = async (code: string) => {
    if (!otp || code.length !== CODE_LENGTH || loading) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const u = await verifyCode(otp.challenge, code);
      if (u.role !== 'admin') {
        await logout();
        setError('This isn’t an admin account.');
        setLoading(false);
        return;
      }
      goIn();
    } catch (err) {
      setError(getApiErrorMessage(err) || 'That code didn’t work — try again');
      setDigits(Array(CODE_LENGTH).fill(''));
      setLoading(false);
      window.setTimeout(() => boxes.current[0]?.focus(), 50);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || resending) return;
    setError('');
    setNotice('');
    setResending(true);
    try {
      const outcome = await login(email.trim(), password);
      if ('otp' in outcome) {
        startCodeStep(outcome.otp.challenge, outcome.otp.email);
        setNotice('A new code is on its way. Older codes no longer work.');
      } else {
        goIn();
      }
    } catch (err) {
      setError(getApiErrorMessage(err) || 'Couldn’t send a new code — try again');
    } finally {
      setResending(false);
    }
  };

  const backToSignIn = () => {
    setOtp(null);
    setDigits(Array(CODE_LENGTH).fill(''));
    setError('');
    setNotice('');
    setPassword('');
  };

  const setDigitsAndMaybeVerify = (next: string[]) => {
    setDigits(next);
    const joined = next.join('');
    if (joined.length === CODE_LENGTH) void verify(joined);
  };

  const onDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    const next = [...digits];
    if (!clean) {
      next[i] = '';
      setDigits(next);
      return;
    }
    // Typed or autofilled several digits: spread them forward.
    clean
      .slice(0, CODE_LENGTH - i)
      .split('')
      .forEach((d, k) => (next[i + k] = d));
    boxes.current[Math.min(i + clean.length, CODE_LENGTH - 1)]?.focus();
    setDigitsAndMaybeVerify(next);
  };

  const onDigitKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = '';
      setDigits(next);
      boxes.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      boxes.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < CODE_LENGTH - 1) {
      boxes.current[i + 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const clean = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!clean) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    clean.split('').forEach((d, k) => (next[k] = d));
    boxes.current[Math.min(clean.length, CODE_LENGTH - 1)]?.focus();
    setDigitsAndMaybeVerify(next);
  };

  const code = digits.join('');
  const codeExpired = otp !== null && validFor === 0;

  return (
    <div className="relative grid min-h-screen bg-[#F6F7F9] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] dark:bg-[#0A0B0F]">
      {/* ───────── Brand side ───────── */}
      <aside className="relative hidden overflow-hidden bg-[#0B0B10] text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-[#FF5A1F]/30 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-48 -right-24 h-[520px] w-[520px] rounded-full bg-[#EC2A78]/25 blur-[120px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at 40% 40%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 40% 40%, black 30%, transparent 75%)',
          }}
        />

        <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <span className="rounded-[12px] bg-white px-3 py-2 shadow-lg shadow-black/20">
              <Logo className="h-7 w-auto" />
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
              Admin console
            </span>
          </div>

          <div className="max-w-lg">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[44px] font-bold text-white leading-[1.08] tracking-[-0.03em] xl:text-[52px]"
            >
              Run all of Fanitt
              <br />
              <span className="bg-gradient-to-r from-[#FF7A45] via-[#FF5A1F] to-[#EC2A78] bg-clip-text text-transparent">from one place.</span>
            </motion.h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/55">
              Approvals, payouts, content, campaigns, the store and system health — with every admin action recorded.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-3 xl:grid-cols-3">
              {[
                { icon: Activity, title: 'Live activity', text: 'App and website' },
                { icon: Wallet, title: 'Money', text: 'Payouts & escrow' },
                { icon: Sparkles, title: 'Audit trail', text: 'Every change logged' },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                  className="rounded-[14px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#FF5A1F] to-[#EC2A78] shadow-lg shadow-[#FF5A1F]/25">
                    <f.icon size={17} />
                  </span>
                  <p className="mt-3 text-sm font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-xs text-white/45">{f.text}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/35">
            <span>© {new Date().getFullYear()} Fanitt</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" /> Admin access only
            </span>
          </div>
        </div>
      </aside>

      {/* ───────── Form side ───────── */}
      <main className="relative flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#FF5A1F]/10 to-transparent lg:hidden" />

        <div className="relative w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo className="h-8 w-auto" />
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              Admin
            </span>
          </div>

          {/* Steps */}
          <div className="mb-6 flex items-center gap-2">
            {['Account', 'Verify'].map((label, i) => {
              const active = (otp ? 1 : 0) >= i;
              return (
                <div key={label} className={cn('flex items-center gap-2', i === 0 && 'flex-1')}>
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                      active ? 'bg-gradient-to-br from-[#FF5A1F] to-[#EC2A78] text-white' : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/40',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn('text-xs font-semibold', active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40')}>{label}</span>
                  {i === 0 && (
                    <span className="mx-1 h-[2px] flex-1 overflow-hidden rounded bg-gray-200 dark:bg-white/10">
                      <span className={cn('block h-full bg-gradient-to-r from-[#FF5A1F] to-[#EC2A78] transition-all duration-500', otp ? 'w-full' : 'w-0')} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-[24px] border border-gray-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_48px_-24px_rgba(16,24,40,0.18)] sm:p-8 dark:border-white/10 dark:bg-[#111318] dark:shadow-none">
            <AnimatePresence mode="wait" initial={false}>
              {!otp ? (
                <motion.div key="signin" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#FF5A1F]/10 text-[#FF5A1F]">
                    <KeyRound size={20} />
                  </span>
                  <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-gray-950 dark:text-white">Welcome back</h1>
                  <p className="mt-1.5 text-sm text-gray-500 dark:text-white/50">Sign in with your Fanitt admin account.</p>

                  {(expired || error) && (
                    <div className="mt-6 space-y-3">
                      {expired && <Banner tone="info">Your session ended. Please sign in again.</Banner>}
                      {error && <Banner tone="error">{error}</Banner>}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-semibold text-gray-700 dark:text-white/80">Email</span>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          autoFocus
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@fanitt.com"
                          className={field}
                        />
                        <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors peer-focus:text-[#FF5A1F]" />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-semibold text-gray-700 dark:text-white/80">Password</span>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                          onBlur={() => setCapsLock(false)}
                          placeholder="Enter your password"
                          className={cn(field, 'pr-12')}
                        />
                        <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors peer-focus:text-[#FF5A1F]" />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                      {capsLock && (
                        <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <Info size={13} /> Caps Lock is on
                        </span>
                      )}
                    </label>

                    <div className="pt-1">
                      <PrimaryButton loading={loading} disabled={!email || !password}>
                        {loading ? 'Signing in…' : 'Continue'}
                      </PrimaryButton>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="verify" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.22 }}>
                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="-ml-1 flex items-center gap-1.5 rounded-[8px] px-1 py-0.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <span className="mt-4 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#FF5A1F]/10 text-[#FF5A1F]">
                    <Mail size={20} />
                  </span>
                  <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-gray-950 dark:text-white">Check your email</h1>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-white/50">
                    Enter the 6-digit code we sent to <span className="font-semibold text-gray-900 dark:text-white">{otp.email}</span>
                  </p>

                  {(notice || error || codeExpired) && (
                    <div className="mt-6 space-y-3">
                      {notice && <Banner tone="success">{notice}</Banner>}
                      {error && <Banner tone="error">{error}</Banner>}
                      {codeExpired && <Banner tone="warning">This code has expired. Send a new one.</Banner>}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void verify(code);
                    }}
                    className="mt-6"
                  >
                    <div className="flex justify-between gap-2" onPaste={onPaste}>
                      {digits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            boxes.current[i] = el;
                          }}
                          value={d}
                          onChange={(e) => onDigit(i, e.target.value)}
                          onKeyDown={(e) => onDigitKey(i, e)}
                          onFocus={(e) => e.target.select()}
                          inputMode="numeric"
                          autoComplete={i === 0 ? 'one-time-code' : 'off'}
                          maxLength={CODE_LENGTH}
                          disabled={loading || codeExpired}
                          aria-label={`Digit ${i + 1}`}
                          className={cn(
                            'h-14 w-full min-w-0 rounded-[12px] border bg-white text-center text-[22px] font-bold text-gray-950 caret-[#FF5A1F] outline-none transition-all focus:border-[#FF5A1F] focus:ring-4 focus:ring-[#FF5A1F]/10 disabled:opacity-60 dark:bg-white/[0.04] dark:text-white',
                            d ? 'border-gray-300 dark:border-white/25' : 'border-gray-200 dark:border-white/10',
                            error && !d && 'border-rose-300 dark:border-rose-500/40',
                          )}
                        />
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className={cn('font-medium', validFor < 60 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-white/40')}>
                        {codeExpired ? 'Code expired' : `Expires in ${formatTime(validFor)}`}
                      </span>
                      <button
                        type="button"
                        onClick={resend}
                        disabled={resendIn > 0 || resending}
                        className="flex items-center gap-1.5 font-semibold text-[#FF5A1F] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-white/30"
                      >
                        <RefreshCw size={12} className={cn(resending && 'animate-spin')} />
                        {resendIn > 0 ? `Resend in ${resendIn}s` : resending ? 'Sending…' : 'Resend code'}
                      </button>
                    </div>

                    <div className="mt-6">
                      <PrimaryButton loading={loading} disabled={code.length !== CODE_LENGTH || codeExpired}>
                        {loading ? 'Verifying…' : 'Verify and sign in'}
                      </PrimaryButton>
                    </div>
                  </form>
                  <p className="mt-4 text-center text-xs text-gray-400 dark:text-white/40">Can’t find it? Check your spam folder.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400 dark:text-white/40">
            <ShieldCheck size={13} className="text-emerald-500" /> Restricted area. Sign-ins and failed attempts are logged.
          </p>
        </div>
      </main>
    </div>
  );
}

function PrimaryButton({ loading, disabled, children }: { loading: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-[12px] bg-gradient-to-r from-[#FF5A1F] to-[#EC2A78] text-[14.5px] font-semibold text-white shadow-lg shadow-[#FF5A1F]/25 transition-all hover:shadow-xl hover:shadow-[#FF5A1F]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      {loading ? <Loader2 size={17} className="animate-spin" /> : null}
      {children}
      {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
    </button>
  );
}

function Banner({ tone, children }: { tone: 'info' | 'error' | 'success' | 'warning'; children: React.ReactNode }) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
    error: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  }[tone];
  const Icon = tone === 'error' || tone === 'warning' ? AlertCircle : tone === 'success' ? ShieldCheck : Info;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-start gap-2.5 rounded-[12px] border px-3.5 py-3 text-[13px] leading-relaxed', styles)}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </motion.div>
  );
}