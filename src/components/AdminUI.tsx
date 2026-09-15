import type { PropsWithChildren, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

/** Shared design-kit for the admin panel — Fanitt brand accent
 * (orange → pink gradient, from styles/theme.ts), light+dark themes
 * (via Tailwind's `dark:` variant). Every admin page should build its
 * UI out of these instead of hand-rolling one-off card/badge styles,
 * so the whole panel stays visually consistent everywhere at once —
 * upgrading a primitive here upgrades every page that uses it. */

// ---------- Page shell ----------

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-gray-500 dark:text-white/50">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------- Cards ----------

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'rounded-[22px] border border-white/60 bg-white/70 shadow-[0_2px_10px_rgba(16,24,40,0.06)] backdrop-blur-xl',
        'dark:border-white/10 dark:bg-[#171B26]/70 dark:shadow-none',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/** A stat/metric tile for dashboard-style summaries — full tinted
 * color surface (not just a tiny icon chip on white) so a grid of
 * these actually reads as colorful at a glance, big number, label,
 * optional trend line. */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'orange',
  trend,
  index = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'orange' | 'pink' | 'emerald' | 'amber' | 'rose' | 'sky';
  trend?: { value: string; positive?: boolean };
  /** Position within a grid — staggers the mount animation so a row of
   * tiles cascades in left-to-right instead of popping in all at once.
   * Purely cosmetic; omit it for a standalone tile. */
  index?: number;
}) {
  const surfaceClasses: Record<string, string> = {
    orange: 'bg-orange-50/70 border-orange-100/70 dark:bg-orange-500/10 dark:border-orange-500/20',
    pink: 'bg-pink-50/70 border-pink-100/70 dark:bg-pink-500/10 dark:border-pink-500/20',
    emerald: 'bg-emerald-50/70 border-emerald-100/70 dark:bg-emerald-500/10 dark:border-emerald-500/20',
    amber: 'bg-amber-50/70 border-amber-100/70 dark:bg-amber-500/10 dark:border-amber-500/20',
    rose: 'bg-rose-50/70 border-rose-100/70 dark:bg-rose-500/10 dark:border-rose-500/20',
    sky: 'bg-sky-50/70 border-sky-100/70 dark:bg-sky-500/10 dark:border-sky-500/20',
  };
  const iconClasses: Record<string, string> = {
    orange: 'bg-orange-500 text-white shadow-md shadow-orange-500/30',
    pink: 'bg-pink-500 text-white shadow-md shadow-pink-500/30',
    emerald: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30',
    amber: 'bg-amber-500 text-white shadow-md shadow-amber-500/30',
    rose: 'bg-rose-500 text-white shadow-md shadow-rose-500/30',
    sky: 'bg-sky-500 text-white shadow-md shadow-sky-500/30',
  };
  const valueClasses: Record<string, string> = {
    orange: 'text-orange-950 dark:text-white',
    pink: 'text-pink-950 dark:text-white',
    emerald: 'text-emerald-950 dark:text-white',
    amber: 'text-amber-950 dark:text-white',
    rose: 'text-rose-950 dark:text-white',
    sky: 'text-sky-950 dark:text-white',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.04, ease: 'easeOut' }}
      className={cn('rounded-[22px] border p-5 shadow-[0_2px_10px_rgba(16,24,40,0.06)] backdrop-blur-xl', surfaceClasses[accent])}
    >
      <div className="flex items-center justify-between">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', iconClasses[accent])}>
          <Icon size={20} />
        </span>
        {trend && (
          <span className={cn('text-xs font-bold', trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className={cn('mt-4 text-2xl font-extrabold', valueClasses[accent])}>{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-white/50">{label}</p>
    </motion.div>
  );
}

/** Bold gradient variant of a stat tile — full-color brand-gradient
 * surface instead of a tinted icon on white. Use sparingly (1-3 per
 * screen) to spotlight the numbers that matter most; the flat
 * StatCard above stays the default for dense grids. */
export function SpotlightCard({
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-brand-gradient p-5 text-white shadow-[0_10px_30px_rgba(236,42,120,0.28)]">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon size={20} />
        </span>
      </div>
      <p className="relative mt-4 text-2xl font-extrabold">{value}</p>
      <p className="relative mt-0.5 text-xs font-semibold text-white/80">{label}</p>
      {sublabel && <p className="relative mt-3 border-t border-white/20 pt-2 text-[11px] font-medium text-white/75">{sublabel}</p>}
    </div>
  );
}

/** Wallet/balance-style hero card — mirrors a physical card widget
 * (chip mark + masked number rows) but themed entirely in the Fanitt
 * brand gradient rather than a literal bank-card mockup. Only ever
 * fed real numbers from the caller — never invents data itself. */
export function BalanceCard({
  title,
  amount,
  footLeft,
  footRight,
}: {
  title: string;
  amount: string;
  footLeft: { label: string; value: string };
  footRight: { label: string; value: string };
}) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[22px] bg-brand-gradient p-6 text-white shadow-[0_10px_30px_rgba(236,42,120,0.28)]">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-black/10 to-transparent" />
      <div className="relative flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-white/75">{title}</p>
        <span className="h-6 w-9 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 opacity-90" />
      </div>
      <p className="relative mt-6 text-[28px] font-extrabold tracking-tight sm:text-[32px]">{amount}</p>
      <div className="relative mt-6 flex items-end justify-between gap-4 border-t border-white/20 pt-4 text-xs">
        <div>
          <p className="font-medium text-white/65">{footLeft.label}</p>
          <p className="mt-0.5 font-bold">{footLeft.value}</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-white/65">{footRight.label}</p>
          <p className="mt-0.5 font-bold">{footRight.value}</p>
        </div>
      </div>
    </div>
  );
}

/** SVG ring gauge for a single percentage — used for things like
 * "commission held vs revenue". Real percentage in, nothing invented. */
export function RadialProgress({ percent, size = 128, stroke = 12, label }: { percent: number; size?: number; stroke?: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-gray-100 dark:stroke-white/10" fill="none" />
        <defs>
          <linearGradient id="radial-brand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6A1F" />
            <stop offset="100%" stopColor="#EC2A78" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          stroke="url(#radial-brand)"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-extrabold text-gray-900 dark:text-white">{clamped.toFixed(0)}%</span>
        {label && <span className="mt-0.5 text-[10px] font-semibold text-gray-400 dark:text-white/40">{label}</span>}
      </div>
    </div>
  );
}

/** Compact icon+label+value row, for sidecar "snapshot" panels
 * (e.g. a stack of secondary metrics next to a bigger chart). */
export function StatRow({
  icon: Icon,
  label,
  value,
  accent = 'orange',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: 'orange' | 'pink' | 'emerald' | 'amber' | 'rose' | 'sky';
}) {
  const accentClasses: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
    pink: 'bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accentClasses[accent])}>
          <Icon size={16} />
        </span>
        <span className="truncate text-sm font-semibold text-gray-600 dark:text-white/70">{label}</span>
      </div>
      <span className="shrink-0 text-sm font-extrabold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

// ---------- Badges / Pills ----------

const BADGE_TONES: Record<string, string> = {
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  pink: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60',
};

export function Badge({ children, tone = 'gray', className }: PropsWithChildren<{ tone?: keyof typeof BADGE_TONES; className?: string }>) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold', BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

// ---------- Buttons ----------

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: PropsWithChildren<
  {
    variant?: 'primary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    className?: string;
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'>
>) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' };
  const variants: Record<string, string> = {
    primary: 'bg-brand-gradient text-white shadow-md shadow-pink-500/20 hover:brightness-105 hover:shadow-lg hover:shadow-pink-500/25 active:brightness-95',
    outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5',
    ghost: 'text-gray-600 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/5',
    danger: 'border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10',
  };

  return (
    <motion.button
      whileHover={{ scale: props.disabled ? 1 : 1.03 }}
      whileTap={{ scale: props.disabled ? 1 : 0.96 }}
      transition={{ duration: 0.15 }}
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ---------- Tabs (pill-style, used for status filters etc.) ----------

export function TabGroup({ children }: PropsWithChildren) {
  return (
    <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-white/60 bg-white/50 p-1 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
      {children}
    </div>
  );
}

export function Tab({
  active,
  onClick,
  children,
}: PropsWithChildren<{ active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm',
        active
          ? 'bg-white text-orange-700 shadow-sm dark:bg-orange-500/20 dark:text-orange-300'
          : 'text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80'
      )}
    >
      {children}
    </button>
  );
}

// ---------- Empty / loading / error states ----------

export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/30">
        <Icon size={22} />
      </span>
      <p className="text-sm text-gray-500 dark:text-white/50">{message}</p>
    </div>
  );
}
