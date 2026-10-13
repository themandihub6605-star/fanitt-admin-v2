import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { LucideIcon } from '@/icons';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Rows2,
  Rows3,
  Info,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  X,
} from '@/icons';
import { motion, animate, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

/* ───────────────────────────────────────────────────────────────────────────
 * Fanitt Admin design kit.
 *
 * Every page builds its UI from these pieces, so the whole panel looks and
 * behaves the same everywhere — change a primitive here and every page that
 * uses it changes with it.
 *
 *   Layout      PageHeader, Card, CardHeader, Section
 *   Numbers     KpiCard, StatCard, StatRow, TrendPill, Sparkline, RadialProgress,
 *               SpotlightCard, BalanceCard, fmt
 *   Data        DataTable (search / sort / paging / select / CSV), Pagination,
 *               Toolbar, SearchInput, Select, exportCsv, useDebouncedValue
 *   Status      Badge, StatusBadge, Avatar
 *   Feedback    EmptyState, ErrorState, LoadingState, Skeleton, Notice,
 *               ConfirmHost + confirmDialog() / promptDialog(), ToastHost + toast
 *   Overlays    Drawer, Dialog
 *   Forms       Field, inputClass, Button, IconButton, TabGroup/Tab, SegmentedControl
 * ─────────────────────────────────────────────────────────────────────────── */

export type Tone = 'orange' | 'pink' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'gray';

// ---------- Formatting helpers ----------

export const fmt = {
  number: (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toLocaleString('en-IN')),
  compact: (n: number | null | undefined) => {
    if (n === null || n === undefined) return '—';
    if (Math.abs(n) >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1).replace(/\.0$/, '')}Cr`;
    if (Math.abs(n) >= 1_00_000) return `${(n / 1_00_000).toFixed(1).replace(/\.0$/, '')}L`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(Math.round(n));
  },
  /** Paise → "₹1,234". */
  rupees: (paise: number | null | undefined) => (paise === null || paise === undefined ? '—' : `₹${Math.round(paise / 100).toLocaleString('en-IN')}`),
  /** Paise → "₹1.2L". */
  rupeesCompact: (paise: number | null | undefined) => (paise === null || paise === undefined ? '—' : `₹${fmt.compact(paise / 100)}`),
  date: (iso: string | Date | null | undefined) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'),
  dateTime: (iso: string | Date | null | undefined) =>
    iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
  ago: (iso: string | Date | null | undefined) => {
    if (!iso) return '—';
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`;
    return fmt.date(iso);
  },
  /** current vs previous → % change, or null when there's nothing to compare. */
  change: (current: number | null | undefined, previous: number | null | undefined) => {
    if (current === null || current === undefined || previous === null || previous === undefined) return null;
    if (previous === 0) return current === 0 ? 0 : null;
    return ((current - previous) / previous) * 100;
  },
  label: (v: string | null | undefined) => (v ? v.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—'),
};

// ---------- Page shell ----------

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string; icon?: LucideIcon }) {
  return (
    <div className="rise mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-gray-950 dark:text-white sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-[13.5px] text-gray-500 dark:text-white/50">{description}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------- Cards ----------

export function Card({ children, className, onClick }: PropsWithChildren<{ className?: string; onClick?: () => void }>) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rise rounded-xl border border-gray-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-18px_rgba(16,24,40,0.12)]',
        'dark:border-white/[0.07] dark:bg-[#12161f] dark:shadow-none',
        onClick && 'lift cursor-pointer hover:border-orange-200 dark:hover:border-orange-400/30',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Title row inside a card. */
export function CardHeader({ title, description, icon: Icon, actions, className }: { title: ReactNode; description?: ReactNode; icon?: LucideIcon; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20">
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-white/45">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Heading that separates groups on a long page. */
export function Section({ title, description, actions, children, className }: PropsWithChildren<{ title: string; description?: string; actions?: ReactNode; className?: string }>) {
  return (
    <section className={cn('mt-8 first:mt-0', className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-white/45">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export const TONE_SOFT: Record<Tone, string> = {
  orange: 'bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20',
  pink: 'bg-pink-50 text-pink-600 ring-pink-100 dark:bg-pink-500/10 dark:text-pink-300 dark:ring-pink-500/20',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
  gray: 'bg-gray-50 text-gray-500 ring-gray-200 dark:bg-white/5 dark:text-white/60 dark:ring-white/10',
};

/** "↑ 12.4%" pill. `invert` for metrics where going up is bad (errors, failures). */
export function TrendPill({ change, invert = false, suffix = 'vs previous period', className }: { change: number | null; invert?: boolean; suffix?: string; className?: string }) {
  if (change === null || !Number.isFinite(change)) return suffix ? <span className={cn('text-xs text-gray-400 dark:text-white/35', className)}>No earlier data to compare</span> : <span className={cn('rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-white/10 dark:text-white/50', className)}>New</span>;
  const up = change > 0;
  const flat = Math.abs(change) < 0.05;
  const good = flat ? null : invert ? !up : up;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums',
          good === null ? 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60' : good ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
        )}
      >
        {!flat && (up ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
        {Math.abs(change) >= 1000 ? '999+' : Math.abs(change).toFixed(Math.abs(change) < 10 ? 1 : 0)}%
      </span>
      {suffix && <span className="text-gray-400 dark:text-white/35">{suffix}</span>}
    </span>
  );
}

const TONE_HEX: Record<Tone, string> = { orange: '#FF5A1F', pink: '#EC2A78', emerald: '#10B981', amber: '#F59E0B', rose: '#F43F5E', sky: '#0EA5E9', violet: '#8B5CF6', gray: '#9CA3AF' };
export const toneHex = (t: Tone) => TONE_HEX[t];

/** Tiny inline line chart (SVG) — real values only. */
export function Sparkline({ values, tone = 'orange', height = 36, className }: { values: number[]; tone?: Tone; height?: number; className?: string }) {
  const uid = useRef(`spark-${Math.random().toString(36).slice(2, 9)}`).current;
  if (!values.length || values.every((v) => v === 0)) return <div className={cn('h-9', className)} />;
  const w = 120;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => [values.length === 1 ? w : (i / (values.length - 1)) * w, height - 3 - ((v - min) / (max - min || 1)) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn('h-9 w-full', className)} aria-hidden>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TONE_HEX[tone]} stopOpacity={0.18} />
          <stop offset="100%" stopColor={TONE_HEX[tone]} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${height} L0,${height} Z`} fill={`url(#${uid})`} />
      <path d={d} fill="none" stroke={TONE_HEX[tone]} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Animates the first number inside a formatted value ("₹1.2L", "4,210") from 0 on mount / change. */
export function CountUp({ value, duration = 650 }: { value: ReactNode; duration?: number }) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : null;
  const match = text ? text.match(/-?[\d,]*\.?\d+/) : null;
  const target = match ? Number(match[0].replace(/,/g, '')) : NaN;
  const decimals = match && match[0].includes('.') ? match[0].split('.')[1].length : 0;
  const grouped = !!match && match[0].includes(',');
  const [n, setN] = useState(Number.isFinite(target) ? target : 0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || target === 0) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  if (!text || !match || !Number.isFinite(target)) return <>{value}</>;
  const shown = grouped ? n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n.toFixed(decimals);
  return <>{text.replace(match[0], shown)}</>;
}

/** Eight short bars built from a series (newest last) — the KPI card footer. */
export function SegBars({ values, tone = 'orange', className }: { values: number[]; tone?: Tone; className?: string }) {
  const N = 8;
  if (!values.length) return null;
  const size = Math.max(1, Math.ceil(values.length / N));
  const buckets = Array.from({ length: N }, (_, i) => values.slice(Math.max(0, values.length - (N - i) * size), values.length - (N - i - 1) * size).reduce((a, b) => a + b, 0));
  const max = Math.max(...buckets, 1);
  return (
    <div className={cn('flex h-6 items-end gap-1', className)} aria-hidden>
      {buckets.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-[4px] transition-[height] duration-700"
          style={{ height: `${Math.max(28, (v / max) * 100)}%`, background: TONE_HEX[tone], opacity: 0.28 + (i / (N - 1)) * 0.72 }}
        />
      ))}
    </div>
  );
}

/** Dashboard metric: label, big number, change vs previous period, optional sparkline. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'orange',
  change,
  invert,
  hint,
  spark,
  to,
  loading,
  unavailable,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  change?: number | null;
  invert?: boolean;
  hint?: ReactNode;
  spark?: number[];
  /** Drill-down link. */
  to?: string;
  loading?: boolean;
  /** The backend doesn't collect this yet — shown as "Not tracked". */
  unavailable?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        {Icon ? (
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1', TONE_SOFT[tone])}>
            <Icon size={18} />
          </span>
        ) : (
          <p className="text-[13px] font-medium text-gray-500 dark:text-white/50">{label}</p>
        )}
        {!loading && !unavailable && change !== undefined && <TrendPill change={change} invert={invert} suffix="" />}
      </div>
      {loading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ) : unavailable ? (
        <>
          <p className="mt-4 text-xl font-semibold text-gray-300 dark:text-white/25">Not tracked</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-white/35">The backend doesn’t record this</p>
        </>
      ) : (
        <>
          <p className="mt-4 text-[26px] font-semibold leading-none tracking-tight text-gray-950 tabular-nums dark:text-white">
            <CountUp value={value} />
          </p>
          {Icon && <p className="mt-1.5 text-[13px] text-gray-500 dark:text-white/50">{label}</p>}
          {hint && <p className="mt-0.5 truncate text-[11.5px] text-gray-400 dark:text-white/35">{hint}</p>}
        </>
      )}
      {spark && !loading && !unavailable && <SegBars values={spark} tone={tone} className="mt-4" />}
    </>
  );
  const cls = cn(
    'rise relative block overflow-hidden rounded-xl border border-gray-200/80 bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-18px_rgba(16,24,40,0.12)] dark:border-white/[0.07] dark:bg-[#12161f]',
    to && 'lift hover:border-orange-200 dark:hover:border-orange-400/30'
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Older stat tile (kept for existing pages) — same calm style as KpiCard. */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'orange',
  trend,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'orange' | 'pink' | 'emerald' | 'amber' | 'rose' | 'sky';
  trend?: { value: string; positive?: boolean };
  index?: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/[0.08] dark:bg-[#141821]">
      <div className="flex items-center justify-between">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg ring-1', TONE_SOFT[accent])}>
          <Icon size={17} />
        </span>
        {trend && (
          <span className={cn('text-xs font-semibold', trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-gray-950 tabular-nums dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-white/50">{label}</p>
    </div>
  );
}

export function SpotlightCard({ label, value, sublabel, icon: Icon }: { label: string; value: string | number; sublabel?: string; icon: LucideIcon }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gray-950 p-5 text-white shadow-[0_8px_24px_rgba(16,24,40,0.18)] dark:bg-white/[0.06]">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-500/25 blur-2xl" />
      <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
        <Icon size={17} />
      </span>
      <p className="relative mt-4 text-2xl font-bold tabular-nums">{value}</p>
      <p className="relative mt-0.5 text-xs font-medium text-white/70">{label}</p>
      {sublabel && <p className="relative mt-3 border-t border-white/15 pt-2 text-[11px] text-white/60">{sublabel}</p>}
    </div>
  );
}

export function BalanceCard({ title, amount, footLeft, footRight }: { title: string; amount: string; footLeft: { label: string; value: string }; footRight: { label: string; value: string } }) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-gray-950 p-6 text-white shadow-[0_8px_24px_rgba(16,24,40,0.18)] dark:bg-white/[0.06]">
      <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-orange-500/40 to-pink-500/30 blur-2xl" />
      <p className="relative text-xs font-semibold uppercase tracking-wider text-white/60">{title}</p>
      <p className="relative mt-5 text-[30px] font-bold tracking-tight tabular-nums">{amount}</p>
      <div className="relative mt-6 flex items-end justify-between gap-4 border-t border-white/15 pt-4 text-xs">
        <div>
          <p className="text-white/55">{footLeft.label}</p>
          <p className="mt-0.5 font-semibold">{footLeft.value}</p>
        </div>
        <div className="text-right">
          <p className="text-white/55">{footRight.label}</p>
          <p className="mt-0.5 font-semibold">{footRight.value}</p>
        </div>
      </div>
    </div>
  );
}

export function RadialProgress({ percent, size = 128, stroke = 12, label }: { percent: number; size?: number; stroke?: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, clamped, { duration: 0.8, ease: 'easeOut', onUpdate: (v) => setDisplayValue(v) });
    return () => controls.stop();
  }, [clamped]);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-gray-100 dark:stroke-white/10" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke="#FF5A1F" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-gray-900 tabular-nums dark:text-white">{displayValue.toFixed(0)}%</span>
        {label && <span className="mt-0.5 text-[10px] font-medium text-gray-400 dark:text-white/40">{label}</span>}
      </div>
    </div>
  );
}

export function StatRow({ icon: Icon, label, value, accent = 'orange', to }: { icon: LucideIcon; label: string; value: string | number; accent?: Tone; index?: number; to?: string }) {
  const inner = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1', TONE_SOFT[accent])}>
          <Icon size={15} />
        </span>
        <span className="truncate text-sm text-gray-600 dark:text-white/70">{label}</span>
      </div>
      <span className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums dark:text-white">{value}</span>
    </>
  );
  return to ? (
    <Link to={to} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5">
      {inner}
    </Link>
  ) : (
    <div className="flex items-center justify-between gap-3 py-2.5">{inner}</div>
  );
}

// ---------- Badges / avatar ----------

const BADGE_TONES: Record<Tone, string> = {
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-400/20',
  pink: 'bg-pink-50 text-pink-700 ring-pink-600/15 dark:bg-pink-500/15 dark:text-pink-300 dark:ring-pink-400/20',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/20',
  gray: 'bg-gray-50 text-gray-600 ring-gray-500/15 dark:bg-white/10 dark:text-white/60 dark:ring-white/10',
};

export function Badge({ children, tone = 'gray', className, dot }: PropsWithChildren<{ tone?: Tone; className?: string; dot?: boolean }>) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', BADGE_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

/** Known status words → colour. Unknown words fall back to gray. */
const STATUS_TONE: Record<string, Tone> = {
  active: 'emerald', verified: 'emerald', approved: 'emerald', success: 'emerald', completed: 'emerald', paid: 'emerald', released: 'emerald', delivered: 'emerald', live: 'emerald', published: 'emerald', resolved: 'emerald', sent: 'emerald', open: 'sky',
  pending: 'amber', initiated: 'amber', processing: 'sky', pending_review: 'amber', submitted: 'sky', in_progress: 'sky', in_escrow: 'violet', funded: 'violet', scheduled: 'sky', placed: 'sky', confirmed: 'sky', shipped: 'sky', draft: 'gray', awaiting_payment: 'gray',
  rejected: 'rose', failed: 'rose', suspended: 'rose', cancelled: 'rose', disputed: 'rose', refunded: 'violet', removed: 'rose', payment_failed: 'rose', expired: 'gray', changes_requested: 'amber', unverified: 'gray', not_submitted: 'gray', hidden: 'gray', ended: 'gray',
};

export function StatusBadge({ status, label }: { status: string | null | undefined; label?: string }) {
  const key = String(status || '').toLowerCase();
  return (
    <Badge tone={STATUS_TONE[key] ?? 'gray'} dot>
      {label ?? fmt.label(key || 'unknown')}
    </Badge>
  );
}

export function Avatar({ name, src, size = 32, className }: { name?: string | null; src?: string | null; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  if (src && !broken) {
    return <img src={src} alt="" onError={() => setBroken(true)} className={cn('shrink-0 rounded-full object-cover ring-1 ring-black/5', className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-pink-100 font-semibold text-orange-700 dark:from-orange-500/20 dark:to-pink-500/20 dark:text-orange-200', className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
    >
      {initials || '?'}
    </span>
  );
}

// ---------- Buttons ----------

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading,
  ...props
}: PropsWithChildren<
  {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
    size?: 'xs' | 'sm' | 'md';
    className?: string;
    loading?: boolean;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>) {
  const base =
    'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-[background-color,border-color,color,box-shadow,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-50';
  const sizes = { xs: 'h-7 px-2.5 text-xs', sm: 'h-9 px-3.5 text-[13px]', md: 'h-10 px-4 text-[13.5px]' };
  const variants: Record<string, string> = {
    primary: 'bg-orange-500 text-white shadow-[0_8px_18px_-10px_rgba(255,90,31,0.95),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-orange-600',
    dark: 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-white/90',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15',
    outline: 'border border-gray-200 bg-white text-gray-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-gray-300 hover:bg-gray-50 dark:border-white/15 dark:bg-transparent dark:text-white/80 dark:hover:bg-white/5',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white',
    danger: 'border border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-400 dark:hover:bg-rose-500/10',
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props} disabled={props.disabled || loading}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, ...props }: { icon: LucideIcon; label: string; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white', className)}
      {...props}
    >
      <Icon size={16} />
    </button>
  );
}

// ---------- Tabs ----------

export function TabGroup({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('inline-flex max-w-full flex-wrap gap-0.5 rounded-xl bg-gray-100/80 p-1 dark:bg-white/[0.05]', className)}>{children}</div>;
}

export function Tab({ active, onClick, children, groupId = 'default' }: PropsWithChildren<{ active: boolean; onClick: () => void; groupId?: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-[13px]',
        active ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80'
      )}
    >
      {active && (
        <motion.span
          layoutId={`tab-pill-${groupId}`}
          className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_3px_rgba(16,24,40,0.1)] dark:bg-white/10"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </button>
  );
}

/** Tab-style switch driven by a list of options. */
export function SegmentedControl<T extends string | number>({ value, onChange, options, groupId }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; groupId: string }) {
  return (
    <TabGroup>
      {options.map((o) => (
        <Tab key={String(o.value)} active={o.value === value} onClick={() => onChange(o.value)} groupId={groupId}>
          {o.label}
        </Tab>
      ))}
    </TabGroup>
  );
}

// ---------- Forms ----------

export const inputClass =
  'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-[13.5px] text-gray-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition-colors placeholder:text-gray-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 disabled:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30';

export function Field({ label, hint, error, children, className }: PropsWithChildren<{ label: string; hint?: ReactNode; error?: string | null; className?: string }>) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-white/80">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{error}</span> : hint ? <span className="mt-1 block text-xs text-gray-400 dark:text-white/40">{hint}</span> : null}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
      <input autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(inputClass, 'pl-9 pr-8')} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-white">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function Select<T extends string | number>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; label?: string }) {
  return (
    <select
      aria-label={label}
      value={String(value)}
      onChange={(e) => {
        const found = options.find((o) => String(o.value) === e.target.value);
        if (found) onChange(found.value);
      }}
      className={cn(inputClass, 'w-auto cursor-pointer pr-8', className)}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Row above a table: filters on the left, actions on the right. */
export function Toolbar({ children, actions, className }: PropsWithChildren<{ actions?: ReactNode; className?: string }>) {
  return (
    <div className={cn('rise mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/[0.07] dark:bg-[#12161f]', className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function useDebouncedValue<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ---------- States ----------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />;
}

export function EmptyState({ icon: Icon = Inbox, message, title, action }: { icon?: LucideIcon; message: string; title?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="relative mb-3 flex h-20 w-20 items-center justify-center">
        <span aria-hidden className="absolute inset-0 rounded-full bg-orange-500/[0.06] dark:bg-orange-400/[0.08]" />
        <span aria-hidden className="absolute inset-3 rounded-full bg-orange-500/[0.08] dark:bg-orange-400/[0.10]" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white text-orange-500 shadow-[0_6px_18px_-8px_rgba(255,90,31,0.6)] ring-1 ring-orange-100 dark:bg-[#1a1f2b] dark:text-orange-300 dark:ring-orange-400/20">
          <Icon size={20} />
        </span>
      </span>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{title || 'Nothing here yet'}</p>
      <p className="max-w-sm text-sm text-gray-500 dark:text-white/45">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:ring-rose-500/20">
        <AlertCircle size={20} />
      </span>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">Couldn’t load this</p>
      <p className="max-w-md text-sm text-gray-500 dark:text-white/45">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw size={13} /> Try again
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ text = 'Loading…', rows }: { text?: string; rows?: number }) {
  if (rows) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-gray-400 dark:text-white/40">
      <Loader2 size={16} className="animate-spin" /> {text}
    </div>
  );
}

/** Inline message box. */
export function Notice({ tone = 'info', children, onClose, className }: PropsWithChildren<{ tone?: 'info' | 'success' | 'warning' | 'error'; onClose?: () => void; className?: string }>) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    error: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
  }[tone];
  const Icon = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: AlertCircle }[tone];
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm', styles, className)}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ---------- Data table ----------

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Cell content. */
  render: (row: T) => ReactNode;
  /** Value used for sorting, searching and CSV export. */
  value?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
  /** Leave out of the CSV. */
  noExport?: boolean;
}

/**
 * Table with sorting, search over loaded rows, paging, row selection and CSV export.
 * For server-side paging pass `serverPaging` and drive page/total yourself.
 */
const COMPACT_KEY = 'fanitt-admin-compact-tables';
/** Row density, remembered across pages. */
function useCompactTables(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(() => {
    try {
      return localStorage.getItem(COMPACT_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const f = (e: Event) => setV((e as CustomEvent<boolean>).detail);
    window.addEventListener('fanitt-admin:density', f);
    return () => window.removeEventListener('fanitt-admin:density', f);
  }, []);
  const set = (next: boolean) => {
    try {
      localStorage.setItem(COMPACT_KEY, next ? '1' : '0');
    } catch {
      // not remembered
    }
    window.dispatchEvent(new CustomEvent('fanitt-admin:density', { detail: next }));
  };
  return [v, set];
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  loading,
  error,
  onRetry,
  emptyMessage = 'Nothing to show yet.',
  emptyIcon,
  onRowClick,
  pageSize = 20,
  searchable,
  searchPlaceholder,
  searchText,
  exportName,
  toolbar,
  serverPaging,
  selectable,
  bulkActions,
  dense,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  exportName?: string;
  toolbar?: ReactNode;
  serverPaging?: { page: number; pages: number; total?: number; onPage: (p: number) => void };
  selectable?: boolean;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  dense?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const text = searchText ? searchText(r) : columns.map((c) => (c.value ? c.value(r) : '')).join(' ');
      return String(text).toLowerCase().includes(q);
    });
  }, [rows, query, columns, searchText]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.value!(a);
      const vb = col.value!(b);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'en', { numeric: true })) * dir;
    });
  }, [filtered, sort, columns]);

  useEffect(() => setPage(1), [query, rows.length]);
  // Drop selections that no longer exist (after a reload).
  useEffect(() => {
    setSelected((s) => {
      if (!s.size) return s;
      const ids = new Set(rows.map(rowKey));
      const n = new Set([...s].filter((k) => ids.has(k)));
      return n.size === s.size ? s : n;
    });
  }, [rows, rowKey]);

  const pages = serverPaging ? serverPaging.pages : Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = serverPaging ? serverPaging.page : Math.min(page, pages);
  const visible = serverPaging ? sorted : sorted.slice((current - 1) * pageSize, current * pageSize);
  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(rowKey(r)));

  const toggleSort = (key: string) => setSort((s) => (s?.key !== key ? { key, dir: 'desc' } : s.dir === 'desc' ? { key, dir: 'asc' } : null));

  const [compact, setCompact] = useCompactTables();
  const showToolbar = searchable || toolbar || exportName;
  const pad = dense || compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div>
      {showToolbar && (
        <Toolbar
          actions={
            <>
              <IconButton icon={compact ? Rows3 : Rows2} label={compact ? 'Comfortable rows' : 'Compact rows'} onClick={() => setCompact(!compact)} className="hidden md:flex" />
              {exportName && (
                <Button variant="outline" size="sm" disabled={!sorted.length} onClick={() => exportCsv(exportName, columns, sorted)}>
                  <Download size={13} /> Export CSV
                </Button>
              )}
            </>
          }
        >
          {searchable && <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />}
          {toolbar}
        </Toolbar>
      )}

      <AnimatePresence>
        {selectable && selectedRows.length > 0 && bulkActions && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/70 px-3 py-2 text-sm dark:border-orange-500/30 dark:bg-orange-500/10"
          >
            <span className="font-semibold text-orange-800 dark:text-orange-200">{selectedRows.length} selected</span>
            <span className="flex-1" />
            {bulkActions(selectedRows, () => setSelected(new Set()))}
            <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rise overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-18px_rgba(16,24,40,0.12)] dark:border-white/[0.07] dark:bg-[#12161f]">
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : loading && !rows.length ? (
          <LoadingState rows={6} />
        ) : !visible.length ? (
          <EmptyState icon={emptyIcon} message={query ? `No results for “${query}”.` : emptyMessage} />
        ) : (
          <>
          {/* Phones: one card per row. */}
          <div className={cn('divide-y divide-gray-100 md:hidden dark:divide-white/[0.05]', loading && 'opacity-60')}>
            {visible.map((row) => {
              const k = rowKey(row);
              const shown = columns.filter((c) => !c.hideOnMobile);
              const [head, ...rest] = shown;
              return (
                <div key={k} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('px-4 py-3.5', onRowClick && 'cursor-pointer active:bg-gray-50 dark:active:bg-white/[0.03]', selected.has(k) && 'bg-orange-50/40 dark:bg-orange-500/5')}>
                  <div className="flex items-start gap-3">
                    {selectable && (
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={selected.has(k)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (n.has(k)) n.delete(k);
                            else n.add(k);
                            return n;
                          })
                        }
                        className="mt-1 h-4 w-4 rounded border-gray-300 accent-orange-500"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      {head && <div className="text-sm font-medium text-gray-900 dark:text-white">{head.render(row)}</div>}
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {rest.map((c) => (
                          <div key={c.key} className="min-w-0">
                            <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/35">{c.header}</dt>
                            <dd className="truncate text-[13px] text-gray-700 dark:text-white/75">{c.render(row)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden max-h-[72vh] overflow-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-200/80 bg-gray-50/95 backdrop-blur dark:border-white/[0.06] dark:bg-[#151a24]/95">
                  {selectable && (
                    <th className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={allVisibleSelected}
                        onChange={() =>
                          setSelected((s) => {
                            const n = new Set(s);
                            visible.forEach((r) => (allVisibleSelected ? n.delete(rowKey(r)) : n.add(rowKey(r))));
                            return n;
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300 accent-orange-500"
                      />
                    </th>
                  )}
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        'whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-white/40',
                        c.align === 'right' && 'text-right',
                        c.align === 'center' && 'text-center',
                        c.hideOnMobile && 'hidden md:table-cell'
                      )}
                    >
                      {c.sortable && c.value ? (
                        <button type="button" onClick={() => toggleSort(c.key)} className={cn('inline-flex items-center gap-1 uppercase hover:text-gray-900 dark:hover:text-white', c.align === 'right' && 'flex-row-reverse')}>
                          {c.header}
                          {sort?.key === c.key ? sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-40" />}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cn('divide-y divide-gray-100 dark:divide-white/[0.05]', loading && 'opacity-60')}>
                {visible.map((row) => {
                  const k = rowKey(row);
                  return (
                    <tr
                      key={k}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn('group transition-colors hover:bg-orange-50/40 dark:hover:bg-white/[0.03]', onRowClick && 'cursor-pointer', selected.has(k) && 'bg-orange-50/40 dark:bg-orange-500/5')}
                    >
                      {selectable && (
                        <td className={cn('w-10', pad)} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label="Select row"
                            checked={selected.has(k)}
                            onChange={() =>
                              setSelected((s) => {
                                const n = new Set(s);
                                if (n.has(k)) n.delete(k);
                                else n.add(k);
                                return n;
                              })
                            }
                            className="h-4 w-4 rounded border-gray-300 accent-orange-500"
                          />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(pad, 'align-middle text-gray-700 dark:text-white/75', c.align === 'right' && 'text-right tabular-nums', c.align === 'center' && 'text-center', c.hideOnMobile && 'hidden md:table-cell', c.className)}
                        >
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
        {!error && pages > 1 && (
          <div className="border-t border-gray-100 px-4 py-2.5 dark:border-white/[0.06]">
            <Pagination page={current} pages={pages} total={serverPaging?.total ?? sorted.length} onPage={(p) => (serverPaging ? serverPaging.onPage(p) : setPage(p))} />
          </div>
        )}
      </div>
    </div>
  );
}

export function Pagination({ page, pages, onPage, total }: { page: number; pages: number; onPage: (p: number) => void; total?: number }) {
  if (pages <= 1) return null;
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i += 1) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-white/45">
      <span>
        Page {page} of {pages}
        {total !== undefined && ` · ${total.toLocaleString('en-IN')} total`}
      </span>
      <div className="flex items-center gap-1">
        <IconButton icon={ChevronLeft} label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} />
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="px-1">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              className={cn('h-8 min-w-[32px] rounded-lg px-2 font-semibold tabular-nums', n === page ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-white/10')}
            >
              {n}
            </button>
          )
        )}
        <IconButton icon={ChevronRight} label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} />
      </div>
    </div>
  );
}

/** Download rows as a CSV file (opens fine in Excel / Google Sheets). */
export function exportCsv<T>(name: string, columns: Column<T>[], rows: T[]) {
  const cols = columns.filter((c) => !c.noExport && c.value);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => esc(typeof c.header === 'string' ? c.header : c.key)).join(',');
  const body = rows.map((r) => cols.map((c) => esc(c.value!(r))).join(',')).join('\n');
  const blob = new Blob([`﻿${head}\n${body}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Overlays ----------

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [open, onClose]);
}

/** Side panel for record details. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl' }: PropsWithChildren<{ open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; footer?: ReactNode; width?: string }>) {
  useEscape(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-950/30 backdrop-blur-[2px]" onClick={onClose} />
          <motion.aside
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn('absolute inset-y-0 right-0 flex w-full flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#11141c]', width)}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-gray-950 dark:text-white">{title}</h3>
                {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-white/45">{subtitle}</p>}
              </div>
              <IconButton icon={X} label="Close" onClick={onClose} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="border-t border-gray-100 px-5 py-3 dark:border-white/[0.06]">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Centered dialog. */
export function Dialog({ open, onClose, title, description, children, footer, width = 'max-w-md' }: PropsWithChildren<{ open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; footer?: ReactNode; width?: string }>) {
  useEscape(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-950/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            className={cn('relative w-full rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#141821]', width)}
          >
            <div className="px-5 pb-2 pt-5">
              <h3 className="text-base font-semibold text-gray-950 dark:text-white">{title}</h3>
              {description && <div className="mt-1 text-sm text-gray-500 dark:text-white/50">{description}</div>}
            </div>
            {children && <div className="px-5 py-2">{children}</div>}
            {footer && <div className="flex justify-end gap-2 px-5 pb-5 pt-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ---------- Confirm (promise-based) ----------

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  /** Ask for text (e.g. a rejection reason). */
  input?: { label: string; placeholder?: string; required?: boolean; multiline?: boolean; defaultValue?: string };
}
type ConfirmRequest = ConfirmOptions & { resolve: (v: boolean | string | null) => void };
let pushConfirm: ((r: ConfirmRequest) => void) | null = null;

/** `if (!(await confirmDialog({ title: 'Delete?' }))) return;` — replaces window.confirm. */
export function confirmDialog(opts: Omit<ConfirmOptions, 'input'>): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushConfirm) return resolve(window.confirm(`${opts.title}${typeof opts.message === 'string' ? `\n\n${opts.message}` : ''}`));
    pushConfirm({ ...opts, resolve: (v) => resolve(Boolean(v)) });
  });
}

/** Like confirmDialog, with a text box. Resolves to the text (may be '') or null when cancelled. */
export function promptDialog(opts: ConfirmOptions & { input: NonNullable<ConfirmOptions['input']> }): Promise<string | null> {
  return new Promise((resolve) => {
    if (!pushConfirm) return resolve(window.prompt(opts.title, opts.input.defaultValue) ?? null);
    pushConfirm({ ...opts, resolve: (v) => resolve(typeof v === 'string' ? v : null) });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const [text, setText] = useState('');
  useEffect(() => {
    pushConfirm = (r) => {
      setText(r.input?.defaultValue ?? '');
      setReq(r);
    };
    return () => {
      pushConfirm = null;
    };
  }, []);
  const close = (v: boolean | string | null) => {
    req?.resolve(v);
    setReq(null);
  };
  const cancel = () => close(req?.input ? null : false);
  const needsText = req?.input?.required && !text.trim();
  return (
    <Dialog
      open={!!req}
      onClose={cancel}
      title={
        <span className="flex items-center gap-2">
          {req?.tone === 'danger' && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15">
              <AlertTriangle size={14} />
            </span>
          )}
          {req?.title}
        </span>
      }
      description={req?.message}
      footer={
        <>
          <Button variant="outline" onClick={cancel}>
            {req?.cancelLabel || 'Cancel'}
          </Button>
          <Button
            variant="primary"
            className={req?.tone === 'danger' ? '!bg-rose-600 !shadow-none hover:!bg-rose-700' : ''}
            disabled={!!needsText}
            onClick={() => close(req?.input ? text.trim() : true)}
            autoFocus={!req?.input}
          >
            {req?.confirmLabel || 'Confirm'}
          </Button>
        </>
      }
    >
      {req?.input && (
        <Field label={req.input.label}>
          {req.input.multiline ? (
            <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={req.input.placeholder} className={cn(inputClass, 'h-auto py-2')} autoFocus />
          ) : (
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !needsText && close(text.trim())}
              placeholder={req.input.placeholder}
              className={inputClass}
              autoFocus
            />
          )}
        </Field>
      )}
    </Dialog>
  );
}

// ---------- Toasts ----------

type ToastItem = { id: number; tone: 'success' | 'error' | 'info'; message: string };
let pushToast: ((t: Omit<ToastItem, 'id'>) => void) | null = null;

export const toast = {
  success: (message: string) => pushToast?.({ tone: 'success', message }),
  error: (message: string) => pushToast?.({ tone: 'error', message }),
  info: (message: string) => pushToast?.({ tone: 'info', message }),
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  useEffect(() => {
    pushToast = (t) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { ...t, id }]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), t.tone === 'error' ? 6000 : 3500);
    };
    return () => {
      pushToast = null;
    };
  }, []);
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            role="status"
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-800 shadow-lg dark:border-white/10 dark:bg-[#1a1f2b] dark:text-white/90"
          >
            {t.tone === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" /> : t.tone === 'error' ? <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" /> : <Info size={16} className="mt-0.5 shrink-0 text-sky-500" />}
            <span className="min-w-0 flex-1">{t.message}</span>
            <button onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-white" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
